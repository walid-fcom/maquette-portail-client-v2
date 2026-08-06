# Page Profil — plan d'implémentation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Donner au lien « Profil » du menu compte une page qui existe — fiche d'identité en lecture seule, choix de la méthode MFA avec appairage d'application, changement de mot de passe.

**Architecture :** Le portail est un unique fichier HTML autonome. On y ajoute une vue `#v-profil` parmi les autres `.vue`, une modale d'appairage sur le modèle de `#mfa-modale`, une entrée dans la table de routage `titres`, et un bloc de comportement `garde('v-profil', …)`. Un script Playwright dans `tests/` sert de harnais de vérification : il ouvre la maquette en `file://`, franchit la porte d'accès et le login, puis exécute une liste de contrôles nommés.

**Tech stack :** HTML/CSS/JS sans dépendance ni build côté page. Playwright (installé globalement) pour la vérification. Python 3 pour `build_netlify_v2.py`, qu'on ne touche pas.

## Contraintes globales

- **Un seul fichier.** Tout le code de la page vit dans `maquette_front_portail_client_v2.html`. Pas de fichier CSS ou JS séparé, pas de dépendance npm dans la page.
- **Aucun appel réseau.** La page ne fait ni `fetch` ni `XMLHttpRequest`. Tout est simulé côté client.
- **Aucune persistance.** Rien dans `localStorage` : la maquette repart volontairement du login à chaque rechargement.
- **Préfixe `compte-` pour les identifiants et classes de la page.** Le préfixe `profil-` est déjà pris par le tiroir de profil candidat (`.profil-drawer`, `.profil-tabs`, `.profil-section`…). Le réutiliser casserait ce tiroir. Seuls `#v-profil` et le mot `profil` dans le routage font exception, car ils ne peuvent pas entrer en collision.
- **Convention de titre de vue :** `<h2 class="h-vue">` à l'intérieur d'une `.card`.
- **Convention de robustesse :** tout nouveau bloc de comportement passe par `garde('<id-ancre>', function(){ … })`, qui isole les erreurs.
- **Le français de l'interface est celui du fichier :** apostrophes typographiques `’` dans les textes visibles.
- **Chaque tâche se termine par un commit** avec un message en français, sans accent dans le sujet (convention du dépôt).

---

### Task 1 : harnais de vérification et vue Profil atteignable

**Files:**
- Create: `tests/verifier-profil.js`
- Modify: `maquette_front_portail_client_v2.html` (CSS `#v-profil`, vue `#v-profil`, table `titres`, handler `#profile-link`)

**Interfaces:**
- Produces : `tests/verifier-profil.js` exporte le harnais que toutes les tâches suivantes étendent — la fonction `ouvrirPortail(page)` (qui franchit la porte d'accès, le login et le MFA), le tableau `CONTROLES` de `{nom, fn}`, et un code de sortie non nul dès qu'un contrôle échoue.
- Produces : la vue `#v-profil`, atteignable par `afficher('profil')` et par `#profil` dans l'URL.

- [ ] **Step 1 : écrire le harnais et ses trois premiers contrôles**

Créer `tests/verifier-profil.js` :

```js
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
```

- [ ] **Step 2 : lancer le harnais pour le voir échouer**

```bash
node tests/verifier-profil.js
```

Attendu : les trois contrôles en `ECHEC`, le premier sur un timeout de `#v-profil:not([hidden])` — la vue n'existe pas encore.

- [ ] **Step 3 : ajouter le CSS de la page**

Dans le `<style>`, juste après la ligne `#v-factures .presta-filtre-label{color:#66665f}` :

```css
  /* ── Page Profil (#v-profil) ── */
  #v-profil .card+.card{margin-top:18px}
  #v-profil h2.h-vue{font-size:30px;font-weight:800;letter-spacing:-.03em;color:#161616}
  .compte-identite-head{display:flex;align-items:center;gap:16px}
  .compte-identite-head h2{font-size:19px;font-weight:800;letter-spacing:-.02em;color:var(--t-900)}
  .compte-avatar{display:grid;place-items:center;width:56px;height:56px;flex:none;border-radius:16px;background:#173fc1;color:#fff;font:800 20px Montserrat,system-ui,sans-serif}
  .compte-champs{display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:18px 26px;margin-top:24px}
  .compte-champs dt{font-size:10.5px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:var(--t-600)}
  .compte-champs dd{margin-top:6px;font-size:14px;font-weight:600;color:var(--t-900)}
```

- [ ] **Step 4 : ajouter la vue**

Dans `<div class="cont">`, juste après la fermeture de la vue `#v-documents` et avant la fermeture du conteneur :

```html
      <section class="vue" id="v-profil" tabindex="-1" hidden>
        <section class="card">
          <h2 class="h-vue">Mon profil</h2>
        </section>
        <section class="card compte-identite">
          <div class="compte-identite-head">
            <span class="compte-avatar" aria-hidden="true">RD</span>
            <div>
              <h2>Robert DURIS</h2>
              <p class="card-sub">Compte client · portail Freelance.com</p>
            </div>
          </div>
          <dl class="compte-champs">
            <div><dt>Email de connexion</dt><dd>robert.duris@yopmail.com</dd></div>
            <div><dt>Fonction</dt><dd>Responsable achats IT</dd></div>
            <div><dt>Société</dt><dd>ELECTRICITE DE FRANCE — EDF</dd></div>
            <div><dt>Rôle portail</dt><dd><span class="badge b-neutre">Contract manager</span></dd></div>
          </dl>
        </section>
      </section>
```

- [ ] **Step 5 : router la vue**

Dans la table `titres`, ajouter la paire `profil:'Mon profil'`. La ligne se termine aujourd'hui par :

```js
    conformite:'Conformité','conformite-detail':'Conformité','dc4-detail':'Conformité',documents:'Documents',activites:'Activités'};
```

Elle devient :

```js
    conformite:'Conformité','conformite-detail':'Conformité','dc4-detail':'Conformité',documents:'Documents',activites:'Activités',profil:'Mon profil'};
```

Aucune autre modification du routage n'est nécessaire : `afficher()` masque toutes les `.vue` sauf `v-profil`, et le calcul de `navNom` ne trouve aucun `a[data-vue="profil"]` dans la barre latérale, donc aucune entrée ne s'allume.

- [ ] **Step 6 : rendre le lien du menu compte vivant**

Remplacer, dans le bloc `garde('side-account', …)` :

```js
    document.getElementById('profile-link').addEventListener('click',function(e){e.preventDefault();fermerCompte();});
```

par :

```js
    document.getElementById('profile-link').addEventListener('click',function(e){e.preventDefault();fermerCompte();afficher('profil');});
```

`afficher` est déclarée dans la même portée (fonction nommée, donc hissée) : l'appel est valide.

- [ ] **Step 7 : relancer le harnais**

```bash
node tests/verifier-profil.js
```

Attendu : les trois contrôles en `OK`.

- [ ] **Step 8 : commit**

```bash
git add tests/verifier-profil.js maquette_front_portail_client_v2.html
git commit -m "Ouvre la page Profil sur une fiche d identite en lecture seule"
```

---

### Task 2 : bloc « Vérification en deux étapes »

**Files:**
- Modify: `maquette_front_portail_client_v2.html` (CSS `#v-profil`, vue `#v-profil`, nouveau bloc `garde('compte-mfa-etat', …)`)
- Modify: `tests/verifier-profil.js` (deux contrôles de plus)

**Interfaces:**
- Consumes : la vue `#v-profil` et le harnais de la tâche 1.
- Produces : `#compte-mfa-etat` (libellé de la méthode active), les radios `input[name="compte-mfa"]` de valeurs `email` et `app`, et le bouton `#compte-mfa-configurer`, désactivé tant que la méthode déjà active est sélectionnée. La tâche 3 branche ce bouton sur la modale d'appairage.

- [ ] **Step 1 : écrire les contrôles**

Ajouter au tableau `CONTROLES` de `tests/verifier-profil.js`, avant la parenthèse fermante :

```js
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
```

- [ ] **Step 2 : lancer le harnais pour voir les deux nouveaux contrôles échouer**

```bash
node tests/verifier-profil.js
```

Attendu : les trois premiers `OK`, les deux nouveaux en `ECHEC` (sélecteur `#compte-mfa-etat` introuvable).

- [ ] **Step 3 : ajouter le CSS du bloc**

À la suite du bloc CSS `#v-profil` créé en tâche 1 :

```css
  .compte-mfa-actuel{display:flex;align-items:center;gap:12px;flex-wrap:wrap;margin-top:6px;padding:16px 18px;border:1px solid var(--t-200);border-radius:14px;background:var(--t-50)}
  .compte-mfa-actuel b{font-size:14px;color:var(--t-900)}
  .compte-mfa-actuel span.compte-mfa-cible{color:var(--t-600);font-size:12.5px}
  .compte-mfa-choix{display:grid;gap:12px;margin-top:20px}
  .compte-mfa-option{display:grid;grid-template-columns:22px minmax(0,1fr);gap:12px;align-items:start;padding:16px 18px;border:1px solid var(--t-200);border-radius:14px;cursor:pointer}
  .compte-mfa-option:hover{background:var(--t-50)}
  .compte-mfa-option:has(input:checked){border-color:var(--brand);box-shadow:0 0 0 3px rgba(0,60,194,.09)}
  .compte-mfa-option b{display:block;font-size:13.5px;color:var(--t-900)}
  .compte-mfa-option small{display:block;margin-top:4px;color:var(--t-600);font-size:12.5px;line-height:1.5}
  .compte-mfa-actions{display:flex;align-items:center;gap:14px;margin-top:20px}
```

- [ ] **Step 4 : ajouter la carte dans la vue**

Après la carte `.compte-identite`, dans `#v-profil` :

```html
        <section class="card compte-mfa">
          <h2 class="h-vue" style="font-size:19px">Vérification en deux étapes</h2>
          <p class="card-sub">Une seconde preuve d’identité vous est demandée à chaque connexion.</p>
          <div class="compte-mfa-actuel">
            <span class="badge ok">Activée</span>
            <b id="compte-mfa-etat">Par email</b>
            <span class="compte-mfa-cible" id="compte-mfa-cible">robert.duris@yopmail.com</span>
          </div>
          <div class="compte-mfa-choix" role="radiogroup" aria-label="Méthode de vérification">
            <label class="compte-mfa-option">
              <input type="radio" name="compte-mfa" value="email" checked>
              <span><b>Par email</b><small>Un code à 6 chiffres est envoyé à votre adresse de connexion.</small></span>
            </label>
            <label class="compte-mfa-option">
              <input type="radio" name="compte-mfa" value="app">
              <span><b>Application d’authentification</b><small>Google Authenticator, Authy, Microsoft Authenticator. Le code est généré hors ligne, sur votre téléphone.</small></span>
            </label>
          </div>
          <div class="compte-mfa-actions">
            <button class="btn" id="compte-mfa-configurer" type="button" disabled>Configurer</button>
            <p class="compte-mfa-statut" id="compte-mfa-statut" role="status"></p>
          </div>
        </section>
```

- [ ] **Step 5 : armer le bouton**

Ajouter un bloc de comportement, à la suite du bloc `garde('side-account', …)` :

```js
  garde('compte-mfa-etat',function(){
    var etat=document.getElementById('compte-mfa-etat'),configurer=document.getElementById('compte-mfa-configurer');
    if(!etat||!configurer)return;
    var radios=[].slice.call(document.querySelectorAll('input[name="compte-mfa"]'));
    /* Le bouton n'a de sens que pour une methode qui n'est pas deja active :
       on n'active rien qu'on n'ait pas prouve savoir utiliser. */
    function majBouton(){
      var choisi=(radios.filter(function(r){return r.checked;})[0]||{}).value;
      var actif=etat.textContent.trim()==='Par email'?'email':'app';
      configurer.disabled=(choisi===actif);
      configurer.textContent=choisi==='app'?'Configurer':'Revenir à l’email';
    }
    radios.forEach(function(r){r.addEventListener('change',majBouton);});
    majBouton();
    window.__compteMfaMajBouton=majBouton;
  });
```

`window.__compteMfaMajBouton` est exposé parce que la tâche 3 doit rafraîchir l'état du bouton après un appairage réussi. C'est la convention du fichier pour les fonctions partagées entre blocs (`window.__afficherOngletForfait`, `window.__majSelection`).

- [ ] **Step 6 : relancer le harnais**

```bash
node tests/verifier-profil.js
```

Attendu : les cinq contrôles en `OK`.

- [ ] **Step 7 : commit**

```bash
git add tests/verifier-profil.js maquette_front_portail_client_v2.html
git commit -m "Ajoute le choix de la methode de verification en deux etapes"
```

---

### Task 3 : modale d'appairage et bascule de la méthode active

**Files:**
- Modify: `maquette_front_portail_client_v2.html` (généralisation de `portailMfaSaisie`, CSS de la modale, modale `#appairage-modale`, bloc `garde('appairage-modale', …)`)
- Modify: `tests/verifier-profil.js` (trois contrôles de plus)

**Interfaces:**
- Consumes : `#compte-mfa-configurer`, `#compte-mfa-etat`, `#compte-mfa-cible`, `#compte-mfa-statut` et `window.__compteMfaMajBouton` de la tâche 2.
- Produces : après appairage confirmé, `#compte-mfa-etat` vaut `Application d’authentification` et `document.body.dataset.mfaMethode` vaut `app`. La tâche 4 lit ce `data-mfa-methode` pour adapter la modale de connexion.

- [ ] **Step 1 : écrire les contrôles**

Ajouter au tableau `CONTROLES` :

```js
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
```

- [ ] **Step 2 : lancer le harnais pour voir les trois nouveaux contrôles échouer**

```bash
node tests/verifier-profil.js
```

Attendu : les cinq premiers `OK`, les trois nouveaux en `ECHEC` (`#appairage-modale` introuvable).

- [ ] **Step 3 : généraliser la saisie à six cases**

`portailMfaSaisie` interroge aujourd'hui **toutes** les `.mfa-case` de la page et pilote toujours `#mfa-verifier`. Deux groupes de cases dans le document, et le bouton du login ne s'activerait plus qu'une fois les douze cases remplies. On scope la fonction à son groupe et on lui laisse lire le bouton à piloter.

Remplacer le corps de `window.portailMfaSaisie` :

```js
  window.portailMfaSaisie=function(champ){
    var cases=Array.prototype.slice.call(document.querySelectorAll('.mfa-case'));
    var index=cases.indexOf(champ),bouton=document.getElementById('mfa-verifier');
    champ.value=(champ.value||'').replace(/\D/g,'').slice(-1);
    champ.classList.toggle('rempli',!!champ.value);
    if(champ.value&&index>-1&&index<cases.length-1)cases[index+1].focus();
    if(bouton)bouton.disabled=!cases.length||cases.some(function(c){return !/^\d$/.test(c.value);});
  };
```

par :

```js
  window.portailMfaSaisie=function(champ){
    /* Chaque groupe de cases est autonome : le portail en compte deux (connexion
       et appairage), et le bouton pilote est celui que le groupe designe. */
    var groupe=champ.closest('.mfa-cases')||document;
    var cases=Array.prototype.slice.call(groupe.querySelectorAll('.mfa-case'));
    var index=cases.indexOf(champ);
    var bouton=document.getElementById(groupe.dataset&&groupe.dataset.bouton||'mfa-verifier');
    champ.value=(champ.value||'').replace(/\D/g,'').slice(-1);
    champ.classList.toggle('rempli',!!champ.value);
    if(champ.value&&index>-1&&index<cases.length-1)cases[index+1].focus();
    if(bouton)bouton.disabled=!cases.length||cases.some(function(c){return !/^\d$/.test(c.value);});
  };
```

Le groupe du login ne porte pas de `data-bouton` : il retombe sur `mfa-verifier`, son comportement actuel.

- [ ] **Step 4 : ajouter le CSS de la modale**

À la suite du bloc CSS `#v-profil` :

```css
  body.appairage-open .ov-scrim.s-appairage{display:block}
  body.appairage-open .ov.o-appairage{display:flex}
  .appairage-box{width:min(100%,460px);margin:auto;padding:30px;border-radius:20px;background:#fff;box-shadow:0 24px 64px rgba(15,23,42,.24)}
  .appairage-etape{display:grid;grid-template-columns:26px minmax(0,1fr);gap:14px;margin-top:22px}
  .appairage-num{display:grid;place-items:center;width:26px;height:26px;border-radius:50%;background:var(--brand);color:#fff;font:800 12px Montserrat,system-ui,sans-serif}
  .appairage-etape b{font-size:13.5px;color:var(--t-900)}
  .appairage-qr{display:block;width:158px;height:158px;margin:14px 0 10px;border:1px solid var(--t-200);border-radius:12px;background:#fff;padding:8px}
  .appairage-cle{display:inline-block;padding:8px 12px;border-radius:9px;background:var(--t-50);color:var(--t-800);font:700 13px ui-monospace,SFMono-Regular,Menlo,monospace;letter-spacing:.08em}
  .appairage-actions{display:flex;justify-content:flex-end;gap:10px;margin-top:26px}
```

- [ ] **Step 5 : ajouter la modale**

Juste après la modale `#mfa-modale` et son voile `.ov-scrim.s-mfa` :

```html
<div class="ov-scrim s-appairage" id="appairage-scrim"></div>
<div class="ov o-appairage" id="appairage-modale" role="dialog" aria-modal="true" aria-labelledby="appairage-titre">
  <div class="appairage-box">
    <div class="m-tete">
      <h2 id="appairage-titre">Configurer l’application</h2>
      <button class="m-fermer" id="appairage-fermer" type="button" aria-label="Fermer la fenêtre"><svg class="ic"><use href="#i-croix"/></svg></button>
    </div>
    <div class="appairage-etape">
      <span class="appairage-num" aria-hidden="true">1</span>
      <div>
        <b>Scannez ce code avec votre application</b>
        <svg class="appairage-qr" viewBox="0 0 29 29" aria-hidden="true" shape-rendering="crispEdges"><rect width="29" height="29" fill="#fff"/><path fill="#161616" d="M0 0h7v7H0zM22 0h7v7h-7zM0 22h7v7H0zM2 2h3v3H2zM24 2h3v3h-3zM2 24h3v3H2zM9 0h2v2H9zM13 0h2v3h-2zM17 1h2v2h-2zM9 4h3v2H9zM14 5h2v2h-2zM18 4h2v3h-2zM0 9h2v2H0zM4 9h3v2H4zM9 9h2v2H9zM13 9h3v2h-3zM18 9h2v2h-2zM22 9h2v2h-2zM26 9h3v2h-3zM2 12h3v2H2zM7 12h2v3H7zM11 12h2v2h-2zM15 12h3v2h-3zM20 12h2v3h-2zM24 12h2v2h-2zM0 16h3v2H0zM5 16h2v2H5zM9 15h2v3H9zM13 16h2v2h-2zM17 15h2v3h-2zM22 16h2v2h-2zM26 16h3v2h-3zM9 19h2v2H9zM13 19h3v2h-3zM18 19h2v2h-2zM22 20h3v2h-3zM26 20h2v2h-2zM9 23h3v2H9zM14 22h2v3h-2zM18 23h2v2h-2zM22 24h2v2h-2zM26 24h2v3h-2zM9 26h2v3H9zM13 26h3v2h-3zM18 26h2v3h-2zM22 27h5v2h-5z"/></svg>
        <span class="appairage-cle" id="appairage-cle">JBSW Y3DP EHPK 3PXP</span>
        <p class="card-sub">Impossible de scanner ? Saisissez cette clé à la main dans votre application.</p>
      </div>
    </div>
    <div class="appairage-etape">
      <span class="appairage-num" aria-hidden="true">2</span>
      <div>
        <b>Entrez le code affiché par l’application</b>
        <div class="mfa-cases" data-bouton="appairage-confirmer" role="group" aria-label="Code d’appairage à 6 chiffres">
          <input class="mfa-case" type="text" inputmode="numeric" maxlength="1" aria-label="Chiffre 1 sur 6" oninput="portailMfaSaisie(this)">
          <input class="mfa-case" type="text" inputmode="numeric" maxlength="1" aria-label="Chiffre 2 sur 6" oninput="portailMfaSaisie(this)">
          <input class="mfa-case" type="text" inputmode="numeric" maxlength="1" aria-label="Chiffre 3 sur 6" oninput="portailMfaSaisie(this)">
          <input class="mfa-case" type="text" inputmode="numeric" maxlength="1" aria-label="Chiffre 4 sur 6" oninput="portailMfaSaisie(this)">
          <input class="mfa-case" type="text" inputmode="numeric" maxlength="1" aria-label="Chiffre 5 sur 6" oninput="portailMfaSaisie(this)">
          <input class="mfa-case" type="text" inputmode="numeric" maxlength="1" aria-label="Chiffre 6 sur 6" oninput="portailMfaSaisie(this)">
        </div>
      </div>
    </div>
    <div class="appairage-actions">
      <button class="btn ghost" id="appairage-annuler" type="button">Annuler</button>
      <button class="btn" id="appairage-confirmer" type="button" disabled>Confirmer</button>
    </div>
  </div>
</div>
```

Le QR est un SVG décoratif, `aria-hidden` : il n'y a aucun secret réel à appairer, et la maquette n'embarque pas de bibliothèque de génération.

- [ ] **Step 6 : brancher la modale**

Ajouter un bloc de comportement, à la suite de `garde('compte-mfa-etat', …)` :

```js
  garde('appairage-modale',function(){
    var modale=document.getElementById('appairage-modale'),voile=document.getElementById('appairage-scrim'),
        ouvrirBouton=document.getElementById('compte-mfa-configurer'),
        confirmer=document.getElementById('appairage-confirmer'),
        etat=document.getElementById('compte-mfa-etat'),cible=document.getElementById('compte-mfa-cible'),
        statut=document.getElementById('compte-mfa-statut'),
        cases=[].slice.call(modale.querySelectorAll('.mfa-case')),declencheur=null;
    if(!modale||!ouvrirBouton)return;
    function vider(){cases.forEach(function(c){c.value='';c.classList.remove('rempli');});confirmer.disabled=true;}
    function ouvrir(){declencheur=document.activeElement;vider();document.body.classList.add('appairage-open');cases[0].focus();}
    function fermer(){document.body.classList.remove('appairage-open');if(declencheur&&declencheur.focus)declencheur.focus();}
    function choix(){var r=document.querySelector('input[name="compte-mfa"]:checked');return r?r.value:'email';}
    function appliquer(methode){
      document.body.dataset.mfaMethode=methode;
      etat.textContent=methode==='app'?'Application d’authentification':'Par email';
      cible.textContent=methode==='app'?'Appairée le '+new Date().toLocaleDateString('fr-FR'):'robert.duris@yopmail.com';
      statut.textContent=methode==='app'?'Application appairée. Elle vous sera demandée à la prochaine connexion.':'Vérification par email rétablie.';
      if(window.__compteMfaMajBouton)window.__compteMfaMajBouton();
    }
    /* Revenir a l'email ne demande pas d'appairage : il n'y a rien a prouver. */
    ouvrirBouton.addEventListener('click',function(){if(choix()==='app')ouvrir();else appliquer('email');});
    confirmer.addEventListener('click',function(){appliquer('app');fermer();});
    document.getElementById('appairage-annuler').addEventListener('click',fermer);
    document.getElementById('appairage-fermer').addEventListener('click',fermer);
    voile.addEventListener('click',fermer);
    document.addEventListener('keydown',function(e){
      if(e.key==='Escape'&&document.body.classList.contains('appairage-open'))fermer();});
  });
```

- [ ] **Step 7 : relancer le harnais**

```bash
node tests/verifier-profil.js
```

Attendu : les huit contrôles en `OK`.

- [ ] **Step 8 : commit**

```bash
git add tests/verifier-profil.js maquette_front_portail_client_v2.html
git commit -m "Ajoute l appairage d une application d authentification"
```

---

### Task 4 : répercussion sur la modale de connexion

**Files:**
- Modify: `maquette_front_portail_client_v2.html` (bloc `garde('appairage-modale', …)` — fonction `appliquer`)
- Modify: `tests/verifier-profil.js` (un contrôle de plus)

**Interfaces:**
- Consumes : `document.body.dataset.mfaMethode` posé par la tâche 3.
- Produces : rien de nouveau. Dernière tâche à toucher au MFA.

Une fois l'application appairée, la modale de connexion ne peut plus parler d'un code envoyé par email, ni proposer de le renvoyer, ni décompter sa validité : un code d'application est généré hors ligne et tourne tout seul. Sans cette tâche, la démonstration se contredit à l'écran suivant.

- [ ] **Step 1 : écrire le contrôle**

Ajouter au tableau `CONTROLES` :

```js
  {nom:'apres appairage, le MFA de connexion parle de l application',fn:async page=>{
    await ouvrirProfil(page);
    await page.check('input[name="compte-mfa"][value="app"]');
    await page.click('#compte-mfa-configurer');
    await page.waitForSelector('#appairage-modale',{state:'visible'});
    const cases=await page.$$('#appairage-modale .mfa-case');
    for(let i=0;i<cases.length;i++)await cases[i].fill('4');
    await page.click('#appairage-confirmer');
    await page.waitForSelector('#appairage-modale',{state:'hidden'});
    /* Le menu compte s'est referme a l'ouverture de la page : le rouvrir avant
       de pouvoir cliquer sur Deconnexion. */
    await page.click('#side-account-trigger');
    await page.click('#deconnexion');
    await page.click('#l-connecter');
    await page.waitForSelector('#mfa-modale .mfa-case',{state:'visible'});
    egal(await page.$eval('#mfa-sous',e=>e.textContent.trim()),'Saisissez le code à 6 chiffres affiché par votre application.','sous-titre du MFA');
    egal(await page.$eval('#mfa-renvoyer',e=>e.offsetParent===null),true,'bouton Renvoyer masqué');
    egal(await page.$eval('#mfa-validite',e=>e.offsetParent===null),true,'compte à rebours masqué');
  }},
```

- [ ] **Step 2 : lancer le harnais pour voir le contrôle échouer**

```bash
node tests/verifier-profil.js
```

Attendu : les huit premiers `OK`, le nouveau en `ECHEC` sur le sous-titre, qui parle encore de `r.duris@edf.fr`.

- [ ] **Step 3 : adapter la modale de connexion**

Dans le bloc `garde('appairage-modale', …)`, étendre la fonction `appliquer`. Elle devient :

```js
    function appliquer(methode){
      document.body.dataset.mfaMethode=methode;
      etat.textContent=methode==='app'?'Application d’authentification':'Par email';
      cible.textContent=methode==='app'?'Appairée le '+new Date().toLocaleDateString('fr-FR'):'robert.duris@yopmail.com';
      statut.textContent=methode==='app'?'Application appairée. Elle vous sera demandée à la prochaine connexion.':'Vérification par email rétablie.';
      if(window.__compteMfaMajBouton)window.__compteMfaMajBouton();
      /* La modale de connexion doit suivre : un code d'application est genere
         hors ligne, on ne le renvoie pas et on ne decompte pas sa validite. */
      var sous=document.getElementById('mfa-sous'),
          renvoyer=document.getElementById('mfa-renvoyer'),
          validite=document.getElementById('mfa-validite');
      if(sous)sous.innerHTML=methode==='app'
        ?'Saisissez le code à 6 chiffres affiché par votre application.'
        :'Saisissez le code à 6 chiffres envoyé à <b>r.duris@edf.fr</b>.';
      if(renvoyer)renvoyer.hidden=(methode==='app');
      if(validite)validite.hidden=(methode==='app');
    }
```

- [ ] **Step 4 : relancer le harnais**

```bash
node tests/verifier-profil.js
```

Attendu : les neuf contrôles en `OK`. Le contrôle 1 de la tâche 1 vérifie déjà, à chaque exécution, que le MFA par email fonctionne toujours quand on n'a rien appairé — c'est lui qui protège contre une régression du login.

- [ ] **Step 5 : commit**

```bash
git add tests/verifier-profil.js maquette_front_portail_client_v2.html
git commit -m "Fait suivre la modale de connexion a la methode de verification choisie"
```

---

### Task 5 : bloc mot de passe — fait le 6 août 2026

La forme a bougé deux fois le jour de la livraison : la saisie est partie dans
une modale, puis revenue dans la carte sur une référence Freelance.com, et la
ligne « dernière modification » est tombée. Les étapes ci-dessous décrivent ce
qui est en place.

**Files:**
- Modify: `maquette_front_portail_client_v2.html` (CSS `#v-profil`, carte dans
  `#v-profil`, bloc `garde('compte-mdp-valider', …)`)
- Modify: `tests/verifier-profil.js` (six contrôles de plus)

**Interfaces:**
- Consumes : la vue `#v-profil` de la tâche 1, le champ à œil de l'écran de
  login (`.l-mdp-champ`, `.l-mdp-visibilite`).
- Produces : rien que d'autres tâches consomment. Dernière tâche du plan.

- [x] **Step 1 : écrire les six contrôles**

Ils couvrent, dans l'ordre : les trois champs présents et l'absence de ligne de
date, le bouton inerte tant que la confirmation diverge, le bouton inerte tant
qu'une règle manque, la jauge et les règles qui suivent la frappe, la
validation qui confirme et vide les champs, et l'œil qui bascule chaque champ
indépendamment.

- [x] **Step 2 : lancer le harnais pour les voir échouer**

```bash
node tests/verifier-profil.js
```

- [x] **Step 3 : ajouter le CSS**

À la suite du bloc `#v-profil` : `.compte-mdp-champs` (libellés en clair,
champs pleine largeur, œil à droite), `.compte-mdp-jauge`, `.compte-mdp-regles`
cochables, `.compte-mdp-actions`, `.compte-mdp-statut`. Plus
`#v-profil .btn[disabled]{opacity:.42}` — sans quoi un bouton inerte garde son
bleu plein et se donne pour cliquable, ce qui valait aussi pour le *Configurer*
du bloc MFA.

- [x] **Step 4 : ajouter la carte dans la vue**

Après la carte `.compte-mfa` : titre, phrase sur la portée du changement dans
le groupe, les trois champs, le bouton `#compte-mdp-valider` et le message
`#compte-mdp-statut` en `role="status"`.

- [x] **Step 5 : brancher le bloc**

Un `garde('compte-mdp-valider', …)` : jauge et règles recalculées à la frappe,
bouton armé seulement quand les quatre règles sont satisfaites et que la
confirmation correspond, validation qui affiche le message, vide les champs,
les remasque et remet les yeux à l'état fermé.

- [x] **Step 6 : relancer le harnais**

```bash
node tests/verifier-profil.js
```

Obtenu : les quinze contrôles en `OK`.

- [x] **Step 7 : vérifier que le build passe toujours**

```bash
python3 build_netlify_v2.py
```

Obtenu : le script se termine sans erreur.

- [x] **Step 8 : commit**

---

## Couverture de la spec

| Exigence de la spec | Tâche |
|---|---|
| Vue `#v-profil`, atteinte par le lien et par `#profil` | 1 |
| Aucune entrée de barre latérale allumée | 1 |
| Fiche d'identité, quatre champs, lecture seule | 1 |
| ~~Mention « informations Freelance.com » avec lien contact~~ — retirée le 6 août 2026 sur décision de Walid, commit `9715b94` | — |
| État MFA actuel en évidence | 2 |
| Deux méthodes en radio | 2 |
| Sélectionner l'application n'active rien, arme *Configurer* | 2 |
| Modale d'appairage : QR décoratif, clé en clair, six cases | 3 |
| N'importe quel code accepté, *Confirmer* inerte avant six chiffres | 3 |
| Bascule de la méthode active, date d'activation, retour possible | 3 |
| Modale de connexion adaptée, sans renvoi ni compte à rebours | 4 |
| Carte mot de passe : phrase de portée, trois champs, œil par champ | 5 |
| Aucune ligne « dernière modification » | 5 |
| Jauge et quatre règles cochables | 5 |
| Bouton inerte, et grisé, tant qu'une règle manque ou que la confirmation diverge | 5 |
| Validation : message en place, champs vidés et remasqués | 5 |
| Aucune erreur JS | harnais, à chaque contrôle |
| Reste du portail intact | 1 (aucune entrée allumée), 3 (login non perturbé), 4 (MFA email préservé) |
