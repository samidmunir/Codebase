import { useEffect } from 'react';
import { useLocation } from 'react-router';
import { usePublicPageMeta } from '../../site/page-meta';
import contents from './guide-contents.html?raw';
import sections from './guide.html?raw';
import './guide.css';

/** The Controller's Handbook: everything Vector does, and how to work each kind of flight. */
export function GuideScreen() {
  usePublicPageMeta('/guide');
  const location = useLocation();

  // Opened at a section (/guide#arrivals): go to it once the page is drawn.
  useEffect(() => {
    if (!location.hash) return;
    document.getElementById(decodeURIComponent(location.hash.slice(1)))?.scrollIntoView();
  }, [location.hash]);

  return (
    <div className="guide">
      <header className="guide__masthead">
        <p className="guide__eyebrow">N90 New York · C90 Chicago · D10 Dallas–Fort Worth</p>
        <h1>Controller’s Handbook</h1>
        <p className="guide__lede">
          Everything Vector does, the rules it enforces, and how to work each kind of flight from
          the moment it shows up on your scope to the moment it lands or leaves.
        </p>
      </header>
      {/* The guide is Vector's own hand-written HTML, from the repo (no user content). */}
      <nav
        className="guide__toc"
        aria-label="Contents"
        dangerouslySetInnerHTML={{ __html: contents }}
      />
      <article className="guide__content" dangerouslySetInnerHTML={{ __html: sections }} />
    </div>
  );
}
