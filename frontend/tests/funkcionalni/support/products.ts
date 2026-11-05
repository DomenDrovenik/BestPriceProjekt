import { expect, test, type Locator, type Page } from '@playwright/test';
import { block, escapeRegex, fieldNear, pricesIn } from './ui';

/** Polje »Išči izdelek« (TP-01, korak 3). */
export function searchInput(page: Page) {
  return fieldNear(page, page, 'Išči izdelek');
}

/** Povezave »Več« – vsak zadetek ima eno (TP-01, korak 5). */
export function moreLinks(page: Page) {
  return page.getByRole('link', { name: 'Več', exact: true });
}

/**
 * Imena prikazanih zadetkov v vrstnem redu na strani: za vsako povezavo »Več«
 * naslov najmanjšega bloka okoli nje (ime zadetka je naslov njegove kartice).
 */
export async function visibleProductNames(page: Page): Promise<string[]> {
  return moreLinks(page).evaluateAll((links) =>
    links.map((link) => {
      for (let el = link.parentElement; el; el = el.parentElement) {
        const heading = el.querySelector('h1, h2, h3, h4, h5, h6, [role="heading"]');
        if (heading) return (heading.textContent ?? '').trim();
      }
      return '';
    }),
  );
}

/** Stanje prikazanega seznama: imena na trenutni strani + številke strani pod seznamom. */
export async function catalogSignature(page: Page) {
  const names = await visibleProductNames(page);
  const pages = (await page.getByRole('button', { name: /^\d+$/ }).allInnerTexts()).map(Number);
  return { names, lastPage: pages.length ? Math.max(...pages) : 1 };
}

/** »Seznam izdelkov« s poljem »Išči izdelek« in zadetki (TP-01, pričakovano 2). */
async function expectProductsPageLoaded(page: Page) {
  await expect(page.getByRole('heading', { name: 'Seznam izdelkov', exact: true })).toBeVisible({ timeout: 45_000 });
  await expect(page.getByText('Išči izdelek', { exact: true })).toBeVisible();
  await expect(searchInput(page)).toBeVisible();
  await expect(moreLinks(page).first(), 'Seznam izdelkov je prazen ali se ni naložil').toBeVisible();
}

/** V navigaciji klikni »Izdelki«. */
export async function openProductsViaNavbar(page: Page) {
  await page.getByRole('navigation').getByRole('link', { name: 'Izdelki', exact: true }).first().click();
  await expectProductsPageLoaded(page);
}

/** Odpri stran »Izdelki« (iz začetne strani prek navigacije). */
export async function openProductsPage(page: Page) {
  await page.goto('/home');
  await openProductsViaNavbar(page);
}

/** Vsi prikazani zadetki vsebujejo iskalni niz. */
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

/** Vnese iskalni niz (gumba za potrditev ni – TP-01) in počaka, da so zadetki filtrirani. */
export async function searchProducts(page: Page, term: string) {
  await searchInput(page).fill(term);
  await expect(searchInput(page)).toHaveValue(term);
  await expectResultsFilteredBy(page, term);
}

/** Kartica zadetka: najmanjši blok z imenom izdelka, povezavo »Več« in (po želji) imenom trgovine. */
function productCardCandidate(page: Page, name: string, store?: string) {
  const parts: Array<Locator | RegExp> = [page.getByRole('heading', { name, exact: true }), moreLinks(page)];
  // Za imenom trgovine ne sme slediti črka (besedilo bloka je lahko zlepljeno).
  if (store) parts.push(new RegExp(`${escapeRegex(store)}(?![A-Za-zČŠŽčšžĆćĐđ])`));
  return block(page, ...parts);
}

/** Poišče kartico zadetka, po potrebi po straneh seznama (gumb »›«). */
export async function findProductCard(page: Page, name: string, store?: string): Promise<Locator> {
  const next = page.getByRole('button', { name: '›', exact: true });
  for (let pageNo = 1; pageNo <= 100; pageNo++) {
    const card = productCardCandidate(page, name, store);
    // Kartica ima natanko eno povezavo »Več«; večji blok pomeni, da zadetka na tej strani ni.
    if ((await card.count()) > 0 && (await card.getByRole('link', { name: 'Več', exact: true }).count()) === 1) return card;
    if ((await next.count()) === 0 || (await next.isDisabled())) break;
    const before = (await visibleProductNames(page)).join('|');
    await next.click();
    await expect.poll(async () => (await visibleProductNames(page)).join('|')).not.toBe(before);
  }
  throw new Error(`Izdelka »${name}«${store ? ` (${store})` : ''} ni med zadetki.`);
}

/** Ime in vse prikazane cene na kartici zadetka. */
export async function readCardInfo(card: Locator) {
  const name = (await card.getByRole('heading').first().innerText()).trim();
  return { name, prices: pricesIn(await card.innerText()) };
}

/**
 * Podrobnosti izdelka: najmanjši blok z naslovom (ime izdelka) in ceno.
 * Blok ne sme biti ponudba v razdelku »Primerjava cen v drugih trgovinah« (postavka seznama)
 * in ga ne sme vsebovati – sicer bi cena »podrobnosti« bila kar cena iz seznama ponudb in bi se
 * preverjanje ujemanja cene izpolnilo samo od sebe.
 */
export function detailsCard(page: Page, name: string): Locator {
  return page
    .locator('div:not(li div)')
    .filter({ has: page.getByRole('heading', { name, exact: true }) })
    .filter({ hasText: /€/ })
    .filter({ hasNot: page.getByRole('heading', { name: 'Primerjava cen v drugih trgovinah' }) })
    .last();
}

/** Stran »Podrobnosti izdelka« z imenom izdelka (TP-01, pričakovano 5). */
export async function expectDetailsPage(page: Page, name: string) {
  await expect(page.getByRole('heading', { name: 'Podrobnosti izdelka', exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name, exact: true }), `Podrobnosti izdelka »${name}« niso prikazane`).toBeVisible({ timeout: 30_000 });
  return detailsCard(page, name);
}

export async function openDetailsFromCard(page: Page, card: Locator, name: string) {
  await card.getByRole('link', { name: 'Več', exact: true }).click();
  return expectDetailsPage(page, name);
}

/** Vse cene, prikazane pri izdelku v podrobnostih. */
export async function readDetailsPrices(details: Locator): Promise<number[]> {
  return pricesIn(await details.innerText());
}

/** »Izdelki« → »Išči izdelek« → kartica (ime + trgovina) → »Več«. */
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
 * Pogoj po testu »podatki ostanejo nespremenjeni«, preverjen prek vmesnika:
 * izdelek je po testu še vedno med zadetki z enakim imenom, trgovino in cenami kot pred testom.
 */
export async function expectProductUnchanged(page: Page, searchTerm: string, name: string, store: string, pricesBefore: number[]) {
  await openProductsPage(page);
  await searchProducts(page, searchTerm);
  const after = await readCardInfo(await findProductCard(page, name, store));
  expect(after.name, 'Ime izdelka se je po testu spremenilo').toBe(name);
  expect(after.prices, 'Cena izdelka se je po testu spremenila').toEqual(pricesBefore);
}
