import { useState, useEffect, useRef } from "react";

interface QTEGameProps {
    onEliminated: (levelReached: number) => void;
}

export function QTEGame({ onEliminated }: QTEGameProps) {
    const [level, setLevel] = useState(1);
    const [targetStart, setTargetStart] = useState(50);
    const [targetWidth, setTargetWidth] = useState(30);
    const [status, setStatus] = useState<"playing" | "eliminated">("playing");
    
    // On utilise des "refs" pour la position du curseur afin d'avoir
    // une précision parfaite au moment du clic (sans attendre le re-rendu React).
    const cursorPosRef = useRef(0);
    const [uiCursor, setUiCursor] = useState(0);

    const requestRef = useRef<number>();
    const startTimeRef = useRef<number>(0);
    const durationRef = useRef(2000);

    // Calcul de la difficulté à chaque changement de niveau
    useEffect(() => {
        // La vitesse augmente (durée plus courte) et la zone rétrécit
        const newDuration = Math.max(600, 2000 - (level - 1) * 150);
        const newWidth = Math.max(10, 30 - (level - 1) * 2);
        
        durationRef.current = newDuration;
        setTargetWidth(newWidth);
        
        // On place la zone cible aléatoirement, sans déborder de la barre
        const maxStart = 100 - newWidth;
        setTargetStart(5 + Math.random() * (maxStart - 10));
        
        startTimeRef.current = performance.now();
    }, [level]);

    // Boucle de jeu (60 FPS) pour faire avancer le curseur
    useEffect(() => {
        const animate = (time: DOMHighResTimeStamp) => {
            if (status !== "playing") return;

            if (startTimeRef.current === 0) {
                startTimeRef.current = time;
            }

            const elapsed = time - startTimeRef.current;
            const progress = (elapsed / durationRef.current) * 100;

            if (progress >= 100) {
                // Le joueur n'a pas cliqué à temps
                cursorPosRef.current = 100;
                setUiCursor(100);
                setStatus("eliminated");
                onEliminated(level);
            } else {
                cursorPosRef.current = progress;
                setUiCursor(progress);
                requestRef.current = requestAnimationFrame(animate);
            }
        };

        if (status === "playing") {
            requestRef.current = requestAnimationFrame(animate);
        }

        return () => {
            if (requestRef.current) cancelAnimationFrame(requestRef.current);
        };
    }, [status, level, onEliminated]);

    // Gestion du Tap (clic ou pression sur l'écran)
    const handleTap = () => {
        if (status !== "playing") return;

        const pos = cursorPosRef.current;
        // On vérifie si le curseur est dans la zone verte
        if (pos >= targetStart && pos <= targetStart + targetWidth) {
            // Succès : on monte d'un niveau !
            setLevel(l => l + 1);
        } else {
            // Échec : on clique trop tôt ou trop tard
            setStatus("eliminated");
            onEliminated(level);
        }
    };

    return (
        <div 
            style={{ 
                width: "100%", height: "100vh", 
                display: "flex", flexDirection: "column", 
                justifyContent: "center", alignItems: "center",
                userSelect: "none", touchAction: "none" // Empêche le zoom/scroll accidentel sur mobile
            }}
            onPointerDown={handleTap} // Plus réactif que onClick sur mobile
        >
            <h2 style={{ fontSize: "2rem", marginBottom: "10px" }}>Niveau {level}</h2>
            <p>Appuie (Tap) quand la ligne rouge est dans la zone verte !</p>

            <div style={{
                width: "90%", maxWidth: "400px", height: "60px",
                backgroundColor: "#555", position: "relative",
                marginTop: "40px", borderRadius: "10px", overflow: "hidden"
            }}>
                {/* Zone Cible (Verte) */}
                <div style={{
                    position: "absolute",
                    left: `${targetStart}%`, width: `${targetWidth}%`, height: "100%",
                    backgroundColor: "#4ade80",
                }} />

                {/* Curseur (Rouge) */}
                <div style={{
                    position: "absolute",
                    left: `${uiCursor}%`, width: "4px", height: "100%",
                    backgroundColor: "#ef4444", transform: "translateX(-50%)"
                }} />
            </div>
        </div>
    );
}
