/**
 * Authentication utility functions to prevent logout issues
 */

import { auth } from '../firebase';

/**
 * Safely checks if user is authenticated without triggering auth state changes
 * @returns {boolean} True if user is authenticated
 */
export const isUserAuthenticated = () => {
  try {
    return !!auth.currentUser;
  } catch (error) {
    console.error('Error checking authentication status:', error);
    return false;
  }
};

/**
 * Gets current user safely without triggering auth listeners
 * @returns {Object|null} Current user object or null
 */
export const getCurrentUser = () => {
  try {
    return auth.currentUser;
  } catch (error) {
    console.error('Error getting current user:', error);
    return null;
  }
};

/**
 * Safely performs operations that require authentication
 * @param {Function} operation - The operation to perform
 * @param {Function} onAuthError - Callback for authentication errors
 * @returns {Promise} Result of the operation
 */
export const withAuthCheck = async (operation, onAuthError = null) => {
  try {
    // Check if user is still authenticated
    if (!isUserAuthenticated()) {
      const error = new Error('User not authenticated');
      error.code = 'auth/user-not-authenticated';
      
      if (onAuthError) {
        onAuthError(error);
      }
      
      throw error;
    }
    
    // Perform the operation
    return await operation();
  } catch (error) {
    console.error('Operation failed:', error);
    
    // Check if it's an authentication error
    if (error.code?.includes('auth') || error.message?.includes('auth')) {
      if (onAuthError) {
        onAuthError(error);
      }
    }
    
    throw error;
  }
};

/**
 * Prevents multiple rapid operations that could cause auth conflicts
 */
class AuthOperationQueue {
  constructor() {
    this.queue = new Map();
    this.processing = new Set();
  }
  
  async execute(key, operation) {
    // If already processing this key, wait for it to complete
    if (this.processing.has(key)) {
      return new Promise((resolve, reject) => {
        const queue = this.queue.get(key) || [];
        queue.push({ resolve, reject });
        this.queue.set(key, queue);
      });
    }
    
    this.processing.add(key);
    
    try {
      const result = await operation();
      
      // Resolve any waiting operations
      const queue = this.queue.get(key) || [];
      queue.forEach(({ resolve }) => resolve(result));
      this.queue.delete(key);
      
      return result;
    } catch (error) {
      // Reject any waiting operations
      const queue = this.queue.get(key) || [];
      queue.forEach(({ reject }) => reject(error));
      this.queue.delete(key);
      
      throw error;
    } finally {
      this.processing.delete(key);
    }
  }
}

export const authOperationQueue = new AuthOperationQueue();

