const ALLOWED_TAGS = new Set([
  "p", "br", "hr", "strong", "b", "em", "i", "u", "s", "strike", "mark", "sub", "sup",
  "h1", "h2", "h3", "h4", "h5", "h6",
  "ul", "ol", "li", "a", "blockquote",
  "img", "figure", "figcaption", "table", "colgroup", "col", "thead", "tbody", "tfoot", "tr", "th", "td",
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
      const widthMatch = attrs.match(/\swidth\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/i);
      if (widthMatch) {
        const wVal = widthMatch[1].replace(/^['"]|['"]$/g, "").trim();
        if (/^\d+(?:%|px)?$/.test(wVal)) allowedAttrs.push(`width="${wVal}"`);
      }
      const heightMatch = attrs.match(/\sheight\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/i);
      if (heightMatch) {
        const hVal = heightMatch[1].replace(/^['"]|['"]$/g, "").trim();
        if (/^\d+(?:%|px)?$/.test(hVal)) allowedAttrs.push(`height="${hVal}"`);
      }
      allowedAttrs.push('loading="lazy"');
    }

    // Safe inline style for sizing/alignment/colors on rich text elements
    if (["img", "figure", "figcaption", "p", "div", "span", "mark", "table", "colgroup", "col", "th", "td", "h1", "h2", "h3", "h4", "h5", "h6", "blockquote"].includes(tag)) {
      const styleMatch = attrs.match(/\sstyle\s*=\s*("[^"]*"|'[^']*')/i);
      if (styleMatch) {
        const rawStyle = styleMatch[1].replace(/^['"]|['"]$/g, "").trim();
        const safeRules: string[] = [];
        for (const decl of rawStyle.split(";")) {
          const [propRaw, valRaw] = decl.split(":");
          if (!propRaw || !valRaw) continue;
          const prop = propRaw.trim().toLowerCase();
          const val = valRaw.trim();
          if (
            ["width", "min-width", "max-width", "height", "text-align", "margin", "margin-left", "margin-right", "display", "float", "border-radius", "color", "background-color", "font-size"].includes(prop) &&
            /^[a-zA-Z0-9%\s._\-,#()]+$/.test(val) &&
            !/url|expression|javascript/i.test(val)
          ) {
            safeRules.push(`${prop}: ${val}`);
          }
        }
        if (safeRules.length > 0) {
          allowedAttrs.push(`style="${safeRules.join("; ")}"`);
        }
      }
    }

    if (tag === "mark") {
      const dataColor = attrs.match(/\sdata-color\s*=\s*("[^"]*"|'[^']*')/i);
      if (dataColor) {
        const cVal = dataColor[1].replace(/^['"]|['"]$/g, "").trim();
        if (/^[a-zA-Z0-9#(),.\s%-]+$/.test(cVal)) {
          allowedAttrs.push(`data-color="${cVal}"`);
        }
      }
    }

    // colspan, rowspan, colwidth for <th>, <td>
    if (tag === "th" || tag === "td") {
      const colspan = attrs.match(/\scolspan\s*=\s*("[^"]*"|'[^']*'|\d+)/i);
      if (colspan) allowedAttrs.push(`colspan="${colspan[1].replace(/^['"]|['"]$/g, "")}"`);
      const rowspan = attrs.match(/\srowspan\s*=\s*("[^"]*"|'[^']*'|\d+)/i);
      if (rowspan) allowedAttrs.push(`rowspan="${rowspan[1].replace(/^['"]|['"]$/g, "")}"`);
      const colwidth = attrs.match(/\scolwidth\s*=\s*("[^"]*"|'[^']*'|[0-9,]+)/i);
      if (colwidth) {
        const cw = colwidth[1].replace(/^['"]|['"]$/g, "").trim();
        if (/^[0-9,]+$/.test(cw)) allowedAttrs.push(`colwidth="${cw}"`);
      }
    }

    // class attribute if clean (allow Tailwind arbitrary/fraction/slash classes)
    const classMatch = attrs.match(/\sclass\s*=\s*("[^"]*"|'[^']*')/i);
    if (classMatch) {
      const cls = classMatch[1].replace(/^['"]|['"]$/g, "").trim();
      if (/^[a-zA-Z0-9_\-\s/:[\]%]+$/.test(cls)) {
        allowedAttrs.push(`class="${cls}"`);
      }
    }

    if (tag === "img" || tag === "br" || tag === "hr" || tag === "col") {
      return allowedAttrs.length > 0 ? `<${tag} ${allowedAttrs.join(" ")} />` : `<${tag} />`;
    }

    return allowedAttrs.length > 0 ? `<${tag} ${allowedAttrs.join(" ")}>` : `<${tag}>`;
  });

  return cleaned.trim();
}
