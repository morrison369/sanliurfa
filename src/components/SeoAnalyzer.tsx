/**
 * SEO Analyzer Component
 * Real-time SEO analysis and recommendations
 */

import React, { useState, useEffect } from 'react';

interface SeoAnalysisResult {
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

interface PageSeoData {
  title: string;
  description: string;
  keywords?: string[];
  ogImage?: string;
  canonical?: string;
  headings?: { h1: number; h2: number; h3: number };
  hasStructuredData?: boolean;
  internalLinks?: number;
  externalLinks?: number;
  imageCount?: number;
  wordCount?: number;
  loadTime?: number;
  mobileOptimized?: boolean;
}

export default function SeoAnalyzer() {
  const [analysis, setAnalysis] = useState<SeoAnalysisResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pageData, setPageData] = useState<PageSeoData>({
    title: '',
    description: '',
    keywords: [],
    ogImage: '',
    canonical: '',
    headings: { h1: 0, h2: 0, h3: 0 },
    hasStructuredData: false,
    internalLinks: 0,
    externalLinks: 0,
    imageCount: 0,
    wordCount: 0,
    mobileOptimized: true
  });

  // Analyze current page on mount
  useEffect(() => {
    analyzeCurrentPage();
  }, []);

  const analyzeCurrentPage = async () => {
    setLoading(true);
    setError(null);

    try {
      // Extract page data
      const title = document.title;
      const metaDesc = document.querySelector('meta[name="description"]')?.getAttribute('content') || '';
      const metaKeywords = document.querySelector('meta[name="keywords"]')?.getAttribute('content') || '';
      const ogImage = document.querySelector('meta[property="og:image"]')?.getAttribute('content') || '';
      const canonical = document.querySelector('link[rel="canonical"]')?.getAttribute('href') || '';

      const h1Count = document.querySelectorAll('h1').length;
      const h2Count = document.querySelectorAll('h2').length;
      const h3Count = document.querySelectorAll('h3').length;

      const scriptTags = document.querySelectorAll('script[type="application/ld+json"]');
      const hasStructuredData = scriptTags.length > 0;

      const internalLinks = Array.from(document.querySelectorAll('a[href^="/"]')).length;
      const externalLinks = Array.from(document.querySelectorAll('a[href^="http"]')).length;

      const imageCount = document.querySelectorAll('img').length;
      const bodyText = document.body.innerText;
      const wordCount = bodyText.split(/\s+/).length;

      const isResponsive = window.innerWidth > 0; // Simple check
      const loadTime = performance.timing.loadEventEnd - performance.timing.navigationStart;

      const data: PageSeoData = {
        title,
        description: metaDesc,
        keywords: metaKeywords ? metaKeywords.split(',').map(k => k.trim()) : [],
        ogImage,
        canonical,
        headings: { h1: h1Count, h2: h2Count, h3: h3Count },
        hasStructuredData,
        internalLinks,
        externalLinks,
        imageCount,
        wordCount,
        loadTime: loadTime > 0 ? loadTime : undefined,
        mobileOptimized: isResponsive
      };

      setPageData(data);

      // Call analysis API
      const response = await fetch('/api/seo/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });

      if (!response.ok) {
        throw new Error('Analysis failed');
      }

      const result = await response.json();
      setAnalysis(result.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Analysis failed');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6 bg-white rounded-lg shadow">
        <div className="animate-pulse space-y-3">
          <div className="h-4 bg-gray-200 rounded w-1/4"></div>
          <div className="h-10 bg-gray-200 rounded w-1/2"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 bg-red-50 border border-red-200 rounded-lg">
        <p className="text-red-800">Analiz hatası: {error}</p>
        <button
          onClick={analyzeCurrentPage}
          className="mt-3 px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700 transition"
        >
          Tekrar Dene
        </button>
      </div>
    );
  }

  if (!analysis) {
    return null;
  }

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'error':
        return '❌';
      case 'warning':
        return '⚠️';
      case 'info':
        return 'ℹ️';
      default:
        return '•';
    }
  };

  return (
    <div className="space-y-6">
      {/* Score Card */}
      <div className="bg-white p-6 rounded-lg shadow">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold">SEO Analizi</h2>
          <button
            onClick={analyzeCurrentPage}
            className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 transition text-sm"
          >
            Yenile
          </button>
        </div>

        <div className="flex items-center space-x-6">
          <div className="flex-shrink-0">
            <div className={`text-6xl font-bold ${getScoreColor(analysis.score)}`}>
              {analysis.score}
            </div>
            <p className="text-gray-600 text-sm">/ 100</p>
          </div>

          <div className="flex-1">
            <div className="w-full bg-gray-200 rounded-full h-4">
              <div
                className={`h-4 rounded-full transition-all ${
                  analysis.score >= 80
                    ? 'bg-green-500'
                    : analysis.score >= 60
                      ? 'bg-yellow-500'
                      : 'bg-red-500'
                }`}
                style={{ width: `${analysis.score}%` }}
              ></div>
            </div>
            <p className="text-gray-600 text-sm mt-2">
              {analysis.score >= 80
                ? '훌륭한 SEO 최적화'
                : analysis.score >= 60
                  ? 'SEO 개선 필요'
                  : '긴급 SEO 개선 필요'}
            </p>
          </div>
        </div>
      </div>

      {/* Strengths */}
      {analysis.strengths.length > 0 && (
        <div className="bg-green-50 p-6 rounded-lg border border-green-200">
          <h3 className="text-lg font-semibold text-green-900 mb-3">✓ 강점</h3>
          <ul className="space-y-2">
            {analysis.strengths.map((strength, idx) => (
              <li key={idx} className="text-green-800 flex items-start">
                <span className="mr-2">•</span>
                <span>{strength}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Issues */}
      {analysis.issues.length > 0 && (
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">문제점 및 권장사항</h3>
          <div className="space-y-3">
            {analysis.issues.map((issue, idx) => (
              <div
                key={idx}
                className={`p-4 rounded border-l-4 ${
                  issue.severity === 'error'
                    ? 'bg-red-50 border-red-400'
                    : issue.severity === 'warning'
                      ? 'bg-yellow-50 border-yellow-400'
                      : 'bg-blue-50 border-blue-400'
                }`}
              >
                <div className="flex items-start">
                  <span className="mr-3 text-lg">{getSeverityIcon(issue.severity)}</span>
                  <div className="flex-1">
                    <h4 className="font-semibold text-gray-900">{issue.message}</h4>
                    <p className="text-gray-600 text-sm mt-1">💡 {issue.recommendation}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Page Data Summary */}
      <div className="bg-gray-50 p-6 rounded-lg">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Sayfa Verisi</h3>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-gray-600">Title</p>
            <p className="font-mono text-gray-900 truncate">{pageData.title}</p>
          </div>
          <div>
            <p className="text-gray-600">Description ({pageData.description.length} chars)</p>
            <p className="font-mono text-gray-900 truncate">{pageData.description}</p>
          </div>
          <div>
            <p className="text-gray-600">H1 / H2 / H3</p>
            <p className="font-mono text-gray-900">
              {pageData.headings?.h1} / {pageData.headings?.h2} / {pageData.headings?.h3}
            </p>
          </div>
          <div>
            <p className="text-gray-600">Word Count</p>
            <p className="font-mono text-gray-900">{pageData.wordCount} words</p>
          </div>
          <div>
            <p className="text-gray-600">Images</p>
            <p className="font-mono text-gray-900">{pageData.imageCount}</p>
          </div>
          <div>
            <p className="text-gray-600">Internal Links</p>
            <p className="font-mono text-gray-900">{pageData.internalLinks}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
