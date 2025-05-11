const puppeteer = require('puppeteer');

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
    const browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();
    
    // Nastavimo User-Agent
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/112.0.0.0 Safari/537.36');
    
    let products = [];

    for (const [baseUrl, maxPages] of Object.entries(URLS)) {
        console.log(`\n➡️  Začenjam z zajemanjem podatkov za kategorijo: ${baseUrl}`);

        for (let currentPage = 1; currentPage <= maxPages; currentPage++) {
            const url = currentPage === 1 ? baseUrl : `${baseUrl}p${currentPage}.html`;
            console.log(`Zajemam stran ${url}`);

            // Uporabimo retry funkcijo
            await gotoWithRetry(page, url);

            const items = await page.evaluate(() => {
                const items = document.querySelectorAll('.itemArtikli .item-box');
                const productList = [];

                items.forEach(item => {
                    const name = item.querySelector('.item-title')?.innerText.trim();
                    if (!name) return;

                    const link = item.querySelector('a')?.href || 'Ni podatka';
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
            if (i === retries - 1) {
                throw new Error(`Neuspešno nalaganje strani po ${retries} poskusih: ${url}`);
            }
            console.log('⏳ Ponovni poskus...');
        }
    }
}

module.exports = scrapeJager;
