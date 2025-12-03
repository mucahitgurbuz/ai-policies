# Getting Started

Get AI Policies running in your project in under 5 minutes.

## Prerequisites

- Node.js 18+
- npm, yarn, or pnpm

## Installation

```bash
npm install -g @ai-policies/cli
```

## Quick Setup

### 1. Initialize

Navigate to your project and run:

```bash
cd my-project
ai-policies init
```

This creates `.ai-policies.yaml` with a default configuration.

### 2. Choose Your Policies

During init, select the policies that match your project:

- **Basic**: Core safety rules only
- **Frontend**: Core + React patterns
- **Backend**: Core + backend patterns
- **Full-stack**: Core + React + Jira workflows

Or edit `.ai-policies.yaml` manually:

```yaml
requires:
  '@ai-policies/core': '^1.0.0'
  '@ai-policies/frontend-react': '^1.0.0'

output:
  cursor: ./.cursorrules
  copilot: ./.copilot/instructions.md

compose:
  order: [core, domain, stack, team]
  protectedLayers: [core]
  teamAppend: true
```

### 3. Generate Configurations

```bash
ai-policies sync
```

This generates:

- `.cursorrules` for Cursor IDE
- `.copilot/instructions.md` for GitHub Copilot

### 4. Verify Setup

```bash
ai-policies doctor
```

Checks for common issues and validates your configuration.

## Adding Team-Specific Rules

Add custom rules in your `.ai-policies.yaml`:

```yaml
overrides:
  teamAppendContent: |
    ## Our Team Guidelines

    - Use our design system components
    - Follow company naming conventions
    - Always include tests
```

## Keeping Policies Updated

Check for differences:

```bash
ai-policies diff
```

Update policies:

```bash
ai-policies update --all
ai-policies sync
```

## Next Steps

- [CLI Reference](cli-reference.md) - All commands and options
- [Creating Packages](creating-packages.md) - Build custom policy packages
