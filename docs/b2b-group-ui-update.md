# Upute za UI izmjene (B2B grupe)

Ovaj dokument opisuje korake potrebne da admin UI podrži popuste po kombinaciji **kategorija + proizvođač** u sklopu B2B grupa. Sve promjene idu u `B2BGroupsClient` komponentu (`src/app/admin/b2b-groups/_components/client.tsx`).

## 1. Helper funkcije

Dodaj natrag helper funkcije koje su bile uklonjene:

- `handleAddCategoryManufacturerDiscount` – šalje `POST /api/admin/b2b-groups/[groupId]/category-manufacturer-discounts`.
- `handleRemoveCategoryManufacturerDiscount` – šalje `DELETE /api/admin/b2b-groups/[groupId]/category-manufacturer-discounts/[discountId]`.
- `getAvailableManufacturersForCategoryCombination` – na temelju odabrane kategorije filtrira proizvođače koji još nisu dodijeljeni u istoj grupi.

Smjesti ih pored postojećih handlera (`handleAddCategoryDiscount`, `handleRemoveManufacturerDiscount` itd.).

## 2. State za formu

Ostavi postojeći state `categoryManufacturerForms` (mapa po `groupId`) i pri uspješnom dodavanju resetuj ga na prazne vrijednosti:

```ts
setCategoryManufacturerForms((prev) => ({
  ...prev,
  [groupId]: { categoryId: '', manufacturerId: '', discountPercentage: '' },
}));
```

## 3. UI sekcija za kombinacije

Unutar `isExpanded` bloka (gdje su već kartice za članove, kategorijske i proizvođačke popuste) dodaj novu karticu, npr. odmah ispod sekcije za proizvođače:

```tsx
<div className="bg-white border border-amber/20 rounded-2xl p-6 space-y-4">
  <div className="flex items-center justify-between">
    <h4 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
      <FiGrid /> Popusti po kombinaciji ({group.categoryManufacturerDiscounts.length})
    </h4>
    <div className="flex items-center gap-2">
      <select
        value={categoryManufacturerForms[group.id]?.categoryId || ''}
        onChange={(e) =>
          setCategoryManufacturerForms((prev) => ({
            ...prev,
            [group.id]: {
              ...(prev[group.id] || { manufacturerId: '', discountPercentage: '' }),
              categoryId: e.target.value,
            },
          }))
        }
        className="bg-white border border-amber/30 focus:border-amber rounded-xl transition-all duration-200 text-gray-900 px-3 py-2"
      >
        <option value="">Odaberite kategoriju</option>
        {availableCategories.map((category) => (
          <option key={category.id} value={category.id}>
            {categoryLabelMap.get(category.id) || category.name}
          </option>
        ))}
      </select>
      <select
        value={categoryManufacturerForms[group.id]?.manufacturerId || ''}
        onChange={(e) =>
          setCategoryManufacturerForms((prev) => ({
            ...prev,
            [group.id]: {
              ...(prev[group.id] || { categoryId: '', discountPercentage: '' }),
              manufacturerId: e.target.value,
            },
          }))
        }
        className="bg-white border border-amber/30 focus:border-amber rounded-xl transition-all duration-200 text-gray-900 px-3 py-2"
      >
        <option value="">Odaberite proizvođača</option>
        {getAvailableManufacturersForCategoryCombination(
          group,
          categoryManufacturerForms[group.id]?.categoryId
        ).map((manufacturer) => (
          <option key={manufacturer.id} value={manufacturer.id}>
            {manufacturer.name}
          </option>
        ))}
      </select>
      <input
        type="number"
        min="0"
        max="100"
        step="0.01"
        placeholder="Popust %"
        value={categoryManufacturerForms[group.id]?.discountPercentage || ''}
        onChange={(e) =>
          setCategoryManufacturerForms((prev) => ({
            ...prev,
            [group.id]: {
              ...(prev[group.id] || { categoryId: '', manufacturerId: '' }),
              discountPercentage: e.target.value,
            },
          }))
        }
        className="w-28 bg-white border border-amber/30 focus:border-amber rounded-xl transition-all duration-200 text-gray-900 px-3 py-2"
      />
      <button
        onClick={() => handleAddCategoryManufacturerDiscount(group.id)}
        disabled={isBusy}
        className="bg-gradient-to-r from-amber via-orange to-brown text-white rounded-xl px-3 py-2 flex items-center gap-2 text-sm font-semibold hover:from-amber/90 hover:via-orange/90 hover:to-brown/90 transition-all duration-200 disabled:opacity-50"
      >
        <FiPlus /> Dodaj
      </button>
    </div>
  </div>

  {group.categoryManufacturerDiscounts.length === 0 ? (
    <p className="text-gray-600 text-sm">Nema definiranih kombinacija.</p>
  ) : (
    <div className="space-y-2">
      {group.categoryManufacturerDiscounts.map((discount) => (
        <div
          key={discount.id}
          className="flex items-center justify-between border border-amber/20 rounded-xl px-4 py-3"
        >
          <div>
            <div className="font-medium text-gray-900">
              {categoryLabelMap.get(discount.categoryId) || discount.category.name}
            </div>
            <div className="text-sm text-gray-600">
              {discount.manufacturer.name} · Popust: {discount.discountPercentage}%
            </div>
          </div>
          <button
            onClick={() => handleRemoveCategoryManufacturerDiscount(group.id, discount.id)}
            disabled={isBusy}
            className="text-red-500 hover:text-red-600 flex items-center gap-1 text-sm font-semibold"
          >
            <FiTrash2 /> Ukloni
          </button>
        </div>
      ))}
    </div>
  )}
</div>
```

## 4. Import ikona

Ako `FiGrid` koristiš samo u ovoj sekciji, ostavi import. Ako ne, ukloni ga da ne bude neiskorištenih importova.

---

Ovim koracima UI će omogućiti administriranje popusta po kategoriji, proizvođaču i njihovoj kombinaciji, uz konzistentan UX i backend koji je već spreman.
