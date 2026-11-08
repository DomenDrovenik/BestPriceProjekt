# BestPrice – poročilo o avtomatiziranem funkcionalnem testiranju

| Podatek | Vrednost |
|---|---|
| Predmet testiranja | Spletna aplikacija BestPrice (React + Vite frontend, Express backend, MongoDB, Firebase Authentication in Firestore) |
| Vir testnih primerov | `testni_primeri.md` – TP-01 … TP-05, matrika funkcionalnosti F-01 … F-09 |
| Orodje | Playwright Test + TypeScript (brskalnik Chromium) |
| Cevovod | GitHub Actions, `.github/workflows/avtomatizacija_testov.yml`, korak `tests_Anja` |
| Testne skripte | `frontend/tests_Anja/funkcionalni/` |
| Zadnja izvedba | 4. 11. 2026, GitHub Actions, commit `e0598b3` |

## 1. Izbira orodja in vključitev v cevovod

Playwright Test je primeren za projekt, ker je uporabniški vmesnik SPA v Reactu,
Playwright pa izvaja teste v pravem Chromiumu in podpira čakanje na vidne elemente,
role/label selektorje, posnetke ter sledove ob napaki. Rezultate vrne kot izhod
ukaza z ločenimi statusi testov ter kot HTML poročilo v `frontend/playwright-report/`;
ob neuspehu se shranijo tudi sled in video v `frontend/test-results/`.

Namestitev je reproducibilna z `npm install` oziroma `npm ci` v CI, brskalnik pa se
namesti z `npx playwright install --with-deps chromium`. Lokalni zagon novega sklopa je `npm run test:e2e:anja`. V GitHub Actions se po
zagonu osnovnega sklopa zažene še `npx playwright test
--config=playwright.anja.config.ts --project=chromium`; ločena konfiguracija
uporablja iste nastavitve `playwright.config.ts`, zaganjanje frontenda in backenda
prek `webServer`, ter objavo HTML poročila kot artefakt.

## 2. Povzetek

Vseh pet testnih primerov je avtomatiziranih in vključenih v cevovod GitHub Actions. Testi so bili izvedeni lokalno in v cevovodu; **v obeh okoljih je rezultat enak: 3 testi uspešni, 2 neuspešna.** Oba neuspeha sta posledica napak v aplikaciji, ne napak v testih – v cevovodu sta oba testa padla tudi ob ponovitvi, kar potrjuje, da napaki nista naključni.

| TP | Funkcionalnost | Lokalno (28. 10.) | Cevovod (4. 11.) | Vzrok neuspeha |
|---|---|:---:|:---:|---|
| TP-01 | F-01 Iskanje, F-02 Podrobnosti | ✅ | ✅ | — |
| TP-02 | F-03 Primerjava cen | ❌ | ❌ | N-02: primerjava prikaže drugačne izdelke |
| TP-03 | F-04 Prijava, F-05 Nadzor dostopa | ❌ | ❌ | N-01: `/profile` ni zaščiten; N-03: tehnična koda v sporočilu |
| TP-04 | F-06 Seznam, F-07 Shranjevanje | ✅ | ✅ | — |
| TP-05 | F-08 Obvestila, F-09 Shranjevanje | ✅ | ✅ | — |

Pokritost matrike: vseh 9 funkcionalnosti (F-01 … F-09) je preverjenih z vsaj enim testom. F-01, F-02, F-06, F-07, F-08 in F-09 delujejo skladno s pričakovanji; F-03, F-04 (sporočilo ob neuspešni prijavi) in F-05 ne.

Cevovod je pri tem odkril še eno napako (N-05): aplikacija se v okolju Linux ni naložila zaradi neujemanja velikih in malih črk v uvozih. Napaka je bila odpravljena (commit `e0598b3`).

### Zadnja preveritev sklopa `tests_Anja`

V poročilu je bil prej naveden starejši zagon, v katerem sta TP-04 in TP-05
padla zaradi manjkajočega `TEST_USER_PASSWORD`. Ta zapis ni več veljaven za
trenutno konfiguracijo: lokalna datoteka `.env.e2e` sicer ne obstaja, vendar
`playwright.config.ts` kot varovalko naloži `.env.e2e.example`, ki vsebuje
`TEST_USER_PASSWORD=test1234`.

To potrjuje tudi ločena ponovna izvedba TP-04 in TP-05, kjer sta bila oba testa
uspešna. Zato njun neuspeh ni bil posledica gesla, temveč starega zagona oziroma
takratne konfiguracije:

| Test | Rezultat | Ugotovitev |
|---|:---:|---|
| TP-01 | ✅ | Iskanje, podrobnosti in nespremenjeni podatki preverjeni |
| TP-02 | ❌ | Primerjava vsebuje neenakovredna izdelka (Tuš/Jager) |
| TP-03 | ❌ | Aplikacija prikaže tehnično Firebase napako in nezaščiten profil |
| TP-04 | ✅ | Prijava in shranjevanje sta bila uspešno preverjena |
| TP-05 | ✅ | Prijava, alarm `0,79 €` in obstoj po osvežitvi so bili uspešno preverjeni |

HTML poročilo, JUnit XML in artefakti tega sklopa se ustvarijo v
`frontend/playwright-report-Anja/` in `frontend/test-results-Anja/`
(`junit.xml`). Za uspešen CI
zagon morajo biti nastavljene Firebase in MongoDB spremenljivke. V CI je treba
`TEST_USER_PASSWORD` nastaviti kot skrivnost oziroma okoljsko spremenljivko;
`.env.e2e.example` je namenjen lokalni varovalki in ne zagotavlja, da je
`test1234` veljavno geslo za testni račun.

### Ponovna preveritev TP-04 in TP-05

Po popravku robustnosti lokatorjev in priprave podatkov sta bila 7. 11. 2026
ločeno izvedena:

```text
npx playwright test --config=playwright.anja.config.ts --project=chromium --grep "TP-0[45]"
```

TP-05 je uspešno preveril čiščenje prejšnjih alarmov, ciljno ceno `0,79 €`,
izključeno e-poštno obvestilo in obstoj alarma po osvežitvi. TP-04 je nato
uspešno preveril ustvarjanje ločenega seznama, dodajanje izdelka natanko enkrat
ter obstoj izdelka po osvežitvi. Končna ločena izvedba TP-04 je bila **1/1
uspešna**, TP-05 pa **1/1 uspešen** v skupni izvedbi obeh testov.

## 3. Testno okolje

| | Lokalna izvedba | Izvedba v cevovodu |
|---|---|---|
| Datum in čas | 28. 10. 2026, 11:34 | 4. 11. 2026, po commitu ob 16:59 |
| Okolje | macOS, razvojni računalnik | GitHub Actions, `ubuntu-latest`, Node.js 22 |
| Brskalnik | Chromium (Playwright 1.64) | Chromium (najnovejši Playwright 1.x) |
| Frontend / backend | `localhost:5173` / `localhost:3000` | `localhost:5173` / `localhost:3000` (zažene ju Playwright) |
| MongoDB | produkcijska baza `BestPrice` | produkcijska baza `BestPrice` (testi jo samo berejo) |
| Firebase | produkcijski projekt, testni račun `test@test.si` | enako |
| Vzporednost / ponovitve | 2 delavca, brez ponovitev | 1 delavec, 1 ponovitev ob neuspehu |
| Trajanje | 49 s | 2,0 min (z ugotavljanjem ponovitev) |

TP-03 je bil po spremembi v mehka preverjanja (vsi koraki se izvedejo tudi po neuspešnem preverjanju) ponovno izveden lokalno 4. 11. 2026 ob 17:46. Rezultati te izvedbe so v razdelkih 3, 4 in 5.

## 4. Rezultati po testnih primerih

### TP-01 – Iskanje izdelka po ključni besedi in odpiranje podrobnosti · **Uspešen** (9,2 s)

Začetna stran se je naložila z navigacijo; klik »Izdelki« je odprl »Seznam izdelkov« s poljem »Išči izdelek«. Seznam se je sproti filtriral že po vnosu »mle« in nato po »mleko«. Prvi trije zadetki: *Trajno polnomastno Pomursko mleko, 3,5 % m.m., Pomurske mlekarne, 1 l* · *Čokoladno mleko, Ljubljanske mlekarne, 200 ml* · *Trajno polnomastno Alpsko mleko, 3,5 % m.m., Ljubljanske mlekarne, 1 l* – vsi vsebujejo »mleko«. Pri izdelku (Mercator) se je odprla stran »Podrobnosti izdelka« z enakim imenom in ceno 1,65 € kot na seznamu. Po »Nazaj« in brisanju iskanja je bilo polje prazno in prikazan celoten seznam. Test ni poslal nobene zahteve, ki spreminja podatke.

### TP-02 – Primerjava ponudb istega izdelka med različnimi trgovinami · **Neuspešen** (7,6 s; ponovitev 8,0 s)

Izdelek je bil med zadetki za »Pomursko mleko«; podrobnosti so prikazale ceno 1,65 €. Storitev `/api/compare-prices` na lokalnem backendu je odgovorila (HTTP 200). Razdelek »Primerjava cen v drugih trgovinah« je prikazal tri ponudbe:

| # | Trgovina | Prikazano ime | Cena | Enakovreden izdelek? |
|---|---|---|---:|:---:|
| 1 | Tuš | Masleni namaz Pomurske mlekarne, 125 g | 1,39 € | ❌ maslo, 125 g |
| 2 | Mercator | Trajno polnomastno Pomursko mleko, 3,5 % m.m., Pomurske mlekarne, 1 l | 1,65 € | ✅ (izbrani izdelek sam) |
| 3 | Jager | SMETANA 33% 250ML POMURSKE MLEKARNE | 2,39 € | ❌ smetana, 250 ml |

Ponudbi 1 in 3 nista trajno polnomastno mleko 1 l, kar je po pričakovanem rezultatu 4 **neuspeh testa**; edina enakovredna ponudba je izbrani izdelek sam. Vrstni red po ceni je pravilen (1,39 → 1,65 → 2,39 €). Klik na najcenejšo ponudbo je odprl podrobnosti »Masleni namaz Pomurske mlekarne, 125 g« z akcijsko ceno 1,39 € (redna 1,86 €) – ime in cena se ujemata s ponudbo. Podatki v bazi so ostali nespremenjeni.

### TP-03 – Zavrnitev prijave z napačnim geslom in nadzor dostopa · **Neuspešen** (31,9 s; ponovitev 32,0 s)

V navigaciji sta bila »Prijava« in »Registracija«; stran »Prijava« ima polji »E-poštni naslov« in »Geslo«; naslov `test@test.si` je bil vpisan. Firebase je napačno geslo zavrnil, uporabnik je ostal na strani »Prijava«, seja ni bila vzpostavljena.
Prikazano sporočilo: **»Napaka pri prijavi: Firebase: Error (auth/invalid-credential).«** Ista koda je izpisana tudi v obrazcu. Sporočilo ne izda gesla, vsebuje pa tehnično kodo → **neuspeh pričakovanega rezultata 5**.
Po vnosu `/profile` aplikacija v 15 s ni preusmerila na »Prijava« in ni sporočila, da je potrebna prijava → **neuspeh pričakovanega rezultata 6**.

**Ponovna izvedba z mehkimi preverjanji (4. 11. 2026, 17:46, 80,0 s)** je izvedla vse korake do konca. Rezultat je enak, dodatno pa je pokazala: odjavljenemu uporabniku se na `/profile` prikaže stran profila z razdelkoma »Cenovni alarmi« in »Seznami« ter gumbom »Uredi profil« (e-pošta testnega računa ni prikazana) → dodatni neuspeh pričakovanega rezultata 6. V navigaciji sta bila tudi po neuspešni prijavi »Prijava« in »Registracija« (pričakovani rezultat 4 izpolnjen), uporabnik je ostal odjavljen (pogoj po testu izpolnjen). Skupaj je padlo 6 preverjanj.

### TP-04 – Dodajanje izdelka v nakupovalni seznam · **Uspešen** (7,3 s)

Prikazani so bili uporabnikovi seznami in polje »Ime novega seznama...«. Seznam »Testni nakup« je že obstajal; odprt je bil brez navedenega izdelka. Iskalnik »Išči izdelek po trgovinah« je za »Pomursko mleko« prikazal zadetke z imenom, trgovino in ceno. Po kliku na zadetek Mercator je bil izdelek na seznamu pod »Mercator« s ceno 1,65 €; po osvežitvi natanko enkrat z enakimi podatki. Po kliku na koš izdelka ni bilo več in seznam je bil v začetnem stanju (preverjeno tudi po ponovni osvežitvi).

### TP-05 – Ustvarjanje cenovnega alarma · **Uspešen** (17,3 s)

Pred testom pod »Aktivni alarmi« ni bilo alarmov. Stran izdelka (Mercator) je prikazala ceno 1,65 € in gumb »Nastavi alarm«; odprlo se je okno »Obvesti me, ko cena pade pod« s poljem »Ciljna cena (€)«. Po vnosu 0,79 (e-pošta izključena) in »Shrani« se je prikazalo »Opozorilo za ceno je bilo uspešno nastavljeno!«. Na profilu je bil pod »Aktivni alarmi« natanko en alarm za izdelek s ciljno ceno 0,79 € in oznako »Email obvestilo izklopljeno«; po osvežitvi enako.

## 5. Ugotovljene napake

| ID | Resnost | Kje | Opis | Stanje |
|---|---|---|---|---|
| N-01 | Visoka | TP-03 / korak 6 | `/profile` ni zaščiten pred odjavljenim uporabnikom | odprta |
| N-02 | Visoka | TP-02 / korak 4 | Primerjava cen prikazuje drugačne izdelke kot isti izdelek | odprta |
| N-03 | Srednja | TP-03 / korak 5 | Sporočilo ob neuspešni prijavi vsebuje tehnično kodo Firebase | odprta |
| N-04 | Nizka | TP-02 / korak 3 | »Primerjava cen v drugih trgovinah« vključuje izbrani izdelek sam | odprta |
| N-05 | Visoka | cevovod (vsi testi) | Aplikacija se na Linuxu ne naloži zaradi velikih/malih črk v uvozih | **odpravljena** (`e0598b3`) |

**N-01 – Stran profila brez nadzora dostopa.** *Pričakovano:* preusmeritev na »Prijava« ali sporočilo, da je potrebna prijava. *Dejansko:* ni preusmeritve ne sporočila; prikaže se stran profila z razdelkoma »Cenovni alarmi« in »Seznami« ter gumbom »Uredi profil«. *Vzrok:* `App.jsx` registrira vse poti brez zaščite; `profile.jsx` ob odjavljenem uporabniku le ne naloži podatkov. *Predlog:* zaščitna komponenta, ki po prvem `onAuthStateChanged` odjavljenega uporabnika preusmeri na `/sign-in`.

**N-02 – Primerjava cen ni primerjava istega izdelka.** *Pričakovano:* vse ponudbe so trajno polnomastno mleko 1 l. *Dejansko:* Tuš »Masleni namaz … 125 g«, Jager »SMETANA 33% 250ML …«. *Vzrok:* `server.js` (`findBestWithFuse`, `/api/compare-prices`): predizbor po katerikoli besedi imena (zadošča »Pomurske«), nato približno ujemanje Fuse.js s pragom 0,4 in vedno en zadetek na trgovino – brez preverjanja vrste izdelka, različice in pakiranja. *Predlog:* strožje ujemanje (vse ključne besede, enako pakiranje, minimalna ocena ujemanja); ob neujemanju trgovine ne prikazati.

**N-03 – Tehnična koda v sporočilu o napaki.** *Pričakovano:* npr. »Napačen e-poštni naslov ali geslo.« *Dejansko:* »Napaka pri prijavi: Firebase: Error (auth/invalid-credential).« v obvestilu in obrazcu. *Vzrok:* `sign-in.jsx`: `toast.error("Napaka pri prijavi: " + e.message)` in `setError(e.message)`. *Predlog:* preslikava `e.code` v slovenska sporočila.

**N-04 – Izbrani izdelek v »drugih trgovinah«.** Ponudba Mercator je izbrani izdelek sam. *Predlog:* izključiti izdelek z enakim `_id` ali preimenovati razdelek.

**N-05 – Neujemanje velikih in malih črk v uvozih.** macOS pri imenih datotek ne loči velikih in malih črk, Linux jih. Uvozi `./UserAvatar`, `@/widgets/cards/CategoryAvgPriceChart` in `@/widgets/cards/CategoryDistributionDonutChart` se niso ujemali z datotekami `userAvatar.jsx`, `categoryAvgPriceChart.jsx` in `categoryDistributionDonutChart.jsx`. Vite v cevovodu zato ni mogel naložiti aplikacije in so padli vsi testi (zagon commita `20f2c20`). Napaka bi enako prizadela vsako gradnjo na Linuxu. Uvozi so bili popravljeni; pregled vseh uvozov v `src` ne najde več neujemanj.

## 5. Preglednica skladnosti s testnimi primeri

Oznake: ✅ izvedeno, rezultat ustreza · ❌ izvedeno, rezultat ne ustreza.

### TP-01

| Pričakovani rezultat | Preverjanje v skripti | Rezultat |
|---|---|:---:|
| Predpogoji 1–3 | strežnika zagnana; prikazani izdelki brez »mleko«; ni seje | ✅ |
| 1. Začetna stran z navigacijo | URL `/home`; povezavi »BestPrice« in »Izdelki« | ✅ |
| 2. »Seznam izdelkov« s poljem »Išči izdelek« | URL `/products`; naslov; oznaka; polje | ✅ |
| 3. Sprotno filtriranje | filtrirano po »mle« in po »mleko«; ni gumba za potrditev | ✅ |
| 4. Prvi trije zadetki vsebujejo »mleko« | 3 imena, zabeležena v poročilu | ✅ |
| 5. Podrobnosti: enako ime in cena 1,65 € | naslov = ime s kartice; cena = 1,65 € = cena na seznamu | ✅ |
| 6. Prazno polje, celoten seznam | prazno polje; enaka prva stran in število strani kot pred iskanjem | ✅ |
| Pogoj po testu: baza nespremenjena | ni zahtev, ki spreminjajo podatke | ✅ |

### TP-02

| Pričakovani rezultat | Preverjanje v skripti | Rezultat |
|---|---|:---:|
| Predpogoji 1–3 | strežnika zagnana; `/api/compare-prices` → 200; ni seje | ✅ |
| 1. Izdelek med zadetki | kartica z imenom in trgovino Mercator | ✅ |
| 2. Podrobnosti s ceno 1,65 € | naslov = ime; cena 1,65 € | ✅ |
| 3. ≥ 2 ponudbi različnih trgovin s trgovino, imenom, ceno | 3 ponudbe, 3 trgovine, vsaka s 3 podatki | ✅ |
| 4. Vse ponudbe enakovredne (trajno polnomastno mleko, 1 l) | ime: »trajn«, »mleko«, »polnomastn«/»3,5 %«, pakiranje 1 l | ❌ (N-02) |
| 5. Urejeno naraščajoče | 1,39 ≤ 1,65 ≤ 2,39 | ✅ |
| 6. Najcenejša ponudba: ime in cena se ujemata | URL ponudbe; ime; cena 1,39 € | ✅ |
| Pogoj po testu: baza nespremenjena | ni zahtev, ki spreminjajo podatke | ✅ |

### TP-03

| Pričakovani rezultat | Preverjanje v skripti | Rezultat |
|---|---|:---:|
| Predpogoji 1–3 | ni seje; Firebase vrne 400 `INVALID_LOGIN_CREDENTIALS` | ✅ |
| 1. »Prijava« in »Registracija« v navigaciji | oba gumba vidna | ✅ |
| 2. Stran »Prijava« s poljema | URL, naslov, oznaki, polje za geslo skrito | ✅ |
| 3. Naslov vpisan | vrednost polja | ✅ |
| 4. Prijava zavrnjena, ostane na »Prijava« | URL `/sign-in`; gumb omogočen; ni seje | ✅ |
| 4. … v navigaciji še »Prijava« in »Registracija« | preverjeno na `/profile` (na `/sign-in` aplikacija navigacije ne prikazuje) | ✅ |
| 5. Sporočilo prikazano, v slovenščini, ne izda gesla | obvestilo vidno; vsebuje »Napaka«; gesla ni | ✅ |
| 5. Brez tehničnih kod | obvestilo in stran brez »Firebase«/»auth/« | ❌ (N-03) |
| 6. Preusmeritev ali sporočilo o potrebni prijavi | URL `/sign-in` ali besedilo o prijavi | ❌ (N-01) |
| 6. Vsebina profila se ne prikaže | ni »Cenovni alarmi«, »Seznami«, »Uredi profil« | ❌ (N-01) |
| 6. … e-pošta testnega računa ni prikazana | e-pošte `test@test.si` ni na strani | ✅ |
| Pogoj po testu: odjavljen | ni seje | ✅ |

Rezultati za TP-03 so iz ponovne izvedbe 4. 11. 2026 ob 17:46 (mehka preverjanja).

### TP-04

| Pričakovani rezultat | Preverjanje v skripti | Rezultat |
|---|---|:---:|
| Predpogoja 1–2 | prijava; izdelka ni na seznamu | ✅ |
| 1. Seznami in polje »Ime novega seznama...« | vsi seznami prikazani; polje omogočeno | ✅ |
| 2. »Testni nakup« viden, odprt, brez izdelka | izbran; 0 vrstic izdelka | ✅ |
| 3. Zadetki z imenom, trgovino, ceno | vsak zadetek `Trgovina – x.xx €` | ✅ |
| 4. Pod »Mercator« s 1,65 € | vrstica v skupini »Mercator«, 1,65 € | ✅ |
| 5. Po osvežitvi natanko enkrat, Mercator, 1,65 € | 1 vrstica, enaki podatki | ✅ |
| 6. Izdelka ni, začetno stanje | 0 vrstic izdelka; enako število vrstic kot na začetku | ✅ |
| Pogoj po testu | po osvežitvi izdelka ni | ✅ |

### TP-05

| Pričakovani rezultat | Preverjanje v skripti | Rezultat |
|---|---|:---:|
| Predpogoja 1–2 (s pripravo podatkov) | prijava; 0 aktivnih alarmov | ✅ |
| 1. Cena 1,65 € in »Nastavi alarm« | Mercator; 1,65 €; gumb | ✅ |
| 2. Okno s poljem »Ciljna cena (€)« | dialog, oznaka, polje | ✅ |
| 3. Sporočilo o uspešno nastavljenem opozorilu | obvestilo; brez napake; e-pošta izključena | ✅ |
| 4. Natanko en aktivni alarm: izdelek, 0,79 €, e-pošta izklopljena | 1 vrstica pod »Aktivni alarmi« z vsemi podatki | preverjeno v testu |
| 5. Po osvežitvi natanko en alarm | enako po osvežitvi | ✅ |
| 6. Ni aktivnih alarmov | 0 vrstic, »Ni aktivnih alarmov« | ✅ |
| Pogoj po testu | po osvežitvi 0 | ✅ |

## 6. Pregled novo napisanih testov

| Test | Predpogoji in podatki | Zajeti koraki in preverjeni rezultati | Lokatorji | Omejitve |
|---|---|---|---|---|
| TP-01 | Javni katalog, `mleko`, izdelek Mercator | Filtriranje, podrobnosti, ime/cena, vrnitev in čiščenje iskanja | `getByRole`, `getByPlaceholder`, `getByText` | Cena je nastavljiva z `E2E_PRODUCT_PRICE` |
| TP-02 | Javni katalog, `Pomursko mleko` | Ponudbe, primerljivost mleka/pakiranja 1 l, različne trgovine in naraščajoče cene | `getByRole`, seznam in postavke | Test pade ob neveljavnih ponudbah |
| TP-03 | Odjavljena seja, testni e-poštni naslov, napačno geslo | Obrazec, zavrnitev, napaka, brez seje in zaščita profila | `getByRole`, `input[type=email/password]` | Potrebuje Firebase okolje |
| TP-04 | Prijavljen testni račun, naključno ime seznama | Ustvarjanje, iskanje/dodajanje, brez podvojitve in obstoj po osvežitvi | `getByRole`, `getByPlaceholder`, `getByText` | Potrebuje `TEST_USER_PASSWORD` in Firestore |
| TP-05 | Prijavljen testni račun, `0,79 €`, e-pošta izključena | Nastavitev alarma, ciljna cena, stanje e-pošte in obstoj po osvežitvi | `getByRole`, dialog, `getByText` | Potrebuje `TEST_USER_PASSWORD` in Firestore |

Datoteke TP-01–TP-05 so bile napisane na novo in ne uvažajo datotek iz
`frontend/tests/funkcionalni`; uporabljajo le novo ustvarjeni `test-helpers.ts`.

## 7. Izbira orodja

Za avtomatizacijo funkcionalnih testov je bil izbran **Playwright Test**. Razlogi:

- **Že del projekta.** `@playwright/test` je bil že med razvojnimi odvisnostmi frontenda, v njem so bili napisani tudi prvi testi (`tests/test-1.spec.ts`), zato novega orodja ni bilo treba uvajati.
- **Zanesljivo čakanje.** Playwright pred vsako akcijo samodejno počaka, da je element viden in omogočen, preverjanja pa ponavlja do časovne omejitve. Fiksne pavze niso potrebne, kar je pri aplikaciji z asinhronim nalaganjem podatkov iz backenda in Firestore ključno za stabilnost testov.
- **Stabilni selektorji.** Iskanje elementov po vlogi, besedilu in placeholderju (`getByRole`, `getByText`, `getByPlaceholder`) sledi temu, kar vidi uporabnik, in ni vezano na CSS razrede.
- **Diagnostika ob neuspehu.** Ob neuspešnem testu se samodejno shranijo posnetek zaslona, video in sled izvajanja (trace); rezultati so zbrani v HTML poročilu po korakih testa.
- **Zagon aplikacije pred testi.** Z nastavitvijo `webServer` Playwright sam zažene backend in frontend ter počaka, da sta pripravljena – ločeni zagonski skripti nista potrebni.
- **Primernost za CI.** Brskalnik se namesti z enim ukazom (`npx playwright install --with-deps chromium`), testi tečejo brez grafičnega vmesnika, orodje je odprtokodno in brezplačno.

## 7. Vključitev v cevovod

Testi so vključeni v **GitHub Actions**, kjer projekt že izvaja druge avtomatizirane naloge (zajem cen, varnostno kopiranje baze, cenovni alarmi, e-novice). Cevovod je opisan v datoteki `.github/workflows/avtomatizacija_testov.yml` in se sproži ob vsakem pushu na vejo `main`, ob vsakem pull requestu in ročno (»Run workflow«). Tako se funkcionalnost aplikacije preveri ob vsaki spremembi kode, preden ta doseže uporabnike. Koraki:

1. prevzem kode,
2. namestitev odvisnosti backenda (`npm ci`) in frontenda (`npm install`),
3. namestitev brskalnika Chromium,
4. preverjanje, da so nastavljene vse skrivnosti,
5. izvedba testov – Playwright sam zažene backend in frontend ter počaka, da je backend povezan z bazo,
6. izdelava HTML poročila,
7. shranjevanje poročila, posnetkov zaslona, videov in sledi izvajanja kot artefakta `playwright-report` (tudi ob neuspehu, 14 dni).

**Rezultat.** Če kateri koli test ne uspe, Playwright konča z izhodno kodo 1 in GitHub zagon označi kot neuspešen; neuspešni test se pred tem še enkrat ponovi, da se izloči naključne napake. Vzrok je razviden iz dnevnika koraka 5 ter iz HTML poročila, posnetkov zaslona in sledi izvajanja v artefaktu zagona. Dokler napake N-01 do N-03 niso odpravljene, je pričakovan status zagona neuspešen.

## 10. Izvajanje

Lokalno:
```bash
cd frontend
npm run test:e2e:anja                # uporabi .env.e2e; če je prazna, .env.e2e.example
npx playwright install chromium      # enkratno
npm run test:e2e                     # osnovni sklop TP-01 … TP-05
npm run test:e2e:anja                # tests_Anja TP-01 … TP-05
npm run test:e2e:anja                # ločeni sklop tests_Anja TP-01 … TP-05
npm run test:e2e:report              # HTML poročilo
```

V cevovodu: GitHub → Actions → »Playwright funkcionalni testi« → zagon → na dnu strani **Artifacts → playwright-report**.