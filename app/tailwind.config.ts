import type { Config } from "tailwindcss";

export default {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        gold: {
          DEFAULT: "#F5B942",
          dim: "#c9982e",
        },
        silver: {
          DEFAULT: "#9CA3AF",
        },
      },
    },
  },
  plugins: [],
} satisfies Config;
