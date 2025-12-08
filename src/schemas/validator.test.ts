import { describe, it, expect } from 'vitest';
import {
  validateManifestConfig,
  validatePartialFrontmatter,
  validatePackageConfig,
} from './validator.js';

describe('validateManifestConfig', () => {
  it('should validate a correct manifest', () => {
    const manifest = {
      extends: ['@ai-policies/core', '@ai-policies/frontend-react'],
      output: {
        cursor: './.cursorrules',
        copilot: './.copilot/instructions.md',
      },
      protected: ['core-safety'],
    };

    const result = validateManifestConfig(manifest);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('should validate manifest with local paths', () => {
    const manifest = {
      extends: ['@ai-policies/core', './team-policies'],
      output: {
        cursor: './.cursorrules',
      },
    };

    const result = validateManifestConfig(manifest);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('should reject manifest without extends', () => {
    const manifest = {
      output: {
        cursor: './.cursorrules',
      },
    };

    const result = validateManifestConfig(manifest);
    expect(result.valid).toBe(false);
  });

  it('should reject manifest with non-array extends (legacy format)', () => {
    const manifest = {
      extends: {
        '@ai-policies/core': '^1.0.0', // legacy format - should fail
      },
      output: {
        cursor: './.cursorrules',
      },
    };

    const result = validateManifestConfig(manifest);
    expect(result.valid).toBe(false);
  });

  it('should reject manifest without any output targets', () => {
    const manifest = {
      extends: ['@ai-policies/core'],
      output: {},
    };

    const result = validateManifestConfig(manifest);
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it('should reject duplicate extends entries', () => {
    const manifest = {
      extends: ['@ai-policies/core', '@ai-policies/core'], // duplicate
      output: {
        cursor: './.cursorrules',
      },
    };

    const result = validateManifestConfig(manifest);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.message.includes('Duplicate'))).toBe(true);
  });

  it('should accept manifest with exclude array', () => {
    const manifest = {
      extends: ['@ai-policies/core'],
      output: {
        cursor: './.cursorrules',
      },
      exclude: ['some-partial'],
    };

    const result = validateManifestConfig(manifest);
    expect(result.valid).toBe(true);
  });
});

describe('validatePartialFrontmatter', () => {
  it('should validate correct frontmatter', () => {
    const frontmatter = {
      id: 'core-safety',
      description: 'Core safety rules',
      owner: 'security-team',
      tags: ['security', 'required'],
    };

    const result = validatePartialFrontmatter(frontmatter);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('should validate minimal frontmatter (only id required)', () => {
    const frontmatter = {
      id: 'simple-partial',
    };

    const result = validatePartialFrontmatter(frontmatter);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('should reject missing id', () => {
    const frontmatter = {
      owner: 'team',
    };

    const result = validatePartialFrontmatter(frontmatter);
    expect(result.valid).toBe(false);
  });

  it('should reject invalid id format', () => {
    const frontmatter = {
      id: 'Invalid-ID', // Uppercase not allowed
    };

    const result = validatePartialFrontmatter(frontmatter);
    expect(result.valid).toBe(false);
  });

  it('should accept valid providers array', () => {
    const frontmatter = {
      id: 'cursor-only',
      providers: ['cursor'],
    };

    const result = validatePartialFrontmatter(frontmatter);
    expect(result.valid).toBe(true);
  });

  it('should reject invalid provider', () => {
    const frontmatter = {
      id: 'test-partial',
      providers: ['invalid-provider'],
    };

    const result = validatePartialFrontmatter(frontmatter);
    expect(result.valid).toBe(false);
  });

  it('should reject legacy frontmatter fields', () => {
    const frontmatter = {
      id: 'test-partial',
      layer: 'core', // legacy field - should be rejected
      weight: 10, // legacy field - should be rejected
    };

    const result = validatePartialFrontmatter(frontmatter);
    expect(result.valid).toBe(false); // additionalProperties: false
  });
});

describe('validatePackageConfig', () => {
  it('should validate correct package config', () => {
    const config = {
      name: '@ai-policies/core',
      version: '2.0.0',
      description: 'Core policies',
      'ai-policies': {
        partials: './partials',
      },
    };

    const result = validatePackageConfig(config);
    expect(result.valid).toBe(true);
  });

  it('should reject missing name', () => {
    const config = {
      version: '2.0.0',
    };

    const result = validatePackageConfig(config);
    expect(result.valid).toBe(false);
  });

  it('should reject invalid version format', () => {
    const config = {
      name: '@ai-policies/core',
      version: 'invalid',
    };

    const result = validatePackageConfig(config);
    expect(result.valid).toBe(false);
  });
});
