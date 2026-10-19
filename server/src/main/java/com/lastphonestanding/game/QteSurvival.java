package com.lastphonestanding.game;

import com.google.gson.JsonObject;
import com.lastphonestanding.room.Player;

import java.util.ArrayList;
import java.util.Collection;
import java.util.Comparator;
import java.util.List;
import java.util.Random;
import java.util.function.ToIntFunction;

/**
 * QTE Survival : chaque téléphone joue la même séquence (même graine) à son rythme
 * et juge lui-même ses inputs ; ici on enregistre la progression et on classe.
 */
public class QteSurvival implements MiniGame {
    public static final String ID = "qte_survival";
    private static final Random RANDOM = new Random();

    private Collection<Player> players = List.of();
    // Le dernier en vie prend la 1re place d'office (voir rank)
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

    /** Le téléphone juge le timing ; on ne fait qu'enregistrer (jamais de recul). */
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

    /**
     * Classement à la distance parcourue ; ex æquo = même rang. +1 point par input.
     * Le dernier debout compte comme ayant la meilleure distance : toujours 1er, mais il partage
     * la place avec ceux allés aussi loin (sinon l'ordre d'arrivée réseau des K.O. déciderait).
     */
    @Override
    public List<RankEntry> ranking() {
        int best = players.stream().mapToInt(Player::getProgress).max().orElse(0);
        ToIntFunction<Player> distance = p -> p == lastStanding ? best : p.getProgress();

        List<Player> sorted = new ArrayList<>(players);
        sorted.sort(Comparator.comparingInt(distance).reversed()
            .thenComparing(p -> p != lastStanding)); // affiché en tête de ses ex æquo
        return RankEntry.assign(sorted, distance);
    }
}
