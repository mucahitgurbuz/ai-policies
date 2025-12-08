# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [2.0.0] - 2024-12-08

### ⚠️ Breaking Changes

This is a major release that redesigns AI Policies to follow ESLint's configuration model.

#### Configuration Format

- **`extends`** changed from object to array

  ```yaml
  # Before (v1.x)
  extends:
    '@ai-policies/core': '^1.0.0'

  # After (v2.0)
  extends:
    - '@ai-policies/core'
  ```

- **`compose` section removed** - Priority is now determined by array order (last wins)

- **`protected` is now a config-level array** instead of partial frontmatter
  ```yaml
  # v2.0 - Protect specific partials
  protected:
    - 'core-safety'
    - 'no-hardcoded-secrets'
  ```

#### Partial Frontmatter

- **Removed fields**: `layer`, `weight`, `protected`, `dependsOn`
- **Required field**: `id`
- **Optional fields**: `description`, `owner`, `tags`, `providers`

### Added

- **ESLint-style array `extends`** - Familiar configuration pattern
- **npm package resolution** - Install policy packages from npm registry
- **Local path support** - Mix npm packages with `./local-policies`
- **`install` command** - `ai-policies install @ai-policies/frontend-react`
- **`migrate` command** - Automatic v1.x to v2.0 migration
- **`defaultProtected`** - Packages can declare default protected partials
- **`exclude` config option** - Exclude specific partials from output

### Changed

- **Conflict resolution** - Simple "last wins" rule instead of layers/weights
- **Package structure** - Moved from `src/policies/` to `packages/` with npm format
- **Simplified partial format** - Only `id` is required in frontmatter

### Removed

- Layer system (`core`, `domain`, `stack`, `team`)
- Weight-based ordering within layers
- `dependsOn` dependency resolution
- `compose.order` and `compose.protectedLayers` config
- `compose.teamAppend` and `overrides.teamAppendContent`
- Built-in policy registry (replaced by npm resolution)

### Migration

Run `ai-policies migrate` to automatically convert your v1.x configuration.

See [Migration Guide](#migration-from-v1x) in README.md for details.

## [1.1.0] - 2024-12-08

### Changed

- **BREAKING**: Renamed `requires` to `extends` in `.ai-policies.yaml` configuration (ESLint-style)
  - Before: `requires: { '@ai-policies/core': '^1.0.0' }`
  - After: `extends: { '@ai-policies/core': '^1.0.0' }`
- **BREAKING**: Unified Cursor and Copilot policy partials into a single directory
  - Before: `policies/core/cursor/partials/` and `policies/core/copilot/partials/`
  - After: `policies/core/partials/` (applies to all providers)
- Updated `policy-package.schema.json` to reflect unified partials structure

### Removed

- Removed provider-specific partials directories (cursor/copilot subdirectories)
- Removed duplicate policy content between Cursor and Copilot versions

### Migration Guide

1. Update your `.ai-policies.yaml`:

   ```yaml
   # Old
   requires:
     '@ai-policies/core': '^1.0.0'

   # New
   extends:
     '@ai-policies/core': '^1.0.0'
   ```

2. If you have custom policy packages, move partials from `cursor/partials/` and `copilot/partials/` to a unified `partials/` directory.

3. Run `ai-policies sync` to regenerate your IDE configuration files.

## [1.0.2] - 2024-12-01

### Fixed

- Initial stable release fixes

## [1.0.1] - 2024-11-28

### Fixed

- Bug fixes and improvements

## [1.0.0] - 2024-11-25

### Added

- Initial release
- Policy composition system with layers (core, domain, stack, team)
- Support for Cursor (`.cursorrules`) and GitHub Copilot (`.copilot/instructions.md`)
- CLI commands: `init`, `sync`, `diff`, `validate`, `doctor`, `update`
- Built-in policy packages: `@ai-policies/core`, `@ai-policies/frontend-react`, `@ai-policies/workflows-jira`
- Protected partials that cannot be overridden
- Weight-based ordering within layers
- Dependency resolution between partials
