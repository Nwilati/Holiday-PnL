/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Warm neutrals
        cream: {
          50: '#FEFDFB',
          100: '#FBF9F5',
          200: '#F5F1EA',
          300: '#EBE5DA',
        },
        // Terracotta accent
        terracotta: {
          50: '#FEF5F0',
          100: '#FCEADE',
          200: '#F9D0B8',
          300: '#F4A87A',
          400: '#E8865A',
          500: '#D4694A',
          600: '#B84D35',
          700: '#943D2B',
        },
        // Sage green
        sage: {
          50: '#F4F7F4',
          100: '#E6EDE6',
          200: '#D0DED0',
          300: '#A8C5A8',
          400: '#7BA87B',
          500: '#5C8A5C',
          600: '#476E47',
          700: '#3A5A3A',
        },
        // Warm grays
        warm: {
          50: '#FAFAF9',
          100: '#F5F5F3',
          200: '#E8E6E3',
          300: '#D6D3CE',
          400: '#A8A29E',
          500: '#78716C',
          600: '#57534E',
          700: '#44403C',
          800: '#292524',
          900: '#1C1917',
        },
      },
      fontFamily: {
        sans: ['DM Sans', 'system-ui', 'sans-serif'],
        display: ['Fraunces', 'Georgia', 'serif'],
      },
      boxShadow: {
        'soft': '0 2px 15px -3px rgba(0, 0, 0, 0.07), 0 10px 20px -2px rgba(0, 0, 0, 0.04)',
        'soft-lg': '0 10px 40px -10px rgba(0, 0, 0, 0.1), 0 2px 10px -2px rgba(0, 0, 0, 0.04)',
      },
      borderRadius: {
        'xl': '1rem',
        '2xl': '1.25rem',
        '3xl': '1.5rem',
      },
    },
  },
  plugins: [],
}
