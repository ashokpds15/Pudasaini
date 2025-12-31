/**
 * Retry utility functions for handling high traffic scenarios
 */

/**
 * Retry a function with exponential backoff
 * @param {Function} fn - Async function to retry
 * @param {Object} options - Retry options
 * @param {number} options.maxRetries - Maximum number of retries (default: 5)
 * @param {number} options.initialDelay - Initial delay in ms (default: 2000)
 * @param {number} options.maxDelay - Maximum delay in ms (default: 30000)
 * @param {number} options.factor - Exponential factor (default: 2)
 * @param {Function} options.onRetry - Callback on retry (receives error, attempt number)
 * @returns {Promise<any>} - Result of the function
 */
async function retryWithBackoff(fn, options = {}) {
  const {
    maxRetries = 5,
    initialDelay = 2000,
    maxDelay = 30000,
    factor = 2,
    onRetry = null,
  } = options;

  let lastError;
  let delay = initialDelay;

  for (let attempt = 1; attempt <= maxRetries + 1; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      
      if (attempt > maxRetries) {
        throw error;
      }

      if (onRetry) {
        onRetry(error, attempt);
      }

      console.log(`Attempt ${attempt} failed: ${error.message}. Retrying in ${delay}ms...`);
      
      await new Promise(resolve => setTimeout(resolve, delay));
      delay = Math.min(delay * factor, maxDelay);
    }
  }

  throw lastError;
}

/**
 * Navigate to a URL with retry on failure
 * @param {import('@playwright/test').Page} page - Playwright page object
 * @param {string} url - URL to navigate to
 * @param {Object} options - Navigation options
 * @param {number} options.maxRetries - Max retries (default: 5)
 * @param {number} options.timeout - Navigation timeout in ms (default: 120000)
 * @param {string} options.waitUntil - Wait until state (default: 'domcontentloaded')
 */
async function navigateWithRetry(page, url, options = {}) {
  const {
    maxRetries = 5,
    timeout = 120000,
    waitUntil = 'domcontentloaded',
  } = options;

  return retryWithBackoff(
    async () => {
      await page.goto(url, { 
        waitUntil, 
        timeout 
      });
    },
    {
      maxRetries,
      initialDelay: 3000,
      maxDelay: 30000,
      onRetry: (error, attempt) => {
        console.log(`Navigation attempt ${attempt} failed. Server might be under heavy load.`);
      }
    }
  );
}

/**
 * Wait for an element with retry (useful during high traffic when page loads slowly)
 * @param {import('@playwright/test').Page} page - Playwright page object
 * @param {string|string[]} selectors - CSS selector(s) to wait for
 * @param {Object} options - Wait options
 * @param {number} options.timeout - Timeout per attempt (default: 30000)
 * @param {number} options.maxRetries - Max retries (default: 3)
 * @param {boolean} options.reloadOnFail - Reload page on failure (default: false)
 */
async function waitForElementWithRetry(page, selectors, options = {}) {
  const {
    timeout = 30000,
    maxRetries = 3,
    reloadOnFail = false,
  } = options;

  const selectorArray = Array.isArray(selectors) ? selectors : [selectors];

  return retryWithBackoff(
    async () => {
      for (const selector of selectorArray) {
        try {
          await page.waitForSelector(selector, { timeout, state: 'visible' });
          return selector;
        } catch (e) {
          continue;
        }
      }
      throw new Error(`None of the selectors found: ${selectorArray.join(', ')}`);
    },
    {
      maxRetries,
      initialDelay: 2000,
      onRetry: async (error, attempt) => {
        console.log(`Element wait attempt ${attempt} failed. Page might be loading slowly.`);
        if (reloadOnFail) {
          console.log('Reloading page...');
          try {
            await page.reload({ timeout: 60000, waitUntil: 'domcontentloaded' });
            await page.waitForTimeout(2000);
          } catch (e) {
            console.log('Reload failed, continuing...');
          }
        }
      }
    }
  );
}

/**
 * Click an element with retry (handles stale elements and loading issues)
 * @param {import('@playwright/test').Page} page - Playwright page object
 * @param {string|string[]} selectors - CSS selector(s) to click
 * @param {Object} options - Click options
 * @param {number} options.timeout - Timeout per attempt (default: 30000)
 * @param {number} options.maxRetries - Max retries (default: 3)
 */
async function clickWithRetry(page, selectors, options = {}) {
  const {
    timeout = 30000,
    maxRetries = 3,
  } = options;

  const selectorArray = Array.isArray(selectors) ? selectors : [selectors];

  return retryWithBackoff(
    async () => {
      for (const selector of selectorArray) {
        try {
          const element = page.locator(selector).first();
          await element.waitFor({ timeout, state: 'visible' });
          await element.click();
          return true;
        } catch (e) {
          continue;
        }
      }
      throw new Error(`Could not click any of: ${selectorArray.join(', ')}`);
    },
    {
      maxRetries,
      initialDelay: 1000,
    }
  );
}

/**
 * Perform login with retry (for when login page is slow due to traffic)
 * @param {import('@playwright/test').Page} page - Playwright page object
 * @param {Function} loginFn - Login function to execute
 * @param {Object} options - Retry options
 */
async function loginWithRetry(page, loginFn, options = {}) {
  const {
    maxRetries = 3,
    loginUrl = 'https://meroshare.cdsc.com.np/#/login',
  } = options;

  return retryWithBackoff(
    async () => {
      // Check if we're on login page
      const currentUrl = page.url();
      if (currentUrl.includes('login')) {
        await loginFn();
      } else {
        // If not on login page, navigate there first
        await navigateWithRetry(page, loginUrl);
        await loginFn();
      }
    },
    {
      maxRetries,
      initialDelay: 5000,
      onRetry: async (error, attempt) => {
        console.log(`Login attempt ${attempt} failed. Refreshing and retrying...`);
        try {
          await page.reload({ timeout: 60000 });
          await page.waitForTimeout(3000);
        } catch (e) {
          await navigateWithRetry(page, loginUrl);
        }
      }
    }
  );
}

/**
 * Wait for page to be interactive (DOM loaded + key elements visible)
 * @param {import('@playwright/test').Page} page - Playwright page object
 * @param {Object} options - Options
 */
async function waitForPageInteractive(page, options = {}) {
  const {
    timeout = 60000,
    checkElements = ['body'],
  } = options;

  // First wait for basic load
  try {
    await page.waitForLoadState('domcontentloaded', { timeout });
  } catch (e) {
    console.log('DOM content load timeout, continuing...');
  }

  // Then wait for elements
  await waitForElementWithRetry(page, checkElements, {
    timeout: timeout / 2,
    maxRetries: 2,
    reloadOnFail: false,
  });

  // Small delay for JavaScript to initialize
  await page.waitForTimeout(1000);
}

module.exports = {
  retryWithBackoff,
  navigateWithRetry,
  waitForElementWithRetry,
  clickWithRetry,
  loginWithRetry,
  waitForPageInteractive,
};

