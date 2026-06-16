/** @type {import('tailwindcss').Config} */
export default {
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
          DEFAULT: '#B8952A',
          light: '#D4AC30',
          muted: '#3D2F0D',
        },
        crimson: '#8B1A1A',
        omen: '#5B2D8E',
      },
      fontFamily: {
        sans:    ['Alegreya Sans', 'system-ui', 'sans-serif'],
        serif:   ['Alegreya', 'Georgia', 'serif'],
        display: ['Alegreya Sans', 'system-ui', 'sans-serif'],
        mono:    ['DM Mono', 'ui-monospace', 'monospace'],
      },
    },
  },
  plugins: [],
};
