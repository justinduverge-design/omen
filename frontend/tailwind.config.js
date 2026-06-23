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
          DEFAULT: '#A67C2E',
          light: '#C49035',
          muted: '#3A2A0A',
        },
        crimson: '#7E1717',
        verdigris: '#2F7D5B',
        umber: '#5A3A25',
        omen: '#2F7D5B',
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
