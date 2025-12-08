import { describe, it, expect } from 'vitest';
import {
  isValidProvider,
  shouldIncludePartialForProvider,
  isValidPackageName,
  isLocalPath,
  isValidSemver,
  createContentHash,
  createCompositionMetadata,
  generateMetadataHeader,
  parseMetadataFromHeader,
} from './utils.js';
import type { PolicyPartial } from './types.js';

describe('isValidProvider', () => {
  it('should return true for valid providers', () => {
    expect(isValidProvider('cursor')).toBe(true);
    expect(isValidProvider('copilot')).toBe(true);
  });

  it('should return false for invalid providers', () => {
    expect(isValidProvider('invalid')).toBe(false);
    expect(isValidProvider('')).toBe(false);
    expect(isValidProvider('CURSOR')).toBe(false);
  });
});

describe('shouldIncludePartialForProvider', () => {
  it('should include partial when no providers specified', () => {
    const partial = { id: 'test' };
    expect(shouldIncludePartialForProvider(partial, 'cursor')).toBe(true);
    expect(shouldIncludePartialForProvider(partial, 'copilot')).toBe(true);
  });

  it('should include partial when providers array is empty', () => {
    const partial = { id: 'test', providers: [] };
    expect(shouldIncludePartialForProvider(partial, 'cursor')).toBe(true);
  });

  it('should only include partial for specified providers', () => {
    const partial = { id: 'test', providers: ['cursor' as const] };
    expect(shouldIncludePartialForProvider(partial, 'cursor')).toBe(true);
    expect(shouldIncludePartialForProvider(partial, 'copilot')).toBe(false);
  });
});

describe('isValidPackageName', () => {
  it('should return true for valid scoped package names', () => {
    expect(isValidPackageName('@ai-policies/core')).toBe(true);
    expect(isValidPackageName('@company/my-package')).toBe(true);
    expect(isValidPackageName('@test/123')).toBe(true);
  });

  it('should return false for invalid package names', () => {
    expect(isValidPackageName('not-scoped')).toBe(false);
    expect(isValidPackageName('@invalid')).toBe(false);
    expect(isValidPackageName('@Invalid/Package')).toBe(false);
    expect(isValidPackageName('./local-path')).toBe(false);
  });
});

describe('isLocalPath', () => {
  it('should return true for local paths', () => {
    expect(isLocalPath('./local')).toBe(true);
    expect(isLocalPath('../parent')).toBe(true);
    expect(isLocalPath('/absolute/path')).toBe(true);
  });

  it('should return false for npm packages', () => {
    expect(isLocalPath('@ai-policies/core')).toBe(false);
    expect(isLocalPath('lodash')).toBe(false);
  });
});

describe('isValidSemver', () => {
  it('should return true for valid semver', () => {
    expect(isValidSemver('1.0.0')).toBe(true);
    expect(isValidSemver('2.1.3')).toBe(true);
    expect(isValidSemver('0.0.1')).toBe(true);
    expect(isValidSemver('1.0.0-beta.1')).toBe(true);
  });

  it('should return false for invalid semver', () => {
    expect(isValidSemver('1.0')).toBe(false);
    expect(isValidSemver('v1.0.0')).toBe(false);
    expect(isValidSemver('invalid')).toBe(false);
  });
});

describe('createContentHash', () => {
  it('should create consistent hash for same content', () => {
    const content = 'test content';
    const hash1 = createContentHash(content);
    const hash2 = createContentHash(content);
    expect(hash1).toBe(hash2);
  });

  it('should create different hashes for different content', () => {
    const hash1 = createContentHash('content a');
    const hash2 = createContentHash('content b');
    expect(hash1).not.toBe(hash2);
  });

  it('should return hex string', () => {
    const hash = createContentHash('test');
    expect(/^[0-9a-f]+$/.test(hash)).toBe(true);
  });
});

describe('createCompositionMetadata', () => {
  it('should create metadata with all fields', () => {
    const packages = { '@test/pkg': '1.0.0' };
    const partials: PolicyPartial[] = [
      {
        frontmatter: { id: 'test' },
        content: '# Test',
        filePath: 'test.md',
        packageName: '@test/pkg',
        packageVersion: '1.0.0',
        sourceIndex: 0,
      },
    ];
    const protectedPartials = ['test'];
    const content = '# Generated';

    const metadata = createCompositionMetadata(
      packages,
      partials,
      protectedPartials,
      content
    );

    expect(metadata.packages).toEqual(packages);
    expect(metadata.partials).toHaveLength(1);
    expect(metadata.protectedPartials).toEqual(protectedPartials);
    expect(metadata.contentHash).toBeDefined();
    expect(metadata.generatedAt).toBeDefined();
  });
});

describe('generateMetadataHeader / parseMetadataFromHeader', () => {
  it('should round-trip metadata through header', () => {
    const packages = { '@test/pkg': '2.0.0' };
    const partials: PolicyPartial[] = [
      {
        frontmatter: { id: 'rule-a' },
        content: '# Rule A',
        filePath: 'rule-a.md',
        packageName: '@test/pkg',
        packageVersion: '2.0.0',
        sourceIndex: 0,
      },
    ];
    const metadata = createCompositionMetadata(packages, partials, [], '# Content');
    
    const header = generateMetadataHeader(metadata);
    const parsed = parseMetadataFromHeader(header);

    expect(parsed).not.toBeNull();
    expect(parsed!.packages).toEqual(packages);
    expect(parsed!.partials).toEqual(metadata.partials);
    expect(parsed!.contentHash).toBe(metadata.contentHash);
  });

  it('should return null for content without metadata', () => {
    const result = parseMetadataFromHeader('# Just some content');
    expect(result).toBeNull();
  });

  it('should include package list in header', () => {
    const metadata = createCompositionMetadata(
      { '@test/a': '1.0.0', '@test/b': '2.0.0' },
      [],
      [],
      ''
    );

    const header = generateMetadataHeader(metadata);

    expect(header).toContain('@test/a@1.0.0');
    expect(header).toContain('@test/b@2.0.0');
  });
});

