package com.lastphonestanding.room;

import org.java_websocket.WebSocket;
import java.security.SecureRandom;
import java.util.HashMap;
import java.util.Map;
import java.util.UUID;

public class RoomRegistry {

    // Pas de O/0/I/1 : évite la confusion à l'oral quand on annonce le code
    private static final String CODE_CHARACTERS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    private static final int CODE_LENGTH = 4;
    private final SecureRandom random = new SecureRandom();

    private final Map<String, Room> roomsByCode = new HashMap<>();
    // Permet de retrouver la room d'une connexion qui se déconnecte
    private final Map<WebSocket, String> roomCodeByConnection = new HashMap<>();

    public Room createRoom(WebSocket hostConnection) {
        String code = generateUniqueCode();
        Room room = new Room(code, hostConnection);
        roomsByCode.put(code, room);
        roomCodeByConnection.put(hostConnection, code);
        return room;
    }

    public Room getRoom(String roomCode) {
        return roomsByCode.get(roomCode);
    }

    public Player joinRoom(String roomCode, String name, WebSocket connection) {
        Room room = roomsByCode.get(roomCode);
        if (room == null) return null;

        Player player = new Player(UUID.randomUUID().toString(), name, connection);
        room.addPlayer(player);
        roomCodeByConnection.put(connection, roomCode);
        return player;
    }

    /** À appeler depuis onClose() pour nettoyer une déconnexion. */
    public Room handleDisconnect(WebSocket connection) {
        String roomCode = roomCodeByConnection.remove(connection);
        if (roomCode == null) return null;

        Room room = roomsByCode.get(roomCode);
        if (room != null) {
            room.removePlayerByConnection(connection);
            // On ne supprime pas la room même vide — la question du
            // nettoyage des rooms abandonnées est hors scope de la Phase 1.
        }
        return room;
    }

    private String generateUniqueCode() {
        String code;
        do {
            StringBuilder sb = new StringBuilder(CODE_LENGTH);
            for (int i = 0; i < CODE_LENGTH; i++) {
                sb.append(CODE_CHARACTERS.charAt(random.nextInt(CODE_CHARACTERS.length())));
            }
            code = sb.toString();
        } while (roomsByCode.containsKey(code));
        return code;
    }
}