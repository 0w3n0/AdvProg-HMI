import { useCallback, useEffect, useRef, useState } from "react";
import type { PointerEvent } from "react";
import "./QTEGame.css";

export interface QTEResult {
    inputs: number;
    score: number;
}

interface QTEGameProps {
    playerName: string;
    onEliminated: (result: QTEResult) => void;
}

// Fenêtres de jugement : écart de timing relatif à la durée d'approche.
// Au-delà de la dernière fenêtre, c'est le K.O.
const JUDGEMENTS = [
    { maxGap: 0.06, points: 300, tone: "great" },
    { maxGap: 0.15, points: 100, tone: "good" },
    { maxGap: 0.28, points: 50, tone: "ok" },
] as const;
const MISS_GAP = JUDGEMENTS[JUDGEMENTS.length - 1].maxGap;

// La vitesse augmente un peu à chaque réussite, puis plafonne
const START_DURATION = 1400;
const MIN_DURATION = 700;
const SPEED_UP = 0.96;

const CIRCLE_RADIUS = 48; // px, doit correspondre à .qte__circle dans le CSS
const RING_START_SCALE = 3; // l'anneau part de 3x le rayon du cercle
const HIT_TOLERANCE = 1.1; // marge de 10 % pour les doigts
const FIELD_MARGIN = 12;
const PAUSE_BETWEEN = 250;
const KO_DELAY = 600;

type Phase = "approach" | "feedback" | "ko";

interface Circle {
    x: number;
    y: number;
    number: number;
}

interface Feedback {
    x: number;
    y: number;
    points: number;
    tone: string;
    key: number;
}

export function QTEGame({ playerName, onEliminated }: QTEGameProps) {
    const [stats, setStats] = useState({ hits: 0, score: 0 });
    const [circle, setCircle] = useState<Circle | null>(null);
    const [feedback, setFeedback] = useState<Feedback | null>(null);
    const [phase, setPhase] = useState<Phase>("approach");

    // Les refs portent l'état lu par la boucle d'animation et par le tap,
    // pour juger avec le timing exact sans attendre un re-rendu React.
    const fieldRef = useRef<HTMLDivElement>(null);
    const ringRef = useRef<HTMLDivElement>(null);
    const phaseRef = useRef<Phase>("approach");
    const statsRef = useRef(stats);
    const circleRef = useRef<Circle | null>(null);
    const spawnTimeRef = useRef(0);
    const durationRef = useRef(START_DURATION);
    const timeoutRef = useRef<number | undefined>(undefined);
    const onEliminatedRef = useRef(onEliminated);

    useEffect(() => {
        onEliminatedRef.current = onEliminated;
    }, [onEliminated]);

    const spawnCircle = useCallback(() => {
        const field = fieldRef.current;
        if (!field) return;

        // Position aléatoire, le cercle reste entièrement dans la zone de jeu
        const edge = CIRCLE_RADIUS + FIELD_MARGIN;
        const next: Circle = {
            x: edge + Math.random() * Math.max(0, field.clientWidth - 2 * edge),
            y: edge + Math.random() * Math.max(0, field.clientHeight - 2 * edge),
            number: statsRef.current.hits + 1,
        };
        circleRef.current = next;
        setCircle(next);
        spawnTimeRef.current = performance.now();
        phaseRef.current = "approach";
        setPhase("approach");
    }, []);

    const eliminate = useCallback(() => {
        phaseRef.current = "ko";
        setPhase("ko");
        timeoutRef.current = window.setTimeout(
            () => onEliminatedRef.current({ inputs: statsRef.current.hits, score: statsRef.current.score }),
            KO_DELAY,
        );
    }, []);

    // Premier cercle au montage, nettoyage du timer au démontage
    useEffect(() => {
        spawnCircle();
        return () => window.clearTimeout(timeoutRef.current);
    }, [spawnCircle]);

    // Boucle d'animation : l'anneau se resserre et touche le bord du cercle à t = durée
    useEffect(() => {
        let frame: number;
        const tick = (now: number) => {
            if (phaseRef.current === "approach") {
                const duration = durationRef.current;
                const progress = (now - spawnTimeRef.current) / duration;
                const radius = Math.max(0, CIRCLE_RADIUS * (1 + (RING_START_SCALE - 1) * (1 - progress)));

                if (ringRef.current) {
                    ringRef.current.style.width = `${2 * radius}px`;
                    ringRef.current.style.height = `${2 * radius}px`;
                }
                if (progress > 1 + MISS_GAP) {
                    // Le joueur n'a pas tapé à temps
                    eliminate();
                }
            }
            frame = requestAnimationFrame(tick);
        };
        frame = requestAnimationFrame(tick);
        return () => cancelAnimationFrame(frame);
    }, [eliminate]);

    const handleTap = (e: PointerEvent<HTMLDivElement>) => {
        const current = circleRef.current;
        if (phaseRef.current !== "approach" || !current || !fieldRef.current) return;

        const now = performance.now();
        const rect = fieldRef.current.getBoundingClientRect();
        const distance = Math.hypot(e.clientX - rect.left - current.x, e.clientY - rect.top - current.y);
        if (distance > CIRCLE_RADIUS * HIT_TOLERANCE) {
            // Tap à côté du cercle
            eliminate();
            return;
        }

        const gap = Math.abs((now - spawnTimeRef.current) / durationRef.current - 1);
        const judgement = JUDGEMENTS.find(j => gap <= j.maxGap);
        if (!judgement) {
            // Beaucoup trop tôt
            eliminate();
            return;
        }

        // Le combo (compté avant ce hit) multiplie légèrement les points
        const { hits, score } = statsRef.current;
        const points = Math.round(judgement.points * (1 + hits / 10));
        const nextStats = { hits: hits + 1, score: score + points };
        statsRef.current = nextStats;
        setStats(nextStats);

        durationRef.current = Math.max(MIN_DURATION, durationRef.current * SPEED_UP);
        setFeedback({ x: current.x, y: current.y, points: judgement.points, tone: judgement.tone, key: nextStats.hits });
        phaseRef.current = "feedback";
        setPhase("feedback");
        timeoutRef.current = window.setTimeout(spawnCircle, PAUSE_BETWEEN);
    };

    return (
        <div className="qte">
            <div className="qte__screen">
                <header className="qte__header">
                    <div className="qte__player">
                        <span className="qte__avatar" aria-hidden="true" />
                        <span>{playerName}</span>
                    </div>
                    <div className="qte__stats">
                        <div className="qte__stat">
                            <span className="qte__stat-label">Combo</span>
                            <span className="qte__stat-value">{stats.hits}×</span>
                        </div>
                        <div className="qte__stat">
                            <span className="qte__stat-label">Score</span>
                            <span className="qte__stat-value">{stats.score}</span>
                        </div>
                    </div>
                </header>

                <div className="qte__heading">
                    <h2 className="qte__title">Approach Circle</h2>
                    <p className="qte__subtitle">Tape quand l'anneau touche le bord du cercle</p>
                </div>

                {/* onPointerDown est plus réactif que onClick sur mobile */}
                <div className="qte__field" ref={fieldRef} onPointerDown={handleTap}>
                    {circle && phase !== "feedback" && (
                        <div
                            key={circle.number}
                            className={`qte__circle${phase === "ko" ? " qte__circle--ko" : ""}`}
                            style={{ left: circle.x, top: circle.y }}
                        >
                            {phase === "ko" ? "×" : circle.number}
                        </div>
                    )}
                    {circle && phase === "approach" && (
                        <div
                            key={`ring-${circle.number}`}
                            ref={ringRef}
                            className="qte__ring"
                            style={{
                                left: circle.x,
                                top: circle.y,
                                width: 2 * CIRCLE_RADIUS * RING_START_SCALE,
                                height: 2 * CIRCLE_RADIUS * RING_START_SCALE,
                            }}
                        />
                    )}
                    {feedback && phase === "feedback" && (
                        <div
                            key={feedback.key}
                            className={`qte__feedback qte__feedback--${feedback.tone}`}
                            style={{ left: feedback.x, top: feedback.y }}
                        >
                            {feedback.points}
                        </div>
                    )}
                </div>

                <div className="qte__legend">
                    {JUDGEMENTS.map(j => (
                        <div key={j.points} className="qte__legend-card">
                            <span className={`qte__legend-points qte__legend-points--${j.tone}`}>{j.points}</span>
                            <span className="qte__legend-caption">écart ≤ {Math.round(j.maxGap * 100)} %</span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
