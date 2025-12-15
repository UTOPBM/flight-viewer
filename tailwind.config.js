/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      keyframes: {
        'fade-in-down': {
          '0%': { opacity: '0', transform: 'translateY(-10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'fade-in-up': {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'runway-takeoff': {
          '0%': { transform: 'translateX(0) translateY(0) scale(1)' },
          '20%': { transform: 'translateX(20px) translateY(0) scale(1)' },
          '100%': { transform: 'translateX(300px) translateY(-150px) scale(0.5)', opacity: '0' },
        },
      },
      animation: {
        'fade-in-down': 'fade-in-down 0.5s ease-out',
        'fade-in-up': 'fade-in-up 0.5s ease-out',
        'runway-takeoff': 'runway-takeoff 2s ease-in-out forwards',
      },
    },
  },
  plugins: [],
  darkMode: 'class',
}
