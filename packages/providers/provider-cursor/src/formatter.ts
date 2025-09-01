/**
 * Cursor-specific formatting utilities
 */

export interface CursorFormattingOptions {
  /** Maximum line length */
  maxLineLength?: number;

  /** Include category comments */
  includeCategories?: boolean;

  /** Indent size for nested content */
  indentSize?: number;
}

/**
 * Format content specifically for Cursor rules
 */
export function formatCursorRules(
  content: string,
  options: CursorFormattingOptions = {}
): string {
  const opts = {
    maxLineLength: 120,
    includeCategories: true,
    indentSize: 2,
    ...options,
  };

  let formatted = content;

  // Apply Cursor-specific transformations
  formatted = normalizeHeaders(formatted);
  formatted = formatCodeBlocks(formatted);
  formatted = formatLists(formatted);
  formatted = wrapLongLines(formatted, opts.maxLineLength);
  formatted = addCursorSpecificSyntax(formatted);

  return formatted;
}

/**
 * Normalize markdown headers for Cursor
 */
function normalizeHeaders(content: string): string {
  return content.replace(/^(#{1,6})\\s+(.+)$/gm, (match, hashes, title) => {
    // Cursor works best with consistent header styling
    return \`\${hashes} \${title.trim()}\`;
  });
}

/**
 * Format code blocks for better Cursor integration
 */
function formatCodeBlocks(content: string): string {
  // Ensure code blocks have proper language hints when possible
  return content.replace(/```\\n([^`]+)```/g, (match, code) => {
    const trimmedCode = code.trim();

    // Try to detect language from content patterns
    let language = '';
    if (trimmedCode.includes('function') || trimmedCode.includes('=>')) {
      language = 'javascript';
    } else if (trimmedCode.includes('def ') || trimmedCode.includes('import ')) {
      language = 'python';
    } else if (trimmedCode.includes('class ') && trimmedCode.includes('{')) {
      language = 'java';
    }

    return \`\`\`\${language}\\n\${trimmedCode}\\n\`\`\`\`;
  });
}

/**
 * Format lists for better readability
 */
function formatLists(content: string): string {
  const lines = content.split('\\n');
  const formatted: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Format bullet points
    if (line.match(/^\\s*[-*+]\\s+/)) {
      const indent = line.match(/^\\s*/)![0];
      const bullet = line.includes('*') ? '*' : '-';
      const text = line.replace(/^\\s*[-*+]\\s+/, '').trim();
      formatted.push(\`\${indent}\${bullet} \${text}\`);
    }
    // Format numbered lists
    else if (line.match(/^\\s*\\d+\\.\\s+/)) {
      const indent = line.match(/^\\s*/)![0];
      const number = line.match(/^\\s*(\\d+)\\./)?.[1];
      const text = line.replace(/^\\s*\\d+\\.\\s+/, '').trim();
      formatted.push(\`\${indent}\${number}. \${text}\`);
    }
    else {
      formatted.push(line);
    }
  }

  return formatted.join('\\n');
}

/**
 * Wrap long lines while preserving structure
 */
function wrapLongLines(content: string, maxLength: number): string {
  const lines = content.split('\\n');
  const wrapped: string[] = [];

  for (const line of lines) {
    if (line.length <= maxLength) {
      wrapped.push(line);
      continue;
    }

    // Don't wrap code blocks, headers, or links
    if (line.startsWith('```') ||
        line.startsWith('#') ||
        line.includes('](') ||
        line.startsWith('    ')) {
      wrapped.push(line);
      continue;
    }

    // Wrap at word boundaries
    const words = line.split(' ');
    let currentLine = '';

    for (const word of words) {
      if ((currentLine + ' ' + word).length <= maxLength) {
        currentLine += (currentLine ? ' ' : '') + word;
      } else {
        if (currentLine) {
          wrapped.push(currentLine);
        }
        currentLine = word;
      }
    }

    if (currentLine) {
      wrapped.push(currentLine);
    }
  }

  return wrapped.join('\\n');
}

/**
 * Add Cursor-specific syntax enhancements
 */
function addCursorSpecificSyntax(content: string): string {
  let enhanced = content;

  // Add context hints for Cursor
  enhanced = enhanced.replace(
    /## (Security|Safety|Privacy)/gi,
    '## $1\\n\\n> **Important**: These rules are critical for maintaining security and should not be bypassed.'
  );

  // Enhance code examples with context
  enhanced = enhanced.replace(
    /### (Example|Good|Preferred):/gi,
    '### ✅ $1:'
  );

  enhanced = enhanced.replace(
    /### (Anti-pattern|Bad|Avoid):/gi,
    '### ❌ $1:'
  );

  return enhanced;
}

/**
 * Remove excessive whitespace while preserving structure
 */
export function cleanupWhitespace(content: string): string {
  return content
    // Remove trailing spaces
    .replace(/[ \\t]+$/gm, '')
    // Normalize multiple blank lines
    .replace(/\\n{3,}/g, '\\n\\n')
    // Ensure file ends with single newline
    .replace(/\\n*$/, '\\n');
}

/**
 * Generate table of contents for Cursor rules
 */
export function generateTableOfContents(content: string): string {
  const lines = content.split('\\n');
  const headers: Array<{ level: number; text: string; anchor: string }> = [];

  for (const line of lines) {
    const headerMatch = line.match(/^(#{1,6})\\s+(.+)$/);
    if (headerMatch) {
      const level = headerMatch[1].length;
      const text = headerMatch[2].trim();
      const anchor = text
        .toLowerCase()
        .replace(/[^a-z0-9\\s-]/g, '')
        .replace(/\\s+/g, '-');

      headers.push({ level, text, anchor });
    }
  }

  if (headers.length === 0) return '';

  const toc = ['## Table of Contents', ''];

  for (const header of headers) {
    const indent = '  '.repeat(header.level - 2);
    toc.push(\`\${indent}- [\${header.text}](#\${header.anchor})\`);
  }

  return toc.join('\\n') + '\\n\\n';
}
