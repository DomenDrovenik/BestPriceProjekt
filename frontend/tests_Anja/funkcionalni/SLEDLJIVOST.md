# Sledljivost elementov v testnih skriptah – tests_Anja

Sklop `tests_Anja/funkcionalni` je ločena avtomatizacija testnih primerov TP-01 …
TP-05 iz dokumenta `docs/testni_primeri.md`. Vsak test vsebuje predpogoje, vhodne
podatke, korake, preverjanje pričakovanega rezultata in pogoj po testu; pomožne
funkcije skrbijo za ponovno uporabo robustnih role/label selektorjev in čakanje
na stanje uporabniškega vmesnika.

Testne skripte TP-01 … TP-05 so napisane po načelu **črne skrinjice**: vsak element uporabniškega vmesnika in vsako preverjanje izvira iz enega od treh virov, ne iz izvorne kode aplikacije.

| Oznaka | Vir |
|---|---|
| **TP** | besedilo testnega primera v `testni_primeri.md` (koraki, vhodni podatki, pričakovani rezultati, okolje) |
| **SP** | splošni pomen elementov spletne strani: gumb, povezava, naslov, polje, polje za geslo, potrditveno polje, seznam in postavka, okno (dialog), obvestilo, barva |
| **ZA** | opažanje iz dejanskega zagona (posnetek strani ali dnevnik Playwrighta, zaslonska slika) |

Testi ne uporabljajo CSS razredov ali oznak HTML aplikacije, klicev API, notranjega stanja brskalnika (seja, IndexedDB) ali besedil, ki jih je mogoče poznati le iz izvorne kode (npr. sporočila med nalaganjem ali ob napakah).

## Skupni elementi

| Element v testu | Kako ga test najde | Vir |
|---|---|---|
| Navigacija | vloga »navigation« | SP; TP (»V navigaciji klikni …«) |
| »Prijava«, »Registracija« v navigaciji | gumba z imenom | TP-03 pričakovano 1 |
| Uporabnik (ni) prijavljen | navigacija (ne) ponuja »Prijava« in »Registracija« | TP-03 pričakovano 1 in 4 |
| Polje »E-poštni naslov« | polje v najmanjšem bloku z napisom »E-poštni naslov« | TP-03 korak 3 |
| Polje »Geslo« | polje za geslo (skrit vnos) | TP-03 korak 4; SP |
| Gumb »Prijava« na strani prijave | gumb z imenom | TP-03 korak 4 |
| Stran »Prijava« | naslov »Prijava« | TP-03 pričakovano 2 |
| Obvestilo / sporočilo o napaki | vloga »status« ali »alert« | SP; TP-03 korak 5 |
| »Profil« v navigaciji | povezava ali gumb »Profil«; če ni neposredno viden, se najprej odpre meni v navigaciji (gumb brez besedila) | TP-05 korak 4; SP (običajen meni uporabnika) |
| Čakanje na nalaganje | vidna vsebina strani se ustali (dvakrat enaka) | SP |

## TP-01 in TP-02 (izdelki, podrobnosti, primerjava)

| Element v testu | Kako ga test najde | Vir |
|---|---|---|
| »Izdelki« | povezava v navigaciji | TP-01 korak 2 |
| »Seznam izdelkov« | naslov | TP-01 sledljivost |
| Polje »Išči izdelek« | polje v najmanjšem bloku z napisom »Išči izdelek« | TP-01 korak 3 |
| Zadetek in njegovo ime | povezava »Več« in naslov najmanjšega bloka okoli nje | TP-01 korak 4–5; SP |
| Trgovina zadetka | ime trgovine (»Mercator«) v bloku zadetka | TP-01 vhodni podatki |
| Cena | besedilo z »€« (1,65 € = 1.65 €) | TP-01 vhodni podatki; ZA (cene se prikazujejo s piko) |
| Strani seznama | gumbi s številko strani in »›« | SP |
| »Podrobnosti izdelka« | naslov | TP-01 pričakovano 5 |
| Ime izdelka v podrobnostih | naslov z imenom; cena v najmanjšem bloku z imenom in »€« | TP-01 pričakovano 5; ZA |
| »Nazaj« | gumb ali povezava | TP-01 korak 6 |
| »Primerjava cen v drugih trgovinah« | naslov in seznam ponudb v istem bloku | TP-02 korak 3 |
| Ponudba | postavka seznama: vrstica s ceno, ime izdelka, trgovina | TP-02 pričakovano 3; ZA (posnetek strani) |
| Enakovreden izdelek | ime vsebuje »trajn«, »mleko«, »polnomastn« ali »3,5 %« in pakiranje 1 l | TP-02 pričakovano 4 |
| Nespremenjeni podatki | po testu ima izdelek enako ime, trgovino in cene | TP-01/TP-02 pogoj po testu |

## TP-03 (prijava in nadzor dostopa)

| Element v testu | Kako ga test najde | Vir |
|---|---|---|
| Slovensko sporočilo | vsebuje »napak«/»napačen«/»neuspešn«/»ni uspel« | TP-03 pričakovano 5 |
| Tehnična koda | »Firebase«, »auth/«, »Error (« | TP-03 pričakovano 5 (»Firebase: Error (auth/...)«) |
| Geslo ni izdano | vneseno napačno geslo ni prikazano | TP-03 pričakovano 5 |
| Preusmeritev / zahteva za prijavo | naslov »Prijava« ali besedilo, da je potrebna prijava | TP-03 pričakovano 6 |
| Profil se ne prikaže | ni naslovov z »alarm« ali »seznam«; ni e-pošte računa | TP-03 pričakovano 6 (»ime, alarmi, seznami«) |
| Navigacija na strani »Prijava« | če je ni, se preveri na naslednji strani | ZA (na strani »Prijava« navigacije ni) |

## TP-04 (nakupovalni seznam)

| Element v testu | Kako ga test najde | Vir |
|---|---|---|
| »Nakupovalni seznam« | povezava v navigaciji | TP-04 korak 1 |
| »Ime novega seznama...«, »Ustvari seznam« | polje (napis v polju) in gumb | TP-04 korak 2 |
| Seznam »Testni nakup« | besedilo z imenom seznama; klik nanj | TP-04 korak 2 |
| Odprt seznam | najmanjši blok z imenom seznama in iskalnikom, ki ne vsebuje polja za nov seznam | TP-04 pričakovano 2–3 |
| Iskalnik »Išči izdelek po trgovinah« | polje, katerega napis se začne s tem besedilom | TP-04 korak 3 |
| Zadetek iskalnika | postavka s ceno, imenom in trgovino, brez rdeče ikone koša | TP-04 pričakovano 3 |
| Izdelek na seznamu | postavka z imenom izdelka in rdečo ikono koša | TP-04 korak 6 (»rdeča ikona koša pri dodanem izdelku«) |
| Rdeča ikona koša | gumb z rdečim ozadjem ali rdečo ikono (barva na zaslonu) | TP-04 korak 6; SP |
| Pod trgovino Mercator | najmanjši blok z napisom »Mercator« in izdelkom, ki ni celoten seznam; vsebuje ceno 1,65 € | TP-04 pričakovano 4–5 |
| Začetno stanje seznama | enako število postavk kot pred dodajanjem | TP-04 pričakovano 6 |

## TP-05 (cenovni alarm)

| Element v testu | Kako ga test najde | Vir |
|---|---|---|
| »Nastavi alarm« | gumb | TP-05 korak 2 |
| Okno »Obvesti me, ko cena pade pod« | okno (dialog) s tem besedilom | TP-05 pričakovano 2 |
| Polje »Ciljna cena (€)« | polje v najmanjšem bloku z napisom | TP-05 korak 3 |
| E-poštno obveščanje | potrditveno polje z »email«/»e-pošt« v imenu, nepotrjeno | TP-05 vhodni podatki |
| »Shrani« | gumb | TP-05 korak 3 |
| »Opozorilo za ceno je bilo uspešno nastavljeno!« | besedilo | TP-05 pričakovano 3 |
| »Cenovni alarmi«, »Aktivni alarmi« | naslov in besedilo | TP-05 pričakovano 4; ZA (naslov »Cenovni alarmi«) |
| Aktivni alarm | besedilo z imenom izdelka, »0,79 €« in »Email obvestilo …«; vsak alarm ima to oznako | TP-05 pričakovano 4 |
| Ni aktivnih alarmov | ni nobene oznake »Email obvestilo« | TP-05 pričakovano 6 |
| »Uredi alarme«, »Izbriši«, »Zapri« | gumbi; urejevalnik je okno z gumbom »Zapri« | TP-05 priprava podatkov, korak 6 |
| Ustvarjeni alarm v urejevalniku | najmanjši blok z imenom izdelka, ciljno ceno in »Izbriši« | TP-05 korak 6 |

## Odstopanja med testnimi primeri in aplikacijo, upoštevana v testih

| Testni primer | Opažanje | Kako je upoštevano |
|---|---|---|
| TP-03 pričakovano 4: »v navigaciji sta še vedno Prijava in Registracija« | na strani »Prijava« navigacije ni (ZA) | preveri se, če je navigacija prikazana; sicer v koraku 6 |
| TP-04/TP-05: izdelek »Trajno polnomastno Pomursko mleko, 1 l« | prikazano je polno ime iz TP-01/TP-02 | uporablja se polno ime |
| TP-05 korak 4: »V navigaciji klikni Profil« | »Profil« morda ni neposredno v navigaciji | po potrebi se najprej odpre meni v navigaciji |
