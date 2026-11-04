import { expect, test, type Page } from '@playwright/test';

/**
 * Prebere e-pošto prijavljenega uporabnika iz trajne seje Firebase Authentication
 * (IndexedDB »firebaseLocalStorageDb« ali localStorage). Vrne null, če seje ni.
 * Baze ne ustvari, če še ne obstaja (to bi pokvarilo inicializacijo Firebase SDK).
 */
export async function getStoredAuthEmail(page: Page): Promise<string | null> {
  return page.evaluate(async () => {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('firebase:authUser:')) {
        const value = JSON.parse(localStorage.getItem(key) ?? 'null');
        if (value?.email) return value.email as string;
      }
    }
    const dbs = typeof indexedDB.databases === 'function' ? await indexedDB.databases() : [];
    if (!dbs.some((d) => d.name === 'firebaseLocalStorageDb')) return null;

    return new Promise<string | null>((resolve, reject) => {
      const open = indexedDB.open('firebaseLocalStorageDb');
      open.onerror = () => reject(open.error);
      open.onsuccess = () => {
        const db = open.result;
        if (!db.objectStoreNames.contains('firebaseLocalStorage')) {
          db.close();
          resolve(null);
          return;
        }
        const req = db.transaction('firebaseLocalStorage', 'readonly').objectStore('firebaseLocalStorage').getAll();
        req.onerror = () => reject(req.error);
        req.onsuccess = () => {
          const entry = (req.result as Array<{ fbase_key: string; value?: { email?: string } }>).find((r) =>
            String(r.fbase_key).startsWith('firebase:authUser:'),
          );
          db.close();
          resolve(entry?.value?.email ?? null);
        };
      };
    });
  });
}

/** Navigacijski gumb »Prijava« (prikazan le, ko uporabnik ni prijavljen). */
export function navbarSignInButton(page: Page) {
  return page.getByRole('navigation').getByRole('button', { name: 'Prijava', exact: true });
}

/** Navigacijski gumb »Registracija« (prikazan le, ko uporabnik ni prijavljen). */
export function navbarSignUpButton(page: Page) {
  return page.getByRole('navigation').getByRole('button', { name: 'Registracija', exact: true });
}

/** Navigacija prikazuje »Prijava« in »Registracija« → uporabnik ni prijavljen. */
export async function expectNavbarSignedOut(page: Page) {
  await expect(navbarSignInButton(page).first(), 'V navigaciji ni gumba »Prijava«').toBeVisible();
  await expect(navbarSignUpButton(page).first(), 'V navigaciji ni gumba »Registracija«').toBeVisible();
}

/** Avatar prijavljenega uporabnika (<div role="button"> brez dostopnega imena; aplikacija nima data-testid). */
export function navbarAvatar(page: Page) {
  return page.getByRole('navigation').locator('div[role="button"]').first();
}

export async function expectSignedIn(page: Page, email: string) {
  await expect
    .poll(() => getStoredAuthEmail(page), { message: 'Firebase seja prijavljenega uporabnika ni bila vzpostavljena', timeout: 15_000 })
    .toBe(email);
  await expect(navbarSignInButton(page), 'Navigacija po prijavi ne sme več ponujati gumba »Prijava«').toHaveCount(0);
}

export async function expectSignedOut(page: Page) {
  await expect
    .poll(() => getStoredAuthEmail(page), { message: 'V brskalniku je shranjena Firebase seja', timeout: 15_000 })
    .toBeNull();
}

/** Predpogoj »uporabnik je prijavljen«: prijava prek obrazca /sign-in. */
export async function signIn(page: Page, email: string, password: string) {
  await test.step(`Predpogoj: prijava uporabnika ${email}`, async () => {
    await page.goto('/sign-in');
    await expect(page.getByRole('heading', { level: 2, name: 'Prijava' })).toBeVisible();
    await page.getByPlaceholder('name@mail.com').fill(email);
    await page.getByPlaceholder('********').fill(password);
    await page.getByRole('button', { name: 'Prijava', exact: true }).click();
    await expect(page.getByRole('status').filter({ hasText: 'Uspešna prijava!' })).toBeVisible();
    // Po prijavi aplikacija preusmeri na »/« → »/home«.
    await expect(page).toHaveURL(/\/home$/);
    await expectSignedIn(page, email);
  });
}
