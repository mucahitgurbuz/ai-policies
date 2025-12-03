# AI Policies

Centralized AI IDE rules management for Cursor and GitHub Copilot.

## What is this?

AI Policies lets you manage AI assistant rules across your projects with:

- **Policy Packages** - Reusable collections of rules (security, React patterns, etc.)
- **Composition** - Combine multiple packages with priority layers
- **Multi-IDE Support** - Generate `.cursorrules` and `.copilot/instructions.md`

## Quick Start

```bash
# Install globally
npm install -g ai-policies

# Initialize in your project
ai-policies init

# Generate IDE configurations
ai-policies sync
```

## Configuration

Create `.ai-policies.yaml` in your project root:

```yaml
requires:
  '@ai-policies/core': '^1.0.0'
  '@ai-policies/frontend-react': '^1.0.0'

output:
  cursor: '.cursorrules'
  copilot: '.copilot/instructions.md'

compose:
  order: [core, domain, stack, team]
  protectedLayers: [core]
```

## CLI Commands

| Command                | Description                 |
| ---------------------- | --------------------------- |
| `ai-policies init`     | Initialize configuration    |
| `ai-policies sync`     | Generate IDE configurations |
| `ai-policies diff`     | Show pending changes        |
| `ai-policies validate` | Validate configuration      |
| `ai-policies doctor`   | Check for issues            |

## Built-in Policies

The package includes these policy packages in `src/policies/`:

- **core** - Security fundamentals and code quality rules
- **frontend-react** - React patterns and best practices
- **workflows-jira** - Jira integration guidelines

## Creating Custom Policies

Create a partial in your project:

```markdown
---
id: my-custom-rule
layer: team
weight: 50
protected: false
dependsOn: []
owner: my-team
description: My custom rule
---

# My Custom Rule

- Follow this pattern
- Avoid that anti-pattern
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
