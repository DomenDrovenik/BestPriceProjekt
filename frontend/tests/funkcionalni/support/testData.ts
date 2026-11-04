/**
 * Testni podatki za TP-01 … TP-05.
 * Vir: testni_primeri.md (popravljena različica, matrika F-01 … F-09).
 *
 * Geslo testnega računa se NE zapisuje v kodo. Prebere se iz spremenljivke
 * okolja TEST_USER_PASSWORD (lokalno iz frontend/.env.e2e, v CI iz GitHub Secrets).
 */

export const BASE_URL = process.env.BASE_URL ?? 'http://localhost:5173';
export const API_URL = process.env.API_URL ?? 'http://localhost:3000';

/** Testni račun iz razdelka »Okolje izvedbe«. */
export const TEST_USER = {
  email: process.env.TEST_USER_EMAIL ?? 'test@test.si',
};

export function testUserPassword(): string {
  const password = process.env.TEST_USER_PASSWORD;
  if (!password) {
    throw new Error(
      'Manjka spremenljivka okolja TEST_USER_PASSWORD (geslo testnega računa). ' +
        'Lokalno jo nastavi v frontend/.env.e2e (glej .env.e2e.example), v GitHub Actions pa kot skrivnost.',
    );
  }
  return password;
}

/**
 * Izdelek, ki ga uporabljajo vsi testni primeri.
 * TP-04 in TP-05 ga navajata skrajšano (»Trajno polnomastno Pomursko mleko, 1 l«),
 * TP-01 in TP-02 s polnim imenom, ki je v katalogu. Testi uporabljajo polno ime.
 */
export const PRODUCT = {
  name: 'Trajno polnomastno Pomursko mleko, 3,5 % m.m., Pomurske mlekarne, 1 l',
  shortName: 'Trajno polnomastno Pomursko mleko, 1 l',
  store: 'Mercator',
  /**
   * Cena iz specifikacije (1,65 €). Testi tečejo na produkcijski bazi, kjer scraper cene spreminja:
   * ob spremembi nastavi E2E_PRODUCT_PRICE (lokalno v .env.e2e, v CI kot spremenljivko repozitorija).
   */
  price: expectedProductPrice(),
};

function expectedProductPrice(): number {
  const raw = process.env.E2E_PRODUCT_PRICE;
  if (!raw) return 1.65;
  const value = Number(raw.replace(',', '.'));
  if (!Number.isFinite(value) || value <= 0) {
    throw new Error(`E2E_PRODUCT_PRICE mora biti pozitivno število (npr. 1.65), prejeto: »${raw}«.`);
  }
  return value;
}

export const TP01 = {
  searchTerm: 'mleko',
  product: PRODUCT,
  /** Korak 4: število prvih zadetkov, katerih imena se preberejo. */
  firstHits: 3,
};

export const TP02 = {
  searchTerm: 'Pomursko mleko',
  product: PRODUCT,
  /**
   * Pričakovani rezultat 4: vse ponudbe so »trajno polnomastno mleko, pakiranje 1 l«
   * (isti ali enakovreden izdelek – znamka ni pogoj).
   */
  equivalent: {
    mustContain: [/trajn/i, /mleko/i],
    variant: /polnomastn|3[,.]5\s*%/i,
    packagingLitres: 1,
  },
  minOffers: 2,
};

export const TP03 = {
  email: TEST_USER.email,
  wrongPassword: 'TP03-Napacno-2026!', // namerno napačno geslo iz specifikacije
};

export const TP04 = {
  listName: 'Testni nakup',
  searchTerm: 'Pomursko mleko',
  product: PRODUCT,
};

export const TP05 = {
  searchTerm: 'Pomursko mleko',
  product: PRODUCT,
  /** Ciljna cena: vnos s piko (polje type="number"). */
  targetPriceInput: '1.48',
  /** Aplikacija prikazuje ciljno ceno s toFixed(2). */
  targetPriceDisplayed: '1.48 €',
};

/** Številska primerjava cene iz specifikacije (1,65 €) s prikazano (1.65 €). */
export function priceText(value: number): string {
  return `${value.toFixed(2)} €`;
}
