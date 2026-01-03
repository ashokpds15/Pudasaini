# MeroShare IPO Automation with Playwright

Automated IPO application system for MeroShare (https://meroshare.cdsc.com.np) using Playwright.

<p align="center">
  <img src="screenshot/Telegram%20Notification.png" width="200" alt="Telegram Notification">
  <br>
  <em>Example of IPO notification received on Telegram with company details and verification status</em>
</p>

## 🎯 What It Does

1. **Logs in** to MeroShare with your credentials
2. **Navigates** to "My ASBA" page
3. **Scans for IPOs** - Only processes **Ordinary Shares** (ignores Mutual Funds, etc.)
4. **Verifies details** before applying:
   - Share Value Per Unit = 100
   - Min Unit = 10
5. **Applies automatically** if criteria met:
   - Fills form (Bank, Account, Kitta, CRN)
   - Enters Transaction PIN
   - Submits application
6. **Sends Telegram notifications**:
   - ✅ Success: IPO applied
   - ⚠️ Needs Review: IPO open but didn't meet criteria
   - ❌ No IPO: Nothing available

## Setup

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Install Playwright browsers:**
   ```bash
   npx playwright install chromium
   ```

3. **Create `.env` file** in the project root:
   ```env
   # MeroShare Credentials
   MEROSHARE_USERNAME=your_username
   MEROSHARE_PASSWORD=your_password
   MEROSHARE_DP_NP=your_depository_participant
   
   # IPO Application Settings
   MEROSHARE_BANK=your_bank_name
   MEROSHARE_P_ACCOUNT_NO=your_account_number
   MEROSHARE_KITTA_N0=10
   MEROSHARE_CRN_NO=your_crn_number
   MEROSHARE_TXN_PIN=your_4_digit_pin
   
   # Telegram Bot (for notifications)
   TELEGRAM_BOT_TOKEN=your_telegram_bot_token
   TELEGRAM_CHAT_ID=your_telegram_chat_id
   ```

4. **Setup Telegram Bot:**
   - Create a bot by messaging [@BotFather](https://t.me/botfather) on Telegram
   - Get your bot token
   - Get your chat ID by messaging [@userinfobot](https://t.me/userinfobot)
   - **Alternative: Get Chat ID programmatically** (if the above doesn't work):
     ```python
     import requests
     import json
     
     your_token = "XYZ"
     # Let's get your chat id! Be sure to have sent a message to your bot.
     url = 'https://api.telegram.org/bot'+str(your_token)+'/getUpdates'
     response = requests.get(url)
     myinfo = response.json()
     if response.status_code == 401:
       raise NameError('Check if your token is correct.')
     
     try:
       CHAT_ID: int = myinfo['result'][1]['message']['chat']['id']
     
       print('This is your Chat ID:', CHAT_ID)
     
     except:
       print('Have you sent a message to your bot? Telegram bot are quite shy 🤣.')
     ```
   - Add both to your `.env` file

## Running

```bash
# Run automation (headless)
npm run automate

# Run with browser visible
npm run automate:headed
```

## GitHub Actions (Cloud Automation)

The project includes a GitHub Actions workflow that runs automatically at **9:00 AM Nepal Time** daily.

### Setup GitHub Secrets

You can set up the required secrets manually or using the provided Infrastructure as Code (OpenTofu/Terraform) configuration.

#### Option 1: Manual Setup
Go to: **Settings** → **Secrets and variables** → **Actions** → **New repository secret**

Add these secrets:
- `MEROSHARE_USERNAME`
- `MEROSHARE_PASSWORD`
- `MEROSHARE_DP_NP`
- `MEROSHARE_BANK`
- `MEROSHARE_P_ACCOUNT_NO`
- `MEROSHARE_KITTA_N0`
- `MEROSHARE_CRN_NO`
- `MEROSHARE_TXN_PIN`
- `TELEGRAM_BOT_TOKEN`
- `TELEGRAM_CHAT_ID`

#### Option 2: Automated Setup (OpenTofu / Terraform)
If you want to manage secrets as code, use the `infra/` folder:

1. **Prerequisites:** Install [OpenTofu](https://opentofu.org/) (recommended) or [Terraform](https://developer.hashicorp.com/terraform/downloads).
2. **Create a GitHub PAT:** Generate a [Personal Access Token](https://github.com/settings/tokens) with `repo` permissions.
3. **Configure Variables:** Create `infra/<example_secret>.tfvars`:
   ```hcl
   PAT = "your_github_pat"
   example_secret = {
     MEROSHARE_USERNAME     = "..."
     MEROSHARE_PASSWORD     = "..."
     # ... add all other secrets here ...
   }
   ```
4. **Deploy:**
   ```bash
   cd infra
   tofu init
   tofu apply -var-file="<example_secret>.tfvars"
   ```
   *(Note: You can use `terraform` instead of `tofu` if you prefer.)*

   **Important:** Never commit `example_secret.tfvars`, `terraform.tfstate`, or `terraform.tfstate.backup` files as they contain plain-text secrets.

## Project Structure

```
├── tests/meroshare/
│   ├── login.spec.js          # Main test orchestration
│   └── helpers/
│       ├── index.js           # Central export
│       ├── login.js           # DP selection & authentication
│       ├── navigation.js      # My ASBA navigation
│       ├── asba.js            # IPO detection & verification
│       ├── ipo.js             # Form filling & submission
│       ├── telegram.js        # Notifications
│       └── common.js          # Utilities
├── .github/workflows/
│   └── meroshare-automation.yml
├── playwright.config.js
├── .env
└── package.json
```

## Features

- ✅ Auto-login with DP selection
- ✅ Ordinary Shares detection (filters out Mutual Funds)
- ✅ Share verification (Value Per Unit & Min Unit)
- ✅ Auto-fill IPO application form
- ✅ Telegram notifications
- ✅ GitHub Actions scheduled automation
- ✅ Element-based waits (reliable)
## Resources

- [Playwright Documentation](https://playwright.dev)
- [MeroShare](https://meroshare.cdsc.com.np)
- [Moving Beyond Manual: Managing GitHub Infrastructure with OpenTofu](https://medium.com/@prazeina/moving-beyond-manual-managing-github-infrastructure-with-opentofu-f1d61a47d6fc)
