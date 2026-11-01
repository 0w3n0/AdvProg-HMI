package com.lastphonestanding.room;

import org.java_websocket.WebSocket;

public class Player {
    private final String id;
    private final String name;
    private WebSocket connection;
    private final String token = java.util.UUID.randomUUID().toString();
    private boolean alive = true;
    private int progress = 0;
    private int score = 0;
    private String color = "";
    private long lastReactionAt = 0;

    public Player(String id, String name, WebSocket connection) {
        this.id = id;
        this.name = name;
        this.connection = connection;
    }

    public String getId() { return id; }
    public String getName() { return name; }
    public WebSocket getConnection() { return connection; }
    public void setConnection(WebSocket connection) { this.connection = connection; }
    public String getToken() { return token; }
    public boolean isAlive() { return alive; }
    public void setAlive(boolean alive) { this.alive = alive; }
    public int getProgress() { return progress; }
    public void setProgress(int progress) { this.progress = progress; }
    public int getScore() { return score; }
    public void addScore(int points) { score += points; }
    public void resetScore() { score = 0; }
    public void resetForRound() { alive = true; progress = 0; }
    public String getColor() { return color; }
    public void setColor(String color) { this.color = color; }

    public boolean tryReact(long now, long intervalMs) {
        if (now - lastReactionAt < intervalMs) return false;
        lastReactionAt = now;
        return true;
    }

    public void send(String message) {
        if (connection.isOpen()) connection.send(message);
    }
}
