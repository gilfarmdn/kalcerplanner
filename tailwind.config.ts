import type { Config } from "tailwindcss";

// Fonts and sizes follow the KalcerPlanner Figma file; colors follow public/images/logo/logo.png.
const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          green: "#0b5040",
          leaf: "#0b6342",
          brown: "#703a1a",
          orange: "#f8a81f",
          mist: "#c9dccf",
          cream: "#faf6ec",
          link: "#0b6342",
          gray: "#d9d9d9",
        },
      },
      fontFamily: {
        sans: ["var(--font-poppins)", "system-ui", "sans-serif"],
        serif: ["var(--font-playfair)", "Georgia", "serif"],
        inter: ["var(--font-inter)", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;
