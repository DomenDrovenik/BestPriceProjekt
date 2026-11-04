import { expect, test } from '@playwright/test';
import { TEST_USER, TP03 } from './support/testData';
import { expectNavbarSignedOut, expectSignedOut, getStoredAuthEmail, navbarSignInButton } from './support/auth';

/**
 * TP-03 – Zavrnitev prijave z napačnim geslom in nadzor dostopa do profila (F-04, F-05)
 * Predpogoji: testni račun obstaja; uporabnik je odjavljen; Firebase Authentication je dosegljiv.
 *
 * Opomba o implementaciji: na /sign-in aplikacija navigacije ne prikaže (App.jsx: hideNavbar),
 * zato se »v navigaciji sta še vedno Prijava in Registracija« preveri po odhodu s strani (korak 6).
 */
test('TP-03 – Zavrnitev prijave z napačnim geslom in nadzor dostopa do profila', async ({ page }) => {
  const { email, wrongPassword } = TP03;

  await test.step('Korak 1: Odpri začetno stran aplikacije', async () => {
    await page.goto('/home');
    // Predpogoj 2 + pričakovano 1: uporabnik ni prijavljen, v navigaciji sta »Prijava« in »Registracija«.
    await expectSignedOut(page);
    await expectNavbarSignedOut(page);
  });

  await test.step('Korak 2: Klikni »Prijava«', async () => {
    await navbarSignInButton(page).first().click();
    // Pričakovano 2: stran »Prijava« s poljema »E-poštni naslov« in »Geslo«.
    await expect(page).toHaveURL(/\/sign-in$/);
    await expect(page.getByRole('heading', { level: 2, name: 'Prijava' })).toBeVisible();
    const form = page.locator('form');
    await expect(form.getByText('E-poštni naslov', { exact: true })).toBeVisible();
    await expect(form.getByText('Geslo', { exact: true })).toBeVisible();
    await expect(page.getByPlaceholder('name@mail.com')).toBeVisible();
    await expect(page.getByPlaceholder('********')).toHaveAttribute('type', 'password');
  });

  await test.step(`Korak 3: V polje »E-poštni naslov« vnesi ${email}`, async () => {
    await page.getByPlaceholder('name@mail.com').fill(email);
    // Pričakovano 3: naslov je vpisan.
    await expect(page.getByPlaceholder('name@mail.com')).toHaveValue(email);
  });

  await test.step('Korak 4: V polje »Geslo« vnesi napačno geslo in klikni »Prijava«', async () => {
    await page.getByPlaceholder('********').fill(wrongPassword);
    // Predpogoj 3: Firebase Authentication je dosegljiv in zavrne napačno geslo.
    const authResponse = page.waitForResponse((r) => r.url().includes('identitytoolkit.googleapis.com') && r.url().includes('signInWithPassword'));
    await page.getByRole('button', { name: 'Prijava', exact: true }).click();
    const response = await authResponse;
    expect(response.status(), 'Firebase Authentication ni zavrnil napačnega gesla').toBe(400);
    const body = await response.json();
    expect(String(body?.error?.message), 'Nepričakovan razlog zavrnitve (npr. TOO_MANY_ATTEMPTS_TRY_LATER)').toMatch(/^(INVALID_LOGIN_CREDENTIALS|INVALID_PASSWORD)/);

    // Pričakovano 4: prijava zavrnjena, uporabnik ostane na strani »Prijava«, seja ni vzpostavljena.
    await expect(page).toHaveURL(/\/sign-in$/);
    await expect(page.getByRole('heading', { level: 2, name: 'Prijava' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Prijava', exact: true })).toBeEnabled();
    await expectSignedOut(page);
  });

  await test.step('Korak 5: Preberi sporočilo o napaki', async () => {
    const toast = page.getByRole('status').first();
    await expect(toast, 'Sporočilo o napaki ni prikazano').toBeVisible();
    const message = (await toast.innerText()).trim();
    test.info().annotations.push({ type: 'Prikazano sporočilo', description: message });

    // Pričakovano 5: slovensko sporočilo, brez tehničnih kod, ne izda gesla.
    expect.soft(message, 'Sporočilo ni v slovenščini oz. ne pove, da je prijava neuspešna').toMatch(/napa[čk]|neuspe[šs]n/i);
    expect.soft(message, 'Sporočilo vsebuje tehnično kodo').not.toMatch(/Firebase|auth\/|Error \(/);
    expect.soft(message, 'Sporočilo izda geslo').not.toContain(wrongPassword);
    // Tudi drugje na strani (napaka v obrazcu) ne sme biti tehnične kode ali gesla.
    await expect.soft(page.locator('body'), 'Stran prikazuje tehnično kodo napake').not.toContainText(/Firebase: Error|auth\//);
    await expect.soft(page.locator('body'), 'Stran prikazuje vneseno geslo').not.toContainText(wrongPassword);
  });

  await test.step('Korak 6: V naslovno vrstico vpiši /profile', async () => {
    await page.goto('/profile');
    // Pričakovano 6: preusmeritev na »Prijava« ali sporočilo, da je potrebna prijava.
    const loginRequired = page.getByText(/(potrebna|zahtevana) (je )?prijava|prijavi se|mora[šs] biti prijavljen|za ogled .*prijav/i);
    await expect
      .poll(async () => /\/sign-in$/.test(page.url()) || (await loginRequired.count()) > 0, {
        message: 'Aplikacija ne preusmeri na »Prijava« in ne sporoči, da je potrebna prijava',
      })
      .toBe(true);
    // Stran profila (ime, alarmi, seznami) se ne prikaže.
    await expect.soft(page.getByRole('heading', { name: 'Cenovni alarmi' }), 'Prikazan je razdelek »Cenovni alarmi«').toHaveCount(0);
    await expect.soft(page.getByRole('heading', { name: 'Seznami' }), 'Prikazan je razdelek »Seznami«').toHaveCount(0);
    await expect.soft(page.getByRole('button', { name: 'Uredi profil' }), 'Prikazan je gumb »Uredi profil«').toHaveCount(0);
    await expect.soft(page.getByText(TEST_USER.email), 'Prikazana je e-pošta testnega računa').toHaveCount(0);

    // Pričakovano 4 (dopolnitev): izven /sign-in navigacija še vedno ponuja »Prijava« in »Registracija«.
    if (!/\/sign-in$/.test(page.url())) await expectNavbarSignedOut(page);
  });

  await test.step('Pogoj po testu: uporabnik je odjavljen, seja ni vzpostavljena', async () => {
    expect(await getStoredAuthEmail(page)).toBeNull();
  });
});
