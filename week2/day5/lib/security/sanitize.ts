import sanitizeHtmlLib from "sanitize-html";

export const ALLOWED_TAGS = [
  "p", "h1", "h2", "h3", "h4", "h5", "h6",
  "strong", "b", "em", "i", "u", "s", "strike",
  "ul", "ol", "li",
  "blockquote", "code", "pre", "span", "div",
  "br", "hr",
  "table", "thead", "tbody", "tr", "th", "td",
  "a", "img"
];

export const ALLOWED_ATTRIBUTES: sanitizeHtmlLib.IOptions["allowedAttributes"] = {
  a: ["href", "target", "rel"],
  img: ["src", "alt", "title", "width", "height"],
  "*": ["class", "style"],
};

/**
 * Sanitizes an HTML string to eliminate stored and reflected XSS vectors
 * (e.g. <script>, <img onerror>, javascript: URIs, inline event listeners)
 * while preserving valid rich-text markup formatted by the Tiptap editor.
 *
 * Safe to execute on both the client (browser DOM) and the server (SSR / API / Tests).
 * Uses pure JavaScript string parsing (no jsdom dependency) to prevent Vercel SSR ESM bundler crashes.
 */
export function sanitizeHtml(dirty: string | null | undefined): string {
  if (!dirty || typeof dirty !== "string") {
    return "";
  }

  return sanitizeHtmlLib(dirty, {
    allowedTags: ALLOWED_TAGS,
    allowedAttributes: ALLOWED_ATTRIBUTES,
    allowedSchemes: ["http", "https", "mailto", "tel"],
    disallowedTagsMode: "discard",
  });
}
