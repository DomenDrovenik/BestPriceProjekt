// db.js
const { MongoClient,ServerApiVersion } = require('mongodb');

const MONGO_URI = process.env.MONGO_URI 
  || 'mongodb+srv://anja:anja@cluster0.bwlvpsm.mongodb.net/BestPrice?retryWrites=true&w=majority';

let client;
let db;

/**
 * Vrne pripravljeno instanco `db.collection(name)`.
 * Če še nismo povezani, najprej naredi connect().
 */
// async function getCollection(name) {
//   if (!client) {
//     client = new MongoClient(MONGO_URI, {
//       useNewUrlParser: true,
//       useUnifiedTopology: true
//     });
//     await client.connect();
//     // DB ime iz URI ali privzeto iz .db('BestPrice')
//     db = client.db(); 
//   }
//   return db.collection(name);
// }

async function getCollection(name) {
  if (!client) {
    client = new MongoClient(MONGO_URI, {
      serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
      },
      autoSelectFamily: false
    });
    await client.connect();
    db = client.db(); // ali db = client.db("BestPrice") za večjo varnost
  }
  return db.collection(name);
}

async function close() {
  if (client) {
    await client.close();
    client = null;
    db     = null;
  }
}

module.exports = { getCollection, close };