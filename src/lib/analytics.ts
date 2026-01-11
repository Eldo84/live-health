/**
 * Google Analytics 4 (GA4) Tracking Utility
 * 
 * Provides centralized analytics tracking functions for the OutbreakNow platform.
 * All tracking functions gracefully handle cases where GA4 is not loaded.
 */

// Extend Window interface for gtag
declare global {
  interface Window {
    dataLayer?: any[];
    gtag?: (...args: any[]) => void;
  }
}

/**
 * Check if Google Analytics is loaded and available
 */
function isGA4Enabled(): boolean {
  return typeof window !== 'undefined' && typeof window.gtag === 'function';
}

/**
 * Initialize Google Analytics
 * Called once on app load (GA4 is initialized via script tag in index.html)
 */
export function initGA4(): void {
  if (!isGA4Enabled()) {
    console.warn('Google Analytics not loaded');
    return;
  }
  // GA4 is already initialized via script tag in index.html
  // This function is kept for consistency and future extensibility
}

/**
 * Track a page view
 * @param path - The page path (e.g., '/dashboard', '/map')
 * @param title - Optional page title
 */
export function trackPageView(path: string, title?: string): void {
  if (!isGA4Enabled()) {
    return;
  }

  try {
    window.gtag!('config', 'G-0FSSCHGMEV', {
      page_path: path,
      page_title: title || document.title,
    });
  } catch (error) {
    console.warn('Failed to track page view:', error);
  }
}

/**
 * Track a custom event
 * @param eventName - The event name (e.g., 'user_signup', 'ad_click')
 * @param eventParams - Optional event parameters
 */
export function trackEvent(eventName: string, eventParams?: Record<string, any>): void {
  if (!isGA4Enabled()) {
    return;
  }

  try {
    window.gtag!('event', eventName, eventParams || {});
  } catch (error) {
    console.warn('Failed to track event:', error);
  }
}

/**
 * Common event tracking functions
 */

// Authentication events
export function trackSignup(method?: string): void {
  trackEvent('user_signup', { method });
}

export function trackLogin(method?: string): void {
  trackEvent('user_login', { method });
}

export function trackLogout(): void {
  trackEvent('user_logout');
}

// Navigation events
export function trackNavigationClick(destination: string): void {
  trackEvent('navigation_click', { destination });
}

export function trackExternalLinkClick(url: string): void {
  trackEvent('external_link_click', { url });
}

// Map events
export function trackMapView(): void {
  trackEvent('map_view');
}

export function trackMapMarkerClick(disease?: string, country?: string): void {
  trackEvent('map_marker_click', { disease, country });
}

export function trackMapFilterApplied(filters: Record<string, any>): void {
  trackEvent('map_filter_applied', filters);
}

export function trackMapCountrySelected(country: string): void {
  trackEvent('map_country_selected', { country });
}

// Dashboard events
export function trackDashboardView(): void {
  trackEvent('dashboard_view');
}

export function trackDashboardTabSwitch(tab: string): void {
  trackEvent('dashboard_tab_switch', { tab });
}

export function trackDashboardFilterApplied(filters: Record<string, any>): void {
  trackEvent('dashboard_filter_applied', filters);
}

export function trackDashboardExport(format: string): void {
  trackEvent('dashboard_export', { format });
}

// Advertising events
export function trackAdView(adId: string, location?: string): void {
  trackEvent('ad_view', { ad_id: adId, location });
}

export function trackAdClick(adId: string, location?: string): void {
  trackEvent('ad_click', { ad_id: adId, location });
}

export function trackAdPaymentInitiated(planType: string, amount?: number): void {
  trackEvent('ad_payment_initiated', { plan_type: planType, amount });
}

export function trackAdPaymentCompleted(planType: string, amount: number): void {
  trackEvent('ad_payment_completed', { plan_type: planType, amount });
}

export function trackAdPaymentCancelled(planType: string): void {
  trackEvent('ad_payment_cancelled', { plan_type: planType });
}

// Newsletter/Forms
export function trackNewsletterSignup(): void {
  trackEvent('newsletter_signup');
}

export function trackContactFormSubmit(formType: string): void {
  trackEvent('contact_form_submit', { form_type: formType });
}

// Language/Settings
export function trackLanguageChange(language: string): void {
  trackEvent('language_change', { language });
}

