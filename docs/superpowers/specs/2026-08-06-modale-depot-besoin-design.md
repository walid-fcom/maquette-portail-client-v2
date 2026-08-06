# Modale de dépôt du besoin — refonte

Design validé le 6 août 2026, sur une maquette apportée par Walid.

## Ce qui change

La modale « Confiez-nous votre besoin » gardait la structure d'origine : un
sous-titre sur l'assistant, un badge *Assistance IA*, une ligne « Analyse
terminée », un choix de type de prestation en deux cartes, quatre champs
marqués « détecté », et une note de bas de page permanente.

La nouvelle maquette dépouille tout cela. Reste : le titre, la description
libre, un séparateur, six champs en deux colonnes, deux boutons.

## L'écran

### La description

Un `textarea` de quatre lignes, **vide**, posé sur la crème du portail. Il porte
le propos de la fenêtre : une phrase dite en langage courant, dont le reste
découle. Sa surface le distingue des champs sans qu'il faille l'annoncer, et
son texte est plus grand et plus aéré que le leur.

Son exemple montre le registre attendu plutôt que de l'expliquer : « Ex. : un
développeur Node.js senior à Paris, à partir de septembre, entre 500 et 700 €
par jour, deux jours de télétravail par semaine. »

### Les six champs

Deux colonnes, dans cet ordre :

| | |
|---|---|
| Intitulé du poste | Compétences |
| Séniorité | Localisation |
| Date de démarrage | TJM ou budget cible |

**Intitulé du poste** devient une liste ouverte : on choisit dans les postes
proposés ou on saisit le sien. La séniorité en sort — elle a désormais son
champ —, l'intitulé passe donc de « Développeur Node.js senior » à
« Développeur Node.js ».

**Compétences** est un champ à jetons : chaque compétence retenue devient une
pastille devant le curseur. On en ajoute à la frappe (Entrée ou virgule) ou en
piochant dans la liste ; on en retire par la croix de la pastille, ou par
retour arrière quand le champ est vide. Une compétence déjà retenue ne se
duplique pas, quelle que soit la casse.

**Séniorité** est une liste fermée : Junior, Confirmé, Sénior, Expert.

### Le référentiel FreeWork

Les valeurs des deux listes viennent de `docs/freework_metiers.csv` et
`docs/freework_skills.csv` : 137 métiers et 1569 compétences. Les deux fichiers
sont fournis en Windows-1252 et versionnés ici convertis en UTF-8 ; les
apostrophes droites sont passées en typographiques, comme partout ailleurs dans
le portail.

Ce sont **deux listes indépendantes**. Un premier essai s'était appuyé sur
`cigref_metier_competence.csv`, qui associait chaque compétence e-CF à un
métier : le poste choisi restreignait alors les suggestions aux siennes. Les
référentiels FreeWork n'ont pas ce lien, ce filtrage disparaît donc — le poste
et les compétences se choisissent séparément.

Les champs restent ouverts : on pioche dans la liste ou on saisit sa propre
valeur, auquel cas la liste le dit — « Aucun résultat. Votre saisie sera
conservée telle quelle. »

Aucune ligne d'aide sous les champs. « Sélectionnez un poste ou saisissez un
nouvel intitulé » et « Vous pouvez sélectionner plusieurs compétences » ont été
retirées le 6 août 2026 : le chevron dit qu'il y a une liste, les pastilles
disent qu'on peut en retenir plusieurs.

Les métiers montent à 123 caractères — « Développeur·euse / Intégrateur·rice de
progiciel (ERP, CRM, Dynamics…) » —, et l'écriture inclusive du référentiel est
reprise telle quelle. La pastille de compétence reste plafonnée à 250 px et
tronquée, le libellé entier revenant au survol.

### Un formulaire vierge

**Aucun champ n'est pré-rempli.** *(Décision du 6 août 2026.)* La fenêtre
s'ouvre sur une page blanche : c'est au client de dire son besoin, pas au
formulaire de le lui souffler.

Les invites portent donc seules le guidage — un exemple par champ, formulé
comme une valeur plausible plutôt que comme une consigne. La séniorité ouvre
sur « Sélectionner ».

**Transmettre la demande** reste inerte, et visiblement grisé, tant que la
description est vide : une demande sans un mot d'explication ne dit rien à
personne. Les autres champs restent facultatifs.

Chaque ouverture repart à zéro. Une saisie abandonnée ne doit pas revenir sur
le besoin suivant.

### Le pied

Les deux boutons seuls. La note qui occupait la place ne paraît plus qu'au
moment de la transmission — « Transmission en cours… », puis le numéro du lead
créé ou le message d'échec. Vide, elle s'efface et laisse les boutons à droite.

## Ce que la refonte coûte

Le choix **Assistance Technique / Portage salarial** disparaît du formulaire.
Or il partait dans le lead Salesforce, en `type`, et c'est lui qui distingue
« trouvez-moi un freelance » de « j'ai déjà mon freelance » — deux processus
différents. Le lead part désormais en **Assistance Technique**, cas de très
loin le plus fréquent, plutôt que de laisser le champ vide et de casser
l'intégration. *À arbitrer : rétablir le choix, ou le déduire de la
description.*

Deux champs s'ajoutent au lead : `seniorite` et `competences`, cette dernière
sérialisée en liste séparée par des virgules.

## La mise en forme

La boîte passe de 640 à 880 px de large. À 640, chaque colonne ne faisait que
285 px et la pastille de compétence passait sous son propre champ de saisie.

En-tête et pied sont posés sur un filet et débordent jusqu'aux bords, comme les
autres fenêtres du portail ; le pied prend la crème pour ancrer les deux
boutons, qui flottaient jusque-là sur du blanc. Le titre passe de 17 à 22 px :
c'était la seule chose à lire en arrivant, elle avait le poids d'un libellé de
champ.

Les cellules de la grille ne sont plus solidaires en hauteur — le champ
Compétences, plus haut que son voisin, creusait un vide sous *Intitulé du
poste*.

### Les listes déroulantes

Les trois listes — métier, compétence, ville — sont maison, pas natives. La
liste native du navigateur ignore toute mise en forme : sous macOS en thème
sombre elle s'ouvrait en noir, sur toute la hauteur de l'écran, par-dessus la
fenêtre qu'elle était censée servir. *(Constaté le 6 août 2026.)*

Le composant filtre à la frappe, se pilote au clavier (↑ ↓ pour parcourir,
Entrée pour retenir, Échap pour refermer sans fermer la fenêtre) et à la
souris. Il ne peint jamais plus de 60 lignes : sur 1569 compétences, le reste
est annoncé — « 1509 autres résultats, précisez votre recherche » — plutôt que
rendu en pure perte.

La boîte a donc perdu son `overflow:hidden`, qui aurait rogné les listes ; les
coins arrondis sont repris sur l'en-tête et le pied.

### La date de démarrage

Champ daté natif : le calendrier du navigateur, que tout le monde sait
utiliser. C'est le seul endroit où le contrôle natif fait mieux qu'un composant
maison, et le seul qui garde donc son marqueur.

### La localisation

Une liste des 108 villes françaises les plus peuplées, DOM-TOM compris. Le
champ reste ouvert : une commune absente se saisit librement.

Sous 780 px les deux colonnes s'empilent et les boutons prennent toute la
largeur ; le point de rupture général du portail, à 620 px, arrivait trop tard
pour une fenêtre de 880.

Les règles devenues orphelines — `.dpo`, `.detecte`, `.m-type`, `.carte-type`,
`.m-separateur`, `.m-aide` — sont retirées avec les blocs qu'elles habillaient.

## Comment on saura que c'est bon

- La modale expose les six champs, dans l'ordre de la maquette.
- La fenêtre s'ouvre entièrement vide, chaque champ portant son exemple.
- *Transmettre* reste inerte tant que la description est vide.
- Une saisie abandonnée ne revient pas à l'ouverture suivante.
- Le bloc *Type de prestation*, les badges *détecté* et *Assistance IA* ont
  disparu.
- Les référentiels FreeWork alimentent les deux listes : 137 métiers, 1569
  compétences, sans lien de l'un vers l'autre.
- Une compétence saisie devient une pastille ; la croix la retire ; le retour
  arrière retire la dernière ; un doublon ne s'ajoute pas.
- Aucune pastille ne dépasse une ligne, et porte son libellé entier en titre.
- Le pied ne montre aucune note au repos.
- Annuler et Échap ferment la modale.

Le harnais `tests/verifier-modale-besoin.js` couvre ces quinze points.
