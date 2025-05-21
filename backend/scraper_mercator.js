const puppeteer = require("puppeteer");
const mongoose = require("mongoose");

// MongoDB povezava
const MONGO_URI =
  "mongodb+srv://anja:anja@cluster0.bwlvpsm.mongodb.net/BestPrice?retryWrites=true&w=majority&appName=cluster0";
mongoose
  .connect(MONGO_URI)
  .then(() => console.log("✅ Povezava z MongoDB uspešna"))
  .catch((err) =>
    console.error("❌ Napaka pri povezavi z MongoDB:", err.message)
  );

// MongoDB shema
const mercatorSchema = new mongoose.Schema({
  name: String,
  price: String, // navadna cena
  actionPrice: String, // akcijska cena, če obstaja
  image: String,
  category: String,
  previousPrices: [
    {
      price: String,
      date: Date,
    },
  ],
  updatedAt: Date,
});

const MercatorProduct = mongoose.model(
  "MercatorProduct",
  mercatorSchema,
  "mercatorproducts"
);

// URL-ji kategorij
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
    pages.map((page, index) => {
      console.log(`➡️  Odpiram: ${urls[index]}`);
      return page.goto(urls[index], {
        waitUntil: "domcontentloaded",
        timeout: 60000,
      });
    })
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
    const items = await scrapeMercator();
    let savedCount = 0;

    const parsePrice = (value) => {
      if (!value || value === "Ni cene") return null;
      return value.replace(",", ".").trim(); // vrne string z . namesto ,
    };

    for (const item of items) {
      const filter = { name: item.name };
      const existing = await MercatorProduct.findOne(filter);

      const price = parsePrice(item.regularPrice) ?? parsePrice(item.price); // navadna cena kot string
      const actionPrice = item.regularPrice ? parsePrice(item.price) : null; // akcijska cena kot string
      const currentPrice = actionPrice ?? price;

      const lastStoredPrice =
        existing?.previousPrices?.length > 0
          ? existing.previousPrices[existing.previousPrices.length - 1].price
          : null;

      const shouldAddToHistory =
        currentPrice !== null && currentPrice !== lastStoredPrice;

      if (!existing) {
        const newDoc = new MercatorProduct({
          name: item.name,
          price,
          actionPrice,
          image: item.image,
          category: item.category,
          previousPrices: shouldAddToHistory
            ? [{ price: currentPrice, date: new Date() }]
            : [],
          updatedAt: new Date(),
        });
        await newDoc.save();
        savedCount++;
      } else {
        const changed =
          existing.price !== price ||
          existing.actionPrice !== actionPrice ||
          existing.image !== item.image ||
          existing.category !== item.category;

        if (shouldAddToHistory) {
          existing.previousPrices.push({
            price: currentPrice,
            date: new Date(),
          });
        }

        if (changed || shouldAddToHistory) {
          existing.price = price;
          existing.actionPrice = actionPrice;
          existing.image = item.image;
          existing.category = item.category;
          existing.updatedAt = new Date();
          await existing.save();
          savedCount++;
        } else {
          existing.updatedAt = new Date();
          await existing.save();
        }
      }
    }

    console.log(`✅ Shranjenih ali posodobljenih izdelkov: ${savedCount}`);
    process.exit(0);
  } catch (err) {
    console.error("❌ Napaka pri shranjevanju:", err.message);
    process.exit(1);
  }
})();
