package com.lastphonestanding.game;

import java.util.Map;
import java.util.function.Supplier;

/** Registre des mini-jeux. Ajouter un jeu = une ligne ici + son dossier côté client. */
public final class MiniGames {
    public static final String DEFAULT = QteSurvival.ID;

    private static final Map<String, Supplier<MiniGame>> REGISTRY = Map.of(
        QteSurvival.ID, QteSurvival::new
    );

    private MiniGames() {}

    /** @return une nouvelle instance, ou null si l'id est inconnu */
    public static MiniGame create(String id) {
        Supplier<MiniGame> factory = REGISTRY.get(id);
        return factory == null ? null : factory.get();
    }
}
