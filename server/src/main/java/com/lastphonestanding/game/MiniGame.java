package com.lastphonestanding.game;

import com.google.gson.JsonObject;
import com.lastphonestanding.room.Player;

import java.util.Collection;
import java.util.List;

/**
 * Un mini-jeu = une manche. Une nouvelle instance est créée à chaque manche (voir {@link MiniGames}).
 * Le serveur gère le lobby, les connexions et la diffusion ; le mini-jeu ne gère que ses règles.
 * Chaque joueur expose alive / progress : le mini-jeu les met à jour, l'écran partagé les affiche.
 */
public interface MiniGame {

    /** Identifiant envoyé aux clients pour choisir l'interface (registre côté client : games/index.ts). */
    String id();

    /** Les joueurs sont déjà remis à zéro (alive, progress = 0). Ajouter ses champs à game_start. */
    void start(Collection<Player> players, JsonObject startMsg);

    /** Message d'un téléphone pendant la manche (tout type que le serveur ne gère pas lui-même). */
    void onPlayerMessage(Player player, String type, JsonObject msg);

    /** Un téléphone s'est déconnecté pendant la manche : il ne doit pas bloquer la partie. */
    void onDisconnect(Player player);

    boolean isOver();

    /** Appelé une fois, quand isOver() devient vrai. Les points sont ajoutés au score cumulé. */
    List<RankEntry> ranking();
}
