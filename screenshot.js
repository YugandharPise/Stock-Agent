const fs = require('fs');
const path = require('path');
const dayjs = require('dayjs');
const { chromium } = require('playwright');

const BASE_DIR = path.join(__dirname, 'screenshots');
const PROFILE_PATH = path.join(__dirname, 'playwright-session');
const PROFILE_PATH_2 = path.join(__dirname, 'playwright-session-2');
const CHROME_PATH = 'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe';

function createFolders(stockSymbol) {
  const timestamp = dayjs().format("YYYY-MM-DD_HH-mm-ss");
  const basePath = path.join(BASE_DIR, `${stockSymbol}-${timestamp}`);

  const moneycontrolDir = path.join(basePath, 'Moneycontrol');
  const tradingViewDir = path.join(basePath, 'TradingView');
  const stockReportDir = path.join(basePath, 'Stock Report');

  [BASE_DIR, basePath, moneycontrolDir, tradingViewDir, stockReportDir].forEach((dir) => {
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  });

  return { basePath, moneycontrolDir, tradingViewDir, stockReportDir };
}

async function configureTradingView(page) {
  try {
    // Hide sidebar
    const hideButton = await page.$('button[aria-label="Hide sidebar"]');
    if (hideButton) {
      await hideButton.click();
      console.log("Sidebar hidden");
      await page.waitForTimeout(1000);
    }

    // Set to 1Y view
    const oneYearButton = await page.$('button[data-name="date-range-tab-12M"]');
    if (oneYearButton) {
      await oneYearButton.click();
      console.log("Set to 1Y view");
      await page.waitForTimeout(3000);
    }
  } catch (e) {
    console.warn("TradingView configuration skipped:", e.message);
  }
}

async function takeAllScreenshots(stockName, stockSymbol) {
  const { basePath, moneycontrolDir, tradingViewDir, stockReportDir } = createFolders(stockName);
  const browser = await chromium.launchPersistentContext(PROFILE_PATH, {
    headless: false,
    executablePath: CHROME_PATH,
  });

  const page = await browser.newPage();
  page.setDefaultTimeout(120000); // 2 minutes
  const allScreenshots = [];

  try {
    // Moneycontrol Stock Report PDF
    try {
      console.log("Navigating to Moneycontrol reports");
      await page.goto('https://www.moneycontrol.com/stock-reports/account', {
        waitUntil: 'load',
        timeout: 60000
      });
      await page.waitForTimeout(2000);

      console.log(`Searching for ${stockName}`);
      await page.fill('input.report_search_input', stockName, { timeout: 60000 });
      await page.waitForTimeout(1000);

      console.log("Selecting first suggestion");
      const firstSuggestion = page.locator('a.autosug_list_item').first();
      const [newPage] = await Promise.all([
        page.context().waitForEvent('page'),
        firstSuggestion.click({ timeout: 60000, noWaitAfter: true }),
      ]);

      await newPage.waitForLoadState('load', { timeout: 60000 });
      await newPage.waitForTimeout(3000);

      const pdfFrame = await newPage.$('iframe');
      if (pdfFrame) {
        const pdfUrl = await pdfFrame.getAttribute('src');
        const pdfPath = path.join(stockReportDir, 'report.pdf');
        const axios = require('axios');
        
        console.log("Downloading PDF report");
        try {
          const pdfResponse = await axios.get(pdfUrl, {
            responseType: 'arraybuffer',
            timeout: 60000,
            headers: { "User-Agent": "Mozilla/5.0" }
          });
          fs.writeFileSync(pdfPath, pdfResponse.data);
          allScreenshots.push(pdfPath);
          console.log("PDF report downloaded");
        } catch (e) {
          console.error("PDF download failed, capturing screenshot instead");
          const fallbackShot = path.join(stockReportDir, 'report_preview.png');
          await newPage.screenshot({ path: fallbackShot });
          allScreenshots.push(fallbackShot);
        }
      } else {
        console.log("No PDF frame found, capturing screenshot");
        const fallbackShot = path.join(stockReportDir, 'report_preview.png');
        await newPage.screenshot({ path: fallbackShot });
        allScreenshots.push(fallbackShot);
      }
      await newPage.close();
    } catch (err) {
      console.error("Moneycontrol report error:", err.message);
      await page.screenshot({ path: path.join(stockReportDir, 'error.png') });
    }

// Moneycontrol Overview
    try {
      await page.goto('https://www.moneycontrol.com/', { waitUntil: 'load', timeout: 180000 });
      await page.fill('#search_str', '');
      await page.waitForTimeout(300);
      await page.type('#search_str', stockName, { timeout : 60000 });

      await page.waitForSelector('.suglist.scrollBar a', { timeout: 60000 });
      const firstResult = page.locator('.suglist.scrollBar a').first();

      await Promise.all([
        page.waitForNavigation({ waitUntil: 'load', timeout: 180000 }),
        firstResult.click({ timeout: 30000, noWaitAfter: false }),
      ]);

      await page.waitForTimeout(3000);

      // Scroll screenshots
      let index = 1;
      let previousScroll = -1;
      await page.evaluate(() => {
        const header = document.querySelector('header');
        if (header) header.style.display = 'none';
        const menus = document.querySelectorAll('.megaMenu, .topnav');
        menus.forEach(el => el.style.display = 'none');
      });
      console.log("Hid header and menus to avoid overlay.");

      while (true) {
        const screenshotPath = path.join(moneycontrolDir, `moneycontrol_scroll_${index}.png`);
        await page.screenshot({ path: screenshotPath });
        allScreenshots.push(screenshotPath);

        const currentScroll = await page.evaluate(() => {
          const scrollAmount = window.innerHeight * 0.9;
          window.scrollBy(0, scrollAmount);
          return window.scrollY;
        });

        if (currentScroll === previousScroll) break;
        previousScroll = currentScroll;
        index++;
        await page.waitForTimeout(1000);
      }

      // Financials tabs
      try {
        const financialsSection = page.locator('div#financials.clearfix');
        if (await financialsSection.count() > 0 && await financialsSection.isVisible()) {
          const financialsTabs = [
            { label: 'Net Profit', selector: 'a[href="#C-12-ov-net-profit"]', name: 'financials_netprofit' },
            { label: 'Debt to Equity', selector: 'a[href="#C-12-ov-debt-to-equity"]', name: 'financials_debttoequity' },
            { label: 'Quarterly Results', selector: 'label#quarc span.radio_button_text', name: 'financials_quarterly' },
            { label: 'Quarterly Net Profit', selector: 'a[href="#C-3-ov-net-profit"]', name: 'financials_qnetprofit' }
          ];

          for (const tab of financialsTabs) {
            try {
              await page.click(tab.selector, { timeout: 30000 });
              await page.waitForTimeout(2000);
              const tabShot = path.join(moneycontrolDir, `moneycontrol_${tab.name}.png`);
              await page.screenshot({ path: tabShot });
              allScreenshots.push(tabShot);
            } catch (e) {
              console.warn(`Could not capture tab ${tab.label}`);
            }
          }
        }
      } catch (e) {}

      // Shareholding tabs
      try {
        const shareholdingSection = page.locator('div#sharepattern');
        if (await shareholdingSection.count() > 0 && await shareholdingSection.isVisible()) {
          const shareTabs = [
            { label: 'FII', selector: 'a#fii_tb', name: 'shareholding_fii' },
            { label: 'DII', selector: 'a#dii_tb', name: 'shareholding_dii' },
            { label: 'Public', selector: 'a#public_tb', name: 'shareholding_public' },
            { label: 'Others', selector: 'a#others_tb', name: 'shareholding_others' },
          ];

          for (const tab of shareTabs) {
            try {
              await page.click(tab.selector, { timeout: 30000 });
              await page.waitForTimeout(1500);
              const tabShot = path.join(moneycontrolDir, `moneycontrol_${tab.name}.png`);
              await page.screenshot({ path: tabShot });
              allScreenshots.push(tabShot);
            } catch (e) {
              console.warn(`Could not capture tab ${tab.label}`);
            }
          }
        }
      } catch (e) {}
    } catch (err) {
      console.error("Error capturing Moneycontrol overview:", err.message);
      await page.screenshot({ path: path.join(moneycontrolDir, 'error.png') });
    }

    // TradingView - First Account
    try {
      console.log("Capturing TradingView (1st account)");
      const chartUrl = `https://www.tradingview.com/chart/?symbol=${encodeURIComponent(stockSymbol)}`;
      await page.goto(chartUrl, { waitUntil: 'load', timeout: 120000 });
      await page.waitForTimeout(5000);
      
      await configureTradingView(page);
      
      const screenshotPath = path.join(tradingViewDir, 'tradingview_1.png');
      await page.screenshot({ path: screenshotPath });
      allScreenshots.push(screenshotPath);
      console.log("TradingView captured (1st account)");
    } catch (err) {
      console.error("TradingView error (1st):", err.message);
      await page.screenshot({ path: path.join(tradingViewDir, 'error_1.png') });
    }

    // TradingView - Second Account
    try {
      console.log("Capturing TradingView (2nd account)");
      const secondContext = await chromium.launchPersistentContext(PROFILE_PATH_2, {
        headless: false,
        executablePath: CHROME_PATH,
      });

      const secondPage = await secondContext.newPage();
      await secondPage.goto(`https://www.tradingview.com/chart/?symbol=${encodeURIComponent(stockSymbol)}`, {
        waitUntil: 'load',
        timeout: 120000
      });
      await secondPage.waitForTimeout(5000);
      
      await configureTradingView(secondPage);
      
      const screenshotPath2 = path.join(tradingViewDir, 'tradingview_2.png');
      await secondPage.screenshot({ path: screenshotPath2 });
      allScreenshots.push(screenshotPath2);
      console.log("TradingView captured (2nd account)");
      await secondContext.close();
    } catch (err) {
      console.error("TradingView error (2nd):", err.message);
    }

  } finally {
    await browser.close();
  }

  return allScreenshots;
}

module.exports = { takeAllScreenshots };
