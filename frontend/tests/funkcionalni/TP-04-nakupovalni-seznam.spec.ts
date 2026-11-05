import { expect, test } from '@playwright/test';
import { TEST_USER, TP04, testUserPassword } from './support/testData';
import { signIn } from './support/auth';
import { escapeRegex, includesPrice, pricesIn, visibleLines, waitForStableContent } from './support/ui';
import {
  countListItems,
  expectItemUnderStore,
  newListField,
  openShoppingListPage,
  openedList,
  productRows,
  removeRow,
  searchHits,
  selectList,
  storeSearchField,
} from './support/userData';

/**
 * TP-04 – Dodajanje izdelka v nakupovalni seznam in preverjanje trajnosti zapisa (F-06, F-07)
 * Predpogoji: uporabnik je prijavljen s test@test.si; izdelka ni na seznamu »Testni nakup«
 * (oziroma seznam še ne obstaja).
 * Napisano samo po testnem primeru in vidnem vmesniku (gl. SLEDLJIVOST.md).
 *
 * Opomba: testni primer navaja skrajšano ime »Trajno polnomastno Pomursko mleko, 1 l«;
 * zadetek se išče po polnem imenu iz TP-01/TP-02 (support/testData.ts → PRODUCT.name).
 *
 * Ponovljivost: če test pade pred korakom 6, izdelek ostane na seznamu. Ob naslednji izvedbi ga
 * priprava podatkov v koraku 2 odstrani (samo ta izdelek, samo na seznamu »Testni nakup«).
 */
test('TP-04 – Dodajanje izdelka v nakupovalni seznam in preverjanje trajnosti zapisa', async ({ page }) => {
  test.setTimeout(180_000);
  const { listName, searchTerm, product } = TP04;
  let initialItemCount = 0;

  /** Vrstica izdelka na seznamu: natanko ena, s ceno 1,65 €, pod trgovino Mercator. */
  async function expectAddedOnceWithPrice(list: Awaited<ReturnType<typeof openedList>>, context: string) {
    const rows = await productRows(list, product.name);
    expect(rows, `${context}: izdelek ni na seznamu natanko enkrat`).toHaveLength(1);
    const rowText = await rows[0].innerText();
    expect(includesPrice(pricesIn(rowText), product.price), `${context}: cena izdelka na seznamu ni ${product.price} €`).toBe(true);
    await expectItemUnderStore(page, product.name, product.store, product.price);
  }

  await test.step('Predpogoj 1: uporabnik je prijavljen s testnim računom', async () => {
    await signIn(page, TEST_USER.email, testUserPassword());
    // Prijava mora biti dejansko vzpostavljena – sicer test ne preverja prijavljenega uporabnika.
    const nav = page.getByRole('navigation');
    await expect(
      nav.getByRole('link', { name: 'Profil' }).or(nav.getByRole('button', { name: 'Profil' })).first(),
      'Predpogoj 1: uporabnik ni prijavljen (v navigaciji ni »Profil«)',
    ).toBeVisible();
    await expect(nav.getByRole('button', { name: 'Prijava', exact: true }), 'Predpogoj 1: v navigaciji je še »Prijava«').toHaveCount(0);
  });

  await test.step('Korak 1: Odpri stran »Nakupovalni seznam«', async () => {
    await openShoppingListPage(page);
    // Pričakovano 1: prikazani so uporabnikovi seznami in polje »Ime novega seznama...«.
    await expect(newListField(page), 'Ni polja »Ime novega seznama...«').toBeVisible();
    await expect(newListField(page)).toBeEnabled();
  });

  await test.step(`Korak 2: Po potrebi ustvari seznam »${listName}« in ga odpri`, async () => {
    const exists = (await page.getByText(listName, { exact: true }).count()) > 0;
    if (!exists) {
      await newListField(page).fill(listName);
      await page.getByRole('button', { name: 'Ustvari seznam', exact: true }).click();
      await expect(page.getByText(listName, { exact: true }).first(), `Seznam »${listName}« ni bil ustvarjen`).toBeVisible();
    }
    test.info().annotations.push({ type: 'Seznam', description: exists ? 'že obstajal' : 'ustvarjen v testu' });

    const list = await selectList(page, listName);

    // Predpogoj 2: izdelka ni na seznamu. Ostanek prekinjene izvedbe se odstrani (priprava podatkov).
    let leftovers = await productRows(list, product.name);
    if (leftovers.length > 0) {
      test.info().annotations.push({ type: 'Priprava podatkov', description: `Odstranjenih ${leftovers.length} ostankov izdelka iz prejšnje izvedbe.` });
      while (leftovers.length > 0) {
        await removeRow(leftovers[0]);
        await expect.poll(async () => (await productRows(list, product.name)).length).toBe(leftovers.length - 1);
        leftovers = await productRows(list, product.name);
      }
    }
    // Pričakovano 2: seznam je viden med seznami in odprt; navedenega izdelka na njem ni.
    await expect(page.getByText(listName, { exact: true }).first(), `Seznam »${listName}« ni viden`).toBeVisible();
    await expect(storeSearchField(page), `Seznam »${listName}« ni odprt (ni iskalnika »Išči izdelek po trgovinah«)`).toBeVisible();
    expect(await productRows(list, product.name), 'Izdelek je že na seznamu').toHaveLength(0);
    initialItemCount = await countListItems(list);
  });

  await test.step(`Korak 3: V iskalnik »Išči izdelek po trgovinah« vpiši »${searchTerm}«`, async () => {
    const list = await openedList(page, listName);
    await storeSearchField(page).fill(searchTerm);
    await expect(storeSearchField(page)).toHaveValue(searchTerm);
    // Pričakovano 3: pod iskalnikom se prikažejo zadetki z imenom izdelka, trgovino in ceno.
    await expect.poll(async () => (await searchHits(list)).length, { message: 'Pod iskalnikom ni zadetkov', timeout: 30_000 }).toBeGreaterThan(0);
    const hitTexts: string[] = [];
    for (const hit of await searchHits(list)) {
      const lines = await visibleLines(hit);
      hitTexts.push(lines.join(' '));
      expect(lines.some((l) => pricesIn(l).length > 0), `Zadetek »${lines[0]}« nima cene`).toBe(true);
      // Poleg cene morata biti prikazana vsaj dva podatka: ime izdelka in trgovina.
      const texts = lines
        .flatMap((l) => l.split(/\s+–\s+/))
        .map((t) => t.replace(/\d+(?:[.,]\d+)?\s*€.*$/, '').trim())
        .filter(Boolean);
      expect(texts.length, `Zadetek »${lines[0]}« nima imena izdelka in trgovine`).toBeGreaterThanOrEqual(2);
    }
    // Zadetki morajo biti odziv na iskanje, ne poljuben seznam izdelkov.
    expect(
      hitTexts.some((t) => t.toLowerCase().includes(searchTerm.toLowerCase())),
      `Noben zadetek ne vsebuje »${searchTerm}«`,
    ).toBe(true);
  });

  await test.step(`Korak 4: Klikni zadetek »${product.shortName}« trgovine ${product.store}`, async () => {
    const list = await openedList(page, listName);
    const hits = [];
    for (const hit of await searchHits(list)) {
      const text = await hit.innerText();
      if (text.includes(product.name) && new RegExp(`${escapeRegex(product.store)}(?![A-Za-zČŠŽčšž])`).test(text)) hits.push(hit);
    }
    expect(hits, `Med zadetki ni »${product.name}« trgovine ${product.store}`).toHaveLength(1);
    await hits[0].click();

    // Pričakovano 4: izdelek se prikaže na seznamu pod trgovino Mercator s ceno 1,65 €.
    await expect.poll(async () => (await productRows(list, product.name)).length, { message: 'Izdelek ni bil dodan na seznam' }).toBe(1);
    await expectAddedOnceWithPrice(list, 'Pričakovano 4');
    // Dodan je bil natanko en izdelek (in nič drugega).
    await expect.poll(() => countListItems(list), { message: 'Na seznam ni bil dodan natanko en izdelek' }).toBe(initialItemCount + 1);
  });

  await test.step(`Korak 5: Osveži stran in ponovno odpri seznam »${listName}«`, async () => {
    await page.reload();
    await expect(newListField(page)).toBeVisible({ timeout: 30_000 });
    await waitForStableContent(page);
    const list = await selectList(page, listName);

    // Pričakovano 5: izdelek je še vedno pod trgovino Mercator s ceno 1,65 €, natanko enkrat.
    await expectAddedOnceWithPrice(list, 'Pričakovano 5 (po osvežitvi)');
    expect(await countListItems(list), 'Po osvežitvi se je število izdelkov na seznamu spremenilo').toBe(initialItemCount + 1);
  });

  await test.step('Korak 6: Klikni rdečo ikono koša pri dodanem izdelku', async () => {
    const list = await openedList(page, listName);
    const rows = await productRows(list, product.name);
    expect(rows, 'Ni vrstice izdelka, ki bi jo lahko odstranili').toHaveLength(1);
    await removeRow(rows[0]);
    // Pričakovano 6: izdelka ni več na seznamu (seznam je v začetnem stanju).
    await expect.poll(async () => (await productRows(list, product.name)).length, { message: 'Izdelek je še vedno na seznamu' }).toBe(0);
    await expect.poll(() => countListItems(list), { message: 'Seznam ni v začetnem stanju' }).toBe(initialItemCount);
  });

  await test.step('Pogoj po testu: dodani izdelek je s seznama odstranjen (tudi po osvežitvi)', async () => {
    await page.reload();
    await expect(newListField(page)).toBeVisible({ timeout: 30_000 });
    await waitForStableContent(page);
    const list = await selectList(page, listName);
    expect(await productRows(list, product.name), 'Izdelek je po osvežitvi spet na seznamu').toHaveLength(0);
    expect(await countListItems(list), 'Seznam po osvežitvi ni v začetnem stanju').toBe(initialItemCount);
  });
});