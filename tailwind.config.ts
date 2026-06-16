import type { Config } from 'tailwindcss';

export default {
  content: [
    './app/**/*.{ts,tsx,html}'
  ],
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
        display: ['var(--font-display)', 'ui-serif', 'Georgia', 'serif'],
        sans: ['var(--font-sans)', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        mono: ['var(--font-mono)', 'ui-monospace', 'monospace'],
      },
      transitionTimingFunction: {
        journal: 'var(--ease-journal)',
      },
      borderRadius: {
        sharp: '0.25rem',
      },
      boxShadow: {
        offset: '2px 2px 0 0 rgba(122, 53, 42, 0.5)',
        note: '0 4px 18px -10px rgba(26, 28, 24, 0.35)',
        'note-hover': '0 22px 38px -18px rgba(26, 28, 24, 0.50)',
      }
    },
  },
  plugins: [],
} satisfies Config;
