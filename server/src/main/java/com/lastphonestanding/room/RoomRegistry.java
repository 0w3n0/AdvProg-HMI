package com.lastphonestanding.room;

import org.java_websocket.WebSocket;
import java.security.SecureRandom;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/** Pas thread-safe : le serveur sérialise tous les appels (méthodes synchronized). */
public class RoomRegistry {

    // Pas de O/0/I/1 : évite la confusion à l'oral quand on annonce le code
    private static final String CODE_CHARACTERS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    private static final int CODE_LENGTH = 4;
    public static final int MAX_PLAYERS = 8;
    public static final int MAX_NAME_LENGTH = 16;
    // Une couleur par joueur ; les codes hex sont côté client (client/src/colors.ts)
    public static final List<String> COLORS = List.of("red", "yellow", "purple", "green", "blue", "orange", "pink", "lime");
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

    /** @throws IllegalArgumentException avec un message affichable au joueur */
    public Player joinRoom(String roomCode, String rawName, String color, WebSocket connection) {
        Room room = roomsByCode.get(roomCode);
        if (room == null) throw new IllegalArgumentException("Salle introuvable");
        if (room.getState() != RoomState.LOBBY) throw new IllegalArgumentException("La partie a déjà commencé");
        if (room.getPlayers().size() >= MAX_PLAYERS) throw new IllegalArgumentException("La salle est pleine");
        if (roomCodeByConnection.containsKey(connection)) throw new IllegalArgumentException("Déjà dans une salle");

        String name = rawName == null ? "" : rawName.trim();
        if (name.isEmpty()) throw new IllegalArgumentException("Choisis un pseudo");
        if (name.length() > MAX_NAME_LENGTH) throw new IllegalArgumentException("Pseudo trop long (16 max)");
        for (Player p : room.getPlayers().values()) {
            if (p.getName().equalsIgnoreCase(name)) throw new IllegalArgumentException("Pseudo déjà pris");
        }
        if (!COLORS.contains(color)) throw new IllegalArgumentException("Choisis une couleur");
        if (takenColors(room).contains(color)) throw new IllegalArgumentException("Couleur déjà prise");

        Player player = new Player(UUID.randomUUID().toString(), name, connection);
        player.setColor(color);
        room.addPlayer(player);
        roomCodeByConnection.put(connection, roomCode);
        return player;
    }

    /**
     * Un téléphone revient (rechargement, veille, réseau) : il récupère sa place et son score.
     * En pleine manche il reste éliminé de cette manche (règle de déconnexion) et rejoue à la suivante.
     * @throws IllegalArgumentException si la salle ou la session n'existe plus
     */
    public Player rejoinRoom(String roomCode, String token, WebSocket connection) {
        Room room = roomsByCode.get(roomCode);
        if (room == null) throw new IllegalArgumentException("Salle introuvable");
        if (roomCodeByConnection.containsKey(connection)) throw new IllegalArgumentException("Déjà dans une salle");
        Player player = room.getPlayers().values().stream()
            .filter(p -> p.getToken().equals(token)).findFirst()
            .orElseThrow(() -> new IllegalArgumentException("Session expirée"));

        WebSocket old = player.getConnection();
        roomCodeByConnection.remove(old); // son onClose ne touchera plus à rien
        if (room.getState() == RoomState.IN_ROUND) room.getGame().onDisconnect(player);
        player.setConnection(connection);
        roomCodeByConnection.put(connection, roomCode);
        if (old != null && old.isOpen()) old.close(); // ancien onglet encore ouvert
        return player;
    }

    /**
     * À appeler depuis onClose(). Si c'est l'hôte, la room est supprimée
     * (l'appelant prévient les joueurs). Sinon : retiré en lobby, éliminé en manche,
     * gardé entre deux manches (pour pouvoir revenir ; purgé au lancement suivant s'il n'est pas revenu).
     */
    public Room handleDisconnect(WebSocket connection) {
        String roomCode = roomCodeByConnection.remove(connection);
        if (roomCode == null) return null;

        Room room = roomsByCode.get(roomCode);
        if (room == null) return null;

        if (room.getHostConnection() == connection) {
            roomsByCode.remove(roomCode);
            for (Player p : room.getPlayers().values()) roomCodeByConnection.remove(p.getConnection());
        } else if (room.getState() == RoomState.LOBBY) {
            room.removePlayerByConnection(connection);
        } else {
            Player p = room.playerOf(connection);
            if (p != null) room.getGame().onDisconnect(p);
        }
        return room;
    }

    public static List<String> takenColors(Room room) {
        return room.getPlayers().values().stream().map(Player::getColor).toList();
    }

    public Room roomOf(WebSocket connection) {
        String code = roomCodeByConnection.get(connection);
        return code == null ? null : roomsByCode.get(code);
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
