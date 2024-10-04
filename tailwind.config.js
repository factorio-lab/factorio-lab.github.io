/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{html,ts}'],
  theme: {
    extend: {
      colors: {
        theme: {
          50: 'oklch(97.78% 0.0108 var(--theme-hue, 248))',
          100: 'oklch(93.56% 0.0321 var(--theme-hue, 248))',
          200: 'oklch(88.11% 0.0609 var(--theme-hue, 248))',
          300: 'oklch(82.67% 0.0908 var(--theme-hue, 248))',
          400: 'oklch(74.22% 0.1398 var(--theme-hue, 248))',
          500: 'oklch(64.78% 0.1472 var(--theme-hue, 248))',
          600: 'oklch(57.33% 0.1299 var(--theme-hue, 248))',
          700: 'oklch(46.89% 0.1067 var(--theme-hue, 248))',
          800: 'oklch(39.44% 0.0989 var(--theme-hue, 248))',
          900: 'oklch(32% 0.0726 var(--theme-hue, 248))',
          950: 'oklch(23.78% 0.054 var(--theme-hue, 248))',
        },
      },
    },
  },
  plugins: [],
};
