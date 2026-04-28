#!/usr/bin/env node
import { existsSync, readFileSync, writeFileSync, statSync } from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const manifestPath = path.join(root, 'public', 'images', 'image-manifest.json');

const criticalRecords = [
  ['gobeklitepe', 'places', '/images/places/gobeklitepe.jpg', '/images/places/gobeklitepe-thumb.jpg', 'Göbeklitepe'],
  ['balikligol', 'places', '/images/places/balikligol.jpg', '/images/places/balikligol-thumb.jpg', 'Balıklıgöl'],
  ['halfeti', 'blog', '/images/blog/halfeti.jpg', '/images/blog/halfeti-thumb.jpg', 'Halfeti'],
  ['harran', 'blog', '/images/blog/harran.jpg', '/images/blog/harran-thumb.jpg', 'Harran'],
  ['urfa-kalesi', 'blog', '/images/blog/urfa-kalesi.jpg', '/images/blog/urfa-kalesi-thumb.jpg', 'Urfa Kalesi'],
  ['mozaik-muzesi', 'blog', '/images/blog/mozaik-muzesi.jpg', '/images/blog/mozaik-muzesi-thumb.jpg', 'Haleplibahçe Mozaik Müzesi'],
  ['tarihi-yerler-rehberi', 'blog', '/images/blog/tarihi-yerler-rehberi.jpg', '/images/blog/tarihi-yerler-rehberi-thumb.jpg', 'Şanlıurfa tarihi yerler rehberi'],
  ['sanliurfa-kultur-festivali', 'etkinlikler', '/images/etkinlikler/sanliurfa-kultur-festivali.jpg', '/images/etkinlikler/sanliurfa-kultur-festivali-thumb.jpg', 'Şanlıurfa Kültür Festivali'],
  ['harran-kumbet-evleri', 'tarihi-yerler', '/images/tarihi-yerler/harran-kumbet-evleri.jpg', '/images/tarihi-yerler/harran-kumbet-evleri-thumb.jpg', 'Harran Kümbet Evleri'],
  ['cigerci-aziz-usta', 'places', '/images/places/cigerci-aziz-usta/food.jpg', '/images/places/cigerci-aziz-usta/food-thumb.webp', 'Ciğerci Aziz Usta'],
];

function publicToFs(publicPath) {
  return path.join(root, 'public', publicPath.replace(/^\/+/, ''));
}

function makeRecord([slug, bucket, localPath, thumbnailPath, title]) {
  return {
    slug,
    bucket,
    provider: 'local',
    id: `critical-${bucket}-${slug}`,
    query: title,
    author: 'Sanliurfa.com',
    authorUrl: 'https://sanliurfa.com',
    sourceUrl: localPath,
    thumbUrl: thumbnailPath,
    localPath,
    thumbnailPath,
    license: 'Local editorial asset',
    attributionText: 'Sanliurfa.com',
    downloadedAt: new Date().toISOString(),
  };
}

const manifest = existsSync(manifestPath) ? JSON.parse(readFileSync(manifestPath, 'utf8')) : [];
const records = Array.isArray(manifest) ? manifest : [];
const byKey = new Map(records.map((record) => [`${record.bucket}:${record.slug}`, record]));
let added = 0;
let updated = 0;
const missing = [];

for (const item of criticalRecords) {
  const [, bucket, localPath, thumbnailPath] = item;
  const key = `${bucket}:${item[0]}`;
  if (!existsSync(publicToFs(localPath)) || !existsSync(publicToFs(thumbnailPath))) {
    missing.push(`${bucket}/${item[0]}`);
    continue;
  }
  const next = makeRecord(item);
  const current = byKey.get(key);
  if (!current) {
    records.push(next);
    byKey.set(key, next);
    added += 1;
    continue;
  }
  if (current.localPath !== localPath || current.thumbnailPath !== thumbnailPath || current.provider !== 'local') {
    Object.assign(current, next, { downloadedAt: current.downloadedAt || next.downloadedAt });
    updated += 1;
  }
}

records.sort((a, b) => `${a.bucket}:${a.slug}`.localeCompare(`${b.bucket}:${b.slug}`));
writeFileSync(manifestPath, `${JSON.stringify(records, null, 2)}\n`, 'utf8');

console.log(`Critical image manifest ensured: total=${records.length}, added=${added}, updated=${updated}`);
if (missing.length > 0) {
  console.error(`Critical image assets missing: ${missing.join(', ')}`);
  process.exit(1);
}

const totalBytes = records.reduce((sum, record) => {
  try {
    return sum + statSync(publicToFs(record.localPath)).size;
  } catch {
    return sum;
  }
}, 0);
console.log(`Critical image manifest bytes=${totalBytes}`);
