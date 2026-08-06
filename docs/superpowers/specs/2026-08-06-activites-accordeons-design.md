# Mon activité — prestations groupées par marché

Design validé le 6 août 2026, sur une capture de référence apportée par Walid.

## Le problème

L'onglet *Prestations* de `Mon activité` déroulait un tableau plat : sept
lignes, toutes prestations confondues, avec le marché relégué au rang de
colonne parmi vingt et une. Or le marché est l'unité de lecture du client —
c'est par lui qu'il pense son portefeuille, pas par une liste indifférenciée
qu'il faut trier pour y voir clair.

## Le périmètre

Le regroupement de la liste, rien d'autre. Les données, le détail d'une
prestation, l'onglet *Marchés* voisin et la barre de filtres restent tels
quels.

## L'écran

### Les accordéons

Un `<details class="marche-groupe">` par marché, dans l'ordre du filtre
*Marché* — une seule source pour l'ordre et les libellés, donc pas de liste à
tenir à jour en double. L'en-tête porte le nom du marché, une pastille
« N prestations » et un chevron. Tout est replié à l'ouverture de la vue : on
voit d'abord le paysage des marchés et leurs volumes, on ouvre ce qui
intéresse.

Ouvert, un groupe montre le tableau existant restreint à son marché — mêmes
colonnes, même configurateur, mêmes lignes cliquables vers le détail. Le
regroupement se fait après l'injection des colonnes de régie, pour que chaque
en-tête cloné les porte.

La colonne *Marché* n'est plus affichée par défaut : elle est devenue le titre
du groupe. Elle reste offerte dans le configurateur de colonnes, simplement
décochée — retirer un réglage existant coûterait plus que de le laisser
disponible.

### Tout ouvrir, tout fermer

Deux boutons à droite de la barre de filtres, avant le configurateur de
colonnes. Ils n'agissent que sur les groupes visibles : un groupe écarté par
les filtres n'a pas à s'ouvrir.

### Les filtres

Inchangés dans leur fonctionnement : ils masquent des lignes. Ce qui s'ajoute,
c'est que chaque groupe recompte ses lignes retenues après chaque filtrage, et
qu'un marché sans aucune ligne retenue disparaît — plutôt que d'offrir un
accordéon vide à ouvrir.

### La pagination

Retirée de cette vue. Elle s'installait sur la table unique, qui n'existe plus,
et un compteur global posé sur trois tables ne saurait pas laquelle décrire.
Avec des groupes de deux à quatre lignes, elle n'a plus d'objet. Les vues
*Mes besoins* et *Factures* la gardent.

### L'onglet Marchés

Retiré de la barre d'onglets, qui ne porte donc plus que *Prestations*. Le
panneau `#v-marches` reste en place et atteignable par « Voir le marché » et
« Consulter les marchés » — c'est l'entrée d'onglet qui disparaît, pas la vue.
La bascule de panneau continue de connaître les deux noms.

### L'alignement des colonnes

Trois tables distinctes se dimensionnent chacune sur son contenu, et les
colonnes ne tombaient plus en face d'un groupe à l'autre. Elles passent donc en
largeur fixe : l'en-tête, identique partout, impose le même gabarit aux trois.

En largeur fixe, un libellé plus long que sa colonne ne l'élargit pas — il
déborde sur la voisine. Deux réglages tiennent ce risque : les en-têtes passent
à la ligne (coupure aux espaces seulement, sinon les mots se brisent en plein
milieu), et la largeur totale est calée sur ce que réclament les vingt et une
colonnes affichées, soit 3700 px. Chaque groupe défile horizontalement dans son
propre cadre, comme le tableau le faisait déjà.

Le harnais mesure le mot le plus long de chaque en-tête contre la largeur
disponible : c'est ce chevauchement qui est passé en production le 6 août 2026,
il ne doit pas repasser en silence.

## Comment on saura que c'est bon

- Trois groupes, dans l'ordre du filtre *Marché*, tous repliés à l'ouverture.
- Chaque groupe ne contient que les prestations de son marché, et son décompte
  le dit.
- Plus de table unique : trois tables, chacune dans son groupe.
- La colonne *Marché* est masquée, sa case décochée dans le configurateur.
- *Tout ouvrir* et *Tout fermer* pilotent les trois groupes.
- Filtrer sur un marché ne laisse que le groupe concerné ; une recherche sans
  résultat n'en laisse aucun ; *Réinitialiser* les rend tous.
- Une ligne de groupe ouvre toujours le détail de la prestation.
- Aucune barre de pagination sur la vue.
- Les trois groupes ont le même gabarit de colonnes.
- Aucun libellé d'en-tête ne déborde sur la colonne voisine.
- Aucune erreur JavaScript, et le reste du portail est intact.

Le harnais `tests/verifier-activites.js` couvre ces treize points.
