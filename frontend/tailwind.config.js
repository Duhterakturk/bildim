/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#1e1a16",
        paper: "#f3eee4",
        line: "#e4d8c4",
        brand: {
          50: "#eef4ff",
          100: "#d9e6ff",
          200: "#b3cdff",
          300: "#82adff",
          400: "#4d84ff",
          500: "#2461f7",
          600: "#1848d1",
          700: "#1638a6",
          800: "#173182",
          900: "#182c68",
        },
      },
      fontFamily: {
        sans: ["Manrope", "system-ui", "sans-serif"],
        display: ["Manrope", "system-ui", "sans-serif"],
        hand: ["Dancing Script", "cursive"],
      },
    },
  },
  plugins: [],
};
