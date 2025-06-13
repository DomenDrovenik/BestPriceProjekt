# BestPrice

BestPrice je spletna aplikacija, ki uporabnikom omogoča primerjavo cen izdelkov v različnih trgovinah, spremljanje zgodovine cen ter dostop do ocen in komentarjev drugih kupcev. Poleg tega aplikacija omogoča ustvarjanje nakupovalnih seznamov, nastavitev obvestil o padcu cen in ogled napredne statistike ter analitike.

## Opis

Aplikacija BestPrice omogoča:
- Prikaz trenutnih cen istega izdelka v različnih trgovinah.
- Pregled zgodovine cen izdelkov (grafi in seznam preteklih cen).
- Dodajanje ocen in komentarjev za izdelke (življenjska cena, kvaliteta ipd.).
- Ustvarjanje in upravljanje nakupovalnih seznamov z obračunom popustov.
- Nastavitev obvestil o padcu cene (price alerts), ki uporabnike opozorijo, ko izdelek doseže želeno ceno.
- Ogled analitičnih poročil na nadzorni plošči (Dashboard), kot so povprečne cene, delež akcijskih izdelkov in trendi gibanja cen.
- Izvoz nakupovalnega seznama v PDF.

## Uporabniki

- **Navdušenci nad varčevanjem**: Primerjajo cene istih izdelkov med različnimi trgovinami, da najdejo najnižjo možno ceno.  
- **Povprečni kupci**: Želijo spremljati gibanje cen določenih izdelkov in se odločiti, kdaj je pravi čas za nakup.  

## Ključne funkcionalnosti

- **Primerjava cen**  
  Obiskovalci aplikacije lahko hitro vidijo trenutno ceno izdelka v več priljubljenih trgovinah (npr. Mercator, Jager, Hofer, Tuš).  

- **Zgodovina cen**  
  Za vsak izdelek je na voljo graf in seznam preteklih cen, ki uporabniku omogočata primerjavo gibanja cen skozi čas.  

- **Komentarji in ocene**  
  Prijavljeni uporabniki lahko oddajo oceno (1–5 zvezdic) in napišejo komentar. Sistem prepreči podvajanje komentarjev za isti izdelek od istega uporabnika.  

- **Upravljanje nakupovalnih seznamov**  
  Uporabniki lahko ustvarjajo več nakupovalnih seznamov (npr. “Tedenska nabava”, “Šolski pribor”), dodajajo izdelke iz podrobnosti izdelka, urejajo količine, dodajajo popustne kode in izračunajo končno ceno.  

- **Obvestila o padcu cene (Price Alerts)**  
  Uporabniki spremljajo določene izdelke in vpišejo ciljno ceno. Po naslednjem avtomatskem scrapanju backend strežnik primerja trenutne cene z vpisanimi in ob zadostnem padcu sproži obvestilo (shranjeno v Firestore in/ali poslano po e-pošti).  

- **Nadzorna plošča (Dashboard)**  
  Dashboard prikazuje več grafov, kot so:
  - Porazdelitev izdelkov po kategorijah (donut graf).
  - Delež izdelkov, ki so trenutno v akciji (stolpčni graf).
  - Povprečna cena po trgovinah in kategorijah.
  - Trend gibanja povprečnih cen skozi čas.

- **Izvoz v PDF**  
  Nakupovalni seznam je mogoče izvoziti v PDF, v katerem so zajeti imena, količine, cene ter skupne vsote, da si uporabnik lahko seznam shrani ali natisne.

## Tehnološki sklad

- **Front-end**  
  - React + Vite (JavaScript, JSX)  
  - Material Tailwind (komponente)  
  - React Router (navigacija)  
  - SWR (stanje in fetchanje podatkov)  
  - Firebase SDK (Authentication, Firestore)  

- **Back-end**  
  - Node.js (JavaScript)  
  - Express.js (REST API)  
  - MongoDB (baza podatkov za cene, komentarje, nakupovalne sezname)  
  - Mongoose (ODM za MongoDB)  
  - Firebase Admin SDK (pošiljanje obvestil, dostop do Firestore)  

- **Gostovanje**  
  - **Frontend**: Firebase Hosting  
  - **Backend**: Railway (avtomatski deploy ob vsakem `git push`)  

## Arhitekturna shema
```text
Spletni brskalnik
       |
       v
+----------------------------------------+
| REACT SPA                              |
| - Domov, Iskanje, Izdelki              |
| - Profil, Seznami, Podrobnosti         |
| - Cenovni alarmi, Grafi, Kategorije    |
|                                        |
| Tehnologije:                           |
| - React, SWR, Tailwind, React Router   |
| - Material Tailwind UI, Chart.js       |
| - Firebase Auth                        |
+----------------------------------------+
       |
       v
+----------------------------------------+
| BACKEND API (Node.js + Express)        |
| - REST API: izdelki, komentarji        |
| - Vračanje JSON podatkov               |
|                                        |
| Tehnologije:                           |
| - Node.js, Express.js                  |
| - dotenv, cors, MongoDB driver         |
+----------------------------------------+
       |
       v
+----------------------------------------+
| MONGODB Atlas (NoSQL baza)             |
| - Kolekcije po trgovinah (Mercator...) |
| - Shranjeni izdelki, cene, zgodovina   |
| - Komentarji, ocene                    |
+----------------------------------------+
       |
       +----------------------------------------------------+
       |                                                    |
       v                                                    v
+-------------------------+                      +-----------------------------+
| Scraperji               |                      | Klasifikator                |
| - Puppeteer & Playwright|                      | - Naive Bayes + TF-IDF      |
| - Zajem iz Jager, Lidl… |                      | - Določa kategorije izdelkov|
+-------------------------+                      +-----------------------------+
       |
       v
+----------------------------------------+
| FIREBASE (User podatki)                |
| - Firestore:                           |
|   - uporabniki                         |
|   - nakupovalni seznami                |
|   - priceAlerts                        |
|                                        |
| - Auth: Prijava, registracija          |
+----------------------------------------+
```
## Deployment (Backend)

1. Kloniranje izvorne kode 
```bash
   git clone https://github.com/DomenDrovenik/BestPriceProjekt.git
   cd BestPriceProjekt/backend
```
   
2.	 Namestitev odvisnosti
   ```bash
   npm install
  ```

## Deployment (Frontend)

1.	Prijava v Firebase
   ```bash
    npm install -g firebase-tools
    cd BestPriceProjekt/frontend
   ```

2.	Gradnja aplikacije
   ```bash
    npm install
    npm run build
   ```

3. Ročni deploy
```bash
   firebase deploy --only hosting
```

## Avtorji
  •	Anja Lužar
  
  •	Eva Strašek
  
  •	Domen Drovenik

## Povezava do aplikacije
https://bestprice-4c8cd.firebaseapp.com


