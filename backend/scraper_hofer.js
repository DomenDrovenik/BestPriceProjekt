// scrape_and_parse_hofer.js
// Improved script with Mongo-style JSON output
// - captures 1–2 line uppercase names
// - handles original (strikethrough) and action prices
// - extracts dates, item images, and maps to desired schema
// - outputs an array of documents per PDF matching your JSON shape

const axios     = require("axios");
const cheerio   = require("cheerio");
const fs        = require("fs-extra");
const path      = require("path");
const puppeteer = require("puppeteer");
const pdfParse  = require("pdf-parse");
const { URL }   = require("url");
const Classifier = require('./classifier');
const { getCollection, close } = require("./db");


async function extractTextPages(buffer) {
    // dinamični import ESM modula znotraj CommonJS
    const pdfjsLibModule = await import('pdfjs-dist/legacy/build/pdf.mjs');
    const { getDocument } = pdfjsLibModule;
  
    // pretvorba Node Buffer -> Uint8Array
    const uint8 = new Uint8Array(buffer);
  
    const loadingTask = getDocument({ data: uint8 });
    const pdf = await loadingTask.promise;
    const pages = [];
  
    for (let num = 1; num <= pdf.numPages; num++) {
      const page    = await pdf.getPage(num);
      const content = await page.getTextContent();
      const lines   = content.items
        .map(item => item.str.trim())
        .filter(Boolean);
      pages.push(lines);
    }
  
    return pages;
  }

// Map PDF slug to category name (update as needed)
const categoryMap = {
  'Letak_KW22_2025': 'Vse za zajtrk',
  // add other slug‑to‑category mappings here
};

// 1) Gather PDF links
async function getPdfLinks() {
    const INDEX = "https://www.hofer.si/sl/ponudba/aktualni-letaki-in-brosure.html";
    const { data: html } = await axios.get(INDEX);
    const $ = cheerio.load(html);
    const set = new Set();
    $("a.btn-invisible").each((_,el)=>{
      let h = $(el).attr("href");
      if(!h) return;
      if(h.startsWith("/")) h="https://www.hofer.si"+h;
      set.add(h);
    });
    return [...set];
}

// 2) Download PDFs
async function downloadPdfs(links) {
    const out = path.resolve(__dirname,"letaki");
    await fs.ensureDir(out);
    for(const url of links){
      const slug = path.basename(new URL(url).pathname,".pdf");
      const dest = path.join(out,slug+".pdf");
      if(await fs.pathExists(dest)) continue;
      console.log("↓ downloading",slug+".pdf");
      const { data } = await axios.get(url,{ responseType:"arraybuffer" });
      await fs.writeFile(dest,data);
    }
    return out;
}


// 4) Extract flipbook images per page
async function extractImagesHtml(browser, slug) {
  const page = await browser.newPage();
  await page.goto(`https://letaki.hofer.si/${slug}/page/1`, { waitUntil:"networkidle2" });
  const pages = {};
  let num = 1;
  while(true) {
    const imgs = await page.$$eval('img', imgs=>
      imgs.map(i=>i.src).filter(u=>/\/book\//.test(u))
    );
    pages[num] = Array.from(new Set(imgs));
    const next = await page.$('button.reader-control--next, .flipbook-control-next');
    if(!next) break;
    await Promise.all([
      page.waitForNavigation({waitUntil:'networkidle2'}),
      next.click()
    ]).catch(()=>{});
    num++;
  }
  await page.close();
  return pages;
}

// 5) Regex patterns
const weightRe    = /^(?:\d+\s?[xX×]\s?)?\d+(?:,\d+)?\s*(?:g|kg|l|ml)$/i;
const priceRe     = /\d+,\d{2}/;
const dateRangeRe = /(\d{1,2}\.\s*\d{1,2}\.)\s*[–-]\s*(\d{1,2}\.\s*\d{1,2}\.)/;
const dateSingleRe= /(\d{1,2}\.\s*\d{1,2}\.)/;
function isUpperOnly(str) {
    // vsaj en Unicode-znak črke
    if (!/\p{L}/u.test(str)) return false;
    // brez kakršnekoli male črke in enako .toUpperCase()
    return str === str.toUpperCase();
  }
  
  
  function extractPageDates(lines) {
    let validFrom = null, validTo = null;
    // regex za razpon, npr. "16. 5.-17. 5." ali "19. 5. – 24. 5."
    const rangeRe = /(\d{1,2}\.\s*\d{1,2}\.)\s*[-–]\s*(\d{1,2}\.\s*\d{1,2}\.)/;
    // regex za en sam datum, če razpona ni
    const singleRe = /(\d{1,2}\.\s*\d{1,2}\.)/;
  
    // preglej prvih 5 vrstic glave strani
    for (let i = 0; i < Math.min(5, lines.length); i++) {
      const line = lines[i];
      let m = line.match(rangeRe);
      if (m) {
        validFrom = m[1].replace(/\s+/g, '');
        validTo   = m[2].replace(/\s+/g, '');
        break;
      }
      if (!validFrom) {
        m = line.match(singleRe);
        if (m) {
          validFrom = m[1].replace(/\s+/g, '');
        }
      }
    }
  
    return { validFrom, validTo };
  }

function extractItemsFromLines(lines,pageNum,pageDates,pageImgs){
  const items = [];
  for(let i=0;i<lines.length;i++){
    if(!weightRe.test(lines[i])) continue;
    const nameParts = [];
    let j = i - 1;
    while (j >= 0 && nameParts.length < 2 && isUpperOnly(lines[j])) {
      nameParts.unshift(lines[j]);
      j--;
    }
    if(!nameParts.length) continue;
    const name = nameParts.join(' ');
    const prices=[];
    for(let k=i+1;k<lines.length&&prices.length<2;k++){
      const m = lines[k].match(priceRe);
      if(m) prices.push(m[0]);
    }
    items.push({
      page: pageNum,
      name,
      weight: lines[i],
      price: prices[1]||null,
      actionPrice: prices[0]||null,
      validFrom: pageDates.validFrom,
      validTo: pageDates.validTo,
      images: pageImgs
    });
  }
  // dedupe
  return items.filter((v,i,a)=>a.findIndex(x=>x.name===v.name&&x.weight===v.weight&&x.price===v.price&&x.actionPrice===v.actionPrice)===i);
}

// Helper: parse 'DD.MM.' v Date (upošteva tekoče leto)
function parseDateDM(s) {
    if (!s) return null;
    const m = s.match(/(\d{1,2})\.\s*(\d{1,2})\./);
    if (!m) return null;
    const day   = parseInt(m[1], 10);
    const month = parseInt(m[2], 10) - 1;          // zero-based
    const year  = new Date().getFullYear();
    return new Date(Date.UTC(year, month, day));
  }

// 6) Main runner
(async()=>{

  await Classifier.init();                // naloži ali treniraj SVM model
  console.log('✔ Classifier initialized');
  console.log('Trained categories:', Classifier.categories);
  const collection = await getCollection('hofer');


  console.log('1) Gathering PDF links…');
  const links = await getPdfLinks();
  console.log('2) Downloading PDFs…');
  const pdfDir = await downloadPdfs(links);

  console.log('3) Launching browser…');
  const browser = await puppeteer.launch({ headless:true });
  const slugs = links.map(u=>path.basename(new URL(u).pathname, '.pdf'));
  const imagesMap = {};
  for (const slug of slugs) {
    console.log(`   images for ${slug}`);
    imagesMap[slug] = await extractImagesHtml(browser, slug);
  }
  await browser.close();

  // Zberi vse zapise v en array
  const allDocs = [];
  for (const slug of slugs) {
    console.log(`\n--- Processing ${slug}.pdf ---`);
    const buf       = await fs.readFile(path.join(pdfDir, slug + '.pdf'));
    const pagesText = await extractTextPages(buf);
  
    // collect raw items
    const raw = [];
    pagesText.forEach((lines, idx) => {
      const pageNum = idx + 1;
      const dates   = extractPageDates(lines);
      const imgs    = imagesMap[slug][pageNum] || [];
      raw.push(...extractItemsFromLines(lines, pageNum, dates, imgs));
    });
  
    const now = new Date();
    // map and filter items with valid price
    const docs = raw
      .filter(item => item.price != null)
      .map(item => {
        const priceStr  = item.price;
        const actionStr = item.actionPrice;
        const newPrice  = parseFloat(priceStr.replace(',', '.'));
        const actionP   = actionStr != null
                          ? parseFloat(actionStr.replace(',', '.'))
                          : null;
        return {
          name:           item.name,
          weight:         item.weight,
          newPrice,       // numeric price
          actionPrice:    actionP,
          validFrom:      parseDateDM(item.validFrom),
          validTo:        parseDateDM(item.validTo),
          image:          item.images[0] || null,
          category:       Classifier.classify(item.name),
          updatedAt:      now
        };
      });
  
    for (const doc of docs) {
      const filter   = { name: doc.name };
      const existing = await collection.findOne(filter);
      if (!existing) {
        // insert new item with initial price history
        const initial = doc.actionPrice != null ? doc.actionPrice : doc.newPrice;
        await collection.insertOne({
          name:           doc.name,
          weight:         doc.weight,
          price:          doc.newPrice,
          actionPrice:    doc.actionPrice,
          validFrom:      doc.validFrom,
          validTo:        doc.validTo,
          image:          doc.image,
          category:       doc.category,
          previousPrices: [{ price: initial, date: now }],
          updatedAt:      now
        });
        console.log(`Inserted: ${doc.name}`);
      } else if (existing.price !== doc.newPrice) {
        // price changed, update history and set new price
        await collection.updateOne(
          filter,
          {
            $push: { previousPrices: { price: existing.price, date: existing.updatedAt } },
            $set:  { price: doc.newPrice, actionPrice: doc.actionPrice, updatedAt: now }
          }
        );
        console.log(`Updated:  ${doc.name} | ${existing.price} → ${doc.newPrice}`);
      }
      // if price same, do nothing
    }
  }

  await close();
  console.log(`\n🎉 Dokončano`);
})();
