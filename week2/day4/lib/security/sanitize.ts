import DOMPurify from "isomorphic-dompurify";

export const ALLOWED_TAGS = [
  "p", "h1", "h2", "h3", "h4", "h5", "h6",
  "strong", "b", "em", "i", "u", "s", "strike",
  "ul", "ol", "li",
  "blockquote", "code", "pre", "span", "div",
  "br", "hr",
  "table", "thead", "tbody", "tr", "th", "td",
  "a", "img"
];

export const ALLOWED_ATTR = [
  "href", "target", "rel",
  "src", "alt", "title", "width", "height",
  "class", "style",
];

/**
 * Sanitizes an HTML string to eliminate stored and reflected XSS vectors
 * (e.g. <script>, <img onerror>, javascript: URIs, inline event listeners)
 * while preserving valid rich-text markup formatted by the Tiptap editor.
 *
 * Safe to execute on both the client (browser DOM) and the server (SSR / API / Tests).
 */
export function sanitizeHtml(dirty: string | null | undefined): string {
  if (!dirty || typeof dirty !== "string") {
    return "";
  }

  return DOMPurify.sanitize(dirty, {
    ALLOWED_TAGS,
    ALLOWED_ATTR,
    ALLOW_DATA_ATTR: true,
    FORBID_TAGS: ["script", "iframe", "object", "embed", "form", "input", "button"],
    FORBID_ATTR: [
      "onerror",
      "onload",
      "onclick",
      "onmouseover",
      "onmouseenter",
      "onmouseleave",
      "onfocus",
      "onblur",
      "onkeydown",
      "onkeypress",
      "onkeyup",
      "onchange",
      "onsubmit",
    ],
  });
}
