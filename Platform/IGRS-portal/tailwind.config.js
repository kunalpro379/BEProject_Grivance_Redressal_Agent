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
        // Black & White
        'pure-black': '#000000',
        'pure-white': '#FFFFFF',
        'off-black': '#1a1a1a',
        'off-white': '#FAFAFA',
        
        // Cream Palette
        cream: {
          50: '#FFFBF5',
          100: '#FFF8F0',
          200: '#FFF5E8',
          300: '#F5E6D3',
          400: '#E8D4B8',
          500: '#D4BFA0',
          600: '#C0AA88',
          700: '#A89570',
          800: '#8F7F58',
          900: '#766940',
        },
        
        // Legacy dark colors
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
      backgroundImage: {
        'cream-gradient': 'linear-gradient(135deg, #FFF8F0 0%, #FFFBF5 50%, #FFF5E8 100%)',
        'black-gradient': 'linear-gradient(135deg, #000000 0%, #1a1a1a 100%)',
        'cream-subtle': 'linear-gradient(to bottom right, #FFFBF5, #FFF8F0, #FFF5E8)',
      },
    },
  },
  plugins: [],
}

