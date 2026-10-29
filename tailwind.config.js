export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        vino: { 50: '#fbf2f6', 100: '#f6e1ea', 200: '#ecc0d3', 300: '#dc8fb0', 400: '#c45a88', 500: '#a51f5c', 600: '#830040', 700: '#6c0035', 800: '#55002a', 900: '#3d001e' },
        lila: { 50: '#faf4f8', 100: '#f3e6ef', 200: '#e6cbde', 300: '#d3a5c4', 400: '#B771A0', 500: '#a45a8c', 600: '#894674' },
        crema: '#faf7f8',
      },
      fontFamily: {
        sans: ['"Fira Sans"', 'system-ui', 'sans-serif'],
        cond: ['"Fira Sans Condensed"', '"Fira Sans"', 'sans-serif'],
      },
      boxShadow: { suave: '0 1px 2px rgba(61,0,30,.06), 0 4px 16px rgba(61,0,30,.06)' },
    },
  },
  plugins: [],
}
