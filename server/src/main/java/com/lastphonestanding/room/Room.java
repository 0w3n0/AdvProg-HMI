package com.lastphonestanding.room;

import org.java_websocket.WebSocket;
import java.util.LinkedHashMap;
import java.util.Map;

public class Room {
    private final String roomCode;
    private final WebSocket hostConnection;
    // LinkedHashMap : on garde l'ordre d'arrivée des joueurs pour l'affichage
    private final Map<String, Player> players = new LinkedHashMap<>();
    private RoomState state = RoomState.LOBBY;

    public Room(String roomCode, WebSocket hostConnection) {
        this.roomCode = roomCode;
        this.hostConnection = hostConnection;
    }

    public String getRoomCode() { return roomCode; }
    public WebSocket getHostConnection() { return hostConnection; }
    public Map<String, Player> getPlayers() { return players; }
    public RoomState getState() { return state; }
    public void setState(RoomState state) { this.state = state; }

    public void addPlayer(Player player) {
        players.put(player.getId(), player);
    }

    public void removePlayerByConnection(WebSocket connection) {
        players.values().removeIf(p -> p.getConnection() == connection);
    }
}