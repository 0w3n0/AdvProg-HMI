import type { GameDefinition } from "./types";
import { QTEPhone } from "./qte/QTEPhone";
import { QTEHost } from "./qte/QTEHost";

/** Registre des mini-jeux. Les clés = MiniGame.id() côté serveur (MiniGames.java). */
export const GAMES: Record<string, GameDefinition> = {
    qte_survival: { name: "QTE Survival", tagline: "une erreur et c'est le K.O.", Phone: QTEPhone, Host: QTEHost },
};

export const DEFAULT_GAME = "qte_survival";
