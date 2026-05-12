/**
 * Recipe Markdown export — AI agents için ham içerik.
 * /yemek-tarifleri/{slug}.md → text/markdown
 */
import type { APIRoute } from 'astro';
import { queryOne } from '../../lib/postgres';
import { getPublicAppUrl } from '../../lib/public-app-url';

export const GET: APIRoute = async ({ params }) => {
  const slug = params.slug;
  if (!slug) return new Response('Not found', { status: 404 });

  const recipe = await queryOne<{
    name: string;
    description: string;
    ingredients: string[] | string | null;
    instructions: string[] | string | null;
    prep_time: number | null;
    cook_time: number | null;
    servings: number | null;
    difficulty: string | null;
    rating: number | null;
    updated_at: string;
  }>(
    `SELECT name, description,
            ingredients, instructions,
            prep_time, cook_time, servings, difficulty, rating,
            updated_at::text
     FROM recipes
     WHERE slug = $1 AND status = 'published'`,
    [slug],
  ).catch(() => null);

  if (!recipe) return new Response('Not found', { status: 404 });

  const baseUrl = getPublicAppUrl();
  const lines: string[] = [];

  lines.push('---');
  lines.push(`title: ${JSON.stringify(recipe.name)}`);
  if (recipe.description) lines.push(`description: ${JSON.stringify(recipe.description.slice(0, 240))}`);
  lines.push('type: Recipe');
  if (recipe.prep_time) lines.push(`prep_time: ${recipe.prep_time} dk`);
  if (recipe.cook_time) lines.push(`cook_time: ${recipe.cook_time} dk`);
  if (recipe.servings) lines.push(`servings: ${recipe.servings}`);
  if (recipe.difficulty) lines.push(`difficulty: ${recipe.difficulty}`);
  if (recipe.rating) lines.push(`rating: ${recipe.rating}`);
  lines.push(`canonical: ${baseUrl}/yemek-tarifleri/${slug}`);
  lines.push('---');
  lines.push('');
  lines.push(`# ${recipe.name}`);
  lines.push('');
  if (recipe.description) {
    lines.push(recipe.description);
    lines.push('');
  }

  // Ingredients (array veya JSON string)
  let ingredients: string[] = [];
  if (Array.isArray(recipe.ingredients)) {
    ingredients = recipe.ingredients;
  } else if (typeof recipe.ingredients === 'string') {
    try { ingredients = JSON.parse(recipe.ingredients); } catch { ingredients = recipe.ingredients.split('\n').filter(Boolean); }
  }
  if (ingredients.length > 0) {
    lines.push('## Malzemeler');
    lines.push('');
    for (const ing of ingredients) lines.push(`- ${ing}`);
    lines.push('');
  }

  // Instructions
  let instructions: string[] = [];
  if (Array.isArray(recipe.instructions)) {
    instructions = recipe.instructions;
  } else if (typeof recipe.instructions === 'string') {
    try { instructions = JSON.parse(recipe.instructions); } catch { instructions = recipe.instructions.split('\n').filter(Boolean); }
  }
  if (instructions.length > 0) {
    lines.push('## Hazırlanışı');
    lines.push('');
    instructions.forEach((step, i) => lines.push(`${i + 1}. ${step}`));
    lines.push('');
  }

  lines.push('---');
  lines.push('');
  lines.push(`Bu tarif [Sanliurfa.com](${baseUrl}/yemek-tarifleri/${slug}) — Şanlıurfa Yemek Rehberi.`);

  return new Response(lines.join('\n'), {
    status: 200,
    headers: {
      'Content-Type': 'text/markdown; charset=utf-8',
      'Cache-Control': 'public, max-age=3600, s-maxage=86400',
      'X-Robots-Tag': 'index, follow',
    },
  });
};
