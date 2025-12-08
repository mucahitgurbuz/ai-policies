# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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

