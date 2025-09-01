import type { CommandModule } from 'yargs';
import path from 'path';
import fs from 'fs-extra';
import chalk from 'chalk';

import { findManifest, loadManifest } from '../utils/config.js';
import { logger } from '../utils/logger.js';

interface DiffOptions {
  output?: 'cursor' | 'copilot';
}

export const diffCommand: CommandModule<{}, DiffOptions> = {
  command: 'diff [output]',
  describe: 'Show differences between current and generated configurations',
  builder: {
    output: {
      type: 'string',
      choices: ['cursor', 'copilot'],
      description: 'Show diff for specific output only',
    },
  },
  handler: async (argv) => {
    try {
      const manifestPath = await findManifest();
      if (!manifestPath) {
        logger.error('No .ai-policies.yaml found. Run "ai-policies init" first.');
        process.exit(1);
      }

      const config = await loadManifest(manifestPath);
      const projectRoot = path.dirname(manifestPath);
      let hasDifferences = false;

      // Check Cursor rules diff
      if ((!argv.output || argv.output === 'cursor') && config.output.cursor) {
        const cursorPath = path.resolve(projectRoot, config.output.cursor);
        const diff = await compareFiles(cursorPath, 'cursor');
        if (diff) {
          logger.info(chalk.bold(\`\\n📄 \${path.relative(projectRoot, cursorPath)}:\`));
          console.log(diff);
          hasDifferences = true;
        }
      }

      // Check Copilot instructions diff
      if ((!argv.output || argv.output === 'copilot') && config.output.copilot) {
        const copilotPath = path.resolve(projectRoot, config.output.copilot);
        const diff = await compareFiles(copilotPath, 'copilot');
        if (diff) {
          logger.info(chalk.bold(\`\\n📄 \${path.relative(projectRoot, copilotPath)}:\`));
          console.log(diff);
          hasDifferences = true;
        }
      }

      if (!hasDifferences) {
        logger.success('No differences found. Configurations are up to date.');
      } else {
        logger.info('\\nRun "ai-policies sync" to update your configurations.');
      }
    } catch (error) {
      logger.error(\`Failed to show diff: \${error instanceof Error ? error.message : String(error)}\`);
      process.exit(1);
    }
  },
};

async function compareFiles(filePath: string, type: 'cursor' | 'copilot'): Promise<string | null> {
  // Get current content
  let currentContent = '';
  if (await fs.pathExists(filePath)) {
    currentContent = await fs.readFile(filePath, 'utf8');
  }

  // Generate new content (placeholder for now)
  const metadata = {
    packages: { '@ai-policies/core': '^1.0.0' },
    contentHash: 'placeholder-hash',
    generatedAt: new Date().toISOString(),
  };

  const metaHeader = createMetaHeader(metadata);
  const placeholderContent = 'AI Policies content will be generated here';

  let newContent: string;
  if (type === 'cursor') {
    newContent = \`\${metaHeader}

# Cursor AI Rules

\${placeholderContent}

## Core Safety Rules

- Never expose API keys or sensitive data
- Always validate user input
- Follow security best practices
- Respect user privacy
\`;
  } else {
    newContent = \`\${metaHeader}

# GitHub Copilot Instructions

\${placeholderContent}

## Coding Guidelines

### Security
- Never include hardcoded secrets, API keys, or passwords
- Always validate and sanitize user inputs
- Use parameterized queries for database operations

### Code Quality
- Write clean, readable, and maintainable code
- Follow established coding conventions and patterns
- Include appropriate error handling

### Documentation
- Add clear comments for complex logic
- Document public APIs and interfaces
- Keep documentation up to date
\`;
  }

  // Simple diff implementation
  if (currentContent.trim() === newContent.trim()) {
    return null;
  }

  const currentLines = currentContent.split('\\n');
  const newLines = newContent.split('\\n');
  const maxLines = Math.max(currentLines.length, newLines.length);

  const diffLines: string[] = [];
  for (let i = 0; i < maxLines; i++) {
    const currentLine = currentLines[i] || '';
    const newLine = newLines[i] || '';

    if (currentLine !== newLine) {
      if (currentLine) {
        diffLines.push(chalk.red(\`- \${currentLine}\`));
      }
      if (newLine) {
        diffLines.push(chalk.green(\`+ \${newLine}\`));
      }
    }
  }

  return diffLines.length > 0 ? diffLines.join('\\n') : null;
}

function createMetaHeader(metadata: { packages: Record<string, string>; contentHash: string; generatedAt: string }): string {
  const metaJson = JSON.stringify(metadata, null, 2);
  return \`<!--
AI-POLICIES-META: \${Buffer.from(metaJson).toString('base64')}
Generated at: \${metadata.generatedAt}
Packages: \${Object.entries(metadata.packages).map(([name, version]) => \`\${name}@\${version}\`).join(', ')}
-->\`;
}
