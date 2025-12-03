import type { PolicyPartial, Layer } from '@ai-policies/core-schemas';
import type { ProtectedBlock } from './types.js';

/**
 * Extract protected blocks from content
 */
export async function extractProtectedBlocks(
  existingContent: string,
  protectedLayers: Layer[]
): Promise<ProtectedBlock[]> {
  const blocks: ProtectedBlock[] = [];

  // Protected block pattern: <!-- BEGIN PROTECTED:id -->...<!-- END PROTECTED -->
  const protectedRegex = /<!--\\s*BEGIN\\s+PROTECTED:([^\\s]+)\\s*-->[\\s\\S]*?<!--\\s*END\\s+PROTECTED\\s*-->/g;

  let match;
  while ((match = protectedRegex.exec(existingContent)) !== null) {
    const [fullMatch, blockId] = match;

    blocks.push({
      id: blockId,
      content: fullMatch,
      source: createPlaceholderPartial(blockId), // In real implementation, track source
      markers: {
        start: \`<!-- BEGIN PROTECTED:\${blockId} -->\`,
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
    const placeholder = \`<!-- PROTECTED:\${block.id} -->\`;

    if (result.includes(placeholder)) {
      result = result.replace(placeholder, block.content);
    } else {
      // If no placeholder found, append at the end of the relevant section
      result = insertProtectedBlock(result, block);
    }
  }

  return result;
}

/**
 * Create protected block markers in content
 */
export function createProtectedBlock(
  id: string,
  content: string,
  layer: Layer
): string {
  const sanitizedId = id.replace(/[^a-zA-Z0-9-_]/g, '-');

  return \`<!-- BEGIN PROTECTED:\${sanitizedId} -->
\${content}
<!-- END PROTECTED -->\`;
}

/**
 * Check if content has protected blocks
 */
export function hasProtectedBlocks(content: string): boolean {
  const protectedRegex = /<!--\\s*BEGIN\\s+PROTECTED:[^\\s]+\\s*-->/;
  return protectedRegex.test(content);
}

/**
 * Validate protected blocks in content
 */
export function validateProtectedBlocks(content: string): Array<{ message: string; blockId?: string }> {
  const errors: Array<{ message: string; blockId?: string }> = [];

  // Check for unmatched BEGIN markers
  const beginMatches = content.match(/<!--\\s*BEGIN\\s+PROTECTED:([^\\s]+)\\s*-->/g) || [];
  const endMatches = content.match(/<!--\\s*END\\s+PROTECTED\\s*-->/g) || [];

  if (beginMatches.length !== endMatches.length) {
    errors.push({
      message: \`Unmatched protected block markers: \${beginMatches.length} BEGIN, \${endMatches.length} END\`,
    });
  }

  // Check for nested protected blocks
  const protectedRegex = /<!--\\s*BEGIN\\s+PROTECTED:([^\\s]+)\\s*-->[\\s\\S]*?<!--\\s*END\\s+PROTECTED\\s*-->/g;
  let match;

  while ((match = protectedRegex.exec(content)) !== null) {
    const [fullMatch, blockId] = match;

    // Check if this block contains other protected blocks
    const nestedBegin = (fullMatch.match(/<!--\\s*BEGIN\\s+PROTECTED:/g) || []).length;
    if (nestedBegin > 1) {
      errors.push({
        message: \`Protected block '\${blockId}' contains nested protected blocks\`,
        blockId,
      });
    }
  }

  return errors;
}

/**
 * Insert protected block into content at appropriate location
 */
function insertProtectedBlock(content: string, block: ProtectedBlock): string {
  // Try to find a good insertion point based on content structure
  const lines = content.split('\n');

  // Look for section headers that might relate to this block
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (line.startsWith('#') && line.toLowerCase().includes(block.id.toLowerCase())) {
      // Insert after this header
      lines.splice(i + 1, 0, '', block.content, '');
      return lines.join('\n');
    }
  }

  // If no good location found, append at the end
  return \`\${content}\n\n\${block.content}\`;
}

/**
 * Extract protected content from a partial
 */
export function extractProtectedContentFromPartial(partial: PolicyPartial): ProtectedBlock[] {
  const blocks: ProtectedBlock[] = [];

  if (!partial.frontmatter.protected) {
    return blocks;
  }

  // If the entire partial is protected, wrap it
  const protectedContent = createProtectedBlock(
    partial.frontmatter.id,
    partial.content,
    partial.frontmatter.layer
  );

  blocks.push({
    id: partial.frontmatter.id,
    content: protectedContent,
    source: partial,
    markers: {
      start: \`<!-- BEGIN PROTECTED:\${partial.frontmatter.id} -->\`,
      end: '<!-- END PROTECTED -->',
    },
  });

  return blocks;
}

/**
 * Remove protected blocks from content
 */
export function removeProtectedBlocks(content: string): string {
  const protectedRegex = /<!--\s*BEGIN\s+PROTECTED:[^\s]+\s*-->[\s\S]*?<!--\s*END\s+PROTECTED\s*-->/g;
  return content.replace(protectedRegex, '').replace(/\n\s*\n\s*\n/g, '\n\n');
}

/**
 * Get all protected block IDs from content
 */
export function getProtectedBlockIds(content: string): string[] {
  const ids: string[] = [];
  const protectedRegex = /<!--\\s*BEGIN\\s+PROTECTED:([^\\s]+)\\s*-->/g;

  let match;
  while ((match = protectedRegex.exec(content)) !== null) {
    ids.push(match[1]);
  }

  return ids;
}

/**
 * Create placeholder partial for protected blocks without source
 */
function createPlaceholderPartial(blockId: string): PolicyPartial {
  return {
    frontmatter: {
      id: blockId,
      layer: 'core',
      weight: 0,
      protected: true,
      dependsOn: [],
      owner: 'system',
    },
    content: '',
    filePath: \`protected/\${blockId}.md\`,
    packageName: '@ai-policies/protected',
    packageVersion: '1.0.0',
  };
}
