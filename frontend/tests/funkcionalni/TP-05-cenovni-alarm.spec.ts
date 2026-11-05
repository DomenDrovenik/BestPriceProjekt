import { expect, test, type Locator, type Page } from '@playwright/test';
import { TEST_USER, TP05, priceText, testUserPassword } from './support/testData';
import { openProfileFromNavbar, signIn } from './support/auth';
import { openProductDetails, readDetailsPrices } from './support/products';
import { block, fieldNear, includesPrice, waitForStableContent } from './support/ui';
import {
  activeAlarm,
  activeAlarmLabels,
  alarmInEditor,
  closeAlarmEditor,
  deleteAllAlarms,
  expectNoActiveAlarms,
  openAlarmEditor,
  openProfile,
} from './support/userData';

/**
 * TP-05 – Ustvarjanje cenovnega alarma in preverjanje trajnosti (F-08, F-09, posredno F-02)
 * Predpogoji: uporabnik je prijavljen s test@test.si; na profilu pod »Aktivni alarmi« ni nobenega alarma.
 * Napisano samo po testnem primeru in vidnem vmesniku (gl. SLEDLJIVOST.md).
 *
 * Priprava podatkov (iz testnega primera, ni del testa): »Profil« → »Uredi alarme« → pri vsakem
 * alarmu »Izbriši« → »Zapri«. Če ne uspe, je test NEIZVEDEN (skipped, napaka okolja), ne neuspešen –
 * tako določa testni primer, zato blok catch napake ne skriva, ampak test izrecno označi kot neizveden.
 * Izvaja se samo na testnem računu: pred vsakim brisanjem test preveri, da je na profilu prikazan
 * testni račun.
 * Pospravljanje: če test pade pred korakom 6, afterEach alarme izbriše.
 *
 * Opomba: testni primer navaja skrajšano ime »Trajno polnomastno Pomursko mleko, 1 l«;
 * alarm se išče po polnem imenu iz TP-01/TP-02 (support/testData.ts → PRODUCT.name).
 */

const COMPARE_HEADING = 'Primerjava cen v drugih trgovinah';

/** true od trenutka, ko je alarm morda shranjen, do uspešnega koraka 6. */
let alarmMayExist = false;

/** Brisanje vseh alarmov je dovoljeno samo na testnem računu (testni primer, priprava podatkov). */
async function deleteAllAlarmsOfTestUser(page: Page): Promise<number> {
  await openProfile(page);
  await expect(page.getByText(TEST_USER.email).first(), `Na profilu ni testnega računa ${TEST_USER.email} – brisanje alarmov prekinjeno`).toBeVisible();
  return deleteAllAlarms(page);
}

test.afterEach(async ({ page }) => {
  if (!alarmMayExist) return;
  await test.step('Pospravljanje: test je padel pred korakom 6 – izbriši alarme', async () => {
    const removed = await deleteAllAlarmsOfTestUser(page);
    test.info().annotations.push({ type: 'Pospravljanje', description: `Izbrisanih alarmov: ${removed}` });
    await expectNoActiveAlarms(page);
    alarmMayExist = false;
  });
});

test('TP-05 – Ustvarjanje cenovnega alarma in preverjanje trajnosti', async ({ page }) => {
  test.setTimeout(180_000);
  alarmMayExist = false;
  const { searchTerm, product, targetPrice, targetPriceInput } = TP05;
  const alarmDialog = page.getByRole('dialog').filter({ hasText: 'Obvesti me, ko cena pade pod' });
  // Prikaz ciljne cene na profilu (specifikacija: »1.48 €«); dovoljena je tudi decimalna vejica.
  const targetPriceShown = new RegExp(`(?<![\\d.,])${String(targetPrice).replace('.', '[.,]')}\\s*€`);

  await test.step('Predpogoj 1: uporabnik je prijavljen s testnim računom', async () => {
    await signIn(page, TEST_USER.email, testUserPassword());
    // Prijava mora biti dejansko vzpostavljena – sicer bi priprava podatkov test le preskočila.
    const nav = page.getByRole('navigation');
    await expect(
      nav.getByRole('link', { name: 'Profil' }).or(nav.getByRole('button', { name: 'Profil' })).first(),
      'Predpogoj 1: uporabnik ni prijavljen (v navigaciji ni »Profil«)',
    ).toBeVisible();
    await expect(nav.getByRole('button', { name: 'Prijava', exact: true }), 'Predpogoj 1: v navigaciji je še »Prijava«').toHaveCount(0);
  });

  await test.step('Predpogoj 2 (priprava podatkov): pod »Aktivni alarmi« ni nobenega alarma', async () => {
    try {
      const removed = await deleteAllAlarmsOfTestUser(page);
      if (removed > 0) test.info().annotations.push({ type: 'Priprava podatkov', description: `Pred testom izbrisanih alarmov: ${removed}` });
      await expectNoActiveAlarms(page);
    } catch (error) {
      // Testni primer: neuspešna priprava pomeni, da test ni izveden (napaka okolja), ne neuspeh.
      const reason = error instanceof Error ? error.message.split('\n')[0] : String(error);
      test.info().annotations.push({ type: 'Test ni izveden', description: `Priprava podatkov ni uspela: ${reason}` });
      test.skip(true, `Priprava podatkov ni uspela (napaka okolja): ${reason}`);
    }
  });

  await test.step(`Korak 1: Odpri »Izdelki«, vpiši »${searchTerm}« in pri izdelku (${product.store}) klikni »Več«`, async () => {
    const { details } = await openProductDetails(page, searchTerm, product.name, product.store);
    // Pričakovano 1: stran izdelka s ceno 1,65 € in gumbom »Nastavi alarm«.
    await expect(page.getByText(product.name, { exact: true }).first(), 'Ni odprta stran izbranega izdelka').toBeVisible();
    expect(
      await (details as Locator).getByRole('heading', { name: COMPARE_HEADING, exact: true }).count(),
      'Območje podrobnosti vključuje razdelek primerjave – cena bi se ujemala že zaradi seznama ponudb',
    ).toBe(0);
    expect(includesPrice(await readDetailsPrices(details), product.price), `Cena ni ${priceText(product.price)}`).toBe(true);
    await expect(page.getByRole('button', { name: 'Nastavi alarm', exact: true })).toBeVisible();
  });

  await test.step('Korak 2: Klikni »Nastavi alarm«', async () => {
    await page.getByRole('button', { name: 'Nastavi alarm', exact: true }).click();
    // Pričakovano 2: okno »Obvesti me, ko cena pade pod« s poljem »Ciljna cena (€)«.
    await expect(alarmDialog, 'Ni okna »Obvesti me, ko cena pade pod«').toBeVisible();
    await expect(fieldNear(page, alarmDialog, 'Ciljna cena (€)'), 'Ni polja »Ciljna cena (€)«').toBeVisible();
  });

  await test.step(`Korak 3: V polje »Ciljna cena (€)« vpiši ${targetPriceInput}, e-pošte ne vklopi in klikni »Shrani«`, async () => {
    const input = fieldNear(page, alarmDialog, 'Ciljna cena (€)');
    await input.fill(targetPriceInput);
    await expect(input).toHaveValue(targetPriceInput);
    // Vhodni podatek: e-poštno obveščanje izključeno (privzeto).
    // Najprej preveri, da izbira obstaja – sicer bi bilo »ni vklopljeno« izpolnjeno brez preverjanja.
    const emailOption = alarmDialog
      .getByRole('checkbox', { name: /e-?mail|e-pošt/i })
      .or(alarmDialog.getByRole('switch', { name: /e-?mail|e-pošt/i }));
    await expect(emailOption, 'V oknu ni izbire za e-poštno obveščanje').toHaveCount(1);
    await expect(emailOption, 'E-poštno obveščanje mora biti privzeto izključeno').not.toBeChecked();
    alarmMayExist = true;
    await alarmDialog.getByRole('button', { name: 'Shrani', exact: true }).click();

    // Pričakovano 3: sporočilo »Opozorilo za ceno je bilo uspešno nastavljeno!«.
    await expect(page.getByText('Opozorilo za ceno je bilo uspešno nastavljeno!'), 'Ni potrditve o nastavljenem alarmu').toBeVisible();
  });

  /** Pričakovano 4/5: pod »Aktivni alarmi« natanko en alarm – izdelek, 1.48 €, »Email obvestilo izklopljeno«. */
  const expectExactlyTheCreatedAlarm = async (message: string) => {
    await expect(page.getByRole('heading', { name: /Cenovni alarmi/ })).toBeVisible();
    await expect(page.getByText('Aktivni alarmi', { exact: true })).toBeVisible();
    await expect(activeAlarmLabels(page), message).toHaveCount(1);
    const alarm = activeAlarm(page, product.name, targetPrice);
    await expect(alarm, `Edini alarm ni za izbrani izdelek s ciljno ceno ${priceText(targetPrice)}`).toHaveCount(1);
    // Izrecno preverjanje vsebine (neodvisno od ujemanja v pomožni funkciji).
    await expect(alarm, 'Alarm nima imena izbranega izdelka').toContainText(product.name);
    await expect(alarm, `Alarm nima ciljne cene ${targetPrice} €`).toContainText(targetPriceShown);
    await expect(alarm, 'Alarm nima oznake »Email obvestilo izklopljeno«').toContainText('Email obvestilo izklopljeno');
  };

  await test.step('Korak 4: V navigaciji klikni »Profil«', async () => {
    await openProfileFromNavbar(page);
    await expect(page.getByRole('button', { name: 'Uredi alarme', exact: true })).toBeVisible({ timeout: 30_000 });
    await waitForStableContent(page);
    await expectExactlyTheCreatedAlarm('Pod »Aktivni alarmi« ni natanko en alarm');
  });

  await test.step('Korak 5: Osveži stran', async () => {
    await page.reload();
    await expect(page.getByRole('button', { name: 'Uredi alarme', exact: true })).toBeVisible({ timeout: 30_000 });
    await waitForStableContent(page);
    // Pričakovano 5: po osvežitvi je pod »Aktivni alarmi« še vedno natanko en alarm z enakimi podatki.
    await expectExactlyTheCreatedAlarm('Po osvežitvi pod »Aktivni alarmi« ni natanko en alarm (ni shranjen ali je podvojen)');
  });

  await test.step('Korak 6: Klikni »Uredi alarme« in pri ustvarjenem alarmu klikni »Izbriši«', async () => {
    const editor = await openAlarmEditor(page);
    const created = alarmInEditor(page, product.name, targetPrice);
    await expect(created, 'V urejevalniku ni ustvarjenega alarma').toBeVisible();
    await created.getByRole('button', { name: 'Izbriši', exact: true }).click();
    await expect(
      block(editor, page.getByText(product.name, { exact: true }), page.getByRole('button', { name: 'Izbriši', exact: true })),
      'Alarm je po kliku »Izbriši« še vedno v urejevalniku',
    ).toHaveCount(0);
    await closeAlarmEditor(editor);
    // Pričakovano 6: pod »Aktivni alarmi« ni nobenega alarma.
    // Na isti strani je bil alarm prej prikazan (korak 5), zato prehod z 1 na 0 dokazuje izbris.
    await expect(activeAlarmLabels(page), 'Pod »Aktivni alarmi« je po izbrisu še vedno alarm').toHaveCount(0);
    await expectNoActiveAlarms(page);
  });

  await test.step('Pogoj po testu: pod »Aktivni alarmi« ni nobenega alarma (tudi po osvežitvi)', async () => {
    await page.reload();
    await expect(page.getByRole('button', { name: 'Uredi alarme', exact: true })).toBeVisible({ timeout: 30_000 });
    await waitForStableContent(page);
    await expect(activeAlarmLabels(page), 'Po osvežitvi je pod »Aktivni alarmi« spet alarm').toHaveCount(0);
    await expectNoActiveAlarms(page);
    alarmMayExist = false;
  });
});