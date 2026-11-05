import { expect, type Locator, type Page } from '@playwright/test';
import { openProfileFromNavbar } from './auth';
import { block, escapeRegex, hasRedButton, priceRegex, redButtonIn, waitForStableContent } from './ui';

/* ------------------------------------------------------------------ */
/* Profil (TP-05)                                                      */
/* ------------------------------------------------------------------ */

/** »Profil« v navigaciji → razdelek »Cenovni alarmi« z gumbom »Uredi alarme«; počaka, da se vsebina ustali. */
export async function openProfile(page: Page) {
  if ((await page.getByRole('navigation').count()) === 0) await page.goto('/home');
  await openProfileFromNavbar(page);
  await expect(page.getByRole('heading', { name: /Cenovni alarmi/ })).toBeVisible({ timeout: 30_000 });
  await expect(page.getByRole('button', { name: 'Uredi alarme', exact: true })).toBeVisible();
  await waitForStableContent(page);
}

/** Vsak alarm pod »Aktivni alarmi« ima oznako e-poštnega obvestila (»Email obvestilo izklopljeno«). */
export function activeAlarmLabels(page: Page): Locator {
  return page.getByText(/Email obvestilo/);
}

/** Alarm za izdelek s ciljno ceno in oznako e-poštnega obvestila. */
export function activeAlarm(page: Page, productName: string, targetPrice: number): Locator {
  return page.getByText(new RegExp(`${escapeRegex(productName)}.*${priceRegex(targetPrice).source}.*Email obvestilo`));
}

/** Pod »Aktivni alarmi« ni nobenega alarma. */
export async function expectNoActiveAlarms(page: Page, assert: typeof expect = expect) {
  await assert(page.getByText('Aktivni alarmi', { exact: true })).toBeVisible();
  await assert(activeAlarmLabels(page), 'Pod »Aktivni alarmi« so še alarmi').toHaveCount(0);
}

/** Okno, ki se odpre ob »Uredi alarme«: vsebuje gumb »Zapri«. */
export function alarmEditor(page: Page): Locator {
  return page.getByRole('dialog').filter({ has: page.getByRole('button', { name: 'Zapri', exact: true }) });
}

export async function openAlarmEditor(page: Page) {
  await page.getByRole('button', { name: 'Uredi alarme', exact: true }).click();
  const dialog = alarmEditor(page);
  await expect(dialog).toBeVisible();
  return dialog;
}

export async function closeAlarmEditor(dialog: Locator) {
  await dialog.getByRole('button', { name: 'Zapri', exact: true }).click();
  await expect(dialog).toBeHidden();
}

/** Alarm v urejevalniku: najmanjši blok z imenom izdelka, ciljno ceno in gumbom »Izbriši«. */
export function alarmInEditor(page: Page, productName: string, targetPrice: number): Locator {
  return block(alarmEditor(page), page.getByText(productName, { exact: true }), page.getByRole('button', { name: 'Izbriši', exact: true }), priceRegex(targetPrice));
}

/** Priprava podatkov TP-05: »Uredi alarme« → pri vsakem alarmu »Izbriši« → »Zapri«. Vrne število izbrisanih. */
export async function deleteAllAlarms(page: Page): Promise<number> {
  const dialog = await openAlarmEditor(page);
  const deleteButtons = dialog.getByRole('button', { name: 'Izbriši', exact: true });
  const count = await deleteButtons.count();
  for (let remaining = count; remaining > 0; remaining--) {
    await deleteButtons.first().click();
    await expect(deleteButtons).toHaveCount(remaining - 1);
  }
  await closeAlarmEditor(dialog);
  return count;
}

/* ------------------------------------------------------------------ */
/* Nakupovalni seznam (TP-04)                                          */
/* ------------------------------------------------------------------ */

export function newListField(page: Page) {
  return page.getByPlaceholder('Ime novega seznama...');
}

/** Iskalnik »Išči izdelek po trgovinah« v odprtem seznamu. */
export function storeSearchField(page: Page) {
  return page.getByPlaceholder(/^Išči izdelek po trgovinah/);
}

/** V navigaciji klikni »Nakupovalni seznam«; počaka na polje »Ime novega seznama...« in da se seznami naložijo. */
export async function openShoppingListPage(page: Page) {
  await page.getByRole('navigation').getByRole('link', { name: 'Nakupovalni seznam', exact: true }).first().click();
  await expect(newListField(page)).toBeVisible({ timeout: 30_000 });
  await waitForStableContent(page);
}

/**
 * Odprt seznam: najmanjši blok z imenom seznama in iskalnikom »Išči izdelek po trgovinah«,
 * ki ne vsebuje polja za nov seznam (to spada k pregledu seznamov, ne k odprtemu seznamu).
 */
export async function openedList(page: Page, listName: string): Promise<Locator> {
  const area = block(page, page.getByText(listName, { exact: true }), storeSearchField(page));
  await expect(area, `Seznam »${listName}« ni odprt`).toBeVisible();
  await expect(area.getByPlaceholder('Ime novega seznama...'), `Seznam »${listName}« ni odprt`).toHaveCount(0);
  return area;
}

/** Klikni na seznam (ime seznama med seznami) in vrni odprt seznam. */
export async function selectList(page: Page, listName: string) {
  await page.getByText(listName, { exact: true }).first().click();
  return openedList(page, listName);
}

/**
 * Rdeča barva ikone koša se bere iz izrisane strani. Miška, ki po kliku na zadetek obstane nad
 * novo vrstico, lahko z učinkom »hover« barvo začasno spremeni – zato jo pred branjem umakni.
 */
async function redFlags(items: Locator): Promise<boolean[]> {
  await items.page().mouse.move(0, 0);
  return hasRedButton(items);
}

/**
 * Vrstice, ki (ne)imajo rdeče ikone koša. Barve in seznam vrstic se bereta ločeno; če se seznam
 * med branjema spremeni (ponovni izris), se branje ponovi. Neusklajeno branje se nikoli ne vrne –
 * tudi ne kot »prazno«, ker bi sicer preverjanje »izdelka ni na seznamu« lahko lažno uspelo.
 */
async function rowsByRedButton(rows: Locator, wantRed: boolean): Promise<Locator[]> {
  for (let attempt = 1; attempt <= 10; attempt++) {
    const red = await redFlags(rows);
    const all = await rows.all();
    if (all.length === red.length) return all.filter((_, i) => red[i] === wantRed);
  }
  throw new Error('Vrstice seznama se med branjem nenehno spreminjajo – stanja ni mogoče zanesljivo prebrati.');
}

/** Postavke odprtega seznama za izdelek: vrstice z imenom izdelka in rdečo ikono koša. */
export async function productRows(list: Locator, productName: string): Promise<Locator[]> {
  return rowsByRedButton(list.getByRole('listitem').filter({ hasText: productName }), true);
}

/** Vse postavke odprtega seznama (vrstice z rdečo ikono koša). */
export async function countListItems(list: Locator): Promise<number> {
  return (await redFlags(list.getByRole('listitem'))).filter(Boolean).length;
}

/** Zadetki iskalnika v odprtem seznamu: vrstice s ceno, brez rdeče ikone koša. */
export async function searchHits(list: Locator): Promise<Locator[]> {
  return rowsByRedButton(list.getByRole('listitem').filter({ hasText: /\d[.,]\d{2}\s*€/ }), false);
}

/**
 * Izdelek je prikazan pod napisom trgovine (npr. »Mercator«) s ceno – v bloku z napisom, ne v celotnem seznamu.
 * Blok mora vsebovati POSTAVKO SEZNAMA (vrstico z rdečo ikono koša), ne le zadetek iskalnika,
 * sicer bi preverjanje uspelo že zaradi zadetka »Mercator … 1,65 €« pod iskalnikom.
 */
export async function expectItemUnderStore(page: Page, productName: string, store: string, price: number) {
  const group = block(page, page.getByText(store, { exact: true }), page.getByText(new RegExp(escapeRegex(productName))));
  await expect(group, `Izdelek ni prikazan pod trgovino ${store}`).toBeVisible();
  await expect(group.getByPlaceholder(/^Išči izdelek po trgovinah/), `Izdelek ni prikazan pod trgovino ${store}`).toHaveCount(0);
  await expect
    .poll(async () => (await productRows(group, productName)).length, {
      message: `Pod trgovino ${store} ni postavke seznama »${productName}« (z ikono koša)`,
    })
    .toBe(1);
  await expect(group, `Pod trgovino ${store} ni cene ${price.toFixed(2)} €`).toContainText(priceRegex(price));
}

/** Klik na rdečo ikono koša v vrstici. */
export async function removeRow(row: Locator) {
  await (await redButtonIn(row)).click();
}
