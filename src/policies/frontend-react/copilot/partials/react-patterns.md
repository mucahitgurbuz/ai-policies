---
id: react-patterns
layer: stack
weight: 30
protected: false
dependsOn: [core-safety]
owner: frontend-team
description: React development patterns and best practices for Copilot
---

# 📱 React Development Patterns

## 🧩 Component Development

### Modern React Patterns

- Use **functional components with hooks** instead of class components
- Implement **TypeScript interfaces** for all props and state
- Follow **single responsibility principle** for components
- Use **composition over inheritance** for component reuse

### Component Structure Template

```tsx
interface ComponentProps {
  // Define clear prop types
  title: string;
  items: Item[];
  onItemClick?: (item: Item) => void;
  className?: string;
}

export const MyComponent: React.FC<ComponentProps> = ({
  title,
  items,
  onItemClick,
  className,
}) => {
  // 1. State declarations
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // 2. Computed values
  const filteredItems = useMemo(
    () => items.filter(item => item.isActive),
    [items]
  );

  // 3. Event handlers
  const handleItemClick = useCallback(
    (item: Item) => {
      setSelectedId(item.id);
      onItemClick?.(item);
    },
    [onItemClick]
  );

  // 4. Effects
  useEffect(() => {
    // Side effects here
  }, []);

  // 5. Render
  return <div className={className}>{/* JSX content */}</div>;
};
```

## 🎣 Hooks Guidelines

### State Management

```tsx
// ✅ Use useState for simple state
const [isLoading, setIsLoading] = useState(false);
const [user, setUser] = useState<User | null>(null);

// ✅ Use useReducer for complex state
const [state, dispatch] = useReducer(reducer, {
  data: [],
  loading: false,
  error: null,
});

// ✅ Custom hooks for reusable logic
const useApi = (url: string) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData(url)
      .then(setData)
      .finally(() => setLoading(false));
  }, [url]);

  return { data, loading };
};
```

### Effect Patterns

```tsx
// ✅ Data fetching
useEffect(() => {
  let cancelled = false;

  const fetchUser = async () => {
    try {
      const userData = await api.getUser(userId);
      if (!cancelled) {
        setUser(userData);
      }
    } catch (error) {
      if (!cancelled) {
        setError(error.message);
      }
    }
  };

  fetchUser();

  return () => {
    cancelled = true; // Cleanup to prevent state updates
  };
}, [userId]);

// ✅ Subscriptions with cleanup
useEffect(() => {
  const subscription = eventBus.subscribe('user-updated', handleUserUpdate);

  return () => {
    subscription.unsubscribe();
  };
}, []);
```

## 🚀 Performance Optimization

### Memoization Patterns

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

### Lazy Loading

```tsx
// ✅ Route-based code splitting
const LazyPage = lazy(() => import('./pages/Dashboard'));

// ✅ Component lazy loading
const HeavyComponent = lazy(() => import('./HeavyComponent'));

// Usage with Suspense
<Suspense fallback={<Loading />}>
  <LazyPage />
</Suspense>;
```

## 🔄 State Management

### Context API Pattern

```tsx
interface AppContextType {
  user: User | null;
  theme: Theme;
  updateUser: (user: User) => void;
  toggleTheme: () => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [user, setUser] = useState<User | null>(null);
  const [theme, setTheme] = useState<Theme>('light');

  const updateUser = useCallback((newUser: User) => {
    setUser(newUser);
  }, []);

  const toggleTheme = useCallback(() => {
    setTheme(prev => (prev === 'light' ? 'dark' : 'light'));
  }, []);

  const value = useMemo(
    () => ({
      user,
      theme,
      updateUser,
      toggleTheme,
    }),
    [user, theme, updateUser, toggleTheme]
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

// Custom hook for consuming context
export const useApp = () => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
```

## 📝 Form Handling

### Controlled Components

```tsx
const ContactForm: React.FC = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    message: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      const { name, value } = e.target;
      setFormData(prev => ({ ...prev, [name]: value }));

      // Clear error when user starts typing
      if (errors[name]) {
        setErrors(prev => ({ ...prev, [name]: '' }));
      }
    },
    [errors]
  );

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Name is required';
    }

    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Email is invalid';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();

      if (validateForm()) {
        // Submit form
        console.log('Form submitted:', formData);
      }
    },
    [formData]
  );

  return (
    <form onSubmit={handleSubmit}>
      <input
        type="text"
        name="name"
        value={formData.name}
        onChange={handleChange}
        aria-invalid={!!errors.name}
        aria-describedby={errors.name ? 'name-error' : undefined}
      />
      {errors.name && (
        <span id="name-error" role="alert">
          {errors.name}
        </span>
      )}

      {/* Other form fields */}
    </form>
  );
};
```

## 🎨 Styling Guidelines

### CSS-in-JS Patterns

```tsx
// ✅ Styled components (if using styled-components)
const StyledButton = styled.button<{ variant: 'primary' | 'secondary' }>`
  padding: 12px 24px;
  border-radius: 4px;
  border: none;
  font-weight: 600;

  ${props =>
    props.variant === 'primary' &&
    css`
      background-color: #007bff;
      color: white;
    `}

  ${props =>
    props.variant === 'secondary' &&
    css`
      background-color: #6c757d;
      color: white;
    `}
`;

// ✅ CSS Modules pattern
import styles from './Button.module.css';

const Button: React.FC<ButtonProps> = ({ variant, children, ...props }) => {
  return (
    <button className={`${styles.button} ${styles[variant]}`} {...props}>
      {children}
    </button>
  );
};
```

## ⚠️ Common Anti-Patterns

### ❌ Avoid These Patterns

```tsx
// DON'T: Create objects/arrays in render
<Component style={{ margin: 10 }} items={data.map(x => x.id)} />;

// DON'T: Use array index as key
{
  items.map((item, index) => <Item key={index} data={item} />);
}

// DON'T: Call hooks conditionally
if (condition) {
  const [state, setState] = useState(); // ❌ Wrong
}

// DON'T: Mutate props or state directly
props.user.name = 'New Name'; // ❌ Mutation
state.items.push(newItem); // ❌ Mutation

// DON'T: Side effects in render
function Component() {
  localStorage.setItem('key', 'value'); // ❌ Side effect in render
  return <div>Content</div>;
}
```

### ✅ Correct Patterns

```tsx
// DO: Use stable references
const style = useMemo(() => ({ margin: 10 }), []);
const itemIds = useMemo(() => data.map(x => x.id), [data]);

// DO: Use stable, unique keys
{
  items.map(item => <Item key={item.id} data={item} />);
}

// DO: Always call hooks at top level
const [state, setState] = useState();
if (condition) {
  // Use the state conditionally
}

// DO: Update immutably
const updatedUser = { ...user, name: 'New Name' };
setItems(prevItems => [...prevItems, newItem]);

// DO: Side effects in useEffect
useEffect(() => {
  localStorage.setItem('key', 'value');
}, []);
```
