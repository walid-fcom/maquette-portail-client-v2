# Page Profil — portail client V2

Design validé le 5 août 2026.

## Le problème

Le menu compte de la barre latérale propose « Profil », mais le lien ne fait
rien : il referme le menu. Ses deux voisins, « Paramètres » et
« Notifications », promettaient sans tenir — ils viennent d'être supprimés.
Il ne reste donc qu'une porte pour tout ce qui relève du compte, et elle
n'ouvre sur rien.

## Le périmètre

Une fiche d'identité minimale, plus les deux seuls réglages que le produit
sait réellement offrir : la méthode de vérification en deux étapes et le mot
de passe. Rien d'autre.

Explicitement hors périmètre : sessions actives et appareils connectés, codes
de secours, préférences de notification, langue et fuseau horaire, photo de
profil, suppression de compte. Chacun ouvrirait une promesse que le produit ne
tient pas — c'est précisément ce qu'on vient de retirer du menu.

Tout est client-side. Aucun appel réseau, aucune persistance entre deux
rechargements : la maquette repart volontairement du login.

## L'écran

Une vue de plus dans le fichier, sur le modèle de toutes les autres :

```html
<section class="vue" id="v-profil" tabindex="-1" hidden>
```

Elle s'atteint par le lien « Profil » du menu compte, et par `#profil` dans
l'URL. Elle n'entre pas dans la navigation principale : c'est un écran de
compte, pas un écran de travail. Aucune entrée de barre latérale ne doit
s'allumer quand elle est ouverte — le calcul de `navNom` dans `afficher()`
donne déjà ce résultat sans modification, puisqu'aucun `a[data-vue="profil"]`
n'existe dans la barre.

Trois cartes empilées, dans cet ordre : identité, vérification en deux étapes,
mot de passe.

### Bloc 1 — Identité

En lecture seule, sans exception. La fiche appartient à Salesforce ; une
maquette qui laisse modifier un champ non modifiable ment sur le produit.

Avatar en initiales `RD` et nom en titre, puis quatre lignes :

| Champ | Valeur de démonstration |
|---|---|
| Email de connexion | robert.duris@yopmail.com |
| Fonction | Responsable achats IT |
| Société | ELECTRICITE DE FRANCE — EDF |
| Rôle portail | Contract manager *(badge)* |

Le rôle portail porte un badge parce qu'il n'est pas décoratif : c'est lui qui
détermine ce que Robert voit du portefeuille, via le `data-role` déjà câblé
sur `<body>`.

Rien d'autre : ni mention de provenance des données, ni renvoi vers un
interlocuteur pour les corriger. La fiche se lit, point. *(Décision du 6 août
2026, après avoir vu la phrase à l'écran.)*

### Bloc 2 — Vérification en deux étapes

L'état actuel en évidence : **Par email**, badge actif, adresse rappelée.

En dessous, les deux méthodes en boutons radio :

- **Par email** — code envoyé à l'adresse de connexion
- **Application d'authentification** — Google Authenticator, Authy, Microsoft
  Authenticator

Sélectionner « Application d'authentification » n'enregistre rien. Cela arme
un bouton **Configurer** qui ouvre la modale d'appairage. C'est le seul
chemin : on n'active pas une méthode qu'on n'a pas prouvé savoir utiliser.

#### La modale d'appairage

Deux étapes numérotées dans une seule modale :

1. **Scanner** — un QR code, plus la clé en clair juste en dessous
   (`JBSW Y3DP EHPK 3PXP`) pour qui ne peut pas scanner.
2. **Confirmer** — six cases de saisie, puis un bouton *Confirmer*.

Le QR est un SVG inline décoratif — un damier qui en a l'allure —, marqué
`aria-hidden`, et non un vrai code encodé : la maquette n'embarque pas de
bibliothèque de génération, et il n'y a de toute façon aucun secret réel à
appairer. Le composant de saisie à six cases existe
déjà pour le MFA du login (`.mfa-case` et `window.portailMfaSaisie`) — on le
réutilise tel quel, avance automatique de case en case comprise.

N'importe quel code à six chiffres est accepté : c'est une démonstration, et
un refus arbitraire ne prouverait rien. Le bouton *Confirmer* reste désactivé
tant que les six cases ne sont pas remplies, exactement comme au login.

À la confirmation, la modale se ferme et le bloc bascule : méthode active
« Application d'authentification », badge, date d'activation du jour, et un
bouton **Changer de méthode** qui ramène au choix.

#### La conséquence sur le login

Une fois l'application appairée, la modale MFA de connexion doit dire
« Saisissez le code à 6 chiffres de votre application » au lieu de
« Saisissez le code à 6 chiffres envoyé à **r.duris@edf.fr** ». Le bouton
« Renvoyer le code » et le compte à rebours de validité n'ont plus de sens
avec une application : ils disparaissent.

Sans cela, la démonstration se contredit à l'écran suivant. C'est la seule
partie de ce travail qui touche du code existant.

### Bloc 3 — Mot de passe

Le formulaire tient dans la carte, sans détour par une modale. Sous le titre,
directement trois champs pleine largeur, libellés en clair au-dessus : mot de
passe actuel, nouveau mot de passe, confirmation. Chacun porte le bouton œil
déjà utilisé sur l'écran de login (`.l-mdp-champ`, `.l-mdp-visibilite`), avec
son `aria-pressed` et son libellé qui bascule. Les trois basculent
indépendamment.

Ni ligne « dernière modification », ni phrase sur la portée du changement dans
les autres applications du groupe. La première inventerait une date que le
portail ne détient pas ; la seconde décrit un comportement de propagation que
la maquette ne démontre pas. *(Décisions du 6 août 2026, au fil des passages à
l'écran : la saisie est d'abord partie dans une modale, puis revenue dans la
carte sur la référence Freelance.com ; la date d'état et la mention de portée
sont tombées ensuite.)*

Les règles sont affichées en clair sous le champ plutôt que devinées : 12
caractères minimum, une majuscule, un chiffre, un caractère spécial. Chacune se
coche en vert dès qu'elle est satisfaite. Une jauge les compte — une ou deux :
faible, trois : moyen, les quatre : fort.

Le bouton **Changer le mot de passe** reste désactivé tant que les quatre
règles ne sont pas satisfaites, que le mot de passe actuel est vide, ou que la
confirmation diverge. Les règles sont affichées : les exiger vraiment, sinon
elles ne sont qu'un décor. Désactivé, le bouton est grisé — sur cet écran, un
bouton inerte qui garde son bleu plein se donne pour cliquable, ce qui vaut
aussi pour le *Configurer* du bloc précédent.

Le mot de passe actuel n'est confronté à aucune valeur : la maquette n'en
détient pas, et un refus arbitraire ne démontrerait pas le parcours — même
raisonnement que pour le code d'appairage à six chiffres.

À la validation : un message de confirmation paraît à côté du bouton, les trois
champs se vident et se remasquent, la jauge et les règles repartent à zéro. On
reste sur la page.

Explicitement hors périmètre : demande d'un code de vérification à la
confirmation, historique des mots de passe, déconnexion des autres sessions.

## L'intégration au fichier

Le portail est un fichier HTML autonome. Cinq points de contact :

1. **La vue** — `<section class="vue" id="v-profil">` parmi les autres vues,
   avec ses trois cartes.
2. **La modale d'appairage** — au niveau des autres modales, sur le modèle de
   `#mfa-modale` : un `.ov`, un `.ov-scrim`, une classe sur `<body>` pour
   l'ouverture, fermeture à l'Échap et au clic sur le voile.
3. **Le routage** — une entrée `profil:'Mon profil'` dans la table `titres`,
   qui suffit à rendre `#profil` navigable et à titrer la page.
4. **Le lien du menu compte** — `#profile-link` appelle `afficher('profil')`
   puis referme le menu, au lieu de seulement le refermer.
5. **Le comportement** — un bloc `garde('v-profil', …)` par convention du
   fichier, pour que l'écran ne puisse pas casser le reste de la page s'il
   lève.

Le CSS suit les conventions en vigueur : classes `.card`, `.eyebrow`,
`.badge`, `.btn` / `.btn.ghost`, préfixe `#v-profil` pour ce qui est propre à
l'écran.

## Comment on saura que c'est bon

- Le lien « Profil » du menu compte ouvre la page ; `#profil` dans l'URL
  l'ouvre aussi ; aucune entrée de la barre latérale ne s'allume.
- Le bloc identité n'expose aucun champ modifiable.
- Choisir « Application d'authentification » n'active rien tant que
  l'appairage n'est pas confirmé.
- Après appairage, le bloc affiche la nouvelle méthode, et la modale MFA du
  login parle de l'application, sans bouton de renvoi ni compte à rebours.
- La carte mot de passe porte ses trois champs, sans ligne de date.
- Le bouton *Changer le mot de passe* reste inerte, et visiblement grisé, tant
  qu'une règle n'est pas satisfaite ou que la confirmation ne correspond pas.
- À la validation, les champs se vident et se remasquent.
- Aucune erreur JavaScript à l'ouverture de la page ni pendant les deux
  parcours.
- Le reste du portail est intact : navigation, besoins, MFA du login quand la
  méthode est restée « email ».
