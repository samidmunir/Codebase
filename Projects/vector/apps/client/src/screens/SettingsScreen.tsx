import { Link, useNavigate } from 'react-router';
import { useGameControls } from '../controls/use-game-controls';
import { SettingsView } from './settings/SettingsView';
import './settings/settings-screen.css';

/** The full-page settings screen, reached from the start screen. */
export function SettingsScreen() {
  const navigate = useNavigate();
  useGameControls({ closeMenu: () => void navigate('/') });
  return (
    <main className="settings-screen">
      <header className="settings-screen__bar">
        <Link to="/" className="settings-screen__back">
          ← Back
        </Link>
        <h1>Settings</h1>
      </header>
      <div className="settings-screen__panel">
        <SettingsView />
      </div>
    </main>
  );
}
