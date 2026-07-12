/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        // Single accent used across the whole design system. Change these four
        // values to re-theme the entire app in one place.
        brand: {
          50: '#faf5f9',
          100: '#f5e8f3',
          500: '#a855a8',
          600: '#934D86',
          700: '#7e3d71',
        },
      },
      boxShadow: {
        card: '0 1px 3px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.04)',
      },
    },
  },
  plugins: [],
};
