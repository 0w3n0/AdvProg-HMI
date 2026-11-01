package com.lastphonestanding.room;

import org.java_websocket.WebSocket;

public class Player {
    private final String id;
    private final String name;
    private final WebSocket connection;
    // Un joueur déconnecté en pleine manche reste dans la room, mais éliminé
    private boolean alive = true;
    private int progress = 0; // inputs réussis dans la manche en cours
    private int score = 0;    // cumulé sur toutes les manches
    private String color = ""; // id de couleur (voir RoomRegistry.COLORS)

    public Player(String id, String name, WebSocket connection) {
        this.id = id;
        this.name = name;
        this.connection = connection;
    }

    public String getId() { return id; }
    public String getName() { return name; }
    public WebSocket getConnection() { return connection; }
    public boolean isAlive() { return alive; }
    public void setAlive(boolean alive) { this.alive = alive; }
    public int getProgress() { return progress; }
    public void setProgress(int progress) { this.progress = progress; }
    public int getScore() { return score; }
    public void addScore(int points) { score += points; }
    public void resetForRound() { alive = true; progress = 0; }
    public String getColor() { return color; }
    public void setColor(String color) { this.color = color; }

    /** Envoie sans planter si le téléphone s'est déjà déconnecté. */
    public void send(String message) {
        if (connection.isOpen()) connection.send(message);
    }
}
