# Maquette Portail client V2 — Freelance.com

Maquette HTML navigable du portail client, version 2. Dépôt autonome, déployé
sur Netlify.

| Source | Build | Publié depuis | URL |
|---|---|---|---|
| `maquette_front_portail_client_v2.html` | `build_netlify_v2.py` | `deploy_netlify_v2/` | https://maquette-portail-client-v2.netlify.app |

Accès à la maquette : porte « Code d'accès » avant l'écran de login (voir
« Points d'attention »).

## Origine et rapport avec la V1

Partie d'une copie conforme de la maquette du portail client le 2 août 2026.
La V1 vit dans un autre dépôt, `walid-fcom/maquette-portail-client`, avec son
propre projet Netlify — les deux ne se touchent jamais.

**La V2 existe aussi dans le dépôt V1**, sous les mêmes noms de fichiers
(`maquette_front_portail_client_v2.html`, `build_netlify_v2.py`). C'est une
duplication assumée : les deux copies ne se synchronisent pas toutes seules.
**Ce dépôt-ci est la source de vérité** — c'est lui qui alimente le déploiement.
Une modification faite dans le dépôt V1 n'arrivera jamais en ligne.

`assets/`, `src/` et `functions/` sont eux aussi des copies de ceux de la V1,
figées à la date de création.

## Structure

```
maquette_front_portail_client_v2.html   source de la maquette (fichier autonome, ouvrable en local)
build_netlify_v2.py                     génère deploy_netlify_v2/
assets/                                 fichiers référencés par le build
  CGU.html
  logo-freelance.png
src/                                    fichiers recopiés tels quels dans la sortie
  404.html
  _redirects                            route /api/* vers les functions
  _headers
functions/
  metabase-guest-token.js               signe le JWT d'embed Metabase
  salesforce-lead.js
deploy_netlify_v2/                      généré, non versionné
```

Le script ne lit que des fichiers du dépôt : le build tourne à l'identique en
local et sur la CI Netlify.

## Développer

Modifie le HTML source, puis :

```bash
python3 build_netlify_v2.py
```

Ouvre `deploy_netlify_v2/index.html` dans un navigateur pour vérifier. Attention :
la vue « Tableau de bord » ne fonctionne **pas** en `file://` — elle a besoin de
la function, donc d'un déploiement Netlify (ou de `netlify dev`).

Le script échoue bruyamment si un motif attendu n'est plus trouvé dans le HTML
source, plutôt que de produire silencieusement une sortie incomplète. Si tu
touches au footer ou au bloc `#embed-tdb`, c'est là qu'il faudra le mettre à jour.

## Le tableau de bord Metabase

La vue « Tableau de bord » est un **embed statique Metabase** :

1. le navigateur charge `embed.js` depuis `metabase.plateforme.freelance.com` ;
2. il appelle `/api/metabase-guest-token`, routé vers `functions/metabase-guest-token.js` ;
3. la function signe un JWT HS256 (`resource: {dashboard: 33}`, expiration 10 min)
   avec `METABASE_EMBED_SECRET` ;
4. le token est passé à un élément `<metabase-dashboard>`.

La signature utilise le module `crypto` de Node, sans dépendance npm — le
déploiement fonctionne donc même sans étape d'installation.

`METABASE_EMBED_SECRET` vit **uniquement** dans les variables d'environnement du
projet Netlify. Jamais dans le dépôt, jamais dans `netlify.toml`.

Côté Metabase, deux prérequis : le *static embedding* doit être activé, et le
dashboard 33 publié pour l'embed.

## Configuration Netlify

| Réglage | Valeur |
|---|---|
| Site ID | `56eff20f-1913-4996-b742-6db636524705` |
| Build command | `python3 build_netlify_v2.py` |
| Publish directory | `deploy_netlify_v2` |
| Functions directory | `functions` |
| Variables d'env. | `METABASE_EMBED_SECRET` |

### Reste à faire

1. **`METABASE_EMBED_SECRET`** — à recopier depuis le projet Netlify de la V1
   (Site configuration → Environment variables). Sans elle,
   `/api/metabase-guest-token` renvoie 500 et la vue « Tableau de bord » affiche
   « momentanément indisponible ». Le reste de la maquette fonctionne.
2. **Rattacher ce dépôt au projet Netlify** pour le déploiement continu, puis
   renseigner les réglages du tableau ci-dessus. Tant que ce n'est pas fait, la
   publication passe uniquement par le CLI.

## Déployer au CLI

Aujourd'hui, le seul moyen de publier :

```bash
python3 build_netlify_v2.py
netlify deploy --prod --site 56eff20f-1913-4996-b742-6db636524705 \
  --dir deploy_netlify_v2 --functions functions
```

## Points d'attention

- La porte « Code d'accès » (`#access-gate`) compare la saisie **en JavaScript,
  côté client** : le code est lisible dans le source de la page. Elle filtre le
  curieux, pas plus — l'URL du site est le vrai secret, à traiter comme tel.
  Netlify Pro sait poser un mot de passe côté serveur (Site configuration →
  Access & security) si le besoin devient réel.
- `cv-demo.pdf` est référencé par 7 liens de la maquette (« Consulter », « Voir
  le CV ») mais le fichier n'existe pas : ces liens renvoient 404. Le déposer
  dans `assets/` et l'ajouter à `A_COPIER` dans `build_netlify_v2.py` pour les
  réparer.
