import { useState } from 'react';
import { HostView } from './hostView';
import { ClientView } from './ClientView';
import { LangSwitch, PhoneAvatar } from './components/art';
import { useLang } from './i18n';

type ViewState = 'menu' | 'host' | 'client';

function App() {
  const [initialCode] = useState(() => window.location.pathname.replace('/', '').toUpperCase());
  const [view, setView] = useState<ViewState>(initialCode ? 'client' : 'menu');
  const { t } = useLang();

  if (view === 'host') {
    return <HostView />;
  }

  if (view === 'client') {
    return <ClientView initialRoomCode={initialCode} />;
  }

  return (
    <div className="phone-screen center-col" style={{ justifyContent: 'center', gap: 20 }}>
      <LangSwitch />
      <PhoneAvatar color="#ffd43b" size={170} />
      <h1 className="logo" style={{ fontSize: '2.8rem' }}>LAST PHONE<br /><span>STANDING</span></h1>
      <p className="muted" style={{ margin: 0 }}>{t.tagline}</p>
      <button className="btn-primary" style={{ width: '100%', marginTop: 24 }} onClick={() => setView('client')}>{t.play}</button>
      <button className="btn-pad" style={{ width: '100%', padding: 18, fontFamily: 'var(--display)', fontSize: '1.1rem' }} onClick={() => setView('host')}>
        {t.sharedScreen}
      </button>
    </div>
  );
}

export default App;