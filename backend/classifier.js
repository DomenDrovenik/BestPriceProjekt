// classifier.js
// TF–IDF + Naive Bayes classifier in pure JS (natural)

const { MongoClient } = require("mongodb");
const natural = require("natural");
const fs = require("fs").promises;
const path = require("path");

const MONGO_URI =
  process.env.DATABASE_URL ||
  "mongodb+srv://anja:anja@cluster0.bwlvpsm.mongodb.net/BestPrice?retryWrites=true&w=majority";
const DB_NAME = process.env.DB_NAME || "BestPrice";
const COLL_NAMES = ["JagerProducts", "mercatorproducts", "tus", "lidl"];
const MODEL_FILE = path.resolve(__dirname, "bayes-model.json");

// Ustvarimo TF–IDF in Bayes klasifikator
class BayesTextClassifier {
  constructor() {
    this.tfidf = new natural.TfIdf();
    this.classifier = new natural.BayesClassifier();
    this.trained = false;
  }

  /** Inicializiraj: naloži ali treniraj od začetka */
  async init() {
    if (await exists(MODEL_FILE)) {
      // Obnovi shranjen model
      const raw = JSON.parse(await fs.readFile(MODEL_FILE, "utf8"));
      this.classifier = natural.BayesClassifier.restore(raw);
      this.trained = true;
      console.log(`✔ Loaded Bayes model from ${MODEL_FILE}`);
    } else {
      // Train from DB
      await this.trainFromDB();
    }
  }

  /** Naredi trening iz MongoDB */
  async trainFromDB() {
    const client = new MongoClient(MONGO_URI);
    await client.connect();
    const db = client.db(DB_NAME);

    for (const coll of COLL_NAMES) {
      const docs = await db
        .collection(coll)
        .find({}, { projection: { name: 1, category: 1 } })
        .toArray();

      docs.forEach(({ name, category }) => {
        if (name && category) {
          // Z gradnjo TF–IDF ni nujna, ampak lahko dodaš:
          this.tfidf.addDocument(name);
          // Dodaj ime kot dokument za Bayes z oznako category
          this.classifier.addDocument(name, category);
        }
      });
      console.log(`• Loaded examples from '${coll}'`);
    }

    await client.close();

    // Treniraj klasifikator
    this.classifier.train();
    this.trained = true;
    console.log("✔ Bayes classifier trained");

    // Shrani model
    await fs.writeFile(MODEL_FILE, JSON.stringify(this.classifier), "utf8");
    console.log(`✔ Saved Bayes model to ${MODEL_FILE}`);
  }

  /** Klasificiraj besedilo */
  classify(text) {
    if (!this.trained) throw new Error("Classifier not initialized");
    return this.classifier.classify(text);
  }
}

// Helper: ali datoteka obstaja?
async function exists(f) {
  try {
    await fs.access(f);
    return true;
  } catch {
    return false;
  }
}

// Izvožena instanca
module.exports = new BayesTextClassifier();
