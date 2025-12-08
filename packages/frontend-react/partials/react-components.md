---
id: react-components
description: React component development guidelines and patterns
owner: frontend-team
tags: [react, frontend, components]
---

# React Component Guidelines

## Component Architecture

### Functional Components

- **Always use functional components** with hooks instead of class components
- **Implement proper TypeScript interfaces** for component props
- **Use custom hooks** to extract and reuse stateful logic
- **Keep components small and focused** on a single responsibility

### Component Structure

```tsx
interface UserCardProps {
  user: User;
  onEdit?: (user: User) => void;
  className?: string;
}

export const UserCard: React.FC<UserCardProps> = ({
  user,
  onEdit,
  className,
}) => {
  // 1. State declarations
  const [isEditing, setIsEditing] = useState(false);

  // 2. Computed values (useMemo)
  const displayName = useMemo(
    () => `${user.firstName} ${user.lastName}`,
    [user.firstName, user.lastName]
  );

  // 3. Event handlers (useCallback)
  const handleEditClick = useCallback(() => {
    setIsEditing(true);
  }, []);

  const handleSave = useCallback(
    (updatedUser: User) => {
      onEdit?.(updatedUser);
      setIsEditing(false);
    },
    [onEdit]
  );

  // 4. Effects
  useEffect(() => {
    // Side effects here
  }, []);

  // 5. Render
  return (
    <div className={cn('user-card', className)}>{/* Component content */}</div>
  );
};
```

## State Management

### Local State

- **Use useState** for simple component state
- **Use useReducer** for complex state logic
- **Initialize state properly** to avoid undefined values
- **Batch state updates** when updating multiple state variables

### State Updates

```tsx
// ✅ Good: Proper state updates
const [count, setCount] = useState(0);

// For simple updates
const increment = () => setCount(prev => prev + 1);

// For complex state
const [state, dispatch] = useReducer(reducer, initialState);
const updateUser = (user: User) => dispatch({ type: 'UPDATE_USER', user });
```

### Global State

- **Use Context API** for sharing state between components
- **Consider state management libraries** (Redux, Zustand) for complex apps
- **Avoid prop drilling** by using context when appropriate
- **Keep context values stable** to prevent unnecessary re-renders

## Hooks Best Practices

### useEffect

- **Include all dependencies** in the dependency array
- **Clean up effects** that create subscriptions or timers
- **Use multiple useEffect hooks** for different concerns
- **Be careful with object dependencies** - use useCallback/useMemo

```tsx
// ✅ Good: Proper useEffect usage with cleanup
useEffect(() => {
  let cancelled = false;

  const fetchData = async () => {
    const data = await api.getData(id);
    if (!cancelled) {
      setData(data);
    }
  };

  fetchData();

  return () => {
    cancelled = true; // Cleanup
  };
}, [id]);

// ✅ Good: Subscriptions with cleanup
useEffect(() => {
  const subscription = subscribeToData(userId, data => {
    setData(data);
  });

  return () => {
    subscription.unsubscribe();
  };
}, [userId]);
```

### Performance Hooks

- **Use useMemo** for expensive calculations
- **Use useCallback** for function references passed to children
- **Use React.memo** for components that render frequently with same props
- **Don't over-optimize** - measure first, optimize when needed

```tsx
// ✅ Expensive calculations
const expensiveValue = useMemo(() => {
  return items.reduce((acc, item) => acc + item.value, 0);
}, [items]);

// ✅ Stable function references
const handleSubmit = useCallback(
  (data: FormData) => {
    onSubmit(data);
  },
  [onSubmit]
);

// ✅ Component memoization
const OptimizedComponent = React.memo(({ data, onAction }) => {
  return <div>{/* Component content */}</div>;
});
```

## Event Handling

- **Use useCallback** for event handlers to prevent unnecessary re-renders
- **Handle errors** in event handlers gracefully
- **Prevent default behavior** when necessary
- **Use proper TypeScript types** for events

```tsx
const handleSubmit = useCallback(
  (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    try {
      const formData = new FormData(event.currentTarget);
      onSubmit(formData);
    } catch (error) {
      console.error('Form submission failed:', error);
      setError('Submission failed. Please try again.');
    }
  },
  [onSubmit]
);
```

## Accessibility (a11y)

### Semantic HTML

- **Use semantic HTML elements** (button, input, nav, main, etc.)
- **Provide proper ARIA labels** for screen readers
- **Include alt text** for images
- **Ensure keyboard navigation** works properly

### Focus Management

- **Manage focus** for modals and dynamic content
- **Provide visible focus indicators** for interactive elements
- **Use proper tab order** for navigation
- **Announce dynamic changes** to screen readers

```tsx
// ✅ Good: Accessible component
<button
  onClick={handleClick}
  aria-label="Close dialog"
  aria-describedby="close-description"
  disabled={isLoading}
>
  <CloseIcon aria-hidden="true" />
  <span id="close-description" className="sr-only">
    Closes the current dialog and returns to the main page
  </span>
</button>
```

## Anti-Patterns to Avoid

### ❌ Common Mistakes

```tsx
// BAD: Creating objects in render
return (
  <MyComponent
    style={{ marginTop: 10 }} // Creates new object on every render
    data={items.map(item => item.name)} // Creates new array on every render
  />
);

// BAD: Not using keys properly
{
  items.map((item, index) => (
    <Item key={index} data={item} /> // Using index as key
  ));
}

// BAD: Side effects in render
function MyComponent() {
  localStorage.setItem('data', JSON.stringify(data)); // Side effect in render
  return <div>{data}</div>;
}

// BAD: Mutating props or state
props.user.name = 'New Name'; // Mutating props
state.items.push(newItem); // Mutating state
```

### ✅ Correct Patterns

```tsx
// GOOD: Stable references
const style = useMemo(() => ({ marginTop: 10 }), []);
const itemNames = useMemo(() => items.map(item => item.name), [items]);

return <MyComponent style={style} data={itemNames} />;

// GOOD: Proper keys
{
  items.map(item => <Item key={item.id} data={item} />);
}

// GOOD: Side effects in useEffect
useEffect(() => {
  localStorage.setItem('data', JSON.stringify(data));
}, [data]);

// GOOD: Immutable updates
const updatedUser = { ...user, name: 'New Name' };
setItems([...items, newItem]);
```
