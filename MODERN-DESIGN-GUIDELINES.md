# Modern Design Guidelines - TP Omerbašić

## Design Philosophy
Moderan, premium dizajn inspirisan tech/automotive industry sa glassmorphism efektima, floating elementima i strategičnom upotrebom brand boja. Fokus na čitljivosti, kompaktnosti i odličnom mobile iskustvu.

---

## Core Design Principles

### 1. Glassmorphism & Depth
- Koristi `backdrop-blur-sm` ili `backdrop-blur-md` za dubinu
- Transparentne pozadine: `bg-white/80`, `bg-white/90`, `bg-white/70`
- Suptilne bordere: `border border-white/60`
- Layering sa `shadow-xl` i `shadow-2xl`
- Hover efekti: `hover:shadow-2xl` ili `hover:shadow-3xl`

### 2. Floating Elements
- Floating info kartice sa `absolute` pozicioniranjem
- Hover efekti: `hover:-translate-y-1` + `transition-all duration-300`
- Transform efekti: `hover:scale-[1.02]`
- Shadow na hover za lift efekat

### 3. Gradient Backgrounds
**Hero sekcije - završava na sivoj, ne bijeloj:**
```css
bg-gradient-to-br from-slate-50 via-slate-100 to-slate-200
```

**Tekstura overlay (UVIJEK koristiti):**
```css
/* Navy tačkice + narandžasti glow */
radial-gradient(circle at 2px 2px, rgba(27,58,95,0.2) 1px, transparent 0),
radial-gradient(circle at 50% 50%, rgba(255,107,53,0.08) 0%, transparent 70%)

/* Background size */
backgroundSize: '32px 32px, 100% 100%'

/* Opacity */
opacity-[0.04]
```

### 4. Rounded Corners
- Velike sekcije: `rounded-3xl` (24px)
- Kartice: `rounded-2xl` (16px)
- Buttons/Badges: `rounded-xl` (12px) ili `rounded-full`
- Mini kartice: `rounded-lg` (8px)

---

## Brand Colors

### Primary Colors

**Navy Blue** - za autoritet i profesionalnost
```css
from-primary to-primary-dark
HEX: #1B3A5F → #152E4D
```

**Orange/Sunfire** - za energiju i akcente
```css
from-[#E85A28] to-[#FF6B35]
HEX: #E85A28 → #FF6B35
```

### Color Strategy (70% Navy / 30% Orange)

**Navy Blue (Primary) - 70%:**
- Glavni CTA buttoni
- Aktivan tab state
- Naslovi i headings (text-primary)
- Page headers
- User menu button (active state)
- Kontakt ikone u footeru

**Orange (Accent) - 30%:**
- Floating info kartice (OEM, Kataloški)
- Category badges
- Akcija/Popust badges
- Section ikone (Car, Settings, Tag, BookCopy, etc.)
- Unit badges u atributima
- Hover states na linkovima
- Social media hover
- Premium badges

---

## Component Patterns

### 1. Hero Section Pattern
```jsx
<div className="relative overflow-hidden rounded-3xl p-8 lg:p-12 
                bg-gradient-to-br from-slate-50 via-slate-100 to-slate-200 
                shadow-xl">
  {/* Texture overlay */}
  <div className="pointer-events-none absolute inset-0 z-0 opacity-[0.04]"
       style={{
         backgroundImage: 'radial-gradient(...), radial-gradient(...)',
         backgroundSize: '32px 32px, 100% 100%'
       }} />
  
  {/* Content */}
  <div className="relative z-10">
    {/* ... */}
  </div>
</div>
```

### 2. Floating Cards Pattern (OEM, Kataloški)
```jsx
<div className="absolute top-4 left-4 
                bg-gradient-to-br from-[#E85A28] to-[#FF6B35] 
                rounded-2xl p-4 shadow-xl 
                transform hover:-translate-y-1 transition-all duration-300">
  <div className="text-xs text-white font-medium">Label</div>
  <div className="font-mono text-lg font-bold text-white">Value</div>
</div>
```

### 3. Tab Navigation Pattern
```jsx
<TabsList className="grid w-full grid-cols-3 rounded-2xl p-3 
                     bg-white/80 backdrop-blur-sm border border-white/60 
                     shadow-lg h-auto">
  <TabsTrigger 
    value="tab"
    className="flex items-center justify-center space-x-2 
               py-5 px-6 rounded-xl font-bold text-slate-700 
               data-[state=active]:bg-gradient-to-r 
               data-[state=active]:from-primary 
               data-[state=active]:to-primary-dark 
               data-[state=active]:text-white 
               data-[state=active]:shadow-lg 
               transition-all duration-300">
    <Icon className="h-5 w-5" />
    <span>Label</span>
  </TabsTrigger>
</TabsList>
```

### 4. Section Headers Pattern
```jsx
<div className="flex items-center space-x-4 mb-8">
  <div className="bg-gradient-to-br from-[#E85A28] to-[#FF6B35] 
                  p-4 rounded-2xl shadow-lg">
    <Icon className="h-7 w-7 text-white" />
  </div>
  <h3 className="text-3xl font-bold text-primary">Naslov</h3>
</div>
```

### 5. Info Cards Pattern (Atributi, Specs)
```jsx
<div className="bg-white/70 backdrop-blur-sm border border-white/60 
                rounded-xl p-4 shadow-md 
                hover:shadow-lg hover:-translate-y-0.5 
                transition-all duration-300">
  <dt className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
    Label
  </dt>
  <dd className="text-lg text-slate-900 font-bold">
    Value
  </dd>
</div>
```

### 6. CTA Buttons Pattern
```jsx
{/* Primary CTA */}
<button className="bg-gradient-to-r from-primary to-primary-dark 
                   text-white font-bold py-3.5 px-6 rounded-xl 
                   shadow-xl hover:shadow-2xl 
                   transform hover:-translate-y-1 
                   transition-all duration-300">
  Dodaj u korpu
</button>

{/* Quantity Counter */}
<div className="flex items-center bg-white/80 backdrop-blur-sm 
                border border-white/60 rounded-xl shadow-lg">
  <button className="p-3 hover:bg-slate-100 rounded-l-xl transition-colors">
    <MinusIcon />
  </button>
  <div className="px-6 py-3 font-bold text-lg text-primary min-w-[60px] text-center">
    {quantity}
  </div>
  <button className="p-3 hover:bg-slate-100 rounded-r-xl transition-colors">
    <PlusIcon />
  </button>
</div>
```

### 7. Table/Card Pattern (Kompatibilnost)
**Desktop:**
```jsx
<div className="hidden lg:block overflow-x-auto rounded-2xl 
                border border-white/40 bg-white/60 backdrop-blur-sm shadow-lg">
  <table className="min-w-full text-sm">
    <thead className="bg-gradient-to-r from-primary/10 to-primary-dark/10 
                      border-b border-slate-200">
      {/* Headers */}
    </thead>
    <tbody className="divide-y divide-slate-200/50">
      {/* Rows sa hover:bg-white/80 */}
    </tbody>
  </table>
</div>
```

**Mobile:**
```jsx
<div className="lg:hidden space-y-3">
  {items.map(item => (
    <div className="bg-white/80 backdrop-blur-sm border border-white/60 
                    rounded-2xl p-4 shadow-lg">
      {/* Card content */}
    </div>
  ))}
</div>
```

### 8. Reference Cards Pattern
```jsx
<div className="bg-white/70 backdrop-blur-sm border border-white/60 
                rounded-2xl p-5 shadow-lg hover:shadow-xl 
                transition-all duration-300">
  <div className="flex items-center gap-2 mb-4 pb-3 border-b border-slate-200">
    <div className="bg-gradient-to-br from-[#E85A28] to-[#FF6B35] 
                    p-1.5 rounded-lg">
      <Icon className="w-4 h-4 text-white" />
    </div>
    <h4 className="font-bold text-primary text-lg">Manufacturer</h4>
  </div>
  {/* Reference items */}
</div>
```

### 9. Footer Links Pattern
```jsx
<Link className="group flex items-center text-slate-700 
                 hover:text-white 
                 hover:bg-gradient-to-r hover:from-[#E85A28] hover:to-[#FF6B35] 
                 px-3 py-2 rounded-lg 
                 transition-all duration-300 font-medium">
  <ArrowRight className="w-4 h-4 mr-2 group-hover:translate-x-1 transition-transform" />
  Link Text
</Link>
```

### 10. Contact Info Cards (Footer)
```jsx
<div className="flex items-start space-x-3 
                bg-white/60 backdrop-blur-sm p-3 rounded-xl 
                border border-white/60 hover:bg-white/80 transition-colors">
  <div className="mt-0.5 p-1.5 rounded-lg 
                  bg-gradient-to-br from-primary to-primary-dark">
    <Icon className="w-4 h-4 text-white" />
  </div>
  <div>
    <p className="text-slate-700 text-sm font-medium">Info</p>
  </div>
</div>
```

---

## Typography

### Headings
- Page title: `text-3xl lg:text-4xl font-bold text-white` (u headerima)
- Section title: `text-3xl font-bold text-primary`
- Card title: `text-xl font-bold text-primary`
- Small heading: `text-lg font-bold text-primary`

### Body Text
- Regular: `text-sm text-slate-700 font-medium`
- Description: `text-sm text-slate-600 leading-relaxed`
- Small: `text-xs text-slate-500`

### Special
- Mono (kodovi): `font-mono text-sm font-bold`
- Labels: `text-xs font-semibold text-slate-500 uppercase tracking-wide`

---

## Spacing

### Sections
- Between sections: `space-y-8`
- Between cards: `gap-4` ili `gap-6`
- Grid gaps: `gap-6` do `gap-12`

### Padding
- Large sections: `p-8 lg:p-12`
- Cards: `p-4` do `p-8`
- Buttons: `py-3.5 px-6` ili `py-5 px-8`
- Mini cards: `p-3`

### Margins
- Section bottom: `mb-6` ili `mb-8`
- Element spacing: `mb-4` do `mb-6`

---

## Shadows

- **Cards:** `shadow-lg` ili `shadow-xl`
- **Hover states:** `hover:shadow-xl` ili `hover:shadow-2xl`
- **Floating elements:** `shadow-xl`
- **Page headers:** `shadow-2xl`
- **Badges:** `shadow-md` ili `shadow-lg`

---

## Transitions

- **Standard:** `transition-all duration-300`
- **Hover transforms:** `duration-300` ili `duration-500` za scale
- **Smooth animations:** `transition-colors duration-300`

---

## Responsive Design

### Breakpoints
- Mobile first approach
- `sm:` - 640px
- `md:` - 768px
- `lg:` - 1024px
- `xl:` - 1280px

### Mobile Considerations
- Hide na mobile: `hidden lg:block`
- Show samo na mobile: `lg:hidden`
- Responsive text: `text-2xl lg:text-3xl`
- Responsive padding: `p-4 lg:p-6`
- Card layout umjesto tabela na mobile

---

## Implemented Components

### ✅ Navbar
- Glassmorphism sa teksturom
- Narandžasti gradient hover na linkovima
- Quantity counter stil
- User menu sa navy gradijentom

### ✅ Product Details Page
- Kompaktan hero (smanjeni tekstovi)
- Floating OEM/Kataloški kartice (narandžasti gradient)
- Quantity counter + CTA button
- Info kartice (4x grid)
- Modernizovani tabovi

### ✅ Product Header
- Branding sa kontakt info
- Kompaktan layout
- Inline kontakt detalji

### ✅ Compatibility Tab
- Desktop: 4-kolona tabela sa ikonama
- Mobile: Card layout
- Narandžasta ikona auta

### ✅ Specifications Tab
- Grid kartice za atribute (2 kolone)
- Tehnički podaci sa navy ikonama
- Hover efekti

### ✅ References Tab
- Kartice po proizvođaču
- Copy button funkcionalnost
- Narandžaste/navy ikone

### ✅ Footer
- Gradient pozadina sa teksturom
- Narandžasti gradient hover na linkovima
- Glassmorphism kontakt kartice
- Social media sa hover lift efektom

---

## Best Practices

1. **Uvijek koristi teksturu overlay** na gradient pozadinama
2. **Završavaj gradient na sivoj** (`to-slate-200`), ne bijeloj
3. **Balans boja:** 70% Navy, 30% Orange
4. **Hover efekti:** Uvijek dodaj smooth transitions
5. **Z-index layering:** `relative z-10` za sadržaj iznad teksture
6. **Mobile first:** Dizajniraj prvo za mobile, pa desktop
7. **Konzistentnost:** Koristi iste pattern-e kroz cijelu aplikaciju
8. **Accessibility:** Dodaj `aria-label` na ikonice buttone
9. **Performance:** Koristi `transform` umjesto `margin/padding` za animacije
10. **Čitljivost:** Smanjeni tekstovi, ali održana čitljivost

---

## Quick Reference

**Gradient pozadina:**
```css
bg-gradient-to-br from-slate-50 via-slate-100 to-slate-200
```

**Tekstura:**
```css
opacity-[0.04]
radial-gradient(circle at 2px 2px, rgba(27,58,95,0.2) 1px, transparent 0),
radial-gradient(circle at 50% 50%, rgba(255,107,53,0.08) 0%, transparent 70%)
```

**Navy gradient:**
```css
bg-gradient-to-r from-primary to-primary-dark
```

**Orange gradient:**
```css
bg-gradient-to-r from-[#E85A28] to-[#FF6B35]
```

**Glassmorphism:**
```css
bg-white/80 backdrop-blur-sm border border-white/60
```

**Hover lift:**
```css
hover:-translate-y-1 hover:shadow-xl transition-all duration-300
```
