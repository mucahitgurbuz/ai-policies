---
id: code-quality
description: Core code quality standards and best practices
owner: engineering-team
tags: [quality, best-practices]
---

# Code Quality Standards

## General Principles

- **Write code for humans first** - prioritize readability and maintainability
- **Follow the principle of least surprise** - code should behave as expected
- **Keep functions small and focused** - single responsibility principle
- **Use meaningful names** for variables, functions, and classes
- **Be consistent** with naming conventions and coding style

## Function Design

- **Functions should do one thing well** (Single Responsibility Principle)
- **Use descriptive function names** that explain what the function does
- **Limit function parameters** to 3-4 when possible
- **Return early** to reduce nesting and improve readability
- **Use pure functions** when possible - no side effects

## Variable Naming

- **Use descriptive names** that explain the purpose
- **Avoid abbreviations** unless they are widely understood
- **Use consistent naming conventions** (camelCase, snake_case, etc.)
- **Boolean variables should be questions** (isActive, hasPermission, canEdit)

## Comments and Documentation

- **Write self-documenting code** first, then add comments where needed
- **Explain WHY, not WHAT** - the code should show what it does
- **Document complex business logic** and algorithms
- **Keep comments up to date** with code changes
- **Use JSDoc or similar** for function documentation

## Error Handling

- **Handle errors explicitly** - don't ignore them
- **Use appropriate error types** for different scenarios
- **Provide helpful error messages** for debugging
- **Log errors with sufficient context** for troubleshooting
- **Fail fast** when encountering invalid states

## Testing Considerations

- **Write testable code** - avoid tight coupling
- **Include edge cases** in your implementation
- **Make functions predictable** with consistent inputs/outputs
- **Avoid global state** that makes testing difficult

## Examples

### ✅ Good Function Design

```javascript
/**
 * Calculates the total price including tax for a cart
 * @param {CartItem[]} items - Array of cart items
 * @param {number} taxRate - Tax rate as decimal (e.g., 0.08 for 8%)
 * @returns {number} Total price including tax
 */
function calculateTotalWithTax(items, taxRate) {
  if (!Array.isArray(items) || items.length === 0) {
    return 0;
  }

  if (taxRate < 0 || taxRate > 1) {
    throw new Error('Tax rate must be between 0 and 1');
  }

  const subtotal = items.reduce((sum, item) => {
    return sum + item.price * item.quantity;
  }, 0);

  return subtotal * (1 + taxRate);
}
```

### ❌ Poor Function Design

```javascript
// Bad: unclear name, no validation, no documentation
function calc(x, y) {
  return x.map(i => i.p * i.q).reduce((a, b) => a + b) * (1 + y);
}
```

### ✅ Good Error Handling

```javascript
async function getUserById(userId) {
  try {
    if (!userId) {
      throw new ValidationError('User ID is required');
    }

    const user = await userRepository.findById(userId);

    if (!user) {
      throw new NotFoundError(`User with ID ${userId} not found`);
    }

    return user;
  } catch (error) {
    logger.error('Failed to retrieve user', {
      userId,
      error: error.message,
    });
    throw error; // Re-throw to let caller handle
  }
}
```

### ❌ Poor Error Handling

```javascript
// Bad: silent failure, no logging, unclear errors
async function getUser(id) {
  try {
    return await db.find(id);
  } catch (e) {
    return null; // Silent failure
  }
}
```

