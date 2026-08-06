#!/usr/bin/env node
/* Verification de la modale de depot du besoin du portail V2.
   Usage : node tests/verifier-modale-besoin.js
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

/* Le bouton « Nouveau besoin » vit dans la vue Mes besoins, masquee a l'arrivee. */
async function ouvrirModale(page){
  await page.click('.side a[data-vue="besoins"]');
  await page.waitForSelector('#v-besoins:not([hidden])');
  await page.click('#ouvrir-modale');
  await page.waitForSelector('#modale .m-box',{state:'visible'});
}

async function competences(page){
  return page.$$eval('#m-competences .m-competence b',b=>b.map(x=>x.textContent.trim()));
}

function egal(reel,attendu,quoi){
  if(reel!==attendu)throw new Error(quoi+' : attendu '+JSON.stringify(attendu)+', obtenu '+JSON.stringify(reel));
}

const CONTROLES=[
  {nom:'la modale expose les six champs, dans l ordre',fn:async page=>{
    await ouvrirModale(page);
    egal(await page.$eval('#m-titre',e=>e.textContent.trim()),'Confiez-nous votre besoin','titre');
    const champs=await page.$$eval('#modale .m-grille>div label',ls=>ls.map(l=>l.textContent.trim()));
    egal(champs.join(' | '),
      'Intitulé du poste | Compétences | Séniorité | Localisation | Date de démarrage | TJM ou budget cible',
      'libellés et ordre');
  }},
  {nom:'les champs sont pre-remplis a partir de la description',fn:async page=>{
    await ouvrirModale(page);
    egal(await page.$eval('#m-poste',e=>e.value),'Développeur Node.js','intitulé');
    egal(await page.$eval('#m-seniorite',e=>e.value),'Sénior','séniorité');
    egal(await page.$eval('#m-loc',e=>e.value),'Paris · 2 j de télétravail / semaine','localisation');
    egal(await page.$eval('#m-date',e=>e.value),'01/09/2026','date');
    egal(await page.$eval('#m-tjm',e=>e.value),'500 – 700 € / jour','TJM');
    egal((await competences(page)).join(', '),'Node.js','compétences');
  }},
  {nom:'le bloc Type de prestation a disparu',fn:async page=>{
    await ouvrirModale(page);
    egal(await page.$$eval('#modale .m-type,#modale .carte-type',e=>e.length),0,'blocs de type');
    egal(await page.$$eval('#modale .detecte,#modale .dpo',e=>e.length),0,'badges détecté et Assistance IA');
  }},
  {nom:'une competence saisie devient une pastille',fn:async page=>{
    await ouvrirModale(page);
    await page.fill('#m-competence-saisie','TypeScript');
    await page.press('#m-competence-saisie','Enter');
    egal((await competences(page)).join(', '),'Node.js, TypeScript','compétences');
    egal(await page.$eval('#m-competence-saisie',e=>e.value),'','champ vidé');
  }},
  {nom:'la croix d une pastille la retire',fn:async page=>{
    await ouvrirModale(page);
    await page.fill('#m-competence-saisie','React');
    await page.press('#m-competence-saisie','Enter');
    await page.click('#m-competences .m-competence:first-child button');
    egal((await competences(page)).join(', '),'React','compétences restantes');
  }},
  {nom:'une competence deja retenue ne se duplique pas',fn:async page=>{
    await ouvrirModale(page);
    await page.fill('#m-competence-saisie','node.js');
    await page.press('#m-competence-saisie','Enter');
    egal((await competences(page)).join(', '),'Node.js','compétences');
  }},
  {nom:'retour arriere sur champ vide retire la derniere pastille',fn:async page=>{
    await ouvrirModale(page);
    await page.fill('#m-competence-saisie','Docker');
    await page.press('#m-competence-saisie','Enter');
    egal((await competences(page)).length,2,'avant retour arrière');
    await page.press('#m-competence-saisie','Backspace');
    egal((await competences(page)).join(', '),'Node.js','après retour arrière');
  }},
  {nom:'la regle qui masque le marqueur de liste natif est en place',fn:async page=>{
    await ouvrirModale(page);
    /* La liste native ajoutait son propre marqueur par-dessus le chevron dessine
       sur le cadre : deux chevrons cote a cote. getComputedStyle ne sait pas
       lire ce pseudo-element — il retombe sur l'hote —, on verifie donc la
       presence de la regle. Le rendu, lui, a ete controle a l'oeil. */
    const presente=await page.evaluate(()=>[].slice.call(document.styleSheets)
      .some(f=>{try{return [].slice.call(f.cssRules).some(r=>
        r.selectorText&&r.selectorText.indexOf('calendar-picker-indicator')>-1
        &&r.selectorText.indexOf('m-competences')>-1);}catch(e){return false;}}));
    egal(presente,true,'règle de masquage du marqueur natif');
    egal(await page.$eval('#m-competence-saisie',i=>getComputedStyle(i).appearance),'none','appearance du champ');
  }},
  {nom:'la pastille et le champ tiennent sur une seule ligne',fn:async page=>{
    await ouvrirModale(page);
    const h=await page.$eval('#m-competences',z=>Math.round(z.getBoundingClientRect().height));
    if(h>56)throw new Error('hauteur du champ compétences : '+h+'px, la pastille passe à la ligne');
  }},
  {nom:'le pied ne montre aucune note au repos',fn:async page=>{
    await ouvrirModale(page);
    egal(await page.$eval('#m-note',e=>e.textContent.trim()),'','note');
    egal(await page.$eval('#m-note',e=>e.offsetParent===null),true,'note masquée');
    egal(await page.$eval('#m-envoyer',e=>e.textContent.trim()),'Transmettre la demande','bouton d’envoi');
  }},
  {nom:'Annuler et Echap ferment la modale',fn:async page=>{
    await ouvrirModale(page);
    await page.click('#m-annuler');
    egal(await page.evaluate(()=>document.body.classList.contains('modal-open')),false,'après Annuler');
    await ouvrirModale(page);
    await page.keyboard.press('Escape');
    egal(await page.evaluate(()=>document.body.classList.contains('modal-open')),false,'après Échap');
  }},
];

(async()=>{
  const navigateur=await chromium.launch();
  let echecs=0;
  for(const controle of CONTROLES){
    const page=await navigateur.newPage({viewport:{width:1400,height:1150}});
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
