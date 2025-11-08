# TP Omerbašić - Tailwind Design System

## 🎨 Color Palette (Tailwind Classes)

### Brand Colors
```jsx
// Primary (Navy Blue)
bg-primary          // #1B3A5F
bg-primary-dark     // #152E4D
bg-primary-light    // #2A4D7A
text-primary
border-primary

// Accent (Narandžasta)
bg-accent           // #FF6B35
bg-accent-dark      // #E85A28
bg-accent-light     // #FF8557
text-accent
border-accent
```

### Neutrals
```jsx
bg-off-white        // #FEFEFE (kartice, modali)
bg-background       // #F8F9FA (pozadina sajta)
text-gray-text      // #2C3E50 (body text)
border-gray-border  // #95A5A6 (granice)
bg-gray-light       // #E8EBED (lighter elements)
```

### Status Colors
```jsx
bg-success          // #27AE60 (Na stanju)
bg-warning          // #F39C12 (Malo na stanju)
bg-error            // #E74C3C (Nije dostupno)

// Transparentne varijante za badges
bg-success/20       // 20% opacity
bg-warning/20
bg-error/20
```

---

## 📦 Komponente

### Button
```jsx
<Button variant="primary" size="md">
  Dodaj u korpu
</Button>

// Variants: 'primary', 'secondary', 'ghost'
// Sizes: 'sm', 'md', 'lg'
```

### Product Card
```jsx
<ProductCard 
  product={{
    oeCode: '1234567890',
    name: 'Kočione pločice',
    price: '89,90',
    inStock: true,
    image: '/path/to/image.jpg'
  }}
/>
```

### Status Badge
```jsx
<StatusBadge status="available" />
// status: 'available', 'low', 'unavailable'
```

### Trust Badge
```jsx
<TrustBadge icon="✓" text="Originalni dijelovi" />
```

---

## 🎯 Tailwind Utility Patterns

### Cards
```jsx
className="bg-off-white rounded-card p-5 shadow-card 
           hover:shadow-card-hover hover:-translate-y-0.5 
           transition-all duration-200"
```

### Inputs
```jsx
className="px-5 py-3.5 rounded-default bg-off-white text-gray-text
           border border-gray-border 
           focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
```

### Headings
```jsx
// H1
className="text-4xl md:text-5xl font-bold text-primary"

// H2
className="text-3xl font-semibold text-primary"

// H3
className="text-xl font-semibold text-primary"
```

### Product Grid
```jsx
className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
```

### Container
```jsx
className="max-w-7xl mx-auto px-6 py-12"
```

---

## 🔤 Typography

### Font Families
```jsx
font-sans   // Inter (default)
font-mono   // Roboto Mono (za OE kodove)
```

### Font Weights
```jsx
font-normal     // 400 (body)
font-semibold   // 600 (headings)
font-bold       // 700 (títlovi)
```

---

## 📐 Spacing Scale (8px grid)

```jsx
gap-2    // 8px
gap-4    // 16px
gap-6    // 24px
gap-8    // 32px
gap-12   // 48px

p-2, p-4, p-5, p-6, p-8, p-12
m-2, m-4, m-6, m-8, m-12
```

---

## 🎭 Shadows
```jsx
shadow-card         // 0 2px 8px rgba(0,0,0,0.08)
shadow-card-hover   // 0 4px 16px rgba(0,0,0,0.12)
shadow-cta          // 0 4px 12px rgba(255, 107, 53, 0.3)
```

---

## 🔄 Transitions
```jsx
transition-all duration-200    // Standard
transition-colors duration-200 // Za hover efekte na linkovima
```

---

## 📱 Responsive Breakpoints
```jsx
// Mobile first approach
sm:  // 640px
md:  // 768px
lg:  // 1024px
xl:  // 1280px
2xl: // 1536px

// Primjer
className="grid-cols-1 md:grid-cols-2 lg:grid-cols-3"
```

---

## ✅ Best Practices

1. **Konzistentnost**: Koristi definisane Tailwind klase, ne custom CSS
2. **Spacing**: Sve razmake bazirati na 8px grid (gap-2, gap-4, etc.)
3. **Hover states**: Dodaj `transition-all duration-200` za smooth efekte
4. **Focus states**: Uvijek dodaj `focus:` klase za accessibility
5. **Mobile-first**: Dizajniraj prvo za mobile, pa dodaj `md:` i `lg:` za veće ekrane

---

## 🚀 Quick Start

1. **Instaliraj dependencies**:
```bash
npm install -D tailwindcss@latest
npx tailwindcss init
```

2. **Kopiraj tailwind.config.js** iz fajla

3. **Dodaj u globals.css**:
```css
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&family=Roboto+Mono&display=swap');

@tailwind base;
@tailwind components;
@tailwind utilities;
```

4. **Koristi komponente** iz components-examples.jsx
