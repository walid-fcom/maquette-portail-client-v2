#!/usr/bin/env node
/* Verification de la vue Mon activite du portail V2 : prestations regroupees
   par marche en accordeons.
   Usage : node tests/verifier-activites.js
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

async function ouvrirActivites(page){
  await page.click('.side a[data-vue="activites"]');
  await page.waitForSelector('#v-activites:not([hidden])');
  await page.waitForSelector('.marche-groupe');
}

function egal(reel,attendu,quoi){
  if(reel!==attendu)throw new Error(quoi+' : attendu '+JSON.stringify(attendu)+', obtenu '+JSON.stringify(reel));
}

/* Les groupes visibles, dans l'ordre, avec leur decompte. */
async function groupes(page){
  return page.$$eval('.marche-groupe',blocs=>blocs.filter(b=>!b.hidden).map(b=>({
    nom:b.querySelector('.marche-groupe-nom').textContent.trim(),
    compte:b.querySelector('.marche-groupe-compte').textContent.trim(),
    ouvert:b.open,
    lignes:[].slice.call(b.querySelectorAll('tbody tr')).filter(l=>!l.hidden).length
  })));
}

/* Marches attendus : ordre du filtre Marche, avec le nombre de lignes de
   contrat de chacun. Une seule table a tenir a jour quand la maquette bouge. */
const MARCHES=[
  ['at-si','AT Prestations SI 2024-28',4],
  ['data-ia','Accord-cadre Data & IA',2],
  ['infra','Marché Infra & Cloud',2],
  ['amoe-lot1','EDF_ AMOE/APSM/SD_Lot 1 AMOE',1],
  ['apsm-lot2','EDF_ AMOE/APSM/SD_Lot 2 APSM',1],
  ['sd-lot3','EDF_AMOE/APSM/SD_Lot 3 Sites Diffus',2],
  ['mapsif-lot4','EDF-MAPSIF MOA Finance / Lot 4 Trésorerie',1],
  ['mapsif-lot5','EDF-MAPSIF MOA Finance Lot 5 : AMOA Activités de Marché',2],
  ['mapsif-sap-lot1','EDF – MAPSIF – MOA SI Finance – Lot 1 /SAP Finance',2],
  ['conseil-it','EDF-Marché Conseil IT',2],
  ['rpa','EDF_ Marché de Prestations de RPA',2],
  ['dipnn-dmr3','EDF – Marché DIPNN – DMR LOT3',1],
  ['mad-lot3','EDF – Marché MAD Solutions Lab – LOT 3 – Apps Mobile',2],
  ['pux-lot1','EDF – Marché PUX – LOT 1 – Démarche Expérience Utilisateur Générale',2],
  ['archi-lot1',"EDF-Prestations d'architecture-Lot 1-Architecture d'Entreprise et urbanisme",1],
  ['archi-lot2',"EDF-Prestations d'architecture-Lot 2-Architecture Technique",2],
  ['epsa-lot6','EDF-Réf EPSA – LOT 6 -Digital PAAS/Ech donnée/IOT',2],
  ['smash',"EDF_SMASH_Prestations d'intermédiation en expertises informatiques",2],
  ['mad-lot5','Marché MAD Solutions Lab – LOT 5',1],
  ['mad-lot6','Marché MAD Solutions Lab – LOT 6',1],
];
const NOMS_ATTENDUS=MARCHES.map(m=>m[1]).join(' | ');
const COMPTES_ATTENDUS=MARCHES.map(m=>m[2]+' prestation'+(m[2]>1?'s':'')).join(' | ');

const CONTROLES=[
  {nom:'les prestations sont regroupees par marche, tout replie',fn:async page=>{
    await ouvrirActivites(page);
    const g=await groupes(page);
    egal(g.map(x=>x.nom).join(' | '),NOMS_ATTENDUS,'marchés et ordre');
    egal(g.map(x=>x.compte).join(' | '),COMPTES_ATTENDUS,'décomptes');
    egal(g.every(x=>!x.ouvert),true,'tous repliés à l’ouverture');
  }},
  {nom:'chaque groupe ne contient que les prestations de son marche',fn:async page=>{
    await ouvrirActivites(page);
    const marches=await page.$$eval('.marche-groupe',blocs=>blocs.map(b=>{
      const attendus=[].slice.call(b.querySelectorAll('tbody tr')).map(l=>l.dataset.marche);
      return b.dataset.marche+':'+Array.from(new Set(attendus)).join(',');
    }));
    egal(marches.join(' | '),MARCHES.map(m=>m[0]+':'+m[0]).join(' | '),'appartenance des lignes');
  }},
  {nom:'la table unique a disparu au profit des groupes',fn:async page=>{
    await ouvrirActivites(page);
    egal(await page.$$eval('#v-prestations .presta-table',t=>t.length),MARCHES.length,'nombre de tables');
    egal(await page.$$eval('#v-prestations .presta-table',t=>t.every(x=>!!x.closest('.marche-groupe'))),true,'toutes dans un groupe');
  }},
  {nom:'la colonne Marche est masquee, devenue titre de groupe',fn:async page=>{
    await ouvrirActivites(page);
    egal(await page.$$eval('#v-prestations th[data-col="marche"]',t=>t.every(x=>x.classList.contains('masque'))),true,'colonne Marché masquée');
    egal(await page.$eval('[data-presta-col="marche"]',e=>e.checked),false,'case décochée dans le configurateur');
  }},
  {nom:'Tout ouvrir et Tout fermer pilotent tous les groupes',fn:async page=>{
    await ouvrirActivites(page);
    await page.click('#prestations-tout-ouvrir');
    egal(await page.$$eval('.marche-groupe',b=>b.every(x=>x.open)),true,'tous ouverts');
    await page.click('#prestations-tout-fermer');
    egal(await page.$$eval('.marche-groupe',b=>b.every(x=>!x.open)),true,'tous fermés');
  }},
  {nom:'filtrer sur un marche laisse le seul groupe concerne',fn:async page=>{
    await ouvrirActivites(page);
    /* La case vit dans un menu replie : l'ouvrir d'abord, comme le ferait un clic. */
    await page.$eval('#v-prestations .presta-filtres [data-f="marche"]',e=>{e.closest('details').open=true;});
    await page.check('#v-prestations .presta-filtres [data-f="marche"][value="infra"]');
    const g=await groupes(page);
    egal(g.length,1,'groupes restants');
    egal(g[0].nom,'Marché Infra & Cloud','groupe restant');
    egal(g[0].compte,'2 prestations','décompte du groupe restant');
  }},
  {nom:'la recherche reduit les decomptes et retire les groupes vides',fn:async page=>{
    await ouvrirActivites(page);
    await page.fill('#filtre-prestations-search','Refonte infrastructure');
    const g=await groupes(page);
    egal(g.length,1,'groupes restants');
    egal(g[0].nom,'Marché Infra & Cloud','groupe restant');
    egal(g[0].lignes,2,'lignes retenues');
  }},
  {nom:'un filtre sans resultat ne laisse aucun groupe',fn:async page=>{
    await ouvrirActivites(page);
    await page.fill('#filtre-prestations-search','zzzzz-introuvable');
    egal((await groupes(page)).length,0,'groupes restants');
  }},
  {nom:'Reinitialiser rend tous les groupes',fn:async page=>{
    await ouvrirActivites(page);
    await page.fill('#filtre-prestations-search','zzzzz-introuvable');
    await page.click('#reset-prestations');
    const g=await groupes(page);
    egal(g.length,MARCHES.length,'groupes restants');
    egal(g.map(x=>x.compte).join(' | '),COMPTES_ATTENDUS,'décomptes rétablis');
  }},
  {nom:'une ligne de groupe ouvre toujours le detail de la prestation',fn:async page=>{
    await ouvrirActivites(page);
    await page.click('#prestations-tout-ouvrir');
    await page.click('.marche-groupe[data-marche="infra"] tbody tr');
    await page.waitForSelector('#v-forfait-affaire:not([hidden]),#v-activite-detail:not([hidden]),#v-portage-prestation-detail:not([hidden])');
  }},
  {nom:'chaque accordeon porte sa pagination calquee sur Factures',fn:async page=>{
    await ouvrirActivites(page);
    /* Le rendu initial de la pagination est differe d'un tour de boucle. */
    await page.waitForFunction(()=>{
      const etats=[...document.querySelectorAll('.marche-groupe .pagination-etat')];
      return etats.length&&etats.every(e=>e.textContent.trim());
    });
    egal(await page.$$eval('.marche-groupe .pagination',p=>p.length),MARCHES.length,'barres de pagination');
    egal(await page.$$eval('.marche-groupe .pagination select',s=>s.every(x=>x.value==='25')),true,'25 lignes par page');
    const etats=await page.$$eval('.marche-groupe .pagination-etat',e=>e.map(x=>x.textContent.trim()));
    egal(etats.join(' | '),MARCHES.map(m=>'1–'+m[2]+' sur '+m[2]).join(' | '),'compteurs « 1–25 sur N »');
  }},
  {nom:'les colonnes tombent en face d un groupe a l autre',fn:async page=>{
    await ouvrirActivites(page);
    await page.click('#prestations-tout-ouvrir');
    const gabarits=await page.$$eval('.marche-groupe table',tables=>tables.map(t=>
      [].slice.call(t.querySelectorAll('thead th')).filter(h=>!h.classList.contains('masque'))
        .map(h=>Math.round(h.getBoundingClientRect().width)).join(',')));
    gabarits.slice(1).forEach((gabarit,i)=>egal(gabarit,gabarits[0],'gabarit du groupe '+(i+2)));
  }},
  {nom:'les statuts portent le badge commun au portail',fn:async page=>{
    await ouvrirActivites(page);
    await page.click('#prestations-tout-ouvrir');
    /* Un composant .statut, propre a cet ecran, ecrivait les statuts en
       majuscules avec une pastille ronde et une bordure, la ou tout le reste du
       portail emploie .badge. */
    egal(await page.$$eval('#v-prestations .statut',e=>e.length),0,'composants .statut résiduels');
    const badges=await page.$$eval('.marche-groupe td[data-col="statut"] span',
      b=>[...new Set(b.map(x=>x.className+' | '+x.textContent.trim()))].sort());
    egal(badges.join(' // '),'badge b-neutre | Terminée // badge ok | En cours','badges de statut');
    egal(await page.$eval('.marche-groupe td[data-col="statut"] .badge',
      e=>getComputedStyle(e).textTransform),'none','casse du badge');
  }},
  {nom:'aucun libelle d en-tete ne deborde sur la colonne voisine',fn:async page=>{
    await ouvrirActivites(page);
    await page.click('#prestations-tout-ouvrir');
    /* En largeur fixe, un libelle trop long deborde silencieusement sur la
       colonne voisine. Le retour a la ligne coupe aux espaces : ce qui doit
       tenir, c'est donc le mot le plus long, poignee de reordonnancement
       comprise. */
    const debordements=await page.$$eval('.marche-groupe thead th',entetes=>{
      const mesure=document.createElement('span');
      mesure.style.cssText='position:absolute;visibility:hidden;white-space:nowrap';
      document.body.appendChild(mesure);
      const fautifs=[];
      entetes.filter(h=>!h.classList.contains('masque')).forEach(h=>{
        const style=getComputedStyle(h);
        mesure.style.font=style.font;mesure.style.letterSpacing=style.letterSpacing;
        const libelle=h.textContent.trim();
        const mots=style.whiteSpace==='nowrap'?[libelle]:libelle.split(/\s+/);
        let plusLong=0;
        mots.forEach(mot=>{mesure.textContent=mot;plusLong=Math.max(plusLong,mesure.getBoundingClientRect().width);});
        const dispo=h.getBoundingClientRect().width-parseFloat(style.paddingLeft)-parseFloat(style.paddingRight);
        /* La poignee ::after prend une vingtaine de pixels, marge comprise. */
        if(plusLong+27>dispo)fautifs.push(libelle+' ('+Math.round(plusLong+27)+'px pour '+Math.round(dispo)+')');
      });
      mesure.remove();
      return fautifs;
    });
    egal(debordements.join(' ; '),'','en-têtes qui débordent');
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
