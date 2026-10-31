// Génération déterministe de la séquence : même graine + même index => même QTE sur tous les téléphones.

export const SHAPES = ["triangle", "cercle", "carré", "losange"] as const;
export type Shape = typeof SHAPES[number];

export type Qte =
    | { kind: "shape"; shape: Shape; timeMs: number }
    // L'aiguille fait un tour en timeMs ; zone en fraction de tour
    | { kind: "skill"; zoneStart: number; zoneWidth: number; timeMs: number }
    // L'anneau touche le cercle à timeMs ; tolérance en fraction de timeMs
    | { kind: "approach"; x: number; y: number; tolerance: number; timeMs: number };

const KINDS = ["shape", "skill", "approach"] as const;

// Paliers de 8 inputs : formes, puis skill check, puis approach circle, puis tirage aléatoire
const STAGE_LENGTH = 8;
// La difficulté monte jusqu'au 40e input puis plafonne (seule la vitesse de manche continue d'accélérer)
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

/** Vitesse d'une manche : vitesse de départ choisie dans le lobby, +0.2 par manche. */
export function roundSpeed(round: number, startSpeed = 1) {
    return startSpeed + 0.2 * (round - 1);
}

/** Premier input d'un nouveau type (9e, 17e) : annoncé à l'écran et plus facile (×1.5 sur temps, zone et tolérance). */
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
        // La zone commence après 30 % du tour : laisse le temps de la repérer
        return { kind, zoneWidth, zoneStart: 0.3 + rand() * (0.65 - zoneWidth), timeMs: lerp(2200, 1000) / speed };
    }
    return { kind, x: 0.2 + rand() * 0.6, y: 0.2 + rand() * 0.6, tolerance: lerp(0.28, 0.1), timeMs: lerp(1600, 800) / speed };
}

/** Au-delà de ce temps sans bonne réponse, le joueur est K.O. */
export function failAfterMs(q: Qte) {
    if (q.kind === "skill") return (q.zoneStart + q.zoneWidth) * q.timeMs;
    if (q.kind === "approach") return q.timeMs * (1 + q.tolerance);
    return q.timeMs;
}

export function describe(q: Qte) {
    if (q.kind === "shape") return `un ${q.shape}`;
    return q.kind === "skill" ? "un skill check" : "un approach circle";
}
