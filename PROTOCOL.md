# Last Phone Standing - WebSocket Protocol

## Généralités

Toutes les communications entre le client React et le serveur Java
utilisent WebSocket.

Adresse du serveur en développement :

`ws://localhost:8080`

Les messages sont au format JSON.

Chaque message contient un champ `type` permettant d'identifier
le type de message.

---

## Phase 0

### `test`

Message envoyé par le client au serveur pour vérifier que la
communication WebSocket fonctionne.

Client -> Serveur :

```json
{
  "type": "test",
  "message": "Bonjour serveur !"
}
```

---

## Phase 1

### `create_room`
Message envoyé par l'écran partagé (Host) pour créer une nouvelle partie.
Client -> Serveur :
```json
{ "type": "create_room" }
```

### `room_created`
Réponse du serveur à l'Host après la création.
Serveur -> Client (Host uniquement) :
```json
{
  "type": "room_created",
  "roomCode": "AB12"
}
```

### `join_room`
Message envoyé par un téléphone pour rejoindre une partie.
Client -> Serveur :
```json
{
  "type": "join_room",
  "roomCode": "AB12",
  "name": "Alice"
}
```

### `join_success`
Confirmation envoyée par le serveur au téléphone qui a rejoint.
Serveur -> Client (Téléphone uniquement) :
```json
{ "type": "join_success" }
```

### `player_list_update`
Mise à jour de la liste des joueurs envoyée à l'écran partagé quand un joueur rejoint ou quitte.
Serveur -> Client (Host uniquement) :
```json
{
  "type": "player_list_update",
  "players": [
    { "id": "uuid-1", "name": "Alice" },
    { "id": "uuid-2", "name": "Bob" }
  ]
}
```

### `error`
Message d'erreur générique.
Serveur -> Client :
```json
{
  "type": "error",
  "message": "Room not found"
}
```

---

## Phase 2

### `start_game`
Message envoyé par l'écran partagé (Host) pour démarrer la manche.
Client (Host) -> Serveur :
```json
{
  "type": "start_game",
  "roomCode": "AB12"
}
```

### `game_start`
Message diffusé par le serveur à l'hôte et à tous les joueurs pour déclencher le changement d'écran vers l'interface de jeu.
Serveur -> Client (Host + Téléphones) :
```json
{ "type": "game_start" }
```

---

## Phase 3 (robustesse)

### Erreurs de `join_room`
`error.message` est affichable tel quel au joueur : `Salle introuvable`, `La partie a déjà commencé`,
`La salle est pleine` (8 max), `Choisis un pseudo`, `Pseudo trop long (16 max)`, `Pseudo déjà pris`.

### `player_list_update`
Chaque joueur porte maintenant `alive` : un téléphone qui se déconnecte en pleine manche
reste dans la liste avec `"alive": false` (éliminé). En lobby, il est simplement retiré.
```json
{ "type": "player_list_update", "players": [ { "id": "uuid-1", "name": "Alice", "alive": true } ] }
```

### `host_left`
Serveur -> Téléphones : l'écran partagé s'est déconnecté, la salle est supprimée.
```json
{ "type": "host_left" }
```


---

## Phase 4 (manche de QTE Survival)

Le téléphone juge lui-même chaque input (pas d'aller-retour réseau) ; le serveur
enregistre la progression, détecte la fin de manche et calcule le classement.

### `join_success` (complété)
```json
{ "type": "join_success", "id": "uuid-1" }
```

### `start_game`
Accepté depuis le lobby **ou** après une manche (`round_end`) pour enchaîner.

### `game_start` (complété)
Serveur -> Host + Téléphones. Tous les téléphones génèrent la même séquence à partir
de `seed` (`client/src/qte.ts`). Vitesse de la manche = `1 + 0.2 × (round − 1)`.
```json
{ "type": "game_start", "seed": -184467, "round": 1 }
```

### `progress`
Téléphone -> Serveur, à chaque input réussi (`count` = inputs réussis). Jamais de recul.
```json
{ "type": "progress", "count": 5 }
```

### `eliminated`
Téléphone -> Serveur, au premier raté ou dépassement de temps.
```json
{ "type": "eliminated", "count": 5 }
```

### `player_list_update` (complété)
Envoyé à l'hôte après chaque `progress` / `eliminated`. Ajoute `progress` (manche en cours)
et `score` (cumulé).

### `round_end`
Serveur -> Host + Téléphones, quand plus personne n'est en vie.
Classement à la distance ; ex æquo = même rang ; +1 point par input réussi.
Le dernier debout compte comme ayant la meilleure distance (toujours 1er, ex æquo avec
ceux allés aussi loin ou plus loin).
```json
{ "type": "round_end", "round": 1, "ranking": [
  { "id": "uuid-2", "name": "B", "progress": 4, "rank": 1, "points": 4, "score": 4 },
  { "id": "uuid-1", "name": "A", "progress": 5, "rank": 1, "points": 5, "score": 5 },
  { "id": "uuid-3", "name": "C", "progress": 0, "rank": 3, "points": 0, "score": 0 }
] }
```


---

## Phase 5 (mini-jeux extensibles)

### `start_game` (complété)
`game` optionnel (défaut `qte_survival`). Id inconnu → `error` « Mini-jeu inconnu : … ».
```json
{ "type": "start_game", "roomCode": "AB12", "game": "qte_survival" }
```

### `game_start` (complété)
Contient toujours `round` et `game` ; le reste dépend du mini-jeu (QTE : `seed`).
```json
{ "type": "game_start", "round": 1, "game": "qte_survival", "seed": -184467 }
```

### Messages des mini-jeux
Pendant une manche, tout message d'un téléphone dont le `type` n'est pas géré par le
serveur est transmis au mini-jeu (`MiniGame.onPlayerMessage`). QTE Survival : `progress`, `eliminated`.


---

## Phase 6 (maquettes)

### `join_room` (complété)
`color` obligatoire, parmi `red yellow purple green blue orange pink lime` (codes hex : `client/src/colors.ts`).
Erreurs en plus : `Choisis une couleur`, `Couleur déjà prise`.
```json
{ "type": "join_room", "roomCode": "AB12", "name": "Alice", "color": "yellow" }
```

### `room_info`
Téléphone -> Serveur, avant de rejoindre (dès que le code fait 4 caractères), pour griser
les couleurs prises. Salle inconnue → `error` « Salle introuvable ».
```json
{ "type": "room_info", "roomCode": "AB12" }
```
Serveur -> Téléphone :
```json
{ "type": "room_info", "takenColors": ["red", "blue"] }
```

### `player_list_update` / `round_end` (complétés)
Chaque joueur porte `color`. `player_list_update` est maintenant envoyé à l'hôte **et** aux
téléphones (l'écran K.O. en déduit le rang provisoire et le nombre de joueurs encore en vie).
