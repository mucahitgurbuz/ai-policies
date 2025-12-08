/**
 * Utility functions for AI Policies v2.0
 */

import type {
  Provider,
  PartialFrontmatter,
  PolicyPartial,
  CompositionMetadata,
} from './types.js';

/**
 * Check if a string is a valid provider
 */
export function isValidProvider(value: string): value is Provider {
  return ['cursor', 'copilot'].includes(value);
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
 * Validate package name format (scoped npm package)
 */
export function isValidPackageName(name: string): boolean {
  const packageNameRegex = /^@[a-z0-9-]+\/[a-z0-9-]+$/;
  return packageNameRegex.test(name);
}

/**
 * Check if a path is a local path (starts with ./ or /)
 */
export function isLocalPath(path: string): boolean {
  return path.startsWith('./') || path.startsWith('/') || path.startsWith('../');
}

/**
 * Validate semantic version format
 */
export function isValidSemver(version: string): boolean {
  const semverRegex = /^[0-9]+\.[0-9]+\.[0-9]+([a-zA-Z0-9.-]*)?$/;
  return semverRegex.test(version);
}

/**
 * Create a content hash for change detection
 */
export function createContentHash(content: string): string {
  // Simple hash implementation (in production, use crypto.createHash)
  let hash = 0;
  for (let i = 0; i < content.length; i++) {
    const char = content.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash).toString(16);
}

/**
 * Create composition metadata (v2.0)
 */
export function createCompositionMetadata(
  packages: Record<string, string>,
  partials: PolicyPartial[],
  protectedPartials: string[],
  content: string
): CompositionMetadata {
  return {
    packages,
    contentHash: createContentHash(content),
    generatedAt: new Date().toISOString(),
    partials: partials.map(p => ({
      id: p.frontmatter.id,
      packageName: p.packageName,
    })),
    protectedPartials,
  };
}

/**
 * Parse metadata from generated file header
 */
export function parseMetadataFromHeader(
  content: string
): CompositionMetadata | null {
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
