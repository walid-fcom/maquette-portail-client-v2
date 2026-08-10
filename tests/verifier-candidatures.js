#!/usr/bin/env node
/* Verification des statuts de candidature du portail V2, onglet Candidatures
   d'une fiche besoin.
   Usage : node tests/verifier-candidatures.js
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

/* Les six statuts visibles par le client, et leur valeur Salesforce. Les quatre
   statuts internes de INO_Candidature__c.statut__c — Nouveau, Rejet sourcing,
   Propose au commerce, Rejet Commerce — ne doivent jamais paraitre. */
const ATTENDUS={
  'CV à valider':'Proposition au client',
  'À valider pour soutenance':'Soutenance',
  'Démarrage':'Démarrage',
  'Rejet client sur CV':'Rejet Client sur CV',
  'Rejet client après soutenance':'Rejet Client après soutenance',
  'No Go Candidat':'No Go Candidat'
};
const INTERNES=['Nouveau','Rejet sourcing','Proposé au commerce','Rejet Commerce'];

async function ouvrirPortail(page){
  await page.goto(FICHIER);
  /* L'ecran de code d'acces peut etre desactive : ne saisir le code que s'il est affiche. */
  if(await page.$('#access-gate:not([hidden])')){
    await page.fill('#access-code',CODE_ACCES);
    await page.click('#access-gate-form button[type=submit]');
  }
  await page.click('#l-connecter');
  await page.waitForSelector('#mfa-modale .mfa-case',{state:'visible'});
  const cases=await page.$$('#mfa-modale .mfa-case');
  for(let i=0;i<cases.length;i++)await cases[i].fill(String(i+1));
  await page.click('#mfa-verifier');
  await page.waitForFunction(()=>document.body.classList.contains('connecte'),null,{timeout:15000});
}

/* Ouvre la fiche du besoin dont le libelle contient `texte`, puis son onglet
   Candidatures. La recherche evite la pagination, qui cache la moitie des
   lignes. */
async function ouvrirCandidatures(page,texte){
  await page.click('.side a[data-vue="besoins"]');
  await page.waitForSelector('#v-besoins:not([hidden])');
  await page.fill('#rech-besoin',texte);
  await page.waitForTimeout(120);
  await page.click('#v-besoins tbody tr:not([hidden]):not(.hors-page) a[data-vue="besoin-detail"]');
  await page.waitForSelector('#v-besoin-detail:not([hidden])');
  await page.click('#fb-candidatures');
  await page.waitForTimeout(200);
}

async function badges(page){
  return page.$$eval('#table-candidatures-besoin tbody tr',ls=>ls.map(l=>({
    candidat:l.dataset.candidat,
    libelle:l.querySelector('.badge').textContent.trim(),
    couleur:l.querySelector('.badge').className.replace('badge','').trim(),
    sf:l.dataset.statutCandidature
  })));
}

function egal(reel,attendu,quoi){
  if(reel!==attendu)throw new Error(quoi+' : attendu '+JSON.stringify(attendu)+', obtenu '+JSON.stringify(reel));
}

const CONTROLES=[
  {nom:'un besoin en recherche attend la validation des CV',fn:async page=>{
    await ouvrirCandidatures(page,'Consultant data gouvernance');
    const b=await badges(page);
    egal(b.length,2,'nombre de candidatures');
    egal(b.every(x=>x.libelle==='CV à valider'),true,'libellés');
    egal(b[0].sf,'Proposition au client','valeur Salesforce portée par la ligne');
  }},
  {nom:'un besoin demarre affiche un candidat en demarrage',fn:async page=>{
    await ouvrirCandidatures(page,'Développeur mobile Flutter');
    const b=await badges(page);
    egal(b.map(x=>x.libelle).join(', '),'Démarrage','libellé');
    egal(b[0].couleur,'ok','badge vert');
  }},
  {nom:'un besoin rejete distingue rejet sur CV et rejet apres soutenance',fn:async page=>{
    await ouvrirCandidatures(page,'Consultant cybersécurité');
    const b=await badges(page);
    egal(b.map(x=>x.libelle).sort().join(' | '),
      'Rejet client après soutenance | Rejet client sur CV','libellés');
    egal(b.every(x=>x.couleur==='bad'),true,'badges rouges');
  }},
  {nom:'un profil retenu passe a la validation de soutenance',fn:async page=>{
    await ouvrirCandidatures(page,'Chef de projet migration SI finance');
    const b=await badges(page);
    egal(b.map(x=>x.libelle).join(', '),'À valider pour soutenance','libellé');
    egal(b[0].couleur,'b-violet','badge violet');
  }},
  {nom:'un desistement candidat se lit No Go Candidat',fn:async page=>{
    await ouvrirCandidatures(page,'Architecte cloud AWS');
    const b=await badges(page);
    egal(b.map(x=>x.libelle).sort().join(' | '),'CV à valider | No Go Candidat','libellés');
    egal(b.filter(x=>x.libelle==='No Go Candidat')[0].couleur,'b-neutre','badge neutre');
  }},
  {nom:'les six statuts client sont tous representes, et eux seuls',fn:async page=>{
    const vus=new Set();
    for(const besoin of ['Consultant data gouvernance','Développeur mobile Flutter',
      'Consultant cybersécurité','Chef de projet migration SI finance','Architecte cloud AWS']){
      await ouvrirCandidatures(page,besoin);
      (await badges(page)).forEach(x=>vus.add(x.libelle));
    }
    egal([...vus].sort().join(' | '),Object.keys(ATTENDUS).sort().join(' | '),'statuts rencontrés');
  }},
  {nom:'aucun statut interne ne parait cote client',fn:async page=>{
    for(const besoin of ['Consultant data gouvernance','Consultant cybersécurité','Architecte cloud AWS']){
      await ouvrirCandidatures(page,besoin);
      const b=await badges(page);
      const fuites=b.filter(x=>INTERNES.indexOf(x.libelle)>-1||INTERNES.indexOf(x.sf)>-1);
      egal(fuites.map(x=>x.libelle).join(', '),'','statuts internes visibles sur '+besoin);
    }
  }},
  {nom:'aucune pastille ne deborde de sa colonne',fn:async page=>{
    /* « Rejet client après soutenance » est le plus long des six : en colonne
       trop etroite il sortait de sa cellule et passait sous le lien CV. */
    for(const besoin of ['Consultant cybersécurité','Chef de projet migration SI finance']){
      await ouvrirCandidatures(page,besoin);
      const fuites=await page.$$eval('#table-candidatures-besoin tbody tr',ls=>ls.map(l=>{
        const cellule=l.cells[4],pastille=cellule.querySelector('.badge');
        const c=cellule.getBoundingClientRect(),p=pastille.getBoundingClientRect();
        return p.right>c.right+1?pastille.textContent.trim()+' ('+Math.round(p.right-c.right)+'px)':null;
      }).filter(Boolean));
      egal(fuites.join(', '),'','pastilles qui débordent sur '+besoin);
    }
  }},
  {nom:'chaque libelle porte bien sa valeur Salesforce',fn:async page=>{
    for(const besoin of ['Consultant data gouvernance','Développeur mobile Flutter',
      'Consultant cybersécurité','Chef de projet migration SI finance','Architecte cloud AWS']){
      await ouvrirCandidatures(page,besoin);
      (await badges(page)).forEach(x=>egal(x.sf,ATTENDUS[x.libelle],'valeur SF pour « '+x.libelle+' »'));
    }
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
