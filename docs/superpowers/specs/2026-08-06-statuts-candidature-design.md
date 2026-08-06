# Statuts de candidature — onglet Candidatures

Design validé le 6 août 2026, sur une proposition de mapping apportée par
Walid.

## Le problème

L'onglet *Candidatures* d'une fiche besoin affichait « Proposée » sur toutes
les lignes, en dur dans le code. Le badge était le même pour un candidat qui
venait d'être transmis, un candidat écarté après soutenance et un candidat qui
avait démarré — y compris sur un besoin en « Solution rejetée ». La colonne
*Statut* ne portait aucune information.

## La source

Le statut de candidature vit sur **`INO_Candidature__c.statut__c`**, table
`salesforce_ino_candidature`. Il ne vient pas de `Opportunity` : cet objet n'a
pas de champ `Statut__c`, seulement `ino_statut_processus__c`,
`ino_statut_projet__c`, `ino_statut_relecture_propale__c` et `statut_ac__c`,
qui décrivent le besoin et non la candidature. *(La proposition initiale portait
`Opportunity` ; corrigé après lecture du schéma.)*

Le champ compte dix valeurs, sans valeur nulle.

## Le mapping

Quatre statuts sont internes à Freelance.com et ne paraissent jamais côté
client : ils décrivent un candidat que le client n'a jamais reçu, et dont
l'existence même ne le regarde pas.

| Statut portail client | `INO_Candidature__c.statut__c` | Badge |
|---|---|---|
| *non affiché* | `Nouveau` | — |
| *non affiché* | `Rejet sourcing` | — |
| *non affiché* | `Proposé au commerce` | — |
| *non affiché* | `Rejet Commerce` | — |
| À étudier | `Proposition au client` | bleu |
| Rejet client sur CV | `Rejet Client sur CV` | rouge |
| Soutenance planifiée | `Soutenance` | violet |
| Rejet client après soutenance | `Rejet Client après soutenance` | rouge |
| No Go Candidat | `No Go Candidat` | neutre |
| Démarrage | `Démarrage` | vert |

Les valeurs Salesforce sont reprises à la casse exacte de la base. La
proposition initiale écrivait `Proposé au client`, `Rejet commerce`,
`Rejet client sur CV` et `Rejet client après soutenance` ; les valeurs réelles
sont `Proposition au client`, `Rejet Commerce`, `Rejet Client sur CV` et
`Rejet Client après soutenance`. L'écart compte : c'est sur ces chaînes que se
fera le filtrage.

Trois libellés ont été arbitrés le 6 août 2026 :

- **À étudier** plutôt que « Proposée » : formulé du point de vue du client,
  la balle est dans son camp.
- **Soutenance planifiée**, repris tel quel du statut de besoin homonyme, pour
  ne pas entretenir deux vocabulaires pour la même chose.
- **No Go Candidat** conservé tel quel, malgré son air de jargon : aucun écart
  de vocabulaire à maintenir entre le portail et le CRM.

## Les données de démonstration

Chaque candidat de la maquette porte un statut cohérent avec celui de son
besoin — un besoin rejeté ne peut pas n'aligner que des candidats à étudier.
Les six statuts visibles sont tous représentés au moins une fois :

| Candidat | Besoin | Statut |
|---|---|---|
| Léa Morel | Développeur mobile Flutter | Démarrage |
| Julien Berthier | Chef de projet migration SI finance | Soutenance planifiée |
| Elsa Weber | Consultant cybersécurité | Rejet client après soutenance |
| Marc Delon | Consultant cybersécurité | Rejet client sur CV |
| Inès Martin | Architecte cloud AWS | No Go Candidat |
| *tous les autres* | — | À étudier |

Chaque ligne porte aussi sa valeur Salesforce en `data-statut-candidature` :
c'est ce qui permet de vérifier le mapping sans se fier au libellé affiché.

## La largeur de la colonne

La colonne *Statut* passe de 9,5 % à 18 %, et la table de 1160 à 1280 px. En
deçà, « Rejet client après soutenance » — le plus long des six — sortait de sa
cellule et passait sous le lien CV. Un contrôle mesure le bord droit de chaque
pastille contre celui de sa cellule.

## Comment on saura que c'est bon

- Un besoin en recherche affiche des candidatures « À étudier ».
- Un besoin démarré affiche un candidat « Démarrage », badge vert.
- Un besoin rejeté distingue le rejet sur CV du rejet après soutenance.
- Une soutenance planifiée se lit sur la candidature, badge violet.
- Un désistement se lit « No Go Candidat », badge neutre.
- Les six statuts client sont tous représentés, et eux seuls.
- Aucun des quatre statuts internes ne paraît, ni en libellé ni en valeur.
- Chaque libellé porte bien sa valeur Salesforce.
- Aucune pastille ne déborde de sa colonne.

Le harnais `tests/verifier-candidatures.js` couvre ces neuf points.
