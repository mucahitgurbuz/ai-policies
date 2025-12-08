import type {
  PolicyPartial,
  Provider,
} from '../schemas/types.js';
import type { ContentTransformer, TransformContext } from './types.js';

export interface MergeOptions {
  /** Content transformers to apply */
  transformers?: ContentTransformer[];

  /** Provider being composed for */
  provider: Provider;
}

/**
 * Merge partials into a single content string (v2.0)
 * Partials are merged in order (as received from extends array resolution)
 */
export async function mergePartials(
  partials: PolicyPartial[],
  options: MergeOptions
): Promise<string> {
  const sections: string[] = [];

  // Process each partial in order
  for (const partial of partials) {
    // Apply transformers
    let content = partial.content;
    if (options.transformers) {
      const context: TransformContext = {
        partial,
        provider: options.provider,
        allPartials: partials,
      };

      for (const transformer of options.transformers) {
        content = transformer.transform(content, context);
      }
    }

    // Add section header if content is not empty
    if (content.trim()) {
      const sectionHeader = createSectionHeader(partial);
      sections.push(`${sectionHeader}\n${content}`);
    }
  }

  return sections.join('\n\n');
}

/**
 * Create a section header for a partial
 */
function createSectionHeader(partial: PolicyPartial): string {
  return `<!-- BEGIN PARTIAL: ${partial.frontmatter.id} (from ${partial.packageName}) -->`;
}

/**
 * Merge content with conflict resolution
 */
export function mergeWithConflictResolution(
  baseContent: string,
  newContent: string,
  strategy: 'override' | 'append' | 'prepend' | 'preserve'
): string {
  switch (strategy) {
    case 'override':
      return newContent;

    case 'append':
      return baseContent ? `${baseContent}\n\n${newContent}` : newContent;

    case 'prepend':
      return baseContent ? `${newContent}\n\n${baseContent}` : newContent;

    case 'preserve':
      return baseContent || newContent;

    default:
      return newContent;
  }
}

/**
 * Extract sections from content by header patterns
 */
export function extractSections(content: string): Map<string, string> {
  const sections = new Map<string, string>();
  const lines = content.split('\n');

  let currentSection = '';
  let currentContent: string[] = [];

  for (const line of lines) {
    // Check for markdown headers
    const headerMatch = line.match(/^#+\s+(.+)$/);

    if (headerMatch) {
      // Save previous section
      if (currentSection && currentContent.length > 0) {
        sections.set(currentSection, currentContent.join('\n').trim());
      }

      // Start new section
      currentSection = headerMatch[1];
      currentContent = [];
    } else {
      currentContent.push(line);
    }
  }

  // Save last section
  if (currentSection && currentContent.length > 0) {
    sections.set(currentSection, currentContent.join('\n').trim());
  }

  return sections;
}

/**
 * Normalize whitespace in content
 */
export function normalizeWhitespace(content: string): string {
  return (
    content
      // Remove trailing whitespace from lines
      .replace(/[ \t]+$/gm, '')
      // Normalize multiple blank lines to single blank line
      .replace(/\n\s*\n\s*\n/g, '\n\n')
      // Ensure content ends with single newline
      .replace(/\n*$/, '\n')
  );
}

/**
 * Remove duplicate sections by header
 */
export function removeDuplicateSections(content: string): string {
  const seenHeaders = new Set<string>();
  const uniqueSections: string[] = [];

  const lines = content.split('\n');
  let currentContent: string[] = [];
  let currentHeader = '';

  for (const line of lines) {
    const headerMatch = line.match(/^#+\s+(.+)$/);

    if (headerMatch) {
      // Save previous section if unique
      if (currentHeader && !seenHeaders.has(currentHeader)) {
        uniqueSections.push([currentHeader, ...currentContent].join('\n'));
        seenHeaders.add(currentHeader);
      }

      currentHeader = line;
      currentContent = [];
    } else {
      currentContent.push(line);
    }
  }

  // Save last section if unique
  if (currentHeader && !seenHeaders.has(currentHeader)) {
    uniqueSections.push([currentHeader, ...currentContent].join('\n'));
  }

  return uniqueSections.join('\n\n');
}
