const { MongoClient, ServerApiVersion } = require("mongodb");
const { Resend } = require("resend");
require("dotenv").config();

const resend = new Resend(process.env.RESEND_API_KEY);

let newsletterCollection;
let db;

const mongoClient = new MongoClient(process.env.DATABASE_URL, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
  autoSelectFamily: false,
});

let tusCollection,
  merkatorCollection,
  jagerCollection,
  lidlCollection,
  hoferCollection;

const storeNamesMap = {
  tus: "Tuš",
  mercatorproducts: "Merkator",
  jagerproducts: "Jager",
  lidl: "Lidl",
  hofer: "Hofer",
};

async function initDb() {
  if (!db) {
    await mongoClient.connect();
    db = mongoClient.db(process.env.DB_NAME);
    newsletterCollection = db.collection("newsletterCollection");
    tusCollection = db.collection("tus");
    merkatorCollection = db.collection("mercatorproducts");
    jagerCollection = db.collection("jagerproducts");
    lidlCollection = db.collection("lidl");
    hoferCollection = db.collection("hofer");
  }
}

async function getTopDiscountedProducts() {
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
              storeNamesMap[collection.collectionName] ||
              collection.collectionName.charAt(0).toUpperCase() +
                collection.collectionName.slice(1),
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
        const to = new Date(now.getFullYear(), toMonth - 1, toDay, 23, 59, 59);
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
    .map((item) => ({
      ...item,
      discountPercentage: (1 - item.actionPrice / item.price) * 100,
    }))
    .sort((a, b) => b.discountPercentage - a.discountPercentage)
    .slice(0, 10)
    .map((item) => ({
      ...item,
      discountPercentage: item.discountPercentage.toFixed(2) + "%", // npr. "35.29%"
    }));

  return topDiscounts;
}

async function sendWeeklyNewsletter() {
  try {
    await initDb();

    const subscribers = await newsletterCollection
      .find({ confirmed: true })
      .toArray();

    const discounted = await getTopDiscountedProducts();

    const itemsHtml = discounted
      .map(
        (item) => `
      <div style="
        flex: 1 1 200px;
        max-width: 240px;
        box-sizing: border-box;
        margin: 8px;
        padding: 12px;
        border: 1px solid #ddd;
        border-radius: 8px;
        text-align: center;
        background-color: #fafafa;
      ">
        <img src="${item.image}" alt="${item.name}" style="max-width: 100%; height: auto; border-radius: 4px;" />
        <h3 style="font-size: 16px; margin: 12px 0 4px;">${item.name}</h3>
        <p style="margin: 4px 0;">
          Cena: <s>${item.price}€</s> → <strong style="color: #d32f2f;">${item.actionPrice}€</strong>
        </p>
        <p style="margin: 4px 0; font-size: 14px; color: #388e3c;">
          🔻 Popust: ${item.discountPercentage}
        </p>
        <p style="margin: 0; font-size: 14px; color: #555;">
          Trgovina: ${item.store}
        </p>
      </div>
    `
      )
      .join("");

    for (const sub of subscribers) {
      try {
        await resend.emails.send({
          from: "BestPrice <noreply@bestpriceapp.me>",
          to: sub.email,
          subject: "Tvoje tedensko BestPrice obvestilo 📰",
          html: `
             <h1>Hej!</h1>
            <p>Tu so tedenske akcije, ki jih ne smeš zamuditi!</p>
            <div style="
              display: flex;
              flex-wrap: wrap;
              justify-content: center;
              margin: 0 -8px;
            ">
              ${itemsHtml}
            </div>
            <p style="margin-top: 32px;">
              <a href="https://bestprice-4c8cd.firebaseapp.com">Poglej vse aktualne ponudbe na BestPrice</a>
            </p>
            <hr />
            <small>
              Če se želiš odjaviti, klikni tukaj:
              <a href="https://bestprice-4c8cd.firebaseapp.com/newsletter/action?email=${encodeURIComponent(sub.email)}&token=${sub.confirmationToken}&action=unsubscribe">Odjavi se</a>
            </small>
          `,
        });
        console.log(`✅ Poslan newsletter na ${sub.email}`);
      } catch (err) {
        console.error(`❌ Napaka pri pošiljanju na ${sub.email}:`, err);
      }
    }

    await mongoClient.close();
    console.log("📨 Tedenski newsletter poslan vsem naročnikom.");
  } catch (error) {
    console.error("❌ Napaka v sendWeeklyNewsletter:", error);
  }
}

sendWeeklyNewsletter();
