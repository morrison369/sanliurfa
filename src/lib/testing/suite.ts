/**
 * Automated Testing Suite
 * Comprehensive test orchestration
 */

import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export interface TestSuite {
  name: string;
  type: 'unit' | 'integration' | 'e2e' | 'performance' | 'security';
  command: string;
  timeout: number;
  retries: number;
  parallel: boolean;
  dependencies: string[];
}

export interface TestResult {
  suite: string;
  status: 'passed' | 'failed' | 'skipped' | 'error';
  duration: number;
  output: string;
  errors: string[];
  coverage?: number;
}

// Predefined test suites
export const testSuites: TestSuite[] = [
  {
    name: 'Unit Tests',
    type: 'unit',
    command: 'npm run test:unit',
    timeout: 300000,
    retries: 1,
    parallel: true,
    dependencies: [],
  },
  {
    name: 'Integration Tests',
    type: 'integration',
    command: 'npm run test:integration',
    timeout: 600000,
    retries: 2,
    parallel: false,
    dependencies: ['Unit Tests'],
  },
  {
    name: 'E2E Tests',
    type: 'e2e',
    command: 'npm run test:e2e',
    timeout: 900000,
    retries: 2,
    parallel: false,
    dependencies: ['Integration Tests'],
  },
  {
    name: 'Security Tests',
    type: 'security',
    command: 'npm audit && npm run test:security',
    timeout: 300000,
    retries: 0,
    parallel: true,
    dependencies: [],
  },
  {
    name: 'Performance Tests',
    type: 'performance',
    command: 'npm run test:performance',
    timeout: 600000,
    retries: 1,
    parallel: false,
    dependencies: ['Integration Tests'],
  },
];

/**
 * Run a single test suite
 */
export async function runSuite(suite: TestSuite): Promise<TestResult> {
  console.log(`\n[Testing] Running: ${suite.name}`);
  const startTime = Date.now();

  for (let attempt = 0; attempt <= suite.retries; attempt++) {
    try {
      const { stdout, stderr } = await execAsync(suite.command, {
        timeout: suite.timeout,
      });

      const duration = Date.now() - startTime;

      // Parse coverage if available
      const coverageMatch = stdout.match(/All files\s+\|\s+[\d.]+\s+\|\s+[\d.]+\s+\|\s+[\d.]+\s+\|\s+([\d.]+)/);
      const coverage = coverageMatch ? parseFloat(coverageMatch[1]) : undefined;

      return {
        suite: suite.name,
        status: 'passed',
        duration,
        output: stdout,
        errors: stderr ? [stderr] : [],
        coverage,
      };
    } catch (error: any) {
      if (attempt === suite.retries) {
        return {
          suite: suite.name,
          status: 'failed',
          duration: Date.now() - startTime,
          output: error.stdout || '',
          errors: [error.message, error.stderr].filter(Boolean),
        };
      }
      console.log(`[Testing] Retry ${attempt + 1}/${suite.retries} for ${suite.name}`);
    }
  }

  return {
    suite: suite.name,
    status: 'error',
    duration: Date.now() - startTime,
    output: '',
    errors: ['Unexpected error'],
  };
}

/**
 * Run all test suites
 */
export async function runAllSuites(
  options: { parallel?: boolean; filter?: string[] } = {}
): Promise<TestResult[]> {
  const { parallel = false, filter } = options;

  let suites = testSuites;
  if (filter) {
    suites = suites.filter(s => filter.includes(s.name));
  }

  const results: TestResult[] = [];
  const completed = new Set<string>();

  if (parallel) {
    // Run independent suites in parallel
    const independent = suites.filter(s => s.dependencies.length === 0);
    const dependent = suites.filter(s => s.dependencies.length > 0);

    // Run independent first
    const independentResults = await Promise.all(
      independent.map(suite => runSuite(suite))
    );
    results.push(...independentResults);
    independentResults.forEach(r => completed.add(r.suite));

    // Run dependent in order
    for (const suite of dependent) {
      // Check dependencies
      const depsMet = suite.dependencies.every(d => completed.has(d));
      if (!depsMet) {
        results.push({
          suite: suite.name,
          status: 'skipped',
          duration: 0,
          output: '',
          errors: ['Dependencies not met'],
        });
        continue;
      }

      const result = await runSuite(suite);
      results.push(result);
      completed.add(result.suite);
    }
  } else {
    // Sequential execution
    for (const suite of suites) {
      const result = await runSuite(suite);
      results.push(result);
    }
  }

  return results;
}

/**
 * Generate test report
 */
export function generateReport(results: TestResult[]): string {
  const total = results.length;
  const passed = results.filter(r => r.status === 'passed').length;
  const failed = results.filter(r => r.status === 'failed').length;
  const skipped = results.filter(r => r.status === 'skipped').length;
  const totalDuration = results.reduce((sum, r) => sum + r.duration, 0);

  let report = `
========================================
        TEST EXECUTION REPORT
========================================

Summary:
  Total Suites: ${total}
  Passed: ${passed} ✅
  Failed: ${failed} ❌
  Skipped: ${skipped} ⏭️
  Total Duration: ${(totalDuration / 1000).toFixed(2)}s

Results:
----------------------------------------
`;

  for (const result of results) {
    const icon = result.status === 'passed' ? '✅' : result.status === 'failed' ? '❌' : '⏭️';
    report += `${icon} ${result.suite}\n`;
    report += `   Status: ${result.status.toUpperCase()}\n`;
    report += `   Duration: ${(result.duration / 1000).toFixed(2)}s\n`;
    if (result.coverage !== undefined) {
      report += `   Coverage: ${result.coverage}%\n`;
    }
    if (result.errors.length > 0) {
      report += `   Errors: ${result.errors.join(', ')}\n`;
    }
    report += '\n';
  }

  report += `========================================\n`;

  return report;
}

/**
 * Pre-commit hook tests
 */
export async function runPreCommitTests(): Promise<boolean> {
  console.log('[Testing] Running pre-commit tests...');

  const suites = ['Unit Tests', 'Security Tests'];
  const results = await runAllSuites({ filter: suites });

  console.log(generateReport(results));

  return results.every(r => r.status === 'passed');
}

/**
 * CI/CD pipeline tests
 */
export async function runCIPipeline(): Promise<boolean> {
  console.log('[Testing] Running CI pipeline tests...');

  const results = await runAllSuites();

  console.log(generateReport(results));

  // Save results to file
  const fs = await import('fs');
  fs.writeFileSync(
    'test-results.json',
    JSON.stringify(results, null, 2)
  );

  return results.every(r => r.status === 'passed');
}

/**
 * Smoke tests for deployment
 */
export async function runSmokeTests(baseUrl: string): Promise<boolean> {
  console.log(`[Testing] Running smoke tests against ${baseUrl}`);

  const tests = [
    { name: 'Health Check', url: `${baseUrl}/api/health` },
    { name: 'Homepage', url: baseUrl },
    { name: 'API Status', url: `${baseUrl}/api/status` },
  ];

  const results = await Promise.all(
    tests.map(async test => {
      try {
        const response = await fetch(test.url);
        return { name: test.name, status: response.ok };
      } catch {
        return { name: test.name, status: false };
      }
    })
  );

  const allPassed = results.every(r => r.status);

  for (const result of results) {
    console.log(`${result.status ? '✅' : '❌'} ${result.name}`);
  }

  return allPassed;
}
