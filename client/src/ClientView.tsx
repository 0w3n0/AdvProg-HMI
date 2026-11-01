import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { useWebSocket, type ServerMessage } from "./useWebSocket";
import { GAMES, DEFAULT_GAME, type PlayerInfo } from "./games";
import { PLAYER_COLORS, colorOf, type ColorId, getPhoneSound, phoneFeedback, setPhoneSound, REACTIONS, REACTION_COOLDOWN_MS, type ReactionId } from "./feedback";
import { LangSwitch, PhoneAvatar } from "./components/art";
import { useLang } from "./i18n";

interface ClientViewProps {
    initialRoomCode?: string;
}

interface RankEntry { id: string; name: string; progress: number; rank: number; points: number; score: number }

const COLOR_IDS = Object.keys(PLAYER_COLORS) as ColorId[];

interface Session { roomCode: string; token: string; name: string; color: ColorId }
const SESSION_KEY = "lps-session";
function loadSession(): Session | null {
    try { return JSON.parse(localStorage.getItem(SESSION_KEY) ?? "null"); } catch { return null; }
}
function saveSession(s: Session | null) {
    try { if (s) localStorage.setItem(SESSION_KEY, JSON.stringify(s)); else localStorage.removeItem(SESSION_KEY); } catch (e) { console.warn(e); }
}

export function ClientView({ initialRoomCode = "" }: ClientViewProps) {
    const [saved] = useState(() => { const s = loadSession(); return s && s.roomCode === initialRoomCode ? s : null; });
    const [name, setName] = useState(saved?.name ?? "");
    const [roomCode, setRoomCode] = useState(initialRoomCode);
    const [color, setColor] = useState<ColorId>(saved?.color ?? "yellow");
    const rejoinPending = useRef(saved !== null);
    const sendRef = useRef<(payload: object) => void>(() => {});
    const [takenColors, setTakenColors] = useState<string[]>([]);
    const [roomInfoTick, setRoomInfoTick] = useState(0);
    const [myId, setMyId] = useState<string | null>(null);
    const [players, setPlayers] = useState<PlayerInfo[]>([]);
    const [gameState, setGameState] = useState<"waiting" | "playing" | "ko" | "ended">("waiting");
    const [error, setError] = useState("");
    const [startMsg, setStartMsg] = useState<ServerMessage>(null);
    const [ko, setKo] = useState<{ count: number; summary: ReactNode } | null>(null);
    const [myResult, setMyResult] = useState<(RankEntry & { finalRank?: number; round: number; totalRounds: number }) | null>(null);
    const [phoneSound, setPhoneSoundState] = useState(getPhoneSound);
    const [reactionCooldown, setReactionCooldown] = useState(false);
    const { t } = useLang();

    const { connected, sendMessage } = useWebSocket((msg: ServerMessage) => {
        if (msg.type === "room_info") {
            setTakenColors(msg.takenColors);
            if (msg.takenColors.includes(color)) setColor(COLOR_IDS.find(c => !msg.takenColors.includes(c)) ?? color);
        } else if (msg.type === "join_success") {
            setMyId(msg.id);
            setError("");
            saveSession({ roomCode, token: msg.token, name, color });
            window.history.replaceState(null, "", `/${roomCode}`);
            if (msg.state === "IN_ROUND") {
                setKo({ count: msg.progress, summary: t.reconnected });
                setGameState("ko");
            } else {
                setGameState("waiting");
            }
        } else if (msg.type === "rejoin_failed") {
            saveSession(null);
            if (name.trim()) sendRef.current({ type: "join_room", roomCode, name, color });
        } else if (msg.type === "error") {
            setError(msg.message);
            if (msg.message === "Couleur déjà prise") setRoomInfoTick(n => n + 1);
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

    useEffect(() => {
        if (connected && !joined && roomCode.length === 4) sendMessage({ type: "room_info", roomCode });
    }, [connected, joined, roomCode, sendMessage, roomInfoTick]);

    const react = (reaction: ReactionId) => {
        sendMessage({ type: "reaction", reaction });
        phoneFeedback("reaction");
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
                        <span className="label">{t.youLasted}</span>
                        <b style={{ color: "var(--accent)" }}>{ko.count}</b>
                        <span className="muted">{t.inputs(ko.count)}</span>
                    </div>
                    <div className="card">
                        <span className="label">{t.provisionalRank}</span>
                        <b>≥ {bestRank}<sup style={{ fontSize: "0.5em" }}>{t.ord(bestRank)}</sup></b>
                        <span className="muted">{t.stillAlive(alive)}</span>
                    </div>
                </div>
                <div className="card info-card">
                    <Monitor />
                    <span><b>{t.dontLeave}</b> {t.endOnMain}</span>
                </div>
                <span className="label" style={{ marginTop: "auto" }}>{t.cheer}</span>
                <div className="reaction-row">
                    {REACTIONS.map(id => (
                        <button key={id} className="btn-pad reaction-btn" disabled={reactionCooldown} onClick={() => react(id)}>
                            {t.reactions[id]}
                        </button>
                    ))}
                </div>
                <p className="hint ko-hint">{t.reactionsShown}</p>
            </div>
        );
    }

    if (gameState === "ended") {
        return (
            <div className="phone-screen center-col" style={{ justifyContent: "center" }}>
                <span className="label">
                    {myResult?.finalRank ? t.finalRanking : t.roundDone(myResult?.round ?? "?", myResult?.totalRounds ?? "?")}
                </span>
                <PhoneAvatar color={myColor} size={170} />
                {myResult?.finalRank && (
                    <>
                        <h1 className="display" style={{ fontSize: "5rem", lineHeight: 1 }}>
                            {myResult.finalRank}<sup style={{ fontSize: "0.4em" }}>{t.ord(myResult.finalRank)}</sup>
                        </h1>
                        <p style={{ fontSize: "1.2rem", margin: 0 }}><b style={{ color: "var(--accent)" }}>{myResult.score} pts</b> {t.inTotal}</p>
                        <p className="muted" style={{ margin: 0 }}>{t.lastRound} {myResult.rank}<sup>{t.ord(myResult.rank)}</sup> · {myResult.progress} {t.inputs(myResult.progress)}</p>
                    </>
                )}
                {myResult && !myResult.finalRank && (
                    <>
                        <h1 className="display" style={{ fontSize: "5rem", lineHeight: 1 }}>
                            {myResult.rank}<sup style={{ fontSize: "0.4em" }}>{t.ord(myResult.rank)}</sup>
                        </h1>
                        <p style={{ fontSize: "1.2rem", margin: 0 }}>
                            {myResult.progress} {t.inputs(myResult.progress)} · <b style={{ color: "var(--accent)" }}>+{myResult.points} pts</b>
                        </p>
                        <p className="muted" style={{ margin: 0 }}>{t.total} {myResult.score} pts</p>
                    </>
                )}
                <p className="muted">{myResult?.finalRank ? t.watchMain : t.waitingNext}</p>
            </div>
        );
    }

    if (joined) {
        return (
            <div className="phone-screen center-col waiting-screen">
                <LangSwitch />
                <div className="waiting-head">
                    <PhoneAvatar color={myColor} size={80} />
                    <div>
                        <h1 className="display" style={{ fontSize: "1.6rem", margin: 0 }}>{me?.name ?? name}</h1>
                        <span className="badge" style={{ background: myColor }}>{t.ready}</span>
                    </div>
                </div>
                <p className="muted" style={{ margin: 0 }}>{t.inGame}</p>
                <HowTo />
                <button className="btn-pad" style={{ padding: "10px 20px" }} aria-pressed={phoneSound}
                    onClick={() => { setPhoneSound(!phoneSound); setPhoneSoundState(!phoneSound); }}>
                    {phoneSound ? t.soundOn : t.soundOff}
                </button>
            </div>
        );
    }

    return (
        <div className="phone-screen">
            <LangSwitch />
            <div className="center-col" style={{ marginBottom: 28 }}>
                <PhoneAvatar color={myColor} size={150} />
                <h1 className="logo">LAST PHONE<br /><span>STANDING</span></h1>
            </div>

            <label className="label" htmlFor="code">{t.roomCode}</label>
            <input id="code" className="code-input" maxLength={4} autoComplete="off" autoCapitalize="characters"
                value={roomCode} placeholder="····"
                onChange={e => { setRoomCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "")); setError(""); setTakenColors([]); }} />

            <label className="label" htmlFor="name">{t.nickname}</label>
            <input id="name" className="text-input" maxLength={16} value={name} onChange={e => setName(e.target.value)} />

            <span className="label">{t.yourColor}</span>
            <div className="swatches" role="radiogroup" aria-label={t.yourColor}>
                {COLOR_IDS.map(id => (
                    <button key={id} role="radio" aria-checked={id === color} aria-label={id}
                        className={`swatch${id === color ? " selected" : ""}`} style={{ background: PLAYER_COLORS[id] }}
                        disabled={takenColors.includes(id)} onClick={() => setColor(id)} />
                ))}
            </div>
            <p className="hint">{t.greyed}</p>

            {error && <p className="error">{t.errors[error] ?? error}</p>}
            {!connected && <p className="hint">{t.connecting}</p>}

            <button className="btn-primary" style={{ marginTop: "auto", width: "100%" }} onClick={handleJoin}
                disabled={!connected || !name.trim() || roomCode.length !== 4}>
                {t.join}
            </button>
        </div>
    );
}

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
