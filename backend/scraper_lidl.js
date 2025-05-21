const { chromium } = require("playwright");
const fs = require("fs");
const { MongoClient, ServerApiVersion } = require("mongodb");
const { getCollection, close } = require("./db"); // assumes your helper is in db.js

// Helper to normalize price strings (e.g., "1,29 €" -> 1.29)
function parsePrice(priceStr) {
  if (!priceStr) return null;
  let cleaned = priceStr.replace(/[^\d,\.]/g, "");
  if (cleaned.indexOf(",") > -1 && cleaned.indexOf(".") === -1) {
    cleaned = cleaned.replace(",", ".");
  }
  return parseFloat(cleaned);
}

(async () => {
  // 0) Get MongoDB collection
  const collection = await getCollection("lidl");

  // 1) Launch browser
  const browser = await chromium.launch({
    headless: true,
    args: ["--disable-blink-features=AutomationControlled"],
  });
  const ctx = await browser.newContext({
    userAgent:
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) " +
      "AppleWebKit/537.36 (KHTML, like Gecko) " +
      "Chrome/115.0.5790.170 Safari/537.36",
    viewport: { width: 1280, height: 800 },
  });
  const page = await ctx.newPage();
  page.setDefaultNavigationTimeout(0);

  // 2) Accept cookies and remove overlays
  await page.goto("https://www.lidl.si/", { waitUntil: "domcontentloaded" });
  const accept = await page.$("#onetrust-accept-btn-handler");
  if (accept) {
    await accept.click({ force: true });
    await page.waitForTimeout(500);
  }
  await page.evaluate(() => {
    document
      .querySelectorAll(
        "#onetrust-consent-sdk, .ot-pc-dark-filter, .ot-sdk-overlay"
      )
      .forEach((el) => el.remove());
  });

  // 3) Navigate to "Hrana in pijača"
  await page.waitForSelector("div.ux-base-slider", { visible: true });
  let found = false;
  for (let i = 0; i < 15; i++) {
    const link = await page.$(
      'a.ACategoryOverviewSlider__Link:has-text("Hrana in pijača")'
    );
    if (link) {
      await link.click({ force: true });
      found = true;
      break;
    }
    const next = page.locator(
      'div.ux-base-slider button[aria-label="Arrow pointing right"]:not([disabled])'
    );
    if (await next.count()) {
      await next.first().click({ force: true });
      await page.waitForTimeout(400);
    } else break;
  }
  if (!found) throw new Error("Ne morem najti “Hrana in pijača” v sliderju");
  await page.waitForLoadState("domcontentloaded");

  // 4) Wait for filter carousel
  await page.waitForSelector("ul.ods-carousel__track", { visible: true });
  const filters = await page.$$eval(
    "ul.ods-carousel__track li.ods-carousel__track-item span.odsc-link-action__element",
    (els) => els.map((el) => el.innerText.trim()).filter((t) => t)
  );

  for (const title of filters) {
    console.log(`Scraping category: ${title}`);
    await page.click(`span.odsc-link-action__element:has-text("${title}")`, {
      force: true,
    });
    await page.waitForTimeout(1000);

    const loadMoreBtn = page
      .locator('div.s-load-more button:has-text("Naloži več izdelkov")')
      .first();
    if ((await loadMoreBtn.count()) > 0) {
      while (await loadMoreBtn.isVisible()) {
        console.log("Klikam “Naloži več izdelkov” …");
        await loadMoreBtn.scrollIntoViewIfNeeded();
        await page.waitForTimeout(200);
        await loadMoreBtn.click({ force: true });
        await page.waitForTimeout(800);
      }
    } else {
      console.log("Ni gumba “Naloži več izdelkov”, preskakujem klikanje.");
    }

    const items = await page.$$eval(".odsc-tile", (tiles) =>
      tiles
        .map((el) => ({
          name:
            el.querySelector(".product-grid-box__title")?.innerText.trim() ||
            null,
          actionPrice:
            el.querySelector(".ods-price__value")?.innerText.trim() || null,
          price:
            el.querySelector(".ods-price__stroke-price")?.innerText.trim() ||
            el.querySelector(".ods-price__value")?.innerText.trim() ||
            null,
          dostopno:
            el.querySelector(".ods-badge__label")?.innerText.trim() || null,
          opombe:
            el
              .querySelector(".ods-price__box-content-wrapper")
              ?.innerText.trim() || null,
          image: el.querySelector("img")?.src || null,
        }))
        .filter((p) => p.name && p.price)
    );
    for (const item of items) {
      item.category = title;
      const newPrice = parsePrice(item.price);
      const actionP = item.actionPrice ? parsePrice(item.actionPrice) : null;

      const filter = { name: item.name };
      const existing = await collection.findOne(filter);
      if (!existing) {
        // pick initial price for history
        const initial = actionP != null ? actionP : newPrice;

        await collection.insertOne({
          name: item.name,
          price: newPrice,
          actionPrice: actionP,
          previousPrices: [{ price: initial, date: new Date() }],
          dostopno: item.dostopno,
          opombe: item.opombe,
          image: item.image,
          category: item.category,
          updatedAt: new Date(),
        });
      } else if (existing.price !== newPrice) {
        await collection.updateOne(filter, {
          $push: {
            previousPrices: { price: existing.price, date: existing.updatedAt },
          },
          $set: { price: newPrice, updatedAt: new Date() },
        });
      }
    }

    await page.click(`button.ods-chip--active`, { force: true });
    await page.waitForTimeout(300);
  }

  console.log("Scraping complete.");
  await browser.close();
  await close();
})();
