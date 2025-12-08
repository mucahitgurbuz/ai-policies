import type { CommandModule } from 'yargs';
import { execSync } from 'child_process';
import path from 'path';

import { findManifest, loadManifest, saveManifest } from '../utils/config.js';
import { logger } from '../utils/logger.js';

interface InstallOptions {
  package: string;
  dev?: boolean;
}

export const installCommand: CommandModule<{}, InstallOptions> = {
  command: 'install <package>',
  describe: 'Install an AI policy package and add it to your configuration',
  builder: {
    package: {
      type: 'string',
      description: 'Package name to install (e.g., @ai-policies/frontend-react)',
      demandOption: true,
    },
    dev: {
      alias: 'D',
      type: 'boolean',
      description: 'Install as dev dependency',
      default: false,
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

      const packageName = argv.package;
      const projectRoot = path.dirname(manifestPath);

      // Install the npm package
      logger.info(`Installing ${packageName}...`);
      try {
        const devFlag = argv.dev ? '--save-dev' : '--save';
        execSync(`npm install ${devFlag} ${packageName}`, {
          cwd: projectRoot,
          stdio: 'inherit',
        });
      } catch (error) {
        logger.error(`Failed to install ${packageName}`);
        process.exit(1);
      }

      // Load and update the manifest
      const config = await loadManifest(manifestPath);

      // Check if package is already in extends
      if (config.extends.includes(packageName)) {
        logger.info(`${packageName} is already in your configuration`);
        return;
      }

      // Add to extends array (at the end for "last wins" priority)
      config.extends.push(packageName);

      // Save updated manifest
      await saveManifest(manifestPath, config);

      logger.success(`Added ${packageName} to .ai-policies.yaml`);
      logger.info('');
      logger.info('Run "ai-policies sync" to update your IDE configurations.');
    } catch (error) {
      logger.error(
        `Failed to install: ${error instanceof Error ? error.message : String(error)}`
      );
      process.exit(1);
    }
  },
};

