package com.lastphonestanding.game;

import com.google.gson.JsonObject;
import com.lastphonestanding.room.Player;

import java.util.ArrayList;
import java.util.Collection;
import java.util.Comparator;
import java.util.List;
import java.util.Random;
import java.util.function.ToIntFunction;

public class QteSurvival implements MiniGame {
    public static final String ID = "qte_survival";
    private static final Random RANDOM = new Random();

    private Collection<Player> players = List.of();
    private Player lastStanding;

    @Override public String id() { return ID; }

    @Override
    public void start(Collection<Player> players, JsonObject startMsg) {
        this.players = players;
        startMsg.addProperty("seed", RANDOM.nextInt());
    }

    @Override
    public void onPlayerMessage(Player player, String type, JsonObject msg) {
        int count = msg.has("count") ? msg.get("count").getAsInt() : 0;
        if (type.equals("progress")) recordProgress(player, count);
        else if (type.equals("eliminated")) eliminate(player, count);
    }

    @Override
    public void onDisconnect(Player player) {
        eliminate(player, player.getProgress());
    }

    void recordProgress(Player p, int progress) {
        if (p.isAlive() && progress > p.getProgress()) p.setProgress(progress);
    }

    void eliminate(Player p, int progress) {
        if (!p.isAlive()) return;
        recordProgress(p, progress);
        p.setAlive(false);
        List<Player> alive = players.stream().filter(Player::isAlive).toList();
        if (alive.size() == 1 && players.size() > 1) lastStanding = alive.get(0);
    }

    @Override
    public boolean isOver() {
        return players.stream().noneMatch(Player::isAlive);
    }

    @Override
    public List<RankEntry> ranking() {
        int best = players.stream().mapToInt(Player::getProgress).max().orElse(0);
        ToIntFunction<Player> distance = p -> p == lastStanding ? best : p.getProgress();

        List<Player> sorted = new ArrayList<>(players);
        sorted.sort(Comparator.comparingInt(distance).reversed()
            .thenComparing(p -> p != lastStanding));
        return RankEntry.assign(sorted, distance);
    }
}
