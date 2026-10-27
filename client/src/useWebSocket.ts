import { useEffect, useRef, useState, useCallback } from "react";

// En prod (Render) : VITE_WS_URL=wss://<service>.onrender.com. En local : même machine, port 8080.
const WS_URL: string = import.meta.env.VITE_WS_URL ?? `ws://${window.location.hostname}:8080`;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type ServerMessage = any;

/**
 * onMessage est appelé pour CHAQUE message reçu (un état "dernier message"
 * en perdrait quand plusieurs arrivent dans le même rendu).
 */
export function useWebSocket(onMessage: (msg: ServerMessage) => void) {
    const wsRef = useRef<WebSocket | null>(null);
    const handlerRef = useRef(onMessage);
    const [connected, setConnected] = useState(false);

    useEffect(() => {
        handlerRef.current = onMessage;
    });

    useEffect(() => {
        const ws = new WebSocket(WS_URL);
        wsRef.current = ws;

        ws.onopen = () => setConnected(true);
        ws.onclose = () => setConnected(false);
        ws.onmessage = (event) => handlerRef.current(JSON.parse(event.data));

        return () => ws.close();
    }, []);

    const sendMessage = useCallback((payload: object) => {
        if (wsRef.current?.readyState === WebSocket.OPEN) {
            wsRef.current.send(JSON.stringify(payload));
        }
    }, []);

    return { connected, sendMessage };
}
