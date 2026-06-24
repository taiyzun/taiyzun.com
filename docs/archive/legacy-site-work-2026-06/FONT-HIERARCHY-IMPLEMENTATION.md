# Font Hierarchy Implementation
## Philosopher → DINPro → Optima → Trebuchet MS

---

## 🎯 Font Priority System

```
Priority 1: Philosopher         (Modern, clean, versatile)
Priority 2: DINPro              (Geometric, minimalist, professional)
Priority 3: Optima              (Elegant, humanist, fallback)
Priority 4: Trebuchet MS        (System font, ultimate safety)
```

---

## 📋 Font Application Matrix

### Body Text (Primary Reading)
**Font:** Philosopher  
**Weight:** 400  
**Size:** 16px  
**Line Height:** 1.85  
**Letter Spacing:** 0.02em  

```css
body {
  font-family: 'Philosopher', 'DINPro', 'Optima', 'Trebuchet MS', sans-serif;
  font-size: 16px;
  font-weight: 400;
  line-height: 1.85;
  letter-spacing: 0.02em;
}

p {
  font-family: 'Philosopher', 'DINPro', 'Optima', 'Trebuchet MS', sans-serif;
  margin: 0 0 1.5rem 0;
}
```

---

### Display / Headings (Primary Emphasis)
**Font:** DINPro (with Philosopher fallback for modern elegance)  
**Usage:** H1, H2, Navigation, Logo  

#### H1 - Page Title
- **Font:** DINPro
- **Size:** 68px (clamp(2.5rem, 5vw, 4.5rem) responsive)
- **Weight:** 700
- **Letter Spacing:** 0.18em
- **Color:** Gold accent

```css
h1 {
  font-family: 'DINPro', 'Philosopher', 'Optima', 'Trebuchet MS', sans-serif;
  font-size: clamp(2.5rem, 5vw, 4.5rem);
  font-weight: 700;
  letter-spacing: 0.18em;
  color: var(--gold);
  margin: 2rem 0 1rem 0;
}
```

#### H2 - Section Header
- **Font:** DINPro
- **Size:** 42px (clamp(1.8rem, 4vw, 2.8rem) responsive)
- **Weight:** 600
- **Letter Spacing:** 0.12em

```css
h2 {
  font-family: 'DINPro', 'Philosopher', 'Optima', 'Trebuchet MS', sans-serif;
  font-size: clamp(1.8rem, 4vw, 2.8rem);
  font-weight: 600;
  letter-spacing: 0.12em;
  margin: 1.5rem 0 0.8rem 0;
}
```

#### H3 - Subsection
- **Font:** DINPro
- **Size:** 26px (clamp(1.3rem, 2.5vw, 1.75rem) responsive)
- **Weight:** 600
- **Letter Spacing:** 0.08em

```css
h3 {
  font-family: 'DINPro', 'Philosopher', 'Optima', 'Trebuchet MS', sans-serif;
  font-size: clamp(1.3rem, 2.5vw, 1.75rem);
  font-weight: 600;
  letter-spacing: 0.08em;
}
```

---

### Navigation & UI Elements
**Font:** DINPro (geometric precision for interface)  
**Size:** 14px  
**Weight:** 500  
**Letter Spacing:** 0.12em  
**Transform:** Uppercase for emphasis  

```css
nav, .nav-links a {
  font-family: 'DINPro', 'Philosopher', 'Optima', 'Trebuchet MS', sans-serif;
  font-size: 14px;
  font-weight: 500;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}

button, .btn {
  font-family: 'DINPro', 'Philosopher', 'Optima', 'Trebuchet MS', sans-serif;
  font-size: 14px;
  font-weight: 600;
  letter-spacing: 0.1em;
  text-transform: uppercase;
}
```

---

### Emphasis & Highlights
**Font:** DINPro (for crisp, professional appearance)  
**Usage:** Strong, em, highlights, callouts  

```css
strong, .highlight {
  font-family: 'DINPro', 'Philosopher', 'Optima', 'Trebuchet MS', sans-serif;
  font-weight: 700;
  color: var(--gold);
}

em, .accent {
  font-family: 'Philosopher', 'DINPro', 'Optima', 'Trebuchet MS', sans-serif;
  font-style: italic;
  font-weight: 300;
}
```

---

### Logo & Branding
**Font:** DINPro (bold, geometric, distinctive)  
**Size:** 18px (responsive: clamp(1rem, 2vw, 1.25rem))  
**Weight:** 700  
**Letter Spacing:** 0.22em  
**Transform:** Uppercase  
**Color:** Gold with glow effect  

```css
.logo-text {
  font-family: 'DINPro', 'Philosopher', 'Optima', 'Trebuchet MS', sans-serif;
  font-size: clamp(1rem, 2vw, 1.25rem);
  font-weight: 700;
  letter-spacing: 0.22em;
  text-transform: uppercase;
  color: var(--gold);
  text-shadow: 0 0 20px rgba(201, 168, 76, 0.7);
}
```

---

### Small Text / Captions
**Font:** Philosopher  
**Size:** 12px  
**Weight:** 400  
**Letter Spacing:** 0.05em  
**Color:** Text secondary (muted)  

```css
small, .caption {
  font-family: 'Philosopher', 'DINPro', 'Optima', 'Trebuchet MS', sans-serif;
  font-size: 12px;
  letter-spacing: 0.05em;
  color: var(--text-secondary);
}
```

---

## 🔤 Font Loading Strategy

### Google Fonts Import
```html
<link href="https://fonts.googleapis.com/css2?family=Philosopher:ital,wght@0,400;0,700;1,400;1,700&display=swap" rel="stylesheet">
```

### DINPro Loading (Web Font Service or Local)
```css
@font-face {
  font-family: 'DINPro';
  src: url('/fonts/DINPro-Regular.woff2') format('woff2'),
       url('/fonts/DINPro-Regular.woff') format('woff');
  font-weight: 400;
  font-display: swap;
}

@font-face {
  font-family: 'DINPro';
  src: url('/fonts/DINPro-Bold.woff2') format('woff2'),
       url('/fonts/DINPro-Bold.woff') format('woff');
  font-weight: 700;
  font-display: swap;
}
```

### System Font Stacks (Fallbacks)
```css
/* If DINPro unavailable, use Optima; if Optima unavailable, use Trebuchet MS */
--display-font: 'DINPro', 'Philosopher', 'Optima', 'Trebuchet MS', sans-serif;
--body-font: 'Philosopher', 'DINPro', 'Optima', 'Trebuchet MS', sans-serif;
```

---

## 📊 Font Pairing Guide

### Display + Body Combinations

| Context | Display | Body | Usage |
|---------|---------|------|-------|
| Headlines | DINPro (700) | Philosopher (400) | H1-H3 with body text |
| Navigation | DINPro (600) | — | Nav links, menus |
| Logo | DINPro (700) | — | Branding, hero |
| Body copy | — | Philosopher (400) | Paragraphs, articles |
| Emphasis | DINPro (700) | Philosopher (700) | Important content |
| Captions | — | Philosopher (400) | Image captions, meta |
| Quotes | Philosopher (400) | Philosopher (700) | Testimonials |
| Form labels | DINPro (600) | Philosopher (400) | Form inputs |

---

## 🎨 Font Styling Per Page

### Home (index.html)
```
Hero Title: DINPro 68px / Gold / Letter-spacing: 0.18em
Subtitle: Philosopher 18px / Secondary text
CTA: DINPro 14px / Uppercase / Gold accent
Body: Philosopher 16px / Line-height: 1.85
```

### Journey (journey.html)
```
Page Title: DINPro 68px / Gold / Uppercase
Timeline Headers: DINPro 26px / Gold
Milestone Text: Philosopher 16px / Regular
Years/Dates: DINPro 14px / Uppercase / Muted
```

### Creations (creations.html)
```
Gallery Title: DINPro 68px / Gold
Category Headers: DINPro 26px / Gold
Item Titles: Philosopher 18px / Bold
Descriptions: Philosopher 14px / Secondary
Tags: DINPro 12px / Uppercase / Muted
```

### Odyssey (odyssey.html)
```
Chapter Title: DINPro 68px / Gold / Uppercase
Chapter Number: DINPro 42px / Gold-dim
Narrative Text: Philosopher 16px / Elegant italic for quotes
Portrait Names: DINPro 20px / Gold
Subtitles: Philosopher 14px / Secondary
```

### Connect (connect.html)
```
Page Title: DINPro 68px / Gold
Form Labels: DINPro 14px / Uppercase
Input Text: Philosopher 16px / Regular
Button: DINPro 14px / Bold / Uppercase / Gold background
Social Links: DINPro 14px / Uppercase / Gold
```

---

## 💾 CSS Variables Setup

```css
:root {
  /* Font Families (Priority Order) */
  --font-display: 'DINPro', 'Philosopher', 'Optima', 'Trebuchet MS', sans-serif;
  --font-body: 'Philosopher', 'DINPro', 'Optima', 'Trebuchet MS', sans-serif;
  --font-mono: 'Courier New', monospace;
  
  /* Font Sizes (Golden Ratio Scale) */
  --fs-sm: 12px;
  --fs-md: 14px;
  --fs-base: 16px;
  --fs-lg: 20px;
  --fs-xl: 26px;
  --fs-2xl: 42px;
  --fs-3xl: 68px;
  
  /* Font Weights */
  --fw-light: 300;
  --fw-regular: 400;
  --fw-medium: 500;
  --fw-semibold: 600;
  --fw-bold: 700;
  
  /* Line Heights */
  --lh-tight: 1.2;
  --lh-normal: 1.5;
  --lh-relaxed: 1.85;
  
  /* Letter Spacing */
  --ls-tight: -0.02em;
  --ls-normal: 0.02em;
  --ls-wide: 0.08em;
  --ls-wider: 0.12em;
  --ls-widest: 0.18em;
}
```

---

## 🔄 Font Fallback Strategy

If fonts don't load:
1. **DINPro unavailable?** → Falls back to Philosopher (clean, similar proportions)
2. **Philosopher unavailable?** → Falls back to Optima (elegant humanist sans)
3. **Optima unavailable?** → Falls back to Trebuchet MS (common system font)
4. **Trebuchet MS unavailable?** → Falls back to generic `sans-serif`

All fallbacks maintain readability and visual hierarchy.

---

## 📱 Responsive Font Scaling

Using `clamp()` for fluid typography:

```css
/* Scales between min and max based on viewport */
h1 { font-size: clamp(2.5rem, 5vw, 4.5rem); }    /* 40px - 72px */
h2 { font-size: clamp(1.8rem, 4vw, 2.8rem); }    /* 28.8px - 44.8px */
h3 { font-size: clamp(1.3rem, 2.5vw, 1.75rem); } /* 20.8px - 28px */
p  { font-size: clamp(0.9rem, 1.2vw, 1rem); }    /* 14.4px - 16px */
```

This ensures fonts are always readable on any device without media queries.

---

## ✨ Implementation Priority

**Phase 1 (Immediate):**
- Update all font-family declarations to use Philosopher → DINPro → Optima → Trebuchet MS
- Add CSS variables for font sizes, weights, spacing
- Implement responsive font scaling with clamp()

**Phase 2 (Next):**
- Load DINPro web font (Google Fonts or local)
- Test fallback chains in different browsers
- Optimize font loading with font-display: swap

**Phase 3 (Polish):**
- Fine-tune letter spacing per context
- Verify accessibility (font contrast, readability)
- Test on multiple devices and browsers

---

## 🎯 Success Criteria

✅ All headings use DINPro or Philosopher (not system fonts)  
✅ Body text is consistently Philosopher 16px with 1.85 line-height  
✅ Logo is distinctive DINPro 700 with gold color  
✅ Navigation is crisp DINPro 14px uppercase  
✅ Fallback fonts maintain visual hierarchy  
✅ Fonts render correctly on all browsers  
✅ Performance impact is minimal (font-display: swap)  

---

**Last Updated:** May 9, 2026 | **Status:** Ready for CSS implementation

