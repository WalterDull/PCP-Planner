import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#f0f9f4",
          100: "#dcf1e3",
          500: "#2f8f5b",
          600: "#237a49",
          700: "#1c5f39",
          900: "#123c25",
        },
      },
    },
  },
  plugins: [],
};

export default config;
