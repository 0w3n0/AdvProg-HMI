// Feedback multimodal : vibrations (téléphone) et sons synthétisés (pas de fichiers audio).

export type PhoneFeedback = "success" | "near" | "ko" | "reaction";

const VIBRATION: Record<PhoneFeedback, number | number[]> = {
    success: 20,          // à peine perceptible : on ne félicite pas chaque input
    near: [30, 40, 30],   // double impulsion : « c'était juste »
    ko: 400,              // long et fort : impossible à rater
    reaction: 15,         // simple accusé de réception du bouton
};

/** @return false si l'appareil ne sait pas vibrer (iOS Safari) : l'appelant affiche un flash à la place. */
export function vibrate(kind: PhoneFeedback): boolean {
    try {
        return navigator.vibrate?.(VIBRATION[kind]) ?? false;
    } catch {
        return false;
    }
}

export function reducedMotion(): boolean {
    return window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
}

// ---------- Son ----------

let ctx: AudioContext | null = null;

/** À appeler dans un geste utilisateur (clic, tap) : les navigateurs bloquent le son avant. */
export function unlockAudio() {
    ctx ??= new AudioContext();
    void ctx.resume();
}

function tone(freq: number, dur: number, { type = "sine" as OscillatorType, gain = 0.2, delay = 0, slideTo = 0 } = {}) {
    if (!ctx) return;
    const t = ctx.currentTime + delay;
    const osc = ctx.createOscillator();
    const amp = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
    amp.gain.setValueAtTime(gain, t);
    amp.gain.exponentialRampToValueAtTime(0.001, t + dur);
    osc.connect(amp).connect(ctx.destination);
    osc.start(t);
    osc.stop(t + dur);
}

export const SOUNDS = {
    // Téléphone (si activé)
    success: () => tone(880, 0.08, { type: "triangle", gain: 0.12 }),
    near: () => { tone(660, 0.07, { type: "square", gain: 0.08 }); tone(660, 0.07, { type: "square", gain: 0.08, delay: 0.1 }); },
    ko: () => tone(300, 0.4, { type: "sawtooth", gain: 0.2, slideTo: 60 }),
    reaction: () => tone(520, 0.06, { type: "triangle", gain: 0.1, slideTo: 780 }),
    // Écran partagé : « pop » discret à chaque bulle de réaction
    pop: () => tone(700 + Math.random() * 300, 0.07, { type: "sine", gain: 0.06 }),
    // Écran partagé
    tick: () => tone(1000, 0.06, { gain: 0.15 }),
    go: () => tone(1500, 0.3, { type: "triangle", gain: 0.2 }),
    bonk: () => { tone(180, 0.35, { type: "square", gain: 0.22, slideTo: 50 }); tone(90, 0.25, { gain: 0.4 }); },
    tension: () => [0, 0.25, 0.5].forEach((d, i) => tone(220 * (1 + i * 0.25), 0.2, { type: "sawtooth", gain: 0.08, delay: d })),
    lastStanding: () => [392, 523, 659].forEach((f, i) => tone(f, 0.25, { type: "square", gain: 0.1, delay: i * 0.12 })),
    fanfare: () => [523, 659, 784, 1047].forEach((f, i) => tone(f, i === 3 ? 0.6 : 0.2, { type: "triangle", gain: 0.18, delay: i * 0.15 })),
};

// ---------- Son du téléphone (désactivé par défaut, choix mémorisé sur l'appareil) ----------

const PHONE_SOUND_KEY = "lps-phone-sound";

export function getPhoneSound(): boolean {
    try {
        return localStorage.getItem(PHONE_SOUND_KEY) === "1";
    } catch {
        return false;
    }
}

export function setPhoneSound(on: boolean) {
    try {
        localStorage.setItem(PHONE_SOUND_KEY, on ? "1" : "0");
    } catch { /* stockage indisponible (navigation privée) : réglage non mémorisé */ }
    if (on) unlockAudio();
}

/** Retour d'un input sur le téléphone. @return true si l'appareil a vibré. */
export function phoneFeedback(kind: PhoneFeedback): boolean {
    if (getPhoneSound()) {
        unlockAudio(); // appelé depuis un tap : débloque le son à chaque chargement de page
        SOUNDS[kind]();
    }
    return vibrate(kind);
}
