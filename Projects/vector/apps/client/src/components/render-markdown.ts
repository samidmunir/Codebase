import DOMPurify from 'dompurify';
import { marked } from 'marked';

// Markdown written on the site (news now, the forum later), rendered to safe HTML:
// marked turns it into HTML, and DOMPurify keeps only harmless markup (no scripts,
// styles, event handlers or javascript: links).

DOMPurify.addHook('afterSanitizeAttributes', (node) => {
  if (node.tagName !== 'A') return;
  const href = node.getAttribute('href') ?? '';
  // Links to other sites open apart and don't pass on ranking.
  if (/^https?:\/\//i.test(href) && !href.startsWith(window.location.origin)) {
    node.setAttribute('target', '_blank');
    node.setAttribute('rel', 'nofollow ugc noopener noreferrer');
  }
});

/** Markdown as sanitized HTML, ready to show. */
export function renderMarkdown(markdown: string): string {
  const html = marked.parse(markdown, { async: false, gfm: true });
  return DOMPurify.sanitize(html, {
    FORBID_TAGS: ['style', 'iframe', 'form', 'input', 'img'],
    FORBID_ATTR: ['style'],
  });
}
