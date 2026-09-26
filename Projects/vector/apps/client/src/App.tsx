import { ApiStatus } from './components/ApiStatus';
import './App.css';

export function App() {
  return (
    <main className="shell">
      <div className="scope-backdrop" aria-hidden="true">
        <div className="scope-backdrop__rings" />
        <div className="scope-backdrop__sweep" />
      </div>

      <section className="hero">
        <p className="hero__eyebrow">N90 · New York TRACON</p>
        <h1 className="hero__title">Vector</h1>
        <p className="hero__subtitle">
          Realistic approach and departure control for JFK, Newark and LaGuardia.
        </p>
        <ApiStatus />
      </section>

      <footer className="shell__footer">Foundation build · v0.0.0</footer>
    </main>
  );
}
