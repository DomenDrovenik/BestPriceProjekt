// Popravljena celotna skripta, ki:
// - natančno ujame imena (1–2 vrstiščni, uppercase only)
// - pobere PDF-je, razdeli po straneh, poišče datume, tekste in slike
// - odstrani duplikate in pravilno oštevilči strani
//
// Predpogoji:
//   npm install axios cheerio fs-extra puppeteer pdfjs-dist canvas
//
// Zaženi: node scraper_hofer.js
//

const axios     = require("axios");
const cheerio   = require("cheerio");
const fs        = require("fs-extra");
const path      = require("path");
const puppeteer = require("puppeteer");
const pdfParse  = require("pdf-parse");
const { URL }   = require("url");
const { execSync } = require('child_process');

// ——————————————————————————————————————————————————
// 1) Pobri PDF linke
// ——————————————————————————————————————————————————
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

// ——————————————————————————————————————————————————
// 2) Prenos PDF-jev
// ——————————————————————————————————————————————————
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

// ——————————————————————————————————————————————————
// 3) Razdelitev besedila po straneh (pdf-parse)
// ——————————————————————————————————————————————————
async function extractTextPages(buffer){
  const { text } = await pdfParse(buffer);
  return text.split("\f").map(page =>
    page.split("\n").map(l=>l.trim()).filter(l=>l)
  );
}

// ——————————————————————————————————————————————————
// 4) Puppeteer za flipbook slike
// ——————————————————————————————————————————————————
async function extractImagesHtml(browser,slug){
  const page = await browser.newPage();
  await page.goto(`https://letaki.hofer.si/${slug}/page/1`,{waitUntil:"networkidle2"});
  const map = {}, seen=new Set();
  let num=1;
  while(true){
    const srcs = await page.$$eval("img", imgs=>
      imgs.map(i=>i.src).filter(u=>/\/book\//.test(u))
    );
    map[num] = [...new Set(srcs)];
    const btn = await page.$("button.reader-control--next, .flipbook-control-next");
    if(!btn) break;
    await Promise.all([
      page.waitForNavigation({waitUntil:"networkidle2"}),
      btn.click()
    ]).catch(()=>{});
    num++;
  }
  await page.close();
  return map;
}

// ——————————————————————————————————————————————————
// 5) Parsanje datuma in izdelkov
// ——————————————————————————————————————————————————
const weightRe    = /^(?:\d+\s?[xX×]\s?)?\d+(?:,\d+)?\s*(?:g|kg|l|ml)$/i;
const priceRe     = /^\d+,\d{2}$/;
const unitPriceRe = /^\d+,\d{2}\s*\/kg$/i;
const hasLetter   = /\p{L}/u;
const hasLower    = /\p{Ll}/u;
const dateRe      = /(\d{1,2}\.\s*\d{1,2}\.)\s*(?:[–-]\s*(\d{1,2}\.\s*\d{1,2}\.))?/;

function extractPageDate(lines){
  for(let i=0;i<Math.min(5,lines.length);i++){
    const m = dateRe.exec(lines[i]);
    if(m){
      return { validFrom: m[1].replace(/\s+/g,""), validTo: m[2]?.replace(/\s+/g,"")||null };
    }
  }
  return { validFrom:null, validTo:null };
}

function extractItemsFromLines(lines,pageNum){
  const items=[];
  for(let i=0;i<lines.length;i++){
    const w = lines[i];
    if(!weightRe.test(w)) continue;
    // backtrack max 2 lines for name
    const nameLines=[];
    let j=i-1,count=0;
    while(j>=0 && count<2 &&
          hasLetter.test(lines[j]) &&
          !hasLower.test(lines[j]) &&
          !weightRe.test(lines[j]) &&
          !priceRe.test(lines[j])
    ){
      nameLines.unshift(lines[j]);
      j--; count++;
    }
    if(!nameLines.length) continue;
    const name = nameLines.join(" ");
    // forward for price
    let price=null,unitPrice=null;
    let k=i+1;
    while(k<lines.length && !priceRe.test(lines[k])) k++;
    if(k>=lines.length) continue;
    price=lines[k++];
    if(k<lines.length && unitPriceRe.test(lines[k])){
      unitPrice=lines[k++];
    }
    items.push({ page:pageNum, name, weight:w, price, unitPrice });
  }
  // dedupe
  return items.filter((v,i,a)=>
    a.findIndex(x=>
      x.name===v.name &&
      x.weight===v.weight &&
      x.price===v.price &&
      x.unitPrice===v.unitPrice
    )===i
  );
}

// ——————————————————————————————————————————————————
// 6) Glavni zagon
// ——————————————————————————————————————————————————
(async()=>{
  console.log("1) Gathering PDF links…");
  const links = await getPdfLinks();
  console.log("2) Downloading PDFs…");
  const pdfDir=await downloadPdfs(links);

  console.log("3) Launching browser for images…");
  const browser=await puppeteer.launch({headless:true});
  const slugs=links.map(u=>path.basename(new URL(u).pathname,".pdf"));
  const imagesMap={};
  for(const s of slugs){
    console.log("   images for",s);
    imagesMap[s]=await extractImagesHtml(browser,s);
  }
  await browser.close();

  for(const slug of slugs){
    console.log(`\n--- Processing ${slug}.pdf ---`);
    const buf=await fs.readFile(path.join(pdfDir,slug+".pdf"));

    console.log("   extracting text…");
    const pagesText=await extractTextPages(buf);

    console.log("   parsing pages…");
    const pages=pagesText.map((lines,idx)=>{
      const pageNum=idx+1;
      const {validFrom,validTo}=extractPageDate(lines);
      const items=extractItemsFromLines(lines,pageNum);
      const images=imagesMap[slug][pageNum]||[];
      return { page:pageNum, validFrom, validTo, items, images };
    });

    const out={ slug, pages };
    await fs.writeJson(path.join(pdfDir,slug+".json"), out, { spaces:2 });
    console.log("   wrote", slug+".json");
  }

  console.log("\n🎉 All done!");
})();