package com.lastphonestanding.room;

import com.google.gson.JsonObject;
import com.lastphonestanding.game.MiniGame;
import com.lastphonestanding.game.RankEntry;
import org.java_websocket.WebSocket;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

public class Room {
    private final String roomCode;
    private final WebSocket hostConnection;
    // LinkedHashMap : on garde l'ordre d'arrivée des joueurs pour l'affichage
    private final Map<String, Player> players = new LinkedHashMap<>();
    private RoomState state = RoomState.LOBBY;
    private int round = 0;
    private MiniGame game; // le mini-jeu de la manche en cours (ou de la dernière)

    public Room(String roomCode, WebSocket hostConnection) {
        this.roomCode = roomCode;
        this.hostConnection = hostConnection;
    }

    public String getRoomCode() { return roomCode; }
    public WebSocket getHostConnection() { return hostConnection; }
    public Map<String, Player> getPlayers() { return players; }
    public RoomState getState() { return state; }
    public int getRound() { return round; }
    public MiniGame getGame() { return game; }

    public void addPlayer(Player player) {
        players.put(player.getId(), player);
    }

    public void removePlayerByConnection(WebSocket connection) {
        players.values().removeIf(p -> p.getConnection() == connection);
    }

    public Player playerOf(WebSocket connection) {
        for (Player p : players.values()) if (p.getConnection() == connection) return p;
        return null;
    }

    /** Remplit startMsg (round, game + champs du mini-jeu). */
    public void startRound(MiniGame newGame, JsonObject startMsg) {
        // Les téléphones partis pendant la manche précédente ne reviennent pas
        players.values().removeIf(p -> !p.getConnection().isOpen());
        players.values().forEach(Player::resetForRound);
        round++;
        state = RoomState.IN_ROUND;
        game = newGame;
        startMsg.addProperty("round", round);
        startMsg.addProperty("game", game.id());
        game.start(players.values(), startMsg);
    }

    public boolean isRoundOver() {
        return state == RoomState.IN_ROUND && game.isOver();
    }

    public List<RankEntry> endRound() {
        state = RoomState.ENDED;
        List<RankEntry> ranking = game.ranking();
        ranking.forEach(e -> e.player().addScore(e.points()));
        return ranking;
    }
}
