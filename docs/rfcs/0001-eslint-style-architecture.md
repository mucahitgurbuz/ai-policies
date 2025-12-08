# RFC 0001: ESLint-Style Architecture

- **Status**: Implemented
- **Author**: @mguerbuez
- **Created**: 2024-12-08

## Summary

Redesign ai-policies to follow ESLint's configuration and package model more closely. This includes array-based extends ordering, npm-installable policy packages, and simplified conflict resolution where "last wins" unless protected.

## Motivation

### Current Pain Points

1. **Unfamiliar mental model**: The current `layers` (core, domain, stack, team) and `weights` system is custom and requires learning
2. **Not truly installable**: Policy packages use version ranges but aren't actual npm packages you can install
3. **Complex configuration**: Users need to understand layers, weights, and composition order
4. **Duplicate concepts**: Layers and weights both affect ordering, which is confusing

### Why ESLint-Style?

ESLint's configuration model is:

- **Widely understood** by JavaScript/TypeScript developers
- **Simple**: Array order determines priority
- **Extensible**: Mix npm packages with local configs
- **Proven**: Battle-tested in millions of projects

## Detailed Design

### Configuration Format

#### Current (v1.x)

```yaml
extends:
  '@ai-policies/core': '^1.0.0'
  '@ai-policies/frontend-react': '^1.0.0'

output:
  cursor: '.cursorrules'
  copilot: '.copilot/instructions.md'

compose:
  order: [core, domain, stack, team]
  protectedLayers: [core]
  teamAppend: true

overrides:
  excludePartials: ['some-partial']
```

#### Proposed (v2.0)

```yaml
extends:
  - '@ai-policies/core' # npm package
  - '@ai-policies/frontend-react' # npm package
  - '@ai-policies/workflows-jira' # npm package
  - './team-policies' # local directory

output:
  cursor: '.cursorrules'
  copilot: '.copilot/instructions.md'

# Partials that cannot be overridden by later configs
protected:
  - 'core-safety'
  - 'no-hardcoded-secrets'

# Partials to exclude from final output
exclude:
  - 'some-unwanted-partial'
```

### Key Changes

| Aspect             | Current (v1.x)       | Proposed (v2.0)                  |
| ------------------ | -------------------- | -------------------------------- |
| `extends` format   | Object with versions | Array (order matters)            |
| Package resolution | Built-in only        | npm packages + local paths       |
| Priority system    | Layers + weights     | Array order (last wins)          |
| Protected content  | `protectedLayers`    | `protected` array of partial IDs |
| Versioning         | In config file       | In package.json (npm handles it) |

### Conflict Resolution

**Rule: Last wins, unless protected**

```yaml
extends:
  - '@ai-policies/core' # defines 'code-style' partial
  - '@ai-policies/team-a' # also defines 'code-style' partial
  - './local' # also defines 'code-style' partial
```

Result: `./local`'s `code-style` is used (last in array wins).

**Exception: Protected partials**

```yaml
extends:
  - '@ai-policies/core' # defines 'core-safety' (protected)
  - './local' # tries to override 'core-safety'

protected:
  - 'core-safety'
```

Result: `@ai-policies/core`'s `core-safety` is preserved, `./local`'s version is ignored with a warning.

### Package Structure

#### npm Package Layout

```
@ai-policies/core/
├── package.json
├── index.js              # Exports package metadata
├── partials/
│   ├── core-safety.md
│   ├── code-quality.md
│   └── error-handling.md
└── README.md
```

#### package.json

```json
{
  "name": "@ai-policies/core",
  "version": "2.0.0",
  "description": "Core AI policies for safety and code quality",
  "main": "index.js",
  "keywords": ["ai-policies", "cursor", "copilot"],
  "ai-policies": {
    "partials": "./partials"
  },
  "peerDependencies": {
    "ai-policies": "^2.0.0"
  }
}
```

#### index.js

```javascript
export default {
  name: '@ai-policies/core',
  partials: './partials',
  // Optional: declare which partials should be protected by default
  defaultProtected: ['core-safety', 'no-hardcoded-secrets'],
};
```

#### Partial Format (unchanged)

```markdown
---
id: core-safety
description: Fundamental safety rules for AI-generated code
owner: security-team
tags: [security, required]
---

# Core Safety Rules

- Never expose API keys...
```

**Removed from frontmatter:**

- ❌ `layer` - no longer needed
- ❌ `weight` - no longer needed
- ❌ `protected` - moved to config file
- ❌ `dependsOn` - simplified (order handles dependencies)

### Local Policies

Users can create local policy directories:

```
my-project/
├── .ai-policies.yaml
├── team-policies/
│   └── partials/
│       ├── our-conventions.md
│       └── project-specific.md
└── src/
```

Reference in config:

```yaml
extends:
  - '@ai-policies/core'
  - './team-policies' # Relative path to local directory
```

### Resolution Algorithm

```
1. Parse .ai-policies.yaml
2. For each entry in `extends` (in order):
   a. If starts with '@' or package name → resolve from node_modules
   b. If starts with './' or '/' → resolve as local path
   c. Load all partials from the resolved path
3. Build partial map (id → content):
   a. For each partial, check if ID already exists
   b. If exists and NOT in `protected` list → override (last wins)
   c. If exists and IN `protected` list → keep original, emit warning
   d. If new → add to map
4. Remove any partials listed in `exclude`
5. Concatenate all partials in the order they were defined
6. Generate output files
```

### CLI Changes

#### Install Command (new)

```bash
# Install a policy package
ai-policies install @ai-policies/frontend-react

# This runs: npm install @ai-policies/frontend-react
# And adds to .ai-policies.yaml extends array
```

#### Init Command (updated)

```bash
ai-policies init

# Prompts:
# ? What type of project? (Frontend/Backend/Fullstack)
# ? Install recommended packages? (Y/n)
#
# Creates .ai-policies.yaml and runs npm install
```

#### Sync Command (unchanged)

```bash
ai-policies sync
# Resolves extends, merges partials, generates output files
```

### TypeScript Types

```typescript
// Config file schema
interface AIPoliciesConfig {
  extends: string[]; // Package names or local paths
  output: {
    cursor?: string;
    copilot?: string;
  };
  protected?: string[]; // Partial IDs that can't be overridden
  exclude?: string[]; // Partial IDs to exclude
}

// Partial frontmatter (simplified)
interface PartialFrontmatter {
  id: string; // Unique identifier
  description?: string; // Human-readable description
  owner?: string; // Team/person responsible
  tags?: string[]; // For filtering/categorization
}

// Package metadata
interface PolicyPackage {
  name: string;
  version: string;
  partials: string; // Path to partials directory
  defaultProtected?: string[]; // Partials protected by default
}
```

## Migration Path

### For Users

1. Update `.ai-policies.yaml`:

```yaml
# Before (v1.x)
extends:
  '@ai-policies/core': '^1.0.0'
  '@ai-policies/frontend-react': '^1.0.0'

compose:
  order: [core, domain, stack, team]
  protectedLayers: [core]

# After (v2.0)
extends:
  - '@ai-policies/core'
  - '@ai-policies/frontend-react'

protected:
  - 'core-safety'
```

2. Install packages:

```bash
npm install @ai-policies/core @ai-policies/frontend-react
```

3. Run sync:

```bash
ai-policies sync
```

### Migration CLI Command

```bash
ai-policies migrate

# Automatically:
# 1. Converts config format
# 2. Installs required npm packages
# 3. Warns about removed features (layers, weights)
```

### For Package Authors

1. Publish packages to npm
2. Remove `layer` and `weight` from partial frontmatter
3. Move `protected: true` partials to `defaultProtected` in index.js

## Backward Compatibility

### Breaking Changes

- `extends` format changes from object to array
- `compose` section removed entirely
- `layers` concept removed
- `weights` concept removed
- `protected` in partial frontmatter removed
- Packages must be installed via npm

### Deprecation Strategy

1. **v1.1.x**: Current release (this PR)
2. **v1.2.0**: Add deprecation warnings for v1 config format
3. **v2.0.0**: New ESLint-style architecture (breaking)

## Alternatives Considered

### 1. Keep Layers, Just Add npm Support

**Pros**: Less breaking, familiar to existing users
**Cons**: Still complex, unfamiliar to new users

### 2. Use Actual ESLint

**Pros**: Zero new tooling
**Cons**: ESLint is for code linting, not AI policy management

### 3. YAML Inheritance (like Docker Compose)

**Pros**: Native YAML feature
**Cons**: Less explicit, harder to understand priority

## Open Questions

1. **Should we support `.js` config files?** (like `eslint.config.js`)
   - Pro: More flexibility, computed configs
   - Con: More complexity, security concerns

2. **How to handle transitive dependencies?**
   - If `@ai-policies/frontend-react` depends on `@ai-policies/core`, should it auto-include?
   - Recommendation: No auto-include, be explicit

3. **Should `protected` be in config or package?**
   - Current proposal: Config file (user controls)
   - Alternative: Package declares, user can override
   - Recommendation: Both (package has `defaultProtected`, user can add/remove)

4. **Monorepo support?**
   - Should we support workspace-level configs that projects inherit?
   - Recommendation: Yes, via local paths (`'../../shared-policies'`)

## Implementation Plan

### Phase 1: Core Infrastructure (Week 1-2)

- [ ] New config schema and parser
- [ ] npm package resolution
- [ ] Local path resolution
- [ ] New conflict resolution algorithm

### Phase 2: Package Updates (Week 2-3)

- [ ] Publish `@ai-policies/core` to npm
- [ ] Publish `@ai-policies/frontend-react` to npm
- [ ] Publish `@ai-policies/workflows-jira` to npm
- [ ] Update partial frontmatter (remove layer/weight)

### Phase 3: CLI Updates (Week 3-4)

- [ ] New `install` command
- [ ] Update `init` command
- [ ] Add `migrate` command
- [ ] Update `sync` command

### Phase 4: Documentation & Release (Week 4)

- [ ] Update README
- [ ] Migration guide
- [ ] Release v2.0.0

## References

- [ESLint Configuration](https://eslint.org/docs/latest/use/configure/)
- [Prettier Configuration](https://prettier.io/docs/en/configuration.html)
- [Stylelint Configuration](https://stylelint.io/user-guide/configure)
- [TypeScript tsconfig extends](https://www.typescriptlang.org/tsconfig#extends)

## Appendix

### Example: Full Project Setup

```bash
# 1. Initialize project
cd my-react-app
ai-policies init --preset frontend

# 2. Creates .ai-policies.yaml:
extends:
  - '@ai-policies/core'
  - '@ai-policies/frontend-react'

output:
  cursor: '.cursorrules'
  copilot: '.github/copilot-instructions.md'

protected:
  - 'core-safety'

# 3. Installs packages
npm install @ai-policies/core @ai-policies/frontend-react

# 4. Add team-specific rules
mkdir -p team-policies/partials
cat > team-policies/partials/our-rules.md << 'EOF'
---
id: our-rules
description: Team-specific coding conventions
owner: frontend-team
---

# Our Team Rules

- Use TypeScript strict mode
- Prefer functional components
- Use our design system components
EOF

# 5. Update config
extends:
  - '@ai-policies/core'
  - '@ai-policies/frontend-react'
  - './team-policies'          # Our rules come last (highest priority)

# 6. Generate IDE configs
ai-policies sync

# 7. Verify
cat .cursorrules
```

### Example: Overriding a Rule

```yaml
# Base package has 'code-style' partial with:
# - Use 2-space indentation
# - Use single quotes

# Team wants 4-space indentation but keep single quotes
# Create: ./team-policies/partials/code-style.md

---
id: code-style  # Same ID = override
description: Our code style (overrides base)
---

# Code Style

- Use 4-space indentation  # Changed
- Use single quotes        # Kept

# Config:
extends:
  - '@ai-policies/core'    # Has original code-style
  - './team-policies'      # Our code-style overrides it
```

### Example: Protecting Critical Rules

```yaml
extends:
  - '@ai-policies/core'
  - '@ai-policies/team-a' # Might try to weaken security
  - './local-experiments' # Definitely tries to weaken security

protected:
  - 'core-safety' # Can never be overridden
  - 'no-hardcoded-secrets' # Can never be overridden
  - 'input-validation' # Can never be overridden


# Result: Even if team-a or local-experiments define partials
# with these IDs, the original @ai-policies/core versions are used
```
