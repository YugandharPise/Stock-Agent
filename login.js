const { chromium } = require('playwright');
const path = require('path');

const PROFILE_PATH = path.join(__dirname, 'playwright-session');
const CHROME_PATH = 'C:/Program Files/Google/Chrome/Application/chrome.exe';

(async () => {
  const browser = await chromium.launchPersistentContext(PROFILE_PATH, {
    headless: false,
    executablePath: CHROME_PATH,
  });

  const page = await browser.newPage();
  console.log(' Browser opened. Please log in to all required sites (Moneycontrol, TradingView)...');

  // Keep browser open until you close it manually
})();
