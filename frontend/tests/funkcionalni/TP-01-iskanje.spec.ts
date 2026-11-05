import { expect, test } from '@playwright/test';
import { TP01, priceText } from './support/testData';
import {
  catalogSignature,
  expectProductUnchanged,
  findProductCard,
  openDetailsFromCard,
  openProductsViaNavbar,
  readCardInfo,
  readDetailsPrices,
  searchInput,
  visibleProductNames,
} from './support/products';
import { expectNavbarSignedOut } from './support/auth';
import { includesPrice } from './support/ui';

/**
 * TP-01 – Iskanje izdelka po ključni besedi in odpiranje podrobnosti (F-01, F-02)
 * Predpogoji: frontend in backend zagnana; katalog vsebuje podatke; prijava ni potrebna.
 * Napisano samo po testnem primeru in vidnem vmesniku (gl. SLEDLJIVOST.md).
 *
 * Ključni pričakovani rezultati so preverjeni neposredno v testu (ne samo v pomožnih funkcijah),
 * da je iz testa razvidno, kaj se preverja, in da šibko pomožno preverjanje ne more povzročiti
 * lažnega uspeha.
 *
 * Omejitev: pogoja po testu »podatki v bazi ostanejo nespremenjeni« prek vmesnika ni mogoče
 * neposredno preveriti. Test samo bere podatke, zato baze ne spreminja; dodatno preveri, da je
 * izdelek po testu prikazan z enakim imenom, trgovino in ceno.
 */
test('TP-01 – Iskanje izdelka po ključni besedi in odpiranje podrobnosti', async ({ page }) => {
  const { searchTerm, product, firstHits } = TP01;
  const term = searchTerm.toLowerCase();
  let fullCatalog!: Awaited<ReturnType<typeof catalogSignature>>;
  let listedPrices: number[] = [];

  /**
   * Seznam je filtriran: ni prazen, vsako prikazano ime vsebuje niz in prikaz se razlikuje od
   * nefiltriranega. Števila zadetkov ne primerjamo, ker seznam lahko prikazuje omejeno število
   * izdelkov na stran (filtriran in celoten seznam imata lahko enako dolžino). Ker je v koraku 2
   * preverjeno, da celoten seznam vsebuje tudi izdelke brez niza, »allMatch« dokazuje filtriranje.
   */
  async function expectFilteredBy(fragment: string) {
    const f = fragment.toLowerCase();
    await expect
      .poll(
        async () => {
          const names = await visibleProductNames(page);
          return {
            notEmpty: names.length > 0,
            changed: JSON.stringify(names) !== JSON.stringify(fullCatalog.names),
            allMatch: names.every((n) => n.toLowerCase().includes(f)),
          };
        },
        { message: `Seznam se po vnosu »${fragment}« ni sproti filtriral (prazen, nespremenjen ali z neustreznimi zadetki)` },
      )
      .toEqual({ notEmpty: true, changed: true, allMatch: true });
  }

  await test.step('Korak 1: Odpri začetno stran aplikacije', async () => {
    await page.goto('/home');
    // Pričakovano 1: naloži se začetna stran z navigacijo.
    await expect(page.getByRole('navigation').first(), 'Začetna stran nima navigacije').toBeVisible();
    await expect(
      page.getByRole('navigation').getByRole('link', { name: 'Izdelki', exact: true }).first(),
      'V navigaciji ni povezave »Izdelki«',
    ).toBeVisible();
    // Predpogoj 3: prijava ni potrebna – uporabnik ni prijavljen.
    await expectNavbarSignedOut(page, expect, 'Predpogoj 3');
  });

  await test.step('Korak 2: V navigaciji klikni »Izdelki«', async () => {
    await openProductsViaNavbar(page);
    // Pričakovano 2: odpre se »Seznam izdelkov« s poljem »Išči izdelek«.
    await expect(page.getByText('Seznam izdelkov', { exact: true }).first(), 'Ni odprt »Seznam izdelkov«').toBeVisible();
    await expect(searchInput(page), 'Ni polja »Išči izdelek«').toBeVisible();
    await expect(searchInput(page), 'Polje »Išči izdelek« ni prazno').toHaveValue('');

    fullCatalog = await catalogSignature(page);
    // Predpogoj 2: katalog vsebuje podatke (tudi izdelke brez iskalnega niza, sicer filtriranja ni mogoče preveriti).
    expect(fullCatalog.names.length, 'Katalog je prazen').toBeGreaterThan(0);
    expect(
      fullCatalog.names.some((n) => !n.toLowerCase().includes(term)),
      'Pred iskanjem bi morali biti prikazani tudi izdelki brez iskalnega niza',
    ).toBe(true);
  });

  await test.step(`Korak 3: V polje »Išči izdelek« vnesi »${searchTerm}«`, async () => {
    // Pričakovano 3: seznam se med tipkanjem sproti filtrira (gumba za potrditev ni, Enter se ne pritisne).
    const partial = searchTerm.slice(0, 3);
    await searchInput(page).pressSequentially(partial);
    await expectFilteredBy(partial);
    await searchInput(page).pressSequentially(searchTerm.slice(3));
    await expect(searchInput(page)).toHaveValue(searchTerm);
    await expectFilteredBy(searchTerm);
  });

  await test.step(`Korak 4: Preberi imena prvih ${firstHits} zadetkov`, async () => {
    const names = (await visibleProductNames(page)).slice(0, firstHits);
    test.info().annotations.push({ type: `Prvi ${firstHits} zadetki`, description: names.join(' | ') });
    // Pričakovano 4: ime vsakega od prvih treh zadetkov vsebuje »mleko«.
    expect(names, `Pričakovanih je vsaj ${firstHits} zadetkov`).toHaveLength(firstHits);
    for (const n of names) expect(n.toLowerCase(), `Zadetek »${n}« ne vsebuje »${searchTerm}«`).toContain(term);
  });

  await test.step(`Korak 5: Pri zadetku »${product.name}« klikni »Več«`, async () => {
    // Vhodni podatek: pričakovan zadetek (Mercator, 1,65 €) – ime se mora ujemati natančno.
    const card = await findProductCard(page, product.name, product.store);
    const listed = await readCardInfo(card);
    listedPrices = listed.prices;
    expect(listed.name, 'Na seznamu je izbran napačen izdelek').toBe(product.name);
    expect(includesPrice(listed.prices, product.price), `Cena na seznamu ni ${priceText(product.price)}`).toBe(true);

    const details = await openDetailsFromCard(page, card, listed.name);

    // Pričakovano 5: odpre se »Podrobnosti izdelka« z enakim imenom in ceno (1,65 €) kot na seznamu.
    await expect(page.getByText('Podrobnosti izdelka', { exact: true }).first(), 'Ni odprta stran »Podrobnosti izdelka«').toBeVisible();
    await expect(page.getByText(product.name, { exact: true }).first(), 'Ime v podrobnostih se ne ujema z imenom na seznamu').toBeVisible();
    const detailPrices = await readDetailsPrices(details);
    expect(includesPrice(detailPrices, product.price), `Cena v podrobnostih ni ${priceText(product.price)}`).toBe(true);
    expect(detailPrices, 'Cena v podrobnostih se ne ujema s ceno na seznamu').toEqual(listed.prices);
  });

  await test.step('Korak 6: Klikni »Nazaj« in izbriši vsebino polja »Išči izdelek«', async () => {
    await page.getByRole('button', { name: 'Nazaj' }).or(page.getByRole('link', { name: 'Nazaj' })).first().click();
    await expect(searchInput(page), 'Po kliku »Nazaj« ni prikazan seznam izdelkov').toBeVisible({ timeout: 45_000 });
    await searchInput(page).clear();

    // Pričakovano 6: polje je prazno, prikazan je celoten seznam izdelkov.
    await expect(searchInput(page)).toHaveValue('');
    await expect
      .poll(() => catalogSignature(page), { message: 'Po brisanju iskalnega niza ni prikazan celoten seznam' })
      .toEqual(fullCatalog);
  });

  await test.step('Pogoj po testu: podatki ostanejo nespremenjeni (izdelek ima enako ime, trgovino in ceno)', async () => {
    await expectProductUnchanged(page, searchTerm, product.name, product.store, listedPrices);
  });
});