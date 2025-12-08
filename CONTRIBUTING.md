# Contributing to AI Policies

We love your input! We want to make contributing to AI Policies as easy and transparent as possible, whether it's:

- Reporting a bug
- Discussing the current state of the code
- Submitting a fix
- Proposing new features
- Creating new policy packages
- Becoming a maintainer

## Development Process

We use GitHub to host code, to track issues and feature requests, as well as accept pull requests.

### Pull Requests

Pull requests are the best way to propose changes to the codebase. We actively welcome your pull requests:

1. Fork the repo and create your branch from `main`
2. If you've added code that should be tested, add tests
3. If you've changed APIs, update the documentation
4. Ensure the test suite passes
5. Make sure your code lints
6. Issue that pull request!

### Development Setup

```bash
# Clone your fork
git clone https://github.com/your-username/ai-policies.git
cd ai-policies

# Install dependencies
npm install

# Build the project
npm run build

# Run tests
npm run test:run

# Run tests with coverage
npm run test:run -- --coverage

# Start development mode (watches for changes)
npm run dev
```

### Project Structure

```
ai-policies/
├── src/
│   ├── cli/                    # CLI commands and utilities
│   │   ├── commands/           # Individual CLI commands
│   │   └── utils/              # CLI helper functions
│   ├── compose/                # Policy composition engine
│   ├── packages/               # Package resolution
│   ├── providers/              # IDE-specific providers (Cursor, Copilot)
│   └── schemas/                # JSON schemas and validation
├── packages/                   # Built-in policy packages (npm publishable)
│   ├── core/                   # Core security and quality policies
│   ├── frontend-react/         # React development policies
│   └── workflows-jira/         # Jira integration policies
├── docs/                       # Documentation and RFCs
└── .github/                    # GitHub workflows and templates
```

## Contributing to Policy Packages

### Creating New Policy Packages

Policy packages are npm-publishable directories with this structure:

```
my-policies/
├── package.json        # npm package configuration
├── index.js            # Export metadata and defaultProtected
└── partials/           # Policy markdown files
    ├── my-rule.md
    └── another-rule.md
```

#### package.json

```json
{
  "name": "@mycompany/ai-policies",
  "version": "1.0.0",
  "main": "index.js",
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
  name: '@mycompany/ai-policies',
  partials: './partials',
  defaultProtected: ['critical-security-rules']  // Optional
};
```

### Policy Partial Format (v2.0)

```markdown
---
id: my-rule-id
description: Brief description of what this rule covers
owner: team-name
tags: [security, react, required]
providers: [cursor, copilot]  # Optional - omit to apply to all
---

# My Rule Title

## Guidelines

- First guideline
- Second guideline

## Examples

```javascript
// ✅ Good example
const good = 'example';

// ❌ Bad example
const bad = 'anti-pattern';
```
```

**Required field:** `id`  
**Optional fields:** `description`, `owner`, `tags`, `providers`

> **Note:** v2.0 removed `layer`, `weight`, `protected`, and `dependsOn` from partial frontmatter. These are now handled by the configuration file and extends array order.

### Policy Package Guidelines

- **Keep policies generic and safe** - no company-specific information in public packages
- **Use clear, descriptive IDs** for partials (e.g., `nodejs-error-handling`, `react-hooks-rules`)
- **Include good examples** - both ✅ good patterns and ❌ anti-patterns
- **Test with both Cursor and Copilot** providers
- **Follow semantic versioning** for package versions

## Code Style

We use ESLint and Prettier to maintain consistent code style:

```bash
# Lint code
npm run lint

# Fix linting issues
npm run lint:fix

# Format code
npm run format

# Check formatting
npm run format:check
```

### TypeScript Guidelines

- Use strict TypeScript configuration
- Prefer interfaces over types for object shapes
- Use proper generic constraints
- Avoid `any` - use `unknown` when necessary
- Export types that might be useful to consumers

### Testing

We use Vitest for testing:

```bash
# Run all tests
npm run test:run

# Run tests in watch mode
npm run test

# Run tests with coverage
npm run test:run -- --coverage
```

#### Writing Tests

- Test public APIs and interfaces
- Use descriptive test names
- Group related tests with `describe`
- Use `beforeEach`/`afterEach` for setup/cleanup
- Mock external dependencies (file system, network)

Example test:

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { PolicyComposer } from './composer';

describe('PolicyComposer', () => {
  let composer: PolicyComposer;

  beforeEach(() => {
    composer = new PolicyComposer();
  });

  it('should use last-wins for duplicate partial IDs', async () => {
    const partials = [
      createMockPartial('same-id', 0, '@test/first'),
      createMockPartial('same-id', 1, '@test/second'),
    ];

    const result = await composer.compose(partials, mockConfig, {
      provider: 'cursor',
    });

    // Last partial (higher sourceIndex) should win
    expect(result.content).toContain('from @test/second');
  });
});
```

## Reporting Bugs

We use GitHub issues to track public bugs. Report a bug by [opening a new issue](https://github.com/mucahitgurbuz/ai-policies/issues).

### Bug Reports

Great Bug Reports tend to have:

- A quick summary and/or background
- Steps to reproduce
  - Be specific!
  - Give sample code if you can
- What you expected would happen
- What actually happens
- Notes (possibly including why you think this might be happening, or stuff you tried that didn't work)

### Bug Report Template

```markdown
**Describe the bug**
A clear and concise description of what the bug is.

**To Reproduce**
Steps to reproduce the behavior:
1. Run command '...'
2. With configuration '....'
3. See error

**Expected behavior**
A clear and concise description of what you expected to happen.

**Configuration**
```yaml
# Your .ai-policies.yaml content
extends:
  - '@ai-policies/core'
output:
  cursor: '.cursorrules'
```

**Environment:**
- OS: [e.g. macOS, Windows, Linux]
- Node.js version: [e.g. 20.10.0]
- AI Policies version: [e.g. 2.0.0]
- IDE: [e.g. Cursor, VS Code with Copilot]

**Additional context**
Add any other context about the problem here.
```

## Feature Requests

We love feature requests! Before submitting one:

1. Check if it's already been requested
2. Consider if it fits the project scope
3. Think about how it would work with existing features
4. Provide a clear use case

Feature requests should include:

- Problem description
- Proposed solution
- Alternatives considered
- Use cases and examples

## Versioning

We use [Semantic Versioning](http://semver.org/) for releases.

- **Patch** (x.x.1): Bug fixes, documentation updates, internal refactoring
- **Minor** (x.1.x): New features, new policy packages, non-breaking API additions
- **Major** (1.x.x): Breaking changes, API removals, major architecture changes

## Release Process

Releases are automated via GitHub Actions:

1. Create PRs with changes
2. Merge to main
3. GitHub Action runs tests and publishes to npm

## License

By contributing, you agree that your contributions will be licensed under the MIT License.

## Questions?

Feel free to reach out:

- Open a [GitHub Discussion](https://github.com/mucahitgurbuz/ai-policies/discussions)
- Open a [GitHub Issue](https://github.com/mucahitgurbuz/ai-policies/issues)

## Recognition

Contributors are recognized in:

- Release notes
- [Contributors page](https://github.com/mucahitgurbuz/ai-policies/graphs/contributors)

Thank you for contributing to AI Policies! 🎉
