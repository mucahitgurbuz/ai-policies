import type { PolicyPartial, CompositionResult } from '@ai-policies/core-schemas';
import { formatCursorRules } from './formatter.js';
import { generateCursorTemplate } from './templates.js';

export interface CursorProviderOptions {
  /** Include rule categories as comments */
  includeCategories?: boolean;

  /** Maximum line length for formatting */
  maxLineLength?: number;

  /** Include source attribution in comments */
  includeAttribution?: boolean;

  /** Custom template variables */
  templateVariables?: Record<string, string>;
}

/**
 * Cursor IDE provider for rendering .cursorrules files
 */
export class CursorProvider {
  private options: Required<CursorProviderOptions>;

  constructor(options: CursorProviderOptions = {}) {
    this.options = {
      includeCategories: true,
      maxLineLength: 120,
      includeAttribution: false,
      templateVariables: {},
      ...options,
    };
  }

  /**
   * Render composition result to Cursor rules format
   */
  render(compositionResult: CompositionResult): string {
    const { content, metadata } = compositionResult;

    // Apply Cursor-specific formatting
    const formattedContent = formatCursorRules(content, {
      maxLineLength: this.options.maxLineLength,
      includeCategories: this.options.includeCategories,
    });

    // Generate using template
    const cursorRules = generateCursorTemplate({
      content: formattedContent,
      metadata,
      options: this.options,
    });

    return cursorRules;
  }

  /**
   * Validate that content is suitable for Cursor
   */
  validate(content: string): Array<{ message: string; severity: 'error' | 'warning' }> {
    const issues: Array<{ message: string; severity: 'error' | 'warning' }> = [];

    // Check file size (Cursor has limits)
    if (content.length > 100000) {
      issues.push({
        message: 'Cursor rules file is very large (>100KB). This may impact IDE performance.',
        severity: 'warning',
      });
    }

    // Check for potential syntax issues
    if (content.includes('```') && (content.match(/```/g)?.length || 0) % 2 !== 0) {
      issues.push({
        message: 'Unmatched code block markers (```) detected.',
        severity: 'error',
      });
    }

    // Check for very long lines
    const lines = content.split('\\n');
    const longLines = lines.filter(line => line.length > this.options.maxLineLength);
    if (longLines.length > 0) {
      issues.push({
        message: \`\${longLines.length} lines exceed maximum length of \${this.options.maxLineLength} characters.\`,
        severity: 'warning',
      });
    }

    // Check for potentially problematic patterns
    if (content.toLowerCase().includes('secret') || content.toLowerCase().includes('password')) {
      issues.push({
        message: 'Content contains potentially sensitive terms (secret, password).',
        severity: 'warning',
      });
    }

    return issues;
  }

  /**
   * Get recommended file extension
   */
  getFileExtension(): string {
    return '.cursorrules';
  }

  /**
   * Get provider-specific metadata
   */
  getProviderMetadata() {
    return {
      name: 'cursor',
      displayName: 'Cursor IDE',
      filePattern: '.cursorrules',
      supportedFeatures: [
        'rules',
        'patterns',
        'examples',
        'anti-patterns',
        'context-awareness',
      ],
      limitations: [
        'File size should be under 100KB for optimal performance',
        'Very complex regex patterns may not work as expected',
      ],
    };
  }
}

/**
 * Create a new Cursor provider instance
 */
export function createCursorProvider(options?: CursorProviderOptions): CursorProvider {
  return new CursorProvider(options);
}

/**
 * Convenience function to render Cursor rules
 */
export function renderCursorRules(
  compositionResult: CompositionResult,
  options?: CursorProviderOptions
): string {
  const provider = createCursorProvider(options);
  return provider.render(compositionResult);
}
