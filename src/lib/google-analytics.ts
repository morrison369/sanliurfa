/**
 * Google Analytics 4 integration with client-side event tracking
 */

export interface AnalyticsEvent {
  name: string;
  category?: string;
  action?: string;
  label?: string;
  value?: number;
  properties?: Record<string, any>;
}

/**
 * Google Analytics provider (GA4)
 */
export class GoogleAnalytics {
  private measurementId: string;
  private isEnabled: boolean;
  private sessionId: string;

  constructor(measurementId?: string) {
    this.measurementId = measurementId || '';
    this.isEnabled = !window.location.hostname.includes('localhost') && !!this.measurementId;
    this.sessionId = this.generateSessionId();

    if (this.isEnabled) {
      this.loadScript();
    }
  }

  /**
   * Load Google Analytics script
   */
  private loadScript(): void {
    const script = document.createElement('script');
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtag/js?id=${this.measurementId}`;
    document.head.appendChild(script);

    // Initialize gtag
    window.dataLayer = window.dataLayer || [];
    function gtag(...args: any[]) {
      window.dataLayer.push(arguments);
    }
    window.gtag = gtag;

    gtag('js', new Date());
    gtag('config', this.measurementId, {
      anonymize_ip: true,
      allow_google_signals: false,
      allow_ad_personalization_signals: false,
      send_page_view: false
    });
  }

  /**
   * Track page view
   */
  pageView(path: string, title: string): void {
    if (!this.isEnabled) {
      console.log(`[GA] Page View: ${title} - ${path}`);
      return;
    }

    this.event({
      name: 'page_view',
      properties: {
        page_title: title,
        page_path: path,
        session_id: this.sessionId
      }
    });
  }

  /**
   * Track custom event
   */
  event(event: AnalyticsEvent): void {
    if (!this.isEnabled) {
      console.log(`[GA] Event: ${event.name}`, event);
      return;
    }

    if (window.gtag) {
      window.gtag('event', event.name, {
        event_category: event.category,
        event_label: event.label,
        value: event.value,
        ...event.properties
      });
    }
  }

  /**
   * Track place view
   */
  trackPlaceView(placeId: string, placeName: string, category?: string): void {
    this.event({
      name: 'view_item',
      category: 'place',
      label: placeName,
      value: parseInt(placeId),
      properties: {
        item_id: placeId,
        item_name: placeName,
        item_category: category
      }
    });
  }

  /**
   * Track search
   */
  trackSearch(query: string, resultsCount: number): void {
    this.event({
      name: 'search',
      label: query,
      value: resultsCount,
      properties: {
        search_term: query,
        search_results: resultsCount
      }
    });
  }

  /**
   * Track review submission
   */
  trackReviewSubmit(placeId: string, rating: number): void {
    this.event({
      name: 'post_score',
      category: 'review',
      label: `place_${placeId}`,
      value: rating
    });
  }

  /**
   * Track favorite toggle
   */
  trackFavorite(placeId: string, action: 'add' | 'remove'): void {
    this.event({
      name: action === 'add' ? 'add_to_favorites' : 'remove_from_favorites',
      category: 'engagement',
      label: placeId
    });
  }

  /**
   * Track signup
   */
  trackSignup(method?: string): void {
    this.event({
      name: 'sign_up',
      category: 'user',
      label: method || 'email'
    });
  }

  /**
   * Track login
   */
  trackLogin(method?: string): void {
    this.event({
      name: 'login',
      category: 'user',
      label: method || 'email'
    });
  }

  /**
   * Track error
   */
  trackError(errorName: string, errorMessage: string): void {
    this.event({
      name: 'exception',
      category: 'error',
      label: errorName,
      properties: {
        description: errorMessage
      }
    });
  }

  /**
   * Set user ID
   */
  setUserId(userId: string): void {
    if (!this.isEnabled) return;

    if (window.gtag) {
      window.gtag('config', this.measurementId, {
        'user_id': userId
      });
    }
  }

  /**
   * Set user properties
   */
  setUserProperties(properties: Record<string, any>): void {
    if (!this.isEnabled) return;

    if (window.gtag) {
      window.gtag('set', {
        'user_properties': properties
      });
    }
  }

  /**
   * Track Web Vitals (Core Web Vitals)
   */
  trackWebVitals(): void {
    if (!this.isEnabled) return;

    // Largest Contentful Paint (LCP)
    this.trackPerformanceMetric('LCP', 'largest-contentful-paint');

    // Cumulative Layout Shift (CLS)
    this.trackPerformanceMetric('CLS', 'layout-shift');

    // Interaction to Next Paint (INP)
    this.trackPerformanceMetric('INP', 'first-input');
  }

  /**
   * Track performance metric
   */
  private trackPerformanceMetric(metricName: string, entryType: string): void {
    if (!('PerformanceObserver' in window)) return;

    try {
      const observer = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        if (entries.length === 0) return;

        const lastEntry = entries[entries.length - 1] as any;
        const value = lastEntry.value || lastEntry.duration || 0;

        this.event({
          name: 'web_vitals',
          category: 'performance',
          label: metricName,
          value: Math.round(value)
        });
      });

      observer.observe({ entryTypes: [entryType], buffered: true });
    } catch (e) {
      // Browser doesn't support this metric
    }
  }

  /**
   * Generate session ID
   */
  private generateSessionId(): string {
    const stored = sessionStorage.getItem('ga_session_id');
    if (stored) return stored;

    const sessionId = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    sessionStorage.setItem('ga_session_id', sessionId);
    return sessionId;
  }

  /**
   * Get session ID
   */
  getSessionId(): string {
    return this.sessionId;
  }

  /**
   * Check if analytics is enabled
   */
  isInitialized(): boolean {
    return this.isEnabled;
  }
}

/**
 * Global GA instance
 */
let gaInstance: GoogleAnalytics | null = null;

/**
 * Get or create GA instance
 */
export function getGoogleAnalytics(): GoogleAnalytics {
  if (!gaInstance) {
    const measurementId = import.meta.env.PUBLIC_GA_MEASUREMENT_ID || '';
    gaInstance = new GoogleAnalytics(measurementId);
  }
  return gaInstance;
}

/**
 * Initialize Google Analytics with page tracking
 */
export function initializeGoogleAnalytics(): void {
  const ga = getGoogleAnalytics();

  if (!ga.isInitialized()) {
    console.log('[GA] Analytics not initialized (localhost or missing key)');
    return;
  }

  // Track initial page view
  ga.pageView(window.location.pathname, document.title);

  // Track Core Web Vitals
  ga.trackWebVitals();

  // Track subsequent navigation
  window.addEventListener('popstate', () => {
    ga.pageView(window.location.pathname, document.title);
  });
}

/**
 * Declare global gtag function
 */
declare global {
  interface Window {
    gtag?: (command: string, ...args: any[]) => void;
    dataLayer?: any[];
  }
}
