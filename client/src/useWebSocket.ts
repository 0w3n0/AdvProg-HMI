import { useEffect, useRef, useState, useCallback } from "react";

const WS_URL: string = import.meta.env.VITE_WS_URL ?? `ws://${window.location.hostname}:8080`;

export type ServerMessage = any;

export function useWebSocket(onMessage: (msg: ServerMessage) => void, reconnect = false) {
    const wsRef = useRef<WebSocket | null>(null);
    const handlerRef = useRef(onMessage);
    const [connected, setConnected] = useState(false);

    useEffect(() => {
        handlerRef.current = onMessage;
    });

    useEffect(() => {
        let unmounted = false;
        let opened = false;
        let retry: number | undefined;
        let ws: WebSocket;

        const connect = () => {
            ws = new WebSocket(WS_URL);
            wsRef.current = ws;
            ws.onopen = () => {
                opened = true;
                setConnected(true);
            };
            ws.onclose = () => {
                setConnected(false);
                if (!unmounted && (!opened || reconnect)) retry = window.setTimeout(connect, 2000);
            };
            ws.onmessage = (event) => handlerRef.current(JSON.parse(event.data));
        };
        connect();

        return () => {
            unmounted = true;
            clearTimeout(retry);
            ws.close();
        };
    }, [reconnect]);

    const sendMessage = useCallback((payload: object) => {
        if (wsRef.current?.readyState === WebSocket.OPEN) {
            wsRef.current.send(JSON.stringify(payload));
        }
    }, []);

    return { connected, sendMessage };
}
