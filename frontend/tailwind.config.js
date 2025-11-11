export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        white: '#FFFFFF',
        black: '#000000',
        pink: {
          DEFAULT: '#F080B8',
          light: '#FFE6FE',
          alpha: '#F080B8CB',
        },
        gray: {
          DEFAULT: '#707070',
        },
      },
    },
  },
};