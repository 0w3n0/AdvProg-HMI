import { useEffect, useRef, useState, type CSSProperties } from "react";
import { QRCodeSVG } from "qrcode.react";
import { useWebSocket, type ServerMessage } from "./useWebSocket";
import { GAMES, DEFAULT_GAME, type PlayerInfo } from "./games";
import { colorOf, SOUNDS, unlockAudio, REACTIONS, type ReactionId } from "./feedback";
import { Crown, LangSwitch, PhoneAvatar } from "./components/art";
import { useLang } from "./i18n";

interface RankEntry { id: string; name: string; color: string; progress: number; rank: number; points: number; score: number }

const MAX_PLAYERS = 8;
const BUBBLE_MS = 2600;
const SPEEDS = [0.8, 1, 1.2, 1.5];
const MAX_ROUNDS = 10;

interface Bubble { id: string; name: string; color: string; reaction: ReactionId; x: number }

export function HostView() {
    const [roomCode, setRoomCode] = useState<string | null>(null);
    const [players, setPlayers] = useState<PlayerInfo[]>([]);
    const [gameState, setGameState] = useState<"lobby" | "playing" | "ended">("lobby");
    const [startMsg, setStartMsg] = useState<ServerMessage>(null);
    const [roundEnd, setRoundEnd] = useState<{ ranking: RankEntry[]; final: boolean; totalRounds: number } | null>(null);
    const [rounds, setRounds] = useState(3);
    const [speed, setSpeed] = useState(1);
    const [koOrder, setKoOrder] = useState<string[]>([]);
    const [bubbles, setBubbles] = useState<Bubble[]>([]);
    const [copied, setCopied] = useState(false);
    const linkRef = useRef<HTMLSpanElement>(null);
    const { lang, t } = useLang();

    const copyLink = async () => {
        const link = `${window.location.origin}/${roomCode}`;
        try {
            await navigator.clipboard.writeText(link);
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
        } catch {
            const range = document.createRange();
            if (linkRef.current) range.selectNodeContents(linkRef.current);
            window.getSelection()?.removeAllRanges();
            window.getSelection()?.addRange(range);
        }
    };

    const { connected, sendMessage } = useWebSocket((msg: ServerMessage) => {
        if (msg.type === "room_created") setRoomCode(msg.roomCode);
        if (msg.type === "player_list_update") {
            setPlayers(msg.players);
            setKoOrder(prev => [...prev, ...msg.players.filter((p: PlayerInfo) => !p.alive && !prev.includes(p.id)).map((p: PlayerInfo) => p.id)]);
        }
        if (msg.type === "game_start") {
            setStartMsg(msg);
            setKoOrder([]);
            setGameState("playing");
        }
        if (msg.type === "reaction" && REACTIONS.includes(msg.reaction)) {
            const bubble: Bubble = {
                id: `${msg.id}-${performance.now()}`, name: msg.name, color: msg.color,
                reaction: msg.reaction, x: 8 + Math.random() * 84,
            };
            setBubbles(prev => [...prev.slice(-11), bubble]);
            setTimeout(() => setBubbles(prev => prev.filter(b => b !== bubble)), BUBBLE_MS);
            SOUNDS.pop();
        }
        if (msg.type === "round_end") {
            setRoundEnd(msg);
            setGameState("ended");
        }
        if (msg.type === "lobby") {
            setRoundEnd(null);
            setGameState("lobby");
        }
    });

    useEffect(() => {
        if (connected && !roomCode) sendMessage({ type: "create_room" });
    }, [connected, roomCode, sendMessage]);

    const handleStartGame = () => {
        unlockAudio();
        sendMessage({ type: "start_game", roomCode, game: DEFAULT_GAME, rounds, speed });
    };

    if (!roomCode) {
        return (
            <div className="host-screen center-col" style={{ justifyContent: "center" }}>
                <h1 className="host-logo">LAST PHONE<br /><span>STANDING</span></h1>
                <p className="muted">{connected ? t.creatingRoom : t.connectingHost}</p>
            </div>
        );
    }

    const game = startMsg ? GAMES[startMsg.game] : undefined;

    if (gameState === "playing" && game) {
        return (
            <>
                <game.Host start={startMsg} players={players} koOrder={koOrder} />
                <div className="bubbles" aria-hidden>
                    {bubbles.map(b => (
                        <div key={b.id} className="bubble" style={{ left: `${b.x}%`, borderColor: colorOf(b.color) }}>
                            <span style={{ color: colorOf(b.color) }}>{b.name}</span> {t.reactions[b.reaction]}
                        </div>
                    ))}
                </div>
            </>
        );
    }

    if (gameState === "ended" && roundEnd) {
        return (
            <Results round={startMsg?.round} {...roundEnd}
                onNext={handleStartGame} onLobby={() => sendMessage({ type: "back_to_lobby", roomCode })} />
        );
    }

    const directLink = `${window.location.origin}/${roomCode}`;
    const isLocalhost = ["localhost", "127.0.0.1"].includes(window.location.hostname);
    const lobbyGame = GAMES[DEFAULT_GAME];

    return (
        <div className="host-screen">
            <header className="row-between" style={{ alignItems: "flex-start" }}>
                <div>
                    <h1 className="host-logo">LAST PHONE<br /><span>STANDING</span></h1>
                    <div style={{ display: "flex", alignItems: "center", gap: 16, marginTop: 12 }}>
                        <p className="muted" style={{ fontSize: "1.3rem", margin: 0 }}>{t.tagline}</p>
                        <LangSwitch style={{ position: "static" }} />
                    </div>
                </div>
                <div className="join-card">
                    <div>
                        <div className="label">{t.joinAt}</div>
                        <div className="join-link">
                            <span ref={linkRef} className="join-url">{window.location.host}/{roomCode}</span>
                            <button className="copy-btn" onClick={copyLink}>{copied ? t.copied : t.copy}</button>
                        </div>
                        <div className="label">{t.roomCode}</div>
                        <div className="code-tiles">{roomCode.split("").map((c, i) => <span key={i}>{c}</span>)}</div>
                    </div>
                    <div className="qr"><QRCodeSVG value={directLink} size={170} bgColor="#f3f0e8" fgColor="#12112a" /></div>
                </div>
            </header>

            {isLocalhost && (
                <div className="warning">
                    {t.localhostWarn[0]} <b>Network</b> {t.localhostWarn[1]}
                </div>
            )}

            <div className="row-between">
                <h2 className="section-title">{t.players} <span>{players.length} / {MAX_PLAYERS}</span></h2>
                <span className="muted" style={{ fontSize: "1.1rem" }}>{t.pickColor}</span>
            </div>

            <div className="slots">
                {Array.from({ length: MAX_PLAYERS }, (_, i) => {
                    const p = players[i];
                    if (!p) return <div key={i} className="slot empty"><div className="slot-ghost" /><span>{t.waitingSlot}</span></div>;
                    return (
                        <div key={p.id} className="slot">
                            <PhoneAvatar color={colorOf(p.color)} size={130} tilt={i % 2 ? 3 : -3} />
                            <b>{p.name}</b>
                            <span className="badge" style={{ background: colorOf(p.color) }}>{t.ready}</span>
                        </div>
                    );
                })}
            </div>

            <footer className="row-between">
                <span className="muted" style={{ fontSize: "1.1rem" }}>
                    {t.miniGame} <b style={{ color: "var(--text)" }}>{lobbyGame.name}</b> — {lobbyGame.tagline[lang]}
                </span>
                <div className="settings">
                    <div className="setting">
                        <span className="label">{t.rounds}</span>
                        <div className="stepper">
                            <button aria-label={t.fewerRounds} disabled={rounds <= 1} onClick={() => setRounds(r => r - 1)}>−</button>
                            <b>{rounds}</b>
                            <button aria-label={t.moreRounds} disabled={rounds >= MAX_ROUNDS} onClick={() => setRounds(r => r + 1)}>+</button>
                        </div>
                    </div>
                    <div className="setting">
                        <span className="label">{t.startSpeed}</span>
                        <div className="segmented" role="radiogroup" aria-label={t.startSpeed}>
                            {SPEEDS.map(s => (
                                <button key={s} role="radio" aria-checked={s === speed} className={s === speed ? "active" : undefined} onClick={() => setSpeed(s)}>
                                    ×{s.toFixed(1)}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
                <button className="btn-primary" onClick={handleStartGame} disabled={players.length === 0}>{t.startGame}</button>
            </footer>
        </div>
    );
}

const CONFETTI = [
    { left: "23%", top: "8%", c: "#38bdf8", w: 12, h: 12, r: 0 },
    { left: "12%", top: "15%", c: "#ff5a5f", w: 14, h: 26, r: 30 },
    { left: "43%", top: "13%", c: "#ffd43b", w: 14, h: 24, r: -30 },
    { left: "32%", top: "25%", c: "#2ee6a6", w: 10, h: 20, r: -15 },
    { left: "52%", top: "24%", c: "#8b5cf6", w: 16, h: 22, r: 50 },
    { left: "7%", top: "35%", c: "#ff8a3d", w: 12, h: 12, r: 0 },
];

function rankByScore(ranking: RankEntry[]): RankEntry[] {
    const sorted = [...ranking].sort((a, b) => b.score - a.score);
    const out: RankEntry[] = [];
    sorted.forEach((e, i) => out.push({ ...e, rank: i > 0 && sorted[i - 1].score === e.score ? out[i - 1].rank : i + 1 }));
    return out;
}

function Results({ round, ranking: roundRanking, final, totalRounds, onNext, onLobby }: {
    round?: number; ranking: RankEntry[]; final: boolean; totalRounds: number; onNext: () => void; onLobby: () => void;
}) {
    const { t } = useLang();
    const ranking = final ? rankByScore(roundRanking) : roundRanking;
    const winner = ranking[0];
    const metric = (e: RankEntry) => (final ? `${e.score} pts` : `${e.progress} inputs`);
    useEffect(() => {
        const id = setTimeout(SOUNDS.fanfare, 1200);
        return () => clearTimeout(id);
    }, []);
    const groups: RankEntry[][] = [];
    for (const e of ranking) {
        const last = groups.at(-1);
        if (last && last[0].rank === e.rank) last.push(e);
        else groups.push([e]);
    }
    const slots = [{ g: groups[1], cls: "second" }, { g: groups[0], cls: "first" }, { g: groups[2], cls: "third" }];

    return (
        <div className="host-screen results">
            {CONFETTI.map((c, i) => (
                <span key={i} className="confetti" style={{ left: c.left, top: c.top, width: c.w, height: c.h, background: c.c, "--r": `${c.r}deg`, animationDelay: `${i * 0.4}s` } as CSSProperties} />
            ))}
            <div className="results-main">
                <div className="label">{final ? t.gameOver(totalRounds) : t.roundOver(round, totalRounds)}</div>
                {winner && (
                    <h1 className="results-title">
                        <span style={{ color: colorOf(winner.color) }}>{winner.name.toUpperCase()}</span>
                        {final ? <>{t.winsGame[0]}<br />{t.winsGame[1]}</> : <>{t.lastPhone[0]}<br />{t.lastPhone[1]}</>}
                    </h1>
                )}
                <div className="podium">
                    {slots.map(({ g, cls }) => g && (
                        <div key={cls} className={`podium-col ${cls}`}>
                            <div className="podium-avatars">
                                {g.map((e, i) => (
                                    <div key={e.id} style={{ position: "relative" }}>
                                        {cls === "first" && i === 0 && (
                                            <div style={{ position: "absolute", top: -34, left: "50%", transform: "translateX(-50%)" }}><Crown size={56} /></div>
                                        )}
                                        <PhoneAvatar color={colorOf(e.color)} size={cls === "first" ? 170 / g.length + 40 : 110 / g.length + 30} tilt={cls === "second" ? -8 : i % 2 ? 4 : -4} />
                                    </div>
                                ))}
                            </div>
                            <div className="podium-block">
                                <div className="num">{g[0].rank}</div>
                                <b style={{ fontSize: "1.3rem" }}>{g.map(e => e.name).join(" & ")}</b>
                                <div style={{ opacity: 0.8 }}>
                                    {[
                                        g.length > 1 && t.tied,
                                        g.every(e => metric(e) === metric(g[0])) && metric(g[0]),
                                        !final && g[0] === winner && t.lastStandingSmall,
                                    ].filter(Boolean).join(" · ")}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            <aside className="ranking-card">
                <h2 className="section-title">{t.ranking}</h2>
                <p className="muted" style={{ margin: 0 }}>
                    {final ? t.byScore : t.byDistance}
                </p>
                {ranking.map(e => {
                    const tied = ranking.some(o => o !== e && o.rank === e.rank);
                    return (
                        <div key={e.id} className="rank-row">
                            <span className="num">{e.rank}{tied ? "=" : ""}</span>
                            <span className="dot" style={{ background: colorOf(e.color) }} />
                            <span className="grow">{e.name}</span>
                            {final ? (
                                <span className="pts">{e.score} pts</span>
                            ) : (
                                <>
                                    <span className="muted">{e.progress} inputs</span>
                                    <span className="pts">+{e.points}</span>
                                    {(round ?? 1) > 1 && <span className="muted" title={t.totalScore}>= {e.score}</span>}
                                </>
                            )}
                        </div>
                    );
                })}
                {final
                    ? <button className="btn-primary" style={{ marginTop: "auto" }} onClick={onLobby}>{t.backToLobby}</button>
                    : <button className="btn-primary" style={{ marginTop: "auto" }} onClick={onNext}>{t.nextRound}</button>}
            </aside>
        </div>
    );
}
