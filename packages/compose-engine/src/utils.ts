import type { PolicyPartial, ManifestConfig, Layer } from '@ai-policies/core-schemas';
import { getLayerPriority } from '@ai-policies/core-schemas';
import type { ConflictResolution } from './types.js';

/**
 * Sort partials by composition rules (layer priority + weight)
 */
export function sortPartialsByComposition(
  partials: PolicyPartial[],
  composeSettings: ManifestConfig['compose']
): PolicyPartial[] {
  const layerOrder = new Map<Layer, number>();

  // Create layer priority map from compose order
  for (let i = 0; i < composeSettings.order.length; i++) {
    layerOrder.set(composeSettings.order[i], i);
  }

  return [...partials].sort((a, b) => {
    const aLayerPriority = layerOrder.get(a.frontmatter.layer) ?? 999;
    const bLayerPriority = layerOrder.get(b.frontmatter.layer) ?? 999;

    // First sort by layer priority
    if (aLayerPriority !== bLayerPriority) {
      return aLayerPriority - bLayerPriority;
    }

    // Then sort by weight within the same layer
    if (a.frontmatter.weight !== b.frontmatter.weight) {
      return a.frontmatter.weight - b.frontmatter.weight;
    }

    // Finally sort by ID for deterministic ordering
    return a.frontmatter.id.localeCompare(b.frontmatter.id);
  });
}

/**
 * Deduplicate partials with conflict resolution
 */
export function deduplicatePartials(partials: PolicyPartial[]): {
  partials: PolicyPartial[];
  conflicts: ConflictResolution[];
} {
  const partialMap = new Map<string, PolicyPartial[]>();
  const conflicts: ConflictResolution[] = [];

  // Group partials by ID
  for (const partial of partials) {
    const id = partial.frontmatter.id;
    if (!partialMap.has(id)) {
      partialMap.set(id, []);
    }
    partialMap.get(id)!.push(partial);
  }

  const deduplicatedPartials: PolicyPartial[] = [];

  // Resolve conflicts for each ID
  for (const [id, candidates] of partialMap) {
    if (candidates.length === 1) {
      deduplicatedPartials.push(candidates[0]);
    } else {
      const resolution = resolvePartialConflict(candidates);
      deduplicatedPartials.push(resolution.winner);
      conflicts.push(resolution);
    }
  }

  return { partials: deduplicatedPartials, conflicts };
}

/**
 * Resolve conflict between multiple partials with the same ID
 */
function resolvePartialConflict(candidates: PolicyPartial[]): ConflictResolution {
  // Priority rules:
  // 1. Protected partials win
  // 2. Higher layer priority wins (team > stack > domain > core)
  // 3. Higher weight wins
  // 4. Lexicographically later package name wins (for determinism)

  let winner = candidates[0];
  let reason: ConflictResolution['reason'] = 'explicit';

  for (const candidate of candidates.slice(1)) {
    const comparison = comparePartials(winner, candidate);

    if (comparison < 0) {
      winner = candidate;
      reason = comparison === -1 ? 'protected' :
               comparison === -2 ? 'layer-priority' :
               'weight';
    }
  }

  const losers = candidates.filter(p => p !== winner);

  return { winner, losers, reason };
}

/**
 * Compare two partials for conflict resolution
 * Returns: negative if b wins, positive if a wins, 0 if equal
 */
function comparePartials(a: PolicyPartial, b: PolicyPartial): number {
  // Protected partials always win
  if (a.frontmatter.protected && !b.frontmatter.protected) return 1;
  if (!a.frontmatter.protected && b.frontmatter.protected) return -1;

  // Higher layer priority wins (team > stack > domain > core)
  const aLayerPriority = getLayerPriority(a.frontmatter.layer);
  const bLayerPriority = getLayerPriority(b.frontmatter.layer);

  if (aLayerPriority !== bLayerPriority) {
    return bLayerPriority - aLayerPriority; // Higher priority (lower number) wins
  }

  // Higher weight wins
  if (a.frontmatter.weight !== b.frontmatter.weight) {
    return b.frontmatter.weight - a.frontmatter.weight;
  }

  // Package name for determinism
  return b.packageName.localeCompare(a.packageName);
}

/**
 * Filter partials by layer
 */
export function filterPartialsByLayer(
  partials: PolicyPartial[],
  layers: Layer[]
): PolicyPartial[] {
  const layerSet = new Set(layers);
  return partials.filter(partial => layerSet.has(partial.frontmatter.layer));
}

/**
 * Filter partials by tags
 */
export function filterPartialsByTags(
  partials: PolicyPartial[],
  requiredTags: string[],
  mode: 'any' | 'all' = 'any'
): PolicyPartial[] {
  if (requiredTags.length === 0) return partials;

  return partials.filter(partial => {
    const partialTags = partial.frontmatter.tags || [];

    if (mode === 'all') {
      return requiredTags.every(tag => partialTags.includes(tag));
    } else {
      return requiredTags.some(tag => partialTags.includes(tag));
    }
  });
}

/**
 * Group partials by package
 */
export function groupPartialsByPackage(
  partials: PolicyPartial[]
): Map<string, PolicyPartial[]> {
  const groups = new Map<string, PolicyPartial[]>();

  for (const partial of partials) {
    const packageName = partial.packageName;
    if (!groups.has(packageName)) {
      groups.set(packageName, []);
    }
    groups.get(packageName)!.push(partial);
  }

  return groups;
}

/**
 * Get statistics about partials
 */
export function getPartialStatistics(partials: PolicyPartial[]) {
  const stats = {
    total: partials.length,
    byLayer: new Map<Layer, number>(),
    byPackage: new Map<string, number>(),
    protected: 0,
    withDependencies: 0,
    averageWeight: 0,
    totalContentLength: 0,
  };

  let totalWeight = 0;

  for (const partial of partials) {
    // Layer statistics
    const layer = partial.frontmatter.layer;
    stats.byLayer.set(layer, (stats.byLayer.get(layer) || 0) + 1);

    // Package statistics
    const pkg = partial.packageName;
    stats.byPackage.set(pkg, (stats.byPackage.get(pkg) || 0) + 1);

    // Other statistics
    if (partial.frontmatter.protected) {
      stats.protected++;
    }

    if (partial.frontmatter.dependsOn.length > 0) {
      stats.withDependencies++;
    }

    totalWeight += partial.frontmatter.weight;
    stats.totalContentLength += partial.content.length;
  }

  stats.averageWeight = partials.length > 0 ? totalWeight / partials.length : 0;

  return stats;
}

/**
 * Validate partial compatibility
 */
export function validatePartialCompatibility(
  partials: PolicyPartial[]
): Array<{ message: string; partialIds: string[] }> {
  const issues: Array<{ message: string; partialIds: string[] }> = [];

  // Check for weight conflicts within the same layer
  const layerWeights = new Map<Layer, Map<number, string[]>>();

  for (const partial of partials) {
    const layer = partial.frontmatter.layer;
    const weight = partial.frontmatter.weight;

    if (!layerWeights.has(layer)) {
      layerWeights.set(layer, new Map());
    }

    const weights = layerWeights.get(layer)!;
    if (!weights.has(weight)) {
      weights.set(weight, []);
    }

    weights.get(weight)!.push(partial.frontmatter.id);
  }

  // Report weight conflicts
  for (const [layer, weights] of layerWeights) {
    for (const [weight, partialIds] of weights) {
      if (partialIds.length > 1) {
        issues.push({
          message: \`Multiple partials in layer '\${layer}' have the same weight \${weight}\`,
          partialIds,
        });
      }
    }
  }

  return issues;
}

/**
 * Create a summary of composition changes
 */
export function createCompositionSummary(
  partials: PolicyPartial[],
  conflicts: ConflictResolution[]
): string {
  const stats = getPartialStatistics(partials);
  const lines: string[] = [];

  lines.push(\`Composition Summary:\`);
  lines.push(\`  Total partials: \${stats.total}\`);
  lines.push(\`  Protected partials: \${stats.protected}\`);
  lines.push(\`  Partials with dependencies: \${stats.withDependencies}\`);
  lines.push(\`  Average weight: \${stats.averageWeight.toFixed(1)}\`);
  lines.push('');

  lines.push('By layer:');
  for (const [layer, count] of stats.byLayer) {
    lines.push(\`  \${layer}: \${count}\`);
  }
  lines.push('');

  lines.push('By package:');
  for (const [pkg, count] of stats.byPackage) {
    lines.push(\`  \${pkg}: \${count}\`);
  }

  if (conflicts.length > 0) {
    lines.push('');
    lines.push('Conflicts resolved:');
    for (const conflict of conflicts) {
      lines.push(\`  \${conflict.winner.frontmatter.id}: \${conflict.winner.packageName} won over \${conflict.losers.map(l => l.packageName).join(', ')} (\${conflict.reason})\`);
    }
  }

  return lines.join('\n');
}
