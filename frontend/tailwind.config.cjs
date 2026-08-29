// tailwind.config.js
module.exports = {
  content: ['./index.html', './src/**/*.{vue,js}'],
  theme: {
    extend: {
      colors: {
        primary: { DEFAULT: '#2B3A67', light: '#4A5C8A' },
        accent: '#B8862F',
        background: '#F7F6F3',
        surface: '#FFFFFF',
        'text-primary': '#1E2233',
        'text-secondary': '#6B7280',
        border: '#E5E3DD',
        success: '#2F855A',
        warning: '#B7791F',
        info: '#2C5282',
        danger: '#C53030',
        'danger-alt': '#9C4221',
      },
      fontFamily: {
        display: ['Lora', 'serif'],
        body: ['"Be Vietnam Pro"', 'sans-serif'],
      },
      borderRadius: {
        lg: '8px',
      },
    },
  },
  plugins: [],
};
