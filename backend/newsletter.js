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

  return withTrend;
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
        <div style="margin-bottom: 16px;">
          <strong>${item.name}</strong><br/>
          Cena: <s>${item.price}€</s> → <strong>${item.actionPrice}€</strong><br/>
          Trgovina: ${item.store}<br/>
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
            ${itemsHtml}
            <p><a href="https://bestprice-4c8cd.firebaseapp.com">Poglej vse aktualne ponudbe na BestPrice</a></p>
            <hr />
            <small>
             Če se želiš odjaviti, klikni tukaj: <a href="https://bestprice-4c8cd.firebaseapp.com/newsletter/action?email=${encodeURIComponent(sub.email)}&token=${sub.confirmationToken}&action=unsubscribe">Odjavi se</a>
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
