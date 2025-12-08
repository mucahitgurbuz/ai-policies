import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import path from 'path';
import fs from 'fs-extra';
import os from 'os';

import {
  findManifest,
  loadManifest,
  saveManifest,
  getDefaultManifest,
  MANIFEST_FILE,
} from './config.js';

describe('Config Utils', () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = path.join(os.tmpdir(), `ai-policies-config-test-${Date.now()}`);
    await fs.ensureDir(tempDir);
  });

  afterEach(async () => {
    await fs.remove(tempDir);
  });

  describe('findManifest', () => {
    it('should find manifest in current directory', async () => {
      const manifestPath = path.join(tempDir, MANIFEST_FILE);
      await fs.writeFile(manifestPath, 'extends: []');

      const result = await findManifest(tempDir);

      expect(result).toBe(manifestPath);
    });

    it('should find manifest in parent directory', async () => {
      const childDir = path.join(tempDir, 'child', 'grandchild');
      await fs.ensureDir(childDir);

      const manifestPath = path.join(tempDir, MANIFEST_FILE);
      await fs.writeFile(manifestPath, 'extends: []');

      const result = await findManifest(childDir);

      expect(result).toBe(manifestPath);
    });

    it('should return null when no manifest found', async () => {
      const result = await findManifest(tempDir);
      expect(result).toBeNull();
    });
  });

  describe('loadManifest', () => {
    it('should load valid manifest', async () => {
      const manifestPath = path.join(tempDir, MANIFEST_FILE);
      await fs.writeFile(
        manifestPath,
        `extends:
  - '@ai-policies/core'
  - './local'
output:
  cursor: '.cursorrules'
protected:
  - 'core-safety'
`
      );

      const result = await loadManifest(manifestPath);

      expect(result.extends).toEqual(['@ai-policies/core', './local']);
      expect(result.output.cursor).toBe('.cursorrules');
      expect(result.protected).toEqual(['core-safety']);
    });

    it('should throw error for missing extends', async () => {
      const manifestPath = path.join(tempDir, MANIFEST_FILE);
      await fs.writeFile(
        manifestPath,
        `output:
  cursor: '.cursorrules'
`
      );

      await expect(loadManifest(manifestPath)).rejects.toThrow('missing "extends"');
    });

    it('should throw error for legacy format (object extends)', async () => {
      const manifestPath = path.join(tempDir, MANIFEST_FILE);
      await fs.writeFile(
        manifestPath,
        `extends:
  '@ai-policies/core': '^1.0.0'
output:
  cursor: '.cursorrules'
`
      );

      await expect(loadManifest(manifestPath)).rejects.toThrow(
        'must be an array'
      );
    });

    it('should throw error for missing output', async () => {
      const manifestPath = path.join(tempDir, MANIFEST_FILE);
      await fs.writeFile(
        manifestPath,
        `extends:
  - '@ai-policies/core'
`
      );

      await expect(loadManifest(manifestPath)).rejects.toThrow('missing "output"');
    });
  });

  describe('saveManifest', () => {
    it('should save manifest with correct format', async () => {
      const manifestPath = path.join(tempDir, MANIFEST_FILE);
      const config = {
        extends: ['@ai-policies/core', './local'],
        output: {
          cursor: '.cursorrules',
          copilot: '.copilot/instructions.md',
        },
        protected: ['core-safety'],
      };

      await saveManifest(manifestPath, config);

      const content = await fs.readFile(manifestPath, 'utf8');
      expect(content).toContain("- '@ai-policies/core'");
      expect(content).toContain('- ./local');
      expect(content).toContain("cursor: .cursorrules");
      expect(content).toContain("- core-safety");
    });

    it('should be loadable after save', async () => {
      const manifestPath = path.join(tempDir, MANIFEST_FILE);
      const config = getDefaultManifest();

      await saveManifest(manifestPath, config);
      const loaded = await loadManifest(manifestPath);

      expect(loaded.extends).toEqual(config.extends);
      expect(loaded.output).toEqual(config.output);
    });
  });

  describe('getDefaultManifest', () => {
    it('should return default configuration', () => {
      const config = getDefaultManifest();

      expect(config.extends).toContain('@ai-policies/core');
      expect(config.output.cursor).toBeDefined();
      expect(config.output.copilot).toBeDefined();
      expect(config.protected).toContain('core-safety');
    });
  });
});

