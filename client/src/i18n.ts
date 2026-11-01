import { useSyncExternalStore } from "react";
import type { Qte } from "./games/qte/qte";

export type Lang = "fr" | "en";

const fr = {
    tagline: "Le dernier téléphone debout gagne.",
    play: "JE JOUE",
    sharedScreen: "ÉCRAN PARTAGÉ",
    ord: (n: number): string => (n === 1 ? "er" : "e"),
    ready: "PRÊT",

    roomCode: "Code de la salle",
    nickname: "Ton pseudo",
    yourColor: "Ta couleur",
    greyed: "Grisé = déjà pris par un autre joueur",
    connecting: "Connexion au serveur… (jusqu'à une minute s'il se réveille)",
    join: "REJOINDRE",
    errors: {} as Record<string, string>,

    inGame: "Tu es dans la partie ! La manche démarre depuis l'écran principal.",
    soundOn: "🔊 Son du téléphone : activé",
    soundOff: "🔇 Son du téléphone : coupé",

    reconnected: "Reconnecté ! Tu rejoues à la prochaine manche.",
    youLasted: "Tu as tenu",
    inputs: (n: number) => (n > 1 ? "inputs" : "input"),
    provisionalRank: "Rang provisoire",
    stillAlive: (n: number) => `${n} encore en vie`,
    dontLeave: "Ne pars pas !",
    endOnMain: "La fin se joue sur l'écran principal.",
    cheer: "Réagis depuis les tribunes",
    reactionsShown: "Tes réactions s'affichent sur l'écran principal",
    reactions: { allez: "ALLEZ !", ouah: "OUAH", nooon: "NOOON" },

    finalRanking: "Partie terminée — classement final",
    roundDone: (r: number | string, total: number | string) => `Manche ${r} / ${total} terminée`,
    inTotal: "au total",
    lastRound: "Dernière manche :",
    total: "Total :",
    watchMain: "Regarde l'écran principal !",
    waitingNext: "En attente de la manche suivante…",

    missed: (n: number) => `Raté au ${n}${n === 1 ? "er" : "e"} input — c'était`,
    describe: (q: Qte) => (q.kind === "shape" ? `un ${q.shape}` : q.kind === "skill" ? "un skill check" : "un approach circle"),
    roundInfo: (r: number, total: number, speed: string) => `Manche ${r} / ${total} · vitesse ×${speed}`,
    getReady: "Prépare-toi : regarde ton téléphone, pas l'écran !",
    close: "JUSTE !",
    next: "Ensuite",
    newKind: "NOUVEAU !",
    shapes: { triangle: "triangle", cercle: "cercle", carré: "carré", losange: "losange" },
    pressShape: "Appuie sur la bonne forme",
    skillHint: "Tape quand l'aiguille passe dans la zone",
    tap: "TAPE !",
    approachHint: "Tape quand l'anneau touche le bord du cercle",

    howTo: "Comment jouer",
    howShape: ["Forme", " : touche la forme demandée"],
    howNeedle: ["Aiguille", " : tape dans la zone"],
    howRing: ["Anneau", " : tape quand il touche le cercle"],
    faster: "De plus en plus vite. Trop lent ou raté :",
    pointsRule: "+1 point par input réussi, le dernier debout gagne.",
    lookPhone: "Joue en regardant ton téléphone.",

    koAfter: (n: number) => ` est K.O. après ${n} inputs`,
    leads: (n: number) => ` mène avec ${n} inputs`,
    watching: " regarde depuis les tribunes",
    go: "GO !",
    lastStanding: "DERNIER DEBOUT !",
    round: "MANCHE",
    speed: "Vitesse",
    alive: "EN VIE",
    live: "EN DIRECT",

    creatingRoom: "Création de la salle…",
    connectingHost: "Connexion au serveur… (au premier lancement, le serveur peut mettre une minute à se réveiller)",
    joinAt: "Rejoins sur",
    copy: "COPIER",
    copied: "COPIÉ !",
    localhostWarn: ["Les téléphones ne peuvent pas joindre « localhost » : ouvre cette page via l'adresse", "affichée par Vite."],
    players: "JOUEURS",
    pickColor: "Choisis ta couleur sur ton téléphone",
    waitingSlot: "En attente…",
    miniGame: "Mini-jeu :",
    rounds: "Manches",
    fewerRounds: "Moins de manches",
    moreRounds: "Plus de manches",
    startSpeed: "Vitesse de départ",
    startGame: "LANCER LA PARTIE",

    gameOver: (n: number) => `Partie terminée — ${n} manche${n > 1 ? "s" : ""}`,
    roundOver: (r: number | undefined, total: number) => `Manche ${r} / ${total} — terminée`,
    winsGame: [" REMPORTE", "LA PARTIE !"],
    lastPhone: [" EST LE DERNIER", "TÉLÉPHONE DEBOUT"],
    tied: "ex æquo",
    lastStandingSmall: "dernier debout",
    ranking: "CLASSEMENT",
    byScore: "Classé selon le score cumulé sur toutes les manches.",
    byDistance: "Classé selon la distance parcourue, pas l'ordre d'élimination.",
    totalScore: "Score cumulé",
    backToLobby: "RETOUR AU LOBBY",
    nextRound: "MANCHE SUIVANTE",
};

const en: typeof fr = {
    tagline: "The last phone standing wins.",
    play: "I'M PLAYING",
    sharedScreen: "SHARED SCREEN",
    ord: (n: number) => (n % 10 === 1 && n !== 11 ? "st" : n % 10 === 2 && n !== 12 ? "nd" : n % 10 === 3 && n !== 13 ? "rd" : "th"),
    ready: "READY",

    roomCode: "Room code",
    nickname: "Your nickname",
    yourColor: "Your color",
    greyed: "Greyed out = taken by another player",
    connecting: "Connecting to the server… (up to a minute if it's waking up)",
    join: "JOIN",
    errors: {
        "Salle introuvable": "Room not found",
        "La partie a déjà commencé": "The game has already started",
        "La salle est pleine": "The room is full",
        "Déjà dans une salle": "Already in a room",
        "Choisis un pseudo": "Pick a nickname",
        "Pseudo trop long (16 max)": "Nickname too long (16 max)",
        "Pseudo déjà pris": "Nickname already taken",
        "Choisis une couleur": "Pick a color",
        "Couleur déjà prise": "Color already taken",
        "Session expirée": "Session expired",
        "L'écran principal s'est déconnecté": "The main screen disconnected",
    },

    inGame: "You're in! The round starts from the main screen.",
    soundOn: "🔊 Phone sound: on",
    soundOff: "🔇 Phone sound: off",

    reconnected: "Reconnected! You'll play again next round.",
    youLasted: "You lasted",
    inputs: (n: number) => (n > 1 ? "inputs" : "input"),
    provisionalRank: "Provisional rank",
    stillAlive: (n: number) => `${n} still alive`,
    dontLeave: "Don't leave!",
    endOnMain: "The ending plays out on the main screen.",
    cheer: "Cheer from the stands",
    reactionsShown: "Your reactions show up on the main screen",
    reactions: { allez: "GO GO!", ouah: "WOW", nooon: "NOOO" },

    finalRanking: "Game over — final ranking",
    roundDone: (r: number | string, total: number | string) => `Round ${r} / ${total} over`,
    inTotal: "in total",
    lastRound: "Last round:",
    total: "Total:",
    watchMain: "Look at the main screen!",
    waitingNext: "Waiting for the next round…",

    missed: (n: number) => `Missed input #${n} — it was`,
    describe: (q: Qte) => (q.kind === "shape" ? `a ${en.shapes[q.shape]}` : q.kind === "skill" ? "a skill check" : "an approach circle"),
    roundInfo: (r: number, total: number, speed: string) => `Round ${r} / ${total} · speed ×${speed}`,
    getReady: "Get ready: look at your phone, not the screen!",
    close: "CLOSE!",
    next: "Next",
    newKind: "NEW!",
    shapes: { triangle: "triangle", cercle: "circle", carré: "square", losange: "diamond" },
    pressShape: "Tap the right shape",
    skillHint: "Tap when the needle is in the zone",
    tap: "TAP!",
    approachHint: "Tap when the ring touches the edge of the circle",

    howTo: "How to play",
    howShape: ["Shape", ": tap the shape shown"],
    howNeedle: ["Needle", ": tap inside the zone"],
    howRing: ["Ring", ": tap when it touches the circle"],
    faster: "Faster and faster. Too slow or wrong:",
    pointsRule: "+1 point per input cleared, the last one standing wins.",
    lookPhone: "Keep your eyes on your phone.",

    koAfter: (n: number) => ` is K.O. after ${n} inputs`,
    leads: (n: number) => ` leads with ${n} inputs`,
    watching: " is watching from the stands",
    go: "GO!",
    lastStanding: "LAST ONE STANDING!",
    round: "ROUND",
    speed: "Speed",
    alive: "ALIVE",
    live: "LIVE",

    creatingRoom: "Creating the room…",
    connectingHost: "Connecting to the server… (on first launch, the server can take a minute to wake up)",
    joinAt: "Join at",
    copy: "COPY",
    copied: "COPIED!",
    localhostWarn: ["Phones can't reach “localhost”: open this page with the", "address shown by Vite."],
    players: "PLAYERS",
    pickColor: "Pick your color on your phone",
    waitingSlot: "Waiting…",
    miniGame: "Mini-game:",
    rounds: "Rounds",
    fewerRounds: "Fewer rounds",
    moreRounds: "More rounds",
    startSpeed: "Starting speed",
    startGame: "START GAME",

    gameOver: (n: number) => `Game over — ${n} round${n > 1 ? "s" : ""}`,
    roundOver: (r: number | undefined, total: number) => `Round ${r} / ${total} — over`,
    winsGame: [" WINS", "THE GAME!"],
    lastPhone: [" IS THE LAST", "PHONE STANDING"],
    tied: "tied",
    lastStandingSmall: "last standing",
    ranking: "RANKING",
    byScore: "Ranked by total score across all rounds.",
    byDistance: "Ranked by distance reached, not by elimination order.",
    totalScore: "Total score",
    backToLobby: "BACK TO LOBBY",
    nextRound: "NEXT ROUND",
};

const STRINGS = { fr, en };
const LANG_KEY = "lps-lang";

function initialLang(): Lang {
    try {
        const saved = localStorage.getItem(LANG_KEY);
        if (saved === "fr" || saved === "en") return saved;
    } catch (e) {
        console.warn(e);
    }
    return navigator.language.toLowerCase().startsWith("fr") ? "fr" : "en";
}

let lang = initialLang();
document.documentElement.lang = lang;
const listeners = new Set<() => void>();

function subscribe(cb: () => void) {
    listeners.add(cb);
    return () => listeners.delete(cb);
}

export function setLang(l: Lang) {
    lang = l;
    document.documentElement.lang = l;
    try {
        localStorage.setItem(LANG_KEY, l);
    } catch (e) {
        console.warn(e);
    }
    listeners.forEach(cb => cb());
}

export function useLang() {
    const current = useSyncExternalStore(subscribe, () => lang);
    return { lang: current, t: STRINGS[current], setLang };
}
