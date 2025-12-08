import fs from 'fs-extra';
import path from 'path';
import yaml from 'js-yaml';

import type { ManifestConfig } from '../../schemas/types.js';

export const MANIFEST_FILE = '.ai-policies.yaml';
export const LOCK_FILE = '.ai-policies.lock';

export async function findManifest(
  cwd: string = process.cwd()
): Promise<string | null> {
  let currentDir = cwd;

  while (currentDir !== '/') {
    const manifestPath = path.join(currentDir, MANIFEST_FILE);
    if (await fs.pathExists(manifestPath)) {
      return manifestPath;
    }
    currentDir = path.dirname(currentDir);
  }

  return null;
}

export async function loadManifest(
  manifestPath: string
): Promise<ManifestConfig> {
  const content = await fs.readFile(manifestPath, 'utf8');
  const config = yaml.load(content) as ManifestConfig;

  // Validate config format
  if (!config.extends) {
    throw new Error('Invalid manifest: missing "extends" section');
  }

  if (!Array.isArray(config.extends)) {
    throw new Error(
      'Invalid manifest: "extends" must be an array. ' +
        'Run "ai-policies migrate" to convert from v1.x format.'
    );
  }

  if (!config.output) {
    throw new Error('Invalid manifest: missing "output" section');
  }

  return config;
}

export async function saveManifest(
  manifestPath: string,
  config: ManifestConfig
): Promise<void> {
  const content = yaml.dump(config, {
    indent: 2,
    lineWidth: -1,
    noRefs: true,
  });

  await fs.writeFile(manifestPath, content, 'utf8');
}

export function getDefaultManifest(): ManifestConfig {
  return {
    extends: ['@ai-policies/core'],
    output: {
      cursor: './.cursorrules',
      copilot: './.copilot/instructions.md',
    },
    protected: ['core-safety'],
  };
}
