const puppeteer = require('puppeteer');
const mongoose = require('mongoose');

// MongoDB povezava
const MONGO_URI = 'mongodb+srv://anja:anja@cluster0.bwlvpsm.mongodb.net/BestPrice';
mongoose.connect(MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
}).then(() => {
    console.log('✅ Povezava z MongoDB uspešna');
}).catch((error) => {
    console.error('❌ Napaka pri povezavi z MongoDB:', error.message);
});

// Mongoose shema
const productSchema = new mongoose.Schema({
  name: String,
  price: Number,
  originalPrice: Number,
  image: String,
  akcija: String,
  category: String,
  previousPrices: [
    {
      price: Number,
      date: Date
    }
  ],
  updatedAt: Date
});

const JagerProduct = mongoose.model('JagerProduct', productSchema);

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
  "https://www.trgovinejager.com/alkoholne-pijace-pivo-vino-likerji/": 2
};

const scrapeJager = async () => {
  const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox'] });
  const page = await browser.newPage();
  await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/112.0.0.0 Safari/537.36');

  let products = [];

  for (const [baseUrl, maxPages] of Object.entries(URLS)) {
    console.log(`\n➡️  Začenjam z zajemanjem podatkov za kategorijo: ${baseUrl}`);

    for (let currentPage = 1; currentPage <= maxPages; currentPage++) {
      const url = currentPage === 1 ? baseUrl : `${baseUrl}p${currentPage}.html`;
      console.log(`Zajemam stran ${url}`);

      await gotoWithRetry(page, url);

      const items = await page.evaluate(() => {
        const items = document.querySelectorAll('.itemArtikli .item-box');
        const productList = [];

        items.forEach(item => {
          const name = item.querySelector('.item-title')?.innerText.trim();
          if (!name) return;

          const image = item.querySelector('img')?.src || 'Ni podatka';
          const isDiscounted = !!item.querySelector('.badge-action');

          let price = "Ni podatka";
          let originalPrice = "Ni podatka";

          if (isDiscounted) {
            const euros = item.querySelector('.price').childNodes[0]?.textContent.trim();
            const cents = item.querySelector('.price .right span')?.innerText.trim();
            price = euros && cents ? `${euros}${cents}` : 'Ni podatka';

            const originalPriceElement = item.querySelector('.originalPrice');
            originalPrice = originalPriceElement ? originalPriceElement.innerText.replace(/[^0-9,\.]/g, '').trim() : 'Ni podatka';

            if (price.includes(',')) price = price.replace(',', '.');
            if (originalPrice.includes(',')) originalPrice = originalPrice.replace(',', '.');
          } else {
            const priceElement = item.querySelector('.price') || item.querySelector('.bottom-box');
            price = priceElement ? priceElement.innerText.trim() : 'Ni podatka';
            price = price.replace(/[^\d,\.]/g, '').trim();
            if (price.includes(',')) price = price.replace(',', '.');
          }

          productList.push({
            name,
            price: price !== "Ni podatka" ? parseFloat(price) : null,
            originalPrice: originalPrice !== "Ni podatka" ? parseFloat(originalPrice) : null,
            image,
            akcija: isDiscounted,
            category: document.querySelector('ol.breadcrumb li.active')?.innerText.trim() || 'Ni kategorije'
          });
        });

        return productList;
      });

      products = products.concat(items);
      console.log(`Najdenih izdelkov na strani ${url}: ${items.length}`);
    }
  }

  console.log(`\n📝 Skupno najdenih izdelkov: ${products.length}`);
  await browser.close();
  return products;
};

async function gotoWithRetry(page, url, retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      console.log(`Poskus ${i + 1}: Odpiram ${url}`);
      await page.goto(url, { waitUntil: 'networkidle2', timeout: 120000 });
      console.log(`✅ Uspešno odprta stran: ${url}`);
      return true;
    } catch (error) {
      console.log(`❌ Napaka pri odpiranju: ${error.message}`);
      if (i === retries - 1) throw new Error(`Neuspešno nalaganje strani po ${retries} poskusih: ${url}`);
      console.log('⏳ Ponovni poskus...');
    }
  }
}

// Glavna funkcija za zagon in shranjevanje
(async () => {
  try {
    const items = await scrapeJager();
    let savedCount = 0;

    for (const item of items) {
      const filter = { name: item.name };
      const existing = await JagerProduct.findOne(filter);

      const newPrice = item.price ? parseFloat(item.price) : null;
      const originalP = item.originalPrice ? parseFloat(item.originalPrice) : null;

      const wasInAkcija = existing?.originalPrice !== null && existing?.originalPrice !== undefined;
      const isNowInAkcija = originalP !== null;
      const akcijaEnded = wasInAkcija && !isNowInAkcija;

      const priceChanged = existing && existing.price !== newPrice;

      if (!existing) {
        const newDoc = new JagerProduct({
          name: item.name,
          price: newPrice,
          originalPrice: originalP,
          image: item.image,
          akcija: item.akcija ? "true" : "false",
          category: item.category,
          previousPrices: [{ price: newPrice, date: new Date() }],
          updatedAt: new Date()
        });
        await newDoc.save();
        savedCount++;
      } else if (priceChanged || akcijaEnded) {
        existing.previousPrices.push({ price: existing.price, date: new Date() });

        existing.price = newPrice;
        existing.originalPrice = isNowInAkcija ? originalP : null;
        existing.akcija = item.akcija ? "true" : "false";
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

    console.log(`✅ Shranjenih ali posodobljenih izdelkov: ${savedCount}`);
    process.exit(0);
  } catch (err) {
    console.error('❌ Napaka pri shranjevanju:', err.message);
    process.exit(1);
  }
})();