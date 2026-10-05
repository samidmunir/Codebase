import { useMemo } from 'react';
import { renderMarkdown } from './render-markdown';
import './markdown.css';

/** Shows Markdown written on the site, sanitized. */
export function Markdown({ source, className }: { source: string; className?: string }) {
  const html = useMemo(() => renderMarkdown(source), [source]);
  return (
    <div
      className={className ? `markdown ${className}` : 'markdown'}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
