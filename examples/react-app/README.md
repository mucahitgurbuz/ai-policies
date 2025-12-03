# React App Example - AI Policies

This is an example React application demonstrating how to use AI Policies to manage AI assistant rules for both Cursor and GitHub Copilot.

## Overview

This React application uses AI Policies to:

- Enforce security and safety guidelines for AI-generated code
- Apply React-specific development patterns and best practices
- Maintain consistent code quality across the team
- Customize IDE behavior for this specific project

## AI Policies Configuration

### Policy Packages Used

- **@ai-policies/core**: Core safety and security rules
- **@ai-policies/frontend-react**: React-specific patterns and guidelines

### Generated Files

- `.cursorrules` - Rules for Cursor IDE
- `.copilot/instructions.md` - Instructions for GitHub Copilot

## Getting Started

### Prerequisites

- Node.js 18+
- pnpm (recommended) or npm
- AI Policies CLI installed globally

### Installation

1. Install dependencies:

```bash
pnpm install
```

2. Install AI Policies CLI globally:

```bash
pnpm install -g @ai-policies/cli
```

### Development

1. Start the development server:

```bash
pnpm dev
```

2. To update AI Policies configurations:

```bash
pnpm run policies:sync
```

3. To check for policy changes:

```bash
pnpm run policies:diff
```

4. To validate your setup:

```bash
pnpm run policies:doctor
```

## AI Policies Features Demonstrated

### Security Guidelines

- Environment variable usage for secrets
- Input validation patterns
- Secure error handling

### React Best Practices

- Functional components with hooks
- TypeScript interfaces for props
- Performance optimization patterns
- Accessibility guidelines

### Team Customizations

- Material-UI component preferences
- State management with React Query and Zustand
- Testing patterns with React Testing Library

## Project Structure

```
src/
├── components/          # React components
├── hooks/              # Custom React hooks
├── services/           # API and business logic
├── types/              # TypeScript type definitions
└── utils/              # Utility functions

.ai-policies.yaml       # AI Policies configuration
.cursorrules           # Generated Cursor rules
.copilot/
└── instructions.md    # Generated Copilot instructions
```

## Customizing AI Policies

### Modifying Team Guidelines

Edit the `overrides.teamAppendContent` section in `.ai-policies.yaml` to customize team-specific guidelines:

```yaml
overrides:
  teamAppendContent: |
    ## Your Team Guidelines
    - Add your custom rules here
    - Specific to your project needs
```

### Adding New Policy Packages

Update the `requires` section in `.ai-policies.yaml`:

```yaml
requires:
  '@ai-policies/core': '^1.0.0'
  '@ai-policies/frontend-react': '^1.0.0'
  '@ai-policies/your-custom-package': '^1.0.0'
```

### Excluding Specific Partials

Add exclusions to filter out specific policy rules:

```yaml
overrides:
  excludePartials:
    - 'partial-id-to-exclude'
```

## CI/CD Integration

Add AI Policies validation to your CI pipeline:

```yaml
# .github/workflows/ci.yml
- name: Validate AI Policies
  run: |
    npx @ai-policies/cli validate
    npx @ai-policies/cli doctor
```

## Working with AI Assistants

### Cursor IDE

With the generated `.cursorrules` file, Cursor will automatically:

- Follow security best practices
- Apply React patterns consistently
- Suggest team-approved libraries and patterns

### GitHub Copilot

The `.copilot/instructions.md` file helps Copilot understand:

- Project-specific conventions
- Preferred state management approaches
- Testing patterns and requirements

## Learn More

- [AI Policies Documentation](https://github.com/ai-policies/ai-policies)
- [Cursor IDE Documentation](https://cursor.sh/docs)
- [GitHub Copilot Documentation](https://docs.github.com/copilot)
- [React Documentation](https://react.dev)
