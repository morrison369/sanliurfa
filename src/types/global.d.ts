/**
 * Global Type Definitions
 * Extends Window interface for runtime properties
 */

export {};

declare global {
  interface Window {
    __USER__?: {
      id: string;
      type: string;
      subscription?: string;
    };
    gtag?: (...args: any[]) => void;
    trackEvent?: (eventName: string, parameters?: Record<string, any>) => void;
  }
}
