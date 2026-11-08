import { expect, test } from '@playwright/test';
import { openProducts, openProduct, priceValues, productName, search } from './test-helpers';

test('TP-02 Anja – primerjava ponudb po ceni', async ({ page }) => {
  await openProducts(page);
  await search(page, 'Pomursko mleko');
  await openProduct(page);

  const section = page.locator('div').filter({
    has: page.getByRole('heading', { name: 'Primerjava cen v drugih trgovinah', exact: true }),
  }).filter({ has: page.getByRole('list') }).last();
  await expect(section).toBeVisible();
  const offers = section.getByRole('listitem');
  await expect(offers.first()).toBeVisible();
  expect(await offers.count(), 'Primerjava mora prikazati vsaj dve ponudbi').toBeGreaterThanOrEqual(2);

  const extracted = [];
  for (const offer of await offers.all()) {
    const text = await offer.innerText();
    const lines = text.split('\n').map((line) => line.trim()).filter(Boolean);
    const prices = priceValues(text);
    expect(prices, `Ponudba nima natanko ene cene: ${text}`).toHaveLength(1);
    expect(lines.length).toBeGreaterThanOrEqual(3);
    const productLine = lines.find((line) => /mleko/i.test(line) && /trajn|polnomastn|3[,.]5\s*%/i.test(line));
    const packageMatch = productLine?.match(/(\d+(?:[.,]\d+)?)\s*(ml|l)\b/i);
    expect(productLine, `Ponudba ni primerljivo mleko: ${text}`).toBeTruthy();
    expect(packageMatch, `Ponudba nima pakiranja: ${text}`).toBeTruthy();
    const packageLitres = packageMatch?.[2].toLowerCase() === 'ml'
      ? Number(packageMatch[1].replace(',', '.')) / 1000
      : Number(packageMatch?.[1].replace(',', '.'));
    expect(packageLitres, `Ponudba nima pakiranja 1 l: ${text}`).toBe(1);
    extracted.push({ text, price: prices[0], store: lines.find((line) => line !== productLine && !line.includes('€')) });
  }
  expect(extracted.map((offer) => offer.price)).toEqual([...extracted.map((offer) => offer.price)].sort((a, b) => a - b));
  expect(new Set(extracted.map((offer) => offer.store)).size).toBeGreaterThanOrEqual(2);
  expect(await page.getByRole('heading', { name: productName, exact: true }).count()).toBeGreaterThan(0);
});
