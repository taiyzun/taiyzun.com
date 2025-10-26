// Performance monitoring and analytics
(() => {
  // Capture Web Vitals
  function sendToAnalytics(metric) {
    const body = JSON.stringify({
      name: metric.name,
      value: metric.value,
      id: metric.id,
      page: window.location.pathname
    });
    
    // Use Navigator.sendBeacon() for better reliability
    if (navigator.sendBeacon) {
      navigator.sendBeacon('/analytics', body);
    } else {
      fetch('/analytics', {
        body,
        method: 'POST',
        keepalive: true
      });
    }
  }

  // Monitor Core Web Vitals
  function getLCP(onReport) {
    new PerformanceObserver((entryList) => {
      const entries = entryList.getEntries();
      const lastEntry = entries[entries.length - 1];
      onReport(lastEntry);
    }).observe({ type: 'largest-contentful-paint', buffered: true });
  }

  function getFID(onReport) {
    new PerformanceObserver((entryList) => {
      const entries = entryList.getEntries();
      entries.forEach(onReport);
    }).observe({ type: 'first-input', buffered: true });
  }

  function getCLS(onReport) {
    new PerformanceObserver((entryList) => {
      const entries = entryList.getEntries();
      entries.forEach(onReport);
    }).observe({ type: 'layout-shift', buffered: true });
  }

  // Resource timing
  new PerformanceObserver((list) => {
    list.getEntries().forEach((entry) => {
      // Filter out noise and focus on key resources
      if (entry.initiatorType === 'img' || entry.initiatorType === 'css' || entry.initiatorType === 'script') {
        console.log(`Resource Timing: ${entry.name} - ${Math.round(entry.duration)}ms`);
      }
    });
  }).observe({ entryTypes: ['resource'] });

  // Navigation timing
  window.addEventListener('load', () => {
    setTimeout(() => {
      const navigation = performance.getEntriesByType('navigation')[0];
      const timing = {
        DNS: navigation.domainLookupEnd - navigation.domainLookupStart,
        TLS: navigation.secureConnectionStart > 0 ? navigation.connectEnd - navigation.secureConnectionStart : 0,
        TTFB: navigation.responseStart - navigation.requestStart,
        responseTime: navigation.responseEnd - navigation.responseStart,
        DOMInteractive: navigation.domInteractive - navigation.fetchStart,
        DOMComplete: navigation.domComplete - navigation.fetchStart,
        loadEvent: navigation.loadEventEnd - navigation.loadEventStart,
        totalTime: navigation.loadEventEnd - navigation.fetchStart
      };
      
      console.log('Navigation Timing:', timing);
      sendToAnalytics({ name: 'navigation-timing', value: timing });
    }, 0);
  });

  // Monitor memory usage
  if (performance.memory) {
    setInterval(() => {
      const memory = {
        jsHeapSizeLimit: performance.memory.jsHeapSizeLimit,
        totalJSHeapSize: performance.memory.totalJSHeapSize,
        usedJSHeapSize: performance.memory.usedJSHeapSize
      };
      console.log('Memory Usage:', memory);
      sendToAnalytics({ name: 'memory', value: memory });
    }, 10000);
  }

  // Monitor network status
  window.addEventListener('online', () => {
    console.log('Network status: online');
    sendToAnalytics({ name: 'network-status', value: 'online' });
  });

  window.addEventListener('offline', () => {
    console.log('Network status: offline');
    sendToAnalytics({ name: 'network-status', value: 'offline' });
  });

  // Initialize monitoring
  getLCP(sendToAnalytics);
  getFID(sendToAnalytics);
  getCLS(sendToAnalytics);
})();