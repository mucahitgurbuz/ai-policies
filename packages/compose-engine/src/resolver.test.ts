import { describe, it, expect } from 'vitest';
import type { PolicyPartial } from '@ai-policies/core-schemas';
import {
  resolveDependencies,
  validateDependencyChain,
  getAllDependencies,
  getDependents,
} from './resolver.js';

// Helper to create mock partials
function createMockPartial(
  id: string,
  dependsOn: string[] = [],
  layer: 'core' | 'domain' | 'stack' | 'team' = 'core'
): PolicyPartial {
  return {
    frontmatter: {
      id,
      layer,
      weight: 10,
      protected: false,
      dependsOn,
      owner: 'test-team',
    },
    content: `# ${id}\n\nContent for ${id}`,
    filePath: `${id}.md`,
    packageName: '@ai-policies/test',
    packageVersion: '1.0.0',
  };
}

describe('resolveDependencies', () => {
  it('should resolve partials with no dependencies', () => {
    const partials = [
      createMockPartial('a'),
      createMockPartial('b'),
      createMockPartial('c'),
    ];

    const result = resolveDependencies(partials);

    expect(result.resolved).toHaveLength(3);
    expect(result.circular).toHaveLength(0);
    expect(result.missing).toHaveLength(0);
  });

  it('should resolve partials in dependency order', () => {
    const partials = [
      createMockPartial('c', ['b']),
      createMockPartial('b', ['a']),
      createMockPartial('a'),
    ];

    const result = resolveDependencies(partials);

    expect(result.resolved).toHaveLength(3);
    expect(result.circular).toHaveLength(0);
    expect(result.missing).toHaveLength(0);

    // 'a' should come before 'b', and 'b' should come before 'c'
    const ids = result.resolved.map(p => p.frontmatter.id);
    expect(ids.indexOf('a')).toBeLessThan(ids.indexOf('b'));
    expect(ids.indexOf('b')).toBeLessThan(ids.indexOf('c'));
  });

  it('should detect circular dependencies', () => {
    const partials = [
      createMockPartial('a', ['c']),
      createMockPartial('b', ['a']),
      createMockPartial('c', ['b']),
    ];

    const result = resolveDependencies(partials);

    expect(result.circular.length).toBeGreaterThan(0);
  });

  it('should detect missing dependencies', () => {
    const partials = [
      createMockPartial('a', ['nonexistent']),
      createMockPartial('b'),
    ];

    const result = resolveDependencies(partials);

    expect(result.missing).toHaveLength(1);
    expect(result.missing[0].partialId).toBe('a');
    expect(result.missing[0].missingDeps).toContain('nonexistent');
  });

  it('should handle complex dependency graphs', () => {
    const partials = [
      createMockPartial('d', ['b', 'c']),
      createMockPartial('c', ['a']),
      createMockPartial('b', ['a']),
      createMockPartial('a'),
    ];

    const result = resolveDependencies(partials);

    expect(result.resolved).toHaveLength(4);
    expect(result.circular).toHaveLength(0);
    expect(result.missing).toHaveLength(0);

    // 'a' should come before 'b', 'c', and 'd'
    const ids = result.resolved.map(p => p.frontmatter.id);
    expect(ids.indexOf('a')).toBeLessThan(ids.indexOf('b'));
    expect(ids.indexOf('a')).toBeLessThan(ids.indexOf('c'));
    expect(ids.indexOf('b')).toBeLessThan(ids.indexOf('d'));
    expect(ids.indexOf('c')).toBeLessThan(ids.indexOf('d'));
  });
});

describe('validateDependencyChain', () => {
  it('should return true for valid dependency chain', () => {
    const partials = [
      createMockPartial('a'),
      createMockPartial('b', ['a']),
      createMockPartial('c', ['b']),
    ];

    expect(validateDependencyChain(partials)).toBe(true);
  });

  it('should return false for circular dependencies', () => {
    const partials = [
      createMockPartial('a', ['b']),
      createMockPartial('b', ['a']),
    ];

    expect(validateDependencyChain(partials)).toBe(false);
  });

  it('should return false for missing dependencies', () => {
    const partials = [createMockPartial('a', ['missing'])];

    expect(validateDependencyChain(partials)).toBe(false);
  });
});

describe('getAllDependencies', () => {
  it('should return all recursive dependencies', () => {
    const partials = [
      createMockPartial('a'),
      createMockPartial('b', ['a']),
      createMockPartial('c', ['b']),
      createMockPartial('d', ['c']),
    ];

    const deps = getAllDependencies('d', partials);

    expect(deps).toContain('a');
    expect(deps).toContain('b');
    expect(deps).toContain('c');
    expect(deps).not.toContain('d');
  });

  it('should handle partials with no dependencies', () => {
    const partials = [createMockPartial('a')];

    const deps = getAllDependencies('a', partials);
    expect(deps).toHaveLength(0);
  });
});

describe('getDependents', () => {
  it('should return all partials that depend on a given partial', () => {
    const partials = [
      createMockPartial('a'),
      createMockPartial('b', ['a']),
      createMockPartial('c', ['a']),
      createMockPartial('d', ['b']),
    ];

    const dependents = getDependents('a', partials);

    expect(dependents).toHaveLength(2);
    expect(dependents.map(p => p.frontmatter.id)).toContain('b');
    expect(dependents.map(p => p.frontmatter.id)).toContain('c');
  });

  it('should return empty array if no dependents', () => {
    const partials = [createMockPartial('a'), createMockPartial('b')];

    const dependents = getDependents('a', partials);
    expect(dependents).toHaveLength(0);
  });
});
