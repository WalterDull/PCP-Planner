import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        // FTC International brand palette — orange mark + dark navy wordmark.
        brand: {
          50: "#fff5ee",
          100: "#ffe6d5",
          500: "#f26a21",
          600: "#e35511",
          700: "#b8440e",
          900: "#7a2d0a",
        },
        // Navy from the FTC wordmark, for headings/secondary accents.
        ftcnavy: "#1c1c38",
      },
    },
  },
  plugins: [],
};

export default config;
