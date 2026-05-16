import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { spawnSync } from 'node:child_process';

export function findGoogleMapsScraperBinary({
  projectRoot = process.cwd(),
  workspaceRoot = resolve(projectRoot, '..'),
} = {}) {
  if (process.env.GMAPS_SCRAPER_BIN && existsSync(process.env.GMAPS_SCRAPER_BIN)) {
    return process.env.GMAPS_SCRAPER_BIN;
  }

  const home = process.env.HOME || process.env.USERPROFILE || '';
  const candidates = [
    resolve(projectRoot, 'tools', 'google-maps-scraper'),
    resolve(projectRoot, 'tools', 'google-maps-scraper.exe'),
    resolve(workspaceRoot, 'tools', 'google-maps-scraper.exe'),
    resolve(workspaceRoot, 'tools', 'google-maps-scraper'),
    resolve(projectRoot, 'scripts', 'google-maps-scraper.exe'),
    resolve(projectRoot, 'scripts', 'google-maps-scraper'),
    home ? resolve(home, 'tools', 'google-maps-scraper') : '',
    home ? resolve(home, 'bin', 'google-maps-scraper') : '',
    '/home/sanliur/tools/google-maps-scraper',
    '/home/sanliur/bin/google-maps-scraper',
  ];

  return candidates.find(existsSync) || null;
}

export function buildGoogleMapsScraperArgs({
  input,
  results,
  json = true,
  lang = 'tr',
  depth = 1,
  concurrency = 1,
  exitOnInactivity = '5m',
  email = false,
  extraReviews = false,
  fastMode = false,
  geo = '',
  radius = '',
  proxies = '',
} = {}) {
  if (!input) throw new Error('google-maps-scraper input dosyası zorunlu');
  if (!results) throw new Error('google-maps-scraper results dosyası zorunlu');

  const args = [
    '-input', input,
    '-results', results,
    '-lang', lang,
    '-depth', String(depth),
    '-c', String(concurrency),
    '-exit-on-inactivity', exitOnInactivity,
  ];

  if (json) args.push('-json');
  if (email) args.push('-email');
  if (extraReviews) args.push('-extra-reviews');
  if (fastMode) args.push('-fast-mode');
  if (geo) args.push('-geo', geo);
  if (radius) args.push('-radius', String(radius));
  if (proxies) args.push('-proxies', proxies);

  return args;
}

export function runGoogleMapsScraper(options = {}) {
  const binary = options.binary || findGoogleMapsScraperBinary(options);
  if (!binary) {
    throw new Error(
      'google-maps-scraper binary bulunamadı. Beklenen konum: D:\\sanliurfa.com\\tools\\google-maps-scraper.exe',
    );
  }

  const args = buildGoogleMapsScraperArgs(options);
  const result = spawnSync(binary, args, {
    stdio: options.stdio || 'inherit',
    windowsHide: options.windowsHide ?? false,
  });

  if (result.status !== 0) {
    throw new Error(result.error?.message || `google-maps-scraper exit ${result.status}`);
  }

  return { binary, args, results: options.results };
}
