const { exec } = require("child_process");
const path = require("path");

const scrapeJager = require("./scraper_jager");
const scrapeMercator = require("./scraper_mercator");
const runTusScraper =require("./scraperTus")


function runScript(file) {
  return new Promise((resolve, reject) => {
    exec(`node ${file}`, { cwd: __dirname }, (error, stdout, stderr) => {
      if (error) {
        console.error(`❌ Error in ${file}:\n`, stderr);
        reject(error);
      } else {
        console.log(`✅ ${file} completed:\n`, stdout);
        resolve();
      }
    });
  });
}

async function runScrapers() {

  await runScript("scraper_hofer.js");
  await runScript("scraper_lidl.js");
  await scrapeJager();     
  await scrapeMercator();  
  await runTusScraper();

  console.log("✅ Vsi scraperji zaključeni ob", new Date().toISOString());
}

runScrapers();
