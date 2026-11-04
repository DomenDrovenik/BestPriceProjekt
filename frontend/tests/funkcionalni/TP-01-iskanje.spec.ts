import { expect, test } from '@playwright/test';
import { API_URL, TP01, priceText } from './support/testData';
import {
  catalogSignature,
  expectResultsFilteredBy,
  findProductCard,
  openDetailsFromCard,
  openProductsViaNavbar,
  readCardInfo,
  readDetailsPrice,
  searchInput,
  trackMutatingApiRequests,
  visibleProductNames,
} from './support/products';
import { getStoredAuthEmail } from './support/auth';

/**
 * TP-01 – Iskanje izdelka po ključni besedi in odpiranje podrobnosti (F-01, F-02)
 * Podrobnosti: preverjata se ime in cena.
 * Predpogoji: frontend in backend zagnana; katalog vsebuje podatke; prijava ni potrebna.
 */
test('TP-01 – Iskanje izdelka po ključni besedi in odpiranje podrobnosti', async ({ page }) => {
  const mutatingRequests = trackMutatingApiRequests(page, API_URL);
  const { searchTerm, product, firstHits } = TP01;
  let fullCatalog!: Awaited<ReturnType<typeof catalogSignature>>;
  let listed!: Awaited<ReturnType<typeof readCardInfo>>;

  await test.step('Korak 1: Odpri začetno stran aplikacije', async () => {
    await page.goto('/home');
    // Pričakovano 1: naloži se začetna stran z navigacijo.
    await expect(page).toHaveURL(/\/home$/);
    const nav = page.getByRole('navigation');
    await expect(nav.getByRole('link', { name: 'BestPrice' })).toBeVisible();
    await expect(nav.getByRole('link', { name: 'Izdelki', exact: true }).first()).toBeVisible();
    // Predpogoj 3: prijava ni potrebna.
    expect(await getStoredAuthEmail(page), 'Test mora teči brez prijavljenega uporabnika').toBeNull();
  });

  await test.step('Korak 2: V navigaciji klikni »Izdelki«', async () => {
    // Pričakovano 2: odpre se »Seznam izdelkov« s poljem »Išči izdelek«.
    await openProductsViaNavbar(page);
    fullCatalog = await catalogSignature(page);
    // Predpogoj 2: katalog vsebuje podatke (tudi izdelke brez iskalnega niza, sicer filtriranja ni mogoče preveriti).
    expect(
      fullCatalog.names.some((n) => !n.toLowerCase().includes(searchTerm)),
      'Pred iskanjem bi morali biti prikazani tudi izdelki brez iskalnega niza',
    ).toBe(true);
  });

  await test.step(`Korak 3: V polje »Išči izdelek« vnesi »${searchTerm}«`, async () => {
    // Pričakovano 3: seznam se med tipkanjem sproti filtrira (gumba za potrditev ni).
    const partial = searchTerm.slice(0, 3);
    await searchInput(page).pressSequentially(partial);
    await expectResultsFilteredBy(page, partial);
    await searchInput(page).pressSequentially(searchTerm.slice(3));
    await expect(searchInput(page)).toHaveValue(searchTerm);
    await expectResultsFilteredBy(page, searchTerm);
    await expect(page.getByRole('button', { name: /išči|potrdi/i }), 'Iskanje ne sme zahtevati gumba za potrditev').toHaveCount(0);
  });

  await test.step(`Korak 4: Preberi imena prvih ${firstHits} zadetkov`, async () => {
    const names = (await visibleProductNames(page)).slice(0, firstHits);
    test.info().annotations.push({ type: `Prvi ${firstHits} zadetki`, description: names.join(' | ') });
    // Pričakovano 4: ime vsakega od prvih treh zadetkov vsebuje »mleko«.
    expect(names, `Pričakovanih je vsaj ${firstHits} zadetkov`).toHaveLength(firstHits);
    for (const n of names) expect(n.toLowerCase(), `Zadetek »${n}« ne vsebuje »${searchTerm}«`).toContain(searchTerm);
  });

  await test.step(`Korak 5: Pri zadetku »${product.name}« klikni »Več«`, async () => {
    const card = await findProductCard(page, product.name, product.store);
    listed = await readCardInfo(card);
    expect(listed.store).toBe(product.store);
    expect(listed.price.current, `Cena na seznamu se razlikuje od specifikacije (${priceText(product.price)})`).toBeCloseTo(product.price, 2);

    // Pričakovano 5: »Podrobnosti izdelka« z enakim imenom in ceno (1,65 €) kot na seznamu.
    // Ime: openDetailsFromCard preveri <h4> z natančnim imenom s kartice.
    const details = await openDetailsFromCard(page, card, listed.name);
    expect(listed.name).toBe(product.name);
    const detailsPrice = await readDetailsPrice(details);
    expect(detailsPrice.current, 'Cena v podrobnostih se ne ujema s ceno na seznamu').toBeCloseTo(listed.price.current, 2);
    await expect(details).toContainText(priceText(product.price));
  });

  await test.step('Korak 6: Klikni »Nazaj« in izbriši vsebino polja »Išči izdelek«', async () => {
    await page.getByRole('button', { name: 'Nazaj' }).click();
    await expect(page).toHaveURL(/\/products$/);
    await expect(searchInput(page)).toBeVisible({ timeout: 45_000 });
    await searchInput(page).clear();

    // Pričakovano 6: polje je prazno, prikazan je celoten seznam izdelkov.
    await expect(searchInput(page)).toHaveValue('');
    await expect.poll(() => catalogSignature(page), { message: 'Po brisanju iskalnega niza ni prikazan celoten seznam' }).toEqual(fullCatalog);
  });

  await test.step('Pogoj po testu: podatki v bazi ostanejo nespremenjeni', async () => {
    expect(mutatingRequests, 'Test ne sme pošiljati zahtev, ki spreminjajo podatke').toEqual([]);
  });
});
