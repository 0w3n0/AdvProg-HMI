import { useState } from 'react';
import { HostView } from './hostView';
import { ClientView } from './ClientView';
import { PhoneAvatar } from './components/art';

type ViewState = 'menu' | 'host' | 'client';

function App() {
  // Si l'utilisateur arrive via ip:port/AB12, on détecte le code dans l'URL
  const [initialCode] = useState(() => window.location.pathname.replace('/', '').toUpperCase());
  // On le met directement côté joueur !
  const [view, setView] = useState<ViewState>(initialCode ? 'client' : 'menu');

  if (view === 'host') {
    return <HostView />;
  }

  if (view === 'client') {
    return <ClientView initialRoomCode={initialCode} />;
  }

  return (
    <div className="phone-screen center-col" style={{ justifyContent: 'center', gap: 20 }}>
      <PhoneAvatar color="#ffd43b" size={170} />
      <h1 className="logo" style={{ fontSize: '2.8rem' }}>LAST PHONE<br /><span>STANDING</span></h1>
      <p className="muted" style={{ margin: 0 }}>Le dernier téléphone debout gagne.</p>
      <button className="btn-primary" style={{ width: '100%', marginTop: 24 }} onClick={() => setView('client')}>JE JOUE</button>
      <button className="btn-pad" style={{ width: '100%', padding: 18, fontFamily: 'var(--display)', fontSize: '1.1rem' }} onClick={() => setView('host')}>
        ÉCRAN PARTAGÉ
      </button>
    </div>
  );
}

export default App;