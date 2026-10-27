import type { ComponentType, ReactNode } from "react";
import type { ServerMessage } from "../useWebSocket";

/** Ce que le serveur envoie pour chaque joueur (player_list_update). */
export interface PlayerInfo {
    id: string;
    name: string;
    color: string; // id de couleur (colors.ts)
    alive: boolean;
    progress: number;
    score: number;
}

/** Interface de la manche sur le téléphone. */
export interface PhoneGameProps {
    /** Le message game_start complet (round, game + champs propres au mini-jeu). */
    start: ServerMessage;
    /** Le joueur de ce téléphone (couleur en hex). */
    me: { name: string; color: string };
    /** Envoie un message au mini-jeu côté serveur (MiniGame.onPlayerMessage). */
    send: (msg: object) => void;
    /** Le joueur est K.O. : la coque affiche l'écran K.O. avec ce résumé. */
    onEliminated: (count: number, summary: ReactNode) => void;
}

/** Interface de la manche sur l'écran partagé. */
export interface HostGameProps {
    start: ServerMessage;
    players: PlayerInfo[];
    /** Ids des joueurs éliminés, dans l'ordre (le dernier = le K.O. le plus récent). */
    koOrder: string[];
}

export interface GameDefinition {
    name: string;
    /** Affiché dans le lobby : « Mini-jeu : <name> — <tagline> ». */
    tagline: string;
    Phone: ComponentType<PhoneGameProps>;
    Host: ComponentType<HostGameProps>;
}
