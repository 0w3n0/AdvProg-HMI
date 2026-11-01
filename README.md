# Last Phone Standing (AdvProg-HMI)

Party game multijoueur : les téléphones servent de manettes, un écran partagé affiche la partie.

## Lancer en local
```bash
# Terminal 1 : serveur (Java 25, Maven téléchargé automatiquement au 1er lancement)
cd server && ./mvnw compile exec:java     # tests : ./mvnw test

# Terminal 2 : client (--host = accessible depuis les téléphones du même Wi-Fi)
cd client && npm install && npm run dev -- --host
```
Protocole WebSocket : voir [PROTOCOL.md](PROTOCOL.md).

## Ajouter un mini-jeu
Le serveur gère le lobby, les connexions, les manches, le score cumulé et la diffusion.
Un mini-jeu ne fournit que ses règles et ses deux écrans.

**Serveur** (`server/src/main/java/com/lastphonestanding/game/`)
1. Créer une classe qui implémente `MiniGame` (modèle : `QteSurvival`) :
   - `start` : ajouter ses champs à `game_start` (graine, paramètres…) ;
   - `onPlayerMessage` : reçoit tout message d'un téléphone que le serveur ne gère pas lui-même ;
     mettre à jour `player.setProgress(...)` / `player.setAlive(false)` ;
   - `onDisconnect`, `isOver`, `ranking` (`RankEntry.assign` gère les ex æquo).
2. L'enregistrer dans `MiniGames.REGISTRY`.

**Client** (`client/src/games/`)
1. Créer un dossier avec un composant téléphone (`PhoneGameProps`) et un composant écran
   partagé (`HostGameProps`), voir `games/types.ts` et le modèle `games/qte/`.
2. L'enregistrer dans `GAMES` (`games/index.ts`) avec la même clé que `MiniGame.id()`.
3. L'hôte lance le jeu avec `{ "type": "start_game", "roomCode": "...", "game": "<id>" }`.
