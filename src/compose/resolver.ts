import type { PolicyPartial } from '../schemas/types.js';
import { detectCircularDependencies } from '../schemas/utils.js';
import type { DependencyResolutionResult } from './types.js';

/**
 * Resolve partial dependencies using topological sort
 */
export function resolveDependencies(
  partials: PolicyPartial[]
): DependencyResolutionResult {
  const partialMap = new Map<string, PolicyPartial>();
  const dependencyGraph = new Map<string, string[]>();

  // Build maps
  for (const partial of partials) {
    partialMap.set(partial.frontmatter.id, partial);
    dependencyGraph.set(partial.frontmatter.id, partial.frontmatter.dependsOn);
  }

  // Detect circular dependencies
  const circular = detectCircularDependencies(partials.map(p => p.frontmatter));

  // Find missing dependencies
  const missing: Array<{ partialId: string; missingDeps: string[] }> = [];
  for (const partial of partials) {
    const missingDeps = partial.frontmatter.dependsOn.filter(
      dep => !partialMap.has(dep)
    );

    if (missingDeps.length > 0) {
      missing.push({
        partialId: partial.frontmatter.id,
        missingDeps,
      });
    }
  }

  // Perform topological sort
  const resolved = topologicalSort(partials, dependencyGraph);

  return {
    resolved,
    circular,
    missing,
  };
}

/**
 * Topological sort implementation
 */
function topologicalSort(
  partials: PolicyPartial[],
  dependencyGraph: Map<string, string[]>
): PolicyPartial[] {
  const visited = new Set<string>();
  const visiting = new Set<string>();
  const result: PolicyPartial[] = [];
  const partialMap = new Map<string, PolicyPartial>();

  // Build partial map
  for (const partial of partials) {
    partialMap.set(partial.frontmatter.id, partial);
  }

  function visit(partialId: string): void {
    if (visiting.has(partialId)) {
      // Skip circular dependencies - they'll be handled elsewhere
      return;
    }

    if (visited.has(partialId)) {
      return;
    }

    visiting.add(partialId);

    const dependencies = dependencyGraph.get(partialId) || [];
    for (const dep of dependencies) {
      if (partialMap.has(dep)) {
        visit(dep);
      }
    }

    visiting.delete(partialId);
    visited.add(partialId);

    const partial = partialMap.get(partialId);
    if (partial) {
      result.push(partial);
    }
  }

  // Visit all partials
  for (const partial of partials) {
    if (!visited.has(partial.frontmatter.id)) {
      visit(partial.frontmatter.id);
    }
  }

  return result;
}

/**
 * Check if a dependency chain is valid
 */
export function validateDependencyChain(partials: PolicyPartial[]): boolean {
  const result = resolveDependencies(partials);
  return result.circular.length === 0 && result.missing.length === 0;
}

/**
 * Get all dependencies for a partial (recursive)
 */
export function getAllDependencies(
  partialId: string,
  partials: PolicyPartial[]
): string[] {
  const partialMap = new Map<string, PolicyPartial>();
  for (const partial of partials) {
    partialMap.set(partial.frontmatter.id, partial);
  }

  const visited = new Set<string>();
  const dependencies: string[] = [];

  function collectDeps(id: string): void {
    if (visited.has(id)) return;
    visited.add(id);

    const partial = partialMap.get(id);
    if (!partial) return;

    for (const dep of partial.frontmatter.dependsOn) {
      dependencies.push(dep);
      collectDeps(dep);
    }
  }

  collectDeps(partialId);

  return [...new Set(dependencies)];
}

/**
 * Get all partials that depend on a given partial
 */
export function getDependents(
  partialId: string,
  partials: PolicyPartial[]
): PolicyPartial[] {
  return partials.filter(partial =>
    partial.frontmatter.dependsOn.includes(partialId)
  );
}
