import { useEffect, useRef, useState, type CSSProperties } from "react";
import { QRCodeSVG } from "qrcode.react";
import { useWebSocket, type ServerMessage } from "./useWebSocket";
import { GAMES, DEFAULT_GAME } from "./games";
import type { PlayerInfo } from "./games/types";
import { colorOf } from "./colors";
import { Crown, PhoneAvatar } from "./components/art";
import { SOUNDS, unlockAudio } from "./feedback";
import { REACTIONS, type ReactionId } from "./reactions";

interface RankEntry { id: string; name: string; color: string; progress: number; rank: number; points: number; score: number }

const MAX_PLAYERS = 8; // = RoomRegistry.MAX_PLAYERS
const BUBBLE_MS = 2600; // = durée de l'animation .bubble

interface Bubble { id: string; name: string; color: string; text: string; x: number }

export function HostView() {
    const [roomCode, setRoomCode] = useState<string | null>(null);
    const [players, setPlayers] = useState<PlayerInfo[]>([]);
    const [gameState, setGameState] = useState<"lobby" | "playing" | "ended">("lobby");
    const [startMsg, setStartMsg] = useState<ServerMessage>(null);
    const [ranking, setRanking] = useState<RankEntry[]>([]);
    const [koOrder, setKoOrder] = useState<string[]>([]);
    const [bubbles, setBubbles] = useState<Bubble[]>([]);
    const [copied, setCopied] = useState(false);
    const linkRef = useRef<HTMLSpanElement>(null);

    const copyLink = async () => {
        const link = `${window.location.origin}/${roomCode}`;
        try {
            // L'API presse-papiers n'existe qu'en https (Render) ou sur localhost
            await navigator.clipboard.writeText(link);
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
        } catch {
            // En http sur le réseau local : on sélectionne le lien, Ctrl+C suffit
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
            // L'ordre des K.O. alimente l'étoile « K.O.! » et le bandeau EN DIRECT
            setKoOrder(prev => [...prev, ...msg.players.filter((p: PlayerInfo) => !p.alive && !prev.includes(p.id)).map((p: PlayerInfo) => p.id)]);
        }
        if (msg.type === "game_start") {
            setStartMsg(msg);
            setKoOrder([]);
            setGameState("playing");
        }
        if (msg.type === "reaction") {
            const bubble: Bubble = {
                id: `${msg.id}-${performance.now()}`, name: msg.name, color: msg.color,
                text: REACTIONS[msg.reaction as ReactionId], x: 8 + Math.random() * 84,
            };
            // Au plus 12 bulles à l'écran : l'ambiance sans masquer la partie
            setBubbles(prev => [...prev.slice(-11), bubble]);
            setTimeout(() => setBubbles(prev => prev.filter(b => b !== bubble)), BUBBLE_MS);
            SOUNDS.pop();
        }
        if (msg.type === "round_end") {
            setRanking(msg.ranking);
            setGameState("ended");
        }
    });

    // Pas d'écran intermédiaire : la salle est créée dès que le serveur répond
    useEffect(() => {
        if (connected && !roomCode) sendMessage({ type: "create_room" });
    }, [connected, roomCode, sendMessage]);

    const handleStartGame = () => {
        unlockAudio(); // ce clic est le geste qui autorise le son sur l'écran partagé
        sendMessage({ type: "start_game", roomCode, game: DEFAULT_GAME });
    };

    if (!roomCode) {
        return (
            <div className="host-screen center-col" style={{ justifyContent: "center" }}>
                <h1 className="host-logo">LAST PHONE<br /><span>STANDING</span></h1>
                <p className="muted">{connected ? "Création de la salle…" : "Connexion au serveur… (au premier lancement, le serveur peut mettre une minute à se réveiller)"}</p>
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
                            <span style={{ color: colorOf(b.color) }}>{b.name}</span> {b.text}
                        </div>
                    ))}
                </div>
            </>
        );
    }

    if (gameState === "ended") {
        return <Results round={startMsg?.round} ranking={ranking} onNext={handleStartGame} />;
    }

    // Lien direct basé sur l'adresse actuelle du Host (http en local, https sur Render)
    const directLink = `${window.location.origin}/${roomCode}`;
    const isLocalhost = ["localhost", "127.0.0.1"].includes(window.location.hostname);
    const lobbyGame = GAMES[DEFAULT_GAME];

    return (
        <div className="host-screen">
            <header className="row-between" style={{ alignItems: "flex-start" }}>
                <div>
                    <h1 className="host-logo">LAST PHONE<br /><span>STANDING</span></h1>
                    <p className="muted" style={{ fontSize: "1.3rem", margin: "12px 0 0" }}>Le dernier téléphone debout gagne.</p>
                </div>
                <div className="join-card">
                    <div>
                        <div className="label">Rejoins sur</div>
                        <div className="join-link">
                            <span ref={linkRef} className="join-url">{window.location.host}/{roomCode}</span>
                            <button className="copy-btn" onClick={copyLink}>{copied ? "COPIÉ !" : "COPIER"}</button>
                        </div>
                        <div className="label">Code de la salle</div>
                        <div className="code-tiles">{roomCode.split("").map((c, i) => <span key={i}>{c}</span>)}</div>
                    </div>
                    <div className="qr"><QRCodeSVG value={directLink} size={170} bgColor="#f3f0e8" fgColor="#12112a" /></div>
                </div>
            </header>

            {isLocalhost && (
                <div className="warning">
                    Les téléphones ne peuvent pas joindre « localhost » : ouvre cette page via l'adresse <b>Network</b> affichée par Vite.
                </div>
            )}

            <div className="row-between">
                <h2 className="section-title">JOUEURS <span>{players.length} / {MAX_PLAYERS}</span></h2>
                <span className="muted" style={{ fontSize: "1.1rem" }}>Choisis ta couleur sur ton téléphone</span>
            </div>

            <div className="slots">
                {Array.from({ length: MAX_PLAYERS }, (_, i) => {
                    const p = players[i];
                    if (!p) return <div key={i} className="slot empty"><div className="slot-ghost" /><span>En attente…</span></div>;
                    return (
                        <div key={p.id} className="slot">
                            <PhoneAvatar color={colorOf(p.color)} size={130} tilt={i % 2 ? 3 : -3} />
                            <b>{p.name}</b>
                            <span className="badge" style={{ background: colorOf(p.color) }}>PRÊT</span>
                        </div>
                    );
                })}
            </div>

            <footer className="row-between">
                <span className="muted" style={{ fontSize: "1.1rem" }}>
                    Mini-jeu : <b style={{ color: "var(--text)" }}>{lobbyGame.name}</b> — {lobbyGame.tagline}
                </span>
                <button className="btn-primary" onClick={handleStartGame} disabled={players.length === 0}>LANCER LA PARTIE</button>
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

/** Fin de manche (maquette page 3) : podium + classement complet. */
function Results({ round, ranking, onNext }: { round?: number; ranking: RankEntry[]; onNext: () => void }) {
    const winner = ranking[0];
    // Fanfare au moment où le 1er monte sur le podium (délai = animation .podium-col.first)
    useEffect(() => {
        const id = setTimeout(SOUNDS.fanfare, 1200);
        return () => clearTimeout(id);
    }, []);
    // Groupes d'ex æquo, dans l'ordre des rangs : [1ers, 2es, 3es…]
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
                <div className="label">Manche {round} — terminée</div>
                {winner && (
                    <h1 className="results-title">
                        <span style={{ color: colorOf(winner.color) }}>{winner.name.toUpperCase()}</span> EST LE DERNIER<br />TÉLÉPHONE DEBOUT
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
                                        g.length > 1 && "ex æquo",
                                        // Le dernier debout peut partager la 1re place avec plus d'inputs que lui
                                        g.every(e => e.progress === g[0].progress) && `${g[0].progress} inputs`,
                                        g[0] === winner && "dernier debout",
                                    ].filter(Boolean).join(" · ")}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            <aside className="ranking-card">
                <h2 className="section-title">CLASSEMENT</h2>
                <p className="muted" style={{ margin: 0 }}>Classé selon la distance parcourue, pas l'ordre d'élimination.</p>
                {ranking.map(e => {
                    const tied = ranking.some(o => o !== e && o.rank === e.rank);
                    return (
                        <div key={e.id} className="rank-row">
                            <span className="num">{e.rank}{tied ? "=" : ""}</span>
                            <span className="dot" style={{ background: colorOf(e.color) }} />
                            <span className="grow">{e.name}</span>
                            <span className="muted">{e.progress} inputs</span>
                            <span className="pts">+{e.points}</span>
                            {(round ?? 1) > 1 && <span className="muted" title="Score cumulé">= {e.score}</span>}
                        </div>
                    );
                })}
                <button className="btn-primary" style={{ marginTop: "auto" }} onClick={onNext}>MANCHE SUIVANTE</button>
            </aside>
        </div>
    );
}
