/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          bg: '#0B1220',
          surface: '#121B2E',
          raised: '#1A2740',
          border: '#25314A',
          text: '#E8EDF7',
          subtext: '#8B9BB8',
          accent: '#5FA8D3',
          green: '#3DBA6D',
          yellow: '#E8C547',
          orange: '#E8873D',
          red: '#D4483D',
        },
      },
      fontFamily: {
        sans: ["Inter", "Manrope", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "IBM Plex Mono", "monospace"],
      },
    },
  },
  plugins: [],
}
