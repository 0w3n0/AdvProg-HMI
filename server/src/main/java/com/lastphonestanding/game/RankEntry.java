package com.lastphonestanding.game;

import com.lastphonestanding.room.Player;

import java.util.ArrayList;
import java.util.List;
import java.util.function.ToIntFunction;

public record RankEntry(Player player, int rank, int points) {

    /**
     * Rangs à partir d'une liste déjà triée (meilleur en tête) : même distance = même rang
     * (1, 2, 3, 3, 5). Points = progress du joueur. Réutilisable par tout mini-jeu.
     */
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
