---
id: core-safety
layer: core
weight: 10
protected: true
dependsOn: []
owner: security-team
description: Essential safety guidelines for GitHub Copilot code generation
---

# 🔒 Core Safety Guidelines

These critical safety rules must be followed in all GitHub Copilot suggestions and generated code.

## 🚫 Security Constraints

### Secrets and Credentials

- **Never** include real API keys, passwords, or access tokens in code
- **Never** hardcode database connection strings or credentials
- **Never** commit secrets to version control
- **Always** use environment variables or secure secret management

### Input Validation

- **Always** validate and sanitize user input
- **Never** trust data from external sources without validation
- **Always** use parameterized queries for database operations
- **Never** use dynamic code execution with user input

### Authentication & Authorization

- **Always** implement proper authentication for protected resources
- **Never** rely on client-side validation alone
- **Always** verify user permissions before allowing actions
- **Never** expose internal user data without proper authorization

## 🛡️ Privacy Protection

### Data Handling

- **Never** log sensitive personal information (PII)
- **Always** encrypt sensitive data at rest and in transit
- **Never** store unnecessary personal data
- **Always** implement data retention and deletion policies

### Logging and Monitoring

- **Never** log passwords, tokens, or sensitive user data
- **Always** log security events for monitoring
- **Never** expose internal system details in public logs
- **Always** sanitize logs before external sharing

## ⚠️ Error Handling Rules

### Error Messages

- **Never** expose internal system details in error messages
- **Always** provide helpful but safe error messages to users
- **Never** reveal file paths, database schemas, or internal structure
- **Always** log detailed errors securely for developers

### Exception Management

- **Always** handle exceptions gracefully
- **Never** let applications crash from unhandled exceptions
- **Always** implement proper fallback mechanisms
- **Never** expose stack traces to end users

## 📋 Code Quality Requirements

### Documentation

- **Always** document complex business logic
- **Never** leave TODO comments in production code
- **Always** use clear, descriptive variable and function names
- **Never** use cryptic abbreviations

### Testing Considerations

- **Always** write code that can be easily tested
- **Never** ignore edge cases in implementation
- **Always** consider error scenarios in your code
- **Never** assume input will always be valid

## 🚨 Anti-Patterns to Avoid

### ❌ Dangerous Patterns

```javascript
// NEVER: Hardcoded secrets
const API_KEY = 'sk-1234567890abcdef';

// NEVER: SQL injection vulnerability
const query = `SELECT * FROM users WHERE id = ${userId}`;

// NEVER: Unsafe eval or dynamic execution
eval(userInput);

// NEVER: Exposing sensitive data in logs
console.log('Login attempt:', { username, password });

// NEVER: Client-side only validation
if (userRole === 'admin') {
  // This can be bypassed
}
```

### ✅ Safe Patterns

```javascript
// GOOD: Environment variables
const API_KEY = process.env.API_KEY;
if (!API_KEY) {
  throw new Error('API_KEY environment variable required');
}

// GOOD: Parameterized queries
const query = 'SELECT * FROM users WHERE id = ?';
const user = await db.query(query, [userId]);

// GOOD: Safe logging
logger.info('Login attempt', {
  username,
  timestamp: new Date().toISOString(),
  userAgent: req.headers['user-agent'],
  // Password is never logged
});

// GOOD: Server-side validation
async function requireAdmin(req, res, next) {
  const user = await getUserFromToken(req.headers.authorization);
  if (!user || user.role !== 'admin') {
    return res.status(403).json({ error: 'Forbidden' });
  }
  next();
}
```

## 🎯 Prompt Guidance

When requesting code from Copilot, always specify:

- Security requirements relevant to the task
- Input validation needs
- Error handling requirements
- Any compliance or regulatory considerations

Example prompt:

> "Create a user registration function that validates email format, hashes passwords securely, and includes proper error handling without exposing internal details"
