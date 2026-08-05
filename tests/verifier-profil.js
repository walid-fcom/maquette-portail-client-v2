#!/usr/bin/env node
/* Verification de la page Profil du portail V2.
   Usage : node tests/verifier-profil.js
   Playwright est resolu depuis le node_modules global (npm i -g playwright). */
const path=require('path');
const {execSync}=require('child_process');

function chargerPlaywright(){
  try{return require('playwright');}catch(e){
    const racine=execSync('npm root -g',{encoding:'utf8'}).trim();
    return require(path.join(racine,'playwright'));
  }
}
const {chromium}=chargerPlaywright();
const FICHIER='file://'+path.join(__dirname,'..','maquette_front_portail_client_v2.html');
const CODE_ACCES='Azerty1234.Azerty1234.@sdkzap';

async function ouvrirPortail(page){
  await page.goto(FICHIER);
  await page.fill('#access-code',CODE_ACCES);
  await page.click('#access-gate-form button[type=submit]');
  await page.click('#l-connecter');
  await page.waitForSelector('#mfa-modale .mfa-case',{state:'visible'});
  const cases=await page.$$('#mfa-modale .mfa-case');
  for(let i=0;i<cases.length;i++)await cases[i].fill(String(i+1));
  await page.click('#mfa-verifier');
  await page.waitForFunction(()=>document.body.classList.contains('connecte'),null,{timeout:15000});
}

async function ouvrirProfil(page){
  await page.click('#side-account-trigger');
  await page.click('#profile-link');
  await page.waitForSelector('#v-profil:not([hidden])');
}

function egal(reel,attendu,quoi){
  if(reel!==attendu)throw new Error(quoi+' : attendu '+JSON.stringify(attendu)+', obtenu '+JSON.stringify(reel));
}

const CONTROLES=[
  {nom:'le lien Profil ouvre la vue',fn:async page=>{
    await ouvrirProfil(page);
    egal(await page.$eval('#v-profil h2.h-vue',e=>e.textContent.trim()),'Mon profil','titre de la vue');
  }},
  {nom:'aucune entree de la barre laterale ne s allume',fn:async page=>{
    await ouvrirProfil(page);
    egal(await page.$$eval('.side a[aria-current="page"]',a=>a.length),0,'entrees surlignees');
  }},
  {nom:'la fiche identite affiche les quatre champs, en lecture seule',fn:async page=>{
    await ouvrirProfil(page);
    const champs=await page.$$eval('#v-profil .compte-champs div',d=>d.map(x=>x.querySelector('dt').textContent.trim()+' = '+x.querySelector('dd').textContent.trim()));
    egal(champs.join(' | '),
      'Email de connexion = robert.duris@yopmail.com | Fonction = Responsable achats IT | Société = ELECTRICITE DE FRANCE — EDF | Rôle portail = Contract manager',
      'champs de la fiche');
    egal(await page.$$eval('#v-profil .compte-identite input,#v-profil .compte-identite textarea,#v-profil .compte-identite select',e=>e.length),0,'champs modifiables');
  }},
  {nom:'la methode active est email, et Configurer est inerte',fn:async page=>{
    await ouvrirProfil(page);
    egal(await page.$eval('#compte-mfa-etat',e=>e.textContent.trim()),'Par email','méthode active');
    egal(await page.$eval('#compte-mfa-configurer',e=>e.disabled),true,'bouton Configurer');
    egal(await page.$eval('input[name="compte-mfa"][value="email"]',e=>e.checked),true,'radio email coché');
  }},
  {nom:'choisir l application arme le bouton Configurer sans rien activer',fn:async page=>{
    await ouvrirProfil(page);
    await page.check('input[name="compte-mfa"][value="app"]');
    egal(await page.$eval('#compte-mfa-configurer',e=>e.disabled),false,'bouton Configurer');
    egal(await page.$eval('#compte-mfa-etat',e=>e.textContent.trim()),'Par email','méthode active inchangée');
  }},
  {nom:'Configurer ouvre la modale d appairage avec sa cle en clair',fn:async page=>{
    await ouvrirProfil(page);
    await page.check('input[name="compte-mfa"][value="app"]');
    await page.click('#compte-mfa-configurer');
    await page.waitForSelector('#appairage-modale',{state:'visible'});
    egal(await page.$eval('#appairage-cle',e=>e.textContent.trim()),'JBSW Y3DP EHPK 3PXP','clé en clair');
    egal(await page.$eval('#appairage-confirmer',e=>e.disabled),true,'bouton Confirmer avant saisie');
  }},
  {nom:'six chiffres appairent l application et basculent la methode',fn:async page=>{
    await ouvrirProfil(page);
    await page.check('input[name="compte-mfa"][value="app"]');
    await page.click('#compte-mfa-configurer');
    await page.waitForSelector('#appairage-modale',{state:'visible'});
    const cases=await page.$$('#appairage-modale .mfa-case');
    egal(cases.length,6,'nombre de cases');
    for(let i=0;i<cases.length;i++)await cases[i].fill('4');
    egal(await page.$eval('#appairage-confirmer',e=>e.disabled),false,'bouton Confirmer après saisie');
    await page.click('#appairage-confirmer');
    await page.waitForSelector('#appairage-modale',{state:'hidden'});
    egal(await page.$eval('#compte-mfa-etat',e=>e.textContent.trim()),'Application d’authentification','méthode active');
    egal(await page.evaluate(()=>document.body.dataset.mfaMethode),'app','marqueur sur body');
  }},
  {nom:'la saisie d appairage est scopee a sa propre modale',fn:async page=>{
    await ouvrirProfil(page);
    await page.check('input[name="compte-mfa"][value="app"]');
    await page.click('#compte-mfa-configurer');
    await page.waitForSelector('#appairage-modale',{state:'visible'});
    const cases=await page.$$('#appairage-modale .mfa-case');
    for(let i=0;i<3;i++)await cases[i].fill('7');
    egal(await page.$eval('#appairage-confirmer',e=>e.disabled),true,'Confirmer avec trois chiffres seulement');
    egal(await page.$$eval('#mfa-modale .mfa-case',e=>e.map(x=>x.value).join('')),'123456','cases du login intactes');
  }},
];

(async()=>{
  const navigateur=await chromium.launch();
  let echecs=0;
  for(const controle of CONTROLES){
    const page=await navigateur.newPage({viewport:{width:1500,height:1200}});
    const erreursJs=[];
    page.on('pageerror',e=>erreursJs.push(String(e)));
    try{
      await ouvrirPortail(page);
      await controle.fn(page);
      if(erreursJs.length)throw new Error('erreurs JS : '+erreursJs.join(' ; '));
      console.log('  OK   '+controle.nom);
    }catch(e){
      echecs++;
      console.log('  ECHEC '+controle.nom+'\n         '+e.message);
    }
    await page.close();
  }
  await navigateur.close();
  console.log(echecs?('\n'+echecs+' controle(s) en echec'):'\nTous les controles passent');
  process.exit(echecs?1:0);
})();
