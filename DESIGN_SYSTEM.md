# Curio Design System Design Documentation

This document defines the complete visual and behavioral design system for the **Curio Digital Curiosity Archive**. It is engineered to establish a warm, tactile, museum-catalog experience, mapping directly to the specifications of the **Curio UI Build Guide**.

---

## 1. Design Principles

1.  **Archival Tactility**: The interface must resemble physical paper, notebook margins, and printed ink. Avoid glow layers, rounded pills, and loud color ranges.
2.  **Deliberate Friction**: Layouts favor quiet, structured tables, thin dividers, and sharp corners (maximum corner radius `0.25rem` or `4px`).
3.  **Monospace Documentation**: Secondary text, dates, navigation tags, and indicators utilize spaced monospace text to mimic catalog stamps.

---

## 2. CSS Theme Variables

Add these root custom properties to your global stylesheet (`app/styles/globals.css`):

```css
@theme {
  /* OKLCH Color Palette mapping directly to hex approximations */
  --color-paper: oklch(0.953 0.012 85);       /* #F5F1EB - Base Background */
  --color-paper-deep: oklch(0.918 0.014 82);  /* #E8E2D8 - Cards & Input Boxes */
  --color-ink: oklch(0.18 0.006 110);        /* #242320 - Titles & Solid Borders */
  --color-ink-soft: oklch(0.32 0.008 110);   /* #4A4740 - Body text & labels */
  --color-maroon: oklch(0.40 0.12 22);       /* #7A352A - Primary brand accent */
  --color-clay: oklch(0.55 0.07 35);         /* #9A7A5E - Path links & thread labels */
  --color-moss: oklch(0.42 0.018 135);       /* #5E6B58 - System/Domain labels (Technology) */
  --color-forest: oklch(0.36 0.018 145);     /* #4A5744 - Citation cards */
  --color-burgundy: oklch(0.38 0.08 25);     /* #5E3830 - Domain label (History) */
  --color-navy: oklch(0.32 0.05 250);        /* #2E3A4E - Domain label (Science) */

  /* Typography Fallbacks */
  --font-display: "Instrument Serif", ui-serif, Georgia, serif;
  --font-sans: Inter, ui-sans-serif, system-ui, sans-serif;
  --font-mono: "JetBrains Mono", ui-monospace, monospace;

  /* Custom Easing for the Archival Vibe */
  --ease-journal: cubic-bezier(0.2, 0.8, 0.2, 1);
}
```

---

## 3. Tailwind Configuration

Integrate these extensions inside your `tailwind.config.ts` or modern Tailwind config file:

```typescript
import type { Config } from 'tailwindcss';

export default {
  content: ['./app/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        paper: 'var(--color-paper)',
        'paper-deep': 'var(--color-paper-deep)',
        ink: 'var(--color-ink)',
        'ink-soft': 'var(--color-ink-soft)',
        maroon: 'var(--color-maroon)',
        clay: 'var(--color-clay)',
        moss: 'var(--color-moss)',
        forest: 'var(--color-forest)',
        burgundy: 'var(--color-burgundy)',
        navy: 'var(--color-navy)',
      },
      fontFamily: {
        display: ['var(--font-display)'],
        sans: ['var(--font-sans)'],
        mono: ['var(--font-mono)'],
      },
      transitionTimingFunction: {
        journal: 'var(--ease-journal)',
      },
      borderRadius: {
        sharp: '0.25rem', // 4px hard boundaries
      },
      boxShadow: {
        offset: '2px 2px 0 0 rgba(122, 53, 42, 0.5)', // Maroon block offset shadow
        note: '0 4px 18px -10px rgba(26, 28, 24, 0.35)', // Sticky notes shadow
        'note-hover': '0 22px 38px -18px rgba(26, 28, 24, 0.50)',
      }
    },
  },
  plugins: [],
} satisfies Config;
```

---

## 4. Typography Scale & Hierarchy

| Element | Font | Desktop Size | Mobile Size | Weight | Line Height | Track/Style |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Page Title (h2)** | Display | `60px` | `48px` | `400` | `1.02` | `text-pretty`, italic elements |
| **Section Title (h3)** | Display | `30px` | `26px` | `400` | `1.15` | — |
| **Card Title** | Display | `20px` | `18px` | `400` | `1.2` | — |
| **Body Paragraph** | Sans | `15px` | `14px` | `400` | `1.6` | Color: `--ink-soft` |
| **Mono Label** | Mono | `10px` | `9px` | `400` | `1.5` | `uppercase`, tracking `0.22em` |
| **Button Text** | Mono | `10px` | `10px` | `400` | `1.0` | `uppercase`, tracking `0.2em` |

---

## 5. Layout & Spacing System

### A. Page Shell Grid
The site frame is structured using a strict container outline:
*   **Max Width Container**: `max-w-7xl` (`1280px`), centered via `mx-auto`.
*   **Padding**: `px-6` on mobile screens, scaling to `px-12` on desktop displays.
*   **Vertical Section Rhythm**: Separate blocks with `mb-16` or `mb-20`.
*   **Columns Grid**: Grid spans `grid-cols-12`. Standard content columns occupy 7-8 slots, while info drawers and trails occupy 4-5 slots.

### B. The Archival Rule (`.rule`)
Instead of generic borders, use a fading horizontal rule:
```css
.rule {
  height: 1px;
  background: linear-gradient(
    to right,
    transparent,
    oklch(0.18 0.006 110 / 0.18),
    transparent
  );
}
```

---

## 6. Component Specs & Visual States

### 1. Tab Navigation Items (`.tab-nav-item`)
Archival catalog folders. No rounded pills or underlined borders.
*   **Inactive State**:
    - Border: `1px solid oklch(0.18 0.006 110 / 0.18)`
    - Background: `oklch(0.953 0.012 85 / 0.4)`
    - Color: `--ink-soft`
*   **Active State**:
    - Border: `1px solid var(--color-ink)`
    - Background: `var(--color-ink)`
    - Color: `var(--color-paper)`
    - Shadow: `2px 2px 0 0 oklch(0.40 0.12 22 / 0.5)` (maroon offset shadow)

### 2. Archival Buttons
*   **Primary Button**:
    - Class: `bg-ink text-paper font-mono text-[10px] uppercase tracking-[0.22em] px-4 py-2 rounded-sharp`
    - Hover: `bg-maroon`
*   **Secondary Button**:
    - Class: `border border-ink/25 text-ink font-mono text-[10px] uppercase tracking-[0.18em] px-3 py-1.5 rounded-sharp`
    - Hover: `bg-ink text-paper`
*   **Text Link**:
    - Class: `text-ink-soft hover:text-ink font-mono text-[10px] uppercase tracking-[0.2em] underline-offset-4 hover:underline`

### 3. Inputs
Transparent inputs with thin bottom lines:
*   Class: `bg-transparent border-b border-ink/20 focus-within:border-ink transition-colors pb-2 placeholder:text-ink/40 placeholder:italic`
*   Focus state: Removes default outlines, applying a dark bottom border.

### 4. Specimen Cards (Cabinet Grid)
Renders catalog entries with domain color indicators.
*   Class: `border border-ink/15 bg-paper-deep p-5 hover:border-ink/40 transition-all rounded-sharp`
*   **Domain indicator**: Left-hand thick border `border-l-2` colored by:
    - Technology: `--color-moss`
    - History: `--color-burgundy`
    - Science: `--color-navy`
    - Culture: `--color-clay`

### 5. Knowledge Graph Nodes
*   **Seed Node (Center)**:
    - Class: `px-6 py-4 border border-ink/25 bg-paper/95 relative shadow-sm rounded-sharp`
    - Indicator: A `5px × 5px` maroon square positioned in the bottom-right corner.
*   **Satellite Node**:
    - Class: `bg-paper/85 border border-ink/10 px-3 py-2 max-w-[180px] rounded-sharp`
    - Active Indicator: Small `6px` dot. Inactive dot is `--ink`, turning `--maroon` and scaling up `scale(1.5)` on hover.

---

## 7. Motion & Animations

Configure these standard keyframes inside your global CSS stylesheet:

```css
@keyframes fadeIn {
  from { opacity: 0; transform: translateY(8px); }
  to { opacity: 1; transform: translateY(0); }
}

@keyframes riseIn {
  from { opacity: 0; transform: translateY(28px) rotate(1deg); filter: blur(2px); }
  to { opacity: 1; transform: translateY(0) rotate(0deg); filter: blur(0); }
}

@keyframes inkDraw {
  to { stroke-dashoffset: 0; }
}

@keyframes nodePulse {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.18); }
}

@keyframes factSwap {
  0%, 100% { opacity: 0; transform: translateY(-4px); }
  10%, 90% { opacity: 1; transform: translateY(0); }
}

/* Utilities */
.animate-fade-in {
  animation: fadeIn 0.6s var(--ease-journal) forwards;
}

.reveal {
  opacity: 0;
}

.reveal.is-visible {
  animation: riseIn 0.8s var(--ease-journal) forwards;
}
```

---

## 8. Background & Textures (The Secret Sauce)

To establish the warm study environment, apply the following background stack to the HTML body container:

```css
body {
  background-color: var(--color-paper);
  background-image:
    /* Layer 1: Warm spotlight from top-left */
    radial-gradient(circle at 20% 10%, oklch(0.99 0.01 85 / 0.55), transparent 55%),
    /* Layer 2: Muted shadow from bottom-right */
    radial-gradient(circle at 85% 80%, oklch(0.86 0.02 70 / 0.35), transparent 60%),
    /* Layer 3: Noise Texture SVG */
    url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.75' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.08'/%3E%3C/svg%3E"),
    /* Layer 4: Fiber Paper Texture SVG */
    url("data:image/svg+xml,%3Csvg viewBox='0 0 600 600' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='fiber'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.015' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23fiber)' opacity='0.04'/%3E%3C/svg%3E");
  background-attachment: fixed;
  background-size: auto, auto, 220px 220px, 600px 600px;
}
```

---

## 9. Accessibility & Keyboard Navigation

Even within an archival theme, accessibility must be preserved:
1.  **Contrast Ratios**: All text colors (`--ink` and `--ink-soft`) maintain a contrast ratio exceeding **4.5:1** against the `--paper` background.
2.  **Archival Focus State**:
    - Do not use default outlines.
    - Instead, apply a thin custom outline: `focus-visible:outline focus-visible:outline-1 focus-visible:outline-ink focus-visible:outline-offset-2`.
3.  **Keyboard Traversal**: The interactive canvas supports focus traps. When navigating via `Tab`, focus moves sequentially from the seed node to the active satellite paths.
