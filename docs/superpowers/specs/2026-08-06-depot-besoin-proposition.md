# Dépôt d'un besoin — spec

6 août 2026. Arbitrages pris : email seul, pas de champ de rapprochement,
destinataire `Account.OwnerId`.

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

Libellés client des quatre types : Renforcer mon équipe (`AT`), Confier une
prestation (`FORFAIT`), Engager une équipe (`ATF`), Contractualiser un
intervenant (`RM`). Les codes ne paraissent jamais à l'écran.

Si Forfait ou ATF : « TJM ou budget cible » devient « Budget cible », « Date de
démarrage » devient « Date de livraison souhaitée ».

Règles : formulaire vierge à chaque ouverture, bouton inerte tant que le type
ou la description manquent, listes ouvertes à la saisie libre.

## Envoi

Email au propriétaire du compte (`Account.OwnerId`), reprenant tous les champs.
Pas de Lead Salesforce.

Toast : « Votre demande a bien été envoyée à Camille Moreau. Elle sera créée
dans votre interface dès qu'elle aura été traitée par nos équipes. »

## Affichage dans la liste

**Aucune réconciliation.** Le besoin ne paraît qu'à sa création dans Salesforce.

La demande n'est donc pas affichée entre-temps : sans identifiant de
rapprochement, une ligne locale ne pourrait jamais céder la place au besoin
importé et resterait en double. Le toast est le seul retour immédiat.

Ligne d'aide sous le tableau des besoins : « Les besoins créés depuis le
portail apparaissent ici une fois traités par nos équipes commerciales. »

## Reste à trancher

Où loger le type, les compétences et la séniorité côté Salesforce — trois
champs sans cible identifiée. Sans réponse, ils ne partent que dans le corps de
l'email.
