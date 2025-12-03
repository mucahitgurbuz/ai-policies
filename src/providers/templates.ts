/**
 * Generate a simple Copilot instructions template
 */
export function createSimpleTemplate(): string {
  return `# GitHub Copilot Instructions

## Overview

These instructions help Copilot understand your project's coding standards.

## Guidelines

- Follow the established patterns in this codebase
- Include appropriate error handling
- Add comments for complex logic
- Ensure security best practices are followed

## Security

- Never include secrets in code
- Validate user input
- Use secure coding patterns
`;
}

/**
 * Generate an enterprise template
 */
export function createEnterpriseTemplate(): string {
  return `# GitHub Copilot Instructions

## Overview

This document provides comprehensive guidelines and instructions for GitHub Copilot
to assist with code generation and suggestions in this project.

## Coding Standards

### Code Quality
- Write clean, readable, and maintainable code
- Follow established coding conventions
- Use meaningful names for variables and functions
- Keep functions small and focused

### Error Handling
- Handle errors explicitly
- Provide informative error messages
- Log errors with context
- Implement proper fallbacks

## Security Requirements

### Data Protection
- Never include API keys or secrets in code
- Never log sensitive user information
- Always validate and sanitize user input
- Use environment variables for configuration

### Authentication
- Implement proper authentication
- Verify user permissions
- Use secure session management

## Code Examples

When generating code, please follow these patterns and ensure
all security best practices are implemented.
`;
}
