import { expect, test, type Locator, type Page } from '@playwright/test';
import { TP02, priceText } from './support/testData';
import {
  expectDetailsPage,
  expectProductUnchanged,
  findProductCard,
  openDetailsFromCard,
  openProductsViaNavbar,
  readCardInfo,
  readDetailsPrices,
  searchProducts,
} from './support/products';
import { expectNavbarSignedOut } from './support/auth';
import { block, includesPrice, pricesIn, visibleLines } from './support/ui';

/**
 * TP-02 – Primerjava ponudb istega izdelka med različnimi trgovinami (F-03, posredno F-02)
 * Predpogoji: frontend in backend zagnana; storitev primerjave cen je dosegljiva; prijava ni potrebna.
 * Napisano samo po testnem primeru in vidnem vmesniku (gl. SLEDLJIVOST.md).
 *
 * Ključni pričakovani rezultati so preverjeni neposredno v testu. Kjer bi bilo preverjanje lahko
 * trivialno izpolnjeno (npr. cena, ki jo vsebuje tudi sam razdelek primerjave), test to izrecno
 * izključi, namesto da bi lažno uspel.
 *
 * Omejitev: pogoja po testu »podatki v bazi ostanejo nespremenjeni« prek vmesnika ni mogoče
 * neposredno preveriti. Test samo bere podatke; dodatno preveri, da je izdelek po testu prikazan
 * z enakim imenom, trgovino in ceno.
 */

interface Offer {
  store: string;
  name: string;
  price: number;
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

/** Pričakovano 4: trajno polnomastno mleko, pakiranje 1 l. */
function equivalenceProblems(name: string): string[] {
  const { mustContain, variant, packagingLitres: litres } = TP02.equivalent;
  const problems: string[] = [];
  for (const re of mustContain) if (!re.test(name)) problems.push(`manjka ${re}`);
  if (!variant.test(name)) problems.push('ni polnomastno (3,5 %)');
  const pack = packagingLitres(name);
  if (pack === null || Math.abs(pack - litres) > 1e-9) problems.push(`pakiranje ${pack ?? '?'} l namesto ${litres} l`);
  return problems;
}

/** Razdelek »Primerjava cen v drugih trgovinah«: najmanjši blok z naslovom razdelka in seznamom ponudb. */
function compareSection(page: Page): Locator {
  return block(page, page.getByRole('heading', { name: COMPARE_HEADING, exact: true }), page.getByRole('list'));
}

/**
 * Ponudba (pričakovano 3): trgovina, ime izdelka in cena.
 * Branje je namenoma strogo: ponudba mora imeti natanko eno vrstico z natanko eno ceno in natanko
 * dve besedilni vrstici (daljša = ime izdelka, krajša = trgovina). Če je prikaz drugačen (npr. dodatna
 * oznaka »Akcija«), test pade z izpisom vrstic, namesto da bi napačno prebral trgovino ali ceno.
 */
async function readOffers(section: Locator): Promise<Offer[]> {
  const offers: Offer[] = [];
  for (const item of await section.getByRole('listitem').all()) {
    const lines = (await visibleLines(item)).map((l) => l.trim()).filter(Boolean);
    const priceLines = lines.filter((l) => pricesIn(l).length > 0);
    const textLines = lines.filter((l) => pricesIn(l).length === 0);
    expect(priceLines, `Ponudba mora imeti natanko eno vrstico s ceno: ${JSON.stringify(lines)}`).toHaveLength(1);
    expect(pricesIn(priceLines[0]), `Ponudba mora imeti natanko eno ceno: ${JSON.stringify(lines)}`).toHaveLength(1);
    expect(textLines, `Ponudba mora imeti trgovino in ime izdelka (2 vrstici): ${JSON.stringify(lines)}`).toHaveLength(2);
    const [name, store] = [...textLines].sort((a, b) => b.length - a.length);
    offers.push({ name, store, price: pricesIn(priceLines[0])[0] });
  }
  return offers;
}

/** Varovalo: območje podrobnosti ne sme vsebovati razdelka primerjave, sicer bi bilo preverjanje cene trivialno. */
async function expectDetailsWithoutCompareSection(details: Locator) {
  expect(
    await details.getByRole('heading', { name: COMPARE_HEADING, exact: true }).count(),
    'Območje podrobnosti vključuje razdelek primerjave – cena bi se ujemala že zaradi seznama ponudb',
  ).toBe(0);
}

test('TP-02 – Primerjava ponudb istega izdelka med različnimi trgovinami', async ({ page }) => {
  const { searchTerm, product, minOffers } = TP02;
  let offers: Offer[] = [];
  let section!: Locator;
  let listedPrices: number[] = [];

  await test.step(`Korak 1: V navigaciji klikni »Izdelki« in vnesi »${searchTerm}«`, async () => {
    await page.goto('/home');
    // Predpogoj 3: prijava ni potrebna – uporabnik ni prijavljen.
    await expectNavbarSignedOut(page, expect, 'Predpogoj 3');
    await openProductsViaNavbar(page);
    await searchProducts(page, searchTerm);
    // Pričakovano 1: med zadetki je navedeni izdelek (natančno ime, trgovina Mercator).
    const listed = await readCardInfo(await findProductCard(page, product.name, product.store));
    expect(listed.name, 'Med zadetki ni navedenega izdelka').toBe(product.name);
    listedPrices = listed.prices;
  });

  await test.step('Korak 2: Pri navedenem izdelku klikni »Več«', async () => {
    const card = await findProductCard(page, product.name, product.store);
    const details = await openDetailsFromCard(page, card, product.name);
    // Pričakovano 2: stran »Podrobnosti izdelka« za izbrani izdelek s ceno 1,65 €.
    await expect(page.getByText('Podrobnosti izdelka', { exact: true }).first(), 'Ni odprta stran »Podrobnosti izdelka«').toBeVisible();
    await expect(page.getByText(product.name, { exact: true }).first(), 'Podrobnosti niso za izbrani izdelek').toBeVisible();
    await expectDetailsWithoutCompareSection(details);
    const prices = await readDetailsPrices(details);
    expect(includesPrice(prices, product.price), `Cena v podrobnostih ni ${priceText(product.price)}`).toBe(true);
  });

  await test.step(`Korak 3: Pomakni se do razdelka »${COMPARE_HEADING}«`, async () => {
    // Predpogoj 2: storitev primerjave cen je dosegljiva – razdelek prikaže ponudbe.
    await expect(page.getByRole('heading', { name: COMPARE_HEADING, exact: true }), 'Razdelek primerjave cen ni prikazan').toBeVisible({
      timeout: 30_000,
    });
    section = compareSection(page);
    await section.scrollIntoViewIfNeeded();
    await expect(section).toBeInViewport();
    await expect(section.getByRole('listitem').first(), 'V razdelku ni ponudb').toBeVisible();

    // Pričakovano 3: najmanj dve ponudbi različnih trgovin; pri vsaki trgovina, ime in cena.
    offers = await readOffers(section);
    expect(offers.length, `Pričakovanih je vsaj ${minOffers} ponudb`).toBeGreaterThanOrEqual(minOffers);
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
    // Pričakovano 5: od najnižje do najvišje prikazane cene.
    expect(prices, 'Ponudbe niso urejene od najnižje do najvišje cene').toEqual([...prices].sort((a, b) => a - b));
  });

  await test.step('Korak 6: Klikni prvo (najcenejšo) ponudbo in primerjaj ime ter ceno', async () => {
    const first = offers[0];
    const urlBefore = page.url();
    const isOpenedProduct = first.name === product.name && first.store === product.store;
    await section.getByRole('listitem').first().click();

    // Pričakovano 6: odprejo se podrobnosti izbrane ponudbe ...
    if (!isOpenedProduct) {
      // Brez tega bi test uspel tudi, če klik ne naredi ničesar in ostanemo na prvotnem izdelku.
      await expect(page, 'Klik na najcenejšo ponudbo ni odprl njenih podrobnosti').not.toHaveURL(urlBefore);
    } else {
      test.info().annotations.push({
        type: 'Ročno preverjanje',
        description: 'Najcenejša ponudba je že odprti izdelek – prehoda na novo stran ni mogoče ločiti od ostajanja na isti strani.',
      });
    }
    // ... ime in cena se ujemata s ponudbo v primerjavi.
    const details = await expectDetailsPage(page, first.name);
    await expect(page.getByText(first.name, { exact: true }).first(), `Ime v podrobnostih ni »${first.name}«`).toBeVisible();
    await expectDetailsWithoutCompareSection(details);
    const prices = await readDetailsPrices(details);
    expect(includesPrice(prices, first.price), `Cena v podrobnostih ni ${priceText(first.price)} kot v ponudbi`).toBe(true);
  });

  await test.step('Pogoj po testu: podatki ostanejo nespremenjeni (izdelek ima enako ime, trgovino in ceno)', async () => {
    await expectProductUnchanged(page, searchTerm, product.name, product.store, listedPrices);
  });
});