const { MongoMemoryServer } = require("mongodb-memory-server");
const mongoose = require("mongoose");

// Definicija modela
const productSchema = new mongoose.Schema({
  name: String,
});
const Product = mongoose.model("Product", productSchema);
let mongoServer;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();
  await mongoose.connect(uri);
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

test("Save and find product", async () => {
  const product = new Product({ name: "Pringles" });
  await product.save();

  const najden = await Product.findOne({ name: "Pringles" });
  expect(najden.name).toBe("Pringles");
});
