const puppeteer = require('puppeteer');

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
    
    // Inicializiramo Puppeteer
    const browser = await puppeteer.launch({ headless: true });
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
        pages.map((page, index) =>
            page.evaluate(() => {
                const items = document.querySelectorAll('.box.item.product');
                const data = [];

                items.forEach((item) => {
                    const name = item.querySelector('.product-name a')?.getAttribute('title')?.trim();
                    if (!name) return;

                    const price = item.querySelector('.lib-product-price')?.innerText.trim().replace(' €', '') || 'Ni cene';
                    const link = item.querySelector('.product-name a')?.href || '#';
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

                console.log(`✅ Najdenih izdelkov na strani: ${data.length}`);
                return data;
            })
        )
    );

    // Združimo vse rezultate iz vseh strani
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

module.exports = scrapeMercator;
