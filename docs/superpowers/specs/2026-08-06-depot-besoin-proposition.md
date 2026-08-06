# Dépôt d'un besoin — spec

6 août 2026. **Rien ne part vers Salesforce : c'est un email.** Le commercial
crée l'opportunité à la main.

## Modale

| Champ | Obligatoire | Valeurs |
|---|---|---|
| Description | **oui** | libre |
| Intitulé du poste | non | FreeWork Métiers (137), liste ouverte |
| Compétences | non | FreeWork Skills (1 569), multiple |
| Séniorité | non | Junior · Confirmé · Sénior · Expert |
| Localisation | non | 108 villes, liste ouverte |
| Date de démarrage | non | calendrier |
| TJM ou budget cible | non | texte |

Pas de choix de type dans le formulaire : le type de contrat (RM, AT, Forfait,
AT forfaitisé) est déterminé par le commercial à la qualification.

Formulaire vierge à chaque ouverture. Bouton inerte tant que la description est
vide. Listes ouvertes à la saisie libre.

## Envoi

Email au propriétaire du compte (`Account.OwnerId`), reprenant tous les champs.
Template : `assets/mail-nouveau-besoin.html`.

Toast au client : « Votre demande a bien été envoyée à Camille Moreau. Elle
sera créée dans votre interface dès qu'elle aura été traitée par nos équipes. »

## Liste des besoins

Aucune réconciliation : le besoin ne paraît qu'à sa création dans Salesforce.
La demande n'est pas affichée entre-temps — sans identifiant de rapprochement,
une ligne locale resterait en double.

Mention au-dessus du tableau : « Les besoins créés depuis le portail
apparaissent ici une fois traités par nos équipes commerciales. »
