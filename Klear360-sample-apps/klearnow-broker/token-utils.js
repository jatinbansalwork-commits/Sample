/**
 * KlearNow Theme — token helpers
 *
 * Convert unitless knTheme scale steps into CSS values.
 * Spacing, size, radius, and border width on :root are rem (16px root),
 * matching tokens.css. Breakpoints stay px because @media cannot read custom
 * properties. JS layout math still uses the unitless numbers on knTheme.
 */

const knTokenUtils = {
  makeSpace(size) {
    return size === 0 ? "0" : `${size}px`;
  },

  makeSize(size) {
    return size === 0 ? "0" : `${size}px`;
  },

  makeBorderSize(size) {
    if (typeof size === "string") return size;
    return size === 0 ? "0" : `${size}px`;
  },

  makeTypographySize(size) {
    const remValue = size / 16;
    return `${remValue}rem`;
  },

  makeLetterSpacing(letterSpacing, fontSize) {
    return `${fontSize * (letterSpacing / 100)}px`;
  },

  makeMotionTime(time) {
    return `${time}ms`;
  },

  getMediaQuery({ min, max }) {
    if (max == null) {
      return `screen and (min-width: ${min}px)`;
    }
    if (min === 0) {
      return `screen and (max-width: ${max}px)`;
    }
    return `screen and (min-width: ${min}px) and (max-width: ${max}px)`;
  },

  closestSpacingStep(px, spacing) {
    const entries = Object.entries(spacing).map(([key, value]) => [key, value]);
    let bestKey = "0";
    let bestDist = Infinity;
    entries.forEach(([key, value]) => {
      const dist = Math.abs(value - px);
      if (dist < bestDist || (dist === bestDist && value > spacing[bestKey])) {
        bestDist = dist;
        bestKey = key;
      }
    });
    return bestKey;
  },
};

window.knTokenUtils = knTokenUtils;
