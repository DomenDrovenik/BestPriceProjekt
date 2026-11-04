import { expect, test, type Page } from '@playwright/test';
import { TEST_USER, TP03 } from './support/testData';
import { getStoredAuthEmail, navbarSignInButton, navbarSignUpButton } from './support/auth';

/**
 * TP-03 – Zavrnitev prijave z napačnim geslom in nadzor dostopa do profila (F-04, F-05)
 * Predpogoji: testni račun obstaja; uporabnik je odjavljen; Firebase Authentication je dosegljiv.
 *
 * Vsa preverjanja so mehka (`check`): neuspešno preverjanje se zabeleži, test pa nadaljuje,
 * da se izvedejo vsi koraki in vsi pričakovani rezultati. Test je na koncu neuspešen,
 * če je padlo katerokoli preverjanje. Prekine se le, če akcije (klik, vnos) ni mogoče izvesti.
 *
 * Opomba o implementaciji: na /sign-in aplikacija navigacije ne prikaže (App.jsx: hideNavbar),
 * zato se »v navigaciji sta še vedno Prijava in Registracija« preveri po odhodu s strani (korak 6).
 */
const check = expect.configure({ soft: true });

async function checkSignedOut(page: Page, message = 'V brskalniku je shranjena Firebase seja – uporabnik je prijavljen') {
  await check.poll(() => getStoredAuthEmail(page), { message, timeout: 15_000 }).toBeNull();
}

async function checkNavbarSignedOut(page: Page, context: string) {
  await check(navbarSignInButton(page).first(), `${context}: v navigaciji ni gumba »Prijava«`).toBeVisible();
  await check(navbarSignUpButton(page).first(), `${context}: v navigaciji ni gumba »Registracija«`).toBeVisible();
}

test('TP-03 – Zavrnitev prijave z napačnim geslom in nadzor dostopa do profila', async ({ page }) => {
  const { email, wrongPassword } = TP03;

  await test.step('Korak 1: Odpri začetno stran aplikacije', async () => {
    await page.goto('/home');
    // Predpogoj 2 + pričakovano 1: uporabnik ni prijavljen, v navigaciji sta »Prijava« in »Registracija«.
    await checkSignedOut(page, 'Predpogoj 2: uporabnik mora biti odjavljen');
    await checkNavbarSignedOut(page, 'Pričakovano 1');
  });

  await test.step('Korak 2: Klikni »Prijava«', async () => {
    await navbarSignInButton(page).first().click();
    // Pričakovano 2: stran »Prijava« s poljema »E-poštni naslov« in »Geslo«.
    await check(page).toHaveURL(/\/sign-in$/);
    await check(page.getByRole('heading', { level: 2, name: 'Prijava' })).toBeVisible();
    const form = page.locator('form');
    await check(form.getByText('E-poštni naslov', { exact: true }), 'Ni oznake »E-poštni naslov«').toBeVisible();
    await check(form.getByText('Geslo', { exact: true }), 'Ni oznake »Geslo«').toBeVisible();
    await check(page.getByPlaceholder('name@mail.com')).toBeVisible();
    await check(page.getByPlaceholder('********'), 'Polje za geslo ne skrije vnosa').toHaveAttribute('type', 'password');
  });

  await test.step(`Korak 3: V polje »E-poštni naslov« vnesi ${email}`, async () => {
    await page.getByPlaceholder('name@mail.com').fill(email);
    // Pričakovano 3: naslov je vpisan.
    await check(page.getByPlaceholder('name@mail.com')).toHaveValue(email);
  });

  await test.step('Korak 4: V polje »Geslo« vnesi napačno geslo in klikni »Prijava«', async () => {
    await page.getByPlaceholder('********').fill(wrongPassword);
    // Predpogoj 3: Firebase Authentication je dosegljiv in zavrne napačno geslo.
    const authResponse = page.waitForResponse(
      (r) => r.url().includes('identitytoolkit.googleapis.com') && r.url().includes('signInWithPassword'),
      { timeout: 30_000 },
    );
    await page.getByRole('button', { name: 'Prijava', exact: true }).click();
    const response = await authResponse.catch(() => null);
    check(response, 'Predpogoj 3: Firebase Authentication ni odgovoril na poskus prijave').not.toBeNull();
    if (response) {
      check(response.status(), 'Firebase Authentication ni zavrnil napačnega gesla').toBe(400);
      const body = await response.json().catch(() => ({}));
      check(String(body?.error?.message), 'Nepričakovan razlog zavrnitve (npr. TOO_MANY_ATTEMPTS_TRY_LATER)').toMatch(
        /^(INVALID_LOGIN_CREDENTIALS|INVALID_PASSWORD)/,
      );
    }

    // Pričakovano 4: prijava zavrnjena, uporabnik ostane na strani »Prijava«, seja ni vzpostavljena.
    await check(page, 'Uporabnik ni ostal na strani »Prijava«').toHaveURL(/\/sign-in$/);
    await check(page.getByRole('heading', { level: 2, name: 'Prijava' })).toBeVisible();
    await check(page.getByRole('button', { name: 'Prijava', exact: true }), 'Gumb »Prijava« ni omogočen za ponovni poskus').toBeEnabled();
    await checkSignedOut(page, 'Po napačnem geslu je bila vzpostavljena seja');
  });

  await test.step('Korak 5: Preberi sporočilo o napaki', async () => {
    const toast = page.getByRole('status').first();
    await check(toast, 'Sporočilo o napaki ni prikazano').toBeVisible();
    const message = (await toast.count()) > 0 ? (await toast.innerText()).trim() : '';
    test.info().annotations.push({ type: 'Prikazano sporočilo', description: message || '(ni sporočila)' });

    // Pričakovano 5: slovensko sporočilo, brez tehničnih kod, ne izda gesla.
    check(message, 'Sporočilo ni v slovenščini oz. ne pove, da je prijava neuspešna').toMatch(/napa[čk]|neuspe[šs]n/i);
    check(message, 'Sporočilo vsebuje tehnično kodo').not.toMatch(/Firebase|auth\/|Error \(/);
    check(message, 'Sporočilo izda geslo').not.toContain(wrongPassword);
    // Tudi drugje na strani (napaka v obrazcu) ne sme biti tehnične kode ali gesla.
    await check(page.locator('body'), 'Stran prikazuje tehnično kodo napake').not.toContainText(/Firebase: Error|auth\//);
    await check(page.locator('body'), 'Stran prikazuje vneseno geslo').not.toContainText(wrongPassword);
  });

  await test.step('Korak 6: V naslovno vrstico vpiši /profile', async () => {
    await page.goto('/profile');
    // Pričakovano 6: preusmeritev na »Prijava« ali sporočilo, da je potrebna prijava.
    const loginRequired = page.getByText(/(potrebna|zahtevana) (je )?prijava|prijavi se|mora[šs] biti prijavljen|za ogled .*prijav/i);
    await check
      .poll(async () => /\/sign-in$/.test(page.url()) || (await loginRequired.count()) > 0, {
        message: 'Aplikacija ne preusmeri na »Prijava« in ne sporoči, da je potrebna prijava',
        timeout: 15_000,
      })
      .toBe(true);

    // Pričakovano 6: stran profila (ime, alarmi, seznami) se ne prikaže.
    await check(page.getByRole('heading', { name: 'Cenovni alarmi' }), 'Prikazan je razdelek »Cenovni alarmi«').toHaveCount(0);
    await check(page.getByRole('heading', { name: 'Seznami' }), 'Prikazan je razdelek »Seznami«').toHaveCount(0);
    await check(page.getByRole('button', { name: 'Uredi profil' }), 'Prikazan je gumb »Uredi profil«').toHaveCount(0);
    await check(page.getByText(TEST_USER.email), 'Prikazana je e-pošta testnega računa').toHaveCount(0);

    // Pričakovano 4 (dopolnitev): izven /sign-in navigacija še vedno ponuja »Prijava« in »Registracija«.
    if (!/\/sign-in$/.test(page.url())) await checkNavbarSignedOut(page, 'Pričakovano 4');
  });

  await test.step('Pogoj po testu: uporabnik je odjavljen, seja ni vzpostavljena', async () => {
    await checkSignedOut(page);
  });
});
