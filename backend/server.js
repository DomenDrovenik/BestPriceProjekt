const express = require("express");
const cors = require("cors");
const FuseModule = require("fuse.js");
const Fuse = FuseModule.default || FuseModule;
require("dotenv").config();

const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");

const app = express();

app.disable("x-powered-by");
// app.use(cors());
//----za production pol
app.use(
  cors({
    origin: function (origin, callback) {
      if (
        !origin ||
        origin === "http://localhost:5173" ||
        origin === "https://bestpriceapp.me" ||
        origin === "https://bestprice-4c8cd.firebaseapp.com"
      ) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
  })
);
app.use(express.json());

const PORT = process.env.PORT;

const uri = process.env.DATABASE_URL;

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

let stores = [];
async function connectToMongoDB() {
  try {
    await client.connect();
    db = client.db(process.env.DB_NAME);
    tusCollection = db.collection("tus");
    merkatorCollection = db.collection("mercatorproducts");
    jagerCollection = db.collection("jagerproducts");
    lidlCollection = db.collection("lidl");
    hoferCollection = db.collection("hofer");

    stores = [
      { col: tusCollection, label: "Tuš" },
      { col: merkatorCollection, label: "Mercator" },
      { col: jagerCollection, label: "Jager" },
      { col: lidlCollection, label: "Lidl" },
      { col: hoferCollection, label: "Hofer" },
    ];

    console.log("Connected to MongoDB!");
  } catch (error) {
    console.error("Error connecting to MongoDB:", error);
    process.exit(1);
  }
}

app.get("/tus", async (req, res) => {
  try {
    const tusData = await tusCollection.find({}).toArray();
    res.status(200).json(tusData.map((p) => ({ ...p, store: "Tuš" })));
  } catch (error) {
    console.error("Error retrieving data:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

app.get("/merkator", async (req, res) => {
  try {
    const merkatorData = await merkatorCollection.find({}).toArray();
    res
      .status(200)
      .json(merkatorData.map((p) => ({ ...p, store: "Mercator" })));
  } catch (error) {
    console.error("Error retrieving data:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

app.get("/jager", async (req, res) => {
  try {
    const jagerData = await jagerCollection.find({}).toArray();
    res.status(200).json(jagerData.map((p) => ({ ...p, store: "Jager" })));
  } catch (error) {
    console.error("Error retrieving data:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

app.get("/hofer", async (req, res) => {
  try {
    const hoferData = await hoferCollection.find({}).toArray();
    res.status(200).json(hoferData.map((p) => ({ ...p, store: "Hofer" })));
  } catch (error) {
    console.error("Error retrieving data:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

app.get("/lidl", async (req, res) => {
  try {
    const lidlData = await lidlCollection.find({}).toArray();
    res.status(200).json(lidlData.map((p) => ({ ...p, store: "Lidl" })));
  } catch (error) {
    console.error("Error retrieving data:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// app.get("/api/all-products", async (req, res) => {
//   try {
//     const tus = (await tusCollection.find({ active: true }).toArray()).map(
//       (p) => ({
//         ...p,
//         store: "Tuš",
//       })
//     );
//     const merkator = (await merkatorCollection.find({}).toArray()).map((p) => ({
//       ...p,
//       store: "Mercator",
//     }));
//     const jager = (await jagerCollection.find({}).toArray()).map((p) => ({
//       ...p,
//       store: "Jager",
//     }));
//     const lidl = (await lidlCollection.find({}).toArray()).map((p) => ({
//       ...p,
//       store: "Lidl",
//     }));
//     const hofer = (await hoferCollection.find({}).toArray()).map((p) => ({
//       ...p,
//       store: "Hofer",
//     }));

//     const all = [...tus, ...merkator, ...jager, ...lidl, ...hofer];
//     res.status(200).json(all);
//   } catch (error) {
//     console.error("Napaka pri pridobivanju vseh izdelkov:", error);
//     res.status(500).json({ message: "Napaka na strežniku" });
//   }
// });
app.get("/api/all-products", async (req, res) => {
  try {
    const now = new Date();

    const tus = (await tusCollection.find({ active: true }).toArray()).map(
      (p) => ({
        ...p,
        store: "Tuš",
      })
    );

    const merkator = (
      await merkatorCollection.find({ active: true }).toArray()
    ).map((p) => ({
      ...p,
      store: "Mercator",
    }));

    const jager = (await jagerCollection.find({ active: true }).toArray()).map(
      (p) => ({
        ...p,
        store: "Jager",
      })
    );

    const lidlRaw = await lidlCollection.find({}).toArray();
    const lidl = lidlRaw
      .filter((p) => {
        const match = p.dostopno?.match(
          /od (\d{2}\.\d{2}\.) do (\d{2}\.\d{2}\.)/
        );
        if (!match) return false;
        const [_, fromStr, toStr] = match;

        const year = now.getFullYear(); // Assume current year
        const [fromDay, fromMonth] = fromStr.split(".").map(Number);
        const [toDay, toMonth] = toStr.split(".").map(Number);

        const from = new Date(year, fromMonth - 1, fromDay);
        const to = new Date(year, toMonth - 1, toDay, 23, 59, 59); // inclusive end date

        return now >= from && now <= to;
      })
      .map((p) => ({
        ...p,
        store: "Lidl",
      }));

    const hoferRaw = await hoferCollection.find({}).toArray();
    const hofer = hoferRaw
      .filter((p) => {
        const from = new Date(p.validFrom);
        const to = new Date(p.validTo);
        return now >= from && now <= to;
      })
      .map((p) => ({
        ...p,
        store: "Hofer",
      }));

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

// app.get("/api/discountedProducts", async (req, res) => {
//   try {
//     const collections = [
//       tusCollection,
//       merkatorCollection,
//       jagerCollection,
//       lidlCollection,
//       hoferCollection,
//     ];

//     const allDiscounts = [];

//     for (const collection of collections) {
//       const data = await collection
//         .aggregate([
//           { $match: { actionPrice: { $exists: true, $ne: null } } },
//           {
//             $addFields: {
//               discountPercentage: {
//                 $multiply: [
//                   {
//                     $divide: [
//                       {
//                         $subtract: [
//                           { $toDouble: "$price" },
//                           { $toDouble: "$actionPrice" },
//                         ],
//                       },
//                       { $toDouble: "$price" },
//                     ],
//                   },
//                   100,
//                 ],
//               },
//               source: collection.collectionName,
//             },
//           },
//         ])
//         .toArray();

//       allDiscounts.push(...data);
//     }

//     const topDiscounts = allDiscounts
//       .sort((a, b) => b.discountPercentage - a.discountPercentage)
//       .slice(0, 5);

//     const withTrend = topDiscounts.map((item) => {
//       const previous = Array.isArray(item.previousPrices)
//         ? item.previousPrices
//         : [];

//       const price = parseFloat(item.price);
//       const actionPrice = parseFloat(item.actionPrice);

//       const previousValues = previous.map((p) => parseFloat(p.price));

//       let trendArray = [...previous.map((p) => ({ pv: parseFloat(p.price) }))];

//       const isPriceInPrevious = previousValues.includes(price);
//       const isActionInPrevious = previousValues.includes(actionPrice);

//       if (!isPriceInPrevious && isActionInPrevious) {
//         const index = trendArray.findIndex((t) => t.pv === actionPrice);
//         if (index !== -1) {
//           trendArray.splice(index, 0, { pv: price });
//         }
//       }

//       if (!isActionInPrevious) {
//         trendArray.push({ pv: actionPrice });
//       }

//       return {
//         ...item,
//         trend: trendArray,
//       };
//     });

//     res.status(200).json(withTrend);
//   } catch (error) {
//     console.error("Napaka pri pridobivanju znižanih izdelkov:", error);
//     res.status(500).json({ message: "Napaka na strežniku" });
//   }
// });

app.get("/api/discountedProducts", async (req, res) => {
  try {
    const now = new Date();
    const collections = [
      tusCollection,
      merkatorCollection,
      jagerCollection,
      lidlCollection,
      hoferCollection,
    ];

    const allDiscounts = [];

    for (const collection of collections) {
      const matchConditions = {
        actionPrice: { $exists: true, $ne: null },
      };

      if (
        ["tus", "jagerproducts", "mercatorproducts"].includes(
          collection.collectionName
        )
      ) {
        matchConditions.active = true;
      }

      const data = await collection
        .aggregate([
          { $match: matchConditions },
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
              store:
                collection.collectionName.charAt(0).toUpperCase() +
                collection.collectionName.slice(1), // e.g. "hofer" -> "Hofer"
            },
          },
        ])
        .toArray();

      const filtered = data.filter((item) => {
        if (collection.collectionName === "lidl") {
          const match = item.dostopno?.match(
            /od (\d{2})\.(\d{2})\. do (\d{2})\.(\d{2})\./
          );
          if (!match) return false;

          const [, fromDay, fromMonth, toDay, toMonth] = match.map(Number);
          const from = new Date(now.getFullYear(), fromMonth - 1, fromDay);
          const to = new Date(
            now.getFullYear(),
            toMonth - 1,
            toDay,
            23,
            59,
            59
          );
          return now >= from && now <= to;
        }

        if (collection.collectionName === "hofer") {
          const from = new Date(item.validFrom);
          const to = new Date(item.validTo);
          return now >= from && now <= to;
        }

        return true;
      });

      allDiscounts.push(...filtered);
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

      let trendArray = previous.map((p) => ({ pv: parseFloat(p.price) }));

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
    .map((w) => w.trim())
    .filter((w) => w.length >= 3);
  let prelim;
  if (words.length) {
    const orRegex = words.map((w) => {
      const esc = w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); // pobegni vse posebne znake
      return { name: { $regex: new RegExp(esc, "i") } };
    });
    prelim = await col.find({ $or: orRegex }).limit(100).toArray();
  } else {
    prelim = await col.find().limit(100).toArray();
  }

  if (!prelim.length) return null;

  if (!prelim.length) return null;

  // 2) nastavimo Fuse
  const fuse = new Fuse(prelim, {
    keys: ["name"],
    threshold: 0.4, // 0–1, manj = strožja ujemanja
    distance: 100, // maksimalna “razdalja” v nizu
    minMatchCharLength: 3, // najmanjša dolžina za fuzzy komponente
    ignoreLocation: true, // ne kaznuje za razlike v poziciji
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

app.get("/api/search", async (req, res) => {
  const { name } = req.query;
  if (!name || name.length < 2) return res.status(400).json([]);

  const collections = [
    { col: tusCollection, store: "Tuš" },
    { col: merkatorCollection, store: "Mercator" },
    { col: jagerCollection, store: "Jager" },
    { col: lidlCollection, store: "Lidl" },
    { col: hoferCollection, store: "Hofer" },
  ];

  const results = [];

  for (const { col, store } of collections) {
    const item = await findBestWithFuse(col, name);
    if (item) {
      results.push({
        ...item,
        store,
        priceNum: parseFloat(
          (item.actionPrice || item.price || "0").toString().replace(",", ".")
        ),
      });
    }
  }

  res.json(results.slice(0, 10)); // vrni največ 10 zadetkov
});

// 1) Average prices
app.get("/api/dashboard/average-prices", async (req, res) => {
  try {
    const avgData = [];
    for (const { col, label } of stores) {
      const [{ avgPrice = 0, count = 0 } = {}] = await col
        .aggregate([
          {
            $project: {
              priceNumeric: {
                $cond: [
                  { $ne: ["$actionPrice", null] },
                  { $toDouble: "$actionPrice" },
                  { $toDouble: "$price" },
                ],
              },
            },
          },
          {
            $group: {
              _id: null,
              avgPrice: { $avg: "$priceNumeric" },
              count: { $sum: 1 },
            },
          },
        ])
        .toArray();
      avgData.push({ store: label, avgPrice, count });
    }
    res.json(avgData);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Napaka pri izračunu povprečnih cen" });
  }
});

// 2) Price trends
app.get("/api/dashboard/price-trends", async (req, res) => {
  try {
    const dateMap = {};
    const storeLabels = stores.map((s) => s.label);

    for (const { col, label } of stores) {
      const docs = await col
        .find({ previousPrices: { $exists: true, $ne: null } })
        .project({ previousPrices: 1 })
        .toArray();

      docs.forEach((doc) => {
        (doc.previousPrices || []).forEach(({ date, price }) => {
          const d = new Date(date).toISOString().slice(0, 10);
          dateMap[d] = dateMap[d] || { date: d };
          dateMap[d][label] = dateMap[d][label] || [];
          dateMap[d][label].push(parseFloat(price));
        });
      });
    }

    const data = Object.values(dateMap)
      .sort((a, b) => a.date.localeCompare(b.date))
      .map((entry) => {
        const out = { date: entry.date };
        storeLabels.forEach((label) => {
          const arr = entry[label] || [];
          out[label] = arr.length
            ? arr.reduce((sum, v) => sum + v, 0) / arr.length
            : null;
        });
        return out;
      });

    res.json({ data, stores: storeLabels });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Napaka pri izračunu trendov cen" });
  }
});

// Na vrhu datoteke, kjer deklariraš svoje kolekcije in stores:
const basicItems = [
  "pšenična bela moka, tip 500",
  "beli kruh",
  "testenine, polži majhni",
  "goveje meso",
  "svinjsko meso",
  "piščančje meso",
  "mleko (3,5 % mlečne maščobe)",
  "tekoči jogurt (3,2 % mlečne maščobe)",
  "poltrdi sir",
  "maslo",
  "jajca hlevske reje",
  "jabolka",
  "krompir",
  "sončnično olje",
  "beli sladkor 1kg",
];
const extendedItems = [
  "pršut",
  "piščančje hrenovke",
  "kuhan pršut",
  "panceta ali sušena slanina",
  "piščančje meso",
  "goveje meso",
  "sir gavda",
  "mocarela",
  "sveže mleko",
  "trajno polnomastno mleko",
  "trajno pol posneto mleko",
  "kisla smetana",
  "jogurt",
  "jajca",
  "bel kruh",
  "polbel kruh",
  "bageta",
  "kajzerica",
  "žemlja",
  "krompir",
  "jabolka",
  "korenje",
  "banane",
  "čebula",
  "limone",
  "sončnično olje",
  "oljčno olje",
  "maslo",
];

// Helper za en element: poišče v vsaki trgovini best match in izračuna avg
async function fetchBasketItemPrices(itemName) {
  const prices = [];
  for (const { col, label: store } of stores) {
    const doc = await findBestWithFuse(col, itemName);
    if (doc) {
      const price =
        doc.actionPrice != null
          ? parseFloat(doc.actionPrice)
          : parseFloat(doc.price);
      prices.push({ store, price });
    }
  }
  if (!prices.length) return null;
  const avgPrice = prices.reduce((sum, p) => sum + p.price, 0) / prices.length;
  return { item: itemName, prices, avgPrice };
}

// Endpoint za osnovno košarico
app.get("/api/basket/basic", async (req, res) => {
  try {
    const result = [];
    for (const name of basicItems) {
      const entry = await fetchBasketItemPrices(name);
      if (entry) result.push(entry);
    }
    res.json(result);
  } catch (err) {
    console.error("Napaka pri basic basket:", err);
    res
      .status(500)
      .json({ message: "Napaka pri pridobivanju osnovne košarice" });
  }
});

// Endpoint za razširjeno košarico
app.get("/api/basket/extended", async (req, res) => {
  try {
    const result = [];
    for (const name of extendedItems) {
      const entry = await fetchBasketItemPrices(name);
      if (entry) result.push(entry);
    }
    res.json(result);
  } catch (err) {
    console.error("Napaka pri extended basket:", err);
    res
      .status(500)
      .json({ message: "Napaka pri pridobivanju razširjene košarice" });
  }
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
  connectToMongoDB();
});

module.exports = app;
