// backend/src/utils/sanitize.js
//
// Server-side HTML sanitization for TipTap editor output. Every post's
// `content` field MUST be passed through sanitizeHtml() in the
// controller layer before it is persisted to MongoDB (TRD 5.3) — never
// trust HTML coming from the client, even from an authenticated admin
// session, since a compromised admin browser/extension is still a
// Stored XSS vector.

import DOMPurify from 'isomorphic-dompurify';

// Block dangerous URI schemes outright. Anything not matching this
// pattern (http/https/mailto, or a root-relative/relative path) is
// stripped by DOMPurify rather than passed through. This neutralizes
// javascript: and data: URIs in href/src attributes.
const ALLOWED_URI_REGEXP =
  /^(?:(?:https?|mailto):|[^a-z]|[a-z+.\-]+(?:[^a-z+.\-:]|$))/i;

// Tags the TipTap editor is allowed to emit. Anything outside this list
// (script, iframe, object, embed, form, style, link, meta, etc.) is
// stripped entirely, including its content where applicable.
const ALLOWED_TAGS = [
  'p',
  'br',
  'hr',
  'strong',
  'em',
  'u',
  's',
  'mark',
  'blockquote',
  'h1',
  'h2',
  'h3',
  'h4',
  'ul',
  'ol',
  'li',
  'a',
  'img',
  'video',
  'source',
  'figure',
  'figcaption',
  'code',
  'pre',
  'span',
  'table',
  'thead',
  'tbody',
  'tr',
  'th',
  'td',
];

// Attributes the TipTap editor's extensions legitimately need (links,
// images, the custom video node, alignment/typography spans). Notably
// absent: any "on*" event handler attribute (onerror, onload, onclick,
// etc.) — those are never allowlisted, so DOMPurify strips them
// unconditionally regardless of this list.
const ALLOWED_ATTR = [
  'href',
  'target',
  'rel',
  'src',
  'alt',
  'title',
  'width',
  'height',
  'controls',
  'poster',
  'loading',
  'class',
  'colspan',
  'rowspan',
];

const SANITIZE_CONFIG = {
  ALLOWED_TAGS,
  ALLOWED_ATTR,
  ALLOWED_URI_REGEXP,
  // Strip tags not in the allowlist but keep their safe inline text
  // content (e.g. a stray <span> wrapper around real copy survives as
  // plain text rather than vanishing along with the paragraph).
  KEEP_CONTENT: true,
  // Belt-and-suspenders: explicitly forbid the most common XSS vectors
  // even though they're already excluded from ALLOWED_TAGS/ALLOWED_ATTR.
  FORBID_TAGS: ['script', 'style', 'iframe', 'object', 'embed', 'form', 'link', 'meta'],
  FORBID_ATTR: ['onerror', 'onload', 'onclick', 'onmouseover', 'onfocus', 'style'],
};

/**
 * Sanitizes a raw HTML string produced by the TipTap editor.
 * Returns an empty string for non-string input rather than throwing,
 * since callers should never persist unsanitized content regardless.
 *
 * @param {string} html - Raw HTML from the client (req.body.content)
 * @returns {string} Sanitized HTML safe to store and render
 */
export function sanitizeHtml(html) {
  if (typeof html !== 'string' || html.length === 0) return '';

  return DOMPurify.sanitize(html, SANITIZE_CONFIG);
}

export default sanitizeHtml;
