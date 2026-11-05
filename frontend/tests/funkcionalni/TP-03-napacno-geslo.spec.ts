import { expect, test } from '@playwright/test';
import { TEST_USER, TP03 } from './support/testData';
import { emailField, expectNavbarSignedOut, navbarSignInButton } from './support/auth';
import { passwordField } from './support/ui';

/**
 * TP-03 – Zavrnitev prijave z napačnim geslom in nadzor dostopa do profila (F-04, F-05)
 * Predpogoji: testni račun obstaja; uporabnik je odjavljen; Firebase Authentication je dosegljiv.
 * Napisano samo po testnem primeru in vidnem vmesniku (gl. SLEDLJIVOST.md).
 *
 * Vsa preverjanja so mehka (`check`): neuspešno preverjanje se zabeleži, test pa nadaljuje,
 * da se izvedejo vsi koraki. Test je na koncu neuspešen, če je padlo katerokoli preverjanje.
 * Nobeno pričakovanje iz specifikacije ni pogojno – če ni izpolnjeno, test pade.
 *
 * Predpostavke, ki jih test ne more preveriti (gl. SLEDLJIVOST.md):
 *  - Predpogoj 1 (račun obstaja): z napačnim geslom ga ni mogoče potrditi, ker sporočilo
 *    namenoma ne razkrije, ali račun obstaja.
 *  - Predpogoj 3 (Firebase dosegljiv): preverjen posredno – sporočilo mora govoriti o napačni
 *    e-pošti/geslu, ne o splošni napaki ali napaki povezave.
 */
const check = expect.configure({ soft: true });

// Pričakovano 5: sporočilo pove, da sta e-pošta ali geslo napačna (npr. »Napačen e-poštni naslov ali geslo.«).
// Namenoma strogo: splošno »Prišlo je do napake« ali napaka povezave NE zadošča.
const WRONG_CREDENTIALS_MESSAGE =
  /(napačn|nepraviln)\w*\s+(e-poštn\w*\s+naslov|e-pošt\w*|geslo)|e-poštni naslov ali geslo/i;

test('TP-03 – Zavrnitev prijave z napačnim geslom in nadzor dostopa do profila', async ({ page }) => {
  const { email, wrongPassword } = TP03;
  const message = page.getByRole('status').or(page.getByRole('alert'));
  const loginHeading = page.getByRole('heading', { name: 'Prijava', exact: true });
  let messageText = '';

  await test.step('Korak 1: Odpri začetno stran aplikacije', async () => {
    await page.goto('/home');
    // Predpogoj 2 + pričakovano 1: uporabnik ni prijavljen, v navigaciji sta »Prijava« in »Registracija«.
    await expectNavbarSignedOut(page, check, 'Pričakovano 1');
  });

  await test.step('Korak 2: Klikni »Prijava«', async () => {
    await navbarSignInButton(page).first().click();
    // Pričakovano 2: stran »Prijava« s poljema »E-poštni naslov« in »Geslo«.
    await check(loginHeading, 'Stran »Prijava« se ni odprla').toBeVisible();
    await check(page.getByText('E-poštni naslov', { exact: true }), 'Ni polja »E-poštni naslov«').toBeVisible();
    await check(page.getByText('Geslo', { exact: true }), 'Ni polja »Geslo«').toBeVisible();
    await check(emailField(page)).toBeVisible();
    await check(passwordField(page)).toBeVisible();
  });

  await test.step(`Korak 3: V polje »E-poštni naslov« vnesi ${email}`, async () => {
    await emailField(page).fill(email);
    // Pričakovano 3: naslov je vpisan v polje »E-poštni naslov«.
    await check(emailField(page)).toHaveValue(email);
  });

  await test.step('Korak 4: V polje »Geslo« vnesi napačno geslo in klikni »Prijava«', async () => {
    await passwordField(page).fill(wrongPassword);
    await page.getByRole('button', { name: 'Prijava', exact: true }).click();

    // Obvestilo se zajame takoj, ker ga aplikacija lahko po nekaj sekundah samodejno skrije.
    await check(message.first(), 'Po kliku »Prijava« se ni prikazalo obvestilo').toBeVisible({ timeout: 20_000 });
    if ((await message.count()) > 0) messageText = (await message.first().innerText()).trim();

    // Pričakovano 4: prijava je zavrnjena, uporabnik ostane na strani »Prijava« ...
    await check(loginHeading, 'Uporabnik ni ostal na strani »Prijava«').toBeVisible();
    await check(emailField(page), 'Uporabnik ni ostal na strani »Prijava«').toBeVisible();
    await check(page.getByRole('button', { name: 'Prijava', exact: true }), 'Gumb »Prijava« ni na voljo za ponovni poskus').toBeEnabled();
    // ... in v navigaciji sta še vedno »Prijava« in »Registracija« (brez pogoja – zahteva specifikacije).
    await expectNavbarSignedOut(page, check, 'Pričakovano 4 (navigacija na strani »Prijava«)');
  });

  await test.step('Korak 5: Preberi sporočilo o napaki', async () => {
    test.info().annotations.push({ type: 'Prikazano sporočilo', description: messageText || '(ni sporočila)' });

    // Pričakovano 5: slovensko sporočilo o napačni e-pošti/geslu, brez tehničnih kod, ne izda gesla.
    check(messageText, 'Sporočilo ne pove, da sta e-poštni naslov ali geslo napačna').toMatch(WRONG_CREDENTIALS_MESSAGE);
    check(messageText, 'Sporočilo vsebuje tehnično kodo').not.toMatch(/Firebase|auth\/|Error \(/);
    check(messageText, 'Sporočilo izda geslo').not.toContain(wrongPassword);
    // Tudi drugje na strani ne sme biti tehnične kode ali gesla.
    await check(page.getByText(/Firebase: Error|auth\//), 'Stran prikazuje tehnično kodo napake').toHaveCount(0);
    await check(page.getByText(wrongPassword), 'Stran prikazuje vneseno geslo').toHaveCount(0);
  });

  await test.step('Korak 6: V naslovno vrstico vpiši /profile', async () => {
    await page.goto('/profile');
    // Pričakovano 6: preusmeritev na »Prijava« ali sporočilo, da je potrebna prijava.
    const loginRequired = page.getByText(/(potrebna|zahtevana) (je )?prijava|mora[šs] biti prijavljen|za ogled .*prijav/i);
    await check
      .poll(async () => (await loginHeading.count()) > 0 || (await loginRequired.count()) > 0, {
        message: 'Aplikacija ne preusmeri na »Prijava« in ne sporoči, da je potrebna prijava',
        timeout: 15_000,
      })
      .toBe(true);

    // Pričakovano 6: stran profila (ime, alarmi, seznami) se ne prikaže.
    await check(page.getByRole('heading', { name: /alarm/i }), 'Prikazani so alarmi (stran profila)').toHaveCount(0);
    await check(page.getByRole('heading', { name: /seznam/i }), 'Prikazani so seznami (stran profila)').toHaveCount(0);
    await check(page.getByText(TEST_USER.email), 'Prikazani so podatki testnega računa').toHaveCount(0);
  });

  await test.step('Pogoj po testu: uporabnik je odjavljen in seja ni vzpostavljena', async () => {
    await page.goto('/home');
    await expectNavbarSignedOut(page, check, 'Pogoj po testu');
  });
});