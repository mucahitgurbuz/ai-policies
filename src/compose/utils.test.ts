import { describe, it, expect } from 'vitest';
import type { PolicyPartial } from '../schemas/types.js';
import {
  deduplicatePartials,
  sortPartialsBySourceIndex,
  filterPartialsByTags,
  groupPartialsByPackage,
  getPartialStatistics,
  createCompositionSummary,
} from './utils.js';

// Helper to create mock partials
function createMockPartial(
  id: string,
  sourceIndex: number,
  packageName: string = '@test/package',
  tags: string[] = []
): PolicyPartial {
  return {
    frontmatter: {
      id,
      owner: 'test-team',
      tags: tags.length > 0 ? tags : undefined,
    },
    content: `# ${id}\n\nContent for ${id}`,
    filePath: `${id}.md`,
    packageName,
    packageVersion: '1.0.0',
    sourceIndex,
  };
}

describe('deduplicatePartials', () => {
  it('should return partials as-is when no duplicates', () => {
    const partials = [
      createMockPartial('rule-a', 0),
      createMockPartial('rule-b', 1),
    ];

    const result = deduplicatePartials(partials, []);

    expect(result.partials).toHaveLength(2);
    expect(result.conflicts).toHaveLength(0);
  });

  it('should use "last wins" for duplicate IDs', () => {
    const partials = [
      { ...createMockPartial('same-id', 0), packageName: '@test/first' },
      { ...createMockPartial('same-id', 1), packageName: '@test/second' },
    ];

    const result = deduplicatePartials(partials, []);

    expect(result.partials).toHaveLength(1);
    expect(result.partials[0].packageName).toBe('@test/second');
    expect(result.conflicts).toHaveLength(1);
    expect(result.conflicts[0].reason).toBe('last-wins');
  });

  it('should preserve protected partials (first occurrence)', () => {
    const partials = [
      { ...createMockPartial('protected-id', 0), packageName: '@test/first' },
      { ...createMockPartial('protected-id', 1), packageName: '@test/second' },
    ];

    const result = deduplicatePartials(partials, ['protected-id']);

    expect(result.partials).toHaveLength(1);
    expect(result.partials[0].packageName).toBe('@test/first');
    expect(result.conflicts[0].reason).toBe('protected');
    expect(result.protectedWarnings).toHaveLength(1);
  });

  it('should handle multiple duplicates with same ID', () => {
    const partials = [
      { ...createMockPartial('multi-id', 0), packageName: '@test/first' },
      { ...createMockPartial('multi-id', 1), packageName: '@test/second' },
      { ...createMockPartial('multi-id', 2), packageName: '@test/third' },
    ];

    const result = deduplicatePartials(partials, []);

    expect(result.partials).toHaveLength(1);
    expect(result.partials[0].packageName).toBe('@test/third');
    expect(result.conflicts[0].overridden).toHaveLength(2);
  });
});

describe('sortPartialsBySourceIndex', () => {
  it('should sort partials by source index ascending', () => {
    const partials = [
      createMockPartial('c', 2),
      createMockPartial('a', 0),
      createMockPartial('b', 1),
    ];

    const result = sortPartialsBySourceIndex(partials);

    expect(result[0].frontmatter.id).toBe('a');
    expect(result[1].frontmatter.id).toBe('b');
    expect(result[2].frontmatter.id).toBe('c');
  });

  it('should not mutate original array', () => {
    const partials = [createMockPartial('b', 1), createMockPartial('a', 0)];
    const original = [...partials];

    sortPartialsBySourceIndex(partials);

    expect(partials).toEqual(original);
  });
});

describe('filterPartialsByTags', () => {
  it('should filter partials by any matching tag', () => {
    const partials = [
      createMockPartial('a', 0, '@test/pkg', ['security']),
      createMockPartial('b', 1, '@test/pkg', ['react']),
      createMockPartial('c', 2, '@test/pkg', ['security', 'react']),
    ];

    const result = filterPartialsByTags(partials, ['security'], 'any');

    expect(result).toHaveLength(2);
    expect(result.map(p => p.frontmatter.id)).toContain('a');
    expect(result.map(p => p.frontmatter.id)).toContain('c');
  });

  it('should filter partials by all matching tags', () => {
    const partials = [
      createMockPartial('a', 0, '@test/pkg', ['security']),
      createMockPartial('b', 1, '@test/pkg', ['react']),
      createMockPartial('c', 2, '@test/pkg', ['security', 'react']),
    ];

    const result = filterPartialsByTags(partials, ['security', 'react'], 'all');

    expect(result).toHaveLength(1);
    expect(result[0].frontmatter.id).toBe('c');
  });

  it('should return all partials when no tags specified', () => {
    const partials = [
      createMockPartial('a', 0, '@test/pkg', ['security']),
      createMockPartial('b', 1, '@test/pkg', ['react']),
    ];

    const result = filterPartialsByTags(partials, [], 'any');

    expect(result).toHaveLength(2);
  });
});

describe('groupPartialsByPackage', () => {
  it('should group partials by package name', () => {
    const partials = [
      createMockPartial('a', 0, '@test/pkg1'),
      createMockPartial('b', 1, '@test/pkg2'),
      createMockPartial('c', 2, '@test/pkg1'),
    ];

    const result = groupPartialsByPackage(partials);

    expect(result.get('@test/pkg1')).toHaveLength(2);
    expect(result.get('@test/pkg2')).toHaveLength(1);
  });
});

describe('getPartialStatistics', () => {
  it('should calculate correct statistics', () => {
    const partials = [
      createMockPartial('a', 0, '@test/pkg1', ['security']),
      createMockPartial('b', 1, '@test/pkg2', ['react']),
      createMockPartial('c', 2, '@test/pkg1', ['security']),
    ];

    const stats = getPartialStatistics(partials);

    expect(stats.total).toBe(3);
    expect(stats.byPackage.get('@test/pkg1')).toBe(2);
    expect(stats.byPackage.get('@test/pkg2')).toBe(1);
    expect(stats.tagsUsed.has('security')).toBe(true);
    expect(stats.tagsUsed.has('react')).toBe(true);
  });
});

describe('createCompositionSummary', () => {
  it('should create summary with conflict info', () => {
    const partials = [createMockPartial('a', 0, '@test/pkg1')];

    const conflicts = [
      {
        partialId: 'conflict-id',
        winner: createMockPartial('conflict-id', 1, '@test/winner'),
        overridden: [createMockPartial('conflict-id', 0, '@test/loser')],
        reason: 'last-wins' as const,
      },
    ];

    const summary = createCompositionSummary(partials, conflicts);

    expect(summary).toContain('Total partials: 1');
    expect(summary).toContain('Conflicts resolved');
    expect(summary).toContain('@test/winner');
    expect(summary).toContain('last-wins');
  });
});
