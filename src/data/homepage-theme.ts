export const HOMEPAGE_THEME_TOKENS = {
  landingSand: '#fbf1df',
  landingCream: '#f4e6d0',
  landingGreen: '#1f5f55',
  landingCopper: '#b8652b',
  landingCopperStrong: '#c0571f',
  landingGold: '#d49718',
  landingInk: '#1f1410',
  landingMuted: '#4a3c2e',
  landingSurface: '#ffffff',
  landingSurfaceHover: '#faefdb',
  landingStone: '#f5edda',
} as const;

export type HomepageThemeTokenKey = keyof typeof HOMEPAGE_THEME_TOKENS;
export type HomepageThemeTokenOverrides = Partial<Record<HomepageThemeTokenKey, string>>;

export function buildHomepageThemeRootCss(overrides: HomepageThemeTokenOverrides = {}): string {
  const mergedTokens = {
    ...HOMEPAGE_THEME_TOKENS,
    ...overrides,
  };

  const lines = Object.entries(mergedTokens).map(([key, value]) => {
    const cssName = key.replace(/[A-Z]/g, (match) => `-${match.toLowerCase()}`);
    return `  --${cssName}: ${value};`;
  });

  return [':root {', ...lines, '}'].join('\n');
}
