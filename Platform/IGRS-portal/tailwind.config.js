/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        'dark-bg': '#1a1a1a',
        'dark-card': '#2d2d2d',
        'dark-border': '#404040',
        'dark-text': '#e5e5e5',
        'dark-text-secondary': '#a3a3a3',
        'dark-hover': '#3d3d3d',
        primary: {
          400: '#60a5fa',
          500: '#3b82f6',
          600: '#2563eb',
          700: '#1d4ed8',
        },
      },
    },
  },
  plugins: [],
}

