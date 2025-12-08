---
id: core-safety
description: Fundamental safety rules that must be followed in all code generation
owner: security-team
tags: [security, required]
---

# Core Safety Rules

These are fundamental safety rules that must be followed in all AI-generated code.

## Security Fundamentals

- **Never expose API keys, passwords, or sensitive credentials** in code
- **Always validate and sanitize user input** before processing
- **Use parameterized queries** for database operations to prevent SQL injection
- **Implement proper authentication and authorization** for all protected resources
- **Never trust data from external sources** without validation

## Privacy Protection

- **Never log sensitive personal information** (PII, passwords, tokens)
- **Implement data minimization** - only collect necessary data
- **Use encryption** for sensitive data at rest and in transit
- **Follow data retention policies** and delete data when no longer needed

## Error Handling

- **Never expose internal system details** in error messages
- **Log errors securely** without exposing sensitive information
- **Implement graceful degradation** when services are unavailable
- **Use proper error codes** and meaningful error messages

## Code Quality

- **Write self-documenting code** with clear variable and function names
- **Add comments for complex logic** and business rules
- **Follow established coding conventions** and patterns
- **Implement proper logging** for debugging and monitoring

## Anti-Patterns to Avoid

❌ **Bad**: Hardcoded secrets

```javascript
const API_KEY = 'sk-1234567890abcdef'; // Never do this
```

❌ **Bad**: Unsafe user input handling

```javascript
const query = `SELECT * FROM users WHERE id = ${userId}`; // SQL injection risk
```

❌ **Bad**: Exposing sensitive data in logs

```javascript
console.log('User login attempt:', { username, password }); // Never log passwords
```

## Approved Patterns

✅ **Good**: Environment variables for secrets

```javascript
const API_KEY = process.env.API_KEY;
if (!API_KEY) {
  throw new Error('API_KEY environment variable is required');
}
```

✅ **Good**: Parameterized queries

```javascript
const query = 'SELECT * FROM users WHERE id = ?';
const result = await db.query(query, [userId]);
```

✅ **Good**: Safe error logging

```javascript
logger.error('Authentication failed', {
  username,
  timestamp: new Date().toISOString(),
  // Never log passwords or tokens
});
```
