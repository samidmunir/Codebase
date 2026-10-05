import type { ReactNode } from 'react';
import { Link } from 'react-router';
import { usePublicPageMeta } from '../../site/page-meta';
import './legal.css';

// About, Terms and Privacy. The Terms and Privacy text describe what Vector does
// today; have them reviewed before taking payments (see docs/WebAppV2.md).

const UPDATED = '4 October 2026';

function Page({
  title,
  updated,
  children,
}: {
  title: string;
  updated?: string;
  children: ReactNode;
}) {
  return (
    <article className="site-page legal-page">
      <h1>{title}</h1>
      {updated && <p className="legal-updated">Last updated {updated}</p>}
      {children}
    </article>
  );
}

export function AboutScreen() {
  usePublicPageMeta('/about');
  return (
    <Page title="About Vector">
      <p className="legal-lede">
        Vector is an air traffic control simulator for the radar room. You work a real TRACON, its
        approach and departure control and the Center airspace around it, with traffic, weather and
        pilots that behave like the real thing.
      </p>
      <h2>Real data</h2>
      <p>
        Every airspace is built from public US government data: the FAA’s coded instrument
        procedures (CIFP), the National Airspace System Resources (NASR) for frequencies, holds and
        boundaries, minimum vectoring altitude charts, Class B and C airspace, and US Census
        shorelines. Live weather is the current METAR from the Aviation Weather Center. It’s rebuilt
        as the FAA publishes new cycles.
      </p>
      <h2>Played fair</h2>
      <p>
        The simulation is deterministic: the same start and the same instructions always give the
        same session. That’s how every session on the <Link to="/records">records</Link> is
        verified: the server plays it again from the start and checks it ends the same way.
      </p>
      <h2>What it isn’t</h2>
      <p>
        Vector is a game and a learning tool, not certified training and not for real-world
        navigation or air traffic control. The FAA data in it can be out of date or simplified, and
        some procedures are approximated; the <Link to="/guide">Controller’s Handbook</Link> says
        where.
      </p>
    </Page>
  );
}

export function TermsScreen() {
  usePublicPageMeta('/terms');
  return (
    <Page title="Terms of use" updated={UPDATED}>
      <p className="legal-lede">
        These terms cover your use of Vector, the website and the simulator. By creating an account
        or using Vector you agree to them.
      </p>
      <h2>Your account</h2>
      <ul>
        <li>You need to be at least 13 to create an account.</li>
        <li>
          Keep your password to yourself; you’re responsible for what happens on your account.
        </li>
        <li>
          Your handle and display name are public. Don’t choose one that impersonates someone, or
          that’s offensive.
        </li>
        <li>You can delete your account at any time from your Account page.</li>
      </ul>
      <h2>Playing fair</h2>
      <p>
        Don’t tamper with the simulator, its data or the results it sends, try to get round
        verification, or use automated players to climb the records. Results that don’t verify never
        count, and administrators can hide results or disable accounts that break these terms.
      </p>
      <h2>Acceptable use</h2>
      <p>
        Don’t attack, overload or try to get unauthorized access to Vector or other people’s
        accounts, and don’t use Vector to harass anyone.
      </p>
      <h2>Not for real-world use</h2>
      <p>
        Vector is a simulation for entertainment and learning. It isn’t certified training, and its
        data is not for navigation or for controlling real aircraft.
      </p>
      <h2>The service</h2>
      <p>
        Vector is provided as it is, without warranties. Features, airspaces and rules can change,
        and the service can be interrupted. To the extent the law allows, Vector isn’t liable for
        losses from using it, including lost sessions or results.
      </p>
      <h2>Changes</h2>
      <p>
        These terms can change; the date at the top says when they last did. Continuing to use
        Vector after a change means you accept the new terms.
      </p>
    </Page>
  );
}

export function PrivacyScreen() {
  usePublicPageMeta('/privacy');
  return (
    <Page title="Privacy" updated={UPDATED}>
      <p className="legal-lede">
        Vector keeps what it needs to run your account and your career, and nothing for advertising.
        There are no ads, no third-party trackers and no analytics scripts.
      </p>
      <h2>What we store</h2>
      <ul>
        <li>
          <strong>Your account:</strong> email address, handle, display name, and your password as a
          salted scrypt hash (never the password itself).
        </li>
        <li>
          <strong>Your sim:</strong> your settings, the sessions you save, and the results of the
          sessions you play, including the instructions you gave (so they can be verified by
          replaying them).
        </li>
        <li>
          <strong>Signing in:</strong> a sign-in cookie on each device you use (only a hash of it is
          stored), and when each was last used.
        </li>
        <li>
          <strong>Server logs:</strong> requests to the server, including your IP address, kept for
          security and to fix problems. Sign-in limits count attempts per IP address for a minute.
        </li>
        <li>
          <strong>On your device:</strong> your settings and session setup are also kept in your
          browser’s local storage, so they load quickly.
        </li>
      </ul>
      <h2>What’s public</h2>
      <p>
        Your handle and display name. Your profile, career and sessions are public unless you make
        your profile private on your Account page; your verified sessions appear on the records
        unless you turn that off there too. Your email address is never shown to anyone.
      </p>
      <h2>Who sees it</h2>
      <p>
        Vector’s administrators can see account details to run the service and keep it fair, and
        every administrative change is logged (the log keeps the email address an account had at the
        time, even after the account is deleted). We don’t sell or share your data. Live weather
        comes from the Aviation Weather Center through our server, so they never see you.
      </p>
      <h2>Cookies</h2>
      <p>
        One cookie, which keeps you signed in. It can’t be read by scripts and is only sent to
        Vector. Nothing is stored by third parties. The only outside service your browser talks to
        is OpenFreeMap, for map tiles, and only if you turn on the optional real-world map layer in
        the scope.
      </p>
      <h2>Your choices</h2>
      <ul>
        <li>Change your handle, display name, password and privacy on your Account page.</li>
        <li>Sign out your other devices from your Account page.</li>
        <li>
          Delete your account from your Account page: your account, settings, saved sessions and
          results are deleted at once.
        </li>
      </ul>
      <h2>Changes</h2>
      <p>If this policy changes, the date at the top says when.</p>
    </Page>
  );
}
