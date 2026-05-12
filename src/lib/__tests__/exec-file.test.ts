/**
 * Unit Tests — execFileNoThrow (HARD RULE #36)
 *
 * Background: bare `exec` from child_process spawns a shell — DB-sourced or
 * user-supplied path/arg with shell metachars (;, &&, |, $) becomes injection.
 * `execFile` (no shell) takes args as array — never interpolated. CLAUDE.md
 * HARD RULE #36 mandates execFileNoThrow over exec.
 *
 * This test verifies execFileNoThrow contract:
 * - Returns { stdout, stderr, code } instead of throwing
 * - Args passed as array (not shell-interpolated)
 * - Exit code captured (not just thrown)
 * - stdout/stderr captured even on non-zero exit
 */

import { describe, it, expect } from 'vitest';
import { execFileNoThrow } from '../exec-file';

describe('execFileNoThrow', () => {
  it('returns success result with stdout for valid command', async () => {
    // Use node itself — guaranteed available since Vitest runs on Node
    const result = await execFileNoThrow(process.execPath, ['-e', 'console.log("hello")']);
    expect(result.code).toBe(0);
    expect(result.stdout).toContain('hello');
    expect(result.stderr).toBe('');
  });

  it('captures stderr without throwing', async () => {
    const result = await execFileNoThrow(process.execPath, [
      '-e',
      'console.error("warning"); process.exit(0);',
    ]);
    expect(result.code).toBe(0);
    expect(result.stderr).toContain('warning');
  });

  it('returns non-zero exit code without throwing', async () => {
    const result = await execFileNoThrow(process.execPath, ['-e', 'process.exit(2)']);
    expect(result.code).toBe(2);
    // Should not throw
  });

  it('captures both stdout and stderr on non-zero exit', async () => {
    const result = await execFileNoThrow(process.execPath, [
      '-e',
      'console.log("out"); console.error("err"); process.exit(3);',
    ]);
    expect(result.code).toBe(3);
    expect(result.stdout).toContain('out');
    expect(result.stderr).toContain('err');
  });

  it('args treated as array (no shell interpolation — injection defense)', async () => {
    // Arg with shell metacharacter: `; echo SHELLRAN` would fire if shell were spawned
    const malicious = '; echo SHELLRAN';
    const result = await execFileNoThrow(process.execPath, [
      '-e',
      // Print arg with explicit prefix so we can distinguish from shell echo
      `console.log("ARG:" + process.argv[1])`,
      malicious,
    ]);
    // The arg is passed verbatim with our prefix — shell never interpreted ;
    expect(result.stdout).toContain(`ARG:${malicious}`);
    // Shell echo would have produced "SHELLRAN" on its own line without "ARG:" prefix
    expect(result.stdout).not.toMatch(/^SHELLRAN$/m);
  });

  it('handles non-existent command gracefully (no throw)', async () => {
    const result = await execFileNoThrow('this-command-does-not-exist-xyz123', []);
    expect(result.code).not.toBe(0);
    // Should not throw — returns error result
  });

  it('empty args array works', async () => {
    const result = await execFileNoThrow(process.execPath, ['--version']);
    expect(result.code).toBe(0);
    expect(result.stdout).toMatch(/^v\d+\.\d+\.\d+/);
  });

  it('multiple args passed correctly', async () => {
    const result = await execFileNoThrow(process.execPath, [
      '-e',
      'console.log(process.argv.slice(1).join("|"))',
      'arg1',
      'arg2',
      'arg3 with spaces',
    ]);
    expect(result.code).toBe(0);
    expect(result.stdout.trim()).toBe('arg1|arg2|arg3 with spaces');
  });
});
