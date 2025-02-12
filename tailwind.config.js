// tailwind.config.js
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}", // If you use the app directory
    "./src/**/*.{js,ts,jsx,tsx,mdx}", // If you use the src directory
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}
