const puppeteer = require("puppeteer");
const { MongoClient, ServerApiVersion } = require("mongodb");
require("dotenv").config();

const uri = process.env.DATABASE_URL;

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
  autoSelectFamily: false,
});

const URLS = {
  "https://www.trgovinejager.com/vse-za-zajtrk/": 3,
  "https://www.trgovinejager.com/margarina-mast-ocvirki/": 1,
  "https://www.trgovinejager.com/olje-rastlinsko/": 1,
  "https://www.trgovinejager.com/mlecni-izdelki/": 2,
  "https://www.trgovinejager.com/delikatesni-izdelki-in-pripravljene-jedi/": 1,
  "https://www.trgovinejager.com/prigrizki-in-sladki-program/": 7,
  "https://www.trgovinejager.com/testenine-juhe-riz-in-omake/": 3,
  "https://www.trgovinejager.com/konzervirana-hrana/": 3,
  "https://www.trgovinejager.com/osnovna-zivila-zacimbe-shramba/": 2,
  "https://www.trgovinejager.com/kruh-in-pecivo/": 1,
  "https://www.trgovinejager.com/vse-za-peko/": 1,
  "https://www.trgovinejager.com/brezalkoholne-pijace/": 3,
  "https://www.trgovinejager.com/alkoholne-pijace-pivo-vino-likerji/": 2,
};

async function scrapeJager() {
  const browser = await puppeteer.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });
  const page = await browser.newPage();
  await page.setUserAgent(
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/112.0.0.0 Safari/537.36"
  );

  let products = [];

  for (const [baseUrl, maxPages] of Object.entries(URLS)) {
    console.log(
      `\n➡️  Začenjam z zajemanjem podatkov za kategorijo: ${baseUrl}`
    );

    for (let currentPage = 1; currentPage <= maxPages; currentPage++) {
      const url =
        currentPage === 1 ? baseUrl : `${baseUrl}p${currentPage}.html`;
      console.log(`Zajemam stran ${url}`);

      await gotoWithRetry(page, url);

      const items = await page.evaluate(() => {
        const items = document.querySelectorAll(".itemArtikli .item-box");
        const productList = [];

        items.forEach((item) => {
          const name = item.querySelector(".item-title")?.innerText.trim();
          if (!name) return;

          const image = item.querySelector("img")?.src || "Ni podatka";
          const isDiscounted = !!item.querySelector(".badge-action");

          let regularPrice = null;
          let actionPrice = null;

          if (isDiscounted) {
            const euros = item
              .querySelector(".price")
              ?.childNodes[0]?.textContent.trim();
            const cents = item
              .querySelector(".price .right span")
              ?.innerText.trim();
            const fullPrice = euros && cents ? `${euros}${cents}` : null;

            actionPrice = fullPrice
              ? parseFloat(fullPrice.replace(",", "."))
              : null;

            const originalPriceElement = item.querySelector(".originalPrice");
            regularPrice = originalPriceElement
              ? parseFloat(
                  originalPriceElement.innerText
                    .replace(/[^0-9,\.]/g, "")
                    .replace(",", ".")
                )
              : null;
          } else {
            const priceElement =
              item.querySelector(".price") || item.querySelector(".bottom-box");
            const fullPrice = priceElement
              ? priceElement.innerText
                  .trim()
                  .replace(/[^\d,\.]/g, "")
                  .replace(",", ".")
              : null;
            regularPrice = fullPrice ? parseFloat(fullPrice) : null;
          }

          productList.push({
            name,
            price: regularPrice,
            actionPrice,
            image,
            akcija: isDiscounted,
            category:
              document
                .querySelector("ol.breadcrumb li.active")
                ?.innerText.trim() || "Ni kategorije",
          });
        });

        return productList;
      });

      products = products.concat(items);
      console.log(`Najdenih izdelkov na strani ${url}: ${items.length}`);
    }
  }

  await browser.close();
  return products;
}

async function gotoWithRetry(page, url, retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      console.log(`Poskus ${i + 1}: Odpiram ${url}`);
      await page.goto(url, { waitUntil: "networkidle2", timeout: 120000 });
      console.log(`✅ Uspešno odprta stran: ${url}`);
      return;
    } catch (error) {
      console.log(`❌ Napaka pri odpiranju: ${error.message}`);
      if (i === retries - 1) {
        throw new Error(
          `Neuspešno nalaganje strani po ${retries} poskusih: ${url}`
        );
      }
      console.log("⏳ Ponovni poskus...");
    }
  }
}

// MAIN EXECUTION
(async () => {
  try {
    await client.connect();
    console.log("✅ Povezava z MongoDB vzpostavljena");

    const db = client.db("BestPrice");
    const collection = db.collection("jagerproducts");

    const items = await scrapeJager();
    let savedCount = 0;

    const normalizePrice = (val) => {
      if (!val || val === "Ni podatka") return null;
      return val.toString().replace(",", ".").trim();
    };

    for (const item of items) {
      const price = normalizePrice(item.price);
      const actionPrice = normalizePrice(item.actionPrice);
      const currentPrice = actionPrice ?? price;

      const existing = await collection.findOne({ name: item.name });
      const lastStoredPrice =
        existing?.previousPrices?.length > 0
          ? normalizePrice(
              existing.previousPrices[existing.previousPrices.length - 1].price
            )
          : null;

      const shouldAddToHistory =
        currentPrice !== null && currentPrice !== lastStoredPrice;

      if (!existing) {
        const doc = {
          name: item.name,
          price,
          actionPrice,
          image: item.image,
          akcija: item.akcija ? "true" : "false",
          category: item.category,
          previousPrices: shouldAddToHistory
            ? [{ price: currentPrice, date: new Date() }]
            : [],
          updatedAt: new Date(),
        };
        await collection.insertOne(doc);
        savedCount++;
      } else {
        const updateDoc = {
          $set: {
            price,
            actionPrice,
            akcija: item.akcija ? "true" : "false",
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

        await collection.updateOne({ name: item.name }, updateDoc);
        savedCount++;
      }
    }

    console.log(`✅ Shranjenih ali posodobljenih izdelkov: ${savedCount}`);
    await client.close();
    process.exit(0);
  } catch (err) {
    console.error("❌ Napaka:", err.message);
    await client.close();
    process.exit(1);
  }
})();
