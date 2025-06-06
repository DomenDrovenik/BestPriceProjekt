const admin = require("firebase-admin");
const { MongoClient, ObjectId, ServerApiVersion } = require("mongodb");
const { Resend } = require("resend");
// const serviceAccount = require("./serviceAccountKey.json");
require("dotenv").config();

const resend = new Resend(process.env.RESEND_API_KEY);
const serviceAccount = JSON.parse(process.env.SERVICE_ACCOUNT_KEY);

// Firestore init
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});
const firestore = admin.firestore();
const uri = process.env.DATABASE_URL;

// MongoDB init
const mongoClient = new MongoClient(uri, {
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
    await mongoClient.connect();
    db = mongoClient.db(process.env.DB_NAME);
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

async function findProductById(id) {
  const collections = [
    tusCollection,
    merkatorCollection,
    jagerCollection,
    lidlCollection,
    hoferCollection,
  ];

  const productId = new ObjectId(id);

  for (const col of collections) {
    // poišči po _id (če je ObjectId) ali productId
    let product = await col.findOne({ _id: productId });
    if (product) {
      return product;
    }
  }
  console.log("Ni najdenega produkta");
  return null;
}

async function sendPriceAlertEmail(userEmail, product, targetPrice) {
  try {
    let price = product.actionPrice ? product.actionPrice : product.price;

    await resend.emails.send({
      from: "BestPrice <noreply@bestpriceapp.me>",
      // to: ["domen.drovenik@student.um.si"], //to: [`${userEmail}`],
      to: [`${userEmail}`],
      subject: `Cena za ${product.name} je padla!`,
      html: `
        <h1>Cena za izdelek ${product.name} je padla pod ${targetPrice}€!</h1>
        <p>Izdelek: ${product.name}</p>
        <img src="${product.image}" alt="${product.name}" /> </br>
        <p>Trenutna cena: ${price} €</p>
        <p>Oglejte si ponudbo na BestPrice.</p>
      `,
    });
    console.log(
      `Email poslan uporabniku ${userEmail} za produkt ${product.name}`
    );
  } catch (e) {
    console.error("Napaka pri pošiljanju emaila:", e);
  }
}

async function checkPriceAlerts() {
  const usersSnap = await firestore.collection("users").get();

  for (const userDoc of usersSnap.docs) {
    const uid = userDoc.id;
    const userData = userDoc.data();
    const userEmail = userData.email;

    const alertsSnap = await firestore
      .collection("users")
      .doc(uid)
      .collection("priceAlerts")
      .where("notified", "==", false)
      .get();

    for (const alertDoc of alertsSnap.docs) {
      const alert = alertDoc.data();
      const alertId = alertDoc.id;

      const product = await findProductById(alert.productId);
      if (!product) {
        console.log(`Produkt z id ${alert.productId} ni najden.`);
        continue;
      }

      const currentPrice = product.actionPrice
        ? product.actionPrice
        : product.price;

      if (currentPrice == null) continue;

      if (currentPrice <= alert.targetPrice) {
        if (alert.emailNotification !== false) {
          await sendPriceAlertEmail(userEmail, product, alert.targetPrice);
        } else {
          console.log(
            `Email notifikacija izklopljena za ${userEmail}, alert ${alertId}`
          );
        }

        await firestore
          .collection("users")
          .doc(uid)
          .collection("priceAlerts")
          .doc(alertId)
          .update({
            notified: true,
            notifiedAt: admin.firestore.FieldValue.serverTimestamp(),
            triggered: true,
            triggeredAt: admin.firestore.FieldValue.serverTimestamp(),
            currentPrice: Number(currentPrice),
          });
      }
    }
  }
}

async function main() {
  await connectToMongoDB();
  await checkPriceAlerts();
  await mongoClient.close();
  console.log("Preverjanje price alertov končano.");
}

main().catch(console.error);
