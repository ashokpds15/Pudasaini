# Playwright Automation Project

This project uses Playwright to automate website interactions and testing.

## Setup

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Install Playwright browsers:**
   ```bash
   npx playwright install
   ```

## Running Tests

- **Run all tests:**
  ```bash
  npm test
  ```

- **Run tests in headed mode (see browser):**
  ```bash
  npm run test:headed
  ```

- **Run tests in debug mode:**
  ```bash
  npm run test:debug
  ```

- **Run tests with UI mode:**
  ```bash
  npm run test:ui
  ```

- **View test report:**
  ```bash
  npm run test:report
  ```

## Project Structure

```
.
├── tests/              # Test files
│   └── example.spec.js # Example test file
├── playwright.config.js # Playwright configuration
└── package.json        # Project dependencies
```

## Common Playwright Commands

### Navigation
```javascript
await page.goto('https://example.com');
await page.goBack();
await page.goForward();
await page.reload();
```

### Finding Elements
```javascript
// By CSS selector
await page.locator('button').click();
await page.locator('#id').fill('text');
await page.locator('.class').click();

// By text
await page.locator('text=Click me').click();
await page.getByText('Click me').click();

// By role
await page.getByRole('button', { name: 'Submit' }).click();
await page.getByLabel('Email').fill('test@example.com');
```

### Interactions
```javascript
await page.click('button');
await page.fill('input', 'text');
await page.type('input', 'text', { delay: 100 });
await page.selectOption('select', 'value');
await page.check('checkbox');
await page.hover('element');
```

### Waiting
```javascript
await page.waitForSelector('h1');
await page.waitForLoadState('networkidle');
await page.waitForURL('**/dashboard');
await page.waitForTimeout(1000); // milliseconds
```

### Assertions
```javascript
await expect(page).toHaveTitle('Page Title');
await expect(page.locator('h1')).toHaveText('Heading');
await expect(page.locator('button')).toBeVisible();
await expect(page.locator('input')).toHaveValue('text');
```

## Configuration

Edit `playwright.config.js` to customize:
- Test directory
- Browsers to test against
- Timeouts
- Screenshots and videos
- Base URL
- And more...

## Resources

- [Playwright Documentation](https://playwright.dev)
- [Playwright API Reference](https://playwright.dev/docs/api/class-playwright)
- [Best Practices](https://playwright.dev/docs/best-practices)

# Playwright-Meroshare-Automation
