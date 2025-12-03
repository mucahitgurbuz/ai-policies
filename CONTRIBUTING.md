# Contributing to AI Policies

We love your input! We want to make contributing to AI Policies as easy and transparent as possible, whether it's:

- Reporting a bug
- Discussing the current state of the code
- Submitting a fix
- Proposing new features
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

**Prerequisites:**
- Node.js 18+
- pnpm 8+ (install with `npm install -g pnpm` or use `corepack enable`)

```bash
# Clone your fork
git clone https://github.com/your-username/ai-policies.git
cd ai-policies

# Install pnpm (if not already installed)
npm install -g pnpm
# OR use corepack (comes with Node.js 16.9+)
corepack enable
corepack prepare pnpm@8.15.1 --activate

# Install dependencies (this will generate pnpm-lock.yaml if it doesn't exist)
pnpm install

# Note: After first install, commit pnpm-lock.yaml to ensure reproducible builds

# Build all packages
pnpm build

# Run tests
pnpm test

# Start development mode (watches for changes)
pnpm dev
```

### Project Structure

```
packages/
├── cli/                    # Main CLI package
├── core-schemas/          # JSON schemas and validation
├── compose-engine/        # Policy composition logic
├── providers/             # IDE-specific providers
├── policy-registry/       # Built-in policy packages
└── update-bot-action/     # GitHub Action

examples/                  # Example projects
docs/                     # Documentation
.github/                  # GitHub workflows and templates
```

## Contributing to Policy Packages

### Adding New Policy Packages

1. Create a new directory in `packages/policy-registry/policies/`
2. Follow the package structure:
   ```
   your-package/
   ├── package.json
   ├── cursor/partials/
   └── copilot/partials/
   ```
3. Create partial files with proper frontmatter
4. Test your package with the CLI

### Policy Package Guidelines

- **Keep policies generic and safe** - no company-specific information
- **Use clear, descriptive IDs** for partials
- **Include proper dependencies** in frontmatter
- **Test with both Cursor and Copilot** providers
- **Follow semantic versioning** for package versions

### Example Policy Partial

```markdown
---
id: nodejs-error-handling
layer: stack
weight: 40
protected: false
dependsOn: [core-safety]
owner: backend-team
description: Error handling patterns for Node.js applications
---

# Node.js Error Handling

## Async Error Handling
- Always use try-catch with async/await
- Handle promise rejections explicitly
- Use error-first callbacks consistently

## Examples

```javascript
// ✅ Good: Proper async error handling
async function fetchUser(id) {
  try {
    const user = await userService.getById(id);
    return user;
  } catch (error) {
    logger.error('Failed to fetch user', { userId: id, error: error.message });
    throw new UserNotFoundError(`User ${id} not found`);
  }
}
```
```

## Code Style

We use ESLint and Prettier to maintain consistent code style:

```bash
# Lint code
pnpm lint

# Fix linting issues
pnpm lint:fix

# Format code
pnpm format

# Check formatting
pnpm format:check
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
pnpm test

# Run tests in watch mode
pnpm test:watch

# Run tests with coverage
pnpm test:coverage
```

#### Writing Tests

- Test public APIs and interfaces
- Use descriptive test names
- Group related tests with `describe`
- Use `beforeEach`/`afterEach` for setup/cleanup
- Mock external dependencies

Example test:

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { PolicyComposer } from './composer';

describe('PolicyComposer', () => {
  let composer: PolicyComposer;

  beforeEach(() => {
    composer = new PolicyComposer();
  });

  it('should compose policies in correct order', async () => {
    const partials = [
      createMockPartial('core-safety', 'core', 10),
      createMockPartial('react-hooks', 'stack', 30),
    ];

    const result = await composer.compose(partials, mockConfig, { provider: 'cursor' });

    expect(result.content).toContain('core-safety');
    expect(result.content).toContain('react-hooks');
  });
});
```

## Reporting Bugs

We use GitHub issues to track public bugs. Report a bug by [opening a new issue](https://github.com/ai-policies/ai-policies/issues).

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

**Environment:**
- OS: [e.g. macOS, Windows, Linux]
- Node.js version: [e.g. 18.16.0]
- AI Policies version: [e.g. 1.0.0]
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

We use [Semantic Versioning](http://semver.org/) and [Changesets](https://github.com/changesets/changesets) for versioning.

### Adding Changesets

When you make changes that should trigger a release:

```bash
# Add a changeset
pnpm changeset

# Follow the prompts to describe your changes
```

### Changeset Guidelines

- **Patch**: Bug fixes, documentation updates, internal refactoring
- **Minor**: New features, new policy packages, non-breaking API additions
- **Major**: Breaking changes, API removals, major architecture changes

## Release Process

Releases are automated via GitHub Actions:

1. Create PRs with changesets
2. Merge to main
3. GitHub Action creates a release PR
4. Merge the release PR to publish packages

## Community

- Join our [Discord](https://discord.gg/ai-policies) for discussions
- Follow us on [Twitter](https://twitter.com/ai_policies)
- Read our [blog](https://blog.ai-policies.dev) for updates

## License

By contributing, you agree that your contributions will be licensed under the MIT License.

## Questions?

Feel free to reach out:
- Open a [GitHub Discussion](https://github.com/ai-policies/ai-policies/discussions)
- Email us at [contributors@ai-policies.dev](mailto:contributors@ai-policies.dev)
- Join our [Discord community](https://discord.gg/ai-policies)

## Recognition

Contributors are recognized in:
- Release notes
- [Contributors page](https://github.com/ai-policies/ai-policies/graphs/contributors)
- Annual contributor highlights

Thank you for contributing to AI Policies! 🎉
