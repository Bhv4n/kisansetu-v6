/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{js,ts,jsx,tsx,mdx}", "./components/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        cream: {
          DEFAULT: "#FFF8F0",
          50: "#FFFDFB",
          100: "#FFF8F0",
          200: "#FCEEDD",
        },
        tan: {
          DEFAULT: "#C08552",
          50: "#F6E9DD",
          100: "#EEDBC6",
          200: "#E3C7A8",
          300: "#D8B38A",
          400: "#CD9A6D",
          500: "#C08552",
          600: "#A96F3F",
          700: "#8C5A3C",
        },
        earth: {
          DEFAULT: "#8C5A3C",
          400: "#8C5A3C",
          500: "#734A31",
        },
        cocoa: {
          DEFAULT: "#4B2E2B",
          400: "#5E3B37",
          500: "#4B2E2B",
          600: "#3A2321",
          900: "#251512",
        },
      },
      fontFamily: {
        sans: ["ui-sans-serif", "system-ui", "-apple-system", "Segoe UI", "Roboto", "sans-serif"],
      },
      boxShadow: {
        card: "0 1px 3px rgba(75, 46, 43, 0.08), 0 1px 2px rgba(75, 46, 43, 0.06)",
      },
      borderRadius: {
        xl2: "1rem",
      },
    },
  },
  plugins: [],
};
