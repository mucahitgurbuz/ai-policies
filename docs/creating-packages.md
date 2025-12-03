# Creating Policy Packages

Build custom policy packages for your team or organization.

## Package Structure

```
my-policies/
├── package.json
├── cursor/
│   └── partials/
│       ├── security.md
│       └── coding-style.md
└── copilot/
    └── partials/
        ├── security.md
        └── coding-style.md
```

## package.json

```json
{
  "name": "@your-org/my-policies",
  "version": "1.0.0",
  "description": "Custom policies for our team",
  "ai-policies": {
    "partials": {
      "cursor": "cursor/partials",
      "copilot": "copilot/partials"
    },
    "tags": ["security", "quality"]
  }
}
```

## Writing Partials

Each partial is a Markdown file with YAML frontmatter:

```markdown
---
id: security-rules
layer: core
weight: 10
protected: true
dependsOn: []
owner: security-team
description: Security rules for all code
---

# Security Rules

## Authentication

- Always verify user identity before sensitive operations
- Use secure token storage

## Data Protection

- Never log sensitive information
- Encrypt data at rest and in transit
```

### Frontmatter Fields

| Field         | Required | Description                                 |
| ------------- | -------- | ------------------------------------------- |
| `id`          | Yes      | Unique identifier (lowercase, hyphens only) |
| `layer`       | Yes      | `core`, `domain`, `stack`, or `team`        |
| `weight`      | Yes      | Order within layer (0-1000, lower = first)  |
| `protected`   | Yes      | Prevent override by higher layers           |
| `dependsOn`   | Yes      | Array of required partial IDs               |
| `owner`       | Yes      | Team/person responsible                     |
| `tags`        | No       | Categorization tags                         |
| `providers`   | No       | `["cursor"]`, `["copilot"]`, or both        |
| `description` | No       | Human-readable description                  |

### Layers

| Layer    | Weight Range | Purpose                        |
| -------- | ------------ | ------------------------------ |
| `core`   | 0-100        | Safety, security, fundamentals |
| `domain` | 100-200      | Business domain rules          |
| `stack`  | 200-300      | Technology-specific patterns   |
| `team`   | 300-400      | Team customizations            |

## Example: React Patterns

````markdown
---
id: react-hooks
layer: stack
weight: 210
protected: false
dependsOn: [core-safety]
owner: frontend-team
description: React hooks best practices
---

# React Hooks Guidelines

## State Management

- Use useState for local component state
- Use useContext for shared state
- Use useReducer for complex state logic

## Effects

- Always include cleanup functions
- Specify correct dependency arrays
- Avoid infinite loops

## Example

```jsx
// Good: Proper cleanup
useEffect(() => {
  const controller = new AbortController();
  fetchData(controller.signal);
  return () => controller.abort();
}, []);
```
````

````

## Publishing

### To npm

```bash
npm publish --access public
````

### Private Registry

```bash
npm publish --registry https://npm.your-company.com
```

## Using Your Package

Add to `.ai-policies.yaml`:

```yaml
requires:
  '@ai-policies/core': '^1.0.0'
  '@your-org/my-policies': '^1.0.0'
```

Then run:

```bash
ai-policies sync
```

## Testing Your Package

1. Link locally:

   ```bash
   cd my-policies
   npm link

   cd ../test-project
   npm link @your-org/my-policies
   ```

2. Test sync:

   ```bash
   ai-policies sync --verbose
   ```

3. Validate:
   ```bash
   ai-policies validate --partials
   ```
