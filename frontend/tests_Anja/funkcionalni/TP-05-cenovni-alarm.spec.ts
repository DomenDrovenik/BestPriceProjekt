import { expect, test } from '@playwright/test';
import { openProduct, openProducts, productName, search, signIn, userPassword } from './test-helpers';

test('TP-05 Anja – cenovni alarm ostane shranjen po osvežitvi', async ({ page }) => {
  await signIn(page, userPassword());
  const navigation = page.getByRole('navigation').first();
  const userMenu = navigation.getByRole('button').filter({ hasNotText: /\S/ }).first();
  await userMenu.click();
  await navigation.getByRole('button', { name: 'Profil', exact: true }).first().click();
  await expect(page.getByRole('button', { name: 'Uredi alarme', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Uredi alarme', exact: true }).click();
  const editor = page.getByRole('dialog');
  await expect(editor).toBeVisible();
  const deleteButtons = editor.getByRole('button', { name: 'Izbriši', exact: true });
  while (await deleteButtons.count() > 0) {
    const remaining = await deleteButtons.count();
    await deleteButtons.first().click();
    await expect(deleteButtons).toHaveCount(remaining - 1);
  }
  await editor.getByRole('button', { name: 'Zapri', exact: true }).click();
  await openProducts(page);
  await search(page, 'Pomursko mleko');
  await openProduct(page);
  await page.getByRole('button', { name: 'Nastavi alarm', exact: true }).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();
  const target = dialog.getByRole('spinbutton').or(dialog.getByRole('textbox')).first();
  await target.fill('0.79');
  const emailSwitch = dialog.getByRole('checkbox').or(dialog.getByRole('switch')).first();
  await expect(emailSwitch).not.toBeChecked();
  await dialog.getByRole('button', { name: 'Shrani', exact: true }).click();
  await expect(page.getByText('Opozorilo za ceno je bilo uspešno nastavljeno!')).toBeVisible();

  const profileLink = navigation.getByRole('link', { name: 'Profil', exact: true });
  if (await profileLink.count() > 0) {
    await profileLink.first().click();
  } else {
    const userMenu = navigation.getByRole('button').filter({ hasNotText: /\S/ }).first();
    await expect(userMenu, 'Meni uporabnika ni prikazan po prijavi').toBeVisible();
    await userMenu.click();
    await navigation.getByRole('button', { name: 'Profil', exact: true }).first().click();
  }
  await expect(page.getByText(new RegExp(productName))).toBeVisible();
  await expect(page.getByText(/0[.,]79\s*€/)).toBeVisible();
  await page.reload();
  await expect(page.getByText(new RegExp(productName))).toBeVisible();
  await expect(page.getByText(/0[.,]79\s*€/)).toBeVisible();
});
