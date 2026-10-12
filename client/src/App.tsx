import { useState, useEffect } from 'react';
import { HostView } from './hostView';
import { ClientView } from './ClientView';
import './App.css';

type ViewState = 'menu' | 'host' | 'client';

function App() {
  const [view, setView] = useState<ViewState>('menu');
  const [initialCode, setInitialCode] = useState("");

  useEffect(() => {
    // Si l'utilisateur arrive via ip:port/AB12, on détecte le code dans l'URL
    const path = window.location.pathname.replace('/', '').toUpperCase();
    if (path.length > 0) {
      setInitialCode(path);
      setView('client'); // On le met directement côté joueur !
    }
  }, []);

  if (view === 'host') {
    return <HostView />;
  }

  if (view === 'client') {
    return <ClientView initialRoomCode={initialCode} />;
  }

  return (
    <div>
      <h1>Last Phone Standing</h1>
      <p>Choisissez votre rôle :</p>
      <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
        <button onClick={() => setView('host')}>Écran partagé (Host)</button>
        <button onClick={() => setView('client')}>Téléphone (Joueur)</button>
      </div>
    </div>
  );
}

export default App;