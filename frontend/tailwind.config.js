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
        }
      },
      fontFamily: {
        serif: ['Cormorant Garamond', 'serif'],
        sans: ['Alegreya Sans', 'sans-serif'],
      }
    },
  },
  plugins: [],
};
