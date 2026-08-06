# Dépôt d'un besoin — spec

6 août 2026. **Rien ne part vers Salesforce : c'est un email.** Le commercial
crée l'opportunité à la main.

## Modale

| Champ | Obligatoire | Valeurs |
|---|---|---|
| Type de besoin | **oui** | 4 cartes → `AT` `FORFAIT` `ATF` `RM` |
| Description | **oui** | libre |
| Intitulé du poste | non | FreeWork Métiers (137), liste ouverte |
| Compétences | non | FreeWork Skills (1 569), multiple |
| Séniorité | non | Junior · Confirmé · Sénior · Expert |
| Localisation | non | 108 villes, liste ouverte |
| Date de démarrage | non | calendrier |
| TJM ou budget cible | non | texte |

Libellés client des types : Renforcer mon équipe (`AT`), Confier une prestation
(`FORFAIT`), Engager une équipe (`ATF`), Contractualiser un intervenant (`RM`).
Les codes ne paraissent pas à l'écran.

Si `FORFAIT` ou `ATF` : « TJM ou budget cible » → « Budget cible », « Date de
démarrage » → « Date de livraison souhaitée ».

Formulaire vierge à chaque ouverture. Bouton inerte tant que le type ou la
description manquent. Listes ouvertes à la saisie libre.

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
