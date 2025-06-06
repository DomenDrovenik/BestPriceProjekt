const puppeteer = require("puppeteer");
const { MongoClient, ServerApiVersion } = require("mongodb");
require("dotenv").config();

async function ScrapeTus() {
  const browser = await puppeteer.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });
  const page = await browser.newPage();
  const results = [];

  const categories = [
    {
      url: "https://www.tuscc.si/katalog/trajna-zivila",
      category: "Trajna Živila",
    },
    {
      url: "https://www.tuscc.si/katalog/zamrznjena-zivila",
      category: "Zamrznjena Živila",
    },
    {
      url: "https://www.tuscc.si/katalog/sveza-%C5%BEivila",
      category: "Sveža Živila",
    },
    { url: "https://www.tuscc.si/katalog/bio-zivila", category: "Bio Živila" },
    {
      url: "https://www.tuscc.si/katalog/brezalkoholne-pijace",
      category: "Brezalkoholne Pijače",
    },
    {
      url: "https://www.tuscc.si/katalog/alkoholne-pijace",
      category: "Alkoholne Pijače",
    },
  ];

  for (const { url, category } of categories) {
    await page.goto(url, { waitUntil: "networkidle2" });
    await page.waitForSelector(".sub-cat");

    const subcatCount = await page.$$eval(".sub-cat", (els) => els.length);

    for (let i = 0; i < subcatCount; i++) {
      const subcategory = await page.$eval(
        `.sub-cat:nth-child(${i + 1}) h3`,
        (el) => el.innerText.trim()
      );

      await Promise.all([
        page.evaluate((index) => {
          const el = document.querySelectorAll(".sub-cat")[index];
          el.click();
        }, i),
        page
          .waitForSelector(".defaultGrid", { timeout: 10000 })
          .catch(() => null),
      ]);

      let hasProducts = true;
      let pageIndex = 0;

      while (hasProducts) {
        const urlObj = new URL(page.url());
        urlObj.searchParams.set("s", pageIndex.toString());
        const currentPageUrl = urlObj.toString();

        console.log(`Zajemam podatke s strani: ${currentPageUrl}`);

        await page.goto(currentPageUrl, { waitUntil: "networkidle2" });

        const items = await page.$$eval("a.product-list-item", (elements) =>
          elements.map((el) => {
            const priceElements = el.querySelectorAll("div.priceWithVat");
            let regularPrice = "";
            let actionPrice = null;

            if (priceElements.length > 1) {
              regularPrice =
                priceElements[0]?.innerText
                  .trim()
                  .match(/[\d,.]+/)?.[0]
                  ?.replace(",", ".") || "";
              actionPrice =
                priceElements[1]?.innerText
                  .trim()
                  .match(/[\d,.]+/)?.[0]
                  ?.replace(",", ".") || null;
            } else if (priceElements.length === 1) {
              regularPrice =
                priceElements[0]?.innerText
                  .trim()
                  .match(/[\d,.]+/)?.[0]
                  ?.replace(",", ".") || "";
            }

            return {
              name: el.querySelector("h3")?.innerText.trim() || "",
              price: regularPrice,
              actionPrice,
              image: el.querySelector("img")?.getAttribute("src"),
            };
          })
        );

        if (items.length === 0) {
          console.log(`Ni več izdelkov na strani ${currentPageUrl}`);
          hasProducts = false;
        } else {
          for (const item of items) {
            results.push({
              category,
              subcategory,
              ...item,
            });
          }

          console.log(
            `Najdenih izdelkov na strani ${currentPageUrl}: ${items.length}`
          );
          pageIndex += 25;
        }
      }

      await page.goto(url, { waitUntil: "networkidle2" });
      await page.waitForSelector(".sub-cat");
    }
  }

  await browser.close();
  return results;
}

//--------------------------------------------------------------------

async function runTusScraper() {
  const uri = process.env.DATABASE_URL;

  const client = new MongoClient(uri, {
    serverApi: {
      version: ServerApiVersion.v1,
      strict: true,
      deprecationErrors: true,
    },
    autoSelectFamily: false,
  });

  try {
    await client.connect();
    const db = client.db(process.env.DB_NAME);
    const collection = db.collection("tus");

    const scrapedItems = await ScrapeTus();
    const now = new Date();

    const scrapedDocs = scrapedItems.map((item) => {
      return { name: item.name, image: item.image };
    });

    for (const item of scrapedItems) {
      const existing = await collection.findOne({
        name: item.name,
        image: item.image,
      });

      let changed = false;
      const previousPrices = existing?.previousPrices || [];
      const lastEntry = previousPrices.at(-1);

      const hasAction =
        item.actionPrice !== null && item.actionPrice !== undefined;
      const prevHadAction =
        existing?.actionPrice !== null && existing?.actionPrice !== undefined;

      const updates = {
        price: item.price,
        active: true,
      };

      // --- Handle action price ---
      if (hasAction) {
        if (!lastEntry || lastEntry.price !== item.actionPrice) {
          previousPrices.push({
            price: item.actionPrice,
            date: now,
          });
          console.log(
            `🏷️ Nova akcijska cena za "${item.name}": ${item.actionPrice}`
          );
          changed = true;
        }
        updates.actionPrice = item.actionPrice;
      } else {
        if (prevHadAction) {
          updates.$unset = { actionPrice: "" };
          console.log(`❌ Akcija odstranjena za "${item.name}"`);
          changed = true;

          if (!lastEntry || lastEntry.price !== item.price) {
            previousPrices.push({
              price: item.price,
              date: now,
            });
            console.log(
              `💰 Ponovno nastavljena redna cena za "${item.name}": ${item.price}`
            );
          }
        } else {
          if (!lastEntry || lastEntry.price !== item.price) {
            previousPrices.push({
              price: item.price,
              date: now,
            });
            console.log(`💰 Nova redna cena za "${item.name}": ${item.price}`);
            changed = true;
          }
        }
      }

      updates.previousPrices = previousPrices;

      if (!existing) {
        await collection.insertOne({
          ...item,
          previousPrices,
          updatedAt: now,
          active: true,
        });
        console.log(`🆕 Nov izdelek dodan: "${item.name}"`);
        continue;
      }

      if (changed) {
        updates.updatedAt = now;

        const updateOps = {};
        if (updates.$unset) updateOps.$unset = updates.$unset;

        updateOps.$set = {
          price: updates.price,
          previousPrices: updates.previousPrices,
          active: true,
          updatedAt: updates.updatedAt,
        };

        if (updates.actionPrice) {
          updateOps.$set.actionPrice = updates.actionPrice;
        }

        await collection.updateOne({ _id: existing._id }, updateOps);
      } else {
        await collection.updateOne(
          { _id: existing._id },
          { $set: { active: true } }
        );
      }
    }

    await collection.updateMany(
      { $nor: scrapedDocs },
      { $set: { active: false } }
    );

    console.log("✅ Scraper končan.");
  } catch (err) {
    console.error("❌ Napaka:", err);
  } finally {
    await client.close();
  }
}

runTusScraper();

module.exports = runTusScraper;
