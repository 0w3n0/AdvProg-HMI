import { useEffect, useRef, useState, useCallback } from "react";

// En prod (Render) : VITE_WS_URL=wss://<service>.onrender.com. En local : même machine, port 8080.
const WS_URL: string = import.meta.env.VITE_WS_URL ?? `ws://${window.location.hostname}:8080`;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type ServerMessage = any;

/**
 * onMessage est appelé pour CHAQUE message reçu (un état "dernier message"
 * en perdrait quand plusieurs arrivent dans le même rendu).
 * reconnect : se reconnecte aussi après une coupure (téléphones : ils envoient ensuite « rejoin »).
 * Pas l'hôte : sa salle est supprimée dès qu'il se déconnecte.
 */
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
                // Serveur en veille (Render gratuit : ~1 min au réveil) : on réessaie tant que la
                // 1re connexion n'a pas abouti, et après chaque coupure si reconnect.
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
