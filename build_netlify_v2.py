#!/usr/bin/env python3
"""Construit deploy_netlify_v2/ — le portail client V2, à publier sur Netlify.

Jumeau de build_netlify.py, mais sur la maquette V2. Les deux scripts sont
volontairement indépendants : la V2 est faite pour diverger de la V1, et une
retouche de sa structure (bloc #embed-tdb, footer) ne doit jamais pouvoir
casser le build du portail en production.

Comme pour la V1, la maquette source contient un repli statique pour la vue
« Tableau de bord » — fait pour une ouverture en local, sans backend. La
version Netlify dispose d'une function qui signe le JWT d'embed Metabase :
on y rebranche donc le vrai embed. La function vit dans functions/ et est
partagée avec la V1 (même dashboard, même secret).

Tout ce que lit ce script vit dans le dépôt : le build tourne à l'identique
sur ta machine et sur la CI Netlify.

Sortie : deploy_netlify_v2/ (répertoire à publier)

Usage : python3 build_netlify_v2.py
"""

import pathlib
import re
import shutil
import sys

RACINE = pathlib.Path(__file__).parent
SOURCE = RACINE / "maquette_front_portail_client_v2.html"
ASSETS = RACINE / "assets"
SRC = RACINE / "src"
SORTIE = RACINE / "deploy_netlify_v2"

# Bloc d'origine (repris du projet Vercel demo-maquettes-mvp) : embed.js est
# chargé depuis l'instance Metabase, puis le JWT est réclamé à
# /api/metabase-guest-token, que src/_redirects route vers la function.
EMBED = """<div id="embed-tdb" class="metabase-dashboard" aria-live="polite" aria-label="Tableau de bord Metabase"><p class="metabase-dashboard__message">Chargement du tableau de bord…</p></div>
<script>(function(){
  var container=document.getElementById('embed-tdb');
  function showError(){container.innerHTML='<p class="metabase-dashboard__message">Le tableau de bord est momentanément indisponible.</p>';}
  window.metabaseConfig={theme:{preset:'light'},isGuest:true,instanceUrl:'https://metabase.plateforme.freelance.com'};
  var loader=document.createElement('script');
  loader.defer=true;loader.src='https://metabase.plateforme.freelance.com/app/embed.js';
  loader.onerror=showError;
  loader.onload=function(){
    fetch('/api/metabase-guest-token',{cache:'no-store'})
      .then(function(r){if(!r.ok)throw new Error('token HTTP '+r.status);return r.json();})
      .then(function(d){
        if(!d||!d.jwt)throw new Error('jwt manquant');
        var embed=document.createElement('metabase-dashboard');
        embed.style.height='100%';
        embed.setAttribute('token',d.jwt);
        embed.setAttribute('with-title','true');embed.setAttribute('with-downloads','true');
        container.replaceChildren(embed);
      })
      .catch(function(error){console.error('Metabase embed:',error);showError();});
  };
  document.head.appendChild(loader);
})();</script>"""

MOTIF_EMBED = re.compile(r'<div id="embed-tdb".*?\}\)\(\);</script>', re.DOTALL)

# Le footer de la maquette autonome pointe vers un file:// local : mort en ligne.
CGU_LOCAL = 'href="file:///Users/walid/Downloads/CGU.html"'
CGU_EN_LIGNE = 'href="CGU.html" target="_blank" rel="noopener"'

# Fichiers recopiés tels quels dans la sortie.
A_COPIER = [(ASSETS / "CGU.html", "CGU.html"), (SRC / "404.html", "404.html"), (SRC / "_redirects", "_redirects"), (SRC / "_headers", "_headers")]


def echec(message: str) -> int:
    print(f"ERREUR : {message}", file=sys.stderr)
    return 1


def main() -> int:
    if not SOURCE.exists():
        return echec(f"maquette source absente — {SOURCE.relative_to(RACINE)}")

    manquants = [str(c.relative_to(RACINE)) for c, _ in A_COPIER if not c.exists()]
    if manquants:
        return echec("fichiers absents du dépôt — " + ", ".join(manquants))

    html = SOURCE.read_text(encoding="utf-8")

    html, n = MOTIF_EMBED.subn(lambda _: EMBED, html, count=1)
    if n != 1:
        return echec(f"bloc #embed-tdb introuvable dans {SOURCE.name} (structure modifiée ?)")

    if html.count(CGU_LOCAL) != 1:
        return echec(f"lien CGU local introuvable dans {SOURCE.name}")
    html = html.replace(CGU_LOCAL, CGU_EN_LIGNE)

    if SORTIE.exists():
        shutil.rmtree(SORTIE)
    SORTIE.mkdir(parents=True)
    (SORTIE / "index.html").write_text(html, encoding="utf-8")
    for chemin, nom in A_COPIER:
        shutil.copy2(chemin, SORTIE / nom)

    print(f"OK  {SORTIE.name}/ :")
    for f in sorted(SORTIE.iterdir()):
        print(f"      {f.name:<14} {f.stat().st_size:>10,} octets")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
