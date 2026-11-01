// Mêmes ids que RoomRegistry.COLORS côté serveur
export const PLAYER_COLORS = {
    red: "#ff5a5f",
    yellow: "#ffd43b",
    purple: "#8b5cf6",
    green: "#2ee6a6",
    blue: "#38bdf8",
    orange: "#ff8a3d",
    pink: "#f472b6",
    lime: "#a3e635",
} as const;

export type ColorId = keyof typeof PLAYER_COLORS;

export function colorOf(id: string | undefined): string {
    return PLAYER_COLORS[id as ColorId] ?? "#a9a3d1";
}
