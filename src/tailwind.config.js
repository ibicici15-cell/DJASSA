/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        encre: { 950: "#14283A", 900: "#1C3A52", 800: "#2A4F6E", 700: "#3D6683" },
        sable: { 50: "#FCFCFB", 100: "#F1F1EF" },
        ocre: { 400: "#F0783A", 500: "#E8570D", 600: "#C4470A", 700: "#9C380A" },
        indigo: { 400: "#6B93C7", 500: "#3B66A3", 600: "#2C4F82" },
        or: { 400: "#E8B84B", 500: "#D19A28" },
      },
      fontFamily: {
        display: ["'Poppins'", "sans-serif"],
        body: ["'Inter'", "sans-serif"],
        mono: ["'IBM Plex Mono'", "monospace"],
      },
      backgroundImage: {
        contour: "radial-gradient(circle at 1px 1px, rgba(201,127,30,0.15) 1px, transparent 0)",
      },
    },
  },
  plugins: [],
};
