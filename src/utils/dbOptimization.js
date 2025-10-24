// Database optimization utilities for better performance

import { collection, query, orderBy, limit, getDocs, where } from 'firebase/firestore';
import { db } from '../firebase';

// Cache for frequently accessed data
const cache = new Map();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

// Optimized query function with caching
export const optimizedQuery = async (collectionName, options = {}) => {
  const cacheKey = `${collectionName}_${JSON.stringify(options)}`;
  const now = Date.now();
  
  // Check cache first
  if (cache.has(cacheKey)) {
    const cached = cache.get(cacheKey);
    if (now - cached.timestamp < CACHE_DURATION) {
      return cached.data;
    }
  }

  try {
    let q = collection(db, collectionName);
    
    if (options.where) {
      q = query(q, where(options.where.field, options.where.operator, options.where.value));
    }
    
    if (options.orderBy) {
      q = query(q, orderBy(options.orderBy.field, options.orderBy.direction || 'desc'));
    }
    
    if (options.limit) {
      q = query(q, limit(options.limit));
    }

    const snapshot = await getDocs(q);
    const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    
    // Cache the result
    cache.set(cacheKey, {
      data,
      timestamp: now
    });
    
    return data;
  } catch (error) {
    console.error(`Error querying ${collectionName}:`, error);
    return [];
  }
};

// Batch fetch multiple collections
export const batchFetch = async (queries) => {
  const results = await Promise.allSettled(
    queries.map(({ collectionName, options }) => 
      optimizedQuery(collectionName, options)
    )
  );
  
  return results.map((result, index) => ({
    collectionName: queries[index].collectionName,
    data: result.status === 'fulfilled' ? result.value : [],
    error: result.status === 'rejected' ? result.reason : null
  }));
};

// Clear cache when needed
export const clearCache = (collectionName = null) => {
  if (collectionName) {
    const keys = Array.from(cache.keys()).filter(key => key.startsWith(collectionName));
    keys.forEach(key => cache.delete(key));
  } else {
    cache.clear();
  }
};

// Optimized count query
export const getOptimizedCount = async (collectionName, whereClause = null) => {
  try {
    let q = collection(db, collectionName);
    
    if (whereClause) {
      q = query(q, where(whereClause.field, whereClause.operator, whereClause.value));
    }
    
    const snapshot = await getDocs(q);
    return snapshot.size;
  } catch (error) {
    console.error(`Error counting ${collectionName}:`, error);
    return 0;
  }
};


