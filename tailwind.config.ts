import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      backgroundImage: {
        "gradient-radial": "radial-gradient(var(--tw-gradient-stops))",
        "gradient-conic":
          "conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))",
      },
      // Aquí añadiremos nuestros colores y fuentes personalizadas
      colors: {
        'azul-profundo': '#1E3A4F',
        'blanco-hueso': '#F4F2EB',
        'dorado-claro': '#D4AF37',
        'celeste-cielo': '#A4DDEE',
        'verde-agua': '#61D0BE',
        'gris-calido': '#888888',
        'rojo-alerta': '#E53E3E',
      },
      fontFamily: {
        sans: ['var(--font-inter)', 'sans-serif'],
        serif: ['var(--font-playfair-display)', 'serif'],
      },
      keyframes: {
        animatedGradient: {
          '0%, 100%': { backgroundPosition: '0% 50%' },
          '50%': { backgroundPosition: '100% 50%' },
        },
      },
      animation: {
        gradient: 'animatedGradient 15s ease infinite',
      },
    },
  },
  plugins: [
    require('tailwind-scrollbar-hide'),
  ],
};
export default config; 