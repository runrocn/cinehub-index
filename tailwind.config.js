/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          500: '#f43f5e',
          600: '#e11d48'
        }
      }
    }
  },
  plugins: []
}
