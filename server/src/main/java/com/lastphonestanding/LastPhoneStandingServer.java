package com.lastphonestanding;

import org.java_websocket.WebSocket;
import org.java_websocket.handshake.ClientHandshake;
import org.java_websocket.server.WebSocketServer;
import com.google.gson.Gson;
import com.google.gson.JsonArray;
import com.google.gson.JsonObject;
import com.lastphonestanding.room.Player;
import com.lastphonestanding.room.Room;
import com.lastphonestanding.room.RoomRegistry;
import com.lastphonestanding.room.RoomState;

import java.net.InetSocketAddress;

public class LastPhoneStandingServer extends WebSocketServer {

    // Le registre qui stocke et gère toutes les rooms en mémoire
    private final RoomRegistry registry = new RoomRegistry();

    public LastPhoneStandingServer(int port) {
        super(new InetSocketAddress(port));
    }

    @Override
    public void onOpen(WebSocket conn, ClientHandshake handshake) {
        System.out.println("Client connected: " + conn.getRemoteSocketAddress());
    }

    @Override
    public void onClose(WebSocket conn, int code, String reason, boolean remote) {
        System.out.println("Client disconnected: " + reason);
        Room room = registry.handleDisconnect(conn);
        if (room != null) {
            sendPlayerListUpdate(room);
        }
    }

    @Override
    public void onMessage(WebSocket conn, String message) {
        System.out.println("Received: " + message);
        Gson gson = new Gson();
        
        try {
            JsonObject jsonMessage = gson.fromJson(message, JsonObject.class);
            String type = jsonMessage.has("type") ? jsonMessage.get("type").getAsString() : "";

            switch (type) {
                case "create_room":
                    Room room = registry.createRoom(conn);
                    JsonObject response = new JsonObject();
                    response.addProperty("type", "room_created");
                    response.addProperty("roomCode", room.getRoomCode());
                    conn.send(response.toString());
                    break;

                case "join_room":
                    String roomCode = jsonMessage.get("roomCode").getAsString();
                    String name = jsonMessage.get("name").getAsString();
                    
                    Player player = registry.joinRoom(roomCode, name, conn);
                    if (player != null) {
                        JsonObject joinSuccess = new JsonObject();
                        joinSuccess.addProperty("type", "join_success");
                        conn.send(joinSuccess.toString());
                        sendPlayerListUpdate(registry.getRoom(roomCode));
                    } else {
                        JsonObject error = new JsonObject();
                        error.addProperty("type", "error");
                        error.addProperty("message", "Room not found");
                        conn.send(error.toString());
                    }
                    break;
                    
                case "start_game":
                    // Phase 2 : Le Host lance la partie
                    String codeToStart = jsonMessage.has("roomCode") ? jsonMessage.get("roomCode").getAsString() : null;
                    if (codeToStart != null) {
                        Room r = registry.getRoom(codeToStart);
                        // Sécurité : on vérifie que la requête vient bien de la connexion hôte de cette room
                        if (r != null && r.getHostConnection() == conn) {
                            r.setState(RoomState.IN_ROUND);
                            
                            JsonObject startMsg = new JsonObject();
                            startMsg.addProperty("type", "game_start");
                            String startStr = startMsg.toString();
                            
                            // On notifie l'écran partagé
                            r.getHostConnection().send(startStr);
                            
                            // On notifie chaque joueur (téléphone)
                            for (Player p : r.getPlayers().values()) {
                                p.getConnection().send(startStr);
                            }
                        }
                    }
                    break;

                case "test":
                    conn.send(message);
                    break;
                    
                default:
                    System.out.println("Unknown message type: " + type);
            }
        } catch (Exception e) {
            System.err.println("Failed to parse message: " + message);
            e.printStackTrace();
        }
    }

    private void sendPlayerListUpdate(Room room) {
        JsonObject update = new JsonObject();
        update.addProperty("type", "player_list_update");
        
        JsonArray playersArray = new JsonArray();
        for (Player p : room.getPlayers().values()) {
            JsonObject pJson = new JsonObject();
            pJson.addProperty("id", p.getId());
            pJson.addProperty("name", p.getName());
            playersArray.add(pJson);
        }
        update.add("players", playersArray);
        room.getHostConnection().send(update.toString());
    }

    @Override
    public void onError(WebSocket conn, Exception ex) {
        System.err.println("WebSocket error:");
        ex.printStackTrace();
    }

    @Override
    public void onStart() {
        System.out.println("WebSocket server started on ws://localhost:8080");
    }

    public static void main(String[] args) {
        new LastPhoneStandingServer(8080).start();
    }
}