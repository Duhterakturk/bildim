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
          50: "#f0f6f5",
          100: "#deedeb",
          200: "#b8d6d2",
          300: "#86b5b0",
          400: "#4e8987",
          500: "#20565e",
          600: "#16434b",
          700: "#123a40",
          800: "#102f35",
          900: "#0b252b",
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
