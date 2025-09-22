/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      fontSize: {
        '12': '12px',
        '14': '14px', 
        '16': '16px',
        '20': '20px',
        '24': '24px',
      },
      colors: {
        // Neutral gunmetal base
        neutral: {
          50: '#f8f9fa',
          100: '#f1f3f4',
          200: '#e8eaed',
          300: '#dadce0',
          400: '#bdc1c6',
          500: '#9aa0a6',
          600: '#80868b',
          700: '#5f6368',
          800: '#3c4043',
          900: '#202124',
        },
        // Status colors as defined in PRD
        status: {
          scheduled: '#e3f2fd', // primary-soft
          'scheduled-border': '#1976d2',
          'in-bay': '#4caf50', // success-solid
          'waiting-parts': '#fff3e0', // warning-striped background
          'waiting-parts-border': '#f57c00',
          'waiting-parts-stripe': '#ffcc02',
          completed: '#f5f5f5', // muted-subtle
          'completed-border': '#9e9e9e',
        },
      },
      spacing: {
        '44': '44px', // For compact table rows
      },
    },
  },
  plugins: [],
}

