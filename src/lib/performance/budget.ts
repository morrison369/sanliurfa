import { logger } from '../logging';
/**
 * Performance Budget
 * Enforce size limits on resources
 */

export interface BudgetConfig {
  javascript: number;      // KB
  css: number;             // KB
  images: number;          // KB
  fonts: number;           // KB
  total: number;           // KB
  html: number;            // KB
  api: number;             // ms response time
  thirdParty: number;      // KB
}

export interface BudgetViolation {
  type: keyof BudgetConfig;
  actual: number;
  budget: number;
  overage: number;
  files?: string[];
}

export interface BudgetReport {
  timestamp: number;
  url: string;
  violations: BudgetViolation[];
  withinBudget: boolean;
  scores: {
    javascript: number;
    css: number;
    images: number;
    fonts: number;
    total: number;
    html: number;
  };
}

// Default budgets (conservative for mobile)
const defaultBudget: BudgetConfig = {
  javascript: 300,     // 300KB
  css: 50,             // 50KB
  images: 500,         // 500KB
  fonts: 100,          // 100KB
  total: 1000,         // 1MB total
  html: 50,            // 50KB
  api: 500,            // 500ms
  thirdParty: 100,     // 100KB
};

/**
 * Check if a resource meets budget
 */
export function checkBudget(
  type: keyof BudgetConfig,
  actual: number,
  budget: BudgetConfig = defaultBudget
): { withinBudget: boolean; overage: number } {
  const limit = budget[type];
  const overage = actual - limit;
  return {
    withinBudget: overage <= 0,
    overage: Math.max(0, overage),
  };
}

/**
 * Analyze page resources against budget
 */
export async function analyzePageBudget(
  budget: BudgetConfig = defaultBudget
): Promise<BudgetReport> {
  if (typeof window === 'undefined' || !performance.getEntriesByType) {
    return {
      timestamp: Date.now(),
      url: '',
      violations: [],
      withinBudget: true,
      scores: { javascript: 0, css: 0, images: 0, fonts: 0, total: 0, html: 0 },
    };
  }

  const resources = performance.getEntriesByType('resource');
  const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;

  const totals: Record<string, { size: number; files: string[] }> = {
    javascript: { size: 0, files: [] },
    css: { size: 0, files: [] },
    images: { size: 0, files: [] },
    fonts: { size: 0, files: [] },
    html: { size: 0, files: [] },
    thirdParty: { size: 0, files: [] },
  };

  const currentOrigin = window.location.origin;

  resources.forEach((resource: PerformanceResourceTiming) => {
    const url = resource.name;
    const size = resource.transferSize / 1024; // Convert to KB
    const isThirdParty = !url.startsWith(currentOrigin);

    if (url.endsWith('.js') || url.includes('.js?')) {
      totals.javascript.size += size;
      totals.javascript.files.push(url);
    } else if (url.endsWith('.css') || url.includes('.css?')) {
      totals.css.size += size;
      totals.css.files.push(url);
    } else if (/\.(jpg|jpeg|png|gif|webp|svg|avif)(\?|$)/i.test(url)) {
      totals.images.size += size;
      totals.images.files.push(url);
    } else if (/\.(woff2?|ttf|otf|eot)(\?|$)/i.test(url)) {
      totals.fonts.size += size;
      totals.fonts.files.push(url);
    } else if (resource.entryType === 'navigation') {
      totals.html.size += size;
      totals.html.files.push(url);
    }

    if (isThirdParty) {
      totals.thirdParty.size += size;
      totals.thirdParty.files.push(url);
    }
  });

  const totalSize = Object.values(totals).reduce((sum, item) => sum + item.size, 0);

  // Check for violations
  const violations: BudgetViolation[] = [];

  const checkType = (type: keyof BudgetConfig, actual: number, files?: string[]) => {
    const { withinBudget, overage } = checkBudget(type, actual, budget);
    if (!withinBudget) {
      violations.push({
        type,
        actual,
        budget: budget[type],
        overage,
        files,
      });
    }
  };

  checkType('javascript', totals.javascript.size, totals.javascript.files);
  checkType('css', totals.css.size, totals.css.files);
  checkType('images', totals.images.size, totals.images.files);
  checkType('fonts', totals.fonts.size, totals.fonts.files);
  checkType('html', totals.html.size, totals.html.files);
  checkType('thirdParty', totals.thirdParty.size, totals.thirdParty.files);
  checkType('total', totalSize);

  // Check API response times
  const apiCalls = resources.filter(r => r.name.includes('/api/'));
  apiCalls.forEach((api: PerformanceResourceTiming) => {
    const responseTime = api.responseEnd - api.startTime;
    if (responseTime > budget.api) {
      violations.push({
        type: 'api',
        actual: responseTime,
        budget: budget.api,
        overage: responseTime - budget.api,
        files: [api.name],
      });
    }
  });

  return {
    timestamp: Date.now(),
    url: window.location.href,
    violations,
    withinBudget: violations.length === 0,
    scores: {
      javascript: Math.round(totals.javascript.size),
      css: Math.round(totals.css.size),
      images: Math.round(totals.images.size),
      fonts: Math.round(totals.fonts.size),
      total: Math.round(totalSize),
      html: Math.round(totals.html.size),
    },
  };
}

/**
 * Monitor budget violations and warn/console.log
 */
export function monitorBudget(
  budget: BudgetConfig = defaultBudget,
  onViolation?: (report: BudgetReport) => void
) {
  if (typeof window === 'undefined') return () => {};

  let reported = false;

  const check = () => {
    if (reported) return;

    // Wait for resources to load
    if (document.readyState !== 'complete') return;

    analyzePageBudget(budget).then(report => {
      if (!report.withinBudget) {
        reported = true;

        console.group('🚨 Performance Budget Violations');
        report.violations.forEach(v => {
          logger.warn(
            `${v.type.toUpperCase()}: ${v.actual.toFixed(1)}KB (budget: ${v.budget}KB, +${v.overage.toFixed(1)}KB)`
          );
          if (v.files && v.files.length > 0) {
            logger.info('Files:', v.files.slice(0, 5));
          }
        });
        console.groupEnd();

        onViolation?.(report);
      }
    });
  };

  window.addEventListener('load', check);

  return () => {
    window.removeEventListener('load', check);
  };
}

/**
 * Get budget recommendations
 */
export function getBudgetRecommendations(report: BudgetReport): string[] {
  const recommendations: string[] = [];

  report.violations.forEach(v => {
    switch (v.type) {
      case 'javascript':
        recommendations.push('💡 Use code splitting and lazy loading for JavaScript');
        recommendations.push('💡 Enable tree shaking and remove unused code');
        recommendations.push('💡 Compress JavaScript with Brotli or Gzip');
        break;
      case 'css':
        recommendations.push('💡 Use CSS purging to remove unused styles');
        recommendations.push('💡 Inline critical CSS');
        recommendations.push('💡 Minify and compress CSS');
        break;
      case 'images':
        recommendations.push('💡 Use modern image formats (WebP, AVIF)');
        recommendations.push('💡 Implement responsive images with srcset');
        recommendations.push('💡 Lazy load images below the fold');
        break;
      case 'fonts':
        recommendations.push('💡 Use font-display: swap');
        recommendations.push('💡 Subset fonts to only needed characters');
        recommendations.push('💡 Preload critical fonts');
        break;
      case 'api':
        recommendations.push('💡 Optimize API response times');
        recommendations.push('💡 Implement caching for API responses');
        recommendations.push('💡 Use pagination for large datasets');
        break;
      case 'thirdParty':
        recommendations.push('💡 Audit and remove unused third-party scripts');
        recommendations.push('💡 Lazy load non-critical third-party resources');
        break;
    }
  });

  return [...new Set(recommendations)];
}

/**
 * Create budget report HTML
 */
export function createBudgetReportHTML(report: BudgetReport): string {
  const getStatus = (withinBudget: boolean) => 
    withinBudget ? '✅' : '❌';

  const formatSize = (kb: number) => `${kb.toFixed(1)} KB`;

  let html = `
    <div class="budget-report" style="
      font-family: system-ui, sans-serif;
      padding: 16px;
      border: 1px solid #ddd;
      border-radius: 8px;
      max-width: 600px;
    ">
      <h2 style="margin: 0 0 16px;">Performance Budget Report</h2>
      <p style="color: #666; font-size: 14px;">${new Date(report.timestamp).toLocaleString()}</p>
      
      <div style="margin-bottom: 16px;">
        <strong>Overall Status:</strong> 
        ${getStatus(report.withinBudget)} 
        ${report.withinBudget ? 'Within Budget' : 'Budget Violations Detected'}
      </div>

      <table style="width: 100%; border-collapse: collapse;">
        <thead>
          <tr style="border-bottom: 2px solid #ddd;">
            <th style="text-align: left; padding: 8px;">Type</th>
            <th style="text-align: right; padding: 8px;">Size</th>
            <th style="text-align: right; padding: 8px;">Budget</th>
            <th style="text-align: right; padding: 8px;">Status</th>
          </tr>
        </thead>
        <tbody>
          <tr style="border-bottom: 1px solid #eee;">
            <td style="padding: 8px;">JavaScript</td>
            <td style="text-align: right; padding: 8px;">${formatSize(report.scores.javascript)}</td>
            <td style="text-align: right; padding: 8px;">${formatSize(defaultBudget.javascript)}</td>
            <td style="text-align: right; padding: 8px;">${getStatus(report.scores.javascript <= defaultBudget.javascript)}</td>
          </tr>
          <tr style="border-bottom: 1px solid #eee;">
            <td style="padding: 8px;">CSS</td>
            <td style="text-align: right; padding: 8px;">${formatSize(report.scores.css)}</td>
            <td style="text-align: right; padding: 8px;">${formatSize(defaultBudget.css)}</td>
            <td style="text-align: right; padding: 8px;">${getStatus(report.scores.css <= defaultBudget.css)}</td>
          </tr>
          <tr style="border-bottom: 1px solid #eee;">
            <td style="padding: 8px;">Images</td>
            <td style="text-align: right; padding: 8px;">${formatSize(report.scores.images)}</td>
            <td style="text-align: right; padding: 8px;">${formatSize(defaultBudget.images)}</td>
            <td style="text-align: right; padding: 8px;">${getStatus(report.scores.images <= defaultBudget.images)}</td>
          </tr>
          <tr style="border-bottom: 1px solid #eee;">
            <td style="padding: 8px;">Fonts</td>
            <td style="text-align: right; padding: 8px;">${formatSize(report.scores.fonts)}</td>
            <td style="text-align: right; padding: 8px;">${formatSize(defaultBudget.fonts)}</td>
            <td style="text-align: right; padding: 8px;">${getStatus(report.scores.fonts <= defaultBudget.fonts)}</td>
          </tr>
          <tr style="border-bottom: 1px solid #eee;">
            <td style="padding: 8px;">HTML</td>
            <td style="text-align: right; padding: 8px;">${formatSize(report.scores.html)}</td>
            <td style="text-align: right; padding: 8px;">${formatSize(defaultBudget.html)}</td>
            <td style="text-align: right; padding: 8px;">${getStatus(report.scores.html <= defaultBudget.html)}</td>
          </tr>
          <tr style="border-bottom: 2px solid #ddd; font-weight: bold;">
            <td style="padding: 8px;">Total</td>
            <td style="text-align: right; padding: 8px;">${formatSize(report.scores.total)}</td>
            <td style="text-align: right; padding: 8px;">${formatSize(defaultBudget.total)}</td>
            <td style="text-align: right; padding: 8px;">${getStatus(report.withinBudget)}</td>
          </tr>
        </tbody>
      </table>
  `;

  if (report.violations.length > 0) {
    const recommendations = getBudgetRecommendations(report);
    html += `
      <div style="margin-top: 16px;">
        <h3 style="margin-bottom: 8px;">💡 Recommendations</h3>
        <ul style="margin: 0; padding-left: 20px;">
          ${recommendations.map(r => `<li style="margin-bottom: 4px; color: #444;">${r}</li>`).join('')}
        </ul>
      </div>
    `;
  }

  html += '</div>';
  return html;
}

// Export default budget for reference
export { defaultBudget };
