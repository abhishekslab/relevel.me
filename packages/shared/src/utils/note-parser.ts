/**
 * Note Parser Utility
 *
 * Parses markdown content to extract:
 * - Wiki-style [[links]]
 * - #tags
 * - Metadata
 * - Backlinks
 */

export interface WikiLink {
  /** The target note title referenced in the link */
  target: string;
  /** Optional alias for display (from [[target|alias]]) */
  alias?: string;
  /** Position in the markdown text */
  position: { start: number; end: number };
  /** Original match text */
  raw: string;
}

export interface ParsedNote {
  /** Extracted wiki links */
  wikiLinks: WikiLink[];
  /** Extracted hashtags */
  tags: string[];
  /** Markdown content with wiki links converted to HTML */
  htmlContent?: string;
  /** Plain text content (stripped of markdown) */
  plainText: string;
}

/**
 * Regular expressions for parsing
 */
const WIKI_LINK_REGEX = /\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g;
const TAG_REGEX = /#([a-zA-Z0-9_-]+)/g;
const MARKDOWN_HEADING_REGEX = /^#{1,6}\s+(.+)$/gm;

/**
 * Parse wiki-style [[links]] from markdown content
 *
 * Supports:
 * - Simple links: [[Note Title]]
 * - Aliased links: [[Note Title|Display Text]]
 */
export function parseWikiLinks(markdown: string): WikiLink[] {
  const links: WikiLink[] = [];
  let match: RegExpExecArray | null;

  // Reset regex state
  WIKI_LINK_REGEX.lastIndex = 0;

  while ((match = WIKI_LINK_REGEX.exec(markdown)) !== null) {
    const [raw, target, alias] = match;
    links.push({
      target: target.trim(),
      alias: alias?.trim(),
      position: {
        start: match.index,
        end: match.index + raw.length,
      },
      raw,
    });
  }

  return links;
}

/**
 * Parse #tags from markdown content
 *
 * Extracts hashtags, excluding those in code blocks
 */
export function parseTags(markdown: string): string[] {
  const tags: Set<string> = new Set();

  // Remove code blocks first to avoid extracting tags from code
  const withoutCodeBlocks = markdown.replace(/```[\s\S]*?```/g, '');
  const withoutInlineCode = withoutCodeBlocks.replace(/`[^`]+`/g, '');

  let match: RegExpExecArray | null;
  TAG_REGEX.lastIndex = 0;

  while ((match = TAG_REGEX.exec(withoutInlineCode)) !== null) {
    const tag = match[1].toLowerCase();
    tags.add(tag);
  }

  return Array.from(tags);
}

/**
 * Convert markdown to plain text (strip formatting)
 */
export function markdownToPlainText(markdown: string): string {
  return markdown
    // Remove code blocks
    .replace(/```[\s\S]*?```/g, '')
    // Remove inline code
    .replace(/`([^`]+)`/g, '$1')
    // Remove images
    .replace(/!\[([^\]]*)\]\([^)]+\)/g, '$1')
    // Remove links but keep text
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    // Remove wiki links but keep target/alias
    .replace(/\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g, (_, target, alias) => alias || target)
    // Remove headings markers
    .replace(/^#{1,6}\s+/gm, '')
    // Remove bold/italic
    .replace(/(\*\*|__)(.*?)\1/g, '$2')
    .replace(/(\*|_)(.*?)\1/g, '$2')
    // Remove strikethrough
    .replace(/~~(.*?)~~/g, '$1')
    // Normalize whitespace
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Convert wiki links to HTML anchor tags
 * Useful for preview rendering
 */
export function wikiLinksToHtml(markdown: string, baseUrl: string = '/notes'): string {
  return markdown.replace(
    WIKI_LINK_REGEX,
    (_, target, alias) => {
      const displayText = alias || target;
      const slug = encodeURIComponent(target.trim());
      return `<a href="${baseUrl}/${slug}" class="wiki-link">${displayText}</a>`;
    }
  );
}

/**
 * Find potential note titles in text for autocomplete
 * Looks for partial matches after [[ to suggest completions
 */
export function findPartialWikiLink(text: string, cursorPos: number): string | null {
  // Look backwards from cursor to find [[
  const before = text.substring(0, cursorPos);
  const lastDoubleBracket = before.lastIndexOf('[[');

  if (lastDoubleBracket === -1) return null;

  // Check if there's a closing ]] before cursor
  const afterBracket = before.substring(lastDoubleBracket);
  if (afterBracket.includes(']]')) return null;

  // Extract the partial text after [[
  const partial = before.substring(lastDoubleBracket + 2);

  // Make sure we haven't started an alias (|)
  if (partial.includes('|')) return null;

  return partial;
}

/**
 * Complete parsing of note content
 */
export function parseNote(markdown: string): ParsedNote {
  const wikiLinks = parseWikiLinks(markdown);
  const tags = parseTags(markdown);
  const plainText = markdownToPlainText(markdown);

  return {
    wikiLinks,
    tags,
    plainText,
  };
}

/**
 * Normalize note title for comparison
 * Used to match wiki links to actual note titles
 */
export function normalizeTitle(title: string): string {
  return title
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');
}

/**
 * Find broken wiki links (links that don't point to existing notes)
 */
export function findBrokenLinks(
  markdown: string,
  existingNoteTitles: string[]
): WikiLink[] {
  const wikiLinks = parseWikiLinks(markdown);
  const normalizedTitles = new Set(existingNoteTitles.map(normalizeTitle));

  return wikiLinks.filter(link => {
    const normalizedTarget = normalizeTitle(link.target);
    return !normalizedTitles.has(normalizedTarget);
  });
}

/**
 * Extract headings from markdown
 * Useful for generating table of contents or note outline
 */
export interface MarkdownHeading {
  level: number;
  text: string;
  position: number;
}

export function extractHeadings(markdown: string): MarkdownHeading[] {
  const headings: MarkdownHeading[] = [];
  let match: RegExpExecArray | null;

  MARKDOWN_HEADING_REGEX.lastIndex = 0;

  while ((match = MARKDOWN_HEADING_REGEX.exec(markdown)) !== null) {
    const raw = match[0];
    const level = raw.match(/^#+/)?.[0].length || 1;
    const text = match[1].trim();

    headings.push({
      level,
      text,
      position: match.index,
    });
  }

  return headings;
}

/**
 * Replace wiki link with new target
 * Useful for renaming notes
 */
export function replaceWikiLink(
  markdown: string,
  oldTarget: string,
  newTarget: string
): string {
  const normalizedOld = normalizeTitle(oldTarget);

  return markdown.replace(WIKI_LINK_REGEX, (match, target, alias) => {
    if (normalizeTitle(target) === normalizedOld) {
      return alias ? `[[${newTarget}|${alias}]]` : `[[${newTarget}]]`;
    }
    return match;
  });
}
