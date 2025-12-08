import type { CommandModule } from 'yargs';
import path from 'path';
import { execSync } from 'child_process';

import { findManifest, loadManifest } from '../utils/config.js';
import { logger } from '../utils/logger.js';

interface UpdateOptions {
  all?: boolean;
  package?: string;
  dry?: boolean;
}

export const updateCommand: CommandModule<{}, UpdateOptions> = {
  command: 'update [package]',
  describe: 'Update policy packages to their latest versions',
  builder: {
    all: {
      alias: 'a',
      type: 'boolean',
      description: 'Update all packages to latest versions',
      default: false,
    },
    package: {
      alias: 'p',
      type: 'string',
      description: 'Update a specific package',
    },
    dry: {
      alias: 'd',
      type: 'boolean',
      description: 'Show what would be updated without making changes',
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

      // Filter to only npm packages (exclude local paths)
      const npmPackages = config.extends.filter(
        pkg => !pkg.startsWith('./') && !pkg.startsWith('/')
      );

      if (npmPackages.length === 0) {
        logger.info('No npm packages to update (only local paths found)');
        return;
      }

      if (argv.package) {
        updateSpecificPackage(
          argv.package,
          npmPackages,
          projectRoot,
          argv.dry ?? false
        );
      } else if (argv.all) {
        updateAllPackages(npmPackages, projectRoot, argv.dry ?? false);
      } else {
        logger.error('Specify either --all or provide a package name');
        process.exit(1);
      }

      if (!argv.dry) {
        logger.info('');
        logger.info('Run "ai-policies sync" to apply the changes');
      }
    } catch (error) {
      logger.error(
        `Failed to update: ${error instanceof Error ? error.message : String(error)}`
      );
      process.exit(1);
    }
  },
};

function updateSpecificPackage(
  packageName: string,
  npmPackages: string[],
  projectRoot: string,
  dry: boolean
) {
  // Check if package is in extends array
  if (!npmPackages.includes(packageName)) {
    throw new Error(
      `Package "${packageName}" not found in extends. ` +
        `Available packages: ${npmPackages.join(', ')}`
    );
  }

  if (dry) {
    logger.info(`Would update ${packageName}`);
    // Show what version is available
    try {
      const outdated = execSync(
        `npm outdated ${packageName} --json 2>/dev/null || true`,
        {
          cwd: projectRoot,
          encoding: 'utf-8',
        }
      );
      if (outdated.trim()) {
        const info = JSON.parse(outdated);
        if (info[packageName]) {
          const { current, wanted, latest } = info[packageName];
          logger.info(`  Current: ${current}`);
          logger.info(`  Wanted: ${wanted}`);
          logger.info(`  Latest: ${latest}`);
        } else {
          logger.info('  Already at latest version');
        }
      } else {
        logger.info('  Already at latest version');
      }
    } catch {
      logger.info('  (Could not determine version info)');
    }
  } else {
    logger.info(`Updating ${packageName}...`);
    try {
      execSync(`npm update ${packageName}`, {
        cwd: projectRoot,
        stdio: 'inherit',
      });
      logger.success(`Updated ${packageName}`);
    } catch (error) {
      throw new Error(`Failed to update ${packageName}`);
    }
  }
}

function updateAllPackages(
  npmPackages: string[],
  projectRoot: string,
  dry: boolean
) {
  logger.info('Checking for package updates...');

  if (dry) {
    // Show what would be updated
    try {
      const outdated = execSync('npm outdated --json 2>/dev/null || true', {
        cwd: projectRoot,
        encoding: 'utf-8',
      });

      if (!outdated.trim()) {
        logger.success('All packages are up to date');
        return;
      }

      const allOutdated = JSON.parse(outdated);
      const policyPackageUpdates = npmPackages.filter(pkg => allOutdated[pkg]);

      if (policyPackageUpdates.length === 0) {
        logger.success('All policy packages are up to date');
        return;
      }

      logger.info('');
      logger.info('Available updates:');
      for (const pkg of policyPackageUpdates) {
        const info = allOutdated[pkg];
        logger.info(`  ${pkg}: ${info.current} → ${info.latest}`);
      }
    } catch {
      logger.warn('Could not determine outdated packages');
    }
  } else {
    // Update all policy packages
    const packagesToUpdate = npmPackages.join(' ');
    logger.info(`Updating: ${npmPackages.join(', ')}`);

    try {
      execSync(`npm update ${packagesToUpdate}`, {
        cwd: projectRoot,
        stdio: 'inherit',
      });
      logger.success('Updated all policy packages');
    } catch (error) {
      throw new Error('Failed to update packages');
    }
  }
}
