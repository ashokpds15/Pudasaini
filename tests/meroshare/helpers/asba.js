/**
 * ASBA page helper functions
 */

const { waitForPageReady } = require('./common');

/**
 * Check if "Apply" text/button exists on My ASBA page
 * @param {import('@playwright/test').Page} page - Playwright page object
 * @returns {Promise<{found: boolean, element?: any, text?: string}>}
 */
async function checkForApplyButton(page) {
  await page.waitForTimeout(2000);
  
  try {
    await waitForPageReady(page, [
      'body',
      'table',
      '.table',
      '[class*="asba" i]'
    ], 10000);
  } catch (e) {
    // Page not fully loaded, continuing
  }
  
  try {
    const pageContent = await page.textContent('body');
    if (pageContent) {
      if (/No Record/i.test(pageContent)) {
        return { found: false, reason: 'No Record(s) Found' };
      }
    }
  } catch (e) {
    // Could not check page content for "No Record"
  }
  
  try {
    const noRecordSelectors = [
      '*:has-text("No Record")',
      '*:has-text("No Record(s) Found")',
      'text=/No Record/i',
    ];
    
    for (const selector of noRecordSelectors) {
      try {
        const element = page.locator(selector).first();
        if (await element.isVisible({ timeout: 2000 })) {
          return { found: false, reason: 'No Record(s) Found' };
        }
      } catch (e) {
        continue;
      }
    }
  } catch (e) {
    // Continue to check for Apply button
  }
  
  const applySelectors = [
    'button:has-text("Apply")',
    'a:has-text("Apply")',
    'a:has-text("Apply for Issue")',
    '*:has-text("Apply for Issue")',
    'text=/Apply for Issue/i',
    'text=/Apply/i',
    '[class*="apply" i]',
    '[id*="apply" i]',
    'button[type="button"]:has-text("Apply")',
    'button[type="submit"]:has-text("Apply")',
  ];
  
  for (const selector of applySelectors) {
    try {
      const element = page.locator(selector).first();
      if (await element.isVisible({ timeout: 3000 })) {
        const text = await element.textContent();
        if (text && (text.includes('Apply for Issue') || text.trim() === 'Apply' || text.includes('Apply'))) {
          const tagName = await element.evaluate(el => el.tagName.toLowerCase());
          if (tagName === 'button' || tagName === 'a' || await element.getAttribute('onclick')) {
            return {
              found: true,
              element: element,
              text: text?.trim(),
              selector: selector
            };
          }
        }
      }
    } catch (e) {
      continue;
    }
  }
  
  return { found: false };
}

/**
 * Get IPO details from ASBA page
 * @param {import('@playwright/test').Page} page - Playwright page object
 * @returns {Promise<Object>} - IPO details
 */
async function getIPODetails(page) {
  await page.waitForTimeout(2000);
  
  const details = {
    name: '',
    company: '',
    issueSize: '',
    price: '',
    openDate: '',
    closeDate: '',
  };
  
  try {
    const tableRows = await page.locator('table tr, .table tr').all();
    
    for (let i = 0; i < Math.min(tableRows.length, 10); i++) {
      const row = tableRows[i];
      const rowText = await row.textContent();
      
      if (rowText) {
        if (!details.name && /ipo|issue|company/i.test(rowText)) {
          details.name = rowText.trim().substring(0, 100);
        }
      }
    }
    
    const pageText = await page.textContent('body');
    if (pageText) {
      details.name = pageText.substring(0, 200);
    }
  } catch (e) {
    // Could not extract IPO details
  }
  
  return details;
}

/**
 * Click Apply button on ASBA page
 * @param {import('@playwright/test').Page} page - Playwright page object
 * @param {Object} applyInfo - Apply button information from checkForApplyButton
 */
async function clickApplyButton(page, applyInfo) {
  if (!applyInfo.found || !applyInfo.element) {
    throw new Error('Apply button not found or element not available');
  }
  
  try {
    await applyInfo.element.click();
    await page.waitForTimeout(2000);
  } catch (e) {
    const selector = applyInfo.selector || 'button:has-text("Apply"), a:has-text("Apply")';
    const element = page.locator(selector).first();
    if (await element.isVisible({ timeout: 3000 })) {
      await element.click();
      await page.waitForTimeout(2000);
    } else {
      throw new Error('Could not click Apply button');
    }
  }
}

module.exports = {
  checkForApplyButton,
  getIPODetails,
  clickApplyButton,
};

