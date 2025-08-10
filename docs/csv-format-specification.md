# CSV Format Specification za Proizvode

Ovaj dokument definira format CSV datoteke za izvoz i uvoz proizvoda u sustav. Format je dizajniran da podrži sve ključne podatke o proizvodima, uključujući osnovne informacije, tehničke specifikacije, dimenzije i kompatibilnost s vozilima.

## Osnovna struktura

CSV datoteka mora sadržavati sljedeća zaglavlja (prva linija):

```
id,name,description,price,imageUrl,stock,catalogNumber,oemNumber,isFeatured,isArchived,categoryId,technicalSpecs,dimensions,standards,vehicleFitments,attributeValues,crossReferences
```

## Obavezna polja

Sljedeća polja su obavezna za svaki proizvod:

- `name`: Naziv proizvoda
- `price`: Cijena proizvoda (decimalni broj, koristi točku kao separator)
- `catalogNumber`: Kataloški broj proizvoda (mora biti jedinstven)
- `categoryId`: ID kategorije kojoj proizvod pripada

## Format polja

### Osnovni podaci
- `id`: Jedinstveni identifikator proizvoda (samo za export, ne koristi se pri importu)
- `name`: Tekstualni naziv proizvoda
- `description`: Opis proizvoda (može sadržavati HTML)
- `price`: Decimalni broj (npr. 199.99)
- `imageUrl`: URL do slike proizvoda
- `stock`: Cijeli broj koji predstavlja količinu na zalihi
- `catalogNumber`: Jedinstveni kataloški broj proizvoda
- `oemNumber`: OEM broj proizvoda
- `isFeatured`: Boolean vrijednost (true/false)
- `isArchived`: Boolean vrijednost (true/false)
- `categoryId`: ID kategorije

### JSON polja
Sljedeća polja koriste JSON format unutar CSV ćelije:

#### technicalSpecs
JSON objekt koji sadrži tehničke specifikacije proizvoda. Primjer:
```json
{"viscosity":"5W-30","standard":"API SN","volume":"5L"}
```

#### dimensions
JSON objekt koji sadrži dimenzije proizvoda. Primjer:
```json
{"weight":1.5,"width":10,"height":5,"length":20,"unitOfMeasure":"cm"}
```

### Polja s više vrijednosti

#### standards
Lista standarda koje proizvod zadovoljava, odvojenih zarezom i zatvorenih u uglate zagrade. Primjer:
```
[ISO 9001,DIN 1234,ECE R90]
```

#### vehicleFitments
Lista kompatibilnih vozila u JSON formatu. Svaki element sadrži podatke o generaciji vozila, motoru i dodatnim informacijama o kompatibilnosti. Primjer:
```json
[
  {
    "generationId": "gen_id_1",
    "engineId": "engine_id_1",
    "fitmentNotes": "Samo za modele s ABS",
    "position": "Prednji",
    "bodyStyles": ["Sedan", "Hatchback"],
    "yearFrom": 2015,
    "yearTo": 2020,
    "isUniversal": false
  },
  {
    "generationId": "gen_id_2",
    "fitmentNotes": "Univerzalni dio",
    "isUniversal": true
  }
]
```

#### attributeValues
Lista vrijednosti atributa kategorije u JSON formatu. Svaki element sadrži ID atributa i vrijednost. Primjer:
```json
[
  {
    "attributeId": "attr_id_1",
    "value": "Crvena"
  },
  {
    "attributeId": "attr_id_2",
    "value": "1200"
  }
]
```

#### crossReferences
Lista cross-referenci u JSON formatu. Svaki element sadrži tip reference, broj reference i dodatne informacije. Primjer:
```json
[
  {
    "referenceType": "OEM",
    "referenceNumber": "1234567890",
    "manufacturer": "Mercedes-Benz",
    "notes": "Originalni dio"
  },
  {
    "referenceType": "Aftermarket",
    "referenceNumber": "AB-12345",
    "manufacturer": "Bosch"
  }
]
```

## Primjer CSV datoteke

```csv
id,name,description,price,imageUrl,stock,catalogNumber,oemNumber,isFeatured,isArchived,categoryId,technicalSpecs,dimensions,standards,vehicleFitments,attributeValues,crossReferences
,Ulje motorno Castrol Edge 5W-30,Potpuno sintetičko motorno ulje,199.99,https://example.com/images/ulje.jpg,100,CAST-5W30-5L,5W30-EDGE,true,false,cat_ulja,{"viscosity":"5W-30","standard":"API SN","volume":"5L"},{"weight":4.5,"width":10,"height":20,"length":10,"unitOfMeasure":"cm"},"[API SN,ACEA C3,BMW LL-04]","[{""generationId"":""gen_bmw_3_e90"",""engineId"":""eng_bmw_n57"",""fitmentNotes"":""Za dizel motore"",""isUniversal"":false},{""generationId"":""gen_merc_cclass_w204"",""isUniversal"":true}]","[{""attributeId"":""attr_viskozitet"",""value"":""5W-30""},{""attributeId"":""attr_volumen"",""value"":""5L""}]","[{""referenceType"":""OEM"",""referenceNumber"":""83212365935"",""manufacturer"":""BMW""},{""referenceType"":""Aftermarket"",""referenceNumber"":""15669A"",""manufacturer"":""Castrol""}]"
```

## Napomene za import

1. Polje `id` se ignorira prilikom importa - sustav će dodijeliti nove ID-ove
2. Za postojeće proizvode (update), koristite `catalogNumber` kao ključ za identifikaciju
3. Za JSON polja i polja s više vrijednosti, pazite na ispravno formatiranje i escape znakove
4. Datumi se unose u formatu YYYY-MM-DD
5. Decimalni brojevi koriste točku (.) kao separator

## Napomene za export

1. Export će uključivati sve podatke o proizvodu, uključujući ID-ove
2. JSON polja će biti pravilno formatirana i escapana
3. Datumi će biti u formatu YYYY-MM-DD

## Validacija podataka

Prilikom importa, sustav će validirati:
1. Obavezna polja
2. Format podataka
3. Postojanje referenci (categoryId, generationId, engineId, attributeId)
4. Jedinstvenost kataloškog broja

Ako validacija ne uspije, sustav će vratiti grešku s detaljima o problemu.
