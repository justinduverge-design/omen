/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ['selector', '[data-theme="dark"]'],
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        slops: {
          bg: '#0f172a',
          surface: '#1e293b',
          border: '#334155',
          amber: '#f59e0b',
          amberLight: '#fcd34d',
          text: '#f8fafc',
          muted: '#94a3b8',
        },
        raven: '#0A0A0B',
        charcoal: '#1C1C1E',
        bone: '#F5F0E8',
        gold: {
          DEFAULT: '#A67C2E',
          light: '#C49035',
          muted: '#3A2A0A',
        },
        crimson: '#7E1717',
        verdigris: '#2F7D5B',
        umber: '#5A3A25',
        omen: '#2F7D5B',

        // ── shadcn/ui token bridge — reads Omen's --color-* CSS variables ──
        background: 'var(--color-bg)',
        foreground: 'var(--color-text-primary)',
        border: 'var(--color-border)',
        input: 'var(--color-border)',
        ring: 'var(--color-focus-ring, var(--color-accent))',
        card: {
          DEFAULT: 'var(--color-surface-1)',
          foreground: 'var(--color-text-primary)',
        },
        popover: {
          DEFAULT: 'var(--color-surface-1)',
          foreground: 'var(--color-text-primary)',
        },
        primary: {
          DEFAULT: 'var(--color-accent)',
          foreground: 'var(--color-text-on-accent)',
        },
        secondary: {
          DEFAULT: 'var(--color-surface-2)',
          foreground: 'var(--color-text-primary)',
        },
        muted: {
          DEFAULT: 'var(--color-surface-2)',
          foreground: 'var(--color-text-secondary)',
        },
        accent: {
          DEFAULT: 'var(--color-accent)',
          foreground: 'var(--color-text-on-accent)',
        },
        destructive: {
          DEFAULT: 'var(--color-risk-high)',
          foreground: 'var(--color-text-primary)',
        },

        // ── Omen-specific tokens, exposed as Tailwind utilities ──
        risk: {
          low: 'var(--color-risk-low)',
          medium: 'var(--color-risk-medium)',
          high: 'var(--color-risk-high)',
        },
        team: {
          primary: 'var(--color-team-primary)',
          secondary: 'var(--color-team-secondary)',
          accent: 'var(--color-team-accent)',
          surface: 'var(--color-team-surface)',
          'surface-card': 'var(--color-team-surface-card)',
        },
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
      fontFamily: {
        sans:    ['Alegreya Sans', 'system-ui', 'sans-serif'],
        serif:   ['Alegreya', 'Georgia', 'serif'],
        display: ['Alegreya Sans', 'system-ui', 'sans-serif'],
        mono:    ['Alegreya Sans', 'system-ui', 'sans-serif'],
      },
      keyframes: {
        'accordion-down': {
          from: { height: '0' },
          to: { height: 'var(--radix-accordion-content-height)' },
        },
        'accordion-up': {
          from: { height: 'var(--radix-accordion-content-height)' },
          to: { height: '0' },
        },
      },
      animation: {
        'accordion-down': 'accordion-down 0.2s ease-out',
        'accordion-up': 'accordion-up 0.2s ease-out',
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
};
