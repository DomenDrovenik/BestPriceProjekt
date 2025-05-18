const express = require("express");
const cors = require("cors");

const { MongoClient, ServerApiVersion } = require("mongodb");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.json());

app.use(
  cors({
    origin: "http://localhost:5173",
  })
);
const PORT = 3000;

const uri =
  "mongodb+srv://ddfaksstuff:Kcau2hakePYZ1hRH@cluster0.bwlvpsm.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0";

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: false,
    deprecationErrors: true,
  },
  autoSelectFamily: false,
});

let db;
let tusCollection;
let merkatorCollection;
let jagerCollection;
let lidlCollection;
let hoferCollection;

async function connectToMongoDB() {
  try {
    await client.connect();
    db = client.db("BestPrice");
    tusCollection = db.collection("tus");
    merkatorCollection = db.collection("merkators");
    jagerCollection = db.collection("jagers");
    lidlCollection = db.collection("lidl");
    hoferCollection = db.collection("hofer");
    console.log("Connected to MongoDB!");
  } catch (error) {
    console.error("Error connecting to MongoDB:", error);
    process.exit(1);
  }
}

app.get("/tus", async (req, res) => {
  try {
    const tusData = await tusCollection.find({}).toArray();
    res.status(200).json(tusData);
  } catch (error) {
    console.error("Error retrieving data:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

app.get("/merkator", async (req, res) => {
  try {
    const merkatorData = await merkatorCollection.find({}).toArray();
    res.status(200).json(merkatorData);
  } catch (error) {
    console.error("Error retrieving data:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

app.get("/jager", async (req, res) => {
  try {
    const jagerData = await jagerCollection.find({}).toArray();
    res.status(200).json(jagerData);
  } catch (error) {
    console.error("Error retrieving data:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

app.get("/hofer", async (req, res) => {
  try {
    const hoferData = await hoferCollection.find({}).toArray();
    res.status(200).json(hoferData);
  } catch (error) {
    console.error("Error retrieving data:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

app.get("/lidl", async (req, res) => {
  try {
    const lidlData = await lidlCollection.find({}).toArray();
    res.status(200).json(lidlData);
  } catch (error) {
    console.error("Error retrieving data:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

<<<<<<< HEAD
app.get("/search", async (req, res) => {
  const query = req.query.q; // npr. /search?q=banana
  if (!query) {
    return res.status(400).json({ message: "Missing search query (?q=...)" });
  }

  try {
    const results = await tusCollection
      .aggregate([
        {
          $search: {
            text: {
              query: query,
              path: ["name", "category", "subcategory"],
            },
          },
        },
        { $limit: 10 },
        {
          $project: {
            name: 1,
            price: 1,
            category: 1,
            subcategory: 1,
            score: { $meta: "searchScore" },
          },
        },
      ])
      .toArray();

    res.status(200).json(results);
  } catch (error) {
    console.error("Error performing search:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

=======
app.get("/api/all-products", async (req, res) => {
  try {
    const tus = await tusCollection.find({}).toArray();
    const merkator = await merkatorCollection.find({}).toArray();
    const jager = await jagerCollection.find({}).toArray();
    const lidl = await lidlCollection.find({}).toArray();
    const hofer = await hoferCollection.find({}).toArray();

    const all = [...tus, ...merkator, ...jager, ...lidl, ...hofer];
    res.status(200).json(all);
  } catch (error) {
    console.error("Napaka pri pridobivanju vseh izdelkov:", error);
    res.status(500).json({ message: "Napaka na strežniku" });
  }
});


>>>>>>> dd8bba68d2da1c7c7d9dde0c13d04d9aa4e26d69
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
  connectToMongoDB();
});
