import type { PolicyPartial, ManifestConfig, Provider } from '@ai-policies/core-schemas';
import type { ContentTransformer, TransformContext } from './types.js';

export interface MergeOptions {
  /** Team append content to add at the end */
  teamAppendContent?: string;

  /** Content transformers to apply */
  transformers?: ContentTransformer[];

  /** Provider being composed for */
  provider: Provider;
}

/**
 * Merge partials into a single content string
 */
export async function mergePartials(
  partials: PolicyPartial[],
  composeSettings: ManifestConfig['compose'],
  options: MergeOptions
): Promise<string> {
  const sections: string[] = [];
  const layerSections = new Map<string, string[]>();

  // Group partials by layer
  for (const layer of composeSettings.order) {
    layerSections.set(layer, []);
  }

  // Process each partial
  for (const partial of partials) {
    const layer = partial.frontmatter.layer;
    const layerPartials = layerSections.get(layer);

    if (!layerPartials) {
      console.warn(\`Skipping partial \${partial.frontmatter.id} with unknown layer: \${layer}\`);
      continue;
    }

    // Apply transformers
    let content = partial.content;
    if (options.transformers) {
      const context: TransformContext = {
        partial,
        provider: options.provider,
        allPartials: partials,
        settings: composeSettings,
      };

      for (const transformer of options.transformers) {
        content = transformer.transform(content, context);
      }
    }

    // Add section header if content is not empty
    if (content.trim()) {
      const sectionHeader = createSectionHeader(partial);
      layerPartials.push(\`\${sectionHeader}\\n\${content}\`);
    }
  }

  // Combine layers in order
  for (const layer of composeSettings.order) {
    const layerPartials = layerSections.get(layer) || [];

    if (layerPartials.length > 0) {
      const layerHeader = createLayerHeader(layer);
      sections.push(\`\${layerHeader}\\n\${layerPartials.join('\\n\\n')}\`);
    }
  }

  // Add team append content if enabled
  if (composeSettings.teamAppend && options.teamAppendContent) {
    const teamAppendSection = createTeamAppendSection(options.teamAppendContent);
    sections.push(teamAppendSection);
  }

  return sections.join('\\n\\n');
}

/**
 * Create a section header for a partial
 */
function createSectionHeader(partial: PolicyPartial): string {
  return \`<!-- BEGIN PARTIAL: \${partial.frontmatter.id} (from \${partial.packageName}) -->\`;
}

/**
 * Create a layer header
 */
function createLayerHeader(layer: string): string {
  const layerTitles = {
    core: 'Core Policies',
    domain: 'Domain-Specific Policies',
    stack: 'Technology Stack Policies',
    team: 'Team-Specific Policies',
  };

  const title = layerTitles[layer as keyof typeof layerTitles] || \`\${layer.charAt(0).toUpperCase()}\${layer.slice(1)} Policies\`;

  return \`## \${title}\`;
}

/**
 * Create team append section
 */
function createTeamAppendSection(content: string): string {
  return \`<!-- BEGIN TEAM APPEND -->
## Team Customizations

\${content}
<!-- END TEAM APPEND -->\`;
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
      return baseContent ? \`\${baseContent}\\n\\n\${newContent}\` : newContent;

    case 'prepend':
      return baseContent ? \`\${newContent}\\n\\n\${baseContent}\` : newContent;

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
  const lines = content.split('\\n');

  let currentSection = '';
  let currentContent: string[] = [];

  for (const line of lines) {
    // Check for markdown headers
    const headerMatch = line.match(/^#+\\s+(.+)$/);

    if (headerMatch) {
      // Save previous section
      if (currentSection && currentContent.length > 0) {
        sections.set(currentSection, currentContent.join('\\n').trim());
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
    sections.set(currentSection, currentContent.join('\\n').trim());
  }

  return sections;
}

/**
 * Normalize whitespace in content
 */
export function normalizeWhitespace(content: string): string {
  return content
    // Remove trailing whitespace from lines
    .replace(/[ \\t]+$/gm, '')
    // Normalize multiple blank lines to single blank line
    .replace(/\\n\\s*\\n\\s*\\n/g, '\\n\\n')
    // Ensure content ends with single newline
    .replace(/\\n*$/, '\\n');
}

/**
 * Remove duplicate sections by header
 */
export function removeDuplicateSections(content: string): string {
  const sections = extractSections(content);
  const seenHeaders = new Set<string>();
  const uniqueSections: string[] = [];

  const lines = content.split('\\n');
  let currentContent: string[] = [];
  let currentHeader = '';

  for (const line of lines) {
    const headerMatch = line.match(/^#+\\s+(.+)$/);

    if (headerMatch) {
      // Save previous section if unique
      if (currentHeader && !seenHeaders.has(currentHeader)) {
        uniqueSections.push([line, ...currentContent].join('\\n'));
        seenHeaders.add(currentHeader);
      }

      currentHeader = headerMatch[1];
      currentContent = [];
    } else {
      currentContent.push(line);
    }
  }

  // Save last section if unique
  if (currentHeader && !seenHeaders.has(currentHeader)) {
    uniqueSections.push(currentContent.join('\\n'));
  }

  return uniqueSections.join('\\n\\n');
}
