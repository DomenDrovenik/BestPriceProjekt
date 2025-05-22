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
    merkatorCollection = db.collection("mercatorproducts");
    jagerCollection = db.collection("jagerproducts");
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
    const collections = [
      tusCollection,
      merkatorCollection,
      jagerCollection,
      lidlCollection,
      hoferCollection,
    ];

    const allDiscounts = [];

    for (const collection of collections) {
      const data = await collection
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
              source: collection.collectionName,
            },
          },
        ])
        .toArray();

      allDiscounts.push(...data);
    }

    const topDiscounts = allDiscounts
      .sort((a, b) => b.discountPercentage - a.discountPercentage)
      .slice(0, 5);

    const withTrend = topDiscounts.map((item) => {
      const previous = Array.isArray(item.previousPrices)
        ? item.previousPrices
        : [];

      const price = parseFloat(item.price);
      const actionPrice = parseFloat(item.actionPrice);

      const previousValues = previous.map((p) => parseFloat(p.price));

      let trendArray = [...previous.map((p) => ({ pv: parseFloat(p.price) }))];

      const isPriceInPrevious = previousValues.includes(price);
      const isActionInPrevious = previousValues.includes(actionPrice);

      if (!isPriceInPrevious && isActionInPrevious) {
        const index = trendArray.findIndex((t) => t.pv === actionPrice);
        if (index !== -1) {
          trendArray.splice(index, 0, { pv: price });
        }
      }

      if (!isActionInPrevious) {
        trendArray.push({ pv: actionPrice });
      }

      return {
        ...item,
        trend: trendArray,
      };
    });

    res.status(200).json(withTrend);
  } catch (error) {
    console.error("Napaka pri pridobivanju znižanih izdelkov:", error);
    res.status(500).json({ message: "Napaka na strežniku" });
  }
});

app.get("/api/compare-prices", async (req, res) => {
  res.setHeader("Cache-Control", "no-store");

  const { name } = req.query;
  if (!name) return res.status(400).json({ message: "Missing name" });

  // 1) split the target name into significant words
  const words = name
    .split(/\s+/)
    .map((w) => w.trim())
    .filter((w) => w.length >= 3); // skip very short words

  if (!words.length) {
    return res.json([]);
  }

  // 2) build an $and array of case-insensitive regex conditions
  const regexAnd = words.map((w) => ({
    name: { $regex: new RegExp(w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i") },
  }));

  // 3) store collections + friendly labels
  const storeLabels = {
    tus: "Tuš",
    merkators: "Mercator",
    jagers: "Jager",
    lidl: "Lidl",
    hofer: "Hofer",
  };
  const cols = [
    { col: tusCollection, key: "tus" },
    { col: merkatorCollection, key: "merkators" },
    { col: jagerCollection, key: "jagers" },
    { col: lidlCollection, key: "lidl" },
    { col: hoferCollection, key: "hofer" },
  ];

  const results = [];

  // 4) for each store, findOne a product matching **all** words
  for (const { col, key } of cols) {
    const doc = await col.findOne({ $and: regexAnd });
    if (doc) {
      results.push({
        store: storeLabels[key] || key,
        price: doc.actionPrice != null ? doc.actionPrice : doc.price,
        image: doc.image,
        name: doc.name,
      });
    }
  }

  // 5) return at most one per store, sorted by price
  results.sort((a, b) => a.price - b.price);
  res.json(results);
});

app.post("/api/products/:id/comments", async (req, res) => {
  const id = req.params.id;
  const objectId = new ObjectId(id);
  const newComment = req.body;

  const collections = [
    tusCollection,
    merkatorCollection,
    jagerCollection,
    lidlCollection,
    hoferCollection,
  ];

  try {
    for (const collection of collections) {
      const product = await collection.findOne({ _id: objectId });
      if (product) {
        const updatedComments = product.comments
          ? [...product.comments, newComment]
          : [newComment];

        await collection.updateOne(
          { _id: objectId },
          { $set: { comments: updatedComments } }
        );

        return res
          .status(200)
          .json({ message: "Komentar dodan", comments: updatedComments });
      }
    }

    res.status(404).json({ message: "Izdelek ni bil najden" });
  } catch (error) {
    console.error("Napaka pri dodajanju komentarja:", error);
    res.status(500).json({ message: "Napaka na strežniku" });
  }
});

app.get("/api/products/:id/comments", async (req, res) => {
  try {
    const id = req.params.id;
    const objectId = new ObjectId(id);

    const collections = [
      tusCollection,
      merkatorCollection,
      jagerCollection,
      lidlCollection,
      hoferCollection,
    ];

    for (const collection of collections) {
      const product = await collection.findOne({ _id: objectId });

      if (product) {
        const comments = product.comments || [];
        return res.status(200).json(comments);
      }
    }

    res.status(200).json([]);
  } catch (error) {
    console.log("Error: " + error);
  }
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
  connectToMongoDB();
});
