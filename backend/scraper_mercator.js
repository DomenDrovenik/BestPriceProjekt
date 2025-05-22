const puppeteer = require("puppeteer");
const { MongoClient, ServerApiVersion } = require("mongodb");

const uri =
  "mongodb+srv://ddfaksstuff:Kcau2hakePYZ1hRH@cluster0.bwlvpsm.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0";
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
  autoSelectFamily: false,
});

const urls = [
  "https://mercatoronline.si/brskaj#categories=14535405",
  "https://mercatoronline.si/brskaj#categories=14535446",
  "https://mercatoronline.si/brskaj#categories=14535463",
  "https://mercatoronline.si/brskaj#categories=14535481",
  "https://mercatoronline.si/brskaj#categories=14535512",
  "https://mercatoronline.si/brskaj#categories=14535548",
  "https://mercatoronline.si/brskaj#categories=14535588",
  "https://mercatoronline.si/brskaj#categories=14535612",
  "https://mercatoronline.si/brskaj#categories=14535661",
  "https://mercatoronline.si/brskaj#categories=14535681",
  "https://mercatoronline.si/brskaj#categories=14535711",
  "https://mercatoronline.si/brskaj#categories=14535736",
  "https://mercatoronline.si/brskaj#categories=14535749",
  "https://mercatoronline.si/brskaj#categories=14535803",
  "https://mercatoronline.si/brskaj#categories=14535810",
];

const scrapeMercator = async () => {
  console.log(`🛒 Začenjam zajem podatkov iz Mercator...`);

  const browser = await puppeteer.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });
  const pages = await Promise.all(urls.map(() => browser.newPage()));
  let allProducts = [];

  console.log(`🔎 Odpiram strani...`);
  await Promise.all(
    pages.map((page, index) =>
      page.goto(urls[index], { waitUntil: "domcontentloaded", timeout: 60000 })
    )
  );

  console.log(`🔄 Skrolam po straneh za nalaganje izdelkov...`);
  await Promise.all(pages.map((page) => autoScroll(page)));

  console.log(`📦 Zajemam podatke s posameznih strani...`);
  const allResults = await Promise.all(
    pages.map((page) =>
      page.evaluate(() => {
        const items = document.querySelectorAll(".box.item.product");
        const data = [];

        items.forEach((item) => {
          const name = item
            .querySelector(".product-name a")
            ?.getAttribute("title")
            ?.trim();
          if (!name) return;

          const priceText =
            item
              .querySelector(".lib-product-price")
              ?.innerText.trim()
              .replace(" €", "") || null;

          const oldPriceText =
            item
              .querySelector(".price-old.lib-product-normal-price")
              ?.innerText.trim()
              .replace(" €", "") || null;

          const image =
            item.querySelector(".product-image img")?.src || "Ni slike";

          const analyticsData = item.getAttribute("data-analytics-object");
          let categoryInfo = "";
          if (analyticsData) {
            try {
              const parsedData = JSON.parse(analyticsData);
              categoryInfo = parsedData.item_category || "Ni kategorije";
            } catch {
              categoryInfo = "Napaka pri branju kategorije";
            }
          }

          data.push({
            name,
            price: priceText,
            actionPrice: oldPriceText ? priceText : null,
            regularPrice: oldPriceText,
            image,
            category: categoryInfo,
          });
        });

        return data;
      })
    )
  );

  allProducts = allResults.flat();
  console.log(`\n📝 Skupno število najdenih izdelkov: ${allProducts.length}`);
  await browser.close();
  return allProducts;
};

async function autoScroll(page) {
  await page.evaluate(async () => {
    await new Promise((resolve) => {
      let totalHeight = 0;
      const distance = 100;
      const timer = setInterval(() => {
        const scrollHeight = document.body.scrollHeight;
        window.scrollBy(0, distance);
        totalHeight += distance;

        if (totalHeight >= scrollHeight) {
          clearInterval(timer);
          resolve();
        }
      }, 100);
    });
  });
}

// === SHRANJEVANJE V BAZO ===
(async () => {
  try {
    await client.connect();
    console.log("✅ Povezava z MongoDB uspešna");

    const db = client.db("BestPrice");
    const collection = db.collection("mercatorproducts");

    const items = await scrapeMercator();
    let savedCount = 0;

    const parsePrice = (value) => {
      if (!value || value === "Ni cene") return null;
      return value.replace(",", ".").trim();
    };

    for (const item of items) {
      const filter = { name: item.name };
      const existing = await collection.findOne(filter);

      const price = parsePrice(item.regularPrice) ?? parsePrice(item.price);
      const actionPrice = item.regularPrice ? parsePrice(item.price) : null;
      const currentPrice = actionPrice ?? price;

      const lastStoredPrice =
        existing?.previousPrices?.length > 0
          ? existing.previousPrices[existing.previousPrices.length - 1].price
          : null;

      const shouldAddToHistory =
        currentPrice !== null && currentPrice !== lastStoredPrice;

      if (!existing) {
        const newDoc = {
          name: item.name,
          price,
          actionPrice,
          image: item.image,
          category: item.category,
          previousPrices: shouldAddToHistory
            ? [{ price: currentPrice, date: new Date() }]
            : [],
          updatedAt: new Date(),
        };
        await collection.insertOne(newDoc);
        savedCount++;
      } else {
        const updateDoc = {
          $set: {
            price,
            actionPrice,
            image: item.image,
            category: item.category,
            updatedAt: new Date(),
          },
        };

        if (shouldAddToHistory) {
          updateDoc.$push = {
            previousPrices: { price: currentPrice, date: new Date() },
          };
        }

        await collection.updateOne(filter, updateDoc);
        savedCount++;
      }
    }

    console.log(`✅ Shranjenih ali posodobljenih izdelkov: ${savedCount}`);
    await client.close();
    process.exit(0);
  } catch (err) {
    console.error("❌ Napaka pri shranjevanju:", err.message);
    await client.close();
    process.exit(1);
  }
})();
