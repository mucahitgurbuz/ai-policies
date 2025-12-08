import type { PolicyPartial, ConflictResolution } from '../schemas/types.js';
import type { DeduplicationResult } from './types.js';

/**
 * Deduplicate partials with "last wins" strategy (v2.0)
 * Protected partials are preserved regardless of order
 */
export function deduplicatePartials(
  partials: PolicyPartial[],
  protectedIds: string[]
): DeduplicationResult {
  const protectedSet = new Set(protectedIds);
  const partialMap = new Map<string, PolicyPartial[]>();
  const conflicts: ConflictResolution[] = [];
  const protectedWarnings: string[] = [];

  // Group partials by ID, preserving order
  for (const partial of partials) {
    const id = partial.frontmatter.id;
    if (!partialMap.has(id)) {
      partialMap.set(id, []);
    }
    partialMap.get(id)!.push(partial);
  }

  const deduplicatedPartials: PolicyPartial[] = [];
  const addedIds = new Set<string>();

  // Process partials in order to maintain extends array order
  for (const partial of partials) {
    const id = partial.frontmatter.id;

    // Skip if already processed
    if (addedIds.has(id)) {
      continue;
    }

    const candidates = partialMap.get(id)!;

    if (candidates.length === 1) {
      // No conflict
      deduplicatedPartials.push(candidates[0]);
    } else {
      // Conflict - resolve it
      const resolution = resolveConflict(candidates, protectedSet);
      deduplicatedPartials.push(resolution.winner);
      conflicts.push(resolution);

      // Log warning if protected partial was preserved
      if (resolution.reason === 'protected') {
        protectedWarnings.push(
          `Protected partial '${id}' from '${resolution.winner.packageName}' was preserved. ` +
          `Overrides from ${resolution.overridden.map(p => p.packageName).join(', ')} were ignored.`
        );
      }
    }

    addedIds.add(id);
  }

  return { partials: deduplicatedPartials, conflicts, protectedWarnings };
}

/**
 * Resolve conflict between partials with same ID
 * Rule: Last wins, unless protected
 */
function resolveConflict(
  candidates: PolicyPartial[],
  protectedIds: Set<string>
): ConflictResolution {
  const id = candidates[0].frontmatter.id;
  const isProtected = protectedIds.has(id);

  if (isProtected) {
    // Protected: first occurrence wins (the one that defined protection)
    // Find the earliest partial from a package that declared it protected
    const winner = candidates[0]; // First in extends order
    const overridden = candidates.slice(1);

    return {
      partialId: id,
      winner,
      overridden,
      reason: 'protected',
    };
  }

  // Not protected: last wins (highest sourceIndex)
  const sorted = [...candidates].sort((a, b) => b.sourceIndex - a.sourceIndex);
  const winner = sorted[0];
  const overridden = sorted.slice(1);

  return {
    partialId: id,
    winner,
    overridden,
    reason: 'last-wins',
  };
}

/**
 * Sort partials by their source index (extends array order)
 */
export function sortPartialsBySourceIndex(partials: PolicyPartial[]): PolicyPartial[] {
  return [...partials].sort((a, b) => a.sourceIndex - b.sourceIndex);
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
 * Get statistics about partials (v2.0 - simplified)
 */
export function getPartialStatistics(partials: PolicyPartial[]) {
  const stats = {
    total: partials.length,
    byPackage: new Map<string, number>(),
    totalContentLength: 0,
    tagsUsed: new Set<string>(),
  };

  for (const partial of partials) {
    // Package statistics
    const pkg = partial.packageName;
    stats.byPackage.set(pkg, (stats.byPackage.get(pkg) || 0) + 1);

    // Content length
    stats.totalContentLength += partial.content.length;

    // Tags
    if (partial.frontmatter.tags) {
      for (const tag of partial.frontmatter.tags) {
        stats.tagsUsed.add(tag);
      }
    }
  }

  return stats;
}

/**
 * Create a summary of composition changes (v2.0)
 */
export function createCompositionSummary(
  partials: PolicyPartial[],
  conflicts: ConflictResolution[]
): string {
  const stats = getPartialStatistics(partials);
  const lines: string[] = [];

  lines.push(`Composition Summary:`);
  lines.push(`  Total partials: ${stats.total}`);
  lines.push('');

  lines.push('By package:');
  for (const [pkg, count] of stats.byPackage) {
    lines.push(`  ${pkg}: ${count}`);
  }

  if (conflicts.length > 0) {
    lines.push('');
    lines.push('Conflicts resolved:');
    for (const conflict of conflicts) {
      const overriddenPkgs = conflict.overridden.map(p => p.packageName).join(', ');
      lines.push(
        `  ${conflict.partialId}: ${conflict.winner.packageName} won (${conflict.reason}) over ${overriddenPkgs}`
      );
    }
  }

  return lines.join('\n');
}
