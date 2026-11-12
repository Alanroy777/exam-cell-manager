/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx,html}",
  ],
  theme: {
    extend: {
      colors: {
        navy: {
          950: '#080616',
          900: '#0f0c29', // CEP website primary dark color
          800: '#1a163b',
          700: '#26224d',
          600: '#342f61',
        },
        accent: {
          DEFAULT: '#dc2626', // CEP logo crimson/red
          hover: '#b91c1c',
          light: '#fef2f2',
          border: '#fca5a5',
        },
        gov: {
          border: '#e2e8f0',
          bg: '#f8fafc',
          header: '#f1f5f9',
          text: '#0f172a',
          muted: '#64748b',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
      borderRadius: {
        DEFAULT: '4px',
        sm: '3px',
        md: '4px',
        lg: '6px',
      }
    },
  },
  plugins: [],
}

