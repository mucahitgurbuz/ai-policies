import fs from 'fs-extra';
import path from 'path';
import yaml from 'js-yaml';
import type { ManifestConfig } from '@ai-policies/core-schemas';

export const MANIFEST_FILE = '.ai-policies.yaml';
export const LOCK_FILE = '.ai-policies.lock';

export async function findManifest(cwd: string = process.cwd()): Promise<string | null> {
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

export async function loadManifest(manifestPath: string): Promise<ManifestConfig> {
  const content = await fs.readFile(manifestPath, 'utf8');
  const config = yaml.load(content) as ManifestConfig;

  // Validate using schema validator
  const { validateManifestConfig } = await import('@ai-policies/core-schemas');
  const validation = validateManifestConfig(config);

  if (!validation.valid) {
    const errors = validation.errors.map(e => `${e.path ? e.path + ': ' : ''}${e.message}`).join(', ');
    throw new Error(`Invalid manifest: ${errors}`);
  }

  return config;
}

export async function saveManifest(manifestPath: string, config: ManifestConfig): Promise<void> {
  const content = yaml.dump(config, {
    indent: 2,
    lineWidth: -1,
    noRefs: true,
  });

  await fs.writeFile(manifestPath, content, 'utf8');
}

export function getDefaultManifest(): ManifestConfig {
  return {
    requires: {
      '@ai-policies/core': '^1.0.0',
    },
    output: {
      cursor: './.cursorrules',
      copilot: './.copilot/instructions.md',
    },
    compose: {
      order: ['core', 'domain', 'stack', 'team'],
      protectedLayers: ['core'],
      teamAppend: true,
    },
  };
}
