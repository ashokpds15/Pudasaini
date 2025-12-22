const { test } = require('@playwright/test');
require('dotenv').config();
const {
  performLogin,
  isLoginSuccessful,
  clickMyASBA,
  checkForApplyButton,
  getIPODetails,
  clickApplyButton,
  clickShareRow,
  verifyShareDetails,
  goBackToMyASBA,
  fillIPOApplication,
  submitIPOApplication,
  checkApplicationStatus,
  initBot,
  notifyIPOAvailable,
  notifyIPOStatus,
  notifyError,
  notifyIPONotFound,
  notifyIPOOpenForReview,
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
    const ipoBank = process.env.MEROSHARE_BANK;
    const ipoAccountNumber = process.env.MEROSHARE_P_ACCOUNT_NO;
    const ipoKitta = process.env.MEROSHARE_KITTA_N0;
    const ipoCrn = process.env.MEROSHARE_CRN_NO;
    
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
      
      // Step 1: Click on the share row to view details
      const clickedRow = await clickShareRow(page, applyInfo);
      if (!clickedRow) {
        if (telegramChatId && telegramToken) {
          await notifyError(telegramChatId, 'Could not click on share row to view details');
        }
        return;
      }
      
      // Step 2: Verify Share Value Per Unit = 100 and MinUnit = 10
      const verification = await verifyShareDetails(page, 100, 10);
      
      if (!verification.valid) {
        // Send IPO Open notification with details for manual review
        if (telegramChatId && telegramToken) {
          await notifyIPOOpenForReview(telegramChatId, {
            companyName: applyInfo.ipoDetails?.companyName,
            shareValuePerUnit: verification.shareValuePerUnit,
            minUnit: verification.minUnit,
            reason: verification.reason
          });
        }
        return;
      }
      
      // Step 3: Go back to My ASBA
      await goBackToMyASBA(page);
      await page.waitForTimeout(2000);
      
      // Step 4: Find the Apply button again
      const applyInfoRefresh = await checkForApplyButton(page);
      if (!applyInfoRefresh.found) {
        if (telegramChatId && telegramToken) {
          await notifyError(telegramChatId, 'Could not find Apply button after verification');
        }
        return;
      }
      
      // Send Telegram notification
      if (telegramChatId && telegramToken) {
        await notifyIPOAvailable(telegramChatId, applyInfoRefresh.ipoDetails);
      }

      if (ipoBank && ipoAccountNumber && ipoKitta && ipoCrn) {
        await clickApplyButton(page, applyInfoRefresh);
        await page.waitForTimeout(3000);

        await fillIPOApplication(page, {
          bank: ipoBank,
          accountNumber: ipoAccountNumber,
          kitta: ipoKitta,
          crn: ipoCrn
        });
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
        // Catch page closed errors
        if (error.message && error.message.includes('Target page, context or browser has been closed')) {
          await notifyIPOStatus(telegramChatId, 'unknown', 'Page closed unexpectedly during automation. IPO may or may not have been submitted.');
        } else {
          await notifyError(telegramChatId, error.message);
        }
      }
      throw error;
    }
  });
});
