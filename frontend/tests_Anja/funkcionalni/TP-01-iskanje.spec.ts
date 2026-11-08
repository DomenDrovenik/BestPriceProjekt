import { expect, test } from '@playwright/test';
import { expectedPrice, hasPrice, openProducts, productCard, productName, search, searchBox } from './test-helpers';

test('TP-01 Anja – iskanje in podrobnosti izdelka', async ({ page }) => {
  await test.step('Predpogoji in odprtje kataloga', async () => {
    await openProducts(page);
    await expect(searchBox(page)).toHaveValue('');
    await expect(page.getByRole('link', { name: 'Več', exact: true }).first()).toBeVisible();
  });

  await test.step('Filtriranje po delu imena', async () => {
    await search(page, 'mleko');
    const names = await page.getByRole('heading').allTextContents();
    const resultNames = names.filter((name) => name.toLowerCase().includes('mleko'));
    expect(resultNames.length).toBeGreaterThan(0);
    expect(resultNames.every((name) => name.toLowerCase().includes('mleko'))).toBe(true);
  });

  await test.step('Odprtje izbranega izdelka in preverjanje cene', async () => {
    const card = await productCard(page);
    await expect(card).toContainText(productName);
    expect(hasPrice(await card.innerText(), expectedPrice)).toBe(true);
    await card.getByRole('link', { name: 'Več', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Podrobnosti izdelka', exact: true })).toBeVisible();
    const details = page.locator('div').filter({ has: page.getByRole('heading', { name: productName, exact: true }) }).filter({ hasText: '€' }).last();
    expect(hasPrice(await details.innerText(), expectedPrice)).toBe(true);
  });

  await test.step('Pogoj po testu: katalog ostane berljiv', async () => {
    await page.getByRole('link', { name: 'Nazaj' }).first().click();
    await expect(searchBox(page)).toBeVisible();
    await searchBox(page).clear();
    await expect(searchBox(page)).toHaveValue('');
  });
});
