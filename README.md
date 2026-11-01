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
2. L'enregistrer dans `MiniGame.REGISTRY`.

**Client** (`client/src/games/`)
1. Créer un dossier avec un composant téléphone (`PhoneGameProps`) et un composant écran
   partagé (`HostGameProps`), voir `games/index.ts` et le modèle `games/qte/`.
2. L'enregistrer dans `GAMES` (`games/index.ts`) avec la même clé que `MiniGame.id()`,
   avec sa fiche `HowTo` et son `tagline` en `{ fr, en }`.
3. Les textes affichés vont dans `client/src/i18n.ts` (français et anglais, bouton FR / EN dans l'appli).
4. L'hôte lance le jeu avec `{ "type": "start_game", "roomCode": "...", "game": "<id>" }`.

## Déployer sur Render
Le fichier [`render.yaml`](render.yaml) décrit deux services gratuits :
- `last-phone-standing-server` : le serveur Java (Docker, `server/Dockerfile`) ;
- `last-phone-standing` : le client React (site statique, liens `/CODE` réécrits vers `index.html`).

1. Pousser la branche `final-presentation` sur GitHub (c'est elle que `render.yaml` déploie).
2. Render : **New > Blueprint**, choisir le dépôt, valider. Les deux services se créent.
3. Vérifier l'URL du serveur (page du service). Si elle diffère de
   `last-phone-standing-server.onrender.com`, mettre à jour `VITE_WS_URL` (en `wss://…`)
   dans l'onglet *Environment* du site statique, puis *Manual Deploy*.
4. Ouvrir l'URL du site statique sur l'écran partagé : le QR code pointe déjà vers le bon lien.

Offre gratuite : le serveur s'endort après 15 min sans visite et met ~1 min à se réveiller
(le client réessaie tout seul). Avant une démo, ouvrir l'écran partagé quelques minutes en avance.
