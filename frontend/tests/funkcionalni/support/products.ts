import { expect, test, type Locator, type Page } from '@playwright/test';

export interface DisplayedPrice {
  regular: number;
  action: number | null;
  /** Veljavna (trenutna) cena: akcijska, če obstaja, sicer redna. */
  current: number;
}

/** Iz besedila, npr. »1.49 € 1.19 €«, prebere redno in akcijsko ceno. */
export function parseDisplayedPrice(text: string): DisplayedPrice {
  const values = [...text.matchAll(/(\d+(?:[.,]\d+)?)\s*€/g)].map((m) => Number(m[1].replace(',', '.')));
  if (values.length === 0) throw new Error(`V besedilu »${text}« ni cene.`);
  const regular = values[0];
  const action = values.length > 1 ? values[1] : null;
  return { regular, action, current: action ?? regular };
}

/** Polje »Išči izdelek« (oznaka je Typography brez <label>, zato po placeholderju). */
export function searchInput(page: Page) {
  return page.getByPlaceholder('Vnesi ime...');
}

/**
 * Kartice izdelkov na /products. Aplikacija nima data-testid; CardBody kartice je
 * <div>, ki ima neposredni <h5> z imenom in povezavo »Več« na /products/:id.
 */
export function productCards(page: Page): Locator {
  return page.locator('div:has(> h5):has(a[href^="/products/"])');
}

export async function visibleProductNames(page: Page): Promise<string[]> {
  return productCards(page).locator(':scope > h5').allInnerTexts();
}

export function nextPageButton(page: Page) {
  return page.getByRole('button', { name: '›', exact: true });
}

/** Prepoznavni »podpis« trenutnega stanja seznama: imena na strani + število strani. */
export async function catalogSignature(page: Page) {
  const names = await visibleProductNames(page);
  const pageButtons = await page.locator('button').filter({ hasText: /^\d+$/ }).allInnerTexts();
  return { names, lastPage: pageButtons.length ? Math.max(...pageButtons.map(Number)) : 1 };
}

async function expectProductsPageLoaded(page: Page) {
  await expect(page).toHaveURL(/\/products$/);
  await expect(page.getByRole('heading', { level: 2, name: 'Seznam izdelkov' })).toBeVisible({ timeout: 45_000 });
  await expect(page.getByText('Išči izdelek', { exact: true })).toBeVisible();
  await expect(searchInput(page)).toBeVisible();
  await expect(productCards(page).first(), 'Katalog izdelkov je prazen ali se ni naložil').toBeVisible();
}

/** Začetna stran → klik »Izdelki« v navigaciji. */
export async function openProductsViaNavbar(page: Page) {
  await page.getByRole('navigation').getByRole('link', { name: 'Izdelki', exact: true }).first().click();
  await expectProductsPageLoaded(page);
}

export async function openProductsPage(page: Page) {
  await page.goto('/products');
  await expectProductsPageLoaded(page);
}

/** Vsi prikazani zadetki vsebujejo iskalni niz (ne glede na velikost črk). */
export async function expectResultsFilteredBy(page: Page, term: string) {
  await expect
    .poll(
      async () => {
        const names = await visibleProductNames(page);
        return names.length > 0 && names.every((n) => n.toLowerCase().includes(term.toLowerCase()));
      },
      { message: `Rezultati niso filtrirani po iskalnem nizu »${term}«` },
    )
    .toBe(true);
}

/** Vnese iskalni niz (gumba za potrditev ni) in počaka, da so prikazani rezultati filtrirani. */
export async function searchProducts(page: Page, term: string) {
  await searchInput(page).fill(term);
  await expect(searchInput(page)).toHaveValue(term);
  await expectResultsFilteredBy(page, term);
}

/** Kartica izdelka z natančnim imenom (in po želji trgovino), po potrebi po straneh paginacije. */
export async function findProductCard(page: Page, name: string, store?: string): Promise<Locator> {
  const matching = () => {
    let cards = productCards(page).filter({ has: page.getByRole('heading', { level: 5, name, exact: true }) });
    if (store) cards = cards.filter({ has: page.locator('p', { hasText: new RegExp(` – ${store}$`) }) });
    return cards;
  };
  const next = nextPageButton(page);
  for (let pageNo = 1; pageNo <= 100; pageNo++) {
    if ((await matching().count()) > 0) return matching().first();
    if ((await next.count()) === 0 || (await next.isDisabled())) break;
    const before = (await visibleProductNames(page)).join('|');
    await next.click();
    await expect.poll(async () => (await visibleProductNames(page)).join('|')).not.toBe(before);
  }
  throw new Error(`Izdelka »${name}«${store ? ` (${store})` : ''} ni med rezultati iskanja.`);
}

export async function readCardInfo(card: Locator) {
  const name = (await card.locator(':scope > h5').innerText()).trim();
  const priceText = await card.locator('h6').first().innerText();
  const categoryStore = await card.locator('p').first().innerText(); // »Kategorija – Trgovina«
  const store = categoryStore.split(' – ').pop()!.trim();
  return { name, price: parseDisplayedPrice(priceText), store };
}

/** Kartica s podrobnostmi izdelka na /products/:id (CardBody z <h4> imenom). */
export function detailsCard(page: Page, name?: string): Locator {
  const cards = page.locator('div:has(> h4)').filter({ hasNot: page.getByRole('heading', { level: 4, name: 'Primerjava cen v drugih trgovinah' }) });
  return name ? cards.filter({ has: page.getByRole('heading', { level: 4, name, exact: true }) }) : cards;
}

export async function expectDetailsPage(page: Page, name: string) {
  await expect(page).toHaveURL(/\/products\/[0-9a-f]{24}$/);
  await expect(page.getByRole('heading', { level: 2, name: 'Podrobnosti izdelka' })).toBeVisible();
  const details = detailsCard(page, name);
  await expect(details, `Podrobnosti izdelka »${name}« niso prikazane`).toBeVisible({ timeout: 30_000 });
  return details;
}

export async function openDetailsFromCard(page: Page, card: Locator, name: string) {
  await card.getByRole('link', { name: 'Več' }).click();
  return expectDetailsPage(page, name);
}

export async function readDetailsPrice(details: Locator): Promise<DisplayedPrice> {
  return parseDisplayedPrice(await details.locator('h6').first().innerText());
}

/** /products → iskanje → kartica (ime + trgovina) → »Več«. */
export async function openProductDetails(page: Page, searchTerm: string, name: string, store?: string) {
  return test.step(`Odpri podrobnosti izdelka »${name}«`, async () => {
    await openProductsPage(page);
    await searchProducts(page, searchTerm);
    const card = await findProductCard(page, name, store);
    const cardInfo = await readCardInfo(card);
    const details = await openDetailsFromCard(page, card, name);
    return { details, cardInfo };
  });
}

/**
 * Zbira zahteve, ki bi lahko spremenile podatke (ne-GET na backend API),
 * za preverjanje pogoja »Podatki v bazi ostanejo nespremenjeni«.
 */
export function trackMutatingApiRequests(page: Page, apiUrl: string) {
  const mutating: string[] = [];
  page.on('request', (req) => {
    const method = req.method();
    if (method !== 'GET' && method !== 'OPTIONS' && method !== 'HEAD' && req.url().startsWith(apiUrl)) {
      mutating.push(`${method} ${req.url()}`);
    }
  });
  return mutating;
}
