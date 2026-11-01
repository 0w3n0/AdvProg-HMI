import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { useWebSocket, type ServerMessage } from "./useWebSocket";
import { GAMES, DEFAULT_GAME } from "./games";
import type { PlayerInfo } from "./games/types";
import { PLAYER_COLORS, colorOf, type ColorId } from "./colors";
import { PhoneAvatar } from "./components/art";
import { getPhoneSound, phoneFeedback, setPhoneSound } from "./feedback";
import { REACTIONS, REACTION_COOLDOWN_MS, type ReactionId } from "./reactions";

interface ClientViewProps {
    initialRoomCode?: string;
}

interface RankEntry { id: string; name: string; progress: number; rank: number; points: number; score: number }

const COLOR_IDS = Object.keys(PLAYER_COLORS) as ColorId[];

// Session du téléphone : après un rechargement ou une coupure, le jeton permet de reprendre sa place
interface Session { roomCode: string; token: string; name: string; color: ColorId }
const SESSION_KEY = "lps-session";
function loadSession(): Session | null {
    try { return JSON.parse(localStorage.getItem(SESSION_KEY) ?? "null"); } catch { return null; }
}
function saveSession(s: Session | null) {
    try { if (s) localStorage.setItem(SESSION_KEY, JSON.stringify(s)); else localStorage.removeItem(SESSION_KEY); } catch { /* navigation privée */ }
}

export function ClientView({ initialRoomCode = "" }: ClientViewProps) {
    const [saved] = useState(() => { const s = loadSession(); return s && s.roomCode === initialRoomCode ? s : null; });
    const [name, setName] = useState(saved?.name ?? "");
    const [roomCode, setRoomCode] = useState(initialRoomCode);
    const [color, setColor] = useState<ColorId>(saved?.color ?? "yellow");
    // Vrai quand il faut présenter le jeton à la prochaine connexion (rechargement, puis chaque coupure)
    const rejoinPending = useRef(saved !== null);
    // sendMessage n'existe qu'après useWebSocket : le handler passe par cette ref
    const sendRef = useRef<(payload: object) => void>(() => {});
    const [takenColors, setTakenColors] = useState<string[]>([]);
    const [roomInfoTick, setRoomInfoTick] = useState(0);
    const [myId, setMyId] = useState<string | null>(null);
    const [players, setPlayers] = useState<PlayerInfo[]>([]);
    const [gameState, setGameState] = useState<"waiting" | "playing" | "ko" | "ended">("waiting");
    const [error, setError] = useState("");
    const [startMsg, setStartMsg] = useState<ServerMessage>(null);
    const [ko, setKo] = useState<{ count: number; summary: ReactNode } | null>(null);
    // finalRank : rang au score cumulé, seulement après la dernière manche
    const [myResult, setMyResult] = useState<(RankEntry & { finalRank?: number; round: number; totalRounds: number }) | null>(null);
    const [phoneSound, setPhoneSoundState] = useState(getPhoneSound);
    const [reactionCooldown, setReactionCooldown] = useState(false);

    const { connected, sendMessage } = useWebSocket((msg: ServerMessage) => {
        if (msg.type === "room_info") {
            setTakenColors(msg.takenColors);
            // Si ma couleur vient d'être prise, je bascule sur la première libre
            if (msg.takenColors.includes(color)) setColor(COLOR_IDS.find(c => !msg.takenColors.includes(c)) ?? color);
        } else if (msg.type === "join_success") {
            setMyId(msg.id);
            setError("");
            saveSession({ roomCode, token: msg.token, name, color });
            // URL = /CODE : recharger la page ramène dans la salle
            window.history.replaceState(null, "", `/${roomCode}`);
            if (msg.state === "IN_ROUND") {
                // Revenu en pleine manche : éliminé de celle-ci (règle de déconnexion), il rejoue à la suivante
                setKo({ count: msg.progress, summary: "Reconnecté ! Tu rejoues à la prochaine manche." });
                setGameState("ko");
            } else {
                setGameState("waiting");
            }
        } else if (msg.type === "rejoin_failed") {
            // Place perdue (ex. déconnecté pendant le lobby) : on retente un join normal avec le même pseudo
            saveSession(null);
            if (name.trim()) sendRef.current({ type: "join_room", roomCode, name, color });
        } else if (msg.type === "error") {
            setError(msg.message);
            if (msg.message === "Couleur déjà prise") setRoomInfoTick(t => t + 1); // recharge les couleurs prises
        } else if (msg.type === "player_list_update") {
            setPlayers(msg.players);
        } else if (msg.type === "game_start") {
            setStartMsg(msg);
            setKo(null);
            setGameState("playing");
        } else if (msg.type === "round_end") {
            const mine: RankEntry | undefined = msg.ranking.find((e: RankEntry) => e.id === myId);
            setMyResult(mine ? {
                ...mine, round: msg.round, totalRounds: msg.totalRounds,
                finalRank: msg.final ? 1 + msg.ranking.filter((e: RankEntry) => e.score > mine.score).length : undefined,
            } : null);
            setGameState("ended");
        } else if (msg.type === "lobby") {
            // Nouvelle partie : retour à l'écran d'attente, scores remis à zéro côté serveur
            setMyResult(null);
            setKo(null);
            setGameState("waiting");
        } else if (msg.type === "host_left") {
            saveSession(null);
            rejoinPending.current = false;
            setMyId(null);
            setGameState("waiting");
            setError("L'écran principal s'est déconnecté");
        }
    }, true);
    const joined = myId !== null;
    const me = players.find(p => p.id === myId);
    const myColor = colorOf(me?.color ?? color);

    useEffect(() => { sendRef.current = sendMessage; }, [sendMessage]);

    // Connexion (ou reconnexion) : si on a une place dans cette salle, on la reprend avec le jeton
    useEffect(() => {
        if (!connected) {
            if (joined) rejoinPending.current = true;
            return;
        }
        const session = loadSession();
        if (rejoinPending.current && session?.roomCode === roomCode) {
            rejoinPending.current = false;
            sendMessage({ type: "rejoin", roomCode, token: session.token });
        }
    }, [connected, joined, roomCode, sendMessage]);

    // Dès que le code est complet : vérifie la salle et récupère les couleurs prises
    useEffect(() => {
        if (connected && !joined && roomCode.length === 4) sendMessage({ type: "room_info", roomCode });
    }, [connected, joined, roomCode, sendMessage, roomInfoTick]);

    const react = (reaction: ReactionId) => {
        sendMessage({ type: "reaction", reaction });
        phoneFeedback("reaction"); // la bulle est sur l'écran partagé : le téléphone confirme dans la main
        setReactionCooldown(true);
        setTimeout(() => setReactionCooldown(false), REACTION_COOLDOWN_MS);
    };

    const handleJoin = () => {
        if (!name.trim() || roomCode.length !== 4) return;
        sendMessage({ type: "join_room", roomCode, name, color });
    };

    const game = startMsg ? GAMES[startMsg.game] : undefined;
    const HowTo = (game ?? GAMES[DEFAULT_GAME]).HowTo;

    if (gameState === "playing" && game && me) {
        return (
            <div className="phone-frame" style={{ "--me": myColor } as CSSProperties}>
                <game.Phone
                    key={startMsg.round}
                    start={startMsg}
                    me={{ name: me.name, color: myColor }}
                    send={sendMessage}
                    onEliminated={(count, summary) => {
                        setKo({ count, summary });
                        setGameState("ko");
                    }}
                />
            </div>
        );
    }

    if (gameState === "ko" && ko) {
        const alive = players.filter(p => p.alive).length;
        // Ceux déjà passés devant moi : au mieux, je finis juste derrière eux
        const bestRank = 1 + players.filter(p => p.id !== myId && p.progress > ko.count).length;
        return (
            <div className="phone-screen center-col ko-enter ko-screen">
                <div className="fx fx-ko strong" />
                <Cracks />
                <PhoneAvatar color={myColor} ko size={190} tilt={-12} style={{ height: "clamp(56px, 14dvh, 190px)", width: "auto" }} />
                <h1 className="ko-title">K.O.</h1>
                <p style={{ fontSize: "1.2rem", margin: 0 }}>{ko.summary}</p>
                <div className="stat-cards" style={{ marginTop: 12 }}>
                    <div className="card">
                        <span className="label">Tu as tenu</span>
                        <b style={{ color: "var(--accent)" }}>{ko.count}</b>
                        <span className="muted">input{ko.count > 1 ? "s" : ""}</span>
                    </div>
                    <div className="card">
                        <span className="label">Rang provisoire</span>
                        <b>≥ {bestRank}<sup style={{ fontSize: "0.5em" }}>{bestRank === 1 ? "er" : "e"}</sup></b>
                        <span className="muted">{alive} encore en vie</span>
                    </div>
                </div>
                <div className="card info-card">
                    <Monitor />
                    <span><b>Ne pars pas !</b> La fin se joue sur l'écran principal.</span>
                </div>
                <span className="label" style={{ marginTop: "auto" }}>Réagis depuis les tribunes</span>
                <div className="reaction-row">
                    {(Object.keys(REACTIONS) as ReactionId[]).map(id => (
                        <button key={id} className="btn-pad reaction-btn" disabled={reactionCooldown} onClick={() => react(id)}>
                            {REACTIONS[id]}
                        </button>
                    ))}
                </div>
                <p className="hint ko-hint">Tes réactions s'affichent sur l'écran principal</p>
            </div>
        );
    }

    if (gameState === "ended") {
        return (
            <div className="phone-screen center-col" style={{ justifyContent: "center" }}>
                <span className="label">
                    {myResult?.finalRank ? "Partie terminée — classement final" : `Manche ${myResult?.round ?? "?"} / ${myResult?.totalRounds ?? "?"} terminée`}
                </span>
                <PhoneAvatar color={myColor} size={170} />
                {myResult?.finalRank && (
                    <>
                        <h1 className="display" style={{ fontSize: "5rem", lineHeight: 1 }}>
                            {myResult.finalRank}<sup style={{ fontSize: "0.4em" }}>{myResult.finalRank === 1 ? "er" : "e"}</sup>
                        </h1>
                        <p style={{ fontSize: "1.2rem", margin: 0 }}><b style={{ color: "var(--accent)" }}>{myResult.score} pts</b> au total</p>
                        <p className="muted" style={{ margin: 0 }}>Dernière manche : {myResult.rank}<sup>{myResult.rank === 1 ? "er" : "e"}</sup> · {myResult.progress} inputs</p>
                    </>
                )}
                {myResult && !myResult.finalRank && (
                    <>
                        <h1 className="display" style={{ fontSize: "5rem", lineHeight: 1 }}>
                            {myResult.rank}<sup style={{ fontSize: "0.4em" }}>{myResult.rank === 1 ? "er" : "e"}</sup>
                        </h1>
                        <p style={{ fontSize: "1.2rem", margin: 0 }}>
                            {myResult.progress} inputs · <b style={{ color: "var(--accent)" }}>+{myResult.points} pts</b>
                        </p>
                        <p className="muted" style={{ margin: 0 }}>Total : {myResult.score} pts</p>
                    </>
                )}
                <p className="muted">{myResult?.finalRank ? "Regarde l'écran principal !" : "En attente de la manche suivante…"}</p>
            </div>
        );
    }

    if (joined) {
        return (
            <div className="phone-screen center-col waiting-screen">
                <div className="waiting-head">
                    <PhoneAvatar color={myColor} size={80} />
                    <div>
                        <h1 className="display" style={{ fontSize: "1.6rem", margin: 0 }}>{me?.name ?? name}</h1>
                        <span className="badge" style={{ background: myColor }}>PRÊT</span>
                    </div>
                </div>
                <p className="muted" style={{ margin: 0 }}>Tu es dans la partie ! La manche démarre depuis l'écran principal.</p>
                <HowTo />
                <button className="btn-pad" style={{ padding: "10px 20px" }} aria-pressed={phoneSound}
                    onClick={() => { setPhoneSound(!phoneSound); setPhoneSoundState(!phoneSound); }}>
                    {phoneSound ? "🔊 Son du téléphone : activé" : "🔇 Son du téléphone : coupé"}
                </button>
            </div>
        );
    }

    return (
        <div className="phone-screen">
            <div className="center-col" style={{ marginBottom: 28 }}>
                <PhoneAvatar color={myColor} size={150} />
                <h1 className="logo">LAST PHONE<br /><span>STANDING</span></h1>
            </div>

            <label className="label" htmlFor="code">Code de la salle</label>
            <input id="code" className="code-input" maxLength={4} autoComplete="off" autoCapitalize="characters"
                value={roomCode} placeholder="····"
                onChange={e => { setRoomCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "")); setError(""); setTakenColors([]); }} />

            <label className="label" htmlFor="name">Ton pseudo</label>
            <input id="name" className="text-input" maxLength={16} value={name} onChange={e => setName(e.target.value)} />

            <span className="label">Ta couleur</span>
            <div className="swatches" role="radiogroup" aria-label="Ta couleur">
                {COLOR_IDS.map(id => (
                    <button key={id} role="radio" aria-checked={id === color} aria-label={id}
                        className={`swatch${id === color ? " selected" : ""}`} style={{ background: PLAYER_COLORS[id] }}
                        disabled={takenColors.includes(id)} onClick={() => setColor(id)} />
                ))}
            </div>
            <p className="hint">Grisé = déjà pris par un autre joueur</p>

            {error && <p className="error">{error}</p>}
            {!connected && <p className="hint">Connexion au serveur… (jusqu'à une minute s'il se réveille)</p>}

            <button className="btn-primary" style={{ marginTop: "auto", width: "100%" }} onClick={handleJoin}
                disabled={!connected || !name.trim() || roomCode.length !== 4}>
                REJOINDRE
            </button>
        </div>
    );
}

/** Fissures en fond de l'écran K.O. */
function Cracks() {
    return (
        <svg className="cracks" viewBox="0 0 100 200" preserveAspectRatio="none" aria-hidden>
            <path d="M5 30 23 37 31 62 60 66 77 44 67 31 77 0M60 66 64 82 85 110 100 106M31 62 15 78" fill="none" stroke="#a9a3d1" strokeWidth="0.5" />
        </svg>
    );
}

function Monitor() {
    return (
        <svg viewBox="0 0 24 24" width={36} height={36} fill="none" stroke="#38bdf8" strokeWidth="2" strokeLinecap="round" aria-hidden style={{ flex: "none" }}>
            <rect x="3" y="4" width="18" height="12" rx="2" />
            <path d="M12 16v4M8 20h8" />
        </svg>
    );
}
