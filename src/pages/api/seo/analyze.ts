/**
 * SEO Analysis API
 * Analyze pages for SEO best practices and recommendations
 */

import type { APIRoute } from 'astro';
import { apiResponse, apiError, HttpStatus, ErrorCode, getRequestId } from '../../../lib/api';
import { recordRequest } from '../../../lib/metrics';
import { logger } from '../../../lib/logging';

export interface SeoAnalysis {
  url: string;
  score: number;
  issues: Array<{
    severity: 'error' | 'warning' | 'info';
    code: string;
    message: string;
    recommendation: string;
  }>;
  strengths: string[];
  recommendations: string[];
}

export const POST: APIRoute = async ({ request, locals }) => {
  const requestId = getRequestId({ request } as any);
  const startTime = Date.now();
  logger.setRequestId(requestId);

  try {
    const body = await request.json();
    const {
      title,
      description,
      keywords,
      ogImage,
      canonical,
      headings,
      hasStructuredData,
      internalLinks,
      externalLinks,
      imageCount,
      wordCount,
      loadTime,
      mobileOptimized
    } = body;

    const issues: SeoAnalysis['issues'] = [];
    const strengths: string[] = [];
    let score = 100;

    // Title analysis
    if (!title) {
      issues.push({
        severity: 'error',
        code: 'MISSING_TITLE',
        message: 'Missing page title',
        recommendation: 'Add a unique, descriptive title (30-60 characters)'
      });
      score -= 15;
    } else {
      if (title.length < 30) {
        issues.push({
          severity: 'warning',
          code: 'SHORT_TITLE',
          message: `Title too short (${title.length} chars)`,
          recommendation: 'Extend title to at least 30 characters for better CTR'
        });
        score -= 5;
      } else if (title.length > 60) {
        issues.push({
          severity: 'warning',
          code: 'LONG_TITLE',
          message: `Title too long (${title.length} chars)`,
          recommendation: 'Shorten to 60 characters to avoid truncation in SERPs'
        });
        score -= 5;
      } else {
        strengths.push('Title is well-optimized');
      }
    }

    // Meta description analysis
    if (!description) {
      issues.push({
        severity: 'error',
        code: 'MISSING_DESCRIPTION',
        message: 'Missing meta description',
        recommendation: 'Add a compelling meta description (120-160 characters)'
      });
      score -= 15;
    } else {
      if (description.length < 120) {
        issues.push({
          severity: 'warning',
          code: 'SHORT_DESCRIPTION',
          message: `Description too short (${description.length} chars)`,
          recommendation: 'Expand to at least 120 characters for full display'
        });
        score -= 5;
      } else if (description.length > 160) {
        issues.push({
          severity: 'warning',
          code: 'LONG_DESCRIPTION',
          message: `Description too long (${description.length} chars)`,
          recommendation: 'Shorten to 160 characters to avoid truncation'
        });
        score -= 5;
      } else {
        strengths.push('Meta description is well-optimized');
      }
    }

    // Keywords analysis
    if (!keywords || keywords.length === 0) {
      issues.push({
        severity: 'info',
        code: 'NO_KEYWORDS',
        message: 'No target keywords specified',
        recommendation: 'Define 3-5 primary keywords for better ranking'
      });
    } else if (keywords.length > 10) {
      issues.push({
        severity: 'warning',
        code: 'TOO_MANY_KEYWORDS',
        message: `Too many keywords (${keywords.length})`,
        recommendation: 'Focus on 5-10 primary keywords to avoid keyword dilution'
      });
      score -= 3;
    } else {
      strengths.push(`${keywords.length} target keywords identified`);
    }

    // Open Graph image
    if (!ogImage) {
      issues.push({
        severity: 'warning',
        code: 'MISSING_OG_IMAGE',
        message: 'Missing Open Graph image',
        recommendation: 'Add a 1200x630px image for better social sharing'
      });
      score -= 5;
    } else {
      strengths.push('Open Graph image included');
    }

    // Canonical URL
    if (!canonical) {
      issues.push({
        severity: 'info',
        code: 'NO_CANONICAL',
        message: 'Missing canonical URL',
        recommendation: 'Add canonical URL to prevent duplicate content issues'
      });
    } else {
      strengths.push('Canonical URL specified');
    }

    // Headings
    if (!headings || headings.h1 === 0) {
      issues.push({
        severity: 'error',
        code: 'NO_H1',
        message: 'Missing H1 heading',
        recommendation: 'Add exactly one H1 heading that matches your primary keyword'
      });
      score -= 10;
    } else if (headings.h1 > 1) {
      issues.push({
        severity: 'warning',
        code: 'MULTIPLE_H1',
        message: `Multiple H1 headings (${headings.h1})`,
        recommendation: 'Use only one H1 per page for better SEO'
      });
      score -= 5;
    } else {
      strengths.push('H1 heading properly used');
    }

    // Structured data
    if (!hasStructuredData) {
      issues.push({
        severity: 'info',
        code: 'NO_STRUCTURED_DATA',
        message: 'Missing structured data (JSON-LD)',
        recommendation: 'Add schema markup for rich snippets (Organization, Article, LocalBusiness)'
      });
    } else {
      strengths.push('Structured data (JSON-LD) included');
    }

    // Internal links
    if (!internalLinks || internalLinks < 3) {
      issues.push({
        severity: 'warning',
        code: 'LOW_INTERNAL_LINKS',
        message: `Low internal links (${internalLinks || 0})`,
        recommendation: 'Add at least 3-5 internal links to relevant pages'
      });
      score -= 5;
    } else {
      strengths.push(`Good internal linking (${internalLinks} links)`);
    }

    // Content quality
    if (!wordCount || wordCount < 300) {
      issues.push({
        severity: 'warning',
        code: 'THIN_CONTENT',
        message: `Low word count (${wordCount || 0})`,
        recommendation: 'Write at least 300 words of unique, valuable content'
      });
      score -= 8;
    } else if (wordCount > 300) {
      strengths.push(`Good content length (${wordCount} words)`);
    }

    // Images
    if (!imageCount || imageCount === 0) {
      issues.push({
        severity: 'info',
        code: 'NO_IMAGES',
        message: 'Page has no images',
        recommendation: 'Add relevant images with descriptive alt text'
      });
    } else {
      strengths.push(`${imageCount} images included`);
    }

    // Page load time
    if (loadTime && loadTime > 3000) {
      issues.push({
        severity: 'warning',
        code: 'SLOW_LOAD_TIME',
        message: `Slow load time (${loadTime}ms)`,
        recommendation: 'Optimize images, minimize CSS/JS, enable caching (target: <3s)'
      });
      score -= 5;
    } else if (loadTime && loadTime <= 2000) {
      strengths.push('Excellent page load time');
    }

    // Mobile optimization
    if (mobileOptimized === false) {
      issues.push({
        severity: 'error',
        code: 'NOT_MOBILE_FRIENDLY',
        message: 'Page is not mobile-optimized',
        recommendation: 'Ensure responsive design, readable font sizes, touchable buttons'
      });
      score -= 15;
    } else {
      strengths.push('Mobile-friendly design');
    }

    // Ensure score stays 0-100
    score = Math.max(0, Math.min(100, score));

    const recommendations: string[] = [];
    issues
      .filter(i => i.severity === 'error' || i.severity === 'warning')
      .forEach(issue => {
        recommendations.push(issue.recommendation);
      });

    const duration = Date.now() - startTime;
    recordRequest('POST', '/api/seo/analyze', HttpStatus.OK, duration);
    logger.info('SEO analysis completed', { score });

    return apiResponse(
      {
        success: true,
        data: {
          url: request.url,
          score,
          issues,
          strengths,
          recommendations
        } as SeoAnalysis
      },
      HttpStatus.OK,
      requestId
    );
  } catch (error) {
    const duration = Date.now() - startTime;
    recordRequest('POST', '/api/seo/analyze', HttpStatus.INTERNAL_SERVER_ERROR, duration);
    logger.error(
      'SEO analysis failed',
      error instanceof Error ? error : new Error(String(error))
    );
    return apiError(
      ErrorCode.INTERNAL_ERROR,
      'Analysis failed',
      HttpStatus.INTERNAL_SERVER_ERROR,
      undefined,
      requestId
    );
  }
};
