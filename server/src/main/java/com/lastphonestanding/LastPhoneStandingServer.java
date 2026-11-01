package com.lastphonestanding;

import org.java_websocket.WebSocket;
import org.java_websocket.handshake.ClientHandshake;
import org.java_websocket.server.WebSocketServer;
import com.google.gson.Gson;
import com.google.gson.JsonArray;
import com.google.gson.JsonObject;
import com.lastphonestanding.game.MiniGame;
import com.lastphonestanding.game.MiniGames;
import com.lastphonestanding.game.RankEntry;
import com.lastphonestanding.room.Player;
import com.lastphonestanding.room.Room;
import com.lastphonestanding.room.RoomRegistry;
import com.lastphonestanding.room.RoomState;

import java.net.InetSocketAddress;
import java.util.List;


public class LastPhoneStandingServer extends WebSocketServer {

    private static final List<String> REACTIONS = List.of("allez", "ouah", "nooon");
    private static final long REACTION_INTERVAL_MS = 700;

    private final Gson gson = new Gson();
    // Le registre qui stocke et gère toutes les rooms en mémoire
    private final RoomRegistry registry = new RoomRegistry();

    public LastPhoneStandingServer(int port) {
        super(new InetSocketAddress(port));
    }

    @Override
    public void onOpen(WebSocket conn, ClientHandshake handshake) {
        System.out.println("Client connected: " + conn.getRemoteSocketAddress());
    }

    // synchronized : Java-WebSocket peut appeler onMessage/onClose depuis plusieurs threads
    @Override
    public synchronized void onClose(WebSocket conn, int code, String reason, boolean remote) {
        System.out.println("Client disconnected: " + reason);
        Room room = registry.handleDisconnect(conn);
        if (room == null) return;

        if (room.getHostConnection() == conn) {
            JsonObject msg = new JsonObject();
            msg.addProperty("type", "host_left");
            for (Player p : room.getPlayers().values()) p.send(msg.toString());
        } else {
            sendPlayerListUpdate(room);
            checkRoundEnd(room);
        }
    }

    @Override
    public synchronized void onMessage(WebSocket conn, String message) {
        System.out.println("Received: " + message);

        try {
            JsonObject jsonMessage = gson.fromJson(message, JsonObject.class);
            String type = jsonMessage.has("type") ? jsonMessage.get("type").getAsString() : "";

            switch (type) {
                case "create_room": {
                    Room room = registry.createRoom(conn);
                    JsonObject response = new JsonObject();
                    response.addProperty("type", "room_created");
                    response.addProperty("roomCode", room.getRoomCode());
                    conn.send(response.toString());
                    break;
                }

                case "join_room": {
                    String roomCode = getString(jsonMessage, "roomCode").toUpperCase();
                    String name = getString(jsonMessage, "name");
                    Player joined;
                    try {
                        joined = registry.joinRoom(roomCode, name, getString(jsonMessage, "color"), conn);
                    } catch (IllegalArgumentException e) {
                        sendError(conn, e.getMessage());
                        break;
                    }
                    sendJoinSuccess(conn, joined, registry.getRoom(roomCode));
                    break;
                }

                case "rejoin": {
                    // Téléphone rechargé / reconnecté : il présente le jeton reçu au join
                    String roomCode = getString(jsonMessage, "roomCode").toUpperCase();
                    Player back;
                    try {
                        back = registry.rejoinRoom(roomCode, getString(jsonMessage, "token"), conn);
                    } catch (IllegalArgumentException e) {
                        JsonObject failed = new JsonObject();
                        failed.addProperty("type", "rejoin_failed");
                        failed.addProperty("message", e.getMessage());
                        conn.send(failed.toString());
                        break;
                    }
                    Room r = registry.getRoom(roomCode);
                    sendJoinSuccess(conn, back, r);
                    checkRoundEnd(r); // il était peut-être le dernier encore « en vie »
                    break;
                }

                case "room_info": {
                    // Avant de rejoindre : le téléphone grise les couleurs déjà prises
                    Room r = registry.getRoom(getString(jsonMessage, "roomCode").toUpperCase());
                    if (r == null) {
                        sendError(conn, "Salle introuvable");
                        break;
                    }
                    JsonObject info = new JsonObject();
                    info.addProperty("type", "room_info");
                    info.add("takenColors", gson.toJsonTree(RoomRegistry.takenColors(r)));
                    conn.send(info.toString());
                    break;
                }

                case "start_game": {
                    Room r = registry.getRoom(getString(jsonMessage, "roomCode"));
                    // Sécurité : seule la connexion hôte de cette room peut lancer
                    if (r == null || r.getHostConnection() != conn) break;
                    if (r.getState() == RoomState.IN_ROUND) break;
                    if (r.getState() == RoomState.ENDED && r.isLastRound()) {
                        sendError(conn, "La partie est terminée : retourne au lobby");
                        break;
                    }
                    // Les réglages ne se choisissent qu'au lancement depuis le lobby
                    if (r.getState() == RoomState.LOBBY) {
                        r.configure(
                            jsonMessage.has("rounds") ? jsonMessage.get("rounds").getAsInt() : r.getTotalRounds(),
                            jsonMessage.has("speed") ? jsonMessage.get("speed").getAsDouble() : r.getStartSpeed());
                    }
                    String gameId = jsonMessage.has("game") ? getString(jsonMessage, "game") : MiniGames.DEFAULT;
                    MiniGame game = MiniGames.create(gameId);
                    if (game == null) {
                        sendError(conn, "Mini-jeu inconnu : " + gameId);
                        break;
                    }
                    if (r.getPlayers().values().stream().noneMatch(p -> p.getConnection().isOpen())) {
                        sendError(conn, "Aucun joueur connecté");
                        break;
                    }

                    JsonObject startMsg = new JsonObject();
                    startMsg.addProperty("type", "game_start");
                    r.startRound(game, startMsg);
                    String startStr = startMsg.toString();
                    conn.send(startStr);
                    for (Player p : r.getPlayers().values()) p.send(startStr);
                    sendPlayerListUpdate(r);
                    break;
                }

                case "back_to_lobby": {
                    Room r = registry.getRoom(getString(jsonMessage, "roomCode"));
                    if (r == null || r.getHostConnection() != conn || r.getState() == RoomState.IN_ROUND) break;
                    r.backToLobby();
                    JsonObject lobby = new JsonObject();
                    lobby.addProperty("type", "lobby");
                    conn.send(lobby.toString());
                    for (Player p : r.getPlayers().values()) p.send(lobby.toString());
                    sendPlayerListUpdate(r);
                    break;
                }

                case "reaction": {
                    // Depuis les tribunes : seuls les joueurs K.O. réagissent, pendant la manche
                    Room r = registry.roomOf(conn);
                    Player p = r == null ? null : r.playerOf(conn);
                    String reaction = getString(jsonMessage, "reaction");
                    if (p == null || p.isAlive() || r.getState() != RoomState.IN_ROUND) break;
                    if (!REACTIONS.contains(reaction) || !p.tryReact(System.currentTimeMillis(), REACTION_INTERVAL_MS)) break;
                    JsonObject out = playerJson(p);
                    out.addProperty("type", "reaction");
                    out.addProperty("reaction", reaction);
                    if (r.getHostConnection().isOpen()) r.getHostConnection().send(out.toString());
                    break;
                }

                case "test":
                    conn.send(message);
                    break;

                default: {
                    // Tout autre message d'un téléphone en pleine manche appartient au mini-jeu
                    Room r = registry.roomOf(conn);
                    Player p = r == null ? null : r.playerOf(conn);
                    if (p == null || r.getState() != RoomState.IN_ROUND) {
                        System.out.println("Unknown message type: " + type);
                        break;
                    }
                    r.getGame().onPlayerMessage(p, type, jsonMessage);
                    sendPlayerListUpdate(r);
                    checkRoundEnd(r);
                }
            }
        } catch (Exception e) {
            System.err.println("Failed to handle message: " + message);
            e.printStackTrace();
        }
    }

    private static String getString(JsonObject json, String key) {
        return json.has(key) && !json.get(key).isJsonNull() ? json.get(key).getAsString() : "";
    }

    private static void sendError(WebSocket conn, String message) {
        JsonObject error = new JsonObject();
        error.addProperty("type", "error");
        error.addProperty("message", message);
        conn.send(error.toString());
    }

    /** state : le téléphone sait s'il arrive en lobby, en pleine manche (→ tribunes) ou entre deux manches. */
    private void sendJoinSuccess(WebSocket conn, Player p, Room room) {
        JsonObject msg = new JsonObject();
        msg.addProperty("type", "join_success");
        msg.addProperty("id", p.getId());
        msg.addProperty("token", p.getToken());
        msg.addProperty("state", room.getState().name());
        msg.addProperty("progress", p.getProgress());
        conn.send(msg.toString());
        sendPlayerListUpdate(room);
    }

    // Host + téléphones (les téléphones K.O. en déduisent leur rang provisoire)
    private void sendPlayerListUpdate(Room room) {
        JsonObject update = new JsonObject();
        update.addProperty("type", "player_list_update");

        JsonArray playersArray = new JsonArray();
        for (Player p : room.getPlayers().values()) {
            JsonObject pJson = playerJson(p);
            pJson.addProperty("alive", p.isAlive());
            playersArray.add(pJson);
        }
        update.add("players", playersArray);
        String str = update.toString();
        if (room.getHostConnection().isOpen()) room.getHostConnection().send(str);
        for (Player p : room.getPlayers().values()) p.send(str);
    }

    private static JsonObject playerJson(Player p) {
        JsonObject json = new JsonObject();
        json.addProperty("id", p.getId());
        json.addProperty("name", p.getName());
        json.addProperty("color", p.getColor());
        json.addProperty("progress", p.getProgress());
        json.addProperty("score", p.getScore());
        return json;
    }

    private void checkRoundEnd(Room room) {
        if (!room.isRoundOver()) return;
        JsonObject msg = new JsonObject();
        msg.addProperty("type", "round_end");
        msg.addProperty("round", room.getRound());
        msg.addProperty("totalRounds", room.getTotalRounds());
        msg.addProperty("final", room.isLastRound()); // dernière manche : classement final au score cumulé
        JsonArray ranking = new JsonArray();
        for (RankEntry e : room.endRound()) {
            JsonObject entry = playerJson(e.player());
            entry.addProperty("rank", e.rank());
            entry.addProperty("points", e.points());
            ranking.add(entry);
        }
        msg.add("ranking", ranking);
        String str = msg.toString();
        if (room.getHostConnection().isOpen()) room.getHostConnection().send(str);
        for (Player p : room.getPlayers().values()) p.send(str);
    }

    @Override
    public void onError(WebSocket conn, Exception ex) {
        System.err.println("WebSocket error:");
        ex.printStackTrace();
    }

    @Override
    public void onStart() {
        System.out.println("WebSocket server started on port " + getPort());
    }

    public static void main(String[] args) {
        // Render (et la plupart des hébergeurs) imposent le port via la variable PORT
        int port = Integer.parseInt(System.getenv().getOrDefault("PORT", "8080"));
        new LastPhoneStandingServer(port).start();
    }
}
