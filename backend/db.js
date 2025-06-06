const { MongoClient, ServerApiVersion } = require("mongodb");
require("dotenv").config();

const MONGO_URI = process.env.DATABASE_URL;
const DB_NAME = process.env.DB_NAME;

let client;
let db;

async function getCollection(name) {
  if (!client) {
    client = new MongoClient(MONGO_URI, {
      serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
      },
      autoSelectFamily: false,
    });
    await client.connect();
    db = client.db(DB_NAME); // ali db = client.db("BestPrice") za večjo varnost
  }
  return db.collection(name);
}

async function close() {
  if (client) {
    await client.close();
    client = null;
    db = null;
  }
}

module.exports = { getCollection, close };
