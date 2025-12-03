#!/usr/bin/env node

/**
 * Validate all built-in policy packages
 *
 * This script validates:
 * - Package.json structure and required fields
 * - Partial frontmatter against schema
 * - Dependency references between partials
 * - No duplicate partial IDs within packages
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import matter from 'gray-matter';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const policiesDir = path.join(__dirname, '..', 'policies');

const VALID_LAYERS = ['core', 'domain', 'stack', 'team'];
const VALID_PROVIDERS = ['cursor', 'copilot'];

let errors = [];
let warnings = [];

async function main() {
  console.log('🔍 Validating policy packages...\n');

  const packageDirs = await fs.readdir(policiesDir);

  for (const packageDir of packageDirs) {
    const packagePath = path.join(policiesDir, packageDir);
    const stat = await fs.stat(packagePath);

    if (stat.isDirectory()) {
      await validatePackage(packagePath, packageDir);
    }
  }

  // Report results
  console.log('\n' + '='.repeat(50));

  if (warnings.length > 0) {
    console.log(`\n⚠️  ${warnings.length} warning(s):`);
    warnings.forEach(w => console.log(`   ${w}`));
  }

  if (errors.length > 0) {
    console.log(`\n❌ ${errors.length} error(s):`);
    errors.forEach(e => console.log(`   ${e}`));
    process.exit(1);
  }

  console.log('\n✅ All policy packages are valid!');
}

async function validatePackage(packagePath, packageName) {
  console.log(`📦 Validating: ${packageName}`);

  // Validate package.json
  const packageJsonPath = path.join(packagePath, 'package.json');
  let packageConfig;

  try {
    const content = await fs.readFile(packageJsonPath, 'utf8');
    packageConfig = JSON.parse(content);
  } catch (e) {
    errors.push(`${packageName}: Missing or invalid package.json`);
    return;
  }

  // Check required fields
  if (!packageConfig.name) {
    errors.push(`${packageName}: Missing "name" in package.json`);
  } else if (!packageConfig.name.startsWith('@')) {
    errors.push(`${packageName}: Package name should be scoped (@scope/name)`);
  }

  if (!packageConfig.version) {
    errors.push(`${packageName}: Missing "version" in package.json`);
  }

  if (!packageConfig['ai-policies']?.partials) {
    warnings.push(
      `${packageName}: Missing "ai-policies.partials" in package.json`
    );
    return;
  }

  // Collect all partial IDs for dependency validation (per provider to allow same ID across providers)
  const partialIdsByProvider = {};
  const allPartialIds = new Set();
  const partials = [];

  // Validate partials for each provider
  for (const [provider, partialsDir] of Object.entries(
    packageConfig['ai-policies'].partials
  )) {
    if (!VALID_PROVIDERS.includes(provider)) {
      errors.push(`${packageName}: Invalid provider "${provider}"`);
      continue;
    }

    partialIdsByProvider[provider] = new Set();
    const fullPartialsPath = path.join(packagePath, partialsDir);

    try {
      await fs.access(fullPartialsPath);
      const files = await findMarkdownFiles(fullPartialsPath);

      if (files.length === 0) {
        warnings.push(
          `${packageName}: No partials found in "${partialsDir}" for ${provider}`
        );
        continue;
      }

      for (const file of files) {
        const partial = await validatePartial(file, packageName, provider);
        if (partial) {
          // Check for duplicates within the same provider only
          if (partialIdsByProvider[provider].has(partial.id)) {
            errors.push(
              `${packageName}: Duplicate partial ID "${partial.id}" in ${provider}`
            );
          }
          partialIdsByProvider[provider].add(partial.id);
          allPartialIds.add(partial.id);
          partials.push(partial);
        }
      }
    } catch {
      warnings.push(
        `${packageName}: Partials directory "${partialsDir}" not found for ${provider}`
      );
      continue;
    }
  }

  // Validate dependencies
  for (const partial of partials) {
    for (const dep of partial.dependsOn || []) {
      if (!allPartialIds.has(dep)) {
        // Check if it's a cross-package dependency (allowed but warn)
        warnings.push(
          `${packageName}/${partial.id}: Dependency "${dep}" not found in this package`
        );
      }
    }
  }

  console.log(`   ✓ ${partials.length} partials validated`);
}

async function validatePartial(filePath, packageName, provider) {
  const relativePath = path.relative(policiesDir, filePath);

  try {
    const content = await fs.readFile(filePath, 'utf8');
    const { data: frontmatter } = matter(content);

    // Check required fields
    if (!frontmatter.id) {
      errors.push(`${relativePath}: Missing "id" in frontmatter`);
      return null;
    }

    if (!/^[a-z0-9-]+$/.test(frontmatter.id)) {
      errors.push(
        `${relativePath}: Invalid "id" format (use lowercase, numbers, hyphens)`
      );
    }

    if (!frontmatter.layer) {
      errors.push(`${relativePath}: Missing "layer" in frontmatter`);
    } else if (!VALID_LAYERS.includes(frontmatter.layer)) {
      errors.push(`${relativePath}: Invalid layer "${frontmatter.layer}"`);
    }

    if (frontmatter.weight === undefined) {
      errors.push(`${relativePath}: Missing "weight" in frontmatter`);
    } else if (
      typeof frontmatter.weight !== 'number' ||
      frontmatter.weight < 0 ||
      frontmatter.weight > 1000
    ) {
      errors.push(
        `${relativePath}: Weight must be a number between 0 and 1000`
      );
    }

    if (frontmatter.protected === undefined) {
      errors.push(`${relativePath}: Missing "protected" in frontmatter`);
    }

    if (!Array.isArray(frontmatter.dependsOn)) {
      errors.push(`${relativePath}: "dependsOn" must be an array`);
    }

    if (!frontmatter.owner) {
      errors.push(`${relativePath}: Missing "owner" in frontmatter`);
    }

    // Check for self-dependency
    if (frontmatter.dependsOn?.includes(frontmatter.id)) {
      errors.push(`${relativePath}: Partial cannot depend on itself`);
    }

    // Validate optional fields
    if (frontmatter.providers) {
      if (!Array.isArray(frontmatter.providers)) {
        errors.push(`${relativePath}: "providers" must be an array`);
      } else {
        for (const p of frontmatter.providers) {
          if (!VALID_PROVIDERS.includes(p)) {
            errors.push(`${relativePath}: Invalid provider "${p}"`);
          }
        }
      }
    }

    return {
      id: frontmatter.id,
      dependsOn: frontmatter.dependsOn || [],
    };
  } catch (e) {
    errors.push(`${relativePath}: Failed to parse - ${e.message}`);
    return null;
  }
}

async function findMarkdownFiles(dir) {
  const files = [];
  const entries = await fs.readdir(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      files.push(...(await findMarkdownFiles(fullPath)));
    } else if (entry.name.endsWith('.md')) {
      files.push(fullPath);
    }
  }

  return files;
}

main().catch(e => {
  console.error('Validation failed:', e);
  process.exit(1);
});
