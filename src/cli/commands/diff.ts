import type { CommandModule } from 'yargs';
import path from 'path';
import chalk from 'chalk';

import { findManifest, loadManifest } from '../utils/config.js';
import { logger } from '../utils/logger.js';
import {
  generateConfigurations,
  readExistingConfigurations,
} from '../utils/sync-engine.js';

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
  handler: async argv => {
    try {
      const manifestPath = await findManifest();
      if (!manifestPath) {
        logger.error(
          'No .ai-policies.yaml found. Run "ai-policies init" first.'
        );
        process.exit(1);
      }

      const config = await loadManifest(manifestPath);
      const projectRoot = path.dirname(manifestPath);
      let hasDifferences = false;

      // Generate new configurations
      const newConfigs = await generateConfigurations(config, projectRoot);

      // Read existing configurations
      const existingConfigs = await readExistingConfigurations(
        config,
        projectRoot
      );

      // Check Cursor rules diff
      if ((!argv.output || argv.output === 'cursor') && newConfigs.cursor) {
        const diff = computeDiff(
          existingConfigs.cursor || '',
          newConfigs.cursor.content
        );
        if (diff) {
          logger.info(
            chalk.bold(
              `\n📄 ${path.relative(projectRoot, newConfigs.cursor.path)}:`
            )
          );
          console.log(diff);
          hasDifferences = true;
        }
      }

      // Check Copilot instructions diff
      if ((!argv.output || argv.output === 'copilot') && newConfigs.copilot) {
        const diff = computeDiff(
          existingConfigs.copilot || '',
          newConfigs.copilot.content
        );
        if (diff) {
          logger.info(
            chalk.bold(
              `\n📄 ${path.relative(projectRoot, newConfigs.copilot.path)}:`
            )
          );
          console.log(diff);
          hasDifferences = true;
        }
      }

      if (!hasDifferences) {
        logger.success('No differences found. Configurations are up to date.');
      } else {
        logger.info('\nRun "ai-policies sync" to update your configurations.');
      }
    } catch (error) {
      logger.error(
        `Failed to show diff: ${error instanceof Error ? error.message : String(error)}`
      );
      process.exit(1);
    }
  },
};

/**
 * Compute a simple line-by-line diff between two strings
 */
function computeDiff(
  currentContent: string,
  newContent: string
): string | null {
  // Normalize content for comparison (ignore timestamp differences in metadata)
  const normalizeForComparison = (content: string) => {
    return content
      .replace(/Generated at: .+/g, 'Generated at: [timestamp]')
      .replace(/generatedAt": ".+"/g, 'generatedAt": "[timestamp]"')
      .trim();
  };

  if (
    normalizeForComparison(currentContent) ===
    normalizeForComparison(newContent)
  ) {
    return null;
  }

  const currentLines = currentContent.split('\n');
  const newLines = newContent.split('\n');
  const maxLines = Math.max(currentLines.length, newLines.length);

  const diffLines: string[] = [];
  let contextLines = 0;
  const maxContextLines = 3;

  for (let i = 0; i < maxLines; i++) {
    const currentLine = currentLines[i] || '';
    const newLine = newLines[i] || '';

    if (currentLine !== newLine) {
      if (currentLine) {
        diffLines.push(chalk.red(`- ${currentLine}`));
      }
      if (newLine) {
        diffLines.push(chalk.green(`+ ${newLine}`));
      }
      contextLines = 0;
    } else if (diffLines.length > 0 && contextLines < maxContextLines) {
      diffLines.push(chalk.gray(`  ${currentLine}`));
      contextLines++;
    }
  }

  return diffLines.length > 0 ? diffLines.slice(0, 50).join('\n') : null;
}
