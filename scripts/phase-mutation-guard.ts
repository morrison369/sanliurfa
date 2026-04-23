import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

interface ReleaseModeConfig {
  phaseMutationsBlocked?: boolean;
}

const configPath = join(process.cwd(), 'config', 'release-mode.json');
const envBlock = toBoolean(process.env.PHASE_MUTATIONS_BLOCKED);
const envAllowOverride = toBoolean(process.env.ALLOW_PHASE_MUTATIONS);

let configBlock = false;
if (existsSync(configPath)) {
  try {
    const parsed = JSON.parse(readFileSync(configPath, 'utf8')) as ReleaseModeConfig;
    configBlock = parsed.phaseMutationsBlocked === true;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`[phase-mutation-guard] BLOCKED: invalid config file ${configPath}: ${message}`);
    process.exit(1);
  }
}

const blocked = (configBlock || envBlock) && !envAllowOverride;

if (blocked) {
  console.error('[phase-mutation-guard] BLOCKED: release mode is active, phase mutations are locked.');
  console.error(
    '[phase-mutation-guard] Set ALLOW_PHASE_MUTATIONS=true only for explicit emergency phase operations.',
  );
  process.exit(1);
}

console.log('[phase-mutation-guard] ok: phase mutation command allowed');

function toBoolean(value: string | undefined): boolean {
  const normalized = (value || '').trim().toLowerCase();
  return normalized === '1' || normalized === 'true' || normalized === 'yes';
}
