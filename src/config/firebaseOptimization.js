// Firebase optimization configuration for better performance and reliability

export const FIREBASE_OPTIMIZATION_CONFIG = {
  // Connection settings
  connection: {
    maxRetries: 3,
    baseDelay: 1000,
    maxDelay: 10000,
    timeout: 5000
  },
  
  // Cache settings
  cache: {
    duration: 5 * 60 * 1000, // 5 minutes
    maxSize: 100,
    enablePersistence: true
  },
  
  // Query optimization
  queries: {
    defaultLimit: 20,
    maxLimit: 100,
    enableOfflineSupport: true,
    enableNetworkDetection: true
  },
  
  // Error handling
  errors: {
    retryableErrors: [
      'unavailable',
      'deadline-exceeded',
      'resource-exhausted',
      'aborted',
      'internal'
    ],
    nonRetryableErrors: [
      'permission-denied',
      'not-found',
      'already-exists',
      'invalid-argument',
      'failed-precondition'
    ]
  },
  
  // Performance monitoring
  monitoring: {
    enableMetrics: true,
    logSlowQueries: true,
    slowQueryThreshold: 2000, // 2 seconds
    enableConnectionHealthCheck: true,
    healthCheckInterval: 30000 // 30 seconds
  }
};

// Connection quality indicators
export const CONNECTION_QUALITY = {
  EXCELLENT: { min: 0, max: 100, color: 'success', label: 'Excellent' },
  GOOD: { min: 100, max: 500, color: 'info', label: 'Good' },
  FAIR: { min: 500, max: 1000, color: 'warning', label: 'Fair' },
  POOR: { min: 1000, max: 2000, color: 'error', label: 'Poor' },
  CRITICAL: { min: 2000, max: Infinity, color: 'error', label: 'Critical' }
};

// Performance metrics tracking
export class PerformanceTracker {
  constructor() {
    this.metrics = new Map();
    this.slowQueries = [];
  }

  startTimer(operationId) {
    this.metrics.set(operationId, {
      startTime: performance.now(),
      operation: operationId
    });
  }

  endTimer(operationId) {
    const metric = this.metrics.get(operationId);
    if (metric) {
      const duration = performance.now() - metric.startTime;
      metric.duration = duration;
      metric.endTime = performance.now();
      
      // Track slow queries
      if (duration > FIREBASE_OPTIMIZATION_CONFIG.monitoring.slowQueryThreshold) {
        this.slowQueries.push({
          operation: operationId,
          duration,
          timestamp: new Date().toISOString()
        });
        
        if (FIREBASE_OPTIMIZATION_CONFIG.monitoring.logSlowQueries) {
          console.warn(`Slow query detected: ${operationId} took ${duration.toFixed(2)}ms`);
        }
      }
      
      return duration;
    }
    return null;
  }

  getMetrics() {
    return Array.from(this.metrics.values());
  }

  getSlowQueries() {
    return this.slowQueries;
  }

  clearMetrics() {
    this.metrics.clear();
    this.slowQueries = [];
  }
}

// Create a singleton performance tracker
export const performanceTracker = new PerformanceTracker();

// Utility functions for connection optimization
export const getConnectionQuality = (latency) => {
  for (const [quality, config] of Object.entries(CONNECTION_QUALITY)) {
    if (latency >= config.min && latency < config.max) {
      return { quality, ...config };
    }
  }
  return CONNECTION_QUALITY.CRITICAL;
};

export const shouldRetry = (error) => {
  const errorCode = error?.code || error?.message || '';
  return FIREBASE_OPTIMIZATION_CONFIG.errors.retryableErrors.some(
    retryableError => errorCode.includes(retryableError)
  );
};

export const getRetryDelay = (attempt, baseDelay = FIREBASE_OPTIMIZATION_CONFIG.connection.baseDelay) => {
  const delay = baseDelay * Math.pow(2, attempt - 1);
  return Math.min(delay, FIREBASE_OPTIMIZATION_CONFIG.connection.maxDelay);
};
