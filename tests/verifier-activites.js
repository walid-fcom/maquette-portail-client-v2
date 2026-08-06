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
  await page.fill('#access-code',CODE_ACCES);
  await page.click('#access-gate-form button[type=submit]');
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

const CONTROLES=[
  {nom:'les prestations sont regroupees par marche, tout replie',fn:async page=>{
    await ouvrirActivites(page);
    const g=await groupes(page);
    egal(g.map(x=>x.nom).join(' | '),
      'AT Prestations SI 2024-28 | Accord-cadre Data & IA | Marché Infra & Cloud','marchés et ordre');
    egal(g.map(x=>x.compte).join(' | '),'4 prestations | 2 prestations | 2 prestations','décomptes');
    egal(g.every(x=>!x.ouvert),true,'tous repliés à l’ouverture');
  }},
  {nom:'chaque groupe ne contient que les prestations de son marche',fn:async page=>{
    await ouvrirActivites(page);
    const marches=await page.$$eval('.marche-groupe',blocs=>blocs.map(b=>{
      const attendus=[].slice.call(b.querySelectorAll('tbody tr')).map(l=>l.dataset.marche);
      return b.dataset.marche+':'+Array.from(new Set(attendus)).join(',');
    }));
    egal(marches.join(' | '),'at-si:at-si | data-ia:data-ia | infra:infra','appartenance des lignes');
  }},
  {nom:'la table unique a disparu au profit des groupes',fn:async page=>{
    await ouvrirActivites(page);
    egal(await page.$$eval('#v-prestations .presta-table',t=>t.length),3,'nombre de tables');
    egal(await page.$$eval('#v-prestations .presta-table',t=>t.every(x=>!!x.closest('.marche-groupe'))),true,'toutes dans un groupe');
  }},
  {nom:'la colonne Marche est masquee, devenue titre de groupe',fn:async page=>{
    await ouvrirActivites(page);
    egal(await page.$$eval('#v-prestations th[data-col="marche"]',t=>t.every(x=>x.classList.contains('masque'))),true,'colonne Marché masquée');
    egal(await page.$eval('[data-presta-col="marche"]',e=>e.checked),false,'case décochée dans le configurateur');
  }},
  {nom:'Tout ouvrir et Tout fermer pilotent les trois groupes',fn:async page=>{
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
  {nom:'Reinitialiser rend les trois groupes',fn:async page=>{
    await ouvrirActivites(page);
    await page.fill('#filtre-prestations-search','zzzzz-introuvable');
    await page.click('#reset-prestations');
    const g=await groupes(page);
    egal(g.length,3,'groupes restants');
    egal(g.map(x=>x.compte).join(' | '),'4 prestations | 2 prestations | 2 prestations','décomptes rétablis');
  }},
  {nom:'une ligne de groupe ouvre toujours le detail de la prestation',fn:async page=>{
    await ouvrirActivites(page);
    await page.click('#prestations-tout-ouvrir');
    await page.click('.marche-groupe[data-marche="infra"] tbody tr');
    await page.waitForSelector('#v-forfait-affaire:not([hidden]),#v-activite-detail:not([hidden]),#v-portage-prestation-detail:not([hidden])');
  }},
  {nom:'la vue ne porte plus de pagination',fn:async page=>{
    await ouvrirActivites(page);
    egal(await page.$$eval('#v-prestations .pagination',p=>p.length),0,'barres de pagination');
  }},
  {nom:'les colonnes tombent en face d un groupe a l autre',fn:async page=>{
    await ouvrirActivites(page);
    await page.click('#prestations-tout-ouvrir');
    const gabarits=await page.$$eval('.marche-groupe table',tables=>tables.map(t=>
      [].slice.call(t.querySelectorAll('thead th')).filter(h=>!h.classList.contains('masque'))
        .map(h=>Math.round(h.getBoundingClientRect().width)).join(',')));
    egal(gabarits[1],gabarits[0],'gabarit du 2e groupe');
    egal(gabarits[2],gabarits[0],'gabarit du 3e groupe');
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
