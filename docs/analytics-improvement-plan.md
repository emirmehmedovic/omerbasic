# Plan za unapređenje statistike i analitike

## Uvod

Ovaj dokument predstavlja sveobuhvatan plan za unapređenje statistike i analitike u admin panelu web trgovine. Cilj je pružiti dublje uvide u poslovanje, omogućiti bolje donošenje odluka i optimizirati poslovne procese kroz naprednu analitiku.

## Faze implementacije

Implementacija će se odvijati u nekoliko faza, s jasno definiranim ciljevima i zadacima za svaku fazu.

### Faza 1: Interaktivni filtri za vremenski period

**Cilj**: Omogućiti filtriranje svih statistika po različitim vremenskim periodima.

**Zadaci**:
- [ ] Implementirati komponente za odabir vremenskog perioda (7 dana, 30 dana, 90 dana, godišnje)
- [ ] Dodati kalendar za odabir prilagođenog vremenskog raspona
- [ ] Prilagoditi API rute za dohvaćanje podataka prema odabranom vremenskom periodu
- [ ] Implementirati spremanje odabranog vremenskog perioda u lokalno skladište (localStorage)

**Tehnički detalji**:
- Koristiti DatePicker komponentu za odabir datuma
- Implementirati Context API za dijeljenje odabranog vremenskog perioda između komponenti
- Dodati query parametre u API rute za filtriranje po datumu

### Faza 2: Usporedba perioda

**Cilj**: Omogućiti usporedbu tekućeg perioda s prethodnim periodima.

**Zadaci**:
- [ ] Implementirati logiku za usporedbu tekućeg perioda s prethodnim (npr. ovaj mjesec vs. prošli mjesec)
- [ ] Dodati vizualne indikatore rasta/pada (strelice, boje)
- [ ] Prikazati postotke promjene za ključne metrike
- [ ] Implementirati grafikone s preklopljenim podacima za različite periode

**Tehnički detalji**:
- Proširiti postojeće API rute za dohvaćanje podataka iz više perioda
- Koristiti Recharts za prikaz preklopljenih podataka
- Implementirati pomoćne funkcije za izračun postotaka promjene

### Faza 3: Izvoz podataka

**Cilj**: Omogućiti izvoz statistika u različite formate.

**Zadaci**:
- [ ] Implementirati izvoz u CSV format
- [ ] Implementirati izvoz u Excel format
- [ ] Dodati opciju za automatsko slanje izvještaja na e-mail
- [ ] Implementirati planiranje periodičkih izvještaja

**Tehnički detalji**:
- Koristiti biblioteke poput `csv-stringify` za generiranje CSV datoteka
- Implementirati serverske funkcije za generiranje Excel datoteka
- Koristiti nodemailer za slanje e-mailova
- Implementirati cron poslove za periodičke izvještaje

### Faza 4: Analiza korisničkog ponašanja

**Cilj**: Prikupiti i analizirati podatke o ponašanju korisnika na web trgovini.

**Zadaci**:
- [ ] Implementirati praćenje putanje korisnika kroz web trgovinu
- [ ] Analizirati napuštene košarice
- [ ] Pratiti vrijeme provedeno na pojedinim stranicama
- [ ] Identificirati najposjećenije stranice i proizvode

**Tehnički detalji**:
- Implementirati middleware za praćenje korisničkih akcija
- Proširiti Prisma shemu za pohranu podataka o korisničkom ponašanju
- Kreirati nove API rute za dohvaćanje podataka o korisničkom ponašanju
- Implementirati vizualizacije za prikaz putanje korisnika

### Faza 5: Analiza učinkovitosti marketinga

**Cilj**: Pratiti i analizirati učinkovitost marketinških kampanja.

**Zadaci**:
- [ ] Implementirati praćenje izvora prometa
- [ ] Mjeriti konverziju po različitim kanalima
- [ ] Analizirati ROI za marketinške kampanje
- [ ] Pratiti učinkovitost promocija i popusta

**Tehnički detalji**:
- Implementirati UTM parametre za praćenje izvora prometa
- Proširiti Prisma shemu za pohranu podataka o marketinškim kampanjama
- Kreirati nove API rute za dohvaćanje podataka o marketinškim kampanjama
- Implementirati vizualizacije za prikaz učinkovitosti marketinga

### Faza 6: Prediktivna analitika

**Cilj**: Implementirati prediktivnu analitiku za predviđanje budućih trendova.

**Zadaci**:
- [ ] Implementirati projekcije prodaje za naredni period
- [ ] Razviti algoritme za predviđanje koje proizvode treba naručiti
- [ ] Predvidjeti sezonske trendove
- [ ] Implementirati sustav za rano upozoravanje na potencijalne probleme

**Tehnički detalji**:
- Koristiti jednostavne statističke metode za predviđanje (moving average, linear regression)
- Implementirati serverske funkcije za izračun predviđanja
- Kreirati nove API rute za dohvaćanje prediktivnih podataka
- Implementirati vizualizacije za prikaz predviđanja

### Faza 7: Geografska analiza

**Cilj**: Analizirati prodaju po geografskim područjima.

**Zadaci**:
- [ ] Implementirati interaktivnu mapu za prikaz prodaje po regijama
- [ ] Analizirati koje regije generiraju najviše prihoda
- [ ] Pratiti geografsku distribuciju kupaca
- [ ] Identificirati potencijalna nova tržišta

**Tehnički detalji**:
- Koristiti biblioteke poput Leaflet ili MapBox za interaktivne mape
- Proširiti Prisma shemu za pohranu geografskih podataka
- Kreirati nove API rute za dohvaćanje geografskih podataka
- Implementirati vizualizacije za prikaz geografske distribucije

### Faza 8: Analiza povrata i reklamacija

**Cilj**: Pratiti i analizirati povrate proizvoda i reklamacije.

**Zadaci**:
- [ ] Implementirati praćenje stope povrata proizvoda
- [ ] Analizirati razloge za povrat
- [ ] Identificirati proizvode s najvišom stopom reklamacija
- [ ] Pratiti troškove povezane s povratima

**Tehnički detalji**:
- Proširiti Prisma shemu za pohranu podataka o povratima i reklamacijama
- Kreirati nove API rute za dohvaćanje podataka o povratima
- Implementirati vizualizacije za prikaz stope povrata
- Dodati funkcionalnost za kategorizaciju razloga povrata

### Faza 9: Analiza lojalnosti kupaca

**Cilj**: Analizirati lojalnost kupaca i identificirati najvjernije kupce.

**Zadaci**:
- [ ] Izračunati stopu zadržavanja kupaca
- [ ] Identificirati najvjernije kupce
- [ ] Analizirati obrasce kupovine vjernih kupaca
- [ ] Implementirati segmentaciju kupaca

**Tehnički detalji**:
- Implementirati algoritme za izračun RFM (Recency, Frequency, Monetary) vrijednosti
- Proširiti Prisma shemu za pohranu podataka o lojalnosti kupaca
- Kreirati nove API rute za dohvaćanje podataka o lojalnosti
- Implementirati vizualizacije za prikaz segmentacije kupaca

### Faza 10: Personalizirani dashboard

**Cilj**: Omogućiti korisnicima da prilagode koje metrike žele vidjeti na početnom ekranu.

**Zadaci**:
- [ ] Implementirati sustav za personalizaciju dashboarda
- [ ] Omogućiti dodavanje, uklanjanje i premještanje widgeta
- [ ] Spremiti postavke za svakog administratora posebno
- [ ] Implementirati različite vrste widgeta (grafikoni, tablice, metrike)

**Tehnički detalji**:
- Koristiti drag-and-drop biblioteku za premještanje widgeta
- Proširiti Prisma shemu za pohranu korisničkih postavki
- Kreirati nove API rute za spremanje i dohvaćanje postavki
- Implementirati sustav za dinamičko učitavanje widgeta

### Faza 11: Analiza profitabilnosti

**Cilj**: Analizirati profitabilnost proizvoda i kategorija.

**Zadaci**:
- [ ] Implementirati izračun profitne marže po proizvodu
- [ ] Analizirati profitabilnost po kategorijama
- [ ] Identificirati najprofitabilnije i najmanje profitabilne proizvode
- [ ] Pratiti trendove profitabilnosti kroz vrijeme

**Tehnički detalji**:
- Proširiti Prisma shemu za pohranu podataka o troškovima i maržama
- Kreirati nove API rute za dohvaćanje podataka o profitabilnosti
- Implementirati vizualizacije za prikaz profitabilnosti
- Dodati funkcionalnost za unos i ažuriranje podataka o troškovima

### Faza 12: Integracija s vanjskim alatima

**Cilj**: Povezati sustav s vanjskim alatima za analitiku.

**Zadaci**:
- [ ] Implementirati integraciju s Google Analytics
- [ ] Dodati podršku za Facebook Pixel
- [ ] Implementirati webhook za slanje podataka u druge sustave
- [ ] Omogućiti uvoz podataka iz vanjskih izvora

**Tehnički detalji**:
- Koristiti službene API-je za integraciju s vanjskim servisima
- Implementirati middleware za obradu webhook poziva
- Kreirati nove API rute za primanje i slanje podataka
- Implementirati sustav za mapiranje podataka između različitih formata

## Prioriteti i vremenski okvir

Implementacija će se odvijati sljedećim redoslijedom prioriteta:

1. **Visoki prioritet** (1-2 tjedna):
   - Faza 1: Interaktivni filtri za vremenski period
   - Faza 2: Usporedba perioda
   - Faza 3: Izvoz podataka

2. **Srednji prioritet** (2-4 tjedna):
   - Faza 4: Analiza korisničkog ponašanja
   - Faza 5: Analiza učinkovitosti marketinga
   - Faza 8: Analiza povrata i reklamacija
   - Faza 11: Analiza profitabilnosti

3. **Niži prioritet** (4-8 tjedana):
   - Faza 6: Prediktivna analitika
   - Faza 7: Geografska analiza
   - Faza 9: Analiza lojalnosti kupaca
   - Faza 10: Personalizirani dashboard
   - Faza 12: Integracija s vanjskim alatima

## Tehnički zahtjevi

Za implementaciju navedenih funkcionalnosti potrebno je:

- Proširiti postojeću Prisma shemu za pohranu dodatnih podataka
- Implementirati nove API rute za dohvaćanje i manipulaciju podacima
- Razviti klijentske komponente za prikaz i interakciju s podacima
- Integrirati dodatne biblioteke za vizualizaciju i analizu podataka

## Zaključak

Ovaj plan predstavlja sveobuhvatan pristup unapređenju statistike i analitike u admin panelu web trgovine. Implementacijom navedenih funkcionalnosti značajno će se poboljšati mogućnosti za analizu poslovanja i donošenje informiranih odluka.

Implementacija će se odvijati postupno, s redovitim evaluacijama i prilagodbama prema potrebama korisnika i poslovnim ciljevima.
