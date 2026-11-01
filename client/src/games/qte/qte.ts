export const SHAPES = ["triangle", "cercle", "carré", "losange"] as const;
export type Shape = typeof SHAPES[number];

export type Qte =
    | { kind: "shape"; shape: Shape; timeMs: number }
    | { kind: "skill"; zoneStart: number; zoneWidth: number; timeMs: number }
    | { kind: "approach"; x: number; y: number; tolerance: number; timeMs: number };

const KINDS = ["shape", "skill", "approach"] as const;

const STAGE_LENGTH = 8;
const MAX_DIFFICULTY_INDEX = 40;

function mulberry32(seed: number) {
    let a = seed;
    return () => {
        a = (a + 0x6d2b79f5) | 0;
        let t = Math.imul(a ^ (a >>> 15), 1 | a);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

export function roundSpeed(round: number, startSpeed = 1) {
    return startSpeed + 0.2 * (round - 1);
}

export function isIntro(index: number) {
    const stage = index / STAGE_LENGTH;
    return Number.isInteger(stage) && stage > 0 && stage < KINDS.length;
}

export function qteAt(seed: number, index: number, speed: number): Qte {
    const rand = mulberry32(seed ^ Math.imul(index + 1, 0x9e3779b1));
    const stage = Math.floor(index / STAGE_LENGTH);
    const kind = stage < KINDS.length ? KINDS[stage] : KINDS[Math.floor(rand() * KINDS.length)];
    const d = Math.min(index / MAX_DIFFICULTY_INDEX, 1);
    const slow = isIntro(index) ? 1.5 : 1;
    const lerp = (easy: number, hard: number) => (easy + (hard - easy) * d) * slow;

    if (kind === "shape") {
        return { kind, shape: SHAPES[Math.floor(rand() * SHAPES.length)], timeMs: lerp(2500, 900) / speed };
    }
    if (kind === "skill") {
        const zoneWidth = lerp(0.22, 0.08);
        return { kind, zoneWidth, zoneStart: 0.3 + rand() * (0.65 - zoneWidth), timeMs: lerp(2200, 1000) / speed };
    }
    return { kind, x: 0.2 + rand() * 0.6, y: 0.2 + rand() * 0.6, tolerance: lerp(0.28, 0.1), timeMs: lerp(1600, 800) / speed };
}

export function failAfterMs(q: Qte) {
    if (q.kind === "skill") return (q.zoneStart + q.zoneWidth) * q.timeMs;
    if (q.kind === "approach") return q.timeMs * (1 + q.tolerance);
    return q.timeMs;
}
