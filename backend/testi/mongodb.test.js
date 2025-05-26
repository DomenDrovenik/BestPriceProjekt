const { MongoClient, ServerApiVersion } = require("mongodb");

let client;
let db;
let testCollection;

beforeAll(async () => {
  const uri =
    "mongodb+srv://domen:domen@cluster0.6htyv94.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0";

  client = new MongoClient(uri, {
    serverApi: {
      version: ServerApiVersion.v1,
      strict: false,
      deprecationErrors: true,
    },
    autoSelectFamily: false,
  });

  await client.connect();
  db = client.db("BestPrice");

  testCollection = db.collection(`test`);
});

afterAll(async () => {
  if (testCollection) {
    await testCollection.drop().catch((err) => {
      if (err.codeName !== "NamespaceNotFound") throw err;
    });
  }

  await client.close();
});

afterEach(async () => {
  await testCollection.deleteMany({});
});

test("Ustvari testni collection, vstavi in prebere dokument", async () => {
  await testCollection.insertOne({ name: "Snickers" });

  const najden = await testCollection.findOne({ name: "Snickers" });

  expect(najden).not.toBeNull();
  expect(najden.name).toBe("Snickers");
});

test("Vstavi več dokumentov in preveri število", async () => {
  const produkti = [
    { name: "Coca Cola" },
    { name: "Pepsi" },
    { name: "Fanta" },
  ];

  await testCollection.insertMany(produkti);
  const count = await testCollection.countDocuments();

  expect(count).toBe(3);
});

test("Posodobi ime dokumenta", async () => {
  await testCollection.insertOne({ name: "OldName" });

  await testCollection.updateOne(
    { name: "OldName" },
    { $set: { name: "NewName" } }
  );

  const najden = await testCollection.findOne({ name: "NewName" });

  expect(najden).not.toBeNull();
  expect(najden.name).toBe("NewName");
});

test("Izbriši en dokument", async () => {
  await testCollection.insertOne({ name: "ToBeDeleted" });

  await testCollection.deleteOne({ name: "ToBeDeleted" });

  const najden = await testCollection.findOne({ name: "ToBeDeleted" });

  expect(najden).toBeNull();
});

test("Najdi vse izdelke z istim imenom", async () => {
  await testCollection.insertMany([
    { name: "Twix" },
    { name: "Twix" },
    { name: "Mars" },
  ]);

  const rezultati = await testCollection.find({ name: "Twix" }).toArray();

  expect(rezultati.length).toBe(2);
  expect(rezultati.every((p) => p.name === "Twix")).toBe(true);
});
