/**
 * Performance Monitoring & Metrics Collection
 * Tracks Core Web Vitals and performance metrics
 */

class PerformanceMonitor {
  constructor() {
    this.metrics = {
      fcp: null,  // First Contentful Paint
      lcp: null,  // Largest Contentful Paint
      fid: null,  // First Input Delay
      cls: null,  // Cumulative Layout Shift
      ttfb: null, // Time to First Byte
    };

    this.init();
  }

  init() {
    // Monitor First Contentful Paint
    this.monitorFCP();

    // Monitor Largest Contentful Paint
    this.monitorLCP();

    // Monitor First Input Delay
    this.monitorFID();

    // Monitor Cumulative Layout Shift
    this.monitorCLS();

    // Monitor Time to First Byte (from navigation timing)
    this.monitorTTFB();

    // Log metrics when page unloads
    window.addEventListener('beforeunload', () => this.reportMetrics());
  }

  monitorFCP() {
    if ('PerformanceObserver' in window) {
      try {
        const observer = new PerformanceObserver((entryList) => {
          for (const entry of entryList.getEntries()) {
            if (entry.name === 'first-contentful-paint') {
              this.metrics.fcp = entry.startTime;
              console.log(`FCP: ${entry.startTime.toFixed(2)}ms`);
            }
          }
        });
        observer.observe({ entryTypes: ['paint'] });
      } catch (e) {
        console.warn('FCP monitoring not available:', e);
      }
    }
  }

  monitorLCP() {
    if ('PerformanceObserver' in window) {
      try {
        const observer = new PerformanceObserver((entryList) => {
          const entries = entryList.getEntries();
          const lastEntry = entries[entries.length - 1];
          this.metrics.lcp = lastEntry.renderTime || lastEntry.loadTime;
          console.log(`LCP: ${this.metrics.lcp.toFixed(2)}ms`);
        });
        observer.observe({ entryTypes: ['largest-contentful-paint'] });
      } catch (e) {
        console.warn('LCP monitoring not available:', e);
      }
    }
  }

  monitorFID() {
    if ('PerformanceObserver' in window) {
      try {
        const observer = new PerformanceObserver((entryList) => {
          for (const entry of entryList.getEntries()) {
            this.metrics.fid = entry.processingDuration;
            console.log(`FID: ${entry.processingDuration.toFixed(2)}ms`);
          }
        });
        observer.observe({ entryTypes: ['first-input'] });
      } catch (e) {
        console.warn('FID monitoring not available:', e);
      }
    }
  }

  monitorCLS() {
    if ('PerformanceObserver' in window) {
      try {
        let clsValue = 0;
        const observer = new PerformanceObserver((entryList) => {
          for (const entry of entryList.getEntries()) {
            if (!entry.hadRecentInput) {
              clsValue += entry.value;
              this.metrics.cls = clsValue;
              console.log(`CLS: ${clsValue.toFixed(4)}`);
            }
          }
        });
        observer.observe({ entryTypes: ['layout-shift'] });
      } catch (e) {
        console.warn('CLS monitoring not available:', e);
      }
    }
  }

  monitorTTFB() {
    if ('performance' in window && 'timing' in window.performance) {
      const navigationTiming = window.performance.timing;
      const ttfb = navigationTiming.responseStart - navigationTiming.navigationStart;
      this.metrics.ttfb = ttfb;
      console.log(`TTFB: ${ttfb}ms`);
    }
  }

  reportMetrics() {
    // Log metrics to console for analysis
    console.group('📊 Performance Metrics');
    console.table(this.metrics);
    console.groupEnd();

    // Check if metrics meet targets
    this.validateMetrics();
  }

  validateMetrics() {
    const targets = {
      fcp: 1800,  // < 1.8s
      lcp: 2500,  // < 2.5s
      fid: 100,   // < 100ms
      cls: 0.1,   // < 0.1
      ttfb: 600,  // < 600ms
    };

    console.group('✅ Validation Against Targets');
    for (const [metric, target] of Object.entries(targets)) {
      const value = this.metrics[metric];
      if (value !== null) {
        const passed = value <= target;
        console.log(
          `${passed ? '✓' : '✗'} ${metric.toUpperCase()}: ${value.toFixed(2)} (target: ${target})`
        );
      }
    }
    console.groupEnd();
  }

  // Get all metrics as object
  getMetrics() {
    return this.metrics;
  }

  // Send metrics to analytics (if needed)
  sendToAnalytics() {
    // This can be extended to send metrics to an analytics service
    if (window.fetch) {
      fetch('/api/metrics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(this.metrics),
      }).catch(e => console.debug('Analytics not available:', e));
    }
  }
}

// Auto-initialize on page load
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    window.performanceMonitor = new PerformanceMonitor();
  });
} else {
  window.performanceMonitor = new PerformanceMonitor();
}
