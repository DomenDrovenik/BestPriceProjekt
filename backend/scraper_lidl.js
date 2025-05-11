//npm install playwright

const { chromium } = require('playwright');
const fs = require('fs');
const { getCollection, close } = require('./db');

(async () => {
  const coll = await getCollection('lidl');

  const browser = await chromium.launch({
    headless: true,
    args: ['--disable-blink-features=AutomationControlled']
  });

  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) ' +
               'AppleWebKit/537.36 (KHTML, like Gecko) ' +
               'Chrome/115.0.5790.170 Safari/537.36',
    viewport: { width: 1280, height: 800 }
  });

  const page = await context.newPage();
  page.setDefaultNavigationTimeout(0);

  await page.goto('https://www.lidl.si/', { timeout: 0, waitUntil: 'domcontentloaded' });
  const acceptBtn = await page.$('#onetrust-accept-btn-handler');
  if (acceptBtn) {
    await acceptBtn.click();
    await page.waitForTimeout(500);
  }
  await page.evaluate(() => {
    const modal = document.getElementById('onetrust-consent-sdk');
    if (modal) modal.style.display = 'none';
  });

  // Navigacija do "Tvoja Lidl cena"
  await page.waitForSelector('a:has-text("Tvoja Lidl cena")', { visible: true });
  await page.click('a:has-text("Tvoja Lidl cena")');
  await page.waitForLoadState('domcontentloaded');

  // Scrollanje
  await page.evaluate(async () => {
    const delay = ms => new Promise(r => setTimeout(r, ms));
    let prevHeight = 0;
    while (true) {
      window.scrollBy(0, window.innerHeight);
      await delay(1000);
      const newHeight = document.body.scrollHeight;
      if (newHeight === prevHeight) break;
      prevHeight = newHeight;
    }
  });

  // Pridobivanje podatkov
  await page.waitForSelector('.odsc-tile', { visible: true });
  const izdelki = await page.$$eval('.odsc-tile', tiles =>
    tiles.map(el => ({
      naziv: el.querySelector('.product-grid-box__title')?.innerText.trim() || null,
      cena:  el.querySelector('.ods-price__value')?.innerText.trim()   || null,
      original_cena: el.querySelector('.ods-price__stroke-price')?.innerText.trim() || null,
      dostopno: el.querySelector('.ods-badge__label')?.innerText.trim() || null,
      opombe: el.querySelector('.ods-price__box-content-wrapper')?.innerText.trim() || null,
      image: el.querySelector('img')?.src || null
    })).filter(p => p.naziv && p.cena)
  );

  console.log(`Najdenih izdelkov: ${izdelki.length}`);
  if (izdelki.length > 0) {
    await coll.insertMany(izdelki);
    console.log('Vnešeno v MongoDB kolekcijo lidl');
  }

  // Cleanup
  await browser.close();
  await close();
})();
