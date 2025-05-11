const express = require("express");
const puppeteer = require("puppeteer");

const app = express();
app.use(express.json());
const PORT = 3000;

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

//       await page.evaluate((index) => {
//         const el = document.querySelectorAll(".sub-cat")[index];
//         el.click();
//       }, i);

//       await page
//         .waitForSelector("a.product-list-item", { timeout: 3000 })
//         .catch(() => null);

//       const items = await page.$$eval("a.product-list-item", (elements) =>
//         elements.map((el) => {
//           const rawPrice =
//             el.querySelector("div.priceWithVat")?.innerText.trim() || "";
//           const match = rawPrice.match(/[\d,.]+/);
//           const price = match ? match[0].replace(",", ".") : "";

//           return {
//             name: el.querySelector("h3")?.innerText.trim() || "",
//             price: price,
//             image: el.querySelector("img")?.getAttribute("src"),
//           };
//         })
//       );

//       for (const item of items) {
//         results.push({
//           category,
//           subcategory,
//           ...item,
//         });
//       }

//       await page.goBack({ waitUntil: "networkidle2" });
//       await page.waitForSelector(".sub-cat");
//     }
//   }

//   await browser.close();
//   return results;
// }

//--------------priblizno delujoca verzija--------------------
async function ScrapeTus() {
  const browser = await puppeteer.launch({ headless: false });
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
        page
          .waitForSelector(".defaultGrid", { timeout: 5000 })
          .catch(() => null),
      ]);

      const hasProducts = await page
        .$eval("body", () => !!document.querySelector("a.product-list-item"))
        .catch(() => false);

      if (!hasProducts) {
        console.log(`⏭️  Prazna podkategorija: ${subcategory}`);
        await page.goto(url, { waitUntil: "networkidle2" });
        await page.waitForSelector(".sub-cat");
        continue;
      }

      let finished = false;
      while (!finished) {
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

        for (const item of items) {
          results.push({
            category,
            subcategory,
            ...item,
          });
        }

        const currentPage = await page
          .$eval(".number.selected", (el) => el.innerText.trim())
          .catch(() => null);

        const forwardArrow = await page.$(".arrow-forward");
        if (!forwardArrow) {
          finished = true;
          break;
        }

        await forwardArrow.click();
        await new Promise((resolve) => setTimeout(resolve, 1000));

        const newPage = await page
          .$eval(".number.selected", (el) => el.innerText.trim())
          .catch(() => null);

        if (!newPage || newPage === currentPage) {
          finished = true;
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

app.get("/izdelki", async (req, res) => {
  try {
    const data = await ScrapeTus();
    res.json(data);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Scraping failed" });
  }
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
