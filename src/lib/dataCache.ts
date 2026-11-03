/**
 * SUPPLYRA ENTERPRISE IN-MEMORY CACHE & SWR QUERY ENGINE
 * 
 * Provides:
 * 1. Instant (0ms) screen rendering from memory cache on route navigation.
 * 2. In-flight request deduplication (prevents multiple identical network calls).
 * 3. Stale-While-Revalidate (SWR) support for smooth background synchronization.
 * 4. Granular cache invalidation on create, update, delete operations.
 * 5. Master-data shared caching with extended TTL.
 */

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  expiresAt: number;
}

// In-memory cache storage
const cacheStore = new Map<string, CacheEntry<any>>();

// In-flight active promises to prevent duplicate simultaneous network requests
const inFlightRequests = new Map<string, Promise<any>>();

// Invalidation listeners for reactive screen updates
const listeners = new Set<(key: string) => void>();

// Default Cache TTLs (Time-To-Live in Milliseconds)
export const CACHE_TTL = {
  INSTANT: 1000 * 60 * 2,       // 2 minutes for transactional tables (Sales, Purchases, Inventory)
  EXTENDED: 1000 * 60 * 10,    // 10 minutes for master data (Warehouses, Categories, Brands, Units)
  ANALYTICS: 1000 * 60 * 5,    // 5 minutes for heavy Analytics & Dashboard metrics
  LONG: 1000 * 60 * 30         // 30 minutes for static dictionaries
};

// Canonical Cache Keys
export const CACHE_KEYS = {
  PRODUCTS: 'products_list',
  INVENTORY: 'inventory_batches',
  SALES: 'sales_list',
  PURCHASES: 'purchases_list',
  CUSTOMERS: 'customers_list',
  SUPPLIERS: 'suppliers_list',
  WAREHOUSES: 'warehouses_list',
  USERS: 'users_list',
  CATEGORIES: 'categories_master',
  BRANDS: 'brands_master',
  UNITS: 'units_master',
  DASHBOARD_PREFIX: 'dashboard_',
  ANALYTICS_PREFIX: 'analytics_'
};

/**
 * Retrieve cached value if still valid
 */
export function cacheGet<T>(key: string): T | null {
  const entry = cacheStore.get(key);
  if (!entry) return null;
  
  if (Date.now() > entry.expiresAt) {
    cacheStore.delete(key);
    return null;
  }
  
  return entry.data as T;
}

/**
 * Store value into memory cache with custom or default TTL
 */
export function cacheSet<T>(key: string, data: T, ttlMs: number = CACHE_TTL.INSTANT): void {
  cacheStore.set(key, {
    data,
    timestamp: Date.now(),
    expiresAt: Date.now() + ttlMs
  });
}

/**
 * Remove a specific key or invalidate all keys matching prefix/pattern
 */
export function invalidateCache(keyOrPrefix: string | RegExp): void {
  if (typeof keyOrPrefix === 'string') {
    for (const key of cacheStore.keys()) {
      if (key === keyOrPrefix || key.startsWith(keyOrPrefix)) {
        cacheStore.delete(key);
      }
    }
  } else {
    for (const key of cacheStore.keys()) {
      if (keyOrPrefix.test(key)) {
        cacheStore.delete(key);
      }
    }
  }

  // Notify active listeners
  listeners.forEach(fn => {
    try {
      fn(typeof keyOrPrefix === 'string' ? keyOrPrefix : keyOrPrefix.source);
    } catch (e) {
      console.warn('Cache listener error:', e);
    }
  });
}

/**
 * Clear the entire memory cache (e.g. on logout or tenant switch)
 */
export function clearAllCache(): void {
  cacheStore.clear();
  inFlightRequests.clear();
}

/**
 * Subscribe to cache invalidation events (e.g. to trigger background refresh)
 */
export function subscribeCacheInvalidation(callback: (invalidatedKey: string) => void): () => void {
  listeners.add(callback);
  return () => {
    listeners.delete(callback);
  };
}

interface FetchOptions {
  ttlMs?: number;
  forceRefresh?: boolean;
}

/**
 * High-performance fetch wrapper:
 * - Checks cache first (0ms if available)
 * - Deduplicates concurrent identical requests
 * - Stores fresh result into cache
 */
export async function fetchWithCache<T>(
  key: string,
  fetchFn: () => Promise<T>,
  options: FetchOptions = {}
): Promise<T> {
  const { ttlMs = CACHE_TTL.INSTANT, forceRefresh = false } = options;

  // 1. Check in-memory cache
  if (!forceRefresh) {
    const cached = cacheGet<T>(key);
    if (cached !== null) {
      return cached;
    }
  }

  // 2. Check if identical request is already in-flight (Deduplication)
  if (inFlightRequests.has(key)) {
    return inFlightRequests.get(key) as Promise<T>;
  }

  // 3. Execute request and track in-flight
  const requestPromise = (async () => {
    try {
      const data = await fetchFn();
      if (data !== undefined && data !== null) {
        cacheSet(key, data, ttlMs);
      }
      return data;
    } finally {
      inFlightRequests.delete(key);
    }
  })();

  inFlightRequests.set(key, requestPromise);
  return requestPromise;
}
