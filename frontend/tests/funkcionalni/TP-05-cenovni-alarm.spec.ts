import { expect, test, type Page } from '@playwright/test';
import { TEST_USER, TP05, priceText, testUserPassword } from './support/testData';
import { getStoredAuthEmail, signIn } from './support/auth';
import { openProductDetails, readDetailsPrice } from './support/products';
import {
  activeAlertRows,
  alertEditorCards,
  allActiveAlertRows,
  closeAlertEditor,
  deleteAllActiveAlerts,
  expectNoActiveAlerts,
  openAlertEditor,
  openProfileAndWaitForData,
} from './support/userData';

/**
 * TP-05 – Ustvarjanje cenovnega alarma in preverjanje trajnosti (F-08, F-09, posredno F-02)
 * Predpogoji: uporabnik je prijavljen s test@test.si; na profilu pod »Aktivni alarmi« ni nobenega alarma.
 *
 * Priprava podatkov (ni del testa): obstoječi aktivni alarmi se izbrišejo. Če priprava ne uspe,
 * je test označen kot NEIZVEDEN (skipped, napaka okolja), ne kot neuspešen. Izvaja se samo,
 * ko je prijavljen testni račun.
 * Pospravljanje: če test pade pred korakom 6, afterEach izbriše aktivne alarme.
 *
 * Opomba: specifikacija navaja skrajšano ime »Trajno polnomastno Pomursko mleko, 1 l«;
 * aplikacija alarm shrani in prikaže s polnim imenom izdelka iz kataloga.
 */

/** true od trenutka, ko je alarm morda shranjen, do uspešnega koraka 6. */
let alarmMayExist = false;

/** Brisanje alarmov je dovoljeno samo na testnem računu. */
async function assertTestAccount(page: Page) {
  expect(await getStoredAuthEmail(page), `Prijavljen ni testni račun ${TEST_USER.email} – brisanje alarmov ni dovoljeno`).toBe(TEST_USER.email);
}

test.afterEach(async ({ page }) => {
  if (!alarmMayExist) return;
  await test.step('Pospravljanje: test je padel pred korakom 6 – izbriši aktivne alarme', async () => {
    await openProfileAndWaitForData(page, TEST_USER.email);
    await assertTestAccount(page);
    const removed = await deleteAllActiveAlerts(page);
    test.info().annotations.push({ type: 'Pospravljanje', description: `Izbrisanih aktivnih alarmov: ${removed}` });
    await expectNoActiveAlerts(page);
    alarmMayExist = false;
  });
});

test('TP-05 – Ustvarjanje cenovnega alarma in preverjanje trajnosti', async ({ page }) => {
  test.setTimeout(180_000);
  alarmMayExist = false;
  const { searchTerm, product, targetPriceInput, targetPriceDisplayed } = TP05;
  const alarmDialog = page.getByRole('dialog').filter({ hasText: 'Obvesti me, ko cena pade pod' });

  await test.step('Predpogoj 1: uporabnik je prijavljen s testnim računom', async () => {
    await signIn(page, TEST_USER.email, testUserPassword());
  });

  await test.step('Predpogoj 2 (priprava podatkov): pod »Aktivni alarmi« ni nobenega alarma', async () => {
    try {
      await openProfileAndWaitForData(page, TEST_USER.email);
      await assertTestAccount(page);
      const removed = await deleteAllActiveAlerts(page);
      if (removed > 0) {
        test.info().annotations.push({ type: 'Priprava podatkov', description: `Pred testom izbrisanih aktivnih alarmov: ${removed}` });
      }
      await expectNoActiveAlerts(page);
    } catch (error) {
      // Specifikacija: neuspešna priprava pomeni, da test ni izveden (napaka okolja), ne neuspeh.
      const reason = error instanceof Error ? error.message.split('\n')[0] : String(error);
      test.info().annotations.push({ type: 'Test ni izveden', description: `Priprava podatkov ni uspela: ${reason}` });
      test.skip(true, `Priprava podatkov ni uspela (napaka okolja): ${reason}`);
    }
  });

  await test.step(`Korak 1: Odpri »Izdelki«, vpiši »${searchTerm}« in pri izdelku (${product.store}) klikni »Več«`, async () => {
    const { details, cardInfo } = await openProductDetails(page, searchTerm, product.name, product.store);
    expect(cardInfo.store).toBe(product.store);
    // Pričakovano 1: stran izdelka s ceno 1,65 € in gumbom »Nastavi alarm«.
    expect((await readDetailsPrice(details)).current, `Cena ni ${priceText(product.price)}`).toBeCloseTo(product.price, 2);
    await expect(page.getByRole('button', { name: 'Nastavi alarm', exact: true })).toBeVisible();
  });

  await test.step('Korak 2: Klikni »Nastavi alarm«', async () => {
    await page.getByRole('button', { name: 'Nastavi alarm', exact: true }).click();
    // Pričakovano 2: okno »Obvesti me, ko cena pade pod« s poljem »Ciljna cena (€)«.
    await expect(alarmDialog).toBeVisible();
    await expect(alarmDialog.getByText('Ciljna cena (€)')).toBeVisible();
    await expect(alarmDialog.locator('input[type="number"]')).toBeVisible();
  });

  await test.step(`Korak 3: Vpiši ${targetPriceInput}, e-pošte ne vklopi in klikni »Shrani«`, async () => {
    const input = alarmDialog.locator('input[type="number"]'); // MT Input z oznako »Ciljna cena (€)«
    await input.fill(targetPriceInput);
    await expect(input).toHaveValue(targetPriceInput);
    const email = alarmDialog.getByRole('checkbox', { name: 'Želim prejeti email obvestilo' });
    await expect(email, 'E-poštno obveščanje mora biti privzeto izključeno').not.toBeChecked();
    alarmMayExist = true;
    await alarmDialog.getByRole('button', { name: 'Shrani', exact: true }).click();

    // Pričakovano 3: sporočilo »Opozorilo za ceno je bilo uspešno nastavljeno!«.
    await expect(page.getByRole('status').filter({ hasText: 'Opozorilo za ceno je bilo uspešno nastavljeno!' })).toBeVisible();
    await expect(page.getByRole('status').filter({ hasText: /Napaka|Vnesi veljavno|Najprej se prijavi/ })).toHaveCount(0);
    await expect(alarmDialog).toBeHidden();
  });

  /** Pričakovano 4/5: pod »Aktivni alarmi« natanko en alarm – izdelek, 1.48 €, e-pošta izklopljena. */
  const expectExactlyTheCreatedAlarm = async (message: string) => {
    await expect(page.getByRole('heading', { name: 'Cenovni alarmi' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Aktivni alarmi' })).toBeVisible();
    await expect(allActiveAlertRows(page), message).toHaveCount(1);
    await expect(activeAlertRows(page, product.name, targetPriceDisplayed), 'Edini aktivni alarm ni za izbrani izdelek s ciljno ceno 1.48 €').toHaveCount(1);
    await expect(allActiveAlertRows(page)).toContainText('Email obvestilo izklopljeno');
  };

  await test.step('Korak 4: V navigaciji klikni »Profil«', async () => {
    await openProfileAndWaitForData(page, TEST_USER.email, true);
    await expectExactlyTheCreatedAlarm('Pod »Aktivni alarmi« ni natanko en alarm');
  });

  await test.step('Korak 5: Osveži stran', async () => {
    await page.reload();
    await expect(page.getByText(TEST_USER.email, { exact: true })).toBeVisible({ timeout: 30_000 });
    await expectExactlyTheCreatedAlarm('Po osvežitvi pod »Aktivni alarmi« ni natanko en alarm (ni shranjen ali je podvojen)');
  });

  await test.step('Korak 6: Klikni »Uredi alarme« in pri ustvarjenem alarmu »Izbriši«', async () => {
    const editor = await openAlertEditor(page);
    const card = alertEditorCards(editor, product.name, targetPriceDisplayed);
    await expect(card).toHaveCount(1);
    await card.getByRole('button', { name: 'Izbriši', exact: true }).click();
    await expect(card).toHaveCount(0);
    await closeAlertEditor(editor);
    // Pričakovano 6: pod »Aktivni alarmi« ni nobenega alarma.
    await expectNoActiveAlerts(page);
  });

  await test.step('Pogoj po testu: pod »Aktivni alarmi« ni nobenega alarma (tudi po osvežitvi)', async () => {
    await page.reload();
    await expect(page.getByText(TEST_USER.email, { exact: true })).toBeVisible({ timeout: 30_000 });
    await expectNoActiveAlerts(page);
    alarmMayExist = false;
  });
});
