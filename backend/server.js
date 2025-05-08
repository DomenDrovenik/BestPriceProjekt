const express = require("express");
const puppeteer = require("puppeteer");

const app = express();
app.use(express.json());
const PORT = 3000;

async function ScrapeTus() {
  const browser = await puppeteer.launch({ headless: false });
  const page = await browser.newPage();
  const izdelki = [];

  const pages = [
    "https://www.tuscc.si/katalog/trajna-zivila",
    "https://www.tuscc.si/katalog/zamrznjena-zivila",
    "https://www.tuscc.si/katalog/sveza-%C5%BEivila",
    "https://www.tuscc.si/katalog/bio-zivila",
    "https://www.tuscc.si/katalog/brezalkoholne-pijace",
    "https://www.tuscc.si/katalog/nezivila",
    "https://www.tuscc.si/katalog/alkoholne-pijace",
  ];

  for (const url of pages) {
    await page.goto(url, { waitUntil: "networkidle2" });
    await page.waitForSelector(".sub-cat");

    const subcatCount = await page.$$eval(".sub-cat", (els) => els.length);

    for (let i = 0; i < subcatCount; i++) {
      const title = await page.$eval(`.sub-cat:nth-child(${i + 1}) h3`, (el) =>
        el.innerText.trim()
      );

      await page.evaluate((index) => {
        const el = document.querySelectorAll(".sub-cat")[index];
        el.click();
      }, i);

      await page
        .waitForSelector("a.product-list-item", { timeout: 5000 })
        .catch(() => null);

      const items = await page.$$eval("a.product-list-item h3", (elements) =>
        elements.map((el) => ({
          name: el.innerText.trim(),
        }))
      );

      izdelki.push({
        title: title,
        izdelki: items,
      });

      await page.goBack({ waitUntil: "networkidle2" });
      await page.waitForSelector(".sub-cat");
    }
  }

  await browser.close();
  return izdelki;
}

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

// const express = require("express");
// const puppeteer = require("puppeteer");

// const app = express();
// app.use(express.json());
// const PORT = 3000;

// async function ScrapeTus() {
//   const browser = await puppeteer.launch({ headless: false });
//   const page = await browser.newPage();
//   const izdelki = [];

//   const pages = [
//     "https://www.tuscc.si/katalog/trajna-zivila",
//     "https://www.tuscc.si/katalog/zamrznjena-zivila",
//     // Dodaj ostale strani po potrebi
//   ];

//   for (const url of pages) {
//     await page.goto(url, { waitUntil: "networkidle2" });
//     await page.waitForSelector(".sub-cat");

//     const subcatCount = await page.$$eval(".sub-cat", (els) => els.length);

//     for (let i = 0; i < subcatCount; i++) {
//       const title = await page.$eval(`.sub-cat:nth-child(${i + 1}) h3`, (el) =>
//         el.innerText.trim()
//       );

//       await page.evaluate((index) => {
//         const el = document.querySelectorAll(".sub-cat")[index];
//         el.click();
//       }, i);

//       await page
//         .waitForSelector("a.product-list-item", { timeout: 5000 })
//         .catch(() => null);

//       const izdelkiVPodkategoriji = [];

//       let nadaljuj = true;
//       while (nadaljuj) {
//         const items = await page.$$eval("a.product-list-item h3", (elements) =>
//           elements.map((el) => ({
//             name: el.innerText.trim(),
//           }))
//         );

//         izdelkiVPodkategoriji.push(...items);

//         const currentPageNumber = await page.$eval("a.number.selected", (el) =>
//           el.innerText.trim()
//         );

//         const clicked = await page.evaluate(() => {
//           const pages = Array.from(document.querySelectorAll("a.number"));
//           const selectedIndex = pages.findIndex((el) =>
//             el.classList.contains("selected")
//           );
//           for (let i = selectedIndex + 1; i < pages.length; i++) {
//             if (!pages[i].classList.contains("selected")) {
//               pages[i].scrollIntoView();
//               pages[i].click();
//               return pages[i].innerText.trim();
//             }
//           }
//           return null;
//         });

//         if (clicked) {
//           await page.waitForFunction(
//             (prevPage) => {
//               const el = document.querySelector("a.number.selected");
//               return el && el.innerText.trim() !== prevPage;
//             },
//             {},
//             currentPageNumber
//           );

//           await page.waitForSelector("a.product-list-item h3", {
//             timeout: 10000,
//           });
//         } else {
//           nadaljuj = false;
//         }
//       }

//       izdelki.push({
//         title: title,
//         izdelki: izdelkiVPodkategoriji,
//       });

//       // Nazaj na glavno stran
//       await page.goBack({ waitUntil: "networkidle2" });
//       await page.waitForSelector(".sub-cat");
//     }
//   }

//   await browser.close();
//   return izdelki;
// }

// app.get("/izdelki", async (req, res) => {
//   try {
//     const data = await ScrapeTus();
//     res.json(data);
//   } catch (e) {
//     console.error(e);
//     res.status(500).json({ error: "Scraping failed" });
//   }
// });

// app.listen(PORT, () => {
//   console.log(`Server is running on http://localhost:${PORT}`);
// });
