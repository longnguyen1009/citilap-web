const ALLOWED_TAGS = new Set(["p", "br", "strong", "b", "em", "i", "u", "h2", "h3", "h4", "ul", "ol", "li", "a", "blockquote"]);

export function sanitizeHtml(input: string): string {
  return input
    .replace(/<\/?\s*(script|style|iframe|object|embed|form|svg|math)[^>]*>/gi, "")
    .replace(/\son[a-z]+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, "")
    .replace(/\s+(?:href|src)\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, (match, value: string) => {
      const url = value.replace(/^['"]|['"]$/g, "").trim();
      return /^(?:https?:|mailto:|tel:|\/)/i.test(url) ? match : "";
    })
    .replace(/<\/?([a-z0-9]+)([^>]*)>/gi, (full, tag: string, attrs: string) => {
      const name = tag.toLowerCase();
      if (!ALLOWED_TAGS.has(name)) return "";
      if (full.startsWith("</")) return `</${name}>`;
      if (name !== "a") return `<${name}>`;
      const href = attrs.match(/\shref\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/i)?.[0] || "";
      return `<a${href}>`;
    });
}
