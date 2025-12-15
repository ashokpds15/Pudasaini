const { test } = require('@playwright/test');
require('dotenv').config();
const {
  performLogin,
  isLoginSuccessful,
  clickMyASBA,
  checkForApplyButton,
  getIPODetails,
  clickApplyButton,
  fillIPOApplication,
  submitIPOApplication,
  checkApplicationStatus,
  initBot,
  notifyIPOAvailable,
  notifyIPOStatus,
  notifyError,
  notifyIPONotFound,
} = require('./helpers');

test.describe('MeroShare IPO Automation', () => {
  
  test.beforeEach(async ({ page }) => {
    await page.goto('https://meroshare.cdsc.com.np/#/login', { waitUntil: 'domcontentloaded', timeout: 60000 });
    try {
      await page.waitForSelector('form, input#username, select2#selectBranch', { timeout: 15000 });
    } catch (e) {
      await page.waitForSelector('body', { timeout: 5000 });
    }
  });

  test('should check for IPO and send Telegram notification', async ({ page }) => {
    const username = process.env.MEROSHARE_USERNAME;
    const password = process.env.MEROSHARE_PASSWORD;
    const dp = process.env.MEROSHARE_DP_NP;
    const telegramToken = process.env.TELEGRAM_BOT_TOKEN;
    const telegramChatId = process.env.TELEGRAM_CHAT_ID;
    const ipoQuantityRaw = process.env.IPO_QUANTITY || '10';
    const ipoQuantity = parseInt(ipoQuantityRaw, 10);
    if (isNaN(ipoQuantity) || ipoQuantity < 1) {
      throw new Error('IPO_QUANTITY must be a positive number');
    }
    const ipoCrn = process.env.IPO_CRN;
    const ipoPin = process.env.IPO_PIN;
    
    if (!username || !password) {
      throw new Error('MEROSHARE_USERNAME and MEROSHARE_PASSWORD must be set in .env file');
    }
    
    if (telegramToken) {
      try {
        initBot(telegramToken);
      } catch (error) {
        // Continue without Telegram notifications
      }
    }
    
    try {
      await page.waitForSelector('form, input#username, select2#selectBranch', { timeout: 15000 });
    } catch (e) {
      // Form not found, continuing anyway
    }
    await page.waitForTimeout(1000);
    
    try {
      await performLogin(page, { username, password, dp });
      
      await page.waitForTimeout(3000);
      
      const success = await isLoginSuccessful(page);
      if (!success) {
        let errorMessage = 'Login failed';
        const errorText = await page.locator('.error, .alert-danger, [role="alert"]').first().textContent().catch(() => null);
        if (errorText) {
          errorMessage = `Login failed: ${errorText.trim()}`;
        }
        
        try {
          await page.locator('input[type="password"], input[name*="password" i]').evaluate(el => el.value = '');
          await page.locator('input[name*="username" i], input[id*="username" i]').evaluate(el => el.value = '');
          await page.waitForTimeout(500);
          await page.screenshot({ path: 'test-results/login-failure.png', fullPage: true });
        } catch (e) {
          // Screenshot failed or fields not found, continue
        }
        
        throw new Error(errorMessage);
      }
      
      await clickMyASBA(page);
      await page.waitForTimeout(3000);

      const applyInfo = await checkForApplyButton(page);

      if (!applyInfo.found) {
        if (telegramChatId && telegramToken) {
          await notifyIPONotFound(telegramChatId);
        }
        return;
      }
      const ipoDetails = await getIPODetails(page);
      if (telegramChatId && telegramToken) {
        await notifyIPOAvailable(telegramChatId, ipoDetails.name || 'Unknown IPO');
      }

      if (ipoCrn && ipoPin) {
        await clickApplyButton(page, applyInfo);
        await page.waitForTimeout(3000);

        await fillIPOApplication(page, { quantity: ipoQuantity, crn: ipoCrn, pin: ipoPin });
        await page.waitForTimeout(2000);

        const submitted = await submitIPOApplication(page);
        await page.waitForTimeout(3000);

        if (!page.isClosed()) {
          const status = await checkApplicationStatus(page);
          if (telegramChatId && telegramToken) {
            const statusText = status.success ? 'success' : 'failed';
            await notifyIPOStatus(telegramChatId, statusText, status.message || 'IPO application process completed');
          }
        } else {
          if (telegramChatId && telegramToken) {
            await notifyIPOStatus(telegramChatId, 'success', 'IPO application submitted successfully (page closed).');
          }
        }
      }
      
    } catch (error) {
      if (telegramChatId && telegramToken) {
        await notifyError(telegramChatId, error.message);
      }
      throw error;
    }
  });
});
