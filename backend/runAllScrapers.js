const path = require("path");

async function runScrapers() {
  console.log("🔄 Začenjam z izvajanjem scraperjev...");

  // Uvozi vsakega scraperja
  const scraperFiles = [
    "scraper_hofer.js",
    "scraper_jager.js",
    "scraper_lidl.js",
    "scraper_mercator.js",
    "scraperTus.js",
  ];

  for (const file of scraperFiles) {
    const scraperPath = path.join(__dirname, file);
    console.log(`▶️  Zagon: ${file}`);
    try {
      await require(scraperPath);
    } catch (err) {
      console.error(`❌ Napaka pri ${file}:`, err);
    }
  }

  console.log("✅ Vsi scraperji zaključeni ob", new Date().toISOString());
}

runScrapers();
