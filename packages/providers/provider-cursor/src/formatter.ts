/**
 * Format content for Cursor IDE rules
 */
export function formatCursorRules(content: string): string {
  let formatted = content;

  // Normalize headers
  formatted = normalizeHeaders(formatted);

  // Clean up whitespace
  formatted = cleanupWhitespace(formatted);

  return formatted;
}

/**
 * Normalize markdown headers
 */
function normalizeHeaders(content: string): string {
  const lines = content.split('\n');
  const normalized: string[] = [];

  for (const line of lines) {
    // Ensure headers have proper spacing
    if (line.match(/^#+\s/)) {
      if (normalized.length > 0 && normalized[normalized.length - 1] !== '') {
        normalized.push('');
      }
      normalized.push(line);
      normalized.push('');
    } else {
      normalized.push(line);
    }
  }

  return normalized.join('\n');
}

/**
 * Clean up excess whitespace
 */
function cleanupWhitespace(content: string): string {
  // Remove trailing whitespace
  let cleaned = content.replace(/[ \t]+$/gm, '');

  // Collapse multiple blank lines into two
  cleaned = cleaned.replace(/\n{3,}/g, '\n\n');

  // Ensure file ends with single newline
  cleaned = cleaned.trim() + '\n';

  return cleaned;
}
