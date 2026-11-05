import { expect, test, type Page } from '@playwright/test';
import { fieldNear, passwordField } from './ui';

/**
 * Prijava in stanje prijave – samo prek vidnega vmesnika.
 * Uporabnik ni prijavljen, ko navigacija ponuja »Prijava« in »Registracija« (TP-03, pričakovano 1);
 * je prijavljen, ko ju navigacija ne ponuja več.
 */

export function navbar(page: Page) {
  return page.getByRole('navigation');
}

export function navbarSignInButton(page: Page) {
  return navbar(page).getByRole('button', { name: 'Prijava', exact: true });
}

export function navbarSignUpButton(page: Page) {
  return navbar(page).getByRole('button', { name: 'Registracija', exact: true });
}

/** V navigaciji sta »Prijava« in »Registracija« → uporabnik ni prijavljen. */
export async function expectNavbarSignedOut(page: Page, assert: typeof expect = expect, context = 'Uporabnik ni prijavljen') {
  await assert(navbarSignInButton(page).first(), `${context}: v navigaciji ni gumba »Prijava«`).toBeVisible();
  await assert(navbarSignUpButton(page).first(), `${context}: v navigaciji ni gumba »Registracija«`).toBeVisible();
}

/** Navigacija ne ponuja več »Prijava« in »Registracija« → uporabnik je prijavljen. */
export async function expectNavbarSignedIn(page: Page) {
  await expect(navbar(page).first()).toBeVisible();
  await expect(navbarSignInButton(page), 'Po prijavi navigacija še vedno ponuja »Prijava«').toHaveCount(0);
  await expect(navbarSignUpButton(page), 'Po prijavi navigacija še vedno ponuja »Registracija«').toHaveCount(0);
}

/** Polja na strani »Prijava« (TP-03, korak 3–4). */
export function emailField(page: Page) {
  return fieldNear(page, page, 'E-poštni naslov');
}

/**
 * »V navigaciji klikni »Profil««: če »Profil« ni neposredno v navigaciji,
 * se najprej odpre meni v navigaciji (gumb brez besedila, npr. ikona uporabnika).
 */
export async function openProfileFromNavbar(page: Page) {
  const profile = page.getByRole('link', { name: 'Profil', exact: true }).or(page.getByRole('button', { name: 'Profil', exact: true }));
  // isVisible() ne čaka: najprej počakaj, da navigacija prikaže stanje prijavljenega uporabnika
  // (po osvežitvi Firebase sejo obnovi asinhrono), sicer bi se odločitev o meniju sprejela prezgodaj.
  await expectNavbarSignedIn(page);
  if (!(await profile.first().isVisible())) {
    await navbar(page).getByRole('button').filter({ hasNotText: /\S/ }).first().click();
  }
  await profile.first().click();
}

/** Predpogoj »uporabnik je prijavljen«: prijava na strani »Prijava« s testnim računom. */
export async function signIn(page: Page, email: string, password: string) {
  await test.step(`Predpogoj: prijava uporabnika ${email}`, async () => {
    await page.goto('/sign-in');
    await expect(page.getByRole('heading', { name: 'Prijava', exact: true })).toBeVisible();
    await emailField(page).fill(email);
    await passwordField(page).fill(password);
    await page.getByRole('button', { name: 'Prijava', exact: true }).click();
    // Počakaj na odziv aplikacije (sprememba strani ali obvestilo), nato preveri stanje v navigaciji.
    await expect
      .poll(async () => !/\/sign-in$/.test(page.url()) || (await page.getByRole('status').or(page.getByRole('alert')).count()) > 0, {
        message: 'Aplikacija se na klik »Prijava« ni odzvala',
        timeout: 20_000,
      })
      .toBe(true);
    await page.goto('/home');
    await expectNavbarSignedIn(page);
  });
}
