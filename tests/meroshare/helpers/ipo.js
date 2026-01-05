/**
 * IPO application helper functions
 */

const { waitForPageReady } = require('./common');

/**
 * Select bank from dropdown
 * @param {import('@playwright/test').Page} page - Playwright page object
 * @param {string} bankName - Bank name to select
 */
/**
 * Normalize bank name for matching (handles variations like "Limited" vs "Ltd.")
 * @param {string} bankName - Bank name to normalize
 * @returns {string} - Normalized bank name
 */
function normalizeBankName(bankName) {
  if (!bankName) return '';
  
  return bankName
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/\blimited\b/gi, 'limited')
    .replace(/\bltd\.?\b/gi, 'limited')
    .replace(/\bltd\b/gi, 'limited');
}

/**
 * Check if two bank names match (handles variations)
 * @param {string} name1 - First bank name
 * @param {string} name2 - Second bank name
 * @returns {boolean} - True if they match
 */
function bankNamesMatch(name1, name2) {
  if (!name1 || !name2) return false;
  
  const norm1 = normalizeBankName(name1);
  const norm2 = normalizeBankName(name2);
  
  return norm1 === norm2 || 
         norm1.includes(norm2) || 
         norm2.includes(norm1);
}

async function selectBank(page, bankName) {
  if (!bankName || !bankName.trim()) {
    return false;
  }
  
  const searchText = bankName.trim();
  
  await page.waitForTimeout(1000);
  
  let bankSelected = false;
  
  const select2Selectors = [
    'span.select2-container:has-text("Please choose one")',
    'span.select2-selection:has-text("Please choose one")',
    'span.select2-container',
    '[role="combobox"]:has-text("Please choose one")',
  ];
  
  for (const selector of select2Selectors) {
    try {
      const dropdown = page.locator(selector).first();
      if (await dropdown.isVisible({ timeout: 2000 })) {
        await dropdown.click();
        await page.waitForTimeout(1000);
        
        try {
          await page.waitForSelector('ul.select2-results__options', { timeout: 3000, state: 'visible' });
        } catch (e) {
          await page.waitForTimeout(1000);
        }
        
        try {
          const allOptions = await page.locator('li.select2-results__option').all();
          for (const option of allOptions) {
            try {
              const optionText = await option.textContent();
              if (optionText) {
                const trimmedOption = optionText.trim();
                if (bankNamesMatch(trimmedOption, searchText)) {
                  await option.scrollIntoViewIfNeeded();
                  await option.click({ force: true });
                  bankSelected = true;
                  await page.waitForTimeout(1000);
                  break;
                }
              }
            } catch (e) {
              continue;
            }
          }
        } catch (e) {}
        
        if (bankSelected) break;
        
        const optionSelectors = [
          `li.select2-results__option:has-text("${searchText}")`,
          `ul.select2-results__options li:has-text("${searchText}")`,
          `li:has-text("${searchText}")`,
        ];
        
        for (const optionSelector of optionSelectors) {
          try {
            const option = page.locator(optionSelector).first();
            if (await option.isVisible({ timeout: 2000 })) {
              await option.scrollIntoViewIfNeeded();
              await option.click({ force: true });
              bankSelected = true;
              await page.waitForTimeout(1000);
              break;
            }
          } catch (e) {
            continue;
          }
        }
        
        if (bankSelected) break;
      }
    } catch (e) {
      continue;
    }
  }
  
  if (!bankSelected) {
    const nativeSelectSelectors = [
      'select[name*="bank" i]',
      'select[id*="bank" i]',
      'select',
    ];
    
    for (const selector of nativeSelectSelectors) {
      try {
        const dropdown = page.locator(selector).first();
        if (await dropdown.isVisible({ timeout: 2000 })) {
          try {
            await dropdown.selectOption({ label: searchText });
            bankSelected = true;
            await page.waitForTimeout(500);
            break;
          } catch (e) {
            try {
              const allOptions = await dropdown.locator('option').all();
              for (const option of allOptions) {
                const optionText = await option.textContent();
                if (optionText && bankNamesMatch(optionText.trim(), searchText)) {
                  await dropdown.selectOption({ value: await option.getAttribute('value') });
                  bankSelected = true;
                  await page.waitForTimeout(500);
                  break;
                }
              }
              if (bankSelected) break;
            } catch (e2) {
              continue;
            }
          }
        }
      } catch (e) {
        continue;
      }
    }
  }
  
  if (!bankSelected) {
    try {
      const underlyingSelect = page.locator('select[name*="bank" i], select[id*="bank" i]').first();
      if (await underlyingSelect.isVisible({ timeout: 2000 })) {
        const allOptions = await underlyingSelect.locator('option').all();
        for (const option of allOptions) {
          const optionText = await option.textContent();
          if (optionText && bankNamesMatch(optionText.trim(), searchText)) {
            const optionValue = await option.getAttribute('value');
            await underlyingSelect.evaluate((select, value) => {
              select.value = value;
              select.dispatchEvent(new Event('change', { bubbles: true }));
            }, optionValue);
            bankSelected = true;
            await page.waitForTimeout(1000);
            break;
          }
        }
      }
    } catch (e) {}
  }
  
  return bankSelected;
}

/**
 * Select account number from dropdown
 * @param {import('@playwright/test').Page} page - Playwright page object
 * @param {string} accountNumber - Account number to select
 */
async function selectAccountNumber(page, accountNumber) {
  if (!accountNumber || !accountNumber.trim()) {
    return false;
  }
  
  await page.waitForTimeout(1000);
  
  const accountSelectors = [
    'span.select2-container:has-text("Please choose one of Account Number")',
    'span.select2-selection:has-text("Please choose one of Account Number")',
    'span.select2-container',
    'select[name*="account" i]',
    'select[id*="account" i]',
    'select',
  ];
  
  let accountSelected = false;
  
  for (const selector of accountSelectors) {
    try {
      const dropdown = page.locator(selector).first();
      if (await dropdown.isVisible({ timeout: 2000 })) {
        await dropdown.click();
        await page.waitForTimeout(1000);
        
        const optionSelectors = [
          `li.select2-results__option:has-text("${accountNumber}")`,
          `ul.select2-results__options li:has-text("${accountNumber}")`,
          `li:has-text("${accountNumber}")`,
          `text="${accountNumber}"`,
        ];
        
        for (const optionSelector of optionSelectors) {
          try {
            const option = page.locator(optionSelector).first();
            if (await option.isVisible({ timeout: 2000 })) {
              await option.click();
              accountSelected = true;
              await page.waitForTimeout(500);
              break;
            }
          } catch (e) {
            continue;
          }
        }
        
        if (accountSelected) break;
        
        try {
          const allOptions = await page.locator('li.select2-results__option').all();
          for (const option of allOptions) {
            try {
              const optionText = await option.textContent();
              if (optionText && optionText.trim() === accountNumber.trim()) {
                await option.click();
                accountSelected = true;
                await page.waitForTimeout(500);
                break;
              }
            } catch (e) {
              continue;
            }
          }
        } catch (e) {}
        
        if (accountSelected) break;
      }
    } catch (e) {
      continue;
    }
  }
  
  if (!accountSelected) {
    const nativeSelectSelectors = [
      'select[name*="account" i]',
      'select[id*="account" i]',
      'select',
    ];
    
    for (const selector of nativeSelectSelectors) {
      try {
        const dropdown = page.locator(selector).first();
        if (await dropdown.isVisible({ timeout: 2000 })) {
          try {
            await dropdown.selectOption({ label: accountNumber.trim() });
            accountSelected = true;
            await page.waitForTimeout(500);
            break;
          } catch (e) {
            try {
              await dropdown.selectOption({ value: accountNumber });
              accountSelected = true;
              await page.waitForTimeout(500);
              break;
            } catch (e2) {
              continue;
            }
          }
        }
      } catch (e) {
        continue;
      }
    }
  }
  
  return accountSelected;
}

/**
 * Fill IPO application form
 * @param {import('@playwright/test').Page} page - Playwright page object
 * @param {Object} applicationData - IPO application data
 * @param {string} applicationData.bank - Bank name from MEROSHARE_DP_NP
 * @param {string} applicationData.accountNumber - Account number from MEROSHARE_P_ACCOUNT_NO
 * @param {string} applicationData.kitta - Applied Kitta number from MEROSHARE_KITTA_N0
 * @param {string} applicationData.crn - CRN number from MEROSHARE_CRN_NO
 */
async function fillIPOApplication(page, applicationData = {}) {
  const { bank, accountNumber, kitta, crn } = applicationData;
  
  await page.waitForTimeout(2000);
  
  try {
    await waitForPageReady(page, [
      'form',
      'select',
      'input[type="text"]',
      'input[placeholder*="kitta" i]',
      'input[placeholder*="CRN" i]'
    ], 10000);
  } catch (e) {}
  
  if (bank) {
    await selectBank(page, bank);
    await page.waitForTimeout(2000);
    
    if (accountNumber) {
      try {
        await waitForPageReady(page, [
          'select[name*="account" i]',
          'select[id*="account" i]',
          'span.select2-container',
          'select'
        ], 5000);
      } catch (e) {}
    }
  }
  
  if (accountNumber) {
    await selectAccountNumber(page, accountNumber);
    await page.waitForTimeout(1000);
  }
  
  if (kitta) {
    const kittaSelectors = [
      'input[placeholder*="kitta" i]',
      'input[name*="kitta" i]',
      'input[id*="kitta" i]',
      'input[placeholder*="Applied Kitta" i]',
      'input[placeholder*="Enter Applied Kitta Number" i]',
    ];
    
    for (const selector of kittaSelectors) {
      try {
        const field = page.locator(selector).first();
        if (await field.isVisible({ timeout: 2000 })) {
          await field.clear();
          await field.fill(kitta);
          break;
        }
      } catch (e) {
        continue;
      }
    }
    await page.waitForTimeout(500);
  }
  
  if (crn) {
    const crnSelectors = [
      'input[placeholder*="CRN" i]',
      'input[name*="crn" i]',
      'input[id*="crn" i]',
      'input[placeholder*="Enter CRN" i]',
    ];
    
    for (const selector of crnSelectors) {
      try {
        const field = page.locator(selector).first();
        if (await field.isVisible({ timeout: 2000 })) {
          await field.clear();
          await field.fill(crn);
          break;
        }
      } catch (e) {
        continue;
      }
    }
    await page.waitForTimeout(500);
  }
  
  const declarationText = 'I hereby declare that I am applying with the above mentioned details';
  const checkboxSelectors = [
    `input[type="checkbox"]:near(text="${declarationText}")`,
    `input[type="checkbox"]:near(text="I hereby declare")`,
    'input[type="checkbox"]',
    'input[name*="declare" i]',
    'input[id*="declare" i]',
  ];
  
  for (const selector of checkboxSelectors) {
    try {
      const checkbox = page.locator(selector).first();
      if (await checkbox.isVisible({ timeout: 2000 })) {
        const isChecked = await checkbox.isChecked();
        if (!isChecked) {
          await checkbox.check();
        }
        await page.waitForTimeout(500);
        break;
      }
    } catch (e) {
      continue;
    }
  }
  
  try {
    const declarationCheckbox = page.locator(`text="${declarationText}"`).locator('..').locator('input[type="checkbox"]').first();
    if (await declarationCheckbox.isVisible({ timeout: 2000 })) {
      const isChecked = await declarationCheckbox.isChecked();
      if (!isChecked) {
        await declarationCheckbox.check();
      }
      await page.waitForTimeout(500);
    }
  } catch (e) {}
  
  await page.waitForTimeout(1000);
  
  return { filled: true };
}

/**
 * Submit IPO application (handles Proceed -> PIN -> Apply flow)
 * @param {import('@playwright/test').Page} page - Playwright page object
 * @returns {Promise<{submitted: boolean, clickedApply: boolean, error?: string}>} - Submission result details
 */
async function submitIPOApplication(page) {
  await page.waitForTimeout(1000);
  
  const result = {
    submitted: false,
    clickedApply: false,
    error: null
  };
  
  const proceedSelectors = [
    'button:has-text("Proceed")',
    'button[type="submit"]:has-text("Proceed")',
    'button.btn-primary:has-text("Proceed")',
    'button:has-text("Submit")',
    'button:has-text("Confirm")',
    'button[type="submit"]',
    'input[type="submit"]',
    'button.btn-primary',
    'button.btn-submit',
  ];
  
  let proceedClicked = false;
  for (const selector of proceedSelectors) {
    try {
      const button = page.locator(selector).first();
      if (await button.isVisible({ timeout: 3000 })) {
        await button.click();
        proceedClicked = true;
        await page.waitForTimeout(2000);
        break;
      }
    } catch (e) {
      continue;
    }
  }
  
  if (!proceedClicked) {
    result.error = 'Could not find Proceed button';
    return result;
  }
  
  const txnPin = process.env.MEROSHARE_TXN_PIN;
  if (!txnPin) {
    result.error = 'Transaction PIN not configured';
    return result;
  }
  
  const pinInputSelectors = [
    'input[placeholder="Enter Pin"]',
    'input[placeholder*="PIN" i]',
    'input[placeholder*="Pin" i]',
    'input[type="password"]',
    'input[type="text"][placeholder*="pin" i]',
    'input.form-control[type="password"]',
    'input.form-control[type="text"]',
  ];
  
  let pinEntered = false;
  for (const selector of pinInputSelectors) {
    try {
      const pinInput = page.locator(selector).first();
      if (await pinInput.isVisible({ timeout: 3000 })) {
        await pinInput.clear();
        await pinInput.fill(txnPin);
        pinEntered = true;
        await page.waitForTimeout(500);
        break;
      }
    } catch (e) {
      continue;
    }
  }
  
  if (!pinEntered) {
    result.error = 'Could not find PIN input field';
    return result;
  }
  
  const applySelectors = [
    'button:has-text("Apply")',
    'button.btn-primary:has-text("Apply")',
    'button[type="submit"]:has-text("Apply")',
    'button.btn-primary',
    'button[type="submit"]',
  ];
  
  for (const selector of applySelectors) {
    try {
      const applyButton = page.locator(selector).first();
      if (await applyButton.isVisible({ timeout: 3000 })) {
        await applyButton.click();
        result.clickedApply = true;
        
        // Wait for response - look for any success/error message or loading to complete
        await page.waitForTimeout(5000);
        
        // Check if button is still visible (might indicate form didn't submit)
        try {
          const stillVisible = await applyButton.isVisible({ timeout: 1000 });
          if (stillVisible) {
            // Button still visible - check if there's an error message
            const pageContent = await page.textContent('body');
            if (/error|invalid|failed|incorrect/i.test(pageContent)) {
              result.error = 'Application may have failed - error detected on page';
              return result;
            }
          }
        } catch (e) {
          // Button no longer visible, might have navigated - could be success
        }
        
        result.submitted = true;
        return result;
      }
    } catch (e) {
      continue;
    }
  }
  
  result.error = 'Could not find Apply button';
  return result;
}

/**
 * Check if application was successful
 * @param {import('@playwright/test').Page} page - Playwright page object
 * @returns {Promise<{success: boolean, message?: string}>}
 */
async function checkApplicationStatus(page) {
  await page.waitForTimeout(3000);
  
  // Get the full page content for pattern matching
  let pageContent = '';
  try {
    pageContent = await page.textContent('body');
  } catch (e) {
    pageContent = '';
  }
  
  // Check for specific MeroShare success messages (must match exact patterns)
  const successPatterns = [
    /IPO\s+(has\s+been\s+)?applied\s+successfully/i,
    /application\s+(has\s+been\s+)?submitted\s+successfully/i,
    /successfully\s+applied/i,
    /your\s+application\s+has\s+been\s+submitted/i,
    /application\s+successful/i,
  ];
  
  for (const pattern of successPatterns) {
    if (pattern.test(pageContent)) {
      return {
        success: true,
        message: pageContent.match(pattern)?.[0] || 'Application submitted successfully'
      };
    }
  }
  
  // Check for specific success alert/toast elements with strict patterns
  const successAlertSelectors = [
    '.alert-success',
    '.toast-success',
    '[class*="success-message"]',
    '.swal2-success',
    '.notification-success',
  ];
  
  for (const selector of successAlertSelectors) {
    try {
      const element = page.locator(selector).first();
      if (await element.isVisible({ timeout: 2000 })) {
        const text = await element.textContent();
        // Only count as success if it contains IPO/application related keywords
        if (text && (/IPO|application|submitted|applied/i.test(text))) {
          return {
            success: true,
            message: text.trim()
          };
        }
      }
    } catch (e) {
      continue;
    }
  }
  
  // Check for specific error patterns FIRST (before generic checks)
  const errorPatterns = [
    /already\s+(applied|submitted)/i,
    /duplicate\s+application/i,
    /application\s+(has\s+)?failed/i,
    /error\s+(occurred|processing)/i,
    /invalid\s+(PIN|CRN|account)/i,
    /insufficient\s+balance/i,
    /transaction\s+failed/i,
    /unable\s+to\s+(process|submit)/i,
    /please\s+try\s+again/i,
    /something\s+went\s+wrong/i,
    /server\s+error/i,
    /session\s+expired/i,
    /not\s+eligible/i,
    /quota\s+exceeded/i,
    /limit\s+(exceeded|reached)/i,
  ];
  
  for (const pattern of errorPatterns) {
    if (pattern.test(pageContent)) {
      const matchedText = pageContent.match(pattern)?.[0] || 'Application failed';
      return {
        success: false,
        message: matchedText
      };
    }
  }
  
  // Check for error alert/toast elements
  const errorAlertSelectors = [
    '.alert-danger',
    '.alert-error',
    '.toast-error',
    '[class*="error-message"]',
    '.swal2-error',
    '.notification-error',
    '.error-text',
  ];
  
  for (const selector of errorAlertSelectors) {
    try {
      const element = page.locator(selector).first();
      if (await element.isVisible({ timeout: 2000 })) {
        const text = await element.textContent();
        if (text && text.trim().length > 0) {
          return {
            success: false,
            message: text.trim()
          };
        }
      }
    } catch (e) {
      continue;
    }
  }
  
  // Check if we're still on the application form (means submission didn't complete)
  const stillOnFormIndicators = [
    'input[placeholder*="PIN" i]',
    'input[placeholder*="CRN" i]',
    'button:has-text("Proceed")',
    'button:has-text("Apply")',
  ];
  
  for (const selector of stillOnFormIndicators) {
    try {
      const element = page.locator(selector).first();
      if (await element.isVisible({ timeout: 1000 })) {
        return {
          success: false,
          message: 'Application form still visible - submission may not have completed'
        };
      }
    } catch (e) {
      continue;
    }
  }
  
  // Don't assume success just because URL changed - be conservative
  return {
    success: false,
    message: 'Could not verify application status - please check MeroShare manually'
  };
}

module.exports = {
  fillIPOApplication,
  submitIPOApplication,
  checkApplicationStatus,
};

