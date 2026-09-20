import type { ReactNode } from "react";
import { Link } from "react-router-dom";

import "../styles/auth.css";

interface AuthLayoutProps {
  title: string;
  subtitle: string;
  children: ReactNode;
  footerText: string;
  footerLinkText: string;
  footerLinkTo: string;
}

export function AuthLayout({
  title,
  subtitle,
  children,
  footerText,
  footerLinkText,
  footerLinkTo,
}: AuthLayoutProps) {
  return (
    <main className="auth-page">
      <section className="auth-brand-panel">
        <div className="auth-brand">
          <div className="auth-logo">A</div>

          <span>ATLAS</span>
        </div>

        <div className="auth-brand-content">
          <p className="auth-eyebrow">PERSONAL OPERATING SYSTEM</p>

          <h1>
            Organize your life.
            <br />
            <span>See the bigger picture.</span>
          </h1>

          <p>
            Projects, goals, habits, tasks, and your schedule brought together
            in one intelligent workspace.
          </p>
        </div>

        <div className="auth-brand-footer">
          <span className="auth-status-dot" />
          Your command center for what matters.
        </div>
      </section>

      <section className="auth-form-panel">
        <div className="auth-form-container">
          <header className="auth-form-header">
            <p className="auth-mobile-brand">ATLAS</p>

            <h2>{title}</h2>
            <p>{subtitle}</p>
          </header>

          {children}

          <p className="auth-switch">
            {footerText} <Link to={footerLinkTo}>{footerLinkText}</Link>
          </p>
        </div>
      </section>
    </main>
  );
}
