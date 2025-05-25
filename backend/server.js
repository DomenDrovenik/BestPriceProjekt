const express = require("express");
const cors = require("cors");
const FuseModule = require("fuse.js");
const Fuse = FuseModule.default || FuseModule;

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

async function findBestWithFuse(col, query, limit = 1) {
  // 1) naloži (ali pred-filtriraj) nabor kandidatov
  //    tu najprej poiščemo OR po besedah, da ne beremo cele zbirke
  const words = query
    .split(/\s+/)
    .map(w => w.trim())
    .filter(w => w.length >= 3);
  let prelim;
  if (words.length) {
    const orRegex = words.map(w => ({ name: { $regex: w, $options: "i" } }));
    prelim = await col.find({ $or: orRegex }).limit(100).toArray();
  } else {
    prelim = await col.find().limit(100).toArray();
  }

  if (!prelim.length) return null;

  // 2) nastavimo Fuse
  const fuse = new Fuse(prelim, {
    keys: ["name"],
    threshold: 0.4,           // 0–1, manj = strožja ujemanja
    distance: 100,            // maksimalna “razdalja” v nizu
    minMatchCharLength: 3,    // najmanjša dolžina za fuzzy komponente
    ignoreLocation: true,     // ne kaznuje za razlike v poziciji
  });

  // 3) poiščemo najboljše rezultate
  const results = fuse.search(query, { limit });
  if (!results.length) return null;

  // vrnemo prvi (najbolj relevanten)
  return results[0].item;
}

app.get("/api/compare-prices", async (req, res) => {
  res.setHeader("Cache-Control", "no-store");
  const { name } = req.query;
  if (!name) return res.status(400).json({ message: "Missing name" });

  // definicije trgovin
  const storeLabels = {
    tus: "Tuš",
    mercatorproducts: "Mercator",
    JagerProducts: "Jager",
    lidl: "Lidl",
    hofer: "Hofer",
  };
  const cols = [
    { col: tusCollection, key: "tus" },
    { col: merkatorCollection, key: "mercatorproducts" },
    { col: jagerCollection, key: "JagerProducts" },
    { col: lidlCollection, key: "lidl" },
    { col: hoferCollection, key: "hofer" },
  ];

  const results = [];

  for (const { col, key } of cols) {
    // najprej poskusimo regex+Fuse
    const doc = await findBestWithFuse(col, name);
    if (doc) {
      results.push({
        store: storeLabels[key] || key,
        price: doc.actionPrice != null ? doc.actionPrice : doc.price,
        image: doc.image,
        name: doc.name,
      });
    }
  }

  // sortiramo po ceni in vrnemo
  results.sort((a, b) => a.price - b.price);
  res.json(results);
});

app.post("/api/products/:id/comments", async (req, res) => {
  try {
    const id = req.params.id;
    const objectId = new ObjectId(id);
    const { userId, user, rating, text, date } = req.body;

    if (!userId || !rating) {
      return res
        .status(400)
        .json({ message: "Manjkajoči podatki: userId ali rating" });
    }

    const comment = { userId, user, rating, text, date };

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
        const existingComment = (product.comments || []).find(
          (c) => c.userId === userId
        );
        if (existingComment) {
          return res
            .status(409)
            .json({ message: "Uporabnik je že ocenil ta izdelek." });
        }

        await collection.updateOne(
          { _id: objectId },
          { $push: { comments: comment } }
        );
        return res.status(201).json({ message: "Komentar/ocena shranjena." });
      }
    }

    res.status(404).json({ message: "Izdelek ni najden." });
  } catch (error) {
    console.error("Napaka pri shranjevanju komentarja:", error);
    res.status(500).json({ message: "Napaka na strežniku." });
  }
});

app.get("/api/products/:id/comments/", async (req, res) => {
  try {
    const id = req.params.id;
    // const uid = req.params.uid;
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

app.put("/api/products/:id/comments/:userId", async (req, res) => {
  try {
    const { id, userId } = req.params;
    const { rating, text } = req.body;
    const objectId = new ObjectId(id);

    const collections = [
      tusCollection,
      merkatorCollection,
      jagerCollection,
      lidlCollection,
      hoferCollection,
    ];

    for (const collection of collections) {
      const result = await collection.updateOne(
        { _id: objectId, "comments.userId": userId },
        {
          $set: {
            "comments.$.rating": rating,
            "comments.$.text": text,
            "comments.$.date": new Date().toISOString(),
          },
        }
      );

      if (result.modifiedCount > 0) {
        return res.status(200).json({ message: "Komentar posodobljen." });
      }
    }

    res.status(404).json({ message: "Komentar ni bil najden." });
  } catch (err) {
    console.error("Napaka pri posodabljanju komentarja:", err);
    res.status(500).json({ message: "Napaka na strežniku." });
  }
});

app.delete("/api/products/:id/comments/:userId", async (req, res) => {
  try {
    const { id, userId } = req.params;
    const objectId = new ObjectId(id);

    const collections = [
      tusCollection,
      merkatorCollection,
      jagerCollection,
      lidlCollection,
      hoferCollection,
    ];

    for (const collection of collections) {
      const result = await collection.updateOne(
        { _id: objectId },
        { $pull: { comments: { userId } } }
      );

      if (result.modifiedCount > 0) {
        return res.status(200).json({ message: "Komentar izbrisan." });
      }
    }

    res.status(404).json({ message: "Komentar ni bil najden." });
  } catch (err) {
    console.error("Napaka pri brisanju komentarja:", err);
    res.status(500).json({ message: "Napaka na strežniku." });
  }
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
  connectToMongoDB();
});
