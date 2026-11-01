import type { CSSProperties } from "react";
import { useLang, type Lang } from "../i18n";

const INK = "#12112a";

export function PhoneAvatar({ color, ko = false, size = 120, tilt = 0, style }: {
    color: string; ko?: boolean; size?: number; tilt?: number; style?: CSSProperties;
}) {
    const frame = ko ? "#4b4878" : color;
    const screen = ko ? "#2a2850" : color;
    return (
        <svg viewBox="0 0 60 90" height={size} aria-hidden
            style={{ transform: `rotate(${tilt}deg)`, flex: "none", overflow: "visible", ...style }}>
            <rect x="4" y="4" width="52" height="82" rx="12" fill={INK} stroke={frame} strokeWidth="5" />
            <rect x="24" y="10" width="12" height="3" rx="1.5" fill={frame} />
            <rect x="11" y="18" width="38" height="60" rx="7" fill={screen} />
            {ko ? (
                <g stroke="#a9a3d1" strokeWidth="2.6" strokeLinecap="round" fill="none">
                    <path d="M20 38l7 7M27 38l-7 7M33 38l7 7M40 38l-7 7" />
                    <path d="M24 58h12" />
                    <path d="M14 26l12 10 -3 12 10 6 -2 12M30 36l14-6" stroke="#f3f0e8" strokeWidth="1" opacity="0.7" />
                </g>
            ) : (
                <g fill={INK}>
                    <ellipse cx="24" cy="42" rx="3" ry="4" />
                    <ellipse cx="36" cy="42" rx="3" ry="4" />
                    <path d="M22 51h16a8 8 0 0 1-16 0z" />
                </g>
            )}
        </svg>
    );
}

export type ShapeName = "triangle" | "cercle" | "carré" | "losange";

export function ShapeIcon({ shape, size = 40, color = "#f3f0e8", filled = false, strokeWidth = 2.2 }: {
    shape: ShapeName; size?: number; color?: string; filled?: boolean; strokeWidth?: number;
}) {
    const paint = filled
        ? { fill: color, stroke: color, strokeWidth: 1.5, strokeLinejoin: "round" as const }
        : { fill: "none", stroke: color, strokeWidth, strokeLinejoin: "round" as const };
    return (
        <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden>
            {shape === "triangle" && <path d="M12 3.5 21.5 20h-19z" {...paint} />}
            {shape === "cercle" && <circle cx="12" cy="12" r="9" {...paint} />}
            {shape === "carré" && <rect x="3.5" y="3.5" width="17" height="17" rx="3" {...paint} />}
            {shape === "losange" && <path d="M12 2.5 21.5 12 12 21.5 2.5 12z" {...paint} />}
        </svg>
    );
}

export function Crown({ size = 40 }: { size?: number }) {
    return (
        <svg viewBox="0 0 40 26" width={size} aria-hidden>
            <path d="M3 23 1 5l10 8 9-12 9 12 10-8-2 18z" fill="#ffd43b" stroke={INK} strokeWidth="2.5" strokeLinejoin="round" />
        </svg>
    );
}

export function KoBurst({ size = 200 }: { size?: number }) {
    const points = Array.from({ length: 24 }, (_, i) => {
        const r = i % 2 ? 26 : 48;
        const a = (Math.PI * 2 * i) / 24;
        return `${50 + r * Math.cos(a)},${50 + r * Math.sin(a)}`;
    }).join(" ");
    return (
        <svg viewBox="0 0 100 100" width={size} aria-hidden style={{ overflow: "visible" }}>
            <polygon points={points} fill={INK} transform="translate(3 4)" />
            <polygon points={points} fill="#ffd43b" />
            <text x="50" y="57" textAnchor="middle" fontFamily="Bungee, sans-serif" fontSize="19" fill={INK} transform="rotate(-12 50 50)">K.O.!</text>
        </svg>
    );
}

export function LangSwitch({ style }: { style?: CSSProperties }) {
    const { lang, setLang } = useLang();
    return (
        <div className="lang-switch" role="group" aria-label="Language" style={style}>
            {(["fr", "en"] as Lang[]).map(l => (
                <button key={l} aria-pressed={l === lang} className={l === lang ? "active" : undefined} onClick={() => setLang(l)}>
                    {l.toUpperCase()}
                </button>
            ))}
        </div>
    );
}
