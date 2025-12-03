/**
 * Generate a minimal Cursor rules template
 */
export function createMinimalTemplate(): string {
  return `# Cursor AI Rules

## Core Principles

- Write clean, readable code
- Follow established patterns
- Handle errors gracefully

## Security

- Never expose secrets in code
- Validate user input
- Use secure defaults
`;
}

/**
 * Generate a comprehensive template
 */
export function createComprehensiveTemplate(): string {
  return `# Cursor AI Rules

## Core Principles

- Write clean, readable, and maintainable code
- Follow established coding conventions and patterns
- Handle errors gracefully with informative messages
- Write self-documenting code with clear naming

## Security Guidelines

- Never expose API keys, passwords, or secrets in code
- Always validate and sanitize user input
- Use parameterized queries for database operations
- Implement proper authentication and authorization

## Code Quality

- Keep functions small and focused
- Use meaningful variable and function names
- Add comments for complex business logic
- Follow the principle of least surprise

## Error Handling

- Handle errors explicitly - don't ignore them
- Provide helpful error messages for debugging
- Log errors with sufficient context
- Fail fast when encountering invalid states
`;
}
