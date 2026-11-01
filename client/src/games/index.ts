import type { ComponentType, ReactNode } from "react";
import type { ServerMessage } from "../useWebSocket";
import type { Lang } from "../i18n";
import { QTEPhone, QTEHowTo } from "./qte/QTEPhone";
import { QTEHost } from "./qte/QTEHost";

export interface PlayerInfo {
    id: string;
    name: string;
    color: string;
    alive: boolean;
    progress: number;
    score: number;
}

export interface PhoneGameProps {
    start: ServerMessage;
    me: { name: string; color: string };
    send: (msg: object) => void;
    onEliminated: (count: number, summary: ReactNode) => void;
}

export interface HostGameProps {
    start: ServerMessage;
    players: PlayerInfo[];
    koOrder: string[];
}

export interface GameDefinition {
    name: string;
    tagline: Record<Lang, string>;
    Phone: ComponentType<PhoneGameProps>;
    Host: ComponentType<HostGameProps>;
    HowTo: ComponentType;
}

export const GAMES: Record<string, GameDefinition> = {
    qte_survival: { name: "QTE Survival", tagline: { fr: "une erreur et c'est le K.O.", en: "one mistake and you're K.O." }, Phone: QTEPhone, Host: QTEHost, HowTo: QTEHowTo },
};

export const DEFAULT_GAME = "qte_survival";
