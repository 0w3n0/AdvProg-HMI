import { useEffect, useRef, useState, type ReactNode } from "react";
import { roundSpeed } from "./qte";
import { COUNTDOWN_MS } from "./QTEPhone";
import type { HostGameProps } from "..";
import { Crown, KoBurst, PhoneAvatar } from "../../components/art";
import { colorOf, SOUNDS, reducedMotion } from "../../feedback";
import { useLang } from "../../i18n";

const SHAKE: Keyframe[] = [
    { transform: "translate(0, 0)" }, { transform: "translate(-14px, 6px)" }, { transform: "translate(12px, -8px)" },
    { transform: "translate(-8px, 4px)" }, { transform: "translate(0, 0)" },
];

export function QTEHost({ start, players, koOrder }: HostGameProps) {
    const round: number = start.round;
    const { t } = useLang();
    const alive = players.filter(p => p.alive);
    const rootRef = useRef<HTMLDivElement>(null);
    const koCount = koOrder.length;
    const aliveCount = alive.length;
    const playerCount = players.length;

    const [t0] = useState(() => performance.now());
    const [now, setNow] = useState(t0);
    const remaining = Math.ceil((COUNTDOWN_MS - (now - t0)) / 1000);
    const counting = remaining >= 0;
    useEffect(() => {
        if (!counting) return;
        const id = setInterval(() => setNow(performance.now()), 100);
        return () => clearInterval(id);
    }, [counting]);
    useEffect(() => {
        if (remaining > 0) SOUNDS.tick();
        else if (remaining === 0) SOUNDS.go();
    }, [remaining]);

    useEffect(() => {
        if (koCount === 0) return;
        SOUNDS.bonk();
        if (!reducedMotion()) rootRef.current?.animate(SHAKE, { duration: 350, easing: "ease-out" });
    }, [koCount]);

    useEffect(() => {
        if (playerCount > 2 && aliveCount === 2) SOUNDS.tension();
        if (playerCount > 1 && aliveCount === 1) SOUNDS.lastStanding();
    }, [aliveCount, playerCount]);
    const best = Math.max(10, ...players.map(p => p.progress));
    const leader = alive.reduce<typeof alive[number] | undefined>((a, p) => (!a || p.progress > a.progress ? p : a), undefined);
    const byId = (id: string | undefined) => players.find(p => p.id === id);
    const lastKo = byId(koOrder.at(-1));
    const spectator = byId(koOrder.at(-2));

    const name = (p: { name: string; color: string }) => <b style={{ color: colorOf(p.color) }}>{p.name}</b>;
    const ticker: ReactNode[] = [];
    if (lastKo) ticker.push(<>{name(lastKo)}{t.koAfter(lastKo.progress)}</>);
    if (leader && leader.progress > 0) ticker.push(<>{name(leader)}{t.leads(leader.progress)}</>);
    if (spectator) ticker.push(<>{name(spectator)}{t.watching}</>);

    return (
        <div className="host-screen" ref={rootRef} style={{ position: "relative" }}>
            {koCount > 0 && <div key={koCount} className="impact-flash" />}
            {counting && (
                <div className="countdown-overlay">
                    <div key={remaining} className="countdown">{remaining > 0 ? remaining : t.go}</div>
                </div>
            )}
            {playerCount > 1 && aliveCount === 1 && (
                <div className="last-banner">
                    <b style={{ color: colorOf(alive[0].color) }}>{alive[0].name}</b> — {t.lastStanding}
                </div>
            )}
            <header className="live-top">
                <div className="logo-small">LAST PHONE <span>STANDING</span></div>
                <div><span className="display muted">{t.round} {round} / {start.totalRounds}</span> <span className="muted">· {t.speed} ×{roundSpeed(round, start.startSpeed).toFixed(1)}</span></div>
                <div className="pill"><i />{alive.length} / {players.length} {t.alive}</div>
            </header>

            <div className="lanes">
                {players.map(p => {
                    const color = p.alive ? colorOf(p.color) : "#4b4878";
                    return (
                        <div key={p.id} className="lane">
                            <div className="lane-avatar">
                                {p.id === leader?.id && p.progress > 0 && (
                                    <div style={{ position: "absolute", top: -34, left: "50%", transform: "translateX(-50%)" }}><Crown size={40} /></div>
                                )}
                                <div className={p.alive ? undefined : "ko-fall"}><PhoneAvatar color={colorOf(p.color)} ko={!p.alive} size={130} tilt={p.alive ? 0 : -10} /></div>
                                {p.id === lastKo?.id && (
                                    <div className="burst-in" style={{ position: "absolute", top: -60, left: -70 }}><KoBurst size={200} /></div>
                                )}
                            </div>
                            <div className="bar" style={{
                                height: `calc((100% - 190px) * ${p.progress / best} + 80px)`,
                                background: color, color: p.alive ? "#12112a" : "#a9a3d1",
                            }}>
                                <b>{p.progress}</b>
                                <small>INPUTS</small>
                            </div>
                        </div>
                    );
                })}
            </div>

            <div className="lane-names">
                {players.map(p => (
                    <div key={p.id} style={{ opacity: p.alive ? 1 : 0.5 }}>
                        <span className="dot" style={{ background: p.alive ? colorOf(p.color) : "#4b4878" }} />{p.name}
                    </div>
                ))}
            </div>

            <footer className="ticker">
                <span className="live-badge">{t.live}</span>
                {ticker.map((item, i) => <span key={i}>{i > 0 && <span className="muted">•&nbsp;&nbsp;</span>}{item}</span>)}
            </footer>
        </div>
    );
}
