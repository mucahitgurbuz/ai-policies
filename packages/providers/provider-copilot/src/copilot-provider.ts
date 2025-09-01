import type { PolicyPartial, CompositionResult } from '@ai-policies/core-schemas';
import { formatCopilotInstructions } from './formatter.js';
import { generateCopilotTemplate } from './templates.js';

export interface CopilotProviderOptions {
  /** Include safety constraints section */
  includeSafetyConstraints?: boolean;

  /** Include prompt templates */
  includePromptTemplates?: boolean;

  /** Include code examples */
  includeCodeExamples?: boolean;

  /** Custom template variables */
  templateVariables?: Record<string, string>;

  /** Organization-specific guidelines */
  organizationGuidelines?: string[];
}

/**
 * GitHub Copilot provider for rendering instructions.md files
 */
export class CopilotProvider {
  private options: Required<CopilotProviderOptions>;

  constructor(options: CopilotProviderOptions = {}) {
    this.options = {
      includeSafetyConstraints: true,
      includePromptTemplates: true,
      includeCodeExamples: true,
      templateVariables: {},
      organizationGuidelines: [],
      ...options,
    };
  }

  /**
   * Render composition result to Copilot instructions format
   */
  render(compositionResult: CompositionResult): string {
    const { content, metadata } = compositionResult;

    // Apply Copilot-specific formatting
    const formattedContent = formatCopilotInstructions(content, {
      includeSafetyConstraints: this.options.includeSafetyConstraints,
      includePromptTemplates: this.options.includePromptTemplates,
    });

    // Generate using template
    const copilotInstructions = generateCopilotTemplate({
      content: formattedContent,
      metadata,
      options: this.options,
    });

    return copilotInstructions;
  }

  /**
   * Validate that content is suitable for Copilot
   */
  validate(content: string): Array<{ message: string; severity: 'error' | 'warning' }> {
    const issues: Array<{ message: string; severity: 'error' | 'warning' }> = [];

    // Check file size (GitHub has limits)
    if (content.length > 500000) {
      issues.push({
        message: 'Copilot instructions file is very large (>500KB). GitHub may not process it correctly.',
        severity: 'error',
      });
    }

    // Check for required sections
    if (!content.includes('# ') && !content.includes('## ')) {
      issues.push({
        message: 'No section headers found. Copilot works better with structured content.',
        severity: 'warning',
      });
    }

    // Check for potentially sensitive information
    const sensitivePatterns = [
      /api[_-]?key/i,
      /password/i,
      /secret/i,
      /token/i,
      /credential/i,
    ];

    for (const pattern of sensitivePatterns) {
      if (pattern.test(content)) {
        issues.push({
          message: \`Content may contain sensitive information: \${pattern.source}\`,
          severity: 'warning',
        });
      }
    }

    // Check for proper markdown formatting
    if (content.includes('```') && (content.match(/```/g)?.length || 0) % 2 !== 0) {
      issues.push({
        message: 'Unmatched code block markers (```) detected.',
        severity: 'error',
      });
    }

    // Check for GitHub-specific features
    if (content.includes('@') && !content.includes('@{')) {
      issues.push({
        message: 'Raw @ symbols detected. Consider using @{username} syntax for GitHub mentions.',
        severity: 'warning',
      });
    }

    return issues;
  }

  /**
   * Get recommended file path
   */
  getFilePath(): string {
    return '.copilot/instructions.md';
  }

  /**
   * Get provider-specific metadata
   */
  getProviderMetadata() {
    return {
      name: 'copilot',
      displayName: 'GitHub Copilot',
      filePattern: '.copilot/instructions.md',
      supportedFeatures: [
        'instructions',
        'examples',
        'constraints',
        'prompt-templates',
        'organization-policies',
      ],
      limitations: [
        'File size should be under 500KB',
        'Works best with structured markdown',
        'Limited support for complex formatting',
      ],
    };
  }
}

/**
 * Create a new Copilot provider instance
 */
export function createCopilotProvider(options?: CopilotProviderOptions): CopilotProvider {
  return new CopilotProvider(options);
}

/**
 * Convenience function to render Copilot instructions
 */
export function renderCopilotInstructions(
  compositionResult: CompositionResult,
  options?: CopilotProviderOptions
): string {
  const provider = createCopilotProvider(options);
  return provider.render(compositionResult);
}
