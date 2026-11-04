# BestPrice – poročilo o avtomatiziranem funkcionalnem testiranju (Playwright)

| Podatek | Vrednost |
|---|---|
| Vir testnih primerov | `testni_primeri.md` (TP-01 … TP-05, matrika F-01 … F-09; različica z dne 28. 10. 2026) |
| Datum in čas izvedbe | 28. 10. 2026, 11:34:16 CET (lokalno pri uporabniku) |
| Skupno trajanje | 49,3 s (2 vzporedna delavca) |
| Brskalnik | Chromium (Playwright 1.64) |
| Frontend / backend | `http://localhost:5173` / `http://localhost:3000` |
| Vir rezultatov | HTML poročilo `frontend/playwright-report` in `frontend/test-results` tega zagona |

## 1. Povzetek

| Uspešni | Neuspešni | Niso bili izvedeni | Skupaj |
|:---:|:---:|:---:|:---:|
| 3 (TP-01, TP-04, TP-05) | 2 (TP-02, TP-03) | 0 | 5 |

| TP | Funkcionalnost | Status | Trajanje | Neuspešni koraki |
|---|---|:---:|---:|---|
| TP-01 | F-01 Iskanje, F-02 Podrobnosti | ✅ Uspešen | 6,6 s | — |
| TP-02 | F-03 Primerjava cen | ❌ Neuspešen | 6,9 s | Korak 4 (enakovrednost ponudb) |
| TP-03 | F-04 Prijava, F-05 Nadzor dostopa | ❌ Neuspešen | 32,5 s | Korak 5 (sporočilo o napaki), korak 6 (dostop do `/profile`) |
| TP-04 | F-06 Nakupovalni seznam, F-07 Shranjevanje | ✅ Uspešen | 12,2 s | — |
| TP-05 | F-08 Cenovna obvestila, F-09 Shranjevanje | ✅ Uspešen | 26,9 s | — |

Oba neuspeha razkrivata napake v aplikaciji (razdelek 3), ne napak v testnih skriptah.

## 2. Dejanski rezultat in status po testnih primerih

Besedilo je pripravljeno za polji **Dejanski rezultat** in **Status** v `testni_primeri.md`.

### TP-01 – Iskanje izdelkov · **Status: Uspešen**

Začetna stran se je naložila z navigacijo; klik »Izdelki« je odprl »Seznam izdelkov« s poljem »Išči izdelek«. Seznam se je sproti filtriral že po vnosu »mle« in nato po »mleko«. Prvi trije zadetki: *Trajno polnomastno Pomursko mleko, 3,5 % m.m., Pomurske mlekarne, 1 l* · *Čokoladno mleko, Ljubljanske mlekarne, 200 ml* · *Trajno polnomastno Alpsko mleko, 3,5 % m.m., Ljubljanske mlekarne, 1 l* – vsi vsebujejo »mleko«. Pri izdelku (Mercator) se je odprla stran »Podrobnosti izdelka« z enakim imenom in ceno 1,65 € kot na seznamu. Po »Nazaj« in brisanju iskanja je bilo polje prazno in prikazan celoten seznam (enaka prva stran in število strani kot pred iskanjem). Test ni poslal nobene zahteve, ki spreminja podatke.

### TP-02 – Primerjava cen · **Status: Neuspešen**

Izdelek je bil med zadetki za »Pomursko mleko«; podrobnosti so prikazale ceno 1,65 €. Storitev `GET http://localhost:3000/api/compare-prices` je vrnila 200. Razdelek »Primerjava cen v drugih trgovinah« je prikazal 3 ponudbe 3 trgovin (zabeleženo 28. 10. 2026 ob 11:34:23):

| # | Trgovina | Prikazano ime | Cena | Enakovreden izdelek? |
|---|---|---|---:|:---:|
| 1 | Tuš | Masleni namaz Pomurske mlekarne, 125 g | 1,39 € | ❌ maslo, 125 g |
| 2 | Mercator | Trajno polnomastno Pomursko mleko, 3,5 % m.m., Pomurske mlekarne, 1 l | 1,65 € | ✅ (izbrani izdelek sam) |
| 3 | Jager | SMETANA 33% 250ML POMURSKE MLEKARNE | 2,39 € | ❌ smetana, 250 ml |

Ponudbi 1 in 3 nista trajno polnomastno mleko 1 l – po pričakovanem rezultatu 4 to pomeni **neuspeh testa**. Edina enakovredna ponudba je izbrani izdelek sam, zato primerjave istega izdelka v vsaj dveh trgovinah dejansko ni. Vrstni red po ceni je pravilen (1,39 → 1,65 → 2,39 €). Klik na najcenejšo ponudbo je odprl podrobnosti »Masleni namaz Pomurske mlekarne, 125 g« z akcijsko ceno 1,39 € (redna 1,86 €, −25 %) – ime in cena se ujemata s ponudbo. Podatki v bazi so ostali nespremenjeni.

### TP-03 – Prijava z napačnim geslom in nadzor dostopa · **Status: Neuspešen**

Na začetni strani sta bila v navigaciji »Prijava« in »Registracija«; stran »Prijava« ima polji »E-poštni naslov« in »Geslo«; naslov `test@test.si` je bil vpisan. Firebase je napačno geslo zavrnil (HTTP 400), uporabnik je ostal na strani »Prijava«, seja ni bila vzpostavljena.
Prikazano sporočilo: **»Napaka pri prijavi: Firebase: Error (auth/invalid-credential).«** – sporočilo je slovensko le delno, vsebuje tehnično kodo Firebase (ista koda je izpisana tudi v obrazcu pod naslovom »Vnesi svoj e-poštni naslov in geslo za prijavo.«); gesla ne izda. → **neuspeh pričakovanega rezultata 5.**
Po vnosu `http://localhost:5173/profile` aplikacija v 15 s ni preusmerila na »Prijava« in ni prikazala sporočila, da je potrebna prijava. → **neuspeh pričakovanega rezultata 6.**

### TP-04 – Nakupovalni seznam · **Status: Uspešen**

Prikazani so bili uporabnikovi seznami in polje »Ime novega seznama...«. Seznam »Testni nakup« je že obstajal; odprt je bil brez navedenega izdelka. Iskalnik »Išči izdelek po trgovinah« je za »Pomursko mleko« prikazal zadetke z imenom, trgovino in ceno. Po kliku na zadetek Mercator je bil izdelek na seznamu pod »Mercator« s ceno 1,65 €; po osvežitvi natanko enkrat z enakimi podatki. Po kliku na koš izdelka ni bilo več in seznam je bil v začetnem stanju (preverjeno tudi po ponovni osvežitvi).

### TP-05 – Cenovni alarm · **Status: Uspešen**

Priprava podatkov: pod »Aktivni alarmi« ni bilo alarmov, brisanje ni bilo potrebno. Stran izdelka (Mercator) je prikazala ceno 1,65 € in gumb »Nastavi alarm«; odprlo se je okno »Obvesti me, ko cena pade pod« s poljem »Ciljna cena (€)«. Po vnosu 1.48 (e-pošta izključena) in »Shrani« se je prikazalo »Opozorilo za ceno je bilo uspešno nastavljeno!«. Na profilu je bil pod »Aktivni alarmi« natanko en alarm za izdelek s ciljno ceno 1.48 € in oznako »Email obvestilo izklopljeno«; po osvežitvi enako. Po »Uredi alarme« → »Izbriši« pod »Aktivni alarmi« ni bilo nobenega alarma (tudi po osvežitvi). Pospravljanje ni bilo potrebno.

## 3. Ugotovljene napake v aplikaciji

| ID | Resnost | TP / korak | Opis |
|---|---|---|---|
| N-01 | Visoka | TP-03 / 6 | `/profile` ni zaščiten pred odjavljenim uporabnikom |
| N-02 | Visoka | TP-02 / 4 | Primerjava cen prikazuje drugačne izdelke kot isti izdelek |
| N-03 | Srednja | TP-03 / 5 | Sporočilo ob neuspešni prijavi vsebuje tehnično kodo Firebase |
| N-04 | Nizka | TP-02 / 3 | »Primerjava cen v drugih trgovinah« vključuje izbrani izdelek sam |

**N-01 – Stran profila brez nadzora dostopa.**
*Pričakovano:* preusmeritev na »Prijava« ali sporočilo, da je potrebna prijava. *Dejansko:* ni preusmeritve ne sporočila (čakanje 15 s).
*Vzrok:* `App.jsx` registrira vse poti brez zaščite; `profile.jsx` ob `!user` le prekine nalaganje podatkov in izriše prazen profil.
*Predlog:* zaščitna komponenta (npr. `RequireAuth`), ki ob odjavljenem uporabniku preusmeri na `/sign-in` (počaka na prvi `onAuthStateChanged`, da ne preusmeri prijavljenega uporabnika med nalaganjem).

**N-02 – Primerjava cen ni primerjava istega izdelka.**
*Pričakovano:* vse ponudbe so trajno polnomastno mleko 1 l. *Dejansko:* Tuš »Masleni namaz … 125 g«, Jager »SMETANA 33% 250ML …«.
*Vzrok:* `server.js`, `findBestWithFuse` + `/api/compare-prices`: predizbor z OR-regexom po posameznih besedah imena (zadošča že »Pomurske«), nato Fuse.js s pragom 0,4 in **vedno** en zadetek na trgovino – brez preverjanja vrste izdelka, različice in pakiranja ter brez praga, pod katerim trgovina ne vrne nič.
*Predlog:* strožje ujemanje (vse ključne besede, ujemanje pakiranja/količine, nižji prag ali minimalna ocena) in ob neujemanju ne vrniti ponudbe; prikaz »Primerjava ni na voljo«, ko enakovrednih ponudb ni.

**N-03 – Tehnična koda v sporočilu o napaki.**
*Pričakovano:* npr. »Napačen e-poštni naslov ali geslo.« brez tehničnih kod. *Dejansko:* »Napaka pri prijavi: Firebase: Error (auth/invalid-credential).« v obvestilu in v obrazcu.
*Vzrok:* `sign-in.jsx` (vrstici 54–55): `toast.error("Napaka pri prijavi: " + e.message)` in `setError(e.message)`.
*Predlog:* preslikava `e.code` (`auth/invalid-credential`, `auth/wrong-password`, `auth/user-not-found` → »Napačen e-poštni naslov ali geslo.«, `auth/too-many-requests` → »Preveč poskusov, poskusi znova kasneje.«, privzeto »Prijava ni uspela.«).

**N-04 – Izbrani izdelek v »drugih trgovinah«.**
Ponudba Mercator je izbrani izdelek sam. Naslov razdelka obljublja druge trgovine; predlog: izključiti izdelek z enakim `_id` (ali spremeniti naslov v »Primerjava cen v trgovinah«).

## 4. Preglednica skladnosti in rezultatov

Oznake: ✅ izvedeno, rezultat ustreza · ❌ izvedeno, rezultat ne ustreza · ⏭ ni bilo izvedeno (test se je pred tem ustavil).

### TP-01

| Pričakovani rezultat | Preverjanje v skripti | Rezultat |
|---|---|:---:|
| Predpogoji 1–3 | `webServer`; prikazani izdelki brez »mleko«; seja `null` | ✅ |
| 1. Začetna stran z navigacijo | URL `/home`; povezavi »BestPrice« in »Izdelki« | ✅ |
| 2. »Seznam izdelkov« s poljem »Išči izdelek« | URL `/products`; naslov; oznaka; polje | ✅ |
| 3. Sprotno filtriranje | filtrirano po »mle« in po »mleko«; ni gumba za potrditev | ✅ |
| 4. Prvi trije zadetki vsebujejo »mleko« | 3 imena (zabeležena) | ✅ |
| 5. Podrobnosti: enako ime in cena 1,65 € | `<h4>` = ime s kartice; cena = 1.65 € = cena na seznamu | ✅ |
| 6. Prazno polje, celoten seznam | `toHaveValue('')`; enak »podpis« seznama kot pred iskanjem | ✅ |
| Pogoj po testu: baza nespremenjena | ni ne-GET zahtev na API | ✅ |

### TP-02

| Pričakovani rezultat | Preverjanje v skripti | Rezultat |
|---|---|:---:|
| Predpogoji 1–3 | `webServer`; `/api/compare-prices` → 200; seja `null` | ✅ |
| 1. Izdelek med zadetki | kartica z imenom in trgovino Mercator | ✅ |
| 2. Podrobnosti s ceno 1,65 € | `<h4>` ime; cena 1.65 € | ✅ |
| 3. ≥ 2 ponudbi različnih trgovin s trgovino, imenom, ceno | 3 vrstice, 3 trgovine, vsaka s 3 podatki | ✅ (le 1 enakovredna – gl. 4) |
| 4. Vse ponudbe enakovredne (trajno polnomastno mleko, 1 l) | ime: »trajn«, »mleko«, »polnomastn«/»3,5 %«, pakiranje 1 l | ❌ Tuš in Jager (N-02) |
| 5. Urejeno naraščajoče | 1,39 ≤ 1,65 ≤ 2,39 | ✅ |
| 6. Najcenejša ponudba: ime in cena se ujemata | URL = povezava ponudbe; `<h4>` = ime; cena 1,39 € | ✅ |
| Pogoj po testu: baza nespremenjena | ni ne-GET zahtev | ✅ |

### TP-03

| Pričakovani rezultat | Preverjanje v skripti | Rezultat |
|---|---|:---:|
| Predpogoji 1–3 | seja `null`; Firebase odgovori 400 `INVALID_LOGIN_CREDENTIALS` | ✅ |
| 1. »Prijava« in »Registracija« v navigaciji | oba gumba vidna | ✅ |
| 2. Stran »Prijava« s poljema | URL, naslov, oznaki, polje `type=password` | ✅ |
| 3. Naslov vpisan | `toHaveValue` | ✅ |
| 4. Prijava zavrnjena, ostane na »Prijava« | URL `/sign-in`; gumb omogočen; seja `null` | ✅ |
| 4. … v navigaciji še »Prijava« in »Registracija« | predvideno po koraku 6 (na `/sign-in` ni navigacije) | ⏭ |
| 5. Sporočilo prikazano | obvestilo vidno | ✅ |
| 5. Sporočilo v slovenščini | vsebuje »Napaka« | ✅ |
| 5. Brez tehničnih kod | obvestilo in stran brez »Firebase«/»auth/« | ❌ (N-03) |
| 5. Ne izda gesla | geslo ni v obvestilu ne na strani | ✅ |
| 6. Preusmeritev na »Prijava« ali sporočilo o prijavi | URL `/sign-in` ali besedilo o potrebni prijavi | ❌ (N-01) |
| 6. Profil (ime, alarmi, seznami) se ne prikaže | odsotnost »Cenovni alarmi«, »Seznami«, »Uredi profil«, e-pošte | ⏭ |
| Pogoj po testu: odjavljen, brez seje | seja `null` | ⏭ |

### TP-04

| Pričakovani rezultat | Preverjanje v skripti | Rezultat |
|---|---|:---:|
| Predpogoja 1–2 | prijava; izdelka ni na seznamu | ✅ |
| 1. Seznami in polje »Ime novega seznama...« | vsi seznami (število s profila); polje omogočeno | ✅ |
| 2. »Testni nakup« viden, odprt, brez izdelka | obstajal; izbran; 0 vrstic izdelka | ✅ |
| 3. Zadetki z imenom, trgovino, ceno | vsak zadetek `Trgovina – x.xx €` | ✅ |
| 4. Pod »Mercator« s 1,65 € | vrstica v skupini »Mercator«, 1.65 € | ✅ |
| 5. Po osvežitvi natanko enkrat, Mercator, 1,65 € | 1 vrstica, enaki podatki | ✅ |
| 6. Izdelka ni, začetno stanje | 0 vrstic izdelka; enako število vrstic kot na začetku | ✅ |
| Pogoj po testu | po osvežitvi izdelka ni | ✅ |

### TP-05

| Pričakovani rezultat | Preverjanje v skripti | Rezultat |
|---|---|:---:|
| Predpogoja 1–2 (s pripravo podatkov) | prijava; 0 aktivnih alarmov (brisanje ni bilo potrebno) | ✅ |
| 1. Cena 1,65 € in »Nastavi alarm« | Mercator; 1.65 €; gumb | ✅ |
| 2. Okno s poljem »Ciljna cena (€)« | dialog, oznaka, polje | ✅ |
| 3. »Opozorilo za ceno je bilo uspešno nastavljeno!« | obvestilo; brez napake; e-pošta izključena | ✅ |
| 4. Natanko en aktivni alarm: izdelek, 1.48 €, e-pošta izklopljena | 1 vrstica pod »Aktivni alarmi« z vsemi podatki | ✅ |
| 5. Po osvežitvi natanko en alarm | enako po `reload` | ✅ |
| 6. Ni aktivnih alarmov | 0 vrstic, »Ni aktivnih alarmov« | ✅ |
| Pogoj po testu | po osvežitvi 0; pospravljanje ni bilo potrebno | ✅ |

## 5. Omejitve tega zagona in testov

- **TP-03 – neizvedena preverjanja:** neuspeh v koraku 6 (preusmeritev) je ustavil test, zato se niso izvedla preverjanja, da se vsebina profila ne prikaže, da navigacija ponuja »Prijava« in »Registracija« ter pogoj po testu. Glede na kodo (`profile.jsx`) se odjavljenemu uporabniku izriše prazen profil z razdelkoma »Cenovni alarmi« in »Seznami« – to je treba ob ponovnem zagonu potrditi.
- **TP-02 – enakovrednost** je ocenjena iz imena izdelka; v tem zagonu je bila ocena nedvoumna (maslo 125 g, smetana 250 ml).
- **Cena 1,65 €** je vezana na trenutne podatke; po naslednjem zajemu cen se lahko spremeni (`support/testData.ts → PRODUCT.price`).
- **En zagon:** stabilnost (ponovljivost) še ni potrjena z več zaporednimi zagoni; TP-04 in TP-05 sta zasnovana za ponovitev (podatki se počistijo).
- TP-01 in TP-02 sta tekla vzporedno; oba le bereta podatke.

## 6. Spremembe od prejšnje različice poročila

- `PriceComparison.jsx` zdaj kliče `${API_URL}/api/compare-prices` – v tem zagonu je primerjava uporabila lokalni backend (`localhost:3000`). Prejšnja ugotovitev o fiksnem naslovu `onrender.com` je odpravljena.
- TP-01: trgovina na strani podrobnosti ni več del pričakovanega rezultata (popravljen testni primer).
- TP-05: predpogoj »ni nobenega aktivnega alarma«, priprava podatkov (ob neuspehu test *ni izveden*) in pospravljanje v `afterEach`.

## 7. Priporočila

1. Odpraviti N-01 in N-03 ter ponovno zagnati TP-03.
2. Odpraviti N-02 (in po želji N-04) ter ponovno zagnati TP-02.
3. V TP-03 spremeniti preverjanje preusmeritve v koraku 6 v mehko (`expect.soft.poll`), da se ob neuspehu izvedejo tudi preostala preverjanja koraka 6 in pogoj po testu.
4. Dodati `data-testid` / `aria-label` na avatar, gumb koša in ikone (zdaj selektorji delno temeljijo na strukturi strani).
5. Za CI uporabiti ločen testni Firebase projekt (ali emulator) in testno bazo s stabilnimi cenami.

## 8. Datoteke in izvajanje

| Datoteka | Namen |
|---|---|
| `TP-01-iskanje.spec.ts` … `TP-05-cenovni-alarm.spec.ts` | testi |
| `support/testData.ts` | testni podatki; geslo samo iz `TEST_USER_PASSWORD` |
| `support/auth.ts`, `support/products.ts`, `support/userData.ts` | pomožne funkcije |
| `frontend/playwright.config.ts` | Chromium, HTML poročilo, posnetek/video/sled ob neuspehu, zagon strežnikov |
| `.github/workflows/playwright.yml` | GitHub Actions (poročilo kot artefakt tudi ob neuspehu) |

```bash
cd frontend
cp .env.e2e.example .env.e2e        # vpiši TEST_USER_PASSWORD
npx playwright install chromium      # enkratno
npm run test:e2e                     # TP-01 … TP-05
npm run test:e2e:report              # HTML poročilo
```

Ob neuspehu so v `frontend/test-results/<test>/` posnetek zaslona, video, sled (`trace.zip`) in `error-context.md`.
