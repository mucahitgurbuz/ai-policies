import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import path from 'path';
import fs from 'fs-extra';
import os from 'os';

import {
  resolvePackage,
  resolveExtendsArray,
  getAllPartials,
  getDefaultProtectedPartials,
} from './resolver.js';

describe('Package Resolver', () => {
  let tempDir: string;

  beforeEach(async () => {
    // Create a temporary directory for test packages
    tempDir = path.join(os.tmpdir(), `ai-policies-test-${Date.now()}`);
    await fs.ensureDir(tempDir);
  });

  afterEach(async () => {
    // Clean up temporary directory
    await fs.remove(tempDir);
  });

  describe('resolvePackage', () => {
    it('should resolve a local path package', async () => {
      // Create a test package
      const packagePath = path.join(tempDir, 'test-package');
      await fs.ensureDir(path.join(packagePath, 'partials'));

      await fs.writeJson(path.join(packagePath, 'package.json'), {
        name: '@test/package',
        version: '1.0.0',
      });

      await fs.writeFile(
        path.join(packagePath, 'partials', 'test-rule.md'),
        `---
id: test-rule
description: Test rule
---

# Test Rule

This is a test rule.`
      );

      const result = await resolvePackage(packagePath, tempDir, 0);

      expect(result.config.name).toBe('@test/package');
      expect(result.config.version).toBe('1.0.0');
      expect(result.partials).toHaveLength(1);
      expect(result.partials[0].frontmatter.id).toBe('test-rule');
    });

    it('should handle local path without package.json', async () => {
      // Create a test package without package.json
      const packagePath = path.join(tempDir, 'local-package');
      await fs.ensureDir(path.join(packagePath, 'partials'));

      await fs.writeFile(
        path.join(packagePath, 'partials', 'local-rule.md'),
        `---
id: local-rule
---

# Local Rule`
      );

      const result = await resolvePackage(packagePath, tempDir, 0);

      expect(result.config.name).toBe(packagePath);
      expect(result.config.version).toBe('0.0.0');
      expect(result.partials).toHaveLength(1);
    });

    it('should load default protected from index.js', async () => {
      const packagePath = path.join(tempDir, 'protected-package');
      await fs.ensureDir(path.join(packagePath, 'partials'));

      await fs.writeJson(path.join(packagePath, 'package.json'), {
        name: '@test/protected',
        version: '1.0.0',
      });

      await fs.writeFile(
        path.join(packagePath, 'index.js'),
        `export default {
  name: '@test/protected',
  partials: './partials',
  defaultProtected: ['important-rule']
};`
      );

      await fs.writeFile(
        path.join(packagePath, 'partials', 'important-rule.md'),
        `---
id: important-rule
---

# Important Rule`
      );

      const result = await resolvePackage(packagePath, tempDir, 0);

      expect(result.defaultProtected).toContain('important-rule');
    });

    it('should throw error for non-existent package', async () => {
      await expect(
        resolvePackage('/non/existent/path', tempDir, 0)
      ).rejects.toThrow();
    });

    it('should handle custom partials directory from ai-policies config', async () => {
      const packagePath = path.join(tempDir, 'custom-dir-package');
      await fs.ensureDir(path.join(packagePath, 'rules'));

      await fs.writeJson(path.join(packagePath, 'package.json'), {
        name: '@test/custom-dir',
        version: '1.0.0',
        'ai-policies': {
          partials: './rules',
        },
      });

      await fs.writeFile(
        path.join(packagePath, 'rules', 'custom-rule.md'),
        `---
id: custom-rule
---

# Custom Rule`
      );

      const result = await resolvePackage(packagePath, tempDir, 0);

      expect(result.partials).toHaveLength(1);
      expect(result.partials[0].frontmatter.id).toBe('custom-rule');
    });
  });

  describe('resolveExtendsArray', () => {
    it('should resolve multiple packages in order', async () => {
      // Create two test packages
      const package1 = path.join(tempDir, 'package1');
      const package2 = path.join(tempDir, 'package2');

      for (const [pkgPath, name, id] of [
        [package1, '@test/package1', 'rule1'],
        [package2, '@test/package2', 'rule2'],
      ] as const) {
        await fs.ensureDir(path.join(pkgPath, 'partials'));
        await fs.writeJson(path.join(pkgPath, 'package.json'), {
          name,
          version: '1.0.0',
        });
        await fs.writeFile(
          path.join(pkgPath, 'partials', `${id}.md`),
          `---
id: ${id}
---

# ${id}`
        );
      }

      const result = await resolveExtendsArray([package1, package2], tempDir);

      expect(result).toHaveLength(2);
      expect(result[0].config.name).toBe('@test/package1');
      expect(result[1].config.name).toBe('@test/package2');
    });

    it('should set correct source index for each package', async () => {
      const package1 = path.join(tempDir, 'pkg1');
      const package2 = path.join(tempDir, 'pkg2');

      for (const [pkgPath, idx] of [
        [package1, 0],
        [package2, 1],
      ] as const) {
        await fs.ensureDir(path.join(pkgPath, 'partials'));
        await fs.writeJson(path.join(pkgPath, 'package.json'), {
          name: `@test/pkg${idx}`,
          version: '1.0.0',
        });
        await fs.writeFile(
          path.join(pkgPath, 'partials', 'rule.md'),
          `---
id: rule-${idx}
---

# Rule`
        );
      }

      const result = await resolveExtendsArray([package1, package2], tempDir);

      expect(result[0].partials[0].sourceIndex).toBe(0);
      expect(result[1].partials[0].sourceIndex).toBe(1);
    });
  });

  describe('getAllPartials', () => {
    it('should combine partials from all packages', async () => {
      const package1 = path.join(tempDir, 'all-pkg1');
      const package2 = path.join(tempDir, 'all-pkg2');

      await fs.ensureDir(path.join(package1, 'partials'));
      await fs.ensureDir(path.join(package2, 'partials'));

      await fs.writeJson(path.join(package1, 'package.json'), {
        name: '@test/all1',
        version: '1.0.0',
      });
      await fs.writeJson(path.join(package2, 'package.json'), {
        name: '@test/all2',
        version: '1.0.0',
      });

      await fs.writeFile(
        path.join(package1, 'partials', 'a.md'),
        '---\nid: a\n---\n# A'
      );
      await fs.writeFile(
        path.join(package2, 'partials', 'b.md'),
        '---\nid: b\n---\n# B'
      );

      const packages = await resolveExtendsArray([package1, package2], tempDir);
      const allPartials = getAllPartials(packages);

      expect(allPartials).toHaveLength(2);
      expect(allPartials.map(p => p.frontmatter.id)).toContain('a');
      expect(allPartials.map(p => p.frontmatter.id)).toContain('b');
    });
  });

  describe('getDefaultProtectedPartials', () => {
    it('should combine default protected from all packages', async () => {
      const pkg1 = path.join(tempDir, 'prot1');
      const pkg2 = path.join(tempDir, 'prot2');

      for (const pkgPath of [pkg1, pkg2]) {
        await fs.ensureDir(path.join(pkgPath, 'partials'));
        await fs.writeJson(path.join(pkgPath, 'package.json'), {
          name: pkgPath.includes('1') ? '@test/prot1' : '@test/prot2',
          version: '1.0.0',
        });
      }

      // Create index.js with defaultProtected
      await fs.writeFile(
        path.join(pkg1, 'index.js'),
        `export default { defaultProtected: ['rule-a'] };`
      );
      await fs.writeFile(
        path.join(pkg2, 'index.js'),
        `export default { defaultProtected: ['rule-b'] };`
      );

      const packages = await resolveExtendsArray([pkg1, pkg2], tempDir);
      const defaultProtected = getDefaultProtectedPartials(packages);

      expect(defaultProtected).toContain('rule-a');
      expect(defaultProtected).toContain('rule-b');
    });

    it('should deduplicate protected partials', async () => {
      const pkg1 = path.join(tempDir, 'dup1');
      const pkg2 = path.join(tempDir, 'dup2');

      for (const pkgPath of [pkg1, pkg2]) {
        await fs.ensureDir(path.join(pkgPath, 'partials'));
        await fs.writeJson(path.join(pkgPath, 'package.json'), {
          name: pkgPath.includes('1') ? '@test/dup1' : '@test/dup2',
          version: '1.0.0',
        });
        await fs.writeFile(
          path.join(pkgPath, 'index.js'),
          `export default { defaultProtected: ['shared-rule'] };`
        );
      }

      const packages = await resolveExtendsArray([pkg1, pkg2], tempDir);
      const defaultProtected = getDefaultProtectedPartials(packages);

      expect(defaultProtected.filter(p => p === 'shared-rule')).toHaveLength(1);
    });
  });
});
