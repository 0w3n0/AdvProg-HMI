package com.lastphonestanding.room;

import org.java_websocket.WebSocket;

public class Player {
    private final String id;
    private final String name;
    private final WebSocket connection;

    public Player(String id, String name, WebSocket connection) {
        this.id = id;
        this.name = name;
        this.connection = connection;
    }

    public String getId() { return id; }
    public String getName() { return name; }
    public WebSocket getConnection() { return connection; }
}