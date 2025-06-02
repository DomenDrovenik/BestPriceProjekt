const { MongoClient, ServerApiVersion } = require("mongodb");
require("dotenv").config();

async function syncDatabases(sourceUri, targetUri) {
  const sourceClient = new MongoClient(sourceUri, {
    serverApi: {
      version: ServerApiVersion.v1,
      strict: false,
      deprecationErrors: true,
    },
    autoSelectFamily: false,
  });

  const targetClient = new MongoClient(targetUri, {
    serverApi: {
      version: ServerApiVersion.v1,
      strict: false,
      deprecationErrors: true,
    },
    autoSelectFamily: false,
  });

  try {
    await sourceClient.connect();
    await targetClient.connect();

    const sourceDb = sourceClient.db("BestPrice");
    const targetDb = targetClient.db("BestPrice");

    const collections = await sourceDb.listCollections().toArray();

    for (const collInfo of collections) {
      const name = collInfo.name;
      console.log(`Checking collection: ${name}`);

      const sourceColl = sourceDb.collection(name);
      const targetColl = targetDb.collection(name);

      const count = await sourceColl.countDocuments();

      if (count === 0) {
        console.log(`Skipping collection ${name} — source is empty.`);
        continue;
      }

      console.log(`Syncing collection: ${name} (${count} documents)`);

      await targetColl.deleteMany({});

      const cursor = sourceColl.find();
      const batchSize = 1000;
      let batch = [];

      while (await cursor.hasNext()) {
        const doc = await cursor.next();
        batch.push(doc);

        if (batch.length === batchSize) {
          await targetColl.insertMany(batch);
          batch = [];
        }
      }

      if (batch.length > 0) {
        await targetColl.insertMany(batch);
      }

      console.log(`Collection ${name} synced successfully.`);
    }

    console.log("All collections synced!");
  } catch (err) {
    console.error("Error syncing databases:", err);
    process.exit(1);
  } finally {
    await sourceClient.close();
    await targetClient.close();
  }
}

const sourceUri = process.env.SOURCE_URI;
const targetUri = process.env.TARGET_URI;

syncDatabases(sourceUri, targetUri);
