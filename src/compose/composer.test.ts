import { describe, it, expect } from 'vitest';
import type { PolicyPartial, ManifestConfig } from '../schemas/types.js';
import { PolicyComposer, createComposer, composePartials } from './composer.js';

// Helper to create mock partials
function createMockPartial(
  id: string,
  sourceIndex: number = 0,
  content: string = ''
): PolicyPartial {
  return {
    frontmatter: {
      id,
      owner: 'test-team',
    },
    content: content || `# ${id}\n\nContent for ${id}`,
    filePath: `${id}.md`,
    packageName: '@ai-policies/test',
    packageVersion: '1.0.0',
    sourceIndex,
  };
}

// Default test config
const testConfig: ManifestConfig = {
  extends: ['@ai-policies/test'],
  output: {
    cursor: './.cursorrules',
    copilot: './.copilot/instructions.md',
  },
  protected: ['core-safety'],
};

describe('PolicyComposer', () => {
  it('should create a composer instance', () => {
    const composer = createComposer();
    expect(composer).toBeInstanceOf(PolicyComposer);
  });

  it('should compose partials into content', async () => {
    const composer = createComposer();
    const partials = [
      createMockPartial(
        'core-safety',
        0,
        '# Core Safety\n\n- Rule 1\n- Rule 2'
      ),
    ];

    const result = await composer.compose(partials, testConfig, {
      provider: 'cursor',
    });

    expect(result.content).toContain('Core Safety');
    expect(result.content).toContain('Rule 1');
    expect(result.metadata).toBeDefined();
    expect(result.metadata.packages).toBeDefined();
  });

  it('should order partials by source index (extends array order)', async () => {
    const composer = createComposer();
    const partials = [
      createMockPartial('third-rules', 2, '# Third Rules'),
      createMockPartial('core-safety', 0, '# Core Safety'),
      createMockPartial('second-rules', 1, '# Second Rules'),
    ];

    const result = await composer.compose(partials, testConfig, {
      provider: 'cursor',
    });

    // Lower sourceIndex should come first
    const coreIndex = result.content.indexOf('Core Safety');
    const secondIndex = result.content.indexOf('Second Rules');
    const thirdIndex = result.content.indexOf('Third Rules');

    expect(coreIndex).toBeLessThan(secondIndex);
    expect(secondIndex).toBeLessThan(thirdIndex);
  });

  it('should use "last wins" for duplicate IDs', async () => {
    const composer = createComposer();
    const partials = [
      {
        ...createMockPartial('same-id', 0, '# First Version'),
        packageName: '@ai-policies/first',
      },
      {
        ...createMockPartial('same-id', 1, '# Second Version'),
        packageName: '@ai-policies/second',
      },
    ];

    const result = await composer.compose(partials, testConfig, {
      provider: 'cursor',
    });

    // Last one (higher sourceIndex) should win
    expect(result.content).toContain('Second Version');
    expect(result.content).not.toContain('First Version');
  });

  it('should preserve protected partials', async () => {
    const composer = createComposer();
    const partials = [
      {
        ...createMockPartial('core-safety', 0, '# Protected Version'),
        packageName: '@ai-policies/first',
      },
      {
        ...createMockPartial('core-safety', 1, '# Override Attempt'),
        packageName: '@ai-policies/second',
      },
    ];

    const configWithProtected = {
      ...testConfig,
      protected: ['core-safety'],
    };

    const result = await composer.compose(partials, configWithProtected, {
      provider: 'cursor',
    });

    // Protected partial should be preserved (first version wins)
    expect(result.content).toContain('Protected Version');
    expect(result.content).not.toContain('Override Attempt');
  });

  it('should exclude specified partials', async () => {
    const composer = createComposer();
    const partials = [
      createMockPartial('include-me', 0, '# Include Me'),
      createMockPartial('exclude-me', 1, '# Exclude Me'),
    ];

    const result = await composer.compose(partials, testConfig, {
      provider: 'cursor',
      exclude: ['exclude-me'],
    });

    expect(result.content).toContain('Include Me');
    expect(result.content).not.toContain('Exclude Me');
  });

  it('should generate metadata with content hash', async () => {
    const composer = createComposer();
    const partials = [createMockPartial('core-safety', 0, '# Core Safety')];

    const result = await composer.compose(partials, testConfig, {
      provider: 'cursor',
    });

    expect(result.metadata.contentHash).toBeDefined();
    expect(result.metadata.contentHash.length).toBeGreaterThan(0);
    expect(result.metadata.generatedAt).toBeDefined();
    expect(result.metadata.packages).toEqual({ '@ai-policies/test': '1.0.0' });
  });

  it('should handle empty partials list', async () => {
    const composer = createComposer();

    const result = await composer.compose([], testConfig, {
      provider: 'cursor',
    });

    expect(result.content).toBeDefined();
    expect(result.metadata).toBeDefined();
  });

  it('should track protected partials in metadata', async () => {
    const composer = createComposer();
    const partials = [createMockPartial('core-safety', 0, '# Core Safety')];

    const result = await composer.compose(partials, testConfig, {
      provider: 'cursor',
      protected: ['core-safety'],
    });

    expect(result.metadata.protectedPartials).toContain('core-safety');
  });
});

describe('composePartials convenience function', () => {
  it('should compose partials using the convenience function', async () => {
    const partials = [createMockPartial('core-safety', 0, '# Core Safety')];

    const result = await composePartials(partials, testConfig, 'cursor');

    expect(result.content).toContain('Core Safety');
    expect(result.metadata).toBeDefined();
  });
});

describe('PolicyComposer.validateInputs', () => {
  it('should detect duplicate partial IDs within same package', () => {
    const composer = createComposer();
    const partials = [
      createMockPartial('same-id', 0),
      createMockPartial('same-id', 1), // Duplicate ID in same package
    ];

    const errors = composer.validateInputs(partials, testConfig);

    expect(errors.length).toBeGreaterThan(0);
    expect(errors.some(e => e.message.includes('Duplicate partial ID'))).toBe(
      true
    );
  });

  it('should warn about protected partials not found', () => {
    const composer = createComposer();
    const partials = [createMockPartial('other-partial', 0)];

    const configWithMissingProtected = {
      ...testConfig,
      protected: ['non-existent-partial'],
    };

    const errors = composer.validateInputs(
      partials,
      configWithMissingProtected
    );

    expect(errors.length).toBeGreaterThan(0);
    expect(errors.some(e => e.message.includes('not found'))).toBe(true);
  });

  it('should return no errors for valid partials', () => {
    const composer = createComposer();
    const partials = [
      createMockPartial('core-safety', 0),
      createMockPartial('react-hooks', 1),
    ];

    const errors = composer.validateInputs(partials, testConfig);

    expect(errors).toHaveLength(0);
  });
});
