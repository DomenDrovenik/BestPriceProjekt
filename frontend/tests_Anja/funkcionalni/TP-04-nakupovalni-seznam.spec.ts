import { expect, test } from '@playwright/test';
import { productName, signIn, userPassword } from './test-helpers';

test('TP-04 Anja – nakupovalni seznam preživi osvežitev', async ({ page }) => {
  await signIn(page, userPassword());
  await page.getByRole('navigation').getByRole('link', { name: /Nakupovalni seznam/i }).first().click();
  await expect(page.getByRole('textbox', { name: /Ime novega seznama/i })).toBeVisible();
  const listName = `TP-04 Anja ${Date.now()}`;
  await page.getByRole('textbox', { name: /Ime novega seznama/i }).fill(listName);
  await page.getByRole('button', { name: 'Ustvari seznam', exact: true }).click();
  await expect(page.locator('h6').filter({ hasText: listName }).first()).toBeVisible();
  await page.locator('h6').filter({ hasText: listName }).first().click();

  const storeSearch = page.getByRole('textbox', { name: /Išči izdelek po trgovinah/i });
  await expect(storeSearch).toBeVisible();
  await storeSearch.fill('Pomursko mleko');
  await expect(storeSearch).toHaveValue('Pomursko mleko');
  const result = page.getByRole('listitem').filter({ hasText: /Pomursko mleko/i }).filter({ hasText: /€/ }).last();
  await expect(result, 'Iskalnik ni vrnil primerljivega izdelka s ceno').toBeVisible({ timeout: 30_000 });
  await result.click();
  await expect(page.getByRole('listitem').filter({ hasText: productName }).filter({ has: page.getByRole('button') })).toHaveCount(1);

  await page.reload();
  await expect(page.getByText(listName, { exact: true }).first()).toBeVisible();
  await page.getByText(listName, { exact: true }).first().click();
  await expect(page.getByRole('listitem').filter({ hasText: productName }).filter({ has: page.getByRole('button') })).toHaveCount(1);
});
