/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        primary: {
          50:  '#e8eaf6',
          100: '#c5cae9',
          200: '#9fa8da',
          300: '#7986cb',
          400: '#5c6bc0',
          500: '#3949ab',
          600: '#3040a0',
          700: '#283593',
          800: '#1a237e',
          900: '#0d1659',
        },
        accent: {
          400: '#26c6da',
          500: '#00acc1',
          600: '#0097a7',
        },
        success: '#43a047',
        warning: '#fb8c00',
        danger:  '#e53935',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
