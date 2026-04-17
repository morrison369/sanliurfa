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
    '# React Yuzey Siniflandirmasi',
    `- Uretilme zamani: ${new Date().toISOString()}`,
    `- TSX dosyalari: ${report.tsxCount}`,
    `- Server-only adaylari: ${report.serverOnlyCount}`,
    `- Olu TSX dosyalari: ${report.deadCount}`,
    `- Migration gereken TSX dosyalari: ${report.migrateCount}`,
    `- Korunacak blokorler: ${report.keepCount}`,
    `- Runtime root dosyalari: ${report.runtimeRootCount}`,
    '',
    '## Sonraki Adimlar',
  ];

  if (report.nextSteps.length === 0) {
    lines.push('- yok');
  } else {
    for (const step of report.nextSteps) lines.push(`- ${step}`);
  }

  const sections: Array<[string, string[]]> = [
    ['Runtime Root Dosyalari', report.runtimeRoots],
    ['Server-only Adaylari', report.serverOnly],
    ['Olu TSX Dosyalari', report.dead],
    ['Migration Gereken TSX Dosyalari', report.migrate],
    ['Korunacak Blokorler', report.keep],
  ];

  for (const [title, entries] of sections) {
    lines.push('', `## ${title}`);
    if (entries.length === 0) {
      lines.push('- yok');
    } else {
      for (const entry of entries) lines.push(`- ${entry}`);
    }
  }

  return `${lines.join('\n')}\n`;
}
