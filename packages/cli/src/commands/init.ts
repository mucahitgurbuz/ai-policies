import type { CommandModule } from 'yargs';
import path from 'path';
import fs from 'fs-extra';
import inquirer from 'inquirer';

import { getDefaultManifest, saveManifest, MANIFEST_FILE } from '../utils/config.js';
import { logger } from '../utils/logger.js';
import type { ManifestConfig } from '@ai-policies/core-schemas';

interface InitOptions {
  force?: boolean;
  preset?: string;
}

export const initCommand: CommandModule<{}, InitOptions> = {
  command: 'init',
  describe: 'Initialize AI Policies in the current directory',
  builder: {
    force: {
      alias: 'f',
      type: 'boolean',
      description: 'Overwrite existing configuration',
      default: false,
    },
    preset: {
      alias: 'p',
      type: 'string',
      description: 'Use a preset configuration',
      choices: ['basic', 'frontend', 'backend', 'fullstack'],
    },
  },
  handler: async (argv) => {
    try {
      const cwd = process.cwd();
      const manifestPath = path.join(cwd, MANIFEST_FILE);

      // Check if manifest already exists
      if (await fs.pathExists(manifestPath) && !argv.force) {
        const { overwrite } = await inquirer.prompt([
          {
            type: 'confirm',
            name: 'overwrite',
            message: 'AI Policies configuration already exists. Overwrite?',
            default: false,
          },
        ]);

        if (!overwrite) {
          logger.info('Initialization cancelled');
          return;
        }
      }

      // Get configuration based on preset or prompts
      let config = getDefaultManifest();

      if (argv.preset) {
        config = getPresetConfig(argv.preset);
      } else {
        config = await promptForConfiguration();
      }

      // Save manifest
      await saveManifest(manifestPath, config);
      logger.success(`Created ${MANIFEST_FILE}`);

      // Create output directories
      if (config.output.copilot) {
        const copilotDir = path.dirname(path.resolve(cwd, config.output.copilot));
        await fs.ensureDir(copilotDir);
        logger.success(`Created directory ${path.relative(cwd, copilotDir)}`);
      }

      logger.info('');
      logger.info('Next steps:');
      logger.info('  1. Review and customize your .ai-policies.yaml');
      logger.info('  2. Run "ai-policies sync" to generate your IDE configurations');
      logger.info('  3. Add .cursorrules and .copilot/ to your .gitignore if desired');
    } catch (error) {
      logger.error(`Failed to initialize: ${error instanceof Error ? error.message : String(error)}`);
      process.exit(1);
    }
  },
};

function getPresetConfig(preset: string): ManifestConfig {
  const base = getDefaultManifest();

  switch (preset) {
    case 'frontend':
      return {
        ...base,
        requires: {
          '@ai-policies/core': '^1.0.0',
          '@ai-policies/frontend-react': '^1.0.0',
        },
      };

    case 'backend':
      return {
        ...base,
        requires: {
          '@ai-policies/core': '^1.0.0',
        },
      };

    case 'fullstack':
      return {
        ...base,
        requires: {
          '@ai-policies/core': '^1.0.0',
          '@ai-policies/frontend-react': '^1.0.0',
          '@ai-policies/workflows-jira': '~1.0.0',
        },
      };

    default:
      return base;
  }
}

async function promptForConfiguration(): Promise<ManifestConfig> {
  const { projectType, includeWorkflows, outputPaths } = await inquirer.prompt([
    {
      type: 'list',
      name: 'projectType',
      message: 'What type of project is this?',
      choices: [
        { name: 'Frontend (React/Vue/Angular)', value: 'frontend' },
        { name: 'Backend (Node.js/Python/etc)', value: 'backend' },
        { name: 'Full-stack application', value: 'fullstack' },
        { name: 'Basic (core policies only)', value: 'basic' },
      ],
    },
    {
      type: 'confirm',
      name: 'includeWorkflows',
      message: 'Include workflow management policies (Jira, etc)?',
      default: false,
      when: (answers) => answers.projectType !== 'basic',
    },
    {
      type: 'confirm',
      name: 'outputPaths',
      message: 'Customize output file paths?',
      default: false,
    },
  ]);

  let config = getPresetConfig(projectType);

  if (includeWorkflows) {
    config.requires['@ai-policies/workflows-jira'] = '~1.0.0';
  }

  if (outputPaths) {
    const { cursorPath, copilotPath } = await inquirer.prompt([
      {
        type: 'input',
        name: 'cursorPath',
        message: 'Cursor rules file path:',
        default: './.cursorrules',
      },
      {
        type: 'input',
        name: 'copilotPath',
        message: 'Copilot instructions file path:',
        default: './.copilot/instructions.md',
      },
    ]);

    config.output.cursor = cursorPath;
    config.output.copilot = copilotPath;
  }

  return config;
}
