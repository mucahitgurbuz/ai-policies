import type { PolicyPartial } from '../schemas/types.js';

/**
 * Protected block information
 */
export interface ProtectedBlock {
  /** Block identifier (partial ID) */
  id: string;

  /** Block content */
  content: string;

  /** Source partial */
  source: PolicyPartial;

  /** Start and end markers */
  markers: {
    start: string;
    end: string;
  };
}

/**
 * Create protected block markers in content
 */
export function createProtectedBlock(
  id: string,
  content: string
): string {
  const sanitizedId = id.replace(/[^a-zA-Z0-9-_]/g, '-');

  return `<!-- BEGIN PROTECTED:${sanitizedId} -->
${content}
<!-- END PROTECTED -->`;
}

/**
 * Check if content has protected blocks
 */
export function hasProtectedBlocks(content: string): boolean {
  const protectedRegex = /<!--\s*BEGIN\s+PROTECTED:[^\s]+\s*-->/;
  return protectedRegex.test(content);
}

/**
 * Validate protected blocks in content
 */
export function validateProtectedBlocks(
  content: string
): Array<{ message: string; blockId?: string }> {
  const errors: Array<{ message: string; blockId?: string }> = [];

  // Check for unmatched BEGIN markers
  const beginMatches =
    content.match(/<!--\s*BEGIN\s+PROTECTED:([^\s]+)\s*-->/g) || [];
  const endMatches = content.match(/<!--\s*END\s+PROTECTED\s*-->/g) || [];

  if (beginMatches.length !== endMatches.length) {
    errors.push({
      message: `Unmatched protected block markers: ${beginMatches.length} BEGIN, ${endMatches.length} END`,
    });
  }

  // Check for nested protected blocks
  const protectedRegex =
    /<!--\s*BEGIN\s+PROTECTED:([^\s]+)\s*-->[\s\S]*?<!--\s*END\s+PROTECTED\s*-->/g;
  let match;

  while ((match = protectedRegex.exec(content)) !== null) {
    const [fullMatch, blockId] = match;

    // Check if this block contains other protected blocks
    const nestedBegin = (fullMatch.match(/<!--\s*BEGIN\s+PROTECTED:/g) || [])
      .length;
    if (nestedBegin > 1) {
      errors.push({
        message: `Protected block '${blockId}' contains nested protected blocks`,
        blockId,
      });
    }
  }

  return errors;
}

/**
 * Remove protected blocks from content
 */
export function removeProtectedBlocks(content: string): string {
  const protectedRegex =
    /<!--\s*BEGIN\s+PROTECTED:[^\s]+\s*-->[\s\S]*?<!--\s*END\s+PROTECTED\s*-->/g;
  return content
    .replace(protectedRegex, '')
    .replace(/\n\s*\n\s*\n/g, '\n\n');
}

/**
 * Get all protected block IDs from content
 */
export function getProtectedBlockIds(content: string): string[] {
  const ids: string[] = [];
  const protectedRegex = /<!--\s*BEGIN\s+PROTECTED:([^\s]+)\s*-->/g;

  let match;
  while ((match = protectedRegex.exec(content)) !== null) {
    ids.push(match[1]);
  }

  return ids;
}

/**
 * Extract protected blocks from existing content
 */
export function extractProtectedBlocks(existingContent: string): ProtectedBlock[] {
  const blocks: ProtectedBlock[] = [];

  const protectedRegex =
    /<!--\s*BEGIN\s+PROTECTED:([^\s]+)\s*-->([\s\S]*?)<!--\s*END\s+PROTECTED\s*-->/g;

  let match;
  while ((match = protectedRegex.exec(existingContent)) !== null) {
    const [fullMatch, blockId, innerContent] = match;

    blocks.push({
      id: blockId,
      content: fullMatch,
      source: createPlaceholderPartial(blockId),
      markers: {
        start: `<!-- BEGIN PROTECTED:${blockId} -->`,
        end: '<!-- END PROTECTED -->',
      },
    });
  }

  return blocks;
}

/**
 * Merge protected blocks into new content
 */
export function mergeProtectedBlocks(
  newContent: string,
  protectedBlocks: ProtectedBlock[]
): string {
  let result = newContent;

  for (const block of protectedBlocks) {
    // Find placeholder for this protected block
    const placeholder = `<!-- PROTECTED:${block.id} -->`;

    if (result.includes(placeholder)) {
      result = result.replace(placeholder, block.content);
    }
  }

  return result;
}

/**
 * Create placeholder partial for protected blocks
 */
function createPlaceholderPartial(blockId: string): PolicyPartial {
  return {
    frontmatter: {
      id: blockId,
      owner: 'system',
    },
    content: '',
    filePath: `protected/${blockId}.md`,
    packageName: '@ai-policies/protected',
    packageVersion: '1.0.0',
    sourceIndex: -1,
  };
}
