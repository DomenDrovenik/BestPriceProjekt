import { expect, test, type Locator, type Page } from '@playwright/test';
import { API_URL, TP02, priceText } from './support/testData';
import {
  expectDetailsPage,
  findProductCard,
  openDetailsFromCard,
  openProductsViaNavbar,
  parseDisplayedPrice,
  readCardInfo,
  readDetailsPrice,
  searchProducts,
  trackMutatingApiRequests,
} from './support/products';
import { getStoredAuthEmail } from './support/auth';

/**
 * TP-02 – Primerjava ponudb istega izdelka med različnimi trgovinami (F-03, posredno F-02)
 * Predpogoji: frontend in backend zagnana; storitev primerjave cen je dosegljiva; prijava ni potrebna.
 *
 */

interface Offer {
  store: string;
  name: string;
  price: number;
  href: string;
}

const COMPARE_HEADING = 'Primerjava cen v drugih trgovinah';

/** Pakiranje v litrih iz imena (npr. »1 l«, »1l«, »1000 ml«); null, če ga ni. */
function packagingLitres(name: string): number | null {
  const matches = [...name.matchAll(/(\d+(?:[.,]\d+)?)\s*(ml|l)\b/gi)];
  if (matches.length === 0) return null;
  const last = matches[matches.length - 1];
  const value = Number(last[1].replace(',', '.'));
  return last[2].toLowerCase() === 'ml' ? value / 1000 : value;
}

function equivalenceProblems(name: string): string[] {
  const { mustContain, variant, packagingLitres: litres } = TP02.equivalent;
  const problems: string[] = [];
  for (const re of mustContain) if (!re.test(name)) problems.push(`manjka ${re}`);
  if (!variant.test(name)) problems.push('ni polnomastno (3,5 %)');
  const pack = packagingLitres(name);
  if (pack === null || Math.abs(pack - litres) > 1e-9) problems.push(`pakiranje ${pack ?? '?'} l namesto ${litres} l`);
  return problems;
}

function compareSection(page: Page): Locator {
  return page.locator('div:has(> h4)').filter({ has: page.getByRole('heading', { level: 4, name: COMPARE_HEADING }) });
}

async function readOffers(section: Locator): Promise<Offer[]> {
  const offers: Offer[] = [];
  for (const item of await section.getByRole('listitem').all()) {
    const texts = (await item.locator('p').allInnerTexts()).map((t) => t.trim());
    // Struktura vrstice: [trgovina, ime izdelka, »cena €«]
    expect(texts.length, `Ponudba nima trgovine, imena in cene: ${JSON.stringify(texts)}`).toBeGreaterThanOrEqual(3);
    const href = (await item.getByRole('link').getAttribute('href')) ?? '';
    offers.push({ store: texts[0], name: texts[1], price: parseDisplayedPrice(texts[texts.length - 1]).current, href });
  }
  return offers;
}

async function rerouteCompareIfConfigured(page: Page) {
  const target = process.env.COMPARE_API_URL;
  if (!target) return;
  await page.route('**/api/compare-prices**', async (route) => {
    const original = new URL(route.request().url());
    const response = await route.fetch({ url: `${target.replace(/\/$/, '')}${original.pathname}${original.search}` });
    await route.fulfill({ response });
  });
  test.info().annotations.push({ type: 'Preusmeritev', description: `/api/compare-prices → ${target}` });
}

test('TP-02 – Primerjava ponudb istega izdelka med različnimi trgovinami', async ({ page }) => {
  const mutatingRequests = trackMutatingApiRequests(page, API_URL);
  const { searchTerm, product, minOffers } = TP02;
  await rerouteCompareIfConfigured(page);
  let offers: Offer[] = [];
  let section!: Locator;

  await test.step(`Korak 1: V navigaciji klikni »Izdelki« in vnesi »${searchTerm}«`, async () => {
    await page.goto('/home');
    expect(await getStoredAuthEmail(page), 'Predpogoj 3: prijava ni potrebna').toBeNull();
    await openProductsViaNavbar(page);
    await searchProducts(page, searchTerm);
    // Pričakovano 1: med zadetki je navedeni izdelek.
    await findProductCard(page, product.name, product.store);
  });

  await test.step('Korak 2: Pri navedenem izdelku klikni »Več«', async () => {
    const compareResponse = page.waitForResponse((r) => r.url().includes('/api/compare-prices'), { timeout: 60_000 });
    compareResponse.catch(() => undefined); // napaka se obravnava ob await spodaj

    const card = await findProductCard(page, product.name, product.store);
    const listed = await readCardInfo(card);
    const details = await openDetailsFromCard(page, card, product.name);
    // Pričakovano 2: stran »Podrobnosti izdelka« s ceno 1,65 €.
    expect((await readDetailsPrice(details)).current, `Cena ni ${priceText(product.price)}`).toBeCloseTo(product.price, 2);
    expect(listed.price.current).toBeCloseTo(product.price, 2);

    // Predpogoj 2: storitev primerjave cen je dosegljiva.
    const response = await compareResponse;
    test.info().annotations.push({ type: 'Storitev primerjave cen', description: `${response.status()} ${response.url()}` });
    if (!response.url().startsWith(API_URL)) {
      test.info().annotations.push({
        type: 'Opozorilo',
        description: `Primerjava cen ni klicala testnega backenda ${API_URL}, temveč ${new URL(response.url()).origin}.`,
      });
    }
    expect(response.ok(), `Storitev primerjave cen ni dosegljiva (HTTP ${response.status()})`).toBe(true);
  });

  await test.step(`Korak 3: Pomakni se do razdelka »${COMPARE_HEADING}«`, async () => {
    await expect(page.getByText('Nalagam primerjavo cen…')).toHaveCount(0, { timeout: 30_000 });
    await expect(page.getByText('Ne morem dobiti primerjave cen.'), 'Aplikacija je prikazala napako primerjave cen').toHaveCount(0);
    await expect(page.getByText('Ni podatkov o drugih trgovinah.'), 'Za izdelek ni prikazana nobena ponudba').toHaveCount(0);
    section = compareSection(page);
    await section.scrollIntoViewIfNeeded();
    await expect(section).toBeInViewport();

    // Pričakovano 3: najmanj dve ponudbi različnih trgovin; pri vsaki trgovina, ime in cena.
    offers = await readOffers(section);
    const stores = new Set(offers.map((o) => o.store));
    expect(stores.size, `Pričakovane so ponudbe vsaj ${minOffers} različnih trgovin, prikazane: ${[...stores].join(', ')}`).toBeGreaterThanOrEqual(minOffers);
  });

  await test.step('Korak 4: Pri vsaki ponudbi zapiši trgovino, ime in ceno ter preveri ime izdelka', async () => {
    await test.info().attach('TP-02-ponudbe.json', {
      contentType: 'application/json',
      body: JSON.stringify({ casPreverjanja: new Date().toISOString(), izdelek: product.name, ponudbe: offers }, null, 2),
    });
    // Pričakovano 4: vse ponudbe so trajno polnomastno mleko, 1 l. Drug izdelek ali drugo pakiranje = neuspeh.
    for (const o of offers) {
      const problems = equivalenceProblems(o.name);
      expect.soft(problems, `${o.store}: »${o.name}« ni enakovreden izdelek (${problems.join('; ')})`).toEqual([]);
    }
  });

  await test.step('Korak 5: Preveri vrstni red ponudb po prikazani ceni', async () => {
    const prices = offers.map((o) => o.price);
    expect(prices.every((p) => Number.isFinite(p) && p > 0), `Neveljavne cene: ${prices.join(', ')}`).toBe(true);
    // Pričakovano 5: od najnižje do najvišje prikazane cene.
    expect(prices, 'Ponudbe niso urejene od najnižje do najvišje cene').toEqual([...prices].sort((a, b) => a - b));
  });

  await test.step('Korak 6: Klikni prvo (najcenejšo) ponudbo in primerjaj ime ter ceno', async () => {
    const first = offers[0];
    await section.getByRole('listitem').first().getByRole('link').click();
    await expect(page).toHaveURL(new RegExp(`${first.href.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`));
    // Pričakovano 6: odprejo se podrobnosti izbrane ponudbe; ime in cena se ujemata.
    const details = await expectDetailsPage(page, first.name);
    expect((await readDetailsPrice(details)).current, `Cena v podrobnostih se ne ujema s ceno ponudbe (${priceText(first.price)})`).toBeCloseTo(
      first.price,
      2,
    );
  });

  await test.step('Pogoj po testu: podatki v bazi ostanejo nespremenjeni', async () => {
    expect(mutatingRequests).toEqual([]);
  });
});
