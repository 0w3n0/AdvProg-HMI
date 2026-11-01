import { useState, useEffect } from "react";
import { useWebSocket } from "./useWebSocket";
import { QTEGame, type QTEResult } from "./QTEGame";

interface ClientViewProps {
    initialRoomCode?: string;
}

export function ClientView({ initialRoomCode = "" }: ClientViewProps) {
    const { connected, lastMessage, sendMessage } = useWebSocket(`ws://${window.location.hostname}:8080`);
    const [name, setName] = useState("");
    const [roomCode, setRoomCode] = useState(initialRoomCode);
    const [joined, setJoined] = useState(false);
    const [gameState, setGameState] = useState<"waiting" | "playing">("waiting");
    const [error, setError] = useState("");
    
    // État local pour gérer l'élimination (Phase 3)
    const [finalResult, setFinalResult] = useState<QTEResult | null>(null);

    useEffect(() => {
        if (!lastMessage) return;

        if (lastMessage.type === "join_success") {
            setJoined(true);
            setError("");
        } else if (lastMessage.type === "error") {
            setError(lastMessage.message);
        } else if (lastMessage.type === "game_start") {
            setGameState("playing");
            setFinalResult(null); // On remet à zéro en cas de nouvelle partie
        }
    }, [lastMessage]);

    const handleJoin = () => {
        if (!name || !roomCode) return;
        sendMessage({
            type: "join_room",
            roomCode: roomCode.toUpperCase(),
            name: name
        });
    };

    if (gameState === "playing") {
        return (
            <div style={{ backgroundColor: "#222", color: "white", minHeight: "100vh" }}>
                {finalResult === null ? (
                    <QTEGame playerName={name} onEliminated={(result) => setFinalResult(result)} />
                ) : (
                    <div style={{ height: "100vh", display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center" }}>
                        <h1 style={{ color: "#ef4444", fontSize: "3rem" }}>Éliminé !</h1>
                        <h2>Tu as tenu {finalResult.inputs} input(s) · score {finalResult.score}</h2>
                        <p style={{ marginTop: "20px", opacity: 0.7 }}>En attente de la fin de la manche...</p>
                    </div>
                )}
            </div>
        );
    }

    if (joined) {
        return (
            <div>
                <h1>Connecté !</h1>
                <p>En attente du lancement de la partie par l'hôte...</p>
            </div>
        );
    }

    return (
        <div>
            <h1>Rejoindre une partie</h1>
            <p>Statut connexion : {connected ? "connecté 🟢" : "déconnecté 🔴"}</p>
            
            <div style={{ marginBottom: '10px' }}>
                <input 
                    placeholder="Code de la partie (ex: AB12)" 
                    value={roomCode}
                    onChange={e => setRoomCode(e.target.value)}
                />
            </div>
            <div style={{ marginBottom: '10px' }}>
                <input 
                    placeholder="Ton pseudo" 
                    value={name}
                    onChange={e => setName(e.target.value)}
                />
            </div>
            {error && <p style={{color: "red"}}>{error}</p>}
            <button onClick={handleJoin} disabled={!connected || !name || !roomCode}>
                Rejoindre
            </button>
        </div>
    );
}
