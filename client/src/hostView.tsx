import { useState, useEffect } from "react";
import { useWebSocket } from "./useWebSocket";

interface PlayerInfo {
    id: string;
    name: string;
}

export function HostView() {
    const { connected, lastMessage, sendMessage } = useWebSocket(`ws://${window.location.hostname}:8080`);
    const [roomCode, setRoomCode] = useState<string | null>(null);
    const [players, setPlayers] = useState<PlayerInfo[]>([]);
    const [gameState, setGameState] = useState<"lobby" | "playing">("lobby");

    useEffect(() => {
        if (!lastMessage) return;

        if (lastMessage.type === "room_created") {
            setRoomCode(lastMessage.roomCode);
        }
        if (lastMessage.type === "player_list_update") {
            setPlayers(lastMessage.players);
        }
        if (lastMessage.type === "game_start") {
            setGameState("playing");
        }
    }, [lastMessage]);

    const handleCreateRoom = () => {
        sendMessage({ type: "create_room" });
    };

    const handleStartGame = () => {
        sendMessage({ type: "start_game", roomCode });
    };

    if (!roomCode) {
        return (
            <div>
                <p>Statut connexion : {connected ? "connecté 🟢" : "déconnecté 🔴"}</p>
                <button onClick={handleCreateRoom} disabled={!connected}>
                    Créer une partie
                </button>
            </div>
        );
    }

    if (gameState === "playing") {
        return (
            <div>
                <h1>🚨 La partie est en cours ! 🚨</h1>
                <h2>{players.length} joueurs en lice</h2>
                <ul style={{ listStyleType: "none", padding: 0 }}>
                    {players.map((p) => (
                        <li key={p.id} style={{ fontSize: "1.5rem" }}>{p.name}</li>
                    ))}
                </ul>
            </div>
        );
    }

    // On génère le lien direct basé sur l'IP actuelle du Host
    const directLink = `http://${window.location.host}/${roomCode}`;

    return (
        <div>
            <h1>Code de la partie : {roomCode}</h1>
            <p>
                Lien direct pour les joueurs : <br />
                <a href={directLink} target="_blank" style={{ fontSize: "1.2rem", color: "#646cff" }}>{directLink}</a>
            </p>
            
            <h2>Joueurs connectés ({players.length})</h2>
            <ul>
                {players.map((p) => (
                    <li key={p.id}>{p.name}</li>
                ))}
            </ul>

            <button 
                onClick={handleStartGame} 
                disabled={players.length === 0}
                style={{ marginTop: '20px', padding: '10px 20px', fontSize: '1.2em' }}
            >
                Démarrer la partie
            </button>
        </div>
    );
}