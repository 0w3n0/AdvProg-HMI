import { useEffect, useRef, useState, useCallback } from "react";

export function useWebSocket(url: string) {
    const wsRef = useRef<WebSocket | null>(null);
    const [connected, setConnected] = useState(false);
    // Le dernier message reçu, parsé en JSON. Chaque vue lira dedans
    // le champ "type" qui l'intéresse.
    const [lastMessage, setLastMessage] = useState<any>(null);

    useEffect(() => {
        const ws = new WebSocket(url);
        wsRef.current = ws;

        ws.onopen = () => setConnected(true);
        ws.onclose = () => setConnected(false);
        ws.onmessage = (event) => {
            setLastMessage(JSON.parse(event.data));
        };

        return () => ws.close();
    }, [url]);

    const sendMessage = useCallback((payload: object) => {
        wsRef.current?.send(JSON.stringify(payload));
    }, []);

    return { connected, lastMessage, sendMessage };
}