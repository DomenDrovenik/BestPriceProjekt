import { expect, type Locator, type Page } from '@playwright/test';

/**
 * Pomožne funkcije za delo z VIDNIM uporabniškim vmesnikom.
 *
 * Pravilo za vse teste: vsak uporabljeni element izvira iz
 *   (1) besedila testnih primerov (testni_primeri.md),
 *   (2) splošnega pomena elementov spletne strani (gumb, povezava, naslov, polje, seznam,
 *       okno, obvestilo, barva), ali
 *   (3) opažanja iz dejanskega zagona (dnevnik, posnetek strani, zaslonska slika).
 * Testi ne uporabljajo izvorne kode aplikacije, njenih CSS razredov, oznak HTML, klicev API
 * ali notranjega stanja brskalnika. Izvor posameznih elementov je v SLEDLJIVOST.md.
 */

export function escapeRegex(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Najmanjši blok strani, ki hkrati vsebuje vse podane dele (elemente ali besedilo).
 * Med vsemi bloki, ki jih vsebujejo, se vzame najbolj notranji (zadnji v vrstnem redu strani).
 * Elemente podaj iz `page`: iščejo se znotraj vsakega bloka.
 */
export function block(scope: Page | Locator, ...parts: Array<Locator | string | RegExp>): Locator {
  let candidates = scope.locator('div');
  for (const part of parts) {
    candidates = typeof part === 'string' || part instanceof RegExp ? candidates.filter({ hasText: part }) : candidates.filter({ has: part });
  }
  return candidates.last();
}

/** Besedilno ali številsko polje v najmanjšem bloku z napisom (npr. »Išči izdelek«, »Ciljna cena (€)«). */
export function fieldNear(page: Page, scope: Page | Locator, caption: string): Locator {
  const area = block(scope, page.getByText(caption, { exact: true }), page.getByRole('textbox').or(page.getByRole('spinbutton')));
  return area.getByRole('textbox').or(area.getByRole('spinbutton')).first();
}

/** Polje za geslo (vnos je skrit, zato nima vloge »textbox«); na strani »Prijava« je eno. */
export function passwordField(page: Page): Locator {
  return page.locator('input[type="password"]');
}

/** Vse cene v besedilu (»1.65 €« ali »1,65 €«). */
export function pricesIn(text: string): number[] {
  return [...text.matchAll(/(\d+(?:[.,]\d+)?)\s*€/g)].map((m) => Number(m[1].replace(',', '.')));
}

/** Med prikazanimi cenami je iskana cena (1,65 € = 1.65 €). */
export function includesPrice(prices: number[], value: number): boolean {
  return prices.some((p) => Math.abs(p - value) < 0.005);
}

/**
 * Regularni izraz za ceno v obeh zapisih, npr. 1,65 € → /(?<![\d.,])1[.,]65\s*€/.
 * Pred ceno ne sme stati števka, sicer bi se 1,48 € ujemala tudi z 11,48 €.
 */
export function priceRegex(value: number): RegExp {
  const [whole, dec] = value.toFixed(2).split('.');
  return new RegExp(`(?<![\\d.,])${whole}[.,]${dec}\\s*€`);
}

/** Neprazne vrstice vidnega besedila elementa. */
export async function visibleLines(locator: Locator): Promise<string[]> {
  return (await locator.innerText())
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);
}

/**
 * Počaka, da se vidna vsebina strani ustali (STABLE_READS zaporednih enakih branj, ~2 s),
 * npr. ko se seznami ali alarmi nalagajo postopoma iz Firestore. Brez fiksnih pavz: Playwright
 * vsebino ponovno prebere v kratkih presledkih do časovne omejitve.
 *
 * Omejitev: ustaljenost ni dokaz, da so vsi podatki naloženi – če Firestore odgovori po daljšem
 * premoru, se stran lahko »ustali« še pred tem. Zato se odsotnost podatkov (npr. »ni alarmov«)
 * vedno preverja tudi s prehodom stanja na isti strani, kjer je to mogoče.
 */
const STABLE_READS = 3;
export async function waitForStableContent(page: Page) {
  let previous = '';
  let sameCount = 0;
  await expect
    .poll(
      async () => {
        const current = await page.locator('body').innerText();
        sameCount = current.length > 0 && current === previous ? sameCount + 1 : 0;
        previous = current;
        return sameCount >= STABLE_READS;
      },
      { message: 'Vsebina strani se ni ustalila', intervals: [700], timeout: 30_000 },
    )
    .toBe(true);
}

/**
 * Za vsak element vrne, ali vsebuje RDEČ gumb (npr. »rdeča ikona koša« iz TP-04).
 * Barva se prebere iz izrisane strani (ozadje ali barva ikone).
 */
export async function hasRedButton(items: Locator): Promise<boolean[]> {
  return items.evaluateAll((elements) => {
    const isRed = (css: string) => {
      const m = css.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?/);
      if (!m) return false;
      const [r, g, b, a] = [Number(m[1]), Number(m[2]), Number(m[3]), m[4] === undefined ? 1 : Number(m[4])];
      return a > 0.1 && r >= 150 && g <= 110 && b <= 110;
    };
    return elements.map((el) =>
      [...el.querySelectorAll('button, [role="button"]')].some((btn) => {
        const style = getComputedStyle(btn);
        return isRed(style.backgroundColor) || isRed(style.color);
      }),
    );
  });
}

/** Rdeč gumb znotraj elementa (prvi, ki ima rdeče ozadje ali rdečo ikono). */
export async function redButtonIn(item: Locator): Promise<Locator> {
  const buttons = item.getByRole('button');
  const flags = await buttons.evaluateAll((elements) => {
    const isRed = (css: string) => {
      const m = css.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?/);
      if (!m) return false;
      const [r, g, b, a] = [Number(m[1]), Number(m[2]), Number(m[3]), m[4] === undefined ? 1 : Number(m[4])];
      return a > 0.1 && r >= 150 && g <= 110 && b <= 110;
    };
    return elements.map((btn) => {
      const style = getComputedStyle(btn);
      return isRed(style.backgroundColor) || isRed(style.color);
    });
  });
  const index = flags.indexOf(true);
  if (index < 0) throw new Error('V vrstici ni rdečega gumba (ikone koša).');
  return buttons.nth(index);
}
