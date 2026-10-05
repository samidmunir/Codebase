import { useMemo } from 'react';
import { renderMarkdown } from './render-markdown';
import './markdown.css';

/** Shows Markdown written on the site, sanitized. `allowHtml={false}` shows raw HTML as text. */
export function Markdown({
  source,
  className,
  allowHtml,
}: {
  source: string;
  className?: string;
  allowHtml?: boolean;
}) {
  const html = useMemo(
    () => renderMarkdown(source, allowHtml === false ? { allowHtml } : {}),
    [source, allowHtml],
  );
  return (
    <div
      className={className ? `markdown ${className}` : 'markdown'}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
