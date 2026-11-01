package com.lastphonestanding.room;

import com.google.gson.JsonObject;
import com.lastphonestanding.game.QteSurvival;
import org.java_websocket.WebSocket;
import org.junit.jupiter.api.Test;

import java.lang.reflect.Proxy;

import static org.junit.jupiter.api.Assertions.*;

class RoomRegistryTest {

    private static WebSocket openConn() {
        return (WebSocket) Proxy.newProxyInstance(WebSocket.class.getClassLoader(), new Class<?>[]{WebSocket.class},
            (proxy, m, args) -> switch (m.getName()) {
                case "hashCode" -> System.identityHashCode(proxy);
                case "equals" -> proxy == args[0];
                case "isOpen" -> true;
                default -> null;
            });
    }

    @Test
    void rejoinMidRoundKeepsScoreButEliminatesForTheRound() {
        RoomRegistry reg = new RoomRegistry();
        Room room = reg.createRoom(openConn());
        WebSocket phone = openConn(), other = openConn();
        Player owen = reg.joinRoom(room.getRoomCode(), "Owen", "red", phone);
        reg.joinRoom(room.getRoomCode(), "Léa", "blue", other);
        owen.addScore(5);
        room.startRound(new QteSurvival(), new JsonObject());

        reg.handleDisconnect(phone);
        WebSocket back = openConn();
        assertThrows(IllegalArgumentException.class, () -> reg.rejoinRoom(room.getRoomCode(), "mauvais", back));
        assertSame(owen, reg.rejoinRoom(room.getRoomCode(), owen.getToken(), back));
        assertSame(back, owen.getConnection());
        assertSame(room, reg.roomOf(back));
        assertFalse(owen.isAlive());
        assertEquals(5, owen.getScore());
    }

    @Test
    void disconnectBetweenRoundsKeepsThePlayerSlot() {
        RoomRegistry reg = new RoomRegistry();
        Room room = reg.createRoom(openConn());
        WebSocket phone = openConn();
        Player owen = reg.joinRoom(room.getRoomCode(), "Owen", "red", phone);
        room.startRound(new QteSurvival(), new JsonObject());
        room.getGame().onDisconnect(owen);
        room.endRound();

        reg.handleDisconnect(phone);
        assertTrue(room.getPlayers().containsValue(owen));
        assertNull(reg.roomOf(phone));
    }
}
