/**
 * KlearNow Theme — platform matching
 *
 * Mirrors knTheme.breakpoints: base → xs → s → m → l → xl.
 * Platform is mobile below `m` (768px), desktop from `m` up.
 * Type sizes in tokens.css already step down below 768px; this sets
 * data-matched-breakpoint and data-matched-device-type for JS layout.
 */
const theme = window.knTheme;
const { getMediaQuery } = window.knTokenUtils;

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
    if (root.dataset.matchedBreakpoint !== matchedBreakpoint) {
      root.dataset.matchedBreakpoint = matchedBreakpoint;
    }
    if (root.dataset.matchedDeviceType !== matchedDeviceType) {
      root.dataset.matchedDeviceType = matchedDeviceType;
    }
    if (window.KNTheme) {
      window.KNTheme.matchedBreakpoint = matchedBreakpoint;
      window.KNTheme.platform = matchedDeviceType;
    }
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

window.knBreakpoint = useBreakpoint({ breakpoints: theme.breakpoints });
