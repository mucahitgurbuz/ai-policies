import { describe, it, expect } from 'vitest';
import type { PolicyPartial, ManifestConfig } from '@ai-policies/core-schemas';
import { PolicyComposer, createComposer, composePartials } from './composer.js';

// Helper to create mock partials
function createMockPartial(
  id: string,
  layer: 'core' | 'domain' | 'stack' | 'team' = 'core',
  weight: number = 10,
  content: string = '',
  dependsOn: string[] = []
): PolicyPartial {
  return {
    frontmatter: {
      id,
      layer,
      weight,
      protected: false,
      dependsOn,
      owner: 'test-team',
    },
    content: content || `# ${id}\n\nContent for ${id}`,
    filePath: `${id}.md`,
    packageName: '@ai-policies/test',
    packageVersion: '1.0.0',
  };
}

// Default test config
const testConfig: ManifestConfig = {
  requires: {
    '@ai-policies/test': '^1.0.0',
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

describe('PolicyComposer', () => {
  it('should create a composer instance', () => {
    const composer = createComposer();
    expect(composer).toBeInstanceOf(PolicyComposer);
  });

  it('should compose partials into content', async () => {
    const composer = createComposer();
    const partials = [
      createMockPartial('core-safety', 'core', 10, '# Core Safety\n\n- Rule 1\n- Rule 2'),
    ];

    const result = await composer.compose(partials, testConfig, { provider: 'cursor' });

    expect(result.content).toContain('Core Safety');
    expect(result.content).toContain('Rule 1');
    expect(result.metadata).toBeDefined();
    expect(result.metadata.packages).toBeDefined();
  });

  it('should order partials by layer priority', async () => {
    const composer = createComposer();
    const partials = [
      createMockPartial('team-rules', 'team', 10, '# Team Rules'),
      createMockPartial('core-safety', 'core', 10, '# Core Safety'),
      createMockPartial('stack-react', 'stack', 10, '# React Rules'),
    ];

    const result = await composer.compose(partials, testConfig, { provider: 'cursor' });

    // Core should come before stack, stack before team
    const coreIndex = result.content.indexOf('Core Safety');
    const stackIndex = result.content.indexOf('React Rules');
    const teamIndex = result.content.indexOf('Team Rules');

    expect(coreIndex).toBeLessThan(stackIndex);
    expect(stackIndex).toBeLessThan(teamIndex);
  });

  it('should order partials by weight within same layer', async () => {
    const composer = createComposer();
    const partials = [
      createMockPartial('second', 'core', 20, '# Second'),
      createMockPartial('first', 'core', 10, '# First'),
      createMockPartial('third', 'core', 30, '# Third'),
    ];

    const result = await composer.compose(partials, testConfig, { provider: 'cursor' });

    const firstIndex = result.content.indexOf('First');
    const secondIndex = result.content.indexOf('Second');
    const thirdIndex = result.content.indexOf('Third');

    expect(firstIndex).toBeLessThan(secondIndex);
    expect(secondIndex).toBeLessThan(thirdIndex);
  });

  it('should include team append content when enabled', async () => {
    const composer = createComposer();
    const partials = [
      createMockPartial('core-safety', 'core', 10, '# Core Safety'),
    ];

    const configWithTeamAppend = {
      ...testConfig,
      compose: {
        ...testConfig.compose,
        teamAppend: true,
      },
    };

    const result = await composer.compose(partials, configWithTeamAppend, {
      provider: 'cursor',
      teamAppendContent: '## Custom Team Rules\n\n- Our special rule',
    });

    expect(result.content).toContain('Custom Team Rules');
    expect(result.content).toContain('Our special rule');
  });

  it('should exclude specified partials', async () => {
    const composer = createComposer();
    const partials = [
      createMockPartial('include-me', 'core', 10, '# Include Me'),
      createMockPartial('exclude-me', 'core', 20, '# Exclude Me'),
    ];

    const result = await composer.compose(partials, testConfig, {
      provider: 'cursor',
      excludePartials: ['exclude-me'],
    });

    expect(result.content).toContain('Include Me');
    expect(result.content).not.toContain('Exclude Me');
  });

  it('should generate metadata with content hash', async () => {
    const composer = createComposer();
    const partials = [
      createMockPartial('core-safety', 'core', 10, '# Core Safety'),
    ];

    const result = await composer.compose(partials, testConfig, { provider: 'cursor' });

    expect(result.metadata.contentHash).toBeDefined();
    expect(result.metadata.contentHash.length).toBeGreaterThan(0);
    expect(result.metadata.generatedAt).toBeDefined();
    expect(result.metadata.packages).toEqual({ '@ai-policies/test': '1.0.0' });
  });

  it('should handle empty partials list', async () => {
    const composer = createComposer();

    const result = await composer.compose([], testConfig, { provider: 'cursor' });

    expect(result.content).toBeDefined();
    expect(result.metadata).toBeDefined();
  });
});

describe('composePartials convenience function', () => {
  it('should compose partials using the convenience function', async () => {
    const partials = [
      createMockPartial('core-safety', 'core', 10, '# Core Safety'),
    ];

    const result = await composePartials(partials, testConfig, 'cursor');

    expect(result.content).toContain('Core Safety');
    expect(result.metadata).toBeDefined();
  });
});

describe('PolicyComposer.validateInputs', () => {
  it('should detect duplicate partial IDs within same package', () => {
    const composer = createComposer();
    const partials = [
      createMockPartial('same-id', 'core', 10),
      { ...createMockPartial('same-id', 'core', 20) }, // Duplicate ID
    ];

    const errors = composer.validateInputs(partials, testConfig);

    expect(errors.length).toBeGreaterThan(0);
    expect(errors.some(e => e.message.includes('Duplicate partial ID'))).toBe(true);
  });

  it('should detect invalid layer in partial', () => {
    const composer = createComposer();
    const partial = createMockPartial('test', 'core', 10);
    (partial.frontmatter as any).layer = 'invalid';
    const partials = [partial];

    const errors = composer.validateInputs(partials, testConfig);

    expect(errors.length).toBeGreaterThan(0);
    expect(errors.some(e => e.message.includes('not in compose.order'))).toBe(true);
  });

  it('should return no errors for valid partials', () => {
    const composer = createComposer();
    const partials = [
      createMockPartial('core-safety', 'core', 10),
      createMockPartial('react-hooks', 'stack', 20),
    ];

    const errors = composer.validateInputs(partials, testConfig);

    expect(errors).toHaveLength(0);
  });
});

