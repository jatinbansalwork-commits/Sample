/**
 * Blade `theme.breakpoints` + `useBreakpoint` behavior
 *
 * import { useTheme } from '@razorpay/blade/utils';
 * import { useBreakpoint } from '@razorpay/blade/utils';
 *
 * const { theme } = useTheme();
 * const { matchedBreakpoint, matchedDeviceType } = useBreakpoint({
 *   breakpoints: theme.breakpoints,
 * });
 */
const theme = window.bladeTheme;

function getMediaQuery({ min, max }) {
  if (max == null) {
    return `screen and (min-width: ${min}px)`;
  }
  if (min === 0) {
    return `screen and (max-width: ${max}px)`;
  }
  return `screen and (min-width: ${min}px) and (max-width: ${max}px)`;
}

function useBreakpoint({ breakpoints }) {
  const entries = Object.entries(breakpoints);
  const queries = entries.map(([token, screenSize], index) => {
    const maxValue = entries[index + 1]?.[1];
    const mediaQuery = getMediaQuery({
      min: screenSize,
      max: maxValue ? maxValue - 1 : undefined,
    });
    return { token, mediaQuery };
  });

  const getMatchedBreakpoint = () =>
    queries.find(({ mediaQuery }) => window.matchMedia(mediaQuery).matches)?.token;

  const getMatchedDeviceType = (matchedBreakpoint) =>
    matchedBreakpoint && ["base", "xs", "s"].includes(matchedBreakpoint)
      ? "mobile"
      : "desktop";

  const apply = () => {
    const matchedBreakpoint = getMatchedBreakpoint() || "base";
    const matchedDeviceType = getMatchedDeviceType(matchedBreakpoint);
    const root = document.documentElement;
    root.dataset.matchedBreakpoint = matchedBreakpoint;
    root.dataset.matchedDeviceType = matchedDeviceType;
    return { matchedBreakpoint, matchedDeviceType };
  };

  const mediaLists = queries.map(({ mediaQuery }) => window.matchMedia(mediaQuery));
  mediaLists.forEach((mq) => {
    const handler = () => apply();
    if (mq.addEventListener) {
      mq.addEventListener("change", handler);
    } else {
      mq.addListener(handler);
    }
  });

  return apply();
}

window.bladeBreakpoint = useBreakpoint({ breakpoints: theme.breakpoints });
