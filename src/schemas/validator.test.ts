import { describe, it, expect } from 'vitest';
import {
  validateManifestConfig,
  validatePartialFrontmatter,
  validatePackageConfig,
} from './validator.js';

describe('validateManifestConfig', () => {
  it('should validate a correct manifest', () => {
    const manifest = {
      requires: {
        '@ai-policies/core': '^1.0.0',
      },
      output: {
        cursor: './.cursorrules',
        copilot: './.copilot/instructions.md',
      },
      compose: {
        order: ['core', 'domain', 'stack', 'team'],
        protectedLayers: ['core'],
        teamAppend: true,
      },
    };

    const result = validateManifestConfig(manifest);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('should reject manifest without requires', () => {
    const manifest = {
      output: {
        cursor: './.cursorrules',
      },
      compose: {
        order: ['core'],
        protectedLayers: [],
        teamAppend: true,
      },
    };

    const result = validateManifestConfig(manifest);
    expect(result.valid).toBe(false);
  });

  it('should reject manifest without any output targets', () => {
    const manifest = {
      requires: {
        '@ai-policies/core': '^1.0.0',
      },
      output: {},
      compose: {
        order: ['core'],
        protectedLayers: [],
        teamAppend: true,
      },
    };

    const result = validateManifestConfig(manifest);
    expect(result.valid).toBe(false);
    // Schema anyOf requires at least cursor or copilot
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it('should reject invalid package name format', () => {
    const manifest = {
      requires: {
        'invalid-package': '^1.0.0', // Missing @ scope - doesn't match schema pattern
      },
      output: {
        cursor: './.cursorrules',
      },
      compose: {
        order: ['core'],
        protectedLayers: [],
        teamAppend: true,
      },
    };

    const result = validateManifestConfig(manifest);
    // Schema patternProperties + additionalProperties:false rejects unmatched names
    expect(result.valid).toBe(false);
  });

  it('should reject protected layer not in order', () => {
    const manifest = {
      requires: {
        '@ai-policies/core': '^1.0.0',
      },
      output: {
        cursor: './.cursorrules',
      },
      compose: {
        order: ['core', 'domain'],
        protectedLayers: ['stack'], // stack not in order
        teamAppend: true,
      },
    };

    const result = validateManifestConfig(manifest);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.message.includes('Protected layer'))).toBe(
      true
    );
  });
});

describe('validatePartialFrontmatter', () => {
  it('should validate correct frontmatter', () => {
    const frontmatter = {
      id: 'core-safety',
      layer: 'core',
      weight: 10,
      protected: true,
      dependsOn: [],
      owner: 'security-team',
    };

    const result = validatePartialFrontmatter(frontmatter);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('should reject missing required fields', () => {
    const frontmatter = {
      id: 'core-safety',
      layer: 'core',
      // Missing: weight, protected, dependsOn, owner
    };

    const result = validatePartialFrontmatter(frontmatter);
    expect(result.valid).toBe(false);
  });

  it('should reject invalid layer', () => {
    const frontmatter = {
      id: 'test-partial',
      layer: 'invalid-layer',
      weight: 10,
      protected: false,
      dependsOn: [],
      owner: 'team',
    };

    const result = validatePartialFrontmatter(frontmatter);
    expect(result.valid).toBe(false);
  });

  it('should reject self-dependency', () => {
    const frontmatter = {
      id: 'test-partial',
      layer: 'core',
      weight: 10,
      protected: false,
      dependsOn: ['test-partial'], // Self-dependency
      owner: 'team',
    };

    const result = validatePartialFrontmatter(frontmatter);
    expect(result.valid).toBe(false);
    expect(
      result.errors.some(e => e.message.includes('cannot depend on itself'))
    ).toBe(true);
  });

  it('should warn on high weight for core layer', () => {
    const frontmatter = {
      id: 'test-partial',
      layer: 'core',
      weight: 150, // Weight > 100 for core layer
      protected: false,
      dependsOn: [],
      owner: 'team',
    };

    const result = validatePartialFrontmatter(frontmatter);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.message.includes('weight'))).toBe(true);
  });
});

describe('validatePackageConfig', () => {
  it('should validate correct package config', () => {
    const config = {
      name: '@ai-policies/core',
      version: '1.0.0',
      description: 'Core policies',
      'ai-policies': {
        partials: {
          cursor: 'cursor/partials',
          copilot: 'copilot/partials',
        },
      },
    };

    const result = validatePackageConfig(config);
    expect(result.valid).toBe(true);
  });

  it('should reject missing name', () => {
    const config = {
      version: '1.0.0',
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
