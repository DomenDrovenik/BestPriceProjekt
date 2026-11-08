import { expect, type Locator, type Page } from '@playwright/test';

export const productName = 'Trajno polnomastno Pomursko mleko, 3,5 % m.m., Pomurske mlekarne, 1 l';
export const productStore = 'Mercator';
export const expectedPrice = Number(process.env.E2E_PRODUCT_PRICE?.replace(',', '.') ?? 1.65);
export const testEmail = process.env.TEST_USER_EMAIL ?? 'test@test.si';

export function priceValues(text: string): number[] {
  return [...text.matchAll(/(\d+(?:[.,]\d+)?)\s*€/g)].map((match) => Number(match[1].replace(',', '.')));
}

export function hasPrice(text: string, value: number): boolean {
  return priceValues(text).some((price) => Math.abs(price - value) < 0.005);
}

export function searchBox(page: Page): Locator {
  return page.getByPlaceholder('Vnesi ime...').first();
}

export async function openProducts(page: Page) {
  await page.goto('/home');
  await expect(page.getByRole('navigation')).toBeVisible();
  await page.getByRole('navigation').getByRole('link', { name: 'Izdelki', exact: true }).first().click();
  await expect(page.getByRole('heading', { name: 'Seznam izdelkov', exact: true })).toBeVisible();
  await expect(searchBox(page)).toBeVisible();
}

export async function search(page: Page, term: string) {
  await searchBox(page).fill(term);
  await expect(searchBox(page)).toHaveValue(term);
  await expect(page.getByRole('link', { name: 'Več', exact: true }).first()).toBeVisible();
}

export async function productCard(page: Page, name = productName, store = productStore): Promise<Locator> {
  const heading = page.getByRole('heading', { name, exact: true });
  const card = page.locator('div').filter({ has: heading }).filter({ hasText: store }).filter({
    has: page.getByRole('link', { name: 'Več', exact: true }),
  }).last();
  await expect(card).toBeVisible();
  return card;
}

export async function openProduct(page: Page) {
  const card = await productCard(page);
  const cardText = await card.innerText();
  expect(hasPrice(cardText, expectedPrice), `Kartica ne prikazuje pričakovane cene ${expectedPrice} €`).toBe(true);
  await card.getByRole('link', { name: 'Več', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Podrobnosti izdelka', exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: productName, exact: true })).toBeVisible();
  return page.locator('div').filter({ has: page.getByRole('heading', { name: productName, exact: true }) }).filter({ hasText: '€' }).last();
}

export async function signIn(page: Page, password: string) {
  await page.goto('/sign-in');
  await expect(page.getByRole('heading', { name: 'Prijava', exact: true })).toBeVisible();
  await page.locator('input[type="email"]').fill(testEmail);
  await page.locator('input[type="password"]').fill(password);
  await page.getByRole('button', { name: 'Prijava', exact: true }).click();
  await expect(page.getByRole('navigation')).toBeVisible();
  await expect(page.getByRole('navigation').getByRole('button', { name: 'Prijava', exact: true })).toHaveCount(0);
}

export function userPassword(): string {
  const password = process.env.TEST_USER_PASSWORD;
  if (!password) throw new Error('Za TP-04 in TP-05 je potrebna spremenljivka TEST_USER_PASSWORD.');
  return password;
}
