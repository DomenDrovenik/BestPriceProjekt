import { expect, test } from '@playwright/test';
import { testEmail } from './test-helpers';

test('TP-03 Anja – napačno geslo ne ustvari seje', async ({ page }) => {
  await page.goto('/home');
  await expect(page.getByRole('navigation').getByRole('button', { name: 'Prijava', exact: true }).first()).toBeVisible();
  await page.getByRole('navigation').getByRole('button', { name: 'Prijava', exact: true }).first().click();
  await expect(page.getByRole('heading', { name: 'Prijava', exact: true })).toBeVisible();
  await page.locator('input[type="email"]').fill(testEmail);
  await page.locator('input[type="password"]').fill('TP03-Napacno-2026!');
  await page.getByRole('button', { name: 'Prijava', exact: true }).click();

  const message = page.getByRole('status').or(page.getByRole('alert')).first();
  await expect(message).toBeVisible({ timeout: 20_000 });
  await expect(page.getByRole('heading', { name: 'Prijava', exact: true })).toBeVisible();
  await expect(page.locator('input[type="password"]')).toBeVisible();
  await expect(page.getByRole('navigation').getByRole('button', { name: 'Prijava', exact: true })).toHaveCount(0);
  await page.goto('/profile');
  await expect(page.getByRole('heading', { name: 'Prijava', exact: true }).or(page.getByText(/potrebna prijava/i))).toBeVisible();
});
