/**
 * Utility functions for working with schemas and validation
 */

import type {
  Layer,
  Provider,
  PartialFrontmatter,
  ManifestConfig,
  PolicyPartial,
  CompositionMetadata
} from './types.js';

/**
 * Check if a string is a valid layer
 */
export function isValidLayer(value: string): value is Layer {
  return ['core', 'domain', 'stack', 'team'].includes(value);
}

/**
 * Check if a string is a valid provider
 */
export function isValidProvider(value: string): value is Provider {
  return ['cursor', 'copilot'].includes(value);
}

/**
 * Get layer priority (lower number = higher priority)
 */
export function getLayerPriority(layer: Layer): number {
  const priorities: Record<Layer, number> = {
    core: 0,
    domain: 1,
    stack: 2,
    team: 3,
  };

  return priorities[layer];
}

/**
 * Sort layers by priority
 */
export function sortLayersByPriority(layers: Layer[]): Layer[] {
  return [...layers].sort((a, b) => getLayerPriority(a) - getLayerPriority(b));
}

/**
 * Check if a partial should be included for a specific provider
 */
export function shouldIncludePartialForProvider(
  partial: PartialFrontmatter,
  provider: Provider
): boolean {
  // If no providers specified, include for all
  if (!partial.providers || partial.providers.length === 0) {
    return true;
  }

  return partial.providers.includes(provider);
}

/**
 * Validate package name format
 */
export function isValidPackageName(name: string): boolean {
  const packageNameRegex = /^@[a-z0-9-]+\/[a-z0-9-]+$/;
  return packageNameRegex.test(name);
}

/**
 * Validate semantic version format
 */
export function isValidSemver(version: string): boolean {
  const semverRegex = /^[0-9]+\.[0-9]+\.[0-9]+([a-zA-Z0-9.-]*)?$/;
  return semverRegex.test(version);
}

/**
 * Validate version range format
 */
export function isValidVersionRange(range: string): boolean {
  const versionRangeRegex = /^(\^|~|>=|>|<=|<|=)?[0-9]+\.[0-9]+\.[0-9]+([a-zA-Z0-9.-]*)?$/;
  return versionRangeRegex.test(range);
}

/**
 * Create a content hash for change detection
 */
export function createContentHash(content: string): string {
  // Simple hash implementation (in production, use crypto.createHash)
  let hash = 0;
  for (let i = 0; i < content.length; i++) {
    const char = content.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash).toString(16);
}

/**
 * Create composition metadata
 */
export function createCompositionMetadata(
  packages: Record<string, string>,
  partials: PolicyPartial[],
  settings: ManifestConfig['compose'],
  content: string
): CompositionMetadata {
  return {
    packages,
    contentHash: createContentHash(content),
    generatedAt: new Date().toISOString(),
    partials: partials.map(p => ({
      id: p.frontmatter.id,
      packageName: p.packageName,
      layer: p.frontmatter.layer,
      weight: p.frontmatter.weight,
    })),
    settings,
  };
}

/**
 * Parse metadata from generated file header
 */
export function parseMetadataFromHeader(content: string): CompositionMetadata | null {
  const metaMatch = content.match(/<!--\s*AI-POLICIES-META:\s*([^-]+)\s*-->/);

  if (!metaMatch) {
    return null;
  }

  try {
    const base64Data = metaMatch[1]?.trim();
    if (!base64Data) return null;

    const jsonStr = Buffer.from(base64Data, 'base64').toString('utf8');
    return JSON.parse(jsonStr) as CompositionMetadata;
  } catch {
    return null;
  }
}

/**
 * Generate metadata header for output files
 */
export function generateMetadataHeader(metadata: CompositionMetadata): string {
  const metaJson = JSON.stringify(metadata, null, 2);
  const base64Data = Buffer.from(metaJson).toString('base64');

  const packagesList = Object.entries(metadata.packages)
    .map(([name, version]) => `${name}@${version}`)
    .join(', ');

  return `<!--
AI-POLICIES-META: ${base64Data}
Generated at: ${metadata.generatedAt}
Packages: ${packagesList}
-->`;
}

/**
 * Detect circular dependencies in partials
 */
export function detectCircularDependencies(partials: PartialFrontmatter[]): string[][] {
  const graph = new Map<string, string[]>();

  // Build dependency graph
  for (const partial of partials) {
    graph.set(partial.id, partial.dependsOn);
  }

  const cycles: string[][] = [];
  const visited = new Set<string>();
  const visiting = new Set<string>();

  function visit(node: string, path: string[]): void {
    if (visiting.has(node)) {
      // Found a cycle
      const cycleStart = path.indexOf(node);
      cycles.push(path.slice(cycleStart).concat(node));
      return;
    }

    if (visited.has(node)) {
      return;
    }

    visiting.add(node);
    const dependencies = graph.get(node) || [];

    for (const dep of dependencies) {
      visit(dep, [...path, node]);
    }

    visiting.delete(node);
    visited.add(node);
  }

  for (const partial of partials) {
    if (!visited.has(partial.id)) {
      visit(partial.id, []);
    }
  }

  return cycles;
}
