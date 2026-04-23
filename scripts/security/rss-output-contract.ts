const { GET } = await import("../../src/pages/rss.xml");

const blockers: string[] = [];

const originalWarn = console.warn;
console.warn = () => {};
const response = await GET({
  site: new URL("https://sanliurfa.com"),
} as any);
console.warn = originalWarn;

const xml = await response.text();

const requiredTokens = [
  "<rss",
  "<channel>",
  "<title>sanliurfa.com Blog</title>",
  "<language>tr-TR</language>",
  "https://sanliurfa.com/blog/",
  "Şanlıurfa",
];

const forbiddenTokens = [
  "@sanliurfa.com.tr",
  "@sanliurfa-com-tr",
  "@sanliurfa_comtr",
  "instagram.com/",
  "tiktok.com/",
  "youtube.com/",
  "twitter.com/",
  "x.com/",
];

if (response.status !== 200) {
  blockers.push(`rss.xml status must be 200, got ${response.status}`);
}

for (const token of requiredTokens) {
  if (!xml.includes(token)) {
    blockers.push(`rss.xml missing required output token: ${token}`);
  }
}

for (const token of forbiddenTokens) {
  if (xml.includes(token)) {
    blockers.push(`rss.xml contains forbidden token: ${token}`);
  }
}

if (blockers.length > 0) {
  console.error("[rss-output] BLOCKED");
  for (const blocker of blockers) {
    console.error(` - ${blocker}`);
  }
  process.exit(1);
}

console.log("[rss-output] ok: RSS XML output is canonical and Turkish");

export {};
