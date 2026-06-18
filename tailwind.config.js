/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'arena-black': '#05050A',
        'arena-pink': '#FF2D9E',
        'arena-green': '#00FFA8',
        'arena-orange': '#FF8C2F',
        'arena-amber': '#FFD23F',
        'arena-text-white': '#F5F5FF',
        'arena-text-muted': '#9A9AC0',
      },
      fontFamily: {
        orbitron: ['Orbitron', 'sans-serif'],
        mono: ['Share Tech Mono', 'monospace'],
      }
    },
  },
  plugins: [],
}
