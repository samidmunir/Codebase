import { useNavigate } from 'react-router';
import { useGameControls } from '../controls/use-game-controls';
import { SettingsView } from './settings/SettingsView';
import './settings/settings-screen.css';

/** The simulator settings page, from the account menu. */
export function SettingsScreen() {
  const navigate = useNavigate();
  useGameControls({ closeMenu: () => void navigate('/play') });
  return (
    <div className="settings-screen">
      <header className="settings-screen__bar">
        <h1>Settings</h1>
      </header>
      <div className="settings-screen__panel">
        <SettingsView />
      </div>
    </div>
  );
}
