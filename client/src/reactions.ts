// Réactions depuis les tribunes (joueurs K.O.) — mêmes ids que REACTIONS côté serveur
export const REACTIONS = { allez: "ALLEZ !", ouah: "OUAH", nooon: "NOOON" } as const;
export type ReactionId = keyof typeof REACTIONS;

// = REACTION_INTERVAL_MS côté serveur : le bouton se grise le temps que le serveur accepte la suivante
export const REACTION_COOLDOWN_MS = 700;
