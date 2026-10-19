const ALLOWED_TAGS = new Set([
  "p", "br", "hr", "strong", "b", "em", "i", "u", "s", "strike",
  "h1", "h2", "h3", "h4", "h5", "h6",
  "ul", "ol", "li", "a", "blockquote",
  "img", "table", "thead", "tbody", "tfoot", "tr", "th", "td",
  "span", "div", "pre", "code", "details", "summary"
]);

/**
 * Robust HTML sanitizer for CMS product descriptions and articles.
 * - Strips dangerous scripts, iframes, objects, forms, and event handlers.
 * - Retains safe formatting tags, headings, lists, tables, links, and media library images.
 * - Preserves table column/row spans and alt descriptions.
 */
export function sanitizeHtml(input: string): string {
  if (!input || typeof input !== "string") return "";

  // 1. Strip active dangerous tags
  let cleaned = input.replace(/<\/?\s*(script|style|iframe|object|embed|form|svg|math|base|meta|link)[^>]*>/gi, "");

  // 2. Strip event handler attributes (e.g. onload, onclick, onerror)
  cleaned = cleaned.replace(/\s+on[a-z0-9_-]+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, "");

  // 3. Strip javascript: / vbscript: / data: pseudo-protocols in href/src
  cleaned = cleaned.replace(/\s+(href|src)\s*=\s*(['"])\s*(?:javascript|vbscript|data):[\s\S]*?\2/gi, "");

  // 4. Validate tags and keep allowable attributes
  cleaned = cleaned.replace(/<(\/)?([a-z0-9_-]+)([^>]*)>/gi, (match, isClosing, tagName: string, attrs: string) => {
    const tag = tagName.toLowerCase();
    if (!ALLOWED_TAGS.has(tag)) {
      // Disallowed tag: return empty string (stripping the tag but preserving inner text)
      return "";
    }

    if (isClosing) {
      return `</${tag}>`;
    }

    // Extract safe attributes based on tag
    const allowedAttrs: string[] = [];

    // href for <a>
    if (tag === "a") {
      const hrefMatch = attrs.match(/\shref\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/i);
      if (hrefMatch) {
        const val = hrefMatch[1].replace(/^['"]|['"]$/g, "").trim();
        if (/^(?:https?:|mailto:|tel:|\/|#)/i.test(val)) {
          allowedAttrs.push(`href="${val.replace(/"/g, '&quot;')}"`);
          allowedAttrs.push('rel="noopener noreferrer"');
          allowedAttrs.push('target="_blank"');
        }
      }
    }

    // src, alt, width, height for <img>
    if (tag === "img") {
      const srcMatch = attrs.match(/\ssrc\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/i);
      if (srcMatch) {
        const val = srcMatch[1].replace(/^['"]|['"]$/g, "").trim();
        if (/^(?:https?:|\/)/i.test(val)) {
          allowedAttrs.push(`src="${val.replace(/"/g, '&quot;')}"`);
        }
      }
      const altMatch = attrs.match(/\salt\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/i);
      if (altMatch) {
        const alt = altMatch[1].replace(/^['"]|['"]$/g, "").trim();
        allowedAttrs.push(`alt="${alt.replace(/"/g, '&quot;')}"`);
      }
      const titleMatch = attrs.match(/\stitle\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/i);
      if (titleMatch) {
        const title = titleMatch[1].replace(/^['"]|['"]$/g, "").trim();
        allowedAttrs.push(`title="${title.replace(/"/g, '&quot;')}"`);
      }
      allowedAttrs.push('loading="lazy"');
    }

    // colspan, rowspan for <th>, <td>
    if (tag === "th" || tag === "td") {
      const colspan = attrs.match(/\scolspan\s*=\s*("[^"]*"|'[^']*'|\d+)/i);
      if (colspan) allowedAttrs.push(`colspan="${colspan[1].replace(/^['"]|['"]$/g, "")}"`);
      const rowspan = attrs.match(/\srowspan\s*=\s*("[^"]*"|'[^']*'|\d+)/i);
      if (rowspan) allowedAttrs.push(`rowspan="${rowspan[1].replace(/^['"]|['"]$/g, "")}"`);
    }

    // class attribute if clean
    const classMatch = attrs.match(/\sclass\s*=\s*("[^"]*"|'[^']*')/i);
    if (classMatch) {
      const cls = classMatch[1].replace(/^['"]|['"]$/g, "").trim();
      if (/^[a-zA-Z0-9_\-\s]+$/.test(cls)) {
        allowedAttrs.push(`class="${cls}"`);
      }
    }

    if (tag === "img" || tag === "br" || tag === "hr") {
      return allowedAttrs.length > 0 ? `<${tag} ${allowedAttrs.join(" ")} />` : `<${tag} />`;
    }

    return allowedAttrs.length > 0 ? `<${tag} ${allowedAttrs.join(" ")}>` : `<${tag}>`;
  });

  return cleaned.trim();
}
