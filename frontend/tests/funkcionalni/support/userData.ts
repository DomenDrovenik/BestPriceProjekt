import { expect, type Locator, type Page } from '@playwright/test';
import { navbarAvatar } from './auth';

/* ------------------------------------------------------------------ */
/* Profil                                                              */
/* ------------------------------------------------------------------ */

/**
 * Odpre /profile in počaka, da se naložijo podatki iz Firestore.
 * Profil naloži uporabnika, sezname in alarme v enem Promise.all, zato prikaz
 * e-pošte pomeni, da so naloženi tudi seznami in alarmi.
 * viaNavbar: avatar v navigaciji → »Profil« (»Profil« je v meniju uporabnika).
 */
export async function openProfileAndWaitForData(page: Page, email: string, viaNavbar = false) {
  if (viaNavbar) {
    await navbarAvatar(page).click();
    await page.getByRole('button', { name: 'Profil', exact: true }).first().click();
  } else {
    await page.goto('/profile');
  }
  await expect(page).toHaveURL(/\/profile$/);
  await expect(page.getByText(email, { exact: true }), 'Podatki profila iz Firestore se niso naložili').toBeVisible({ timeout: 30_000 });
}

/** Vsi seznami v kartici »Seznami« na profilu (ime + »N elementov«). */
export function profileAllListEntries(page: Page): Locator {
  return page.locator('li').filter({ hasText: /\d+ elementov$/ });
}

/* ------------------------------------------------------------------ */
/* Nakupovalni seznami (/shopping-list)                                */
/* ------------------------------------------------------------------ */

export async function openShoppingListPage(page: Page) {
  await page.getByRole('navigation').getByRole('link', { name: 'Nakupovalni seznam', exact: true }).first().click();
  await expect(page).toHaveURL(/\/shopping-list$/);
  await expect(page.getByRole('heading', { level: 1, name: 'Tvoji nakupovalni seznami' })).toBeVisible({ timeout: 30_000 });
}

/** Kartica seznama (Card z razredom cursor-pointer; aplikacija nima data-testid). */
export function listCard(page: Page, listName: string): Locator {
  return page.locator('div.cursor-pointer').filter({ has: page.getByRole('heading', { level: 6, name: listName, exact: true }) });
}

export function allListCards(page: Page): Locator {
  return page.locator('div.cursor-pointer').filter({ has: page.getByRole('heading', { level: 6 }) });
}

/** Podrobnosti izbranega seznama: kartica z <h5> imenom seznama in gumbom »Kopiraj«. */
export function listDetails(page: Page, listName: string): Locator {
  return page
    .locator('div:has(> h5)')
    .filter({ has: page.getByRole('heading', { level: 5, name: listName, exact: true }) })
    .filter({ has: page.getByRole('button', { name: 'Kopiraj', exact: true }) });
}

/** Postavke seznama: <li> s potrditvenim poljem (izključi zadetke iskalnika in priporočila). */
export function listItemRows(details: Locator): Locator {
  return details.locator('li:has(input[type="checkbox"])');
}

export function listItemRowsFor(details: Locator, productName: string): Locator {
  return listItemRows(details).filter({ hasText: productName });
}

/** Skupina postavk pod naslovom trgovine (npr. »Mercator«). */
export function storeGroup(details: Locator, store: string): Locator {
  return details.locator(`div:has(> p:text-is(${JSON.stringify(store)})):has(> ul)`);
}

export async function selectList(page: Page, listName: string) {
  await listCard(page, listName).first().click();
  await expect(listCard(page, listName).first()).toHaveClass(/ring-2/);
  const details = listDetails(page, listName);
  await expect(details).toBeVisible();
  return details;
}

/**
 * Stran nima indikatorja nalaganja: število seznamov se prebere s profila,
 * nato se počaka, da jih /shopping-list prikaže vse.
 */
export async function waitForAllLists(page: Page, expected: number) {
  await expect(allListCards(page), 'Stran ni naložila vseh seznamov iz Firestore').toHaveCount(expected, { timeout: 30_000 });
}

/** Odstrani postavko z rdečo ikono koša (zadnji gumb v vrstici). */
export async function removeItemRow(row: Locator) {
  await row.getByRole('button').last().click();
}

/* ------------------------------------------------------------------ */
/* Cenovni alarmi (profil)                                             */
/* ------------------------------------------------------------------ */

/** Vrstice v razdelku »Aktivni alarmi« za izdelek in ciljno ceno. */
export function activeAlertRows(page: Page, productName: string, displayedTarget: string): Locator {
  return page
    .locator('span')
    .filter({ hasText: productName })
    .filter({ has: page.locator('em', { hasText: `(${displayedTarget})` }) });
}

export async function openAlertEditor(page: Page) {
  await page.getByRole('button', { name: 'Uredi alarme', exact: true }).click();
  const dialog = page.getByRole('dialog').filter({ hasText: 'Urejanje cenovnih alarmov' });
  await expect(dialog).toBeVisible();
  return dialog;
}

export async function closeAlertEditor(dialog: Locator) {
  await dialog.getByRole('button', { name: 'Zapri', exact: true }).click();
  await expect(dialog).toBeHidden();
}

/** Kartice alarmov v urejevalniku, ki ustrezajo izdelku in ciljni ceni. */
export function alertEditorCards(dialog: Locator, productName: string, displayedTarget: string): Locator {
  return dialog.locator(
    `div:has(> div > p:text-is(${JSON.stringify(productName)})):has(p:text-is(${JSON.stringify(`Cilj: ${displayedTarget}`)}))`,
  );
}

/**
 * Vse vrstice pod »Aktivni alarmi« (med naslovoma »Aktivni alarmi« in »Izpolnjeni alarmi«).
 * Obe skupini imata enako oznako vrstic, zato se ločita po položaju glede na naslova.
 */
export function allActiveAlertRows(page: Page): Locator {
  return page.locator(
    'xpath=//h6[normalize-space()="Aktivni alarmi"]/following-sibling::div[contains(@class,"py-1")]' +
      '[not(preceding-sibling::h6[normalize-space()="Izpolnjeni alarmi"])]',
  );
}

/** Na profilu pod »Aktivni alarmi« ni nobenega alarma. */
export async function expectNoActiveAlerts(page: Page) {
  await expect(allActiveAlertRows(page), 'Pod »Aktivni alarmi« so še alarmi').toHaveCount(0);
  await expect(page.getByText('Ni aktivnih alarmov', { exact: true })).toBeVisible();
}

/**
 * »Uredi alarme« → pri vsakem alarmu »Izbriši« → »Zapri«.
 * »Izbriši« je prikazan samo pri aktivnih (nesproženih) alarmih. Vrne število izbrisanih.
 */
export async function deleteAllActiveAlerts(page: Page): Promise<number> {
  const dialog = await openAlertEditor(page);
  const deleteButtons = dialog.getByRole('button', { name: 'Izbriši', exact: true });
  const count = await deleteButtons.count();
  for (let remaining = count; remaining > 0; remaining--) {
    await deleteButtons.first().click();
    await expect(deleteButtons).toHaveCount(remaining - 1);
  }
  await closeAlertEditor(dialog);
  return count;
}
