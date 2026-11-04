import { expect, test, type Locator, type Page } from '@playwright/test';
import { TEST_USER, TP04, priceText, testUserPassword } from './support/testData';
import { signIn } from './support/auth';
import {
  listCard,
  listItemRows,
  listItemRowsFor,
  openProfileAndWaitForData,
  openShoppingListPage,
  profileAllListEntries,
  removeItemRow,
  selectList,
  storeGroup,
  waitForAllLists,
} from './support/userData';

/**
 * TP-04 – Dodajanje izdelka v nakupovalni seznam in preverjanje trajnosti zapisa (F-06, F-07)
 * Predpogoji: uporabnik je prijavljen s test@test.si; izdelka ni na seznamu »Testni nakup«
 * (oziroma seznam še ne obstaja).
 *
 * Opomba: specifikacija navaja skrajšano ime »Trajno polnomastno Pomursko mleko, 1 l«;
 * v katalogu je izdelek zapisan s polnim imenom (support/testData.ts → PRODUCT.name).
 */

const STORES = ['Tuš', 'Mercator', 'Jager', 'Lidl', 'Hofer'];

function searchBox(page: Page) {
  return page.getByPlaceholder('Išči izdelek po trgovinah (npr. Coca-Cola)');
}

/** Zadetki iskalnika »Išči izdelek po trgovinah« (spustni seznam pod poljem). */
function searchHits(details: Locator): Locator {
  return details.locator('ul.absolute > li');
}

test('TP-04 – Dodajanje izdelka v nakupovalni seznam in preverjanje trajnosti zapisa', async ({ page }) => {
  test.setTimeout(180_000);
  const { listName, searchTerm, product } = TP04;
  let listsOnProfile = 0;
  let createdList = false;
  let initialItemCount = 0;
  let details!: Locator;

  await test.step('Predpogoj 1: uporabnik je prijavljen s testnim računom', async () => {
    await signIn(page, TEST_USER.email, testUserPassword());
    await openProfileAndWaitForData(page, TEST_USER.email);
    listsOnProfile = await profileAllListEntries(page).count();
  });

  await test.step('Korak 1: Odpri stran »Nakupovalni seznam«', async () => {
    await openShoppingListPage(page);
    // Pričakovano 1: prikazani so uporabnikovi seznami in polje »Ime novega seznama...«.
    await waitForAllLists(page, listsOnProfile);
    await expect(page.getByPlaceholder('Ime novega seznama...')).toBeEnabled();
  });

  await test.step(`Korak 2: Po potrebi ustvari seznam »${listName}« in ga odpri`, async () => {
    if ((await listCard(page, listName).count()) === 0) {
      await page.getByPlaceholder('Ime novega seznama...').fill(listName);
      await page.getByRole('button', { name: 'Ustvari seznam', exact: true }).click();
      await expect(listCard(page, listName), 'Seznam ni bil ustvarjen').toHaveCount(1);
      createdList = true;
    }
    const existing = await listCard(page, listName).count();
    if (existing > 1) {
      test.info().annotations.push({ type: 'Opozorilo', description: `Obstaja ${existing} seznamov »${listName}«; uporabljen je prvi.` });
    }
    test.info().annotations.push({ type: 'Seznam', description: createdList ? 'ustvarjen v testu' : 'že obstajal' });

    details = await selectList(page, listName);

    // Predpogoj 2: izdelka ni na seznamu. Ostanek prekinjene izvedbe se odstrani (priprava podatkov).
    const leftovers = listItemRowsFor(details, product.name);
    const leftoverCount = await leftovers.count();
    if (leftoverCount > 0) {
      test.info().annotations.push({ type: 'Priprava podatkov', description: `Odstranjenih ${leftoverCount} ostankov izdelka iz prejšnje izvedbe.` });
      for (let i = leftoverCount; i > 0; i--) {
        await removeItemRow(leftovers.first());
        await expect(leftovers).toHaveCount(i - 1);
      }
    }
    // Pričakovano 2: seznam je viden in odprt; navedenega izdelka na njem ni.
    await expect(listCard(page, listName).first()).toBeVisible();
    await expect(listItemRowsFor(details, product.name)).toHaveCount(0);
    initialItemCount = await listItemRows(details).count();
  });

  await test.step(`Korak 3: V iskalnik »Išči izdelek po trgovinah« vpiši »${searchTerm}«`, async () => {
    await searchBox(page).fill(searchTerm);
    await expect(searchBox(page)).toHaveValue(searchTerm);
    // Pričakovano 3: zadetki z imenom izdelka, trgovino in ceno.
    const hits = searchHits(details);
    await expect(hits.first(), 'Pod iskalnikom ni zadetkov').toBeVisible({ timeout: 30_000 });
    const lines = await hits.locator(':scope > div:nth-child(2)').allInnerTexts();
    const names = await hits.locator(':scope > div:nth-child(1)').allInnerTexts();
    for (const [i, line] of lines.entries()) {
      expect(names[i].trim().length, 'Zadetek nima imena izdelka').toBeGreaterThan(0);
      expect(line, `Zadetek »${names[i]}« nima trgovine in cene`).toMatch(new RegExp(`^(${STORES.join('|')}) – \\d+\\.\\d{2} €`));
    }
  });

  await test.step(`Korak 4: Klikni zadetek »${product.shortName}« trgovine ${product.store}`, async () => {
    const hit = searchHits(details)
      .filter({ hasText: product.name })
      .filter({ has: page.locator('div', { hasText: new RegExp(`^${product.store} – `) }) });
    await expect(hit, `Med zadetki ni »${product.name}« (${product.store})`).toHaveCount(1);
    await hit.click();

    // Pričakovano 4: izdelek pod trgovino Mercator s ceno 1,65 €.
    const row = listItemRowsFor(storeGroup(details, product.store), product.name);
    await expect(row, `Izdelek ni prikazan pod trgovino ${product.store}`).toHaveCount(1);
    await expect(row).toContainText(priceText(product.price));
  });

  await test.step(`Korak 5: Osveži stran in ponovno odpri seznam »${listName}«`, async () => {
    await page.reload();
    await expect(page.getByRole('heading', { level: 1, name: 'Tvoji nakupovalni seznami' })).toBeVisible({ timeout: 30_000 });
    await waitForAllLists(page, listsOnProfile + (createdList ? 1 : 0));
    details = await selectList(page, listName);

    // Pričakovano 5: izdelek je še vedno pod Mercator s ceno 1,65 €, natanko enkrat.
    await expect(listItemRowsFor(details, product.name), 'Izdelek ni na seznamu natanko enkrat').toHaveCount(1);
    const row = listItemRowsFor(storeGroup(details, product.store), product.name);
    await expect(row).toHaveCount(1);
    await expect(row).toContainText(priceText(product.price));
  });

  await test.step('Korak 6: Klikni rdečo ikono koša pri dodanem izdelku', async () => {
    await removeItemRow(listItemRowsFor(details, product.name));
    // Pričakovano 6: izdelka ni več; seznam je v začetnem stanju.
    await expect(listItemRowsFor(details, product.name)).toHaveCount(0);
    await expect(listItemRows(details)).toHaveCount(initialItemCount);
    if (initialItemCount === 0) await expect(details.getByText('Seznam je prazen.')).toBeVisible();
  });

  await test.step('Pogoj po testu: dodani izdelek je trajno odstranjen', async () => {
    await page.reload();
    await waitForAllLists(page, listsOnProfile + (createdList ? 1 : 0));
    const after = await selectList(page, listName);
    await expect(listItemRowsFor(after, product.name)).toHaveCount(0);
    await expect(listItemRows(after)).toHaveCount(initialItemCount);
    // Seznam »Testni nakup« ostane (specifikacija predvideva njegovo ponovno uporabo).
    await expect(listCard(page, listName).first()).toBeVisible();
  });
});
