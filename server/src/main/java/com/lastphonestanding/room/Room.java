package com.lastphonestanding.room;

import com.google.gson.JsonObject;
import com.lastphonestanding.game.MiniGame;
import com.lastphonestanding.game.MiniGame.RankEntry;
import org.java_websocket.WebSocket;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

public class Room {
    public enum RoomState { LOBBY, IN_ROUND, ENDED }

    private final String roomCode;
    private final WebSocket hostConnection;
    private final Map<String, Player> players = new LinkedHashMap<>();
    private RoomState state = RoomState.LOBBY;
    private int round = 0;
    private MiniGame game;
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

    public void configure(int rounds, double speed) {
        totalRounds = Math.clamp(rounds, 1, MAX_ROUNDS);
        startSpeed = Math.clamp(speed, MIN_SPEED, MAX_SPEED);
    }

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

    public void startRound(MiniGame newGame, JsonObject startMsg) {
        players.values().removeIf(p -> !p.getConnection().isOpen());
        players.values().forEach(Player::resetForRound);
        round++;
        state = RoomState.IN_ROUND;
        game = newGame;
        startMsg.addProperty("round", round);
        startMsg.addProperty("totalRounds", totalRounds);
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
