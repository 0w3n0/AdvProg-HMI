package com.lastphonestanding.game;

import com.lastphonestanding.game.MiniGame.RankEntry;
import com.google.gson.JsonObject;
import com.lastphonestanding.room.Player;
import org.junit.jupiter.api.Test;

import java.util.ArrayList;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

class QteSurvivalTest {

    private final List<Player> players = new ArrayList<>();
    private final QteSurvival game = new QteSurvival();

    private Player player(String name, int progress) {
        Player p = new Player(name, name, null);
        p.setProgress(progress);
        players.add(p);
        return p;
    }

    private void start() {
        JsonObject startMsg = new JsonObject();
        game.start(players, startMsg);
        assertTrue(startMsg.has("seed"), "la graine part dans game_start");
    }

    private static List<String> summary(List<RankEntry> ranking) {
        return ranking.stream().map(e -> e.rank() + ":" + e.player().getName() + ":" + e.points()).toList();
    }

    @Test
    void rankByDistanceWithTies() {
        for (String n : List.of("Sam:9", "Theo:15", "Lea:23", "Nico:15", "Meriem:17", "Owen:12")) {
            String[] s = n.split(":");
            player(s[0], Integer.parseInt(s[1])).setAlive(false);
        }
        start();
        assertTrue(game.isOver());
        assertEquals(
            List.of("1:Lea:23", "2:Meriem:17", "3:Theo:15", "3:Nico:15", "5:Owen:12", "6:Sam:9"),
            summary(game.ranking()));
    }

    @Test
    void lastStandingSharesFirstWithThoseWhoWentAsFar() {
        Player a = player("A", 0), b = player("B", 0), c = player("C", 0);
        start();
        game.eliminate(a, 20);
        game.eliminate(b, 10);
        assertFalse(game.isOver(), "C encore en vie");
        game.eliminate(c, 12);
        assertTrue(game.isOver());
        assertEquals(List.of("1:C:12", "1:A:20", "3:B:10"), summary(game.ranking()));
    }

    @Test
    void messagesAndDisconnectsDriveTheRound() {
        Player a = player("A", 0), b = player("B", 0);
        start();
        JsonObject progress = new JsonObject();
        progress.addProperty("count", 5);
        game.onPlayerMessage(a, "progress", progress);
        progress.addProperty("count", 3);
        game.onPlayerMessage(a, "progress", progress);
        assertEquals(5, a.getProgress());

        game.onDisconnect(a);
        assertFalse(a.isAlive(), "déconnecté = éliminé");
        JsonObject ko = new JsonObject();
        ko.addProperty("count", 8);
        game.onPlayerMessage(b, "eliminated", ko);
        assertEquals(List.of("1:B:8", "2:A:5"), summary(game.ranking()));
    }

    @Test
    void registryCreatesFreshInstances() {
        assertNotSame(MiniGame.create(MiniGame.DEFAULT), MiniGame.create(MiniGame.DEFAULT));
        assertNull(MiniGame.create("inconnu"));
    }
}
