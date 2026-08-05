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
