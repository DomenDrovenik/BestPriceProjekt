const request = require("supertest");
const app = require("../server"); // prilagodi glede na tvojo pot

test("GET /api/all-products should return array of products", async () => {
  jest.setTimeout(20000);
  const res = await request(app).get("/api/all-products");
  //   expect(res.statusCode).toBe(200);
  //   expect(Array.isArray(res.body)).toBe(true);
  if (res.body.length > 0) {
    expect(res.body[0]).toHaveProperty("name");
    expect(res.body[0]).toHaveProperty("price");
  }
});

// test("GET /api/search ", async () => {
//   const res = await request(app).get(
//     "/api/search?name=Pašteta Argeta junior, kokošja, 27 g"
//   );
//   //   expect(res.statusCode).toBe(200);
//   expect(Array.isArray(res.body)).toBe(true);
// });

// Test za neobstoječi produkt
test("GET /api/products/:id , invalid id returns 400", async () => {
  const res = await request(app).get("/api/products/123");
  expect(res.statusCode).toBe(400);
});

// Test za primerjavo cen
test("GET /api/compare-prices ", async () => {
  const res = await request(app).get(
    "/api/compare-prices?name=Pašteta Argeta junior, kokošja, 27 g"
  );
  //   expect(res.statusCode).toBe(200);
  if (res.body.length > 1) {
    const prices = res.body.map((p) => parseFloat(p.price));
    const sorted = [...prices].sort((a, b) => a - b);
    expect(prices).toEqual(sorted);
  }
});
