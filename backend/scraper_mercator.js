const puppeteer = require('puppeteer');
const mongoose = require('mongoose');

// MongoDB povezava
const MONGO_URI = 'mongodb+srv://anja:anja@cluster0.bwlvpsm.mongodb.net/BestPrice';
mongoose.connect(MONGO_URI)
  .then(() => console.log('✅ Povezava z MongoDB uspešna'))
  .catch((err) => console.error('❌ Napaka pri povezavi z MongoDB:', err.message));

// MongoDB shema
const mercatorSchema = new mongoose.Schema({
  name: String,
  price: Number,
  regularPrice: Number,
  image: String,
  category: String,
  previousPrices: [
    {
      price: Number,
      date: Date
    }
  ],
  updatedAt: Date
});

const MercatorProduct = mongoose.model('MercatorProduct', mercatorSchema, 'mercatorproducts');

// URL-ji kategorij
const urls = [
  'https://mercatoronline.si/brskaj#categories=14535405',
  'https://mercatoronline.si/brskaj#categories=14535446',
  'https://mercatoronline.si/brskaj#categories=14535463',
  'https://mercatoronline.si/brskaj#categories=14535481',
  'https://mercatoronline.si/brskaj#categories=14535512',
  'https://mercatoronline.si/brskaj#categories=14535548',
  'https://mercatoronline.si/brskaj#categories=14535588',
  'https://mercatoronline.si/brskaj#categories=14535612',
  'https://mercatoronline.si/brskaj#categories=14535661',
  'https://mercatoronline.si/brskaj#categories=14535681',
  'https://mercatoronline.si/brskaj#categories=14535711',
  'https://mercatoronline.si/brskaj#categories=14535736',
  'https://mercatoronline.si/brskaj#categories=14535749',
  'https://mercatoronline.si/brskaj#categories=14535803',
  'https://mercatoronline.si/brskaj#categories=14535810'
];

const scrapeMercator = async () => {
  console.log(`🛒 Začenjam zajem podatkov iz Mercator...`);

  const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox'] });
  const pages = await Promise.all(urls.map(() => browser.newPage()));
  let allProducts = [];

  console.log(`🔎 Odpiram strani...`);
  await Promise.all(
    pages.map((page, index) => {
      console.log(`➡️  Odpiram: ${urls[index]}`);
      return page.goto(urls[index], { waitUntil: 'domcontentloaded', timeout: 60000 });
    })
  );

  console.log(`🔄 Skrolam po straneh za nalaganje izdelkov...`);
  await Promise.all(pages.map(page => autoScroll(page)));

  console.log(`📦 Zajemam podatke s posameznih strani...`);
  const allResults = await Promise.all(
    pages.map(page =>
      page.evaluate(() => {
        const items = document.querySelectorAll('.box.item.product');
        const data = [];

        items.forEach((item) => {
          const name = item.querySelector('.product-name a')?.getAttribute('title')?.trim();
          if (!name) return;

          const price = item.querySelector('.lib-product-price')?.innerText.trim().replace(' €', '') || 'Ni cene';
          const image = item.querySelector('.product-image img')?.src || 'Ni slike';
          const analyticsData = item.getAttribute('data-analytics-object');

          let categoryInfo = '';
          if (analyticsData) {
            try {
              const parsedData = JSON.parse(analyticsData);
              categoryInfo = parsedData.item_category || 'Ni kategorije';
            } catch (e) {
              categoryInfo = 'Napaka pri branju kategorije';
            }
          }

          const regularPrice = item.querySelector('.price-old.lib-product-normal-price')?.innerText.trim().replace(' €', '') || null;
          const actionPrice = regularPrice ? price : null;

          data.push({
            name,
            price: actionPrice || price,
            regularPrice,
            image,
            category: categoryInfo
          });
        });

        return data;
      })
    )
  );

  allProducts = allResults.flat();
  console.log(`\n📝 Skupno število najdenih izdelkov: ${allProducts.length}`);
  await browser.close();
  console.log(`🚀 Podatki uspešno zajeti!`);
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
      if (!value || value === 'Ni cene') return null;
      return parseFloat(value.replace(',', '.').trim());
    };

    for (const item of items) {
      const filter = { name: item.name };
      const existing = await MercatorProduct.findOne(filter);

      const newPrice = parsePrice(item.price);
      const regularP = parsePrice(item.regularPrice);

      if (!existing) {
        const newDoc = new MercatorProduct({
          name: item.name,
          price: newPrice,
          regularPrice: regularP,
          image: item.image,
          category: item.category,
          previousPrices: [{ price: newPrice, date: new Date() }],
          updatedAt: new Date()
        });
        await newDoc.save();
        savedCount++;
      } else {
        const wasInAkcija = existing.regularPrice !== null;
        const isNowInAkcija = regularP !== null;
        const priceChanged = existing.price !== newPrice;
        const akcijaEnded = wasInAkcija && !isNowInAkcija;

        if (priceChanged || akcijaEnded) {
          existing.previousPrices.push({
            price: existing.price,
            date: new Date()
          });

          existing.price = newPrice;
          existing.regularPrice = regularP;
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
    console.error('❌ Napaka pri shranjevanju:', err.message);
    process.exit(1);
  }
})();