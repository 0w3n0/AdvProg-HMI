package com.lastphonestanding.room;

import com.lastphonestanding.room.Room.RoomState;
import com.google.gson.JsonObject;
import com.lastphonestanding.game.QteSurvival;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

class RoomTest {

    @Test
    void settingsAreClampedAndSentWithEachRound() {
        Room room = new Room("TEST", null);
        room.configure(99, 0.01);
        assertEquals(Room.MAX_ROUNDS, room.getTotalRounds());
        assertEquals(Room.MIN_SPEED, room.getStartSpeed());

        room.configure(2, 1.2);
        JsonObject msg = new JsonObject();
        room.startRound(new QteSurvival(), msg);
        assertEquals(2, msg.get("totalRounds").getAsInt());
        assertEquals(1.2, msg.get("startSpeed").getAsDouble());
        assertFalse(room.isLastRound());
    }

    @Test
    void lastRoundThenBackToLobbyResetsTheGame() {
        Room room = new Room("TEST", null);
        room.configure(2, 1.0);
        room.startRound(new QteSurvival(), new JsonObject());
        room.endRound();
        room.startRound(new QteSurvival(), new JsonObject());
        room.endRound();
        assertTrue(room.isLastRound());
        assertEquals(RoomState.ENDED, room.getState());

        room.backToLobby();
        assertEquals(RoomState.LOBBY, room.getState());
        assertEquals(0, room.getRound());
        assertFalse(room.isLastRound());
    }
}
