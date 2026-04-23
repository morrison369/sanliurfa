import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const blockers: string[] = [];

const homepageDataPath = join(root, 'src', 'lib', 'homepage-data.ts');
const homepagePath = join(root, 'src', 'pages', 'index.astro');
const featuredPlacesPath = join(root, 'src', 'components', 'FeaturedPlaces.astro');
const latestBlogPath = join(root, 'src', 'components', 'LatestBlog.astro');

if (!existsSync(homepageDataPath)) {
  blockers.push('missing src/lib/homepage-data.ts');
}

if (existsSync(homepagePath)) {
  const source = readFileSync(homepagePath, 'utf8');
  const requiredTokens = [
    'getHomepageData',
    '<FeaturedPlaces places={homePlaces} />',
    '<LatestBlog posts={homePosts.slice(0, 3)} />',
  ];
  for (const token of requiredTokens) {
    if (!source.includes(token)) {
      blockers.push(`src/pages/index.astro missing token: ${token}`);
    }
  }
} else {
  blockers.push('missing src/pages/index.astro');
}

if (existsSync(featuredPlacesPath)) {
  const source = readFileSync(featuredPlacesPath, 'utf8');
  if (!source.includes('incomingPlaces')) {
    blockers.push('src/components/FeaturedPlaces.astro must support injected places');
  }
}

if (existsSync(latestBlogPath)) {
  const source = readFileSync(latestBlogPath, 'utf8');
  if (!source.includes('incomingPosts')) {
    blockers.push('src/components/LatestBlog.astro must support injected posts');
  }
}

if (blockers.length > 0) {
  console.error('[homepage-data] BLOCKED');
  for (const blocker of blockers) {
    console.error(` - ${blocker}`);
  }
  process.exit(1);
}

console.log('[homepage-data] ok: homepage single-source data flow is locked');
