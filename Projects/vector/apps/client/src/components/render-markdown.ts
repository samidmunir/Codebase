import DOMPurify from 'dompurify';
import { Marked } from 'marked';

// Markdown written on the site (news and the community), rendered to safe HTML:
// marked turns it into HTML, and DOMPurify keeps only harmless markup (no scripts,
// styles, event handlers or javascript: links). Community posts can't use raw HTML
// at all: it shows as the text that was typed.

DOMPurify.addHook('afterSanitizeAttributes', (node) => {
  if (node.tagName !== 'A') return;
  const href = node.getAttribute('href') ?? '';
  // Links to other sites open apart and don't pass on ranking.
  if (/^https?:\/\//i.test(href) && !href.startsWith(window.location.origin)) {
    node.setAttribute('target', '_blank');
    node.setAttribute('rel', 'nofollow ugc noopener noreferrer');
  }
});

const escapeHtml = (text: string) =>
  text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const withHtml = new Marked({ gfm: true });
const withoutHtml = new Marked({
  gfm: true,
  renderer: { html: ({ text }) => escapeHtml(text) },
});

/** Markdown as sanitized HTML, ready to show. */
export function renderMarkdown(markdown: string, options: { allowHtml?: boolean } = {}): string {
  const parser = options.allowHtml === false ? withoutHtml : withHtml;
  const html = parser.parse(markdown, { async: false });
  return DOMPurify.sanitize(html, {
    FORBID_TAGS: ['style', 'iframe', 'form', 'input', 'img'],
    FORBID_ATTR: ['style'],
  });
}
