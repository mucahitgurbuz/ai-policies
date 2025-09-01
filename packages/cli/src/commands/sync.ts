import type { CommandModule } from 'yargs';
import path from 'path';
import fs from 'fs-extra';

import { findManifest, loadManifest } from '../utils/config.js';
import { logger } from '../utils/logger.js';

interface SyncOptions {
  dry?: boolean;
  verbose?: boolean;
}

export const syncCommand: CommandModule<{}, SyncOptions> = {
  command: 'sync',
  describe: 'Sync AI policies and generate IDE configuration files',
  builder: {
    dry: {
      alias: 'd',
      type: 'boolean',
      description: 'Show what would be generated without writing files',
      default: false,
    },
    verbose: {
      alias: 'v',
      type: 'boolean',
      description: 'Show detailed output',
      default: false,
    },
  },
  handler: async (argv) => {
    try {
      logger.debug = argv.verbose ? logger.debug.bind(logger) : () => {};

      const manifestPath = await findManifest();
      if (!manifestPath) {
        logger.error('No .ai-policies.yaml found. Run "ai-policies init" first.');
        process.exit(1);
      }

      const config = await loadManifest(manifestPath);
      const projectRoot = path.dirname(manifestPath);

      logger.info('Loading policy packages...');

      // TODO: Implement actual package resolution and composition
      // For now, create placeholder outputs
      const metadata = {
        packages: config.requires,
        contentHash: 'placeholder-hash',
        generatedAt: new Date().toISOString(),
      };

      const metaHeader = createMetaHeader(metadata);
      const placeholderContent = 'AI Policies content will be generated here';

      // Generate Cursor rules
      if (config.output.cursor) {
        const cursorPath = path.resolve(projectRoot, config.output.cursor);
        const cursorContent = \`\${metaHeader}

# Cursor AI Rules

\${placeholderContent}

## Core Safety Rules

- Never expose API keys or sensitive data
- Always validate user input
- Follow security best practices
- Respect user privacy
\`;

        if (argv.dry) {
          logger.info(\`Would write Cursor rules to: \${path.relative(process.cwd(), cursorPath)}\`);
          logger.debug('Content preview:');
          logger.debug(cursorContent.split('\\n').slice(0, 10).join('\\n') + '...');
        } else {
          await fs.ensureDir(path.dirname(cursorPath));
          await fs.writeFile(cursorPath, cursorContent, 'utf8');
          logger.success(\`Generated \${path.relative(projectRoot, cursorPath)}\`);
        }
      }

      // Generate Copilot instructions
      if (config.output.copilot) {
        const copilotPath = path.resolve(projectRoot, config.output.copilot);
        const copilotContent = \`\${metaHeader}

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

        if (argv.dry) {
          logger.info(\`Would write Copilot instructions to: \${path.relative(process.cwd(), copilotPath)}\`);
          logger.debug('Content preview:');
          logger.debug(copilotContent.split('\\n').slice(0, 10).join('\\n') + '...');
        } else {
          await fs.ensureDir(path.dirname(copilotPath));
          await fs.writeFile(copilotPath, copilotContent, 'utf8');
          logger.success(\`Generated \${path.relative(projectRoot, copilotPath)}\`);
        }
      }

      if (!argv.dry) {
        logger.info('');
        logger.success('Sync completed successfully!');
        logger.info('Your AI IDE configurations are now up to date.');
      }
    } catch (error) {
      logger.error(\`Failed to sync: \${error instanceof Error ? error.message : String(error)}\`);
      process.exit(1);
    }
  },
};

function createMetaHeader(metadata: { packages: Record<string, string>; contentHash: string; generatedAt: string }): string {
  const metaJson = JSON.stringify(metadata, null, 2);
  return \`<!--
AI-POLICIES-META: \${Buffer.from(metaJson).toString('base64')}
Generated at: \${metadata.generatedAt}
Packages: \${Object.entries(metadata.packages).map(([name, version]) => \`\${name}@\${version}\`).join(', ')}
-->\`;
}
