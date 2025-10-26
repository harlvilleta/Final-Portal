// Connection monitoring utilities for better user experience

import { checkConnectionHealth, initializeConnection } from '../firebase';

class ConnectionMonitor {
  constructor() {
    this.isOnline = navigator.onLine;
    this.connectionStatus = 'checking';
    this.retryCount = 0;
    this.maxRetries = 3;
    this.listeners = [];
    
    this.setupEventListeners();
    this.startPeriodicCheck();
  }

  setupEventListeners() {
    window.addEventListener('online', () => {
      this.isOnline = true;
      this.connectionStatus = 'checking';
      this.checkConnection();
    });

    window.addEventListener('offline', () => {
      this.isOnline = false;
      this.connectionStatus = 'offline';
      this.notifyListeners('offline');
    });
  }

  startPeriodicCheck() {
    // Check connection every 30 seconds
    setInterval(() => {
      if (this.isOnline) {
        this.checkConnection();
      }
    }, 30000);
  }

  async checkConnection() {
    if (!this.isOnline) {
      this.connectionStatus = 'offline';
      this.notifyListeners('offline');
      return;
    }

    try {
      this.connectionStatus = 'checking';
      this.notifyListeners('checking');
      
      const isHealthy = await checkConnectionHealth();
      if (isHealthy) {
        this.connectionStatus = 'online';
        this.retryCount = 0;
        this.notifyListeners('online');
      } else {
        throw new Error('Connection health check failed');
      }
    } catch (error) {
      console.warn('Connection check failed:', error);
      this.retryCount++;
      
      if (this.retryCount < this.maxRetries) {
        this.connectionStatus = 'retrying';
        this.notifyListeners('retrying');
        
        // Wait before retrying
        setTimeout(() => {
          this.checkConnection();
        }, 2000 * this.retryCount);
      } else {
        this.connectionStatus = 'failed';
        this.notifyListeners('failed');
      }
    }
  }

  async forceReconnect() {
    try {
      this.connectionStatus = 'reconnecting';
      this.notifyListeners('reconnecting');
      
      await initializeConnection();
      this.retryCount = 0;
      this.connectionStatus = 'online';
      this.notifyListeners('online');
      return true;
    } catch (error) {
      console.error('Force reconnect failed:', error);
      this.connectionStatus = 'failed';
      this.notifyListeners('failed');
      return false;
    }
  }

  addListener(callback) {
    this.listeners.push(callback);
    return () => {
      const index = this.listeners.indexOf(callback);
      if (index > -1) {
        this.listeners.splice(index, 1);
      }
    };
  }

  notifyListeners(status) {
    this.listeners.forEach(callback => {
      try {
        callback(status, this.connectionStatus);
      } catch (error) {
        console.error('Error in connection listener:', error);
      }
    });
  }

  getStatus() {
    return {
      isOnline: this.isOnline,
      status: this.connectionStatus,
      retryCount: this.retryCount
    };
  }
}

// Create a singleton instance
export const connectionMonitor = new ConnectionMonitor();

// Export utility functions
export const getConnectionStatus = () => connectionMonitor.getStatus();
export const forceReconnect = () => connectionMonitor.forceReconnect();
export const addConnectionListener = (callback) => connectionMonitor.addListener(callback);
