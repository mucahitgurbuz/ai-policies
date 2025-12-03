/**
 * Format content for Copilot instructions
 */
export function formatCopilotInstructions(content: string): string {
  let formatted = content;

  // Structure content for optimal Copilot understanding
  formatted = structureForCopilot(formatted);

  // Clean up whitespace
  formatted = cleanupWhitespace(formatted);

  return formatted;
}

/**
 * Structure content for Copilot AI understanding
 */
function structureForCopilot(content: string): string {
  let structured = content;

  // Ensure clear section breaks
  structured = structured.replace(/^(##\s)/gm, '\n$1');

  return structured;
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
