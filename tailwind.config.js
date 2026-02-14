/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{js,ts}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [require('daisyui')],
  daisyui: {
    themes: [
      {
        polaris: {
          'color-scheme': 'light',
          primary: '#4F52BD',
          'primary-content': '#ffffff',
          secondary: '#6B7280',
          'secondary-content': '#ffffff',
          accent: '#4F52BD',
          'accent-content': '#ffffff',
          neutral: '#374151',
          'neutral-content': '#f9fafb',
          'base-100': '#ffffff',
          'base-200': '#f3f4f6',
          'base-300': '#e5e7eb',
          'base-content': '#1f2937',
          '--rounded-box': '0.5rem',
          '--rounded-btn': '0.375rem',
          '--rounded-badge': '0.375rem',
        },
      },
      'light',
      'dark',
    ],
    base: true,
    styled: true,
    utils: true,
  },
};
