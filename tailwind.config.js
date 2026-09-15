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
          bg: '#0A0A0A',
          surface: '#171717',
          raised: '#262626',
          border: '#404040',
          text: '#F5F5F5',
          subtext: '#A3A3A3',
          accent: '#F59E0B',
          accent2: '#F97316',
          accent3: '#EF4444',
          green: '#10B981',
          yellow: '#F59E0B',
          orange: '#F97316',
          red: '#EF4444',
          glow: 'rgba(245, 158, 11, 0.15)',
        },
      },
      fontFamily: {
        sans: ["Inter", "Manrope", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "IBM Plex Mono", "monospace"],
      },
      animation: {
        'radar-sweep': 'radar-sweep 3s linear infinite',
        'border-glow': 'border-glow 3s ease-in-out infinite',
        'float': 'float 6s ease-in-out infinite',
        'pulse-dot': 'pulse-dot 2.4s ease-in-out infinite',
        'gradient-shift': 'gradient-shift 8s ease-in-out infinite',
      },
      keyframes: {
        'radar-sweep': {
          '0%': { transform: 'rotate(0deg)' },
          '100%': { transform: 'rotate(360deg)' },
        },
        'border-glow': {
          '0%, 100%': { opacity: '0.4' },
          '50%': { opacity: '1' },
        },
        'float': {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        'gradient-shift': {
          '0%, 100%': { backgroundPosition: '0% 50%' },
          '50%': { backgroundPosition: '100% 50%' },
        },
      },
    },
  },
  plugins: [],
}
