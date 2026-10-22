import { useEffect, useRef, useState } from "react";
import { qteAt, failAfterMs, roundSpeed, describe, isIntro, SHAPES, type Qte } from "./qte";
import type { PhoneGameProps } from "../types";
import { ShapeIcon } from "../../components/art";
import { phoneFeedback, type PhoneFeedback } from "../../feedback";

// Même durée que le compte à rebours de l'écran partagé (QTEHost)
export const COUNTDOWN_MS = 3000;
// « Réussite de justesse » : dans les 20 % finaux du temps, ou du bord de la zone
const NEAR = 0.2;

/** Le téléphone juge lui-même le timing (pas d'aller-retour réseau pendant un input). */
export function QTEPhone({ start: startMsg, me, send, onEliminated: onKo }: PhoneGameProps) {
    const seed: number = startMsg.seed;
    const round: number = startMsg.round;
    const onProgress = (count: number) => send({ type: "progress", count });
    const onEliminated = (count: number, missed: Qte) => {
        send({ type: "eliminated", count });
        onKo(count, <>Raté au {count + 1}<sup>{count === 0 ? "er" : "e"}</sup> input — c'était <b>{describe(missed)}</b>.</>);
    };
    const speed = roundSpeed(round);
    const [index, setIndex] = useState(0);
    // Le premier input démarre après le compte à rebours
    const [start, setStart] = useState(() => performance.now() + COUNTDOWN_MS);
    const [now, setNow] = useState(() => performance.now());
    const [fx, setFx] = useState<{ kind: PhoneFeedback; strong: boolean; n: number } | null>(null);
    const doneRef = useRef(false);
    const qte = qteAt(seed, index, speed);
    const elapsed = now - start;

    useEffect(() => {
        let id = requestAnimationFrame(function loop(t) {
            setNow(t);
            id = requestAnimationFrame(loop);
        });
        return () => cancelAnimationFrame(id);
    }, []);

    const finish = (ok: boolean, near = false) => {
        if (doneRef.current || performance.now() < start) return; // taps pendant le compte à rebours ignorés
        if (ok) {
            const kind = near ? "near" : "success";
            // Pas de vibration possible (iOS) => le flash devient plus visible pour compenser
            setFx({ kind, strong: !phoneFeedback(kind), n: index });
            const t = performance.now();
            setIndex(index + 1);
            setStart(t);
            setNow(t);
            onProgress(index + 1);
        } else {
            doneRef.current = true;
            phoneFeedback("ko");
            onEliminated(index, qte);
        }
    };

    useEffect(() => {
        if (elapsed > failAfterMs(qte)) finish(false);
    });

    // Temps mesuré au moment exact du tap, pas au dernier rendu
    const tapElapsed = () => performance.now() - start;
    const next = [1, 2, 3].map(k => qteAt(seed, index + k, speed));

    if (elapsed < 0) {
        return (
            <div className="phone-screen center-col" style={{ justifyContent: "center" }}>
                <span className="label">Manche {round}{speed > 1 && ` · vitesse ×${speed.toFixed(1)}`}</span>
                <div key={Math.ceil(-elapsed / 1000)} className="countdown">{Math.ceil(-elapsed / 1000)}</div>
                <p className="muted">Prépare-toi : regarde ton téléphone, pas l'écran !</p>
            </div>
        );
    }

    return (
        <div className="phone-screen">
            {fx && (
                <div key={fx.n} className={`fx fx-${fx.kind}${fx.strong ? " strong" : ""}`}>
                    {fx.kind === "near" && <span>JUSTE !</span>}
                </div>
            )}
            <div className="phone-header">
                <div className="name-chip">
                    <span className="mini-face" style={{ background: me.color }}><i /><i /></span>
                    {me.name}
                </div>
                <div className="stat"><small className="label">Inputs</small><b>{index}</b></div>
            </div>
            <div className="next-row">
                <span className="label">Ensuite</span>
                {next.map((q, i) => (
                    <span key={i} className="next-tile" style={{ opacity: 1 - i * 0.3 }}><QteIcon qte={q} /></span>
                ))}
            </div>

            {isIntro(index) && <div key={`new-${index}`} className="new-kind">NOUVEAU !</div>}

            {qte.kind === "shape" && (
                <ShapeQte key={index} qte={qte} color={me.color} elapsed={elapsed}
                    onAnswer={s => finish(s === qte.shape, tapElapsed() > (1 - NEAR) * qte.timeMs)} />
            )}
            {qte.kind === "skill" && (
                <SkillQte key={index} qte={qte} color={me.color} elapsed={elapsed} onTap={() => {
                    const f = tapElapsed() / qte.timeMs;
                    const margin = Math.min(f - qte.zoneStart, qte.zoneStart + qte.zoneWidth - f);
                    finish(margin >= 0, margin < NEAR * qte.zoneWidth);
                }} />
            )}
            {qte.kind === "approach" && (
                <ApproachQte key={index} qte={qte} color={me.color} number={index + 1} elapsed={elapsed} onTap={() => {
                    const error = Math.abs(tapElapsed() - qte.timeMs) / qte.timeMs;
                    finish(error <= qte.tolerance, error > (1 - NEAR) * qte.tolerance);
                }} />
            )}
        </div>
    );
}

/** Aperçu « ENSUITE » : indice d'anticipation sur les 3 prochains inputs. */
function QteIcon({ qte }: { qte: Qte }) {
    if (qte.kind === "shape") return <ShapeIcon shape={qte.shape} size={24} />;
    return (
        <svg viewBox="0 0 24 24" width={24} height={24} fill="none" stroke="#f3f0e8" strokeWidth="2.2" strokeLinecap="round" aria-hidden>
            <circle cx="12" cy="12" r="9" />
            {qte.kind === "skill" ? <path d="M12 12V5" /> : <circle cx="12" cy="12" r="4" />}
        </svg>
    );
}

type Props<K extends Qte["kind"]> = { qte: Extract<Qte, { kind: K }>; color: string; elapsed: number };

function ShapeQte({ qte, color, elapsed, onAnswer }: Props<"shape"> & { onAnswer: (s: string) => void }) {
    const C = 2 * Math.PI * 45;
    const left = Math.max(0, 1 - elapsed / qte.timeMs);
    return (
        <>
            <svg viewBox="0 0 100 100" className="qte-visual">
                <circle cx="50" cy="50" r="45" fill="none" stroke="#2e2b5c" strokeWidth="7" />
                {/* Indice d'anticipation : l'anneau rougit et pulse quand le temps presse */}
                <circle cx="50" cy="50" r="45" fill="none" stroke={left < 0.25 ? "#ff5a5f" : color} strokeWidth="7"
                    className={left < 0.25 ? "pulse" : undefined}
                    strokeDasharray={C} strokeDashoffset={-C * (1 - left)} transform="rotate(-90 50 50)" />
                <g transform="translate(25 25)"><ShapeIcon shape={qte.shape} size={50} color={color} filled /></g>
            </svg>
            <h2 className="qte-title">{qte.shape.toUpperCase()}</h2>
            <p className="qte-sub">Appuie sur la bonne forme</p>
            <div className="pad-grid" style={{ marginTop: 24 }}>
                {SHAPES.map(s => (
                    <button key={s} aria-label={s} className="btn-pad" onPointerDown={() => onAnswer(s)}>
                        <ShapeIcon shape={s} size={64} />
                    </button>
                ))}
            </div>
        </>
    );
}

function SkillQte({ qte, color, elapsed, onTap }: Props<"skill"> & { onTap: () => void }) {
    const C = 2 * Math.PI * 80;
    const angle = (360 * elapsed) / qte.timeMs;
    return (
        <>
            <h2 className="qte-title">SKILL CHECK</h2>
            <p className="qte-sub">Tape quand l'aiguille passe dans la zone</p>
            <svg viewBox="0 0 200 200" className="qte-visual">
                <circle cx="100" cy="100" r="80" fill="none" stroke="#2e2b5c" strokeWidth="14" />
                <circle cx="100" cy="100" r="80" fill="none" stroke={color} strokeWidth="14"
                    strokeDasharray={`${qte.zoneWidth * C} ${C}`} strokeDashoffset={-qte.zoneStart * C} transform="rotate(-90 100 100)" />
                <line x1="100" y1="100" x2="100" y2="14" stroke="#ff5a5f" strokeWidth="5" strokeLinecap="round" transform={`rotate(${angle} 100 100)`} />
                <circle cx="100" cy="100" r="9" fill="#ff5a5f" />
            </svg>
            <button className="btn-pad tap-button" onPointerDown={onTap}>TAPE !</button>
        </>
    );
}

function ApproachQte({ qte, color, number, elapsed, onTap }: Props<"approach"> & { number: number; onTap: () => void }) {
    const R = 44;
    const ring = Math.max(0, R * (1 + 2 * (1 - elapsed / qte.timeMs)));
    const at = { position: "absolute" as const, left: `${qte.x * 100}%`, top: `${qte.y * 100}%`, borderRadius: "50%", transform: "translate(-50%, -50%)" };
    return (
        <>
            <h2 className="qte-title">APPROACH CIRCLE</h2>
            <p className="qte-sub">Tape quand l'anneau touche le bord du cercle</p>
            <div className="approach-area" onPointerDown={onTap}>
                <div style={{ ...at, width: 2 * R, height: 2 * R, background: color, border: "6px solid #f3f0e8", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "var(--display)", fontSize: "2rem", color: "#12112a" }}>
                    {number}
                </div>
                <div style={{ ...at, width: 2 * ring, height: 2 * ring, border: `5px solid ${color}` }} />
            </div>
        </>
    );
}
