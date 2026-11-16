/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // Strict Tri-Color Palette: Oranye, Ungu, Putih (GEMINI.md SSOT)
        brand: {
          orange: {
            50: '#FFF7ED',
            100: '#FFEDD5',
            200: '#FED7AA',
            500: '#F97316', // Core Call to Action / Warning
            600: '#EA580C',
            700: '#C2410C',
          },
          purple: {
            50: '#F5F3FF',
            100: '#EDE9FE',
            200: '#DDD6FE',
            600: '#7C3AED', // Core Brand Identity & Header
            700: '#6D28D9',
            900: '#4C1D95',
          },
          white: '#FFFFFF',
          slate: {
            50: '#F8FAFC',
            100: '#F1F5F9',
            200: '#E2E8F0',
            600: '#475569',
            900: '#0F172A',
          },
        },
      },
      fontFamily: {
        sans: ['"DM Sans"', 'system-ui', 'sans-serif'],
        display: ['"DM Sans"', 'system-ui', 'sans-serif'],
        body: ['"Roboto"', 'system-ui', 'sans-serif'],
        data: ['"Roboto"', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        'brand-orange': '0 10px 25px -5px rgba(249, 115, 22, 0.25)',
        'brand-purple': '0 10px 25px -5px rgba(124, 58, 237, 0.20)',
      },
    },
  },
  plugins: [],
};
