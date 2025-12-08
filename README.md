# AI Policies

[![npm version](https://img.shields.io/npm/v/ai-policies.svg)](https://www.npmjs.com/package/ai-policies)
[![CI](https://github.com/mucahitgurbuz/ai-policies/actions/workflows/ci.yml/badge.svg)](https://github.com/mucahitgurbuz/ai-policies/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js Version](https://img.shields.io/node/v/ai-policies.svg)](https://nodejs.org)

Centralized AI IDE rules management for Cursor and GitHub Copilot.

**AI Policies** helps organizations standardize AI assistant behavior across all projects with reusable, version-controlled rule sets.

## Why AI Policies?

As teams adopt AI coding assistants like Cursor and GitHub Copilot, maintaining consistent coding standards becomes challenging:

- **Inconsistent AI behavior** - Different projects have different rules scattered in various formats
- **Security gaps** - Critical safety rules may be missing or overridden
- **Maintenance burden** - Updating rules across dozens of repositories is tedious
- **No reusability** - Good patterns can't be shared across teams

AI Policies solves this with an **ESLint-like configuration model**:

```yaml
# .ai-policies.yaml
extends:
  - '@ai-policies/core' # Security & quality fundamentals
  - '@ai-policies/frontend-react' # React best practices
  - './team-policies' # Your team's custom rules

output:
  cursor: '.cursorrules'
  copilot: '.github/copilot-instructions.md'

protected:
  - 'core-safety' # Can never be overridden
```

## Key Features

| Feature                 | Description                                               |
| ----------------------- | --------------------------------------------------------- |
| **ESLint-style Config** | Familiar array-based `extends` - order matters, last wins |
| **npm Packages**        | Install and share policies via npm registry               |
| **Local Policies**      | Mix npm packages with local team rules                    |
| **Protected Rules**     | Mark critical policies that can't be overridden           |
| **Multi-IDE Support**   | Generate `.cursorrules` and Copilot instructions          |
| **Version Control**     | Track rule changes with semantic versioning               |

## Quick Start

### 1. Install

```bash
npm install -g ai-policies
```

### 2. Initialize

```bash
cd your-project
ai-policies init --preset frontend
```

This creates `.ai-policies.yaml` and installs recommended packages.

### 3. Sync

```bash
ai-policies sync
```

Generates `.cursorrules` and `.copilot/instructions.md` from your policies.

## Configuration

### Basic Configuration

```yaml
# .ai-policies.yaml
extends:
  - '@ai-policies/core'

output:
  cursor: '.cursorrules'
  copilot: '.copilot/instructions.md'
```

### Full Configuration

```yaml
extends:
  - '@ai-policies/core' # npm package (first = lowest priority)
  - '@ai-policies/frontend-react' # npm package
  - './team-policies' # local directory (last = highest priority)

output:
  cursor: '.cursorrules'
  copilot: '.github/copilot-instructions.md'

protected:
  - 'core-safety' # These partials can never be overridden
  - 'no-hardcoded-secrets'

exclude:
  - 'some-unwanted-partial' # Exclude specific partials
```

### How Conflict Resolution Works

**Rule: Last wins, unless protected**

```yaml
extends:
  - '@ai-policies/core' # defines 'code-style' partial
  - '@ai-policies/team-a' # also defines 'code-style' partial
  - './local' # also defines 'code-style' partial (WINS)
```

The `./local` version of `code-style` is used because it's last in the array.

**Exception: Protected partials are preserved**

```yaml
extends:
  - '@ai-policies/core' # defines 'core-safety'
  - './local' # tries to override 'core-safety' (IGNORED)

protected:
  - 'core-safety' # Original version preserved
```

## CLI Commands

| Command                     | Description                                   |
| --------------------------- | --------------------------------------------- |
| `ai-policies init`          | Initialize configuration in current directory |
| `ai-policies sync`          | Generate IDE configurations from policies     |
| `ai-policies install <pkg>` | Install a policy package and add to config    |
| `ai-policies migrate`       | Migrate v1.x config to v2.0 format            |
| `ai-policies validate`      | Validate configuration and partials           |
| `ai-policies diff`          | Show pending changes                          |
| `ai-policies doctor`        | Check for common issues                       |

### Examples

```bash
# Initialize with React preset
ai-policies init --preset frontend

# Install additional package
ai-policies install @ai-policies/workflows-jira

# Preview changes without writing files
ai-policies sync --dry

# Migrate from v1.x format
ai-policies migrate
```

## Creating Policy Packages

### Package Structure

```
my-policies/
├── package.json
├── index.js              # Export metadata
└── partials/
    ├── our-conventions.md
    └── security-rules.md
```

### package.json

```json
{
  "name": "@mycompany/ai-policies",
  "version": "1.0.0",
  "main": "index.js",
  "ai-policies": {
    "partials": "./partials"
  }
}
```

### index.js

```javascript
export default {
  name: '@mycompany/ai-policies',
  partials: './partials',
  defaultProtected: ['security-rules'], // Protected by default
};
```

### Partial Format

```markdown
---
id: our-conventions
description: Team coding conventions
owner: frontend-team
tags: [conventions, required]
---

# Our Coding Conventions

- Use TypeScript strict mode
- Prefer functional components
- Follow our naming conventions
```

**Required field:** `id`
**Optional fields:** `description`, `owner`, `tags`, `providers`

## Built-in Packages

| Package                       | Description                                         |
| ----------------------------- | --------------------------------------------------- |
| `@ai-policies/core`           | Security fundamentals, code quality, error handling |
| `@ai-policies/frontend-react` | React patterns, hooks best practices, accessibility |
| `@ai-policies/workflows-jira` | Jira integration, commit formats, PR templates      |

## Scalability for Organizations

### Easy Updates

1. Update your policy package: `npm version patch`
2. Publish: `npm publish`
3. Clients run: `npm update && ai-policies sync`

### Easy Adoption

1. Install: `npm install @yourcompany/ai-policies`
2. Add to extends array
3. Run: `ai-policies sync`

### Monorepo Support

Reference shared policies via local paths:

```yaml
extends:
  - '../../shared/ai-policies' # Shared across all packages
  - './local-overrides' # Package-specific rules
```

## Migration from v1.x

If you're upgrading from v1.x, run:

```bash
ai-policies migrate
```

This automatically converts your config:

**Before (v1.x):**

```yaml
extends:
  '@ai-policies/core': '^1.0.0'
compose:
  order: [core, domain, stack, team]
  protectedLayers: [core]
```

**After:**

```yaml
extends:
  - '@ai-policies/core'
protected:
  - 'core-safety'
```

## Development

```bash
# Install dependencies
npm install

# Build
npm run build

# Test
npm run test:run

# Lint
npm run lint
```

## License

MIT
