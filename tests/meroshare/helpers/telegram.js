/**
 * Telegram bot helper functions for notifications
 */

const TelegramBot = require('node-telegram-bot-api');

let bot = null;

/**
 * Initialize Telegram bot
 * @param {string} token - Telegram bot token
 * @returns {TelegramBot} - Initialized bot instance
 */
function initBot(token) {
  if (!token) {
    throw new Error('Telegram bot token is required');
  }
  
  if (!bot) {
    bot = new TelegramBot(token, { polling: false });
  }
  
  return bot;
}

/**
 * Send message to Telegram
 * @param {string} chatId - Telegram chat ID
 * @param {string} message - Message to send
 * @param {Object} options - Additional options (parse_mode, etc.)
 */
async function sendMessage(chatId, message, options = {}) {
  if (!bot) {
    console.error('Telegram bot not initialized. Call initBot() first.');
    return;
  }
  
  try {
    await bot.sendMessage(chatId, message, options);
    console.log('Telegram notification sent successfully');
  } catch (error) {
    console.error('Failed to send Telegram message:', error.message);
    if (error.response && error.response.body) {
      console.error('Telegram API error:', error.response.body.description);
    }
  }
}

/**
 * Send notification about IPO application status
 * @param {string} chatId 
 * @param {string} status 
 * @param {string} details 
 */
async function notifyIPOStatus(chatId, status, details = '') {
  const emoji = status === 'success' ? '✅' : status === 'failed' ? '❌' : '⚠️';
  const message = `${emoji} *IPO Application ${status.toUpperCase()}*\n\n` +
    `${details}\n` +
    `Time: ${new Date().toLocaleString()}`;
  
  await sendMessage(chatId, message, { parse_mode: 'Markdown' });
}

/**
 * Send error notification
 * @param {string} chatId - Telegram chat ID
 * @param {string} error - Error message
 */
async function notifyError(chatId, error) {
  const message = `❌ *Error Occurred*\n\n` +
    `Error: ${error}\n` +
    `Time: ${new Date().toLocaleString()}`;
  
  await sendMessage(chatId, message, { parse_mode: 'Markdown' });
}

/**
 * Send notification when IPO is not found
 * @param {string} chatId - Telegram chat ID
 */
async function notifyIPONotFound(chatId) {
  const message = `ℹ️ *No IPO Today 🤦‍♀️*`;
  
  await sendMessage(chatId, message, { parse_mode: 'Markdown' });
}

/**
 * Send notification about IPO open with share details (for manual review)
 * @param {string} chatId - Telegram chat ID
 * @param {object} details - IPO details
 * @param {string} details.companyName - Company name
 * @param {number} details.shareValuePerUnit - Share Value Per Unit
 * @param {number} details.minUnit - MinUnit
 * @param {string} details.reason - Reason for not auto-applying
 */
async function notifyIPOOpenForReview(chatId, details) {
  let message = '🚀 *IPO Open* ℹ️\n\n';
  
  if (details.companyName) {
    message += `*Company:* ${details.companyName}\n`;
  }
  if (details.shareValuePerUnit !== undefined && details.shareValuePerUnit !== null) {
    message += `*Share Value Per Unit:* ${details.shareValuePerUnit}\n`;
  }
  if (details.minUnit !== undefined && details.minUnit !== null) {
    message += `*Min Unit:* ${details.minUnit}\n`;
  }
  
  message += `\n⚠️ *Not auto-applied*\n`;
  if (details.reason) {
    message += `_${details.reason}_\n`;
  }
  
  message += `\nTime: ${new Date().toLocaleString()}`;
  
  await sendMessage(chatId, message, { parse_mode: 'Markdown' });
}

module.exports = {
  initBot,
  sendMessage,
  notifyIPOStatus,
  notifyError,
  notifyIPONotFound,
  notifyIPOOpenForReview,
};
