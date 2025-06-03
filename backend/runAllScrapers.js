const { spawn } = require("child_process");
const path = require("path");

// const scrapeJager = require("./scraper_jager");
// const scrapeMercator = require("./scraper_mercator");
const runTusScraper = require("./scraperTus");

function runScript(file) {
  return new Promise((resolve, reject) => {
    if (!/^[\w-]+\.js$/.test(file)) {
      return reject(new Error(`⚠️ Neveljavno ime datoteke: ${file}`));
    }

    const child = spawn(process.execPath, [path.join(__dirname, file)], {
      cwd: __dirname,
      shell: false,
    });

    let output = "";
    child.stdout.on("data", (data) => (output += data.toString()));
    child.stderr.on("data", (data) =>
      console.error(`❌ Napaka v ${file}:\n`, data.toString())
    );

    child.on("close", (code) => {
      if (code !== 0) {
        return reject(
          new Error(`⚠️ Script ${file} končan z izhodno kodo ${code}`)
        );
      }
      console.log(`✅ ${file} končan uspešno:\n`, output);
      resolve();
    });
  });
}

async function runScrapers() {
  try {
    await runScript("scraper_hofer.js");
    // await runScript("scraper_lidl.js");
    await runScript("scraper_jager.js");
    await runScript("scraper_mercator.js");
    await runTusScraper();

    console.log("✅ Vsi scraperji zaključeni ob", new Date().toISOString());
  } catch (err) {
    console.error("🛑 Napaka pri izvajanju scraperjev:", err.message);
  }
}

runScrapers();
