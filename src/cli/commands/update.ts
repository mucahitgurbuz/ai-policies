import type { CommandModule } from 'yargs';
import path from 'path';
import semver from 'semver';

import { findManifest, loadManifest, saveManifest } from '../utils/config.js';
import { logger } from '../utils/logger.js';

interface UpdateOptions {
  all?: boolean;
  package?: string;
  dry?: boolean;
}

export const updateCommand: CommandModule<{}, UpdateOptions> = {
  command: 'update [package]',
  describe: 'Update policy packages to their latest compatible versions',
  builder: {
    all: {
      alias: 'a',
      type: 'boolean',
      description: 'Update all packages to latest compatible versions',
      default: false,
    },
    package: {
      alias: 'p',
      type: 'string',
      description: 'Update specific package (format: name@range)',
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

      if (argv.package) {
        await updateSpecificPackage(config, argv.package, argv.dry ?? false);
      } else if (argv.all) {
        await updateAllPackages(config, argv.dry ?? false);
      } else {
        logger.error('Specify either --all or provide a package name');
        process.exit(1);
      }

      if (!argv.dry) {
        await saveManifest(manifestPath, config);
        logger.success('Updated .ai-policies.yaml');
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

async function updateSpecificPackage(
  config: any,
  packageSpec: string,
  dry: boolean
) {
  const [packageName, version] = packageSpec.split('@');

  if (!packageName || !version) {
    throw new Error('Invalid package format. Use: name@version');
  }

  if (!config.extends[packageName]) {
    throw new Error(`Package "${packageName}" not found in manifest`);
  }

  const currentVersion = config.extends[packageName];

  // Simulate version resolution (placeholder)
  const latestCompatible = resolveLatestCompatible(version);

  if (dry) {
    logger.info(
      `Would update ${packageName}: ${currentVersion} → ${latestCompatible}`
    );
  } else {
    config.extends[packageName] = latestCompatible;
    logger.success(
      `Updated ${packageName}: ${currentVersion} → ${latestCompatible}`
    );
  }
}

async function updateAllPackages(config: any, dry: boolean) {
  logger.info('Checking for package updates...');

  const updates: Array<{ name: string; current: string; latest: string }> = [];

  for (const [packageName, currentVersion] of Object.entries(config.extends)) {
    // Simulate version resolution (placeholder)
    const latestCompatible = resolveLatestCompatible(currentVersion as string);

    if (latestCompatible !== currentVersion) {
      updates.push({
        name: packageName,
        current: currentVersion as string,
        latest: latestCompatible,
      });
    }
  }

  if (updates.length === 0) {
    logger.success('All packages are up to date');
    return;
  }

  for (const update of updates) {
    if (dry) {
      logger.info(
        `Would update ${update.name}: ${update.current} → ${update.latest}`
      );
    } else {
      config.extends[update.name] = update.latest;
      logger.success(
        `Updated ${update.name}: ${update.current} → ${update.latest}`
      );
    }
  }
}

function resolveLatestCompatible(versionRange: string): string {
  // Placeholder implementation
  // In real implementation, this would:
  // 1. Fetch available versions from registry
  // 2. Resolve the latest version that satisfies the range
  // 3. Handle semver ranges properly

  if (versionRange.startsWith('^')) {
    const baseVersion = versionRange.slice(1);
    const parsed = semver.parse(baseVersion);
    if (parsed) {
      // Simulate a patch update
      return `^${parsed.major}.${parsed.minor}.${parsed.patch + 1}`;
    }
  }

  if (versionRange.startsWith('~')) {
    const baseVersion = versionRange.slice(1);
    const parsed = semver.parse(baseVersion);
    if (parsed) {
      // Simulate a patch update
      return `~${parsed.major}.${parsed.minor}.${parsed.patch + 1}`;
    }
  }

  // Return as-is for exact versions or other formats
  return versionRange;
}
