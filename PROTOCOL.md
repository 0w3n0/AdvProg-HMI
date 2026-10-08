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