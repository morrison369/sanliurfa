# UI Components Library

Complete component library for Şanlıurfa.com with accessibility, responsive design, and Turkish language support.

## Core Components

### Error Handling

#### ErrorBoundary
React error boundary component for catching and displaying errors in child components.

```tsx
import ErrorBoundary from './ErrorBoundary';

<ErrorBoundary fallback={<CustomErrorUI />}>
  <YourComponent />
</ErrorBoundary>
```

**Features:**
- Catches React component errors
- Logs errors with context
- Fallback UI for error states
- Development mode error details

#### ErrorDisplay Components

```tsx
import {
  FieldError,
  ValidationErrorsSummary,
  ErrorAlert,
  LoadingState,
  NetworkStatus
} from './ErrorDisplay';

// Field-level errors
<FieldError message={fieldError} fieldName="email" />

// Form validation summary
<ValidationErrorsSummary errors={formErrors} title="Validation Errors" />

// API error alert
<ErrorAlert
  error={apiError}
  onDismiss={clearError}
  lang="tr"
/>

// Loading state with retry
<LoadingState
  isLoading={loading}
  error={error}
  onRetry={refetch}
>
  <YourContent />
</LoadingState>

// Network status indicator
<NetworkStatus />
```

**Features:**
- Field validation errors
- Validation summary
- API error alerts
- Loading states with retry
- Network status monitoring

---

### Accessibility

#### AccessibleButton
Keyboard-accessible button component with ARIA support.

```tsx
import { AccessibleButton } from './AccessibleButton';

<AccessibleButton
  variant="primary"
  loading={isLoading}
  ariaLabel="Kayıt Ol"
>
  Sign Up
</AccessibleButton>
```

**Features:**
- Keyboard support (Enter, Space)
- ARIA labels and descriptions
- Loading states
- 4 variants: primary, secondary, danger, success
- Focus management

---

### SEO

#### SEOHead
Astro component for injecting meta tags and structured data.

```astro
---
import { SEOHead } from '../components/SEOHead.astro';
import { generateOrganizationSchema, generateArticleSchema } from '../lib/seo';

const structuredData = generateArticleSchema({
  headline: 'Göbekli Tepe Rehberi',
  description: 'Dünyada en eski insan yapısı...',
  author: 'Author Name',
  publishedTime: new Date(),
  url: 'https://sanliurfa.com/gobeklitepe'
});
---

<SEOHead
  title="Göbekli Tepe Rehberi"
  description="Dünyada en eski insan yapısı hakkında her şey"
  canonical="https://sanliurfa.com/gobeklitepe"
  ogImage="https://sanliurfa.com/images/gobeklitepe.jpg"
  tags={['arkeoloji', 'tarih', 'turizm']}
  structuredData={structuredData}
  lang="tr"
/>
```

**Features:**
- Open Graph meta tags
- Twitter Card meta tags
- Structured data (JSON-LD)
- Canonical URLs
- Language detection
- Mobile web app configuration

---

## Feature Components

### Notifications

#### NotificationCenter
Manages in-app notifications and alerts.

```tsx
import NotificationCenter from './NotificationCenter';

<NotificationCenter />
```

**Features:**
- Toast notifications
- System alerts
- Push notification opt-in
- Notification history
- Auto-dismiss with custom duration

#### NotificationsPage
Full notifications management page.

```tsx
import NotificationsPage from './NotificationsPage';

<NotificationsPage />
```

**Features:**
- Notification list with filtering
- Mark as read/unread
- Delete notifications
- Notification preferences
- Real-time updates

---

### User & Profile

#### UserProfile
User profile display and edit component.

```tsx
import UserProfile from './UserProfile';

<UserProfile userId={userId} editable={true} />
```

**Features:**
- User info display
- Profile picture upload
- Editable fields
- Form validation
- Save and cancel actions

#### UserPublicProfile
Public profile view (read-only).

```tsx
import UserPublicProfile from './UserPublicProfile';

<UserPublicProfile userId={userId} />
```

**Features:**
- User reviews
- Places added
- Following/followers
- User statistics
- Contact options

---

### Search & Discovery

#### SearchResults
Display search results with filtering and pagination.

```tsx
import SearchResults from './SearchResults';

<SearchResults
  query="kebab"
  results={results}
  onResultClick={handleClick}
  isLoading={loading}
/>
```

**Features:**
- Result list display
- Category filtering
- Pagination
- Loading states
- Empty state handling

---

### Admin Panel

#### AdminDashboard
Dashboard overview with key metrics.

```tsx
import AdminDashboard from './admin/AdminDashboard';

<AdminDashboard />
```

**Features:**
- Key performance indicators
- Charts and graphs
- Recent activities
- System status
- Quick actions

#### AdminManager
Resource management interface.

```tsx
import AdminManager from './admin/AdminManager';

<AdminManager
  resource="users"
  columns={['name', 'email', 'role']}
/>
```

**Features:**
- Data table with sorting/filtering
- Bulk actions
- Add/edit/delete operations
- Pagination
- Export functionality

#### AuditLogViewer
View and filter audit logs.

```tsx
import AuditLogViewer from './admin/AuditLogViewer';

<AuditLogViewer
  userId={userId}
  timeRange="7d"
/>
```

**Features:**
- Filterable audit log display
- User activity history
- Change tracking
- Timestamps
- Action details

---

### Vendor & Business

#### VendorDashboard
Vendor-specific dashboard.

```tsx
import VendorDashboard from './VendorDashboard';

<VendorDashboard />
```

**Features:**
- Business overview
- Review management
- Visitor analytics
- Response metrics
- Business settings

---

### Engagement

#### PWAPrompt
Prompts users to install the PWA.

```tsx
import PWAPrompt from './PWAPrompt';

<PWAPrompt />
```

**Features:**
- Smart install prompts
- Dismissible alerts
- Platform detection (iOS/Android)
- Install instructions

---

## Component Patterns

### Controlled Components
Use React hooks for state management:

```tsx
import { useState } from 'react';

export function MyComponent() {
  const [value, setValue] = useState('');

  return (
    <input
      value={value}
      onChange={(e) => setValue(e.target.value)}
    />
  );
}
```

### Props Interface
Define component props clearly:

```tsx
interface MyComponentProps {
  title: string;
  loading?: boolean;
  onSubmit: (data: any) => void;
}

export function MyComponent({ title, loading, onSubmit }: MyComponentProps) {
  // Implementation
}
```

### Error Boundaries
Wrap risky components:

```tsx
<ErrorBoundary>
  <RiskyComponent />
</ErrorBoundary>
```

### Accessibility
Always include ARIA labels:

```tsx
<button aria-label="Kapat" onClick={onClose}>
  ✕
</button>
```

### Loading States
Provide feedback during async operations:

```tsx
<LoadingState
  isLoading={loading}
  error={error}
  onRetry={retry}
>
  <Content />
</LoadingState>
```

---

## Styling

### Tailwind CSS
All components use Tailwind CSS for styling:

```tsx
<div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg">
  Content
</div>
```

### Dark Mode
Components support dark mode:

```tsx
<div className="bg-white dark:bg-slate-900 text-gray-900 dark:text-gray-100">
  Content
</div>
```

### Responsive Design
Mobile-first responsive design:

```tsx
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
  <Card />
</div>
```

---

## Localization

### Turkish & English
Components support both languages:

```tsx
<ErrorAlert
  error={error}
  lang="tr" // or "en"
/>
```

### i18n Integration
Use the i18n library:

```tsx
import { t } from '../lib/i18n';

<button>{t('buttons.submit', 'tr')}</button>
```

---

## Form Components

### Validation
Use form validation utilities:

```tsx
import { useFormError } from '../lib/useApiError';
import { validateForm, validators } from '../lib/form-errors';

export function MyForm() {
  const { handleSubmit, error } = useFormError();
  const [data, setData] = useState({});
  const [errors, setErrors] = useState({});

  const handleFormSubmit = async (e) => {
    e.preventDefault();

    const validationErrors = validateForm(data, {
      email: validators.email,
      password: validators.password
    });

    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    await handleSubmit(() => submitData(data));
  };

  return (
    <form onSubmit={handleFormSubmit}>
      <input
        type="email"
        value={data.email || ''}
        onChange={(e) => setData({...data, email: e.target.value})}
      />
      <FieldError message={errors.email?.[0]} />

      <ValidationErrorsSummary errors={errors} />
    </form>
  );
}
```

---

## Performance

### Code Splitting
Components are automatically code-split by Astro:

```tsx
import { lazy, Suspense } from 'react';

const HeavyComponent = lazy(() => import('./HeavyComponent'));

<Suspense fallback={<LoadingSpinner />}>
  <HeavyComponent />
</Suspense>
```

### Memoization
Prevent unnecessary re-renders:

```tsx
import { memo } from 'react';

export const MemoizedComponent = memo(function MyComponent(props) {
  return <div>{props.children}</div>;
});
```

---

## Best Practices

1. **Always include ARIA labels** for accessibility
2. **Handle loading and error states** explicitly
3. **Use TypeScript interfaces** for prop types
4. **Test keyboard navigation** for form components
5. **Support both Turkish and English** languages
6. **Use Tailwind CSS** for styling consistency
7. **Wrap risky components** with ErrorBoundary
8. **Log errors** with context for debugging
9. **Validate user input** before processing
10. **Provide clear feedback** for user actions

---

## Component Inventory

| Component | Type | Accessibility | i18n | Status |
|-----------|------|---------------|------|--------|
| ErrorBoundary | Error | ✓ | - | ✓ |
| ErrorDisplay | Error | ✓ | ✓ | ✓ |
| AccessibleButton | Input | ✓ | - | ✓ |
| SEOHead | Meta | - | ✓ | ✓ |
| NotificationCenter | Feature | ✓ | ✓ | ✓ |
| NotificationsPage | Feature | ✓ | ✓ | ✓ |
| UserProfile | User | ✓ | ✓ | ✓ |
| UserPublicProfile | User | ✓ | ✓ | ✓ |
| SearchResults | Discovery | ✓ | ✓ | ✓ |
| AdminDashboard | Admin | ✓ | ✓ | ✓ |
| AdminManager | Admin | ✓ | ✓ | ✓ |
| AuditLogViewer | Admin | ✓ | ✓ | ✓ |
| VendorDashboard | Business | ✓ | ✓ | ✓ |
| PWAPrompt | Engagement | ✓ | ✓ | ✓ |

---

## Contributing

When adding new components:

1. Add TypeScript interfaces for props
2. Include accessibility attributes (ARIA)
3. Support Turkish & English
4. Add loading and error states
5. Test keyboard navigation
6. Document usage with examples
7. Update this README

---

**Last Updated:** 2026-04-07
**Maintainers:** Development Team
