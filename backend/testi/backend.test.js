const request = require("supertest");
const { MongoMemoryServer } = require("mongodb-memory-server");
const { MongoClient, ObjectId } = require("mongodb");
const app = require("../server");

// Nastavimo testno okolje
process.env.NODE_ENV = "test";

let mongoServer;
let client;
let db;

// Testni podatki
const testProducts = {
  tus: [
    {
      _id: new ObjectId("507f1f77bcf86cd799439011"),
      name: "Testni izdelek Tuš 1",
      price: "1.99",
      actionPrice: "1.49",
      active: true,
      image: "test-image.jpg",
    },
    {
      _id: new ObjectId("507f1f77bcf86cd799439012"),
      name: "Testni izdelek Tuš 2",
      price: "2.99",
      active: true,
    },
  ],
  mercatorproducts: [
    {
      _id: new ObjectId("507f1f77bcf86cd799439021"),
      name: "Testni izdelek Mercator",
      price: "3.99",
      active: true,
    },
  ],
  lidl: [
    {
      _id: new ObjectId("507f1f77bcf86cd799439031"),
      name: "Testni izdelek Lidl",
      price: "4.99",
      dostopno: "od 01.01. do 31.12.",
      image: "lidl-test.jpg",
    },
  ],
  hofer: [
    {
      _id: new ObjectId("507f1f77bcf86cd799439041"),
      name: "Testni izdelek Hofer",
      price: "5.99",
      actionPrice: "4.99",
      validFrom: new Date(Date.now() - 86400000).toISOString(),
      validTo: new Date(Date.now() + 86400000).toISOString(),
    },
  ],
};

// Priprava testne baze
beforeAll(async () => {
  try {
    // Zaženemo spomin MongoDB strežnik
    mongoServer = await MongoMemoryServer.create({
      instance: {
        storageEngine: "wiredTiger",
        args: ["--setParameter", "enableTestCommands=1"],
      },
    });
    const uri = mongoServer.getUri();

    console.log("Testna MongoDB URI:", uri);

    // Povežemo se z testno bazo
    client = new MongoClient(uri, {
      connectTimeoutMS: 10000,
      socketTimeoutMS: 10000,
      serverSelectionTimeoutMS: 10000,
    });
    await client.connect();
    db = client.db("testdb");

    // Nadomestimo originalne kolekcije v aplikaciji z našimi testnimi
    app.tusCollection = db.collection("tus");
    app.merkatorCollection = db.collection("mercatorproducts");
    app.jagerCollection = db.collection("jagerproducts");
    app.lidlCollection = db.collection("lidl");
    app.hoferCollection = db.collection("hofer");

    // Vstavimo testne podatke
    await app.tusCollection.insertMany(testProducts.tus);
    await app.merkatorCollection.insertMany(testProducts.mercatorproducts);
    await app.lidlCollection.insertMany(testProducts.lidl);
    await app.hoferCollection.insertMany(testProducts.hofer);
  } catch (error) {
    console.error("Napaka pri inicializaciji testne baze:", error);
    throw error;
  }
});

// Počistimo podatke med testi
afterEach(async () => {
  try {
    await db.collection("tus").deleteMany({});
    await db.collection("mercatorproducts").deleteMany({});
    await db.collection("lidl").deleteMany({});
    await db.collection("hofer").deleteMany({});
    await db.collection("jagerproducts").deleteMany({});

    // Ponovno vstavimo testne podatke
    await app.tusCollection.insertMany(testProducts.tus);
    await app.merkatorCollection.insertMany(testProducts.mercatorproducts);
    await app.lidlCollection.insertMany(testProducts.lidl);
    await app.hoferCollection.insertMany(testProducts.hofer);
  } catch (error) {
    console.error("Napaka pri čiščenju podatkov:", error);
  }
});

// Zapremo povezave po testih
afterAll(async () => {
  try {
    if (client) await client.close();
    if (mongoServer) await mongoServer.stop();
  } catch (error) {
    console.error("Napaka pri zapiranju povezav:", error);
  }
});

describe("Osnovni API Endpointi", () => {
  test("GET /tus - vrne vse Tuš izdelke", async () => {
    const res = await request(app).get("/tus");
    expect(res.statusCode).toBe(200);
    expect(res.body.length).toBe(2);
    expect(res.body[0].store).toBe("Tuš");
    expect(res.body[0].name).toBe("Testni izdelek Tuš 1");
  }, 10000); // Timeout 10 sekund

  test("GET /merkator - vrne vse Mercator izdelke", async () => {
    const res = await request(app).get("/merkator");
    expect(res.statusCode).toBe(200);
    expect(res.body.length).toBe(1);
    expect(res.body[0].store).toBe("Mercator");
  }, 10000);

  test("GET /api/all-products - vrne vse aktivne izdelke", async () => {
    const res = await request(app).get("/api/all-products");
    expect(res.statusCode).toBe(200);
    expect(res.body.length).toBe(4); // 2 Tuš, 1 Mercator, 1 Lidl, 1 Hofer
    expect(res.body.some((p) => p.store === "Tuš")).toBeTruthy();
    expect(res.body.some((p) => p.store === "Mercator")).toBeTruthy();
  }, 10000);
});

describe("Iskanje izdelkov", () => {
  test("GET /api/products/:id - vrne izdelek po ID", async () => {
    const testProduct = testProducts.tus[0];
    const res = await request(app).get(`/api/products/${testProduct._id}`);
    expect(res.statusCode).toBe(200);
    expect(res.body._id).toBe(testProduct._id.toString());
    expect(res.body.name).toBe(testProduct.name);
  }, 10000);

  test("GET /api/compare-prices - primerja cene izdelkov", async () => {
    const res = await request(app)
      .get("/api/compare-prices")
      .query({ name: "Testni izdelek" });

    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body)).toBeTruthy();
    expect(res.body.length).toBeGreaterThan(0);
    expect(res.body[0]).toHaveProperty("store");
    expect(res.body[0]).toHaveProperty("price");
  }, 10000);

  test("GET /api/search - išče izdelke", async () => {
    const res = await request(app).get("/api/search").query({ name: "Testni" });
    expect(res.statusCode).toBe(200);
    expect(res.body.length).toBeGreaterThan(0);
  }, 10000);
});

describe("Komentarji in ocene", () => {
  let testProductId;

  beforeEach(async () => {
    testProductId = testProducts.tus[0]._id;
  });

  test("POST /api/products/:id/comments - doda komentar", async () => {
    const comment = {
      userId: "testuser123",
      user: "Testni Uporabnik",
      rating: 4,
      text: "Zelo dober izdelek!",
      date: new Date().toISOString(),
    };

    const res = await request(app)
      .post(`/api/products/${testProductId}/comments`)
      .send(comment);

    expect(res.statusCode).toBe(201);

    // Preverimo, če je komentar res dodan
    const product = await app.tusCollection.findOne({ _id: testProductId });
    expect(product.comments).toHaveLength(1);
    expect(product.comments[0].userId).toBe(comment.userId);
  }, 10000);

  test("GET /api/products/:id/comments - vrne komentarje", async () => {
    // Najprej dodamo komentar
    await app.tusCollection.updateOne(
      { _id: testProductId },
      {
        $push: {
          comments: {
            userId: "testuser456",
            rating: 5,
            text: "Odlično!",
            date: new Date().toISOString(),
          },
        },
      }
    );

    const res = await request(app).get(
      `/api/products/${testProductId}/comments`
    );
    expect(res.statusCode).toBe(200);
    expect(res.body.length).toBe(1);
    expect(res.body[0].rating).toBe(5);
  }, 10000);
});

describe("Analitika in košarice", () => {
  test("GET /api/dashboard/average-prices - povprečne cene po trgovinah", async () => {
    const res = await request(app).get("/api/dashboard/average-prices");
    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body)).toBeTruthy();
    expect(res.body.some((s) => s.store === "Tuš")).toBeTruthy();
    expect(res.body.some((s) => s.avgPrice)).toBeTruthy();
  }, 10000);

  test("GET /api/basket/basic - osnovna košarica", async () => {
    const res = await request(app).get("/api/basket/basic");
    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body)).toBeTruthy();
  }, 10000);
});

describe("CORS konfiguracija", () => {
  test("Dovoli dostop iz dovoljenih domen", async () => {
    const allowedOrigins = [
      "http://localhost:5173",
      "https://bestpriceapp.me",
      "https://bestprice-4c8cd.firebaseapp.com",
    ];

    for (const origin of allowedOrigins) {
      const res = await request(app).get("/tus").set("Origin", origin);
      expect(res.statusCode).toBe(200);
      expect(res.headers["access-control-allow-origin"]).toBe(origin);
    }
  }, 15000);

  test("Prepreči dostop iz nedovoljenih domen", async () => {
    const res = await request(app)
      .get("/tus")
      .set("Origin", "https://neveljavna-domena.com");
    expect(res.statusCode).toBe(500);
  }, 10000);
});
