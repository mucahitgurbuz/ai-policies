import type { CommandModule } from 'yargs';
import path from 'path';

import { findManifest, loadManifest } from '../utils/config.js';
import { logger } from '../utils/logger.js';
import {
  generateConfigurations,
  writeConfigurations,
} from '../utils/sync-engine.js';

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
      type: 'boolean',
      description: 'Show detailed output',
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

      const config = await loadManifest(manifestPath);
      const projectRoot = path.dirname(manifestPath);

      logger.info('Loading policy packages...');
      if (argv.verbose) {
        logger.info(`  Extends: ${config.extends.join(', ')}`);
        if (config.protected?.length) {
          logger.info(`  Protected: ${config.protected.join(', ')}`);
        }
        if (config.exclude?.length) {
          logger.info(`  Excluded: ${config.exclude.join(', ')}`);
        }
      }

      // Generate configurations using the compose engine
      const result = await generateConfigurations(config, projectRoot);

      // Output results
      if (result.cursor) {
        const relativePath = path.relative(projectRoot, result.cursor.path);
        if (argv.dry) {
          logger.info(`Would write Cursor rules to: ${relativePath}`);
          if (argv.verbose) {
            logger.log('Content preview:');
            logger.log(
              result.cursor.content.split('\n').slice(0, 15).join('\n') +
                '\n...'
            );
          }
        } else {
          logger.success(`Generated ${relativePath}`);
        }
      }

      if (result.copilot) {
        const relativePath = path.relative(projectRoot, result.copilot.path);
        if (argv.dry) {
          logger.info(`Would write Copilot instructions to: ${relativePath}`);
          if (argv.verbose) {
            logger.log('Content preview:');
            logger.log(
              result.copilot.content.split('\n').slice(0, 15).join('\n') +
                '\n...'
            );
          }
        } else {
          logger.success(`Generated ${relativePath}`);
        }
      }

      // Write files if not in dry-run mode
      if (!argv.dry) {
        await writeConfigurations(result);
        logger.info('');
        logger.success('Sync completed successfully!');
        logger.info('Your AI IDE configurations are now up to date.');
      }
    } catch (error) {
      logger.error(
        `Failed to sync: ${error instanceof Error ? error.message : String(error)}`
      );
      process.exit(1);
    }
  },
};
