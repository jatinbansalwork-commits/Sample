/**
 * Blade ThemeTokens for this app.
 * Shape: https://blade.razorpay.com/?path=/docs/tokens-theme--docs
 *
 * Brand overrides:
 * - colors: KlearNow indigo / sapphire / surface (not Razorpay azure)
 * - typography.fonts.family: Inter
 */
const bladeTheme = {
  name: "klearnow",
  breakpoints: {
    base: 0,
    xs: 320,
    s: 480,
    m: 768,
    l: 1024,
    xl: 1200,
  },
  spacing: {
    0: 0,
    1: 2,
    2: 4,
    3: 8,
    4: 12,
    5: 16,
    6: 20,
    7: 24,
    8: 32,
    9: 40,
    10: 48,
    11: 56,
  },
  border: {
    width: {
      none: 0,
      thinner: 0.5,
      thin: 1,
      thick: 1.5,
      thicker: 2,
    },
    radius: {
      none: 0,
      "2xsmall": 2,
      xsmall: 4,
      small: 8,
      medium: 12,
      large: 16,
      xlarge: 20,
      "2xlarge": 24,
      max: 9999,
      round: "50%",
    },
  },
  motion: {
    duration: {
      "2xquick": 80,
      xquick: 160,
      quick: 200,
      moderate: 280,
      xmoderate: 360,
      gentle: 480,
      xgentle: 640,
      "2xgentle": 960,
    },
    delay: {
      "2xquick": 80,
      xquick: 160,
      moderate: 280,
      gentle: 480,
      xgentle: 960,
      long: 2000,
      xlong: 3000,
      "2xlong": 5000,
    },
    easing: {
      linear: "cubic-bezier(0, 0, 0, 0)",
      entrance: "cubic-bezier(0, 0, 0.2, 1)",
      exit: "cubic-bezier(0.17, 0, 1, 1)",
      standard: "cubic-bezier(0.3, 0, 0.2, 1)",
      emphasized: "cubic-bezier(0.5, 0, 0, 1)",
      overshoot: "cubic-bezier(0.5, 0, 0.3, 1.5)",
      shake: "cubic-bezier(1, 0.5, 0, 0.5)",
    },
  },
  typography: {
    fonts: {
      family: {
        text: "Inter, sans-serif",
        heading: "Inter, sans-serif",
        code: "Inter, sans-serif",
      },
      weight: {
        regular: 400,
        medium: 500,
        semibold: 600,
        bold: 700,
      },
    },
  },
};

window.bladeTheme = bladeTheme;
