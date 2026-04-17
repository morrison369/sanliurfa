export interface ReactSurfaceClassificationReport {
  tsxCount: number;
  serverOnlyCount: number;
  deadCount: number;
  migrateCount: number;
  keepCount: number;
  runtimeRootCount: number;
  serverOnly: string[];
  dead: string[];
  migrate: string[];
  keep: string[];
  runtimeRoots: string[];
  nextSteps: string[];
}

export function classifyReactSurface(input: {
  runtimeRoots: string[];
  serverOnly: string[];
  dead: string[];
  migrate: string[];
  keep: string[];
}): ReactSurfaceClassificationReport {
  const runtimeRoots = [...input.runtimeRoots].sort();
  const serverOnly = [...input.serverOnly].sort();
  const dead = [...input.dead].sort();
  const migrate = [...input.migrate].sort();
  const keep = [...input.keep].sort();

  const nextSteps: string[] = [];
  if (dead.length > 0) nextSteps.push(`${dead.length} adet baglantisiz .tsx dosyasini sil veya arsivle`);
  if (migrate.length > 0) nextSteps.push(`${migrate.length} adet runtime-bagli .tsx dosya icin migration plani cikar`);
  if (keep.length > 0) nextSteps.push(`${keep.length} adet React blokor dosyayi plain TS veya Astro karsiligina tasit`);
  if (runtimeRoots.length > 0) nextSteps.push(`${runtimeRoots.length} adet runtime owner dosyada React entegrasyonunu kaldir`);

  return {
    tsxCount: serverOnly.length + dead.length + migrate.length,
    serverOnlyCount: serverOnly.length,
    deadCount: dead.length,
    migrateCount: migrate.length,
    keepCount: keep.length,
    runtimeRootCount: runtimeRoots.length,
    serverOnly,
    dead,
    migrate,
    keep,
    runtimeRoots,
    nextSteps,
  };
}

export function buildReactSurfaceClassificationMarkdown(
  report: ReactSurfaceClassificationReport,
): string {
  const lines = [
    '# React Surface Classification',
    `- Generated at: ${new Date().toISOString()}`,
    `- TSX files: ${report.tsxCount}`,
    `- Server-only candidates: ${report.serverOnlyCount}`,
    `- Dead TSX files: ${report.deadCount}`,
    `- Migrate-required TSX files: ${report.migrateCount}`,
    `- Keep blockers: ${report.keepCount}`,
    `- Runtime roots: ${report.runtimeRootCount}`,
    '',
    '## Next Steps',
  ];

  if (report.nextSteps.length === 0) {
    lines.push('- none');
  } else {
    for (const step of report.nextSteps) lines.push(`- ${step}`);
  }

  const sections: Array<[string, string[]]> = [
    ['Runtime Roots', report.runtimeRoots],
    ['Server-only Candidates', report.serverOnly],
    ['Dead TSX Files', report.dead],
    ['Migrate-required TSX Files', report.migrate],
    ['Keep Blockers', report.keep],
  ];

  for (const [title, entries] of sections) {
    lines.push('', `## ${title}`);
    if (entries.length === 0) {
      lines.push('- none');
    } else {
      for (const entry of entries) lines.push(`- ${entry}`);
    }
  }

  return `${lines.join('\n')}\n`;
}
