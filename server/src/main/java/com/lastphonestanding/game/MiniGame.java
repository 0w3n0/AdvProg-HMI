package com.lastphonestanding.game;

import com.google.gson.JsonObject;
import com.lastphonestanding.room.Player;

import java.util.ArrayList;
import java.util.Collection;
import java.util.List;
import java.util.Map;
import java.util.function.Supplier;
import java.util.function.ToIntFunction;

public interface MiniGame {

    String DEFAULT = QteSurvival.ID;

    Map<String, Supplier<MiniGame>> REGISTRY = Map.of(
        QteSurvival.ID, QteSurvival::new
    );

    static MiniGame create(String id) {
        Supplier<MiniGame> factory = REGISTRY.get(id);
        return factory == null ? null : factory.get();
    }

    String id();

    void start(Collection<Player> players, JsonObject startMsg);

    void onPlayerMessage(Player player, String type, JsonObject msg);

    void onDisconnect(Player player);

    boolean isOver();

    List<RankEntry> ranking();

    record RankEntry(Player player, int rank, int points) {

        public static List<RankEntry> assign(List<Player> sorted, ToIntFunction<Player> distance) {
            List<RankEntry> ranking = new ArrayList<>();
            for (int i = 0; i < sorted.size(); i++) {
                Player p = sorted.get(i);
                boolean tie = i > 0 && distance.applyAsInt(sorted.get(i - 1)) == distance.applyAsInt(p);
                ranking.add(new RankEntry(p, tie ? ranking.get(i - 1).rank() : i + 1, p.getProgress()));
            }
            return ranking;
        }
    }
}
