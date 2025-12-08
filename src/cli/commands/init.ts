import type { CommandModule } from 'yargs';
import path from 'path';
import fs from 'fs-extra';
import inquirer from 'inquirer';
import { execSync } from 'child_process';

import {
  getDefaultManifest,
  saveManifest,
  MANIFEST_FILE,
} from '../utils/config.js';
import { logger } from '../utils/logger.js';
import type { ManifestConfig } from '../../schemas/types.js';

interface InitOptions {
  force?: boolean;
  preset?: string;
  skipInstall?: boolean;
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
    'skip-install': {
      type: 'boolean',
      description: 'Skip npm install step',
      default: false,
    },
  },
  handler: async argv => {
    try {
      const cwd = process.cwd();
      const manifestPath = path.join(cwd, MANIFEST_FILE);

      // Check if manifest already exists
      if ((await fs.pathExists(manifestPath)) && !argv.force) {
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
        const copilotDir = path.dirname(
          path.resolve(cwd, config.output.copilot)
        );
        await fs.ensureDir(copilotDir);
        logger.success(`Created directory ${path.relative(cwd, copilotDir)}`);
      }

      // Install packages
      if (!argv.skipInstall) {
        const packages = config.extends.filter(p => !p.startsWith('./') && !p.startsWith('/'));
        if (packages.length > 0) {
          logger.info('');
          logger.info('Installing packages...');
          try {
            execSync(`npm install ${packages.join(' ')}`, {
              cwd,
              stdio: 'inherit',
            });
            logger.success('Packages installed');
          } catch (error) {
            logger.warn('Failed to install packages. Run npm install manually.');
          }
        }
      }

      logger.info('');
      logger.info('Next steps:');
      logger.info('  1. Review and customize your .ai-policies.yaml');
      logger.info(
        '  2. Run "ai-policies sync" to generate your IDE configurations'
      );
      logger.info(
        '  3. Add .cursorrules and .copilot/ to your .gitignore if desired'
      );
    } catch (error) {
      logger.error(
        `Failed to initialize: ${error instanceof Error ? error.message : String(error)}`
      );
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
        extends: ['@ai-policies/core', '@ai-policies/frontend-react'],
      };

    case 'backend':
      return {
        ...base,
        extends: ['@ai-policies/core'],
      };

    case 'fullstack':
      return {
        ...base,
        extends: [
          '@ai-policies/core',
          '@ai-policies/frontend-react',
          '@ai-policies/workflows-jira',
        ],
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
      when: answers => answers.projectType !== 'basic',
    },
    {
      type: 'confirm',
      name: 'outputPaths',
      message: 'Customize output file paths?',
      default: false,
    },
  ]);

  const config = getPresetConfig(projectType);

  if (includeWorkflows && !config.extends.includes('@ai-policies/workflows-jira')) {
    config.extends.push('@ai-policies/workflows-jira');
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
