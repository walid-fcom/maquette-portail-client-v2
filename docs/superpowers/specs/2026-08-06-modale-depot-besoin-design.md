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

Un `textarea` de cinq lignes, pré-rempli. C'est lui qui alimente les champs en
dessous — la démonstration part d'un texte libre dont tout le reste découle.
Le badge et la mention d'analyse disparaissent : les champs déjà remplis
racontent la même chose sans le dire.

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

## Deux réglages de rendu

La boîte passe de 640 à 880 px de large. À 640, chaque colonne ne faisait que
285 px et la pastille de compétence passait sous son propre champ de saisie.

Le marqueur de liste natif du champ Compétences est masqué : il doublait le
chevron dessiné sur le cadre. `getComputedStyle` ne sait pas lire ce
pseudo-élément — il retombe sur l'hôte —, le harnais vérifie donc la présence
de la règle, le rendu ayant été contrôlé à l'œil.

## Comment on saura que c'est bon

- La modale expose les six champs, dans l'ordre de la maquette.
- Les champs sont pré-remplis à partir de la description.
- Le bloc *Type de prestation*, les badges *détecté* et *Assistance IA* ont
  disparu.
- Une compétence saisie devient une pastille ; la croix la retire ; le retour
  arrière retire la dernière ; un doublon ne s'ajoute pas.
- La pastille et le champ de saisie tiennent sur une seule ligne.
- Le pied ne montre aucune note au repos.
- Annuler et Échap ferment la modale.

Le harnais `tests/verifier-modale-besoin.js` couvre ces onze points.
