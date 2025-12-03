---
id: jira-integration
layer: domain
weight: 40
protected: false
dependsOn: []
owner: devops-team
description: Guidelines for Jira integration and workflow management in Cursor
---

# Jira Integration Guidelines

## Commit Message Format

Always reference Jira tickets in commit messages:

```
PROJ-123: Brief description of the change

feat(scope): PROJ-123 detailed description
- Bullet point for specific changes
- Another change made
```

## Branch Naming

Include ticket numbers in branch names:

```
feature/PROJ-123-user-authentication
bugfix/PROJ-456-database-timeout
hotfix/PROJ-789-security-fix
```

## Code Documentation

Reference Jira tickets in code comments for complex business logic:

```typescript
/**
 * User authentication service
 *
 * @see PROJ-123 - Initial implementation
 * @see PROJ-456 - OAuth support
 */
export class AuthService {
  // PROJ-234: Implement tiered pricing
  calculatePricing(user: User): number {
    // Implementation
  }
}

// TODO: PROJ-345 - Implement rate limiting
// FIXME: PROJ-456 - Address memory leak
```

## Pull Request Guidelines

- Link PRs to Jira tickets
- Update ticket status when PR is merged
- Include ticket reference in PR title

## Error Logging

Include Jira ticket context in error logs:

```typescript
logger.error('Operation failed', {
  error: error.message,
  relatedTicket: 'PROJ-234',
  context: { userId, operation: 'update' },
});
```
