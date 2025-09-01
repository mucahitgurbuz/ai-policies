/**
 * Copilot-specific formatting utilities
 */

export interface CopilotFormattingOptions {
  /** Include safety constraints */
  includeSafetyConstraints?: boolean;

  /** Include prompt templates */
  includePromptTemplates?: boolean;

  /** Organization name for customization */
  organizationName?: string;
}

/**
 * Format content specifically for Copilot instructions
 */
export function formatCopilotInstructions(
  content: string,
  options: CopilotFormattingOptions = {}
): string {
  const opts = {
    includeSafetyConstraints: true,
    includePromptTemplates: true,
    organizationName: 'Your Organization',
    ...options,
  };

  let formatted = content;

  // Apply Copilot-specific transformations
  formatted = structureForCopilot(formatted);
  formatted = enhanceCodeExamples(formatted);
  formatted = addContextualHints(formatted);
  formatted = formatConstraints(formatted);

  return formatted;
}

/**
 * Structure content for optimal Copilot understanding
 */
function structureForCopilot(content: string): string {
  // Copilot works better with clear section boundaries
  return content.replace(/^(#{1,3})\\s+(.+)$/gm, (match, hashes, title) => {
    // Add emphasis for important sections
    if (title.toLowerCase().includes('security') ||
        title.toLowerCase().includes('safety') ||
        title.toLowerCase().includes('privacy')) {
      return \`\${hashes} 🔒 \${title}\`;
    }

    if (title.toLowerCase().includes('example') ||
        title.toLowerCase().includes('template')) {
      return \`\${hashes} 📝 \${title}\`;
    }

    return match;
  });
}

/**
 * Enhance code examples for better Copilot context
 */
function enhanceCodeExamples(content: string): string {
  // Add context comments to code blocks
  return content.replace(/```(\\w+)?\\n([^`]+)```/g, (match, language, code) => {
    const lang = language || '';
    const trimmedCode = code.trim();

    // Add context hints for Copilot
    let contextComment = '';
    if (lang === 'javascript' || lang === 'typescript') {
      contextComment = '// Example implementation following project guidelines\\n';
    } else if (lang === 'python') {
      contextComment = '# Example implementation following project guidelines\\n';
    } else if (lang === 'java' || lang === 'c++') {
      contextComment = '// Example implementation following project guidelines\\n';
    }

    return \`\`\`\${lang}\\n\${contextComment}\${trimmedCode}\\n\`\`\`\`;
  });
}

/**
 * Add contextual hints for Copilot AI
 */
function addContextualHints(content: string): string {
  let enhanced = content;

  // Add guidance sections
  enhanced = enhanced.replace(
    /## (Coding Guidelines|Guidelines|Standards)/gi,
    '## Coding Guidelines\\n\\n> These guidelines help Copilot understand your project\\'s coding standards and preferences.'
  );

  // Enhance security sections
  enhanced = enhanced.replace(
    /## (Security|Safety)/gi,
    '## Security Requirements\\n\\n> **Critical**: These security requirements must be followed in all code suggestions.'
  );

  // Add context to examples
  enhanced = enhanced.replace(
    /### (Example|Good Practice):/gi,
    '### ✅ Preferred Pattern:'
  );

  enhanced = enhanced.replace(
    /### (Anti-pattern|Avoid|Bad Practice):/gi,
    '### ❌ Avoid This Pattern:'
  );

  return enhanced;
}

/**
 * Format constraints for Copilot
 */
function formatConstraints(content: string): string {
  // Add special formatting for constraints
  return content.replace(
    /^- (Never|Always|Must|Should not|Don\\'t)\\s+(.+)$/gm,
    (match, constraint, rule) => {
      const emoji = constraint.toLowerCase().includes('never') ||
                    constraint.toLowerCase().includes('don\\'t') ||
                    constraint.toLowerCase().includes('should not') ? '🚫' : '✅';

      return \`- \${emoji} **\${constraint}** \${rule}\`;
    }
  );
}

/**
 * Generate prompt templates section
 */
export function generatePromptTemplates(): string {
  return \`## Prompt Templates

### Code Generation Request
\`\`\`
When generating [type of code], please:
1. Follow the established patterns in this codebase
2. Include appropriate error handling
3. Add relevant comments for complex logic
4. Ensure security best practices are followed
\`\`\`

### Code Review Request
\`\`\`
Please review this code for:
- Security vulnerabilities
- Performance issues
- Code style consistency
- Best practice adherence
\`\`\`

### Refactoring Request
\`\`\`
Please refactor this code to:
- Improve readability
- Follow current patterns
- Maintain existing functionality
- Add appropriate tests
\`\`\`\`;
}

/**
 * Generate safety constraints section
 */
export function generateSafetyConstraints(): string {
  return \`## Safety Constraints

### Data Protection
- 🚫 **Never** include real API keys, passwords, or secrets in code
- 🚫 **Never** log sensitive user information
- ✅ **Always** validate and sanitize user input
- ✅ **Always** use environment variables for configuration

### Security Requirements
- 🚫 **Never** use eval() or similar dynamic code execution
- 🚫 **Never** trust user input without validation
- ✅ **Always** use parameterized queries for database operations
- ✅ **Always** implement proper authentication and authorization

### Privacy Compliance
- 🚫 **Never** collect unnecessary personal data
- ✅ **Always** respect user privacy preferences
- ✅ **Always** implement data retention policies
- ✅ **Always** provide clear privacy notices\`;
}

/**
 * Clean and optimize content for Copilot
 */
export function optimizeForCopilot(content: string): string {
  return content
    // Remove excessive blank lines
    .replace(/\\n{4,}/g, '\\n\\n\\n')
    // Ensure proper spacing around headers
    .replace(/^(#+.+)$/gm, '\\n$1\\n')
    // Clean up list formatting
    .replace(/^(\\s*)[-*+]\\s+/gm, '$1- ')
    // Ensure proper code block spacing
    .replace(/```\\n\\n/g, '```\\n')
    .replace(/\\n\\n```/g, '\\n```')
    // Remove trailing whitespace
    .replace(/[ \\t]+$/gm, '')
    // Ensure single final newline
    .replace(/\\n*$/, '\\n');
}
