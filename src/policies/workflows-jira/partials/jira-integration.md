---
id: jira-integration
layer: domain
weight: 40
protected: false
dependsOn: []
owner: devops-team
description: Guidelines for Jira integration and workflow management
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

### PR Template

```markdown
## Related Jira Ticket

[PROJ-123](https://company.atlassian.net/browse/PROJ-123)

## Description

Brief description of the changes made.

## Testing

- [ ] Unit tests added/updated
- [ ] Integration tests verified
- [ ] Manual testing completed

## Checklist

- [ ] Code follows team coding standards
- [ ] Self-review completed
- [ ] Documentation updated if needed
```

## Error Logging

Include Jira ticket context in error logs:

```typescript
logger.error('Operation failed', {
  error: error.message,
  relatedTicket: 'PROJ-234',
  context: { userId, operation: 'update' },
});
```

## Workflow Automation

### GitHub Actions Example

```yaml
name: Update Jira on PR
on:
  pull_request:
    types: [opened, closed]

jobs:
  update-jira:
    runs-on: ubuntu-latest
    steps:
      - name: Extract Jira ticket
        id: ticket
        run: |
          TICKET=$(echo "${{ github.head_ref }}" | grep -o '[A-Z]\+-[0-9]\+' | head -1)
          echo "ticket=${TICKET}" >> $GITHUB_OUTPUT

      - name: Update Jira ticket
        if: steps.ticket.outputs.ticket
        uses: atlassian/gajira-transition@master
        with:
          issue: ${{ steps.ticket.outputs.ticket }}
          transition: 'In Review'
```

