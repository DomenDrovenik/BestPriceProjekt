import { test, expect } from '@playwright/test';

test('prikazVsehProduktov', async ({ page }) => {
  await page.goto('http://localhost:5173/home');
  await page.getByRole('link', { name: 'Izdelki' }).first().click();
  await expect(
  page.locator('div.grid.grid-cols-1.gap-6.sm\\:grid-cols-2.lg\\:grid-cols-3')
  ).toBeVisible({ timeout: 20000 });
});
test('prikazNavigacije', async ({ page }) => {
  await page.goto('http://localhost:5173/home');
  await expect(
  page.locator('div.container.mx-auto.flex.items-center.justify-between.text-white')
  ).toBeVisible({ timeout: 20000 });
});
test('prikazNoge', async ({ page }) => {
  await page.goto('http://localhost:5173/home');
  await page.getByRole('link', { name: 'Izdelki' }).first().click();
  await expect(
    page.locator('div.flex.flex-wrap.pt-6.text-center.lg\\:text-left')
  ).toBeVisible({ timeout: 20000 });
});
test('prikazTop5najbolZnižanih', async ({ page }) => {
  await page.goto('http://localhost:5173/home');
  await page.getByRole('link', { name: 'Izdelki' }).first().click();
  await expect(
  page.locator('div.grid.gap-6')
  ).toBeVisible({ timeout: 20000 });
});
test('prikazZnizaihProduktov', async ({ page }) => {
  await page.goto('http://localhost:5173/products');
  await page.getByRole('checkbox', { name: 'Samo akcijski izdelki' }).check();
  await expect(
  page.locator('div.grid.grid-cols-1.gap-6.sm\\:grid-cols-2.lg\\:grid-cols-3 > div').first()
    .locator('span.absolute.top-2.right-2.bg-red-500.text-white.text-xs.px-2.py-0\\.5.rounded-full.shadow-md.font-semibold.z-10')
).toBeVisible();
});

test('prikazFiltriranihPoTrgovini', async ({ page }) => {
  await page.goto('http://localhost:5173/products');

  await page.getByRole('checkbox', { name: 'Hofer' }).check();

  const container = page.locator('div.flex.flex-col.bg-clip-border.rounded-xl.bg-white.text-gray-700.shadow-md.relative.overflow-hidden', { hasText: 'Hofer' }).first();

  await expect(container).toBeVisible();
});
test('prikazFiltriranihPoKategoriji', async ({ page }) => {
  await page.goto('http://localhost:5173/products');

  await page.getByRole('checkbox', { name: 'Sadje in zelenjava' }).check();

  const container = page.locator('div.flex.flex-col.bg-clip-border.rounded-xl.bg-white.text-gray-700.shadow-md.relative.overflow-hidden', { hasText: 'Sadje in zelenjava' }).first();

  await expect(container).toBeVisible();
});
test('prikazFiltriranihPoOceni', async ({ page }) => {
  await page.goto('http://localhost:5173/products');

  await page.getByRole('combobox').filter({ hasText: 'Privzeta razvrstitev' }).click();
  await page.getByRole('option', { name: 'Najvišja ocena' }).click();
  const products = page.locator('div.flex.flex-col.bg-clip-border.rounded-xl.bg-white.text-gray-700.shadow-md.relative.overflow-hidden');
  const firstRatingText = await products.nth(0).locator('div.flex.justify-end > span.text-yellow-400').innerText();
  const secondRatingText = await products.nth(1).locator('div.flex.justify-end > span.text-yellow-400').innerText();
  const firstRating = parseFloat(firstRatingText);
  const secondRating = parseFloat(secondRatingText);
  expect(firstRating).toBeGreaterThanOrEqual(secondRating);
});

test('prikazFiltriranihPoCeni', async ({ page }) => {
  await page.goto('http://localhost:5173/products');

  await page.getByPlaceholder(' ').nth(2).click();
  await page.getByPlaceholder(' ').nth(2).fill('1');

  const products = page.locator('div.flex.flex-col.bg-clip-border.rounded-xl.bg-white.text-gray-700.shadow-md.relative.overflow-hidden');
  await expect(products.first()).toBeVisible();

  const count = await products.count();
  expect(count).toBeGreaterThan(0);

  for (let i = 0; i < count; i++) {
    const product = products.nth(i);
    
    const discountPriceLocator = product.locator('span.text-red-600.font-bold');
    const regularPriceLocator = product.locator('span.text-black.font-bold');
    
    const priceLocator = (await discountPriceLocator.count()) > 0 ? discountPriceLocator : regularPriceLocator;
    
    
    await expect(priceLocator).toBeVisible();
    
    
    const priceText = await priceLocator.innerText();
    console.log(`Product ${i+1} price text:`, priceText);
    
    
    const priceNumber = parseFloat(priceText.replace(',', '.').replace(/[^\d.]/g, ''));
    expect(priceNumber).toBeLessThanOrEqual(1);
  }
});

test('prikazPodrobnostiIzdelka', async ({ page }) => {
  await page.goto('http://localhost:5173/products');
  await page.locator('.mb-2 > a > .align-middle').first().click();
  await expect(page.locator('div.relative.flex.flex-col.bg-clip-border.rounded-xl.bg-white.text-gray-700.shadow-md.mb-6.max-w-lg.mx-auto')).toBeVisible();
})
test('prikazStatistike', async ({ page }) => {
  await page.goto('http://localhost:5173/home');
  await page.getByRole('link', { name: 'Statistika' }).first().click();
  await expect(page.getByRole('heading', { name: 'Povprečne cene izdelkov po' })).toBeVisible({ timeout: 20000 });
  await expect(page.getByRole('heading', { name: 'Razvoj povprečnih cen skozi č' })).toBeVisible({ timeout: 20000 });
  await expect(page.getByRole('heading', { name: 'Primerjava osnovne košarice' })).toBeVisible({ timeout: 20000 });
  await expect(page.getByRole('heading', { name: 'Primerjava razširjene košarice' })).toBeVisible({ timeout: 20000 });
  await expect(page.getByRole('heading', { name: 'Povprečne cene po kategorijah' })).toBeVisible({ timeout: 20000 });
  await expect(page.getByRole('heading', { name: 'Porazdelitev izdelkov po' })).toBeVisible({ timeout: 20000 });
  await expect(page.getByRole('heading', { name: 'Delež akcijskih izdelkov po' })).toBeVisible({ timeout: 20000 });
});

test('loginLogoutTest', async ({ page }) => {
  test.setTimeout(60000); 
  await page.goto('http://localhost:5173/home');
  await expect(page.getByRole('button', { name: 'Prijava' }).first()).toBeVisible();
  await page.getByRole('button', { name: 'Prijava' }).first().click();
  await page.getByText('E-poštni naslov Geslo').click();
  await page.getByRole('textbox', { name: 'name@mail.com' }).click();
  await page.getByRole('textbox', { name: 'name@mail.com' }).fill('test1@gmail.com');
  await page.getByRole('textbox', { name: '********' }).click();
  await page.getByRole('textbox', { name: '********' }).fill('test123');
  await page.getByRole('button', { name: 'Prijava', exact: true }).click();
  await expect(page.locator('div').filter({ hasText: /^BestPriceIzdelkiNakupovalni seznamStatistika$/ }).locator('div').nth(4)).toBeVisible();
  await page.getByRole('navigation').locator('svg').first().click();
  await page.getByRole('button', { name: 'Odjava' }).first().click();
  await expect(page.getByRole('button', { name: 'Prijava' }).first()).toBeVisible();
});


test('komentarjiOceneTest', async ({ page }) => {
  test.setTimeout(120000); 
  await page.goto('http://localhost:5173/home');
await expect(page.getByRole('button', { name: 'Prijava' }).first()).toBeVisible();
await page.getByRole('button', { name: 'Prijava' }).first().click();
await page.getByRole('textbox', { name: 'name@mail.com' }).click();
await page.getByRole('textbox', { name: 'name@mail.com' }).fill('test1@gmail.com');
await page.getByRole('textbox', { name: '********' }).click();
await page.getByRole('textbox', { name: '********' }).fill('test123');
await page.getByRole('button', { name: 'Prijava', exact: true }).click();
await expect(page.locator('div').filter({ hasText: /^BestPriceIzdelkiNakupovalni seznamStatistika$/ }).locator('div').nth(4)).toBeVisible();
await page.getByRole('link', { name: 'Izdelki' }).first().click();
await page.locator('a > .align-middle').first().click();
await page.getByRole('textbox', { name: 'Tvoj komentar...' }).click();
await page.getByRole('textbox', { name: 'Tvoj komentar...' }).fill('test123');
await page.locator('div').filter({ hasText: /^test123Objavi oceno$/ }).locator('path').nth(4).click();
await page.getByRole('button', { name: 'Objavi oceno' }).click();
await expect(page.getByText('test123')).toBeVisible();
await page.getByRole('button', { name: 'Uredi' }).click();
await page.getByText('test123').click();
await page.getByText('test123').fill('test1234');
await page.getByRole('button', { name: 'Shrani' }).click();
await expect(page.getByText('test1234')).toBeVisible();
await page.getByRole('button', { name: 'Zbriši' }).click();
await page.getByRole('button', { name: 'Zbriši' }).click();
await expect(page.getByText('test1234')).toBeHidden();
await page.locator('div').filter({ hasText: /^BestPriceIzdelkiNakupovalni seznamStatistika$/ }).locator('div').nth(4).click();
await page.getByRole('button', { name: 'Odjava' }).first().click();
})


test('kosaricaTest', async ({ page }) => {
  test.setTimeout(60000); 
  await page.goto('http://localhost:5173/home');
  await page.getByRole('button', { name: 'Prijava' }).first().click();
  await page.getByRole('textbox', { name: 'name@mail.com' }).click();
  await page.getByRole('textbox', { name: 'name@mail.com' }).fill('test1@gmail.com');
  await page.getByRole('textbox', { name: '********' }).click();
  await page.getByRole('textbox', { name: '********' }).fill('test123');
  await page.getByRole('button', { name: 'Prijava', exact: true }).click();
  await page.getByRole('link', { name: 'Izdelki' }).first().click();
  await page.getByRole('link', { name: 'Nakupovalni seznam' }).first().click();
  await page.getByRole('textbox', { name: 'Ime novega seznama...' }).click();
  await page.getByRole('textbox', { name: 'Ime novega seznama...' }).fill('test');
  await page.getByRole('button', { name: 'Ustvari seznam' }).click();
  await page.getByRole('link', { name: 'Izdelki' }).first().click();
  await page.locator('.mb-4 > .align-middle').first().click();
  await page.getByRole('button', { name: 'Dodaj' }).first().click();
  await page.getByRole('link', { name: 'Nakupovalni seznam' }).first().click();
  await page.getByRole('button').filter({ hasText: /^$/ }).click();
  await page.locator('div').filter({ hasText: /^BestPriceIzdelkiNakupovalni seznamStatistika$/ }).locator('div').nth(4).click();
  await page.getByRole('button', { name: 'Odjava' }).first().click();
});

test('alarmTest', async ({ page }) => {
  test.setTimeout(60000); 
  await page.goto('http://localhost:5173/home');
  await page.getByRole('button', { name: 'Prijava' }).first().click();
  await page.getByRole('textbox', { name: 'name@mail.com' }).click();
  await page.getByRole('textbox', { name: 'name@mail.com' }).fill('test1@gmail.com');
  await page.getByRole('textbox', { name: '********' }).click();
  await page.getByRole('textbox', { name: '********' }).fill('test123');
  await page.getByRole('button', { name: 'Prijava', exact: true }).click();
  await page.getByRole('link', { name: 'Izdelki' }).first().click();
  await page.locator('a > .align-middle').first().click();
  await page.getByRole('button', { name: 'Nastavi alarm' }).click();
  await page.getByPlaceholder(' ', { exact: true }).fill('1');
  await page.getByRole('button', { name: 'Shrani' }).click();
  await page.getByRole('navigation').locator('svg').first().click();
  await page.getByRole('button', { name: 'Profil' }).first().click();
  await expect(page.locator('div.flex.justify-between.items-center.py-1')).toBeVisible();
  await page.getByRole('button', { name: 'Uredi alarme' }).click();
  await page.getByRole('button', { name: 'Izbriši' }).click();
  await page.getByRole('button', { name: 'Zapri' }).click();
  await expect(page.getByText('Ni aktivnih alarmov')).toBeVisible();
  await page.getByRole('navigation').locator('path').first().click();
  await page.getByRole('button', { name: 'Odjava' }).first().click();
});