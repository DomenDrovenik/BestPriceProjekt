// const express = require("express");
const puppeteer = require("puppeteer");
const { MongoClient, ServerApiVersion } = require("mongodb");

// async function ScrapeTus() {
//   const browser = await puppeteer.launch({ headless: false });
//   const page = await browser.newPage();
//   const results = [];

//   const categories = [
//     {
//       url: "https://www.tuscc.si/katalog/trajna-zivila",
//       category: "Trajna Živila",
//     },
//     {
//       url: "https://www.tuscc.si/katalog/zamrznjena-zivila",
//       category: "Zamrznjena Živila",
//     },
//     {
//       url: "https://www.tuscc.si/katalog/sveza-%C5%BEivila",
//       category: "Sveža Živila",
//     },
//     { url: "https://www.tuscc.si/katalog/bio-zivila", category: "Bio Živila" },
//     {
//       url: "https://www.tuscc.si/katalog/brezalkoholne-pijace",
//       category: "Brezalkoholne Pijače",
//     },
//     { url: "https://www.tuscc.si/katalog/nezivila", category: "Neživila" },
//     {
//       url: "https://www.tuscc.si/katalog/alkoholne-pijace",
//       category: "Alkoholne Pijače",
//     },
//   ];

//   for (const { url, category } of categories) {
//     await page.goto(url, { waitUntil: "networkidle2" });
//     await page.waitForSelector(".sub-cat");

//     const subcatCount = await page.$$eval(".sub-cat", (els) => els.length);

//     for (let i = 0; i < subcatCount; i++) {
//       const subcategory = await page.$eval(
//         `.sub-cat:nth-child(${i + 1}) h3`,
//         (el) => el.innerText.trim()
//       );

//       await Promise.all([
//         page.evaluate((index) => {
//           const el = document.querySelectorAll(".sub-cat")[index];
//           el.click();
//         }, i),
//         page
//           .waitForSelector(".defaultGrid", { timeout: 5000 })
//           .catch(() => null),
//       ]);

//       const hasProducts = await page
//         .$eval("body", () => !!document.querySelector("a.product-list-item"))
//         .catch(() => false);

//       if (!hasProducts) {
//         console.log(`Prazna podkategorija: ${subcategory}`);
//         await page.goto(url, { waitUntil: "networkidle2" });
//         await page.waitForSelector(".sub-cat");
//         continue;
//       }

//       let finished = false;
//       while (!finished) {
//         const items = await page.$$eval("a.product-list-item", (elements) =>
//           elements.map((el) => {
//             const rawPrice =
//               el.querySelector("div.priceWithVat")?.innerText.trim() || "";
//             const match = rawPrice.match(/[\d,.]+/);
//             const price = match ? match[0].replace(",", ".") : "";

//             return {
//               name: el.querySelector("h3")?.innerText.trim() || "",
//               price: price,
//               image: el.querySelector("img")?.getAttribute("src"),
//             };
//           })
//         );

//         for (const item of items) {
//           results.push({
//             category,
//             subcategory,
//             ...item,
//           });
//         }

//         const currentPage = await page
//           .$eval(".number.selected", (el) => el.innerText.trim())
//           .catch(() => null);

//         const forwardArrow = await page.$(".arrow-forward");
//         if (!forwardArrow) {
//           finished = true;
//           break;
//         }

//         await forwardArrow.click();
//         await new Promise((resolve) => setTimeout(resolve, 1000));

//         const newPage = await page
//           .$eval(".number.selected", (el) => el.innerText.trim())
//           .catch(() => null);

//         if (!newPage || newPage === currentPage) {
//           finished = true;
//         }
//       }

//       await page.goto(url, { waitUntil: "networkidle2" });
//       await page.waitForSelector(".sub-cat");
//     }
//   }

//   await browser.close();
//   return results;
// }



async function ScrapeTus() {
  const browser = await puppeteer.launch({ headless: true });
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
    { url: "https://www.tuscc.si/katalog/nezivila", category: "Neživila" },
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
        page.waitForSelector(".defaultGrid", { timeout: 3000 }).catch(() => null),
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
            const rawPrice =
              el.querySelector("div.priceWithVat")?.innerText.trim() || "";
            const match = rawPrice.match(/[\d,.]+/);
            const price = match ? match[0].replace(",", ".") : "";

            return {
              name: el.querySelector("h3")?.innerText.trim() || "",
              price: price,
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

          console.log(`Najdenih izdelkov na strani ${currentPageUrl}: ${items.length}`);
          
          
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

  try {
    await client.connect();
    const db = client.db("BestPrice");
    const collection = db.collection("tus");

    const scrapedItems = await ScrapeTus();
    const now = new Date();

    for (const item of scrapedItems) {
      const existing = await collection.findOne({
        name: item.name,
        image: item.image,
      });

      if (!existing) {
        await collection.insertOne({
          ...item,
          updatedAt: now,
        });
      } else {
        const updates = {};
        let changed = false;

        
        if (existing.price !== item.price) {
          const previousPrices = existing.previousPrices || [];
          if (!previousPrices.includes(existing.price)) {
            previousPrices.push(existing.price);
          }

          console.log(`Sprememba cene za izdelek: "${item.name}"`);
          console.log(`Stara cena: ${existing.price}, Nova cena: ${item.price}`);

          updates.price = item.price;
          updates.previousPrices = previousPrices;
          updates.updatedAt = now;
          changed = true;
        }

        
        if (!existing.updatedAt) {
          updates.updatedAt = now;
          changed = true;
        }

        
        if (existing.category !== item.category) {
          updates.category = item.category;
          changed = true;
        }
        if (existing.subcategory !== item.subcategory) {
          updates.subcategory = item.subcategory;
          changed = true;
        }

        if (changed) {
          await collection.updateOne(
            { _id: existing._id },
            { $set: updates }
          );
        }
      }
    }

    console.log("Saving completed.");
  } catch (err) {
    console.error("Error working with MongoDB:", err);
  } finally {
    await client.close();
  }
}


module.exports = runTusScraper;
