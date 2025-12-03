---
id: jira-integration
layer: domain
weight: 40
protected: false
dependsOn: []
owner: devops-team
description: Guidelines for Jira integration and workflow management in code
---

# 🎫 Jira Integration Guidelines

## 📋 Ticket Reference Patterns

### Commit Messages

- **Always reference Jira tickets** in commit messages using the standard format
- **Include ticket numbers at the beginning** of commit messages
- **Use descriptive commit messages** that explain the change
- **Follow conventional commit format** when possible

```bash
# ✅ Good commit message format
PROJ-123: Add user authentication validation

feat(auth): PROJ-123 implement JWT token validation
- Add token expiration checking
- Implement refresh token logic
- Add error handling for invalid tokens

# ✅ Alternative formats
PROJ-456 fix: resolve database connection timeout issue
[PROJ-789] refactor: extract user service to separate module
```

### Branch Naming

- **Include ticket numbers** in branch names for traceability
- **Use descriptive branch names** that indicate the work being done
- **Follow team conventions** for branch prefixes

```bash
# ✅ Good branch naming patterns
feature/PROJ-123-user-authentication
bugfix/PROJ-456-database-timeout
hotfix/PROJ-789-security-vulnerability
feature/PROJ-101-payment-integration
```

### Pull Request Templates

```markdown
## 🎫 Related Jira Ticket

[PROJ-123](https://company.atlassian.net/browse/PROJ-123)

## 📝 Description

Brief description of the changes made.

## 🧪 Testing

- [ ] Unit tests added/updated
- [ ] Integration tests verified
- [ ] Manual testing completed

## 📋 Checklist

- [ ] Code follows team coding standards
- [ ] Self-review completed
- [ ] Documentation updated if needed
- [ ] Breaking changes documented

## 🚀 Deployment Notes

Any special deployment considerations or rollback plans.
```

## 🔄 Workflow Integration

### Status Updates

- **Update Jira status** when moving code through pipeline stages
- **Add comments** to tickets when significant progress is made
- **Link pull requests** to Jira tickets for traceability
- **Tag stakeholders** when review or input is needed

### Automated Integrations

```yaml
# Example GitHub Actions workflow for Jira integration
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

## 📊 Code Documentation

### Jira-Linked Comments

```typescript
/**
 * User authentication service
 *
 * Related Jira tickets:
 * - PROJ-123: Initial implementation
 * - PROJ-456: Add OAuth support
 * - PROJ-789: Security improvements
 *
 * @see https://company.atlassian.net/browse/PROJ-123
 */
export class AuthService {
  // Implementation
}

// For complex business logic tied to specific requirements
function calculatePricing(user: User, items: CartItem[]): PricingResult {
  // PROJ-234: Implement tiered pricing based on user level
  if (user.level === 'premium') {
    return applyPremiumDiscount(items);
  }

  // PROJ-235: Add bulk discount for large orders
  if (items.length > 10) {
    return applyBulkDiscount(items);
  }

  return calculateStandardPricing(items);
}
```

### Issue Tracking in Code

```typescript
// TODO: PROJ-345 - Implement rate limiting for API endpoints
// FIXME: PROJ-456 - Address memory leak in WebSocket connections
// HACK: PROJ-567 - Temporary workaround until upstream fix is available

// ⚠️ Always include ticket numbers for tracking
```

## 🔍 Code Review Integration

### Review Comments Linking

```markdown
<!-- In code review comments -->

This change addresses the requirement in [PROJ-123](https://company.atlassian.net/browse/PROJ-123).

However, I notice this might conflict with the approach discussed in [PROJ-456](https://company.atlassian.net/browse/PROJ-456). Can we align these implementations?

**Suggestion**: Consider extracting this logic as discussed in PROJ-789 for better reusability.
```

### Quality Gates

- **Verify ticket requirements** are met before approving
- **Check for proper testing** as specified in acceptance criteria
- **Ensure documentation** matches ticket requirements
- **Validate security requirements** from ticket description

## 📈 Reporting and Metrics

### Development Tracking

```typescript
// Add timing information for performance tickets
const PERFORMANCE_TICKET = 'PROJ-888';

// PROJ-888: Monitor database query performance
const startTime = performance.now();
const result = await databaseQuery();
const endTime = performance.now();

if (endTime - startTime > 1000) {
  logger.warn(`Slow query detected for ${PERFORMANCE_TICKET}`, {
    duration: endTime - startTime,
    query: 'user-profile-fetch',
  });
}
```

### Progress Tracking

```typescript
// For epic or large feature tracking
interface FeatureProgress {
  epic: string; // e.g., "PROJ-100"
  completedStories: string[]; // e.g., ["PROJ-101", "PROJ-102"]
  remainingStories: string[]; // e.g., ["PROJ-103", "PROJ-104"]
  blockers: string[]; // e.g., ["PROJ-105"]
}

// Track feature completion
const trackFeatureProgress = (epic: string): FeatureProgress => {
  // Implementation to track progress
};
```

## 🚨 Error Handling

### Error Reporting with Context

```typescript
class JiraLinkedError extends Error {
  constructor(
    message: string,
    public readonly ticketId?: string,
    public readonly context?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'JiraLinkedError';
  }
}

// Usage
throw new JiraLinkedError('User validation failed', 'PROJ-567', {
  userId,
  validationRules,
});

// In error logging
logger.error('Operation failed', {
  error: error.message,
  relatedTicket: 'PROJ-234',
  context: { userId, operation: 'userUpdate' },
});
```

## 📋 Prompt Templates for Jira Integration

### Code Generation Prompts

```
Generate a TypeScript function that implements the requirements from Jira ticket PROJ-123:
- User input validation as specified in acceptance criteria
- Error handling that logs to both application logs and Jira
- Include proper JSDoc comments referencing the ticket
- Add TODO comments for any incomplete features mentioned in the ticket
```

### Documentation Prompts

```
Create documentation for this feature that includes:
- Reference to the original Jira epic PROJ-100
- Links to related stories (PROJ-101, PROJ-102, PROJ-103)
- Implementation decisions made during development
- Any deviations from original requirements with justification
```
