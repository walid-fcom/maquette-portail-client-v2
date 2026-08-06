# Dépôt d'un besoin — proposition de spec

Proposition du 6 août 2026, en réponse à la « Fonctionnalité 2 — Création d'un
besoin ». Elle porte sur la modale de saisie et sur le point ouvert de
l'affichage dans la liste.

## Deux écarts avec la maquette actuelle

**Le type de besoin n'existe plus dans le formulaire.** Il y avait un bloc
*Type de prestation* à deux cartes (« Trouvez-moi un freelance » / « J'ai déjà
mon freelance ») ; il a été retiré le 6 août avec la refonte de la modale. La
spec en demande quatre — RM, AT, Forfait, AT forfaitisé — donc le champ revient,
et sous une autre forme (voir plus bas). En attendant, la demande part en
*Assistance technique* par défaut.

**L'envoi ne fait pas ce que la spec décrit.** La modale crée aujourd'hui un
*Lead* dans Salesforce, via la function Netlify `/api/salesforce-lead`. La spec
prévoit un **email au commercial en charge du compte**, qui crée ensuite
l'opportunité à la main. Ce sont deux mécaniques différentes, et la seconde
suppose de connaître le commercial du compte — l'`OwnerId` de l'opportunité côté
Salesforce, déjà utilisé pour l'« Interlocuteur » de la fiche besoin.

*À arbitrer : garde-t-on la création du Lead, qui a le mérite de laisser une
trace dans le CRM, ou passe-t-on à l'email seul ?* Les deux se cumulent sans
peine : le Lead porte la donnée structurée, l'email prévient l'humain.

## Le type de besoin

Les quatre codes sont du vocabulaire interne. Un responsable achats sait ce
qu'il veut obtenir, pas comment Freelance.com contractualise. La question se
pose donc dans ses termes, et le type se déduit :

| Ce que le client choisit | Type |
|---|---|
| Une personne pour renforcer mon équipe, facturée au temps passé | **AT** |
| Une prestation avec un résultat livré et un prix ferme | **Forfait** |
| Une équipe sur un périmètre défini, à volume et prix engagés | **AT forfaitisé** |
| J'ai déjà identifié l'intervenant, je veux le contractualiser | **RM** |

Quatre cartes radio en deux colonnes, chacune avec son libellé et une ligne
d'explication. Le code interne (`AT`, `FORFAIT`, `ATF`, `RM`) part dans la
demande sans jamais paraître à l'écran.

Placement : **avant** la description libre. C'est la question qui oriente tout
le reste — un forfait n'appelle pas les mêmes informations qu'une régie — et
c'est la seule à réponse fermée obligatoire.

## Ce que le formulaire recueille

Inchangé pour le reste, et suffisant pour préqualifier :

| Champ | Nature | Obligatoire |
|---|---|---|
| Type de besoin | 4 cartes | oui |
| Description | texte libre | oui |
| Intitulé du poste | liste FreeWork ouverte, 137 métiers | non |
| Compétences | liste FreeWork ouverte, 1569 entrées, multi | non |
| Séniorité | liste fermée | non |
| Localisation | liste de villes, ouverte | non |
| Date de démarrage | calendrier | non |
| TJM ou budget cible | texte | non |

Seuls le type et la description sont exigés : c'est le minimum pour qu'un
commercial sache quoi faire de la demande. Le reste accélère la
préqualification sans la conditionner — un client qui ne connaît pas encore son
budget ne doit pas être bloqué.

Selon le type retenu, deux libellés s'adaptent plutôt que de changer de champ :
*TJM ou budget cible* devient *Budget cible* pour un forfait, et *Date de
démarrage* devient *Date de livraison souhaitée*.

## Le point ouvert : l'affichage dans la liste

### Ce que je recommande — réconcilier sur une référence, pas sur le brief

L'option 2 telle qu'elle est écrite réconcilie « lorsqu'un besoin importé de SF
comporte le même brief dans la description ». C'est fragile : le commercial
reformule le brief en créant l'opportunité, le rapprochement échoue alors
silencieusement, et deux besoins voisins peuvent au contraire se confondre.

La même idée tient si on réconcilie sur un identifiant :

1. À la soumission, le portail attribue une **référence de demande**
   (`DEM-2026-0043`), affichée au client et reprise dans l'email au commercial.
2. Le commercial colle cette référence dans un champ de l'opportunité
   (`Reference_Portail__c`, à créer).
3. À l'import, un besoin qui porte cette référence remplace la demande locale.

Le rapprochement devient exact. Le coût : un champ Salesforce et une consigne
au commercial — copier une référence.

### En attendant, l'option 1, mais avec la demande visible

L'option 1 est juste sur le fond, mais telle qu'écrite, le client envoie sa
demande et ne voit **rien**. Deux messages l'en informent, ce qui vaut mieux
que le silence, mais ne remplace pas une trace.

Je propose d'afficher la demande dans le tableau dès l'envoi, comme une ligne à
part :

- statut **« Transmise »**, badge neutre — distinct des statuts Salesforce ;
- pas de référence client, pas de marché, pas de candidatures : les colonnes
  restent vides tant que le besoin n'existe pas dans le CRM ;
- une ligne d'aide sous le tableau plutôt qu'un encart au-dessus : *« Les
  demandes transmises apparaissent ici en attendant leur création par votre
  interlocuteur. »*

Le client voit ce qu'il a envoyé, et voit aussi que ce n'est pas encore un
besoin. C'est l'écart entre les deux qui porte l'information.

Le toast reprend le libellé proposé, complété de la référence : *« Demande
DEM-2026-0043 transmise à Camille Moreau. Elle apparaîtra comme besoin dès
qu'elle aura été traitée. »*

### Ce que je déconseille

L'encart permanent au-dessus du tableau. Il s'adresse à un client qui vient de
déposer une demande, mais il sera lu par tous les autres, à chaque visite, sur
un écran qui n'a rien à voir. Un message qui ne concerne qu'une minorité des
visites finit ignoré par tout le monde, y compris par ceux qu'il visait.

## Ce que ça change dans la maquette

1. Le bloc *Type de besoin* revient, en quatre cartes, avant la description.
2. Les deux libellés adaptatifs sur le budget et la date.
3. Le bouton *Transmettre la demande* n'est armé que si le type et la
   description sont renseignés — aujourd'hui, seule la description compte.
4. Un toast de confirmation avec la référence, à la place du message discret
   du pied de fenêtre.
5. Une ligne « Transmise » ajoutée au tableau des besoins, et sa mention sous
   le tableau.

Les points 1 à 3 sont indépendants de l'arbitrage sur la réconciliation et
peuvent se faire tout de suite. Les points 4 et 5 en dépendent.

## Questions à trancher

- Email seul, Lead Salesforce seul, ou les deux ?
- Réconciliation sur référence — accepte-t-on de créer `Reference_Portail__c`
  et de demander au commercial de la reporter ?
- Les quatre types sont-ils bien ceux du contrat, et leurs libellés client
  ci-dessus disent-ils juste ?
- Qui est « le commercial en charge du compte » côté données : l'`OwnerId` de
  l'opportunité, ou un propriétaire au niveau du compte ?
