import { execFile } from 'child_process';
import { promisify } from 'util';

const execFileAsync = promisify(execFile);

/**
 * Runs a command via execFile (no shell spawned) and returns exit code + stdio
 * instead of throwing. Prevents shell injection: args passed as array, never
 * interpolated into a shell command string.
 */
export async function execFileNoThrow(
  command: string,
  args: string[]
): Promise<{ stdout: string; stderr: string; code: number }> {
  try {
    const { stdout, stderr } = await execFileAsync(command, args);
    return { stdout: stdout ?? '', stderr: stderr ?? '', code: 0 };
  } catch (err: any) {
    return {
      stdout: err.stdout ?? '',
      stderr: err.stderr ?? '',
      code: typeof err.code === 'number' ? err.code : 1,
    };
  }
}
