const express = require("express");
const { MongoClient, ServerApiVersion } = require("mongodb");

const app = express();
app.use(express.json());
const PORT = 3000;


const uri =
  "mongodb+srv://ddfaksstuff:Kcau2hakePYZ1hRH@cluster0.bwlvpsm.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0";

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
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
    jagerCollection = db.collection("jager");
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
    res.status(200).json(tusData);
  } catch (error) {
    console.error("Error retrieving data:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

app.get("/jager", async (req, res) => {
  try {
    const jagerData = await jagerCollection.find({}).toArray();
    res.status(200).json(tusData);
  } catch (error) {
    console.error("Error retrieving data:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

app.get("/hofer", async (req, res) => {
  try {
    const hoferData = await hoferCollection.find({}).toArray();
    res.status(200).json(tusData);
  } catch (error) {
    console.error("Error retrieving data:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

app.get("/lidl", async (req, res) => {
  try {
    const lidlData = await lidlCollection.find({}).toArray();
    res.status(200).json(tusData);
  } catch (error) {
    console.error("Error retrieving data:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
  connectToMongoDB();
});
