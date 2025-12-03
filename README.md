# AI Policies

> Centralized AI IDE rules management for Cursor and GitHub Copilot

[![CI](https://github.com/ai-policies/ai-policies/workflows/CI/badge.svg)](https://github.com/ai-policies/ai-policies/actions)
[![Release](https://github.com/ai-policies/ai-policies/workflows/Release/badge.svg)](https://github.com/ai-policies/ai-policies/actions)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

AI Policies is an open-source solution that centralizes AI IDE rules across your development workflow. It composes modular policy partials from versioned packages, resolves semantic versioning, and syncs outputs with a single command.

## 🚀 Quick Start

```bash
# Install globally
npm install -g @ai-policies/cli

# Initialize in your project
ai-policies init

# Sync policies to generate IDE configurations
ai-policies sync
```

That's it! Your `.cursorrules` and `.copilot/instructions.md` files are now generated and ready to use.

## ✨ Features

- 🔧 **Modular Policies**: Compose rules from versioned policy packages
- 📦 **Semantic Versioning**: Automatic dependency resolution with semver
- 🔄 **Single Command Sync**: Update all IDE configurations at once
- 🤖 **GitHub Actions**: Automated PR updates across repositories
- 🛡️ **Protected Blocks**: Preserve critical policy sections
- 👥 **Team Customization**: Add team-specific rules and overrides
- 📊 **Validation**: Schema validation and conflict detection
- 🔍 **Diff Support**: See what changed before applying updates
- 🏥 **Health Checks**: Built-in doctor command for troubleshooting

## 🎯 Supported IDEs

| IDE | Configuration File | Features |
|-----|-------------------|----------|
| **Cursor** | `.cursorrules` | Rules, patterns, examples, anti-patterns |
| **GitHub Copilot** | `.copilot/instructions.md` | Instructions, examples, constraints, templates |

## 📖 Core Concepts

### Policy Partials
Markdown files with YAML frontmatter that define specific rules:

```markdown
---
id: react-hooks
layer: stack
weight: 30
protected: false
dependsOn: [core-safety]
owner: frontend-team
---

# React Hooks Guidelines

- Always use functional components with hooks
- Use useCallback for event handlers
- Implement proper cleanup in useEffect
```

### Policy Packages
Collections of partials with versioning:

```json
{
  "name": "@ai-policies/frontend-react",
  "version": "1.0.0",
  "ai-policies": {
    "partials": {
      "cursor": "cursor/partials",
      "copilot": "copilot/partials"
    }
  }
}
```

### Manifest Configuration
Project-level configuration in `.ai-policies.yaml`:

```yaml
requires:
  "@ai-policies/core": "^1.0.0"
  "@ai-policies/frontend-react": "^1.0.0"

output:
  cursor: ./.cursorrules
  copilot: ./.copilot/instructions.md

compose:
  order: [core, domain, stack, team]
  protectedLayers: [core]
  teamAppend: true
```

## 📚 Documentation

The main documentation is in this README. For more details:

- **Getting Started**: See the [Quick Start](#-quick-start) section above
- **Configuration**: See the [Manifest Configuration](#manifest-configuration) section
- **CLI Commands**: See the [CLI Commands](#-cli-commands) section below
- **Examples**: See the [examples/](examples/) directory for sample configurations
- **Contributing**: See [CONTRIBUTING.md](CONTRIBUTING.md) for development guidelines

## 🏗️ Architecture

This monorepo contains:

```
packages/
├── cli/                    # Command-line interface
├── core-schemas/          # JSON schemas for validation
├── compose-engine/        # Policy composition logic
├── providers/             # IDE-specific adapters
│   ├── provider-cursor/   # Cursor rules generator
│   └── provider-copilot/  # Copilot instructions generator
├── policy-registry/       # Default open-source policies
└── update-bot-action/     # GitHub Action for automation

examples/
├── react-app/            # React application example
└── ruby-service/         # Ruby service example
```

## 🔧 CLI Commands

| Command | Description |
|---------|-------------|
| `ai-policies init` | Initialize AI Policies in current directory |
| `ai-policies sync` | Generate IDE configuration files |
| `ai-policies diff` | Show differences between current and generated configs |
| `ai-policies update` | Update policy packages to latest versions |
| `ai-policies doctor` | Check for common issues and problems |
| `ai-policies validate` | Validate configuration and schema compliance |

## 📦 Built-in Policy Packages

### @ai-policies/core
Essential safety and security rules for all projects:
- Security fundamentals (no hardcoded secrets, input validation)
- Privacy protection (no PII logging, data minimization)
- Error handling best practices
- Code quality standards

### @ai-policies/frontend-react
React development patterns and best practices:
- Component architecture guidelines
- Hooks usage patterns
- State management recommendations
- Performance optimization tips
- Accessibility requirements

### @ai-policies/workflows-jira
Jira integration and workflow management:
- Commit message conventions with ticket references
- Branch naming patterns
- Pull request templates
- Documentation linking

## 🚀 Getting Started

### 1. Install the CLI

```bash
npm install -g @ai-policies/cli
```

### 2. Initialize in Your Project

```bash
cd my-project
ai-policies init
```

Choose from preset configurations or customize your setup.

### 3. Customize Your Configuration

Edit `.ai-policies.yaml` to add or remove policy packages:

```yaml
requires:
  "@ai-policies/core": "^1.0.0"
  "@ai-policies/frontend-react": "^1.0.0"  # Add for React projects
  "@ai-policies/workflows-jira": "~1.0.0"  # Add for Jira integration

# Add team-specific customizations
overrides:
  teamAppendContent: |
    ## Team Guidelines
    - Use our design system components
    - Follow company naming conventions
    - Include comprehensive tests
```

### 4. Generate IDE Configurations

```bash
ai-policies sync
```

This generates:
- `.cursorrules` for Cursor IDE
- `.copilot/instructions.md` for GitHub Copilot

### 5. Set Up Automation (Optional)

Add the GitHub Action to automatically update policies across repositories:

```yaml
# .github/workflows/ai-policies.yml
name: AI Policies Update
on:
  schedule:
    - cron: '0 9 * * 1'  # Weekly on Mondays

jobs:
  update:
    runs-on: ubuntu-latest
    steps:
      - uses: ai-policies/ai-policies/packages/update-bot-action@main
        with:
          token: ${{ secrets.GITHUB_TOKEN }}
          organization: your-org
```

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

### Development Setup

**Prerequisites:**
- Node.js 18+ 
- pnpm 8+ (install with `npm install -g pnpm` or `corepack enable`)

```bash
# Clone the repository
git clone https://github.com/ai-policies/ai-policies.git
cd ai-policies

# Install pnpm (if not already installed)
npm install -g pnpm
# OR use corepack (comes with Node.js 16.9+)
corepack enable
corepack prepare pnpm@8.15.1 --activate

# Install dependencies
pnpm install

# Build all packages
pnpm build

# Run tests
pnpm test

# Start development mode
pnpm dev
```

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Inspired by the need for consistent AI assistant behavior across development teams
- Built with modern tooling: TypeScript, pnpm workspaces, Changesets
- Thanks to all contributors and the open-source community

## 🔍 Troubleshooting

### Common Issues

**No policy partials found after sync:**
- Verify your `.ai-policies.yaml` has correct package names in `requires`
- Check that policy packages are properly installed
- Run `ai-policies doctor` to diagnose issues

**Generated files are empty:**
- Ensure at least one output target (cursor or copilot) is specified
- Check that policy packages contain partials for your selected provider
- Run `ai-policies validate` to check configuration

**Type errors or build failures:**
- Run `pnpm install` to ensure all dependencies are installed
- Run `pnpm build` to build all packages
- Check TypeScript configuration with `pnpm typecheck`

## 📞 Support

- 🐛 [Report Issues](https://github.com/ai-policies/ai-policies/issues)
- 💬 [Discussions](https://github.com/ai-policies/ai-policies/discussions)
- 📖 [Contributing Guide](CONTRIBUTING.md)

---

<div align="center">
  <strong>Made with ❤️ by the AI Policies team</strong>
</div>
