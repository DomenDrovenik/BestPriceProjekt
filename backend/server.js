const express = require("express");
const cors = require("cors");

const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");

const app = express();
app.use(cors());
app.use(express.json());

// app.use(
//   cors({
//     origin: "http://localhost:5173",
//   })
// );
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

app.get("/api/products/:id", async (req, res) => {
  try {
    const id = req.params.id;
    // validate it’s a proper ObjectId
    if (!ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid product id" });
    }
    const oid = new ObjectId(id);

    // search each collection in turn
    const collections = [
      tusCollection,
      merkatorCollection,
      jagerCollection,
      lidlCollection,
      hoferCollection,
    ];

    let product = null;
    for (const col of collections) {
      const doc = await col.findOne({ _id: oid });
      if (doc) {
        product = doc;
        break;
      }
    }

    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    // stringify the ObjectId for the client
    product._id = product._id.toString();

    res.status(200).json(product);
  } catch (error) {
    console.error("Error fetching product:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

app.get("/api/discountedProducts", async (req, res) => {
  try {
    // const tus = await tusCollection
    //   .find({ actionPrice: { $exists: true, $ne: null } })
    //   .toArray();

    const tus = await tusCollection
      .aggregate([
        { $match: { actionPrice: { $exists: true, $ne: null } } },
        {
          $addFields: {
            discountPercentage: {
              $multiply: [
                {
                  $divide: [
                    {
                      $subtract: [
                        { $toDouble: "$price" },
                        { $toDouble: "$actionPrice" },
                      ],
                    },
                    { $toDouble: "$price" },
                  ],
                },
                100,
              ],
            },
          },
        },
        { $sort: { discountPercentage: -1 } },
        { $limit: 5 },
      ])
      .toArray();

    const withTrend = tus.map((item) => {
      const previous = Array.isArray(item.previousPrices)
        ? item.previousPrices
        : [];
      return {
        ...item,
        trend: [
          ...previous.map((p) => ({ pv: parseFloat(p) })),
          { pv: parseFloat(item.price) },
          { pv: parseFloat(item.actionPrice) },
        ],
      };
    });

    res.status(200).json(withTrend);
  } catch (error) {
    console.error("Napaka pri pridobivanju izdelkov:", error);
    res.status(500).json({ message: "Napaka na strežniku" });
  }
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
  connectToMongoDB();
});
