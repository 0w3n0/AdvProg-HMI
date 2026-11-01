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
    // Réglages choisis par l'hôte dans le lobby
    private int totalRounds = 3;
    private double startSpeed = 1.0;

    public static final int MAX_ROUNDS = 10;
    public static final double MIN_SPEED = 0.5, MAX_SPEED = 2.5;

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
    public int getTotalRounds() { return totalRounds; }
    public double getStartSpeed() { return startSpeed; }
    public boolean isLastRound() { return round >= totalRounds; }

    /** Valeurs venues du client : ramenées dans les bornes plutôt que refusées. */
    public void configure(int rounds, double speed) {
        totalRounds = Math.clamp(rounds, 1, MAX_ROUNDS);
        startSpeed = Math.clamp(speed, MIN_SPEED, MAX_SPEED);
    }

    /** Fin de partie : scores remis à zéro, on peut changer les réglages et accueillir de nouveaux joueurs. */
    public void backToLobby() {
        players.values().removeIf(p -> !p.getConnection().isOpen());
        players.values().forEach(p -> { p.resetForRound(); p.resetScore(); });
        round = 0;
        state = RoomState.LOBBY;
    }

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
        startMsg.addProperty("totalRounds", totalRounds);
        // Vitesse de la 1re manche ; les clients ajoutent +0.2 par manche (roundSpeed dans qte.ts)
        startMsg.addProperty("startSpeed", startSpeed);
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
