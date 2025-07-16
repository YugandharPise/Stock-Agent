const fs = require('fs');
const path = require('path');
const dayjs = require('dayjs');
const { chromium } = require('playwright');

const BASE_DIR = path.join(__dirname, 'screenshots');
const PROFILE_PATH = path.join(__dirname, 'playwright-session');
const PROFILE_PATH_2 = path.join(__dirname, 'playwright-session-2');
const CHROME_PATH = 'C:/Program Files/Google/Chrome/Application/chrome.exe';

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
    const toggleSidebar = page.locator('button[aria-label="Watchlist, details and news"]');
    await toggleSidebar.waitFor({ timeout: 5000 });

    const isSidebarOpen = await toggleSidebar.getAttribute('aria-pressed');
    if (isSidebarOpen === 'true') {
      await toggleSidebar.click();
      console.log('Sidebar was open, now closed.');
    } else {
      console.log('Sidebar already closed.');
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
        timeout: 30000
      });
      await page.waitForTimeout(2000);

      console.log(`Searching for ${stockName}`);
      await page.fill('input.report_search_input', stockName, { timeout: 10000 });
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
      await page.goto('https://www.moneycontrol.com/', { waitUntil: 'load', timeout: 60000 });

      // Fill the search box directly in one go
      await page.type('#search_str', stockName, { delay : 150 });
      console.log(`Entered stock name "${stockName}" in search box.`);

      // Wait 1 seconds for the autosuggest list to appear and stabilize
      await page.waitForTimeout(1000);

      const firstResult = page.locator('.suglist.scrollBar a').first();

      // Wait for the first result to be visible (extra safety)
      await firstResult.waitFor({ timeout: 10000 });

      await Promise.all([
        page.waitForNavigation({ waitUntil: 'load', timeout: 180000 }),
        firstResult.click({ timeout: 30000, noWaitAfter: false }),
      ]);

      await page.waitForTimeout(3000);
      console.log("Selected topmost result for stock.");

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
      
      await page.waitForTimeout(5000);
      // Financials tabs
      try {
        const financialsSection = page.locator('div#financials.clearfix');
        if (await financialsSection.count() > 0 && await financialsSection.isVisible()) {
          const financialsTabs = [
            {
              label: 'Net Profit',
              alternatives: ['#S-12-ov-net-profit', '#C-12-ov-net-profit'],
              name: 'financials_netprofit'
            },
            {
              label: 'Debt to Equity',
              alternatives: ['#S-12-ov-debt-to-equity', '#C-12-ov-debt-to-equity'],
              name: 'financials_debttoequity'
            },
            {
              label: 'Quarterly Results',
              selector: 'label#quar span.radio_button_text',
              name: 'financials_quarterly'
            },
            {
              label: 'Quarterly Net Profit',
              alternatives: ['#S-3-ov-net-profit', '#C-3-ov-net-profit'],
              name: 'financials_qnetprofit'
            }
          ];

          for (const tab of financialsTabs) {
            try {
              console.log(`Trying to capture: ${tab.label}`);
              let tabElement;

              if (tab.alternatives) {
                for (const href of tab.alternatives) {
                  const sel = `a[href^="${href}"]`;
                  const locator = page.locator(sel);
                  if (await locator.count() > 0 && await locator.isVisible()) {
                    tabElement = locator;
                    console.log(`Using selector ${sel} for ${tab.label}`);
                    break;
                  } else {
                    console.log(`Selector ${sel} found but not visible, trying next.`);
                  }
                }
                if (!tabElement) throw new Error(`No visible selector found for ${tab.label}`);
              } else {
                tabElement = page.locator(tab.selector);
                if (!(await tabElement.isVisible())) {
                  throw new Error(`Selector for ${tab.label} not visible`);
                }
              }

              await tabElement.waitFor({ timeout: 8000 });
              await tabElement.scrollIntoViewIfNeeded();
              await tabElement.click({ timeout: 5000 });
              await page.waitForTimeout(3000);

              const tabShot = path.join(moneycontrolDir, `moneycontrol_${tab.name}.png`);
              await page.screenshot({ path: tabShot });
              allScreenshots.push(tabShot);
              console.log(`Captured: ${tab.label}`);
            } catch (e) {
              console.warn(`Could not capture tab ${tab.label}: ${e.message}`);
            }
          }
        } else {
          console.log("Financials section missing for this stock.");
        }
      } catch (e) {
        console.warn("Error in Financials block: ", e.message);
      }

      // Shareholding tabs
      try {
        const shareholdingSection = page.locator('div#sharepattern');
        if (await shareholdingSection.count() > 0 && await shareholdingSection.isVisible()) {
          const shareTabs = [
            { label: 'FII', selector: 'a#fii_tb', name: 'shareholding_fii' },
            { label: 'DII', selector: 'a#dii_tb', name: 'shareholding_dii' },
            { label: 'Public', selector: 'a#public_tb', name: 'shareholding_public' },
            { label: 'Others', selector: 'a#others_tb', name: 'shareholding_others' }
          ];

          for (const tab of shareTabs) {
            try {
              const tabElement = page.locator(tab.selector);
              await tabElement.waitFor({ timeout: 8000 });
              await tabElement.scrollIntoViewIfNeeded();
              await tabElement.click({ timeout: 5000 });
              await page.waitForTimeout(2000);

              const tabShot = path.join(moneycontrolDir, `moneycontrol_${tab.name}.png`);
              await page.screenshot({ path: tabShot });
              allScreenshots.push(tabShot);
              console.log(`Captured: ${tab.label}`);
            } catch (e) {
              console.warn(`Could not capture shareholding tab ${tab.label}: ${e.message}`);
            }
          }
        } else {
          console.log("Shareholding section missing for this stock.");
        }
      } catch (e) {
        console.warn("Error in Shareholding block: ", e.message);
      }
    } catch (err) {
      console.error("Error capturing Moneycontrol overview:", err.message);
      await page.screenshot({ path: path.join(moneycontrolDir, 'error.png') });
    }

    // TradingView - First Account
    try {
      console.log("Capturing TradingView (1st account)");
      const chartUrl = `https://www.tradingview.com/chart/?symbol=${encodeURIComponent(stockSymbol)}`;
      await page.goto(chartUrl, { waitUntil: 'load', timeout: 120000 });
      await page.waitForTimeout(10000);
      
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
      await secondPage.waitForTimeout(10000);
      
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
