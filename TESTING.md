# Testing Guide

Şanlıurfa.com platformu için kapsamlı test stratejisi ve prosedürleri.

## Test Türleri

### 1. Unit Tests (Vitest)
Bireysel fonksiyonlar ve bileşenlerin testleri.

```bash
npm run test:unit
npm run test:unit:watch
```

**Test Konuları:**
- Validation functions
- Utility functions
- Data transformations
- Cache operations
- Authentication logic

### 2. End-to-End Tests (Playwright)
Gerçek kullanıcı senaryolarının testleri.

```bash
npm run test:e2e
npm run test:e2e:ui  # Interactive mode
```

**Test Senaryoları:**

#### Authentication (e2e/auth.spec.ts)
- Register flow
- Login flow
- Session management
- Password reset

#### Direct Messaging (e2e/messaging.spec.ts)
- Send and receive messages
- Mark messages as read
- Conversation management
- Blocking integration

#### Privacy Settings (e2e/privacy.spec.ts)
- Update privacy settings
- Block/unblock users
- Mute notifications
- Account deletion requests

#### Two-Factor Authentication (e2e/2fa.spec.ts)
- Setup 2FA with secret
- Verify TOTP codes
- Backup code usage
- Disable 2FA

#### Payment & Subscriptions (e2e/stripe-integration.spec.ts)
- Checkout flow
- Subscription management
- Invoice handling
- Webhook processing

### 3. Performance Tests
Client-side ve server-side performans ölçülüyor.

#### Lighthouse CI
```bash
npm run build
npm run preview
npx lighthouse-ci run
```

**Hedefler:**
- Performance: > 90
- Accessibility: > 90
- Best Practices: > 90
- SEO: > 90

#### Load Testing
```bash
# Apache Bench
ab -n 1000 -c 100 https://sanliurfa.com/

# Autocannon
npx autocannon -c 100 -d 60 https://sanliurfa.com/
```

### 4. Security Tests
Güvenlik açıklarının ve zafiyetlerin testleri.

**Manual Security Checklist:**
- [ ] SQL Injection prevention (parameterized queries)
- [ ] XSS prevention (input sanitization)
- [ ] CSRF protection (state tokens)
- [ ] Rate limiting (auth endpoints)
- [ ] Session hijacking prevention (httpOnly cookies)
- [ ] CORS configuration
- [ ] Security headers (CSP, X-Frame-Options, etc.)
- [ ] Password hashing (bcrypt 12 rounds)
- [ ] JWT token validation
- [ ] File upload validation

## Test Data Setup

### Test Users
```javascript
// User 1 (Admin)
Email: admin@test.com
Password: AdminPassword123!

// User 2 (Regular)
Email: user@test.com
Password: UserPassword123!

// User 3 (Premium)
Email: premium@test.com
Password: PremiumPassword123!
```

### Test Places
```javascript
// Sample place
{
  name: "Test Mekan",
  category: "restaurant",
  location: { lat: 37.1592, lng: 38.7969 },
  description: "Test place for automation"
}
```

## Test Execution

### Run All Tests
```bash
npm run test
```

### Run Specific Test Suite
```bash
npm run test:e2e -- messaging.spec.ts
npm run test:e2e -- privacy.spec.ts
npm run test:e2e -- 2fa.spec.ts
```

### Generate Coverage Report
```bash
npm run test:unit -- --coverage
```

## CI/CD Integration

### GitHub Actions Workflow
Tests run automatically on:
- Push to main/develop branches
- Pull requests

**Pipeline Steps:**
1. Install dependencies
2. Run linter (TypeScript strict)
3. Run unit tests
4. Run E2E tests
5. Generate coverage reports
6. Run Lighthouse CI
7. Deploy on success

## Test Maintenance

### Review Frequency
- Weekly: Check test pass rate
- Monthly: Review slow tests
- Quarterly: Update test data

### Common Issues

**Flaky Tests**
- Increase timeout for slow operations
- Add explicit waits for async operations
- Isolate tests better

**Database Issues**
- Use test database fixture
- Clean up after each test
- Use transactions for rollback

**Timing Issues**
- Use proper wait strategies
- Avoid hardcoded delays
- Implement proper polling

## Performance Benchmarks

### Acceptable Response Times
- API endpoints: < 500ms
- Page load: < 3s
- LCP: < 2.5s
- FID: < 100ms
- CLS: < 0.1

## New Feature Testing Checklist

When adding new features:

- [ ] Unit tests for business logic
- [ ] E2E tests for user workflows
- [ ] Security review for auth/privacy features
- [ ] Performance test for data-heavy features
- [ ] Accessibility audit (if UI changes)
- [ ] Browser compatibility testing
- [ ] Mobile responsiveness testing
- [ ] Error handling validation
- [ ] Edge case testing
- [ ] Documentation updated

## Test Reports

### Generate Reports
```bash
# Coverage report
npm run test:unit -- --coverage --reporter=html

# E2E test report
npm run test:e2e -- --reporter=html
```

Reports generated in:
- Unit: `coverage/`
- E2E: `test-results/`

## Continuous Improvement

### Metrics to Track
- Test pass rate (target: > 95%)
- Test coverage (target: > 80%)
- Test execution time (target: < 10 min)
- Flaky test ratio (target: < 5%)

### Regular Reviews
- Monthly: Analyze test failures
- Quarterly: Refactor test code
- Annually: Comprehensive test audit

## Resources

- [Playwright Documentation](https://playwright.dev/)
- [Vitest Documentation](https://vitest.dev/)
- [Testing Best Practices](https://testingjavascript.com/)
- [OWASP Security Testing](https://owasp.org/www-project-web-security-testing-guide/)
