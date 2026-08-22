import DOMPurify from "isomorphic-dompurify";

/**
 * Sanitize any HTML before it's rendered via dangerouslySetInnerHTML. In
 * practice Ascent renders LLM/user text as plain React text nodes (which React
 * escapes automatically), but this is the belt-and-braces path for any rich
 * text and is used when rendering the (already plain) explanation paragraphs.
 */
export function sanitizeHtml(dirty: string): string {
  return DOMPurify.sanitize(dirty, {
    ALLOWED_TAGS: ["b", "i", "em", "strong", "p", "br", "ul", "ol", "li", "code"],
    ALLOWED_ATTR: [],
  });
}

/** Split trusted-but-model-authored prose into paragraphs for safe text rendering. */
export function toParagraphs(text: string): string[] {
  return text
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean);
}
