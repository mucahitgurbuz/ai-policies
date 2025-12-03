import type { CommandModule } from 'yargs';
import path from 'path';
import fs from 'fs-extra';
import chalk from 'chalk';

import { findManifest, loadManifest } from '../utils/config.js';
import { logger } from '../utils/logger.js';
import { getPartials } from '@ai-policies/policy-registry';
import { composePartials } from '@ai-policies/compose-engine';
import type { Provider } from '@ai-policies/core-schemas';

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
          logger.info(chalk.bold(\`\n📄 \${path.relative(projectRoot, cursorPath)}:\`));
          console.log(diff);
          hasDifferences = true;
        }
      }

      // Check Copilot instructions diff
      if ((!argv.output || argv.output === 'copilot') && config.output.copilot) {
        const copilotPath = path.resolve(projectRoot, config.output.copilot);
        const diff = await compareFiles(copilotPath, 'copilot');
        if (diff) {
          logger.info(chalk.bold(\`\n📄 \${path.relative(projectRoot, copilotPath)}:\`));
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

  // Generate new content using actual composition
  const manifestPath = await findManifest();
  if (!manifestPath) {
    return null;
  }

  const config = await loadManifest(manifestPath);
  const partials = await getPartials(config.requires);
  const result = await composePartials(
    partials,
    config,
    type as Provider,
    {
      teamAppendContent: config.overrides?.teamAppendContent,
      excludePartials: config.overrides?.excludePartials,
    }
  );

  const newContent = result.content;

  // Simple diff implementation
  if (currentContent.trim() === newContent.trim()) {
    return null;
  }

  const currentLines = currentContent.split('\n');
  const newLines = newContent.split('\n');
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

  return diffLines.length > 0 ? diffLines.join('\n') : null;
}
