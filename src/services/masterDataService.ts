import { supabase } from '../lib/supabase';
import { fetchWithCache, CACHE_KEYS, CACHE_TTL, invalidateCache } from '../lib/dataCache';

export interface WarehouseOption {
  id: string;
  name: string;
  code?: string;
  location?: string;
}

export interface CategoryOption {
  id: string;
  name: string;
}

export interface BrandOption {
  id: string;
  name: string;
}

export interface UnitOption {
  id: string;
  name: string;
  code: string;
}

export interface SupplierOption {
  id: string;
  name: string;
  phone?: string;
}

export interface CustomerOption {
  id: string;
  name: string;
  phone?: string;
}

/**
 * Shared Master Data Service
 * Prevents redundant round-trips to master tables by caching them in memory for 10-15 minutes.
 */
export const MasterDataService = {
  async getWarehouses(forceRefresh = false): Promise<WarehouseOption[]> {
    return fetchWithCache(
      CACHE_KEYS.WAREHOUSES,
      async () => {
        const { data, error } = await supabase
          .from('warehouses')
          .select('id, name, code, location')
          .order('name');
        if (error) {
          console.warn('Error fetching warehouses:', error);
          return [];
        }
        return data || [];
      },
      { ttlMs: CACHE_TTL.EXTENDED, forceRefresh }
    );
  },

  async getCategories(forceRefresh = false): Promise<CategoryOption[]> {
    return fetchWithCache(
      CACHE_KEYS.CATEGORIES,
      async () => {
        const { data, error } = await supabase
          .from('categories')
          .select('id, name')
          .order('name');
        if (error) {
          console.warn('Error fetching categories:', error);
          return [];
        }
        return data || [];
      },
      { ttlMs: CACHE_TTL.EXTENDED, forceRefresh }
    );
  },

  async getBrands(forceRefresh = false): Promise<BrandOption[]> {
    return fetchWithCache(
      CACHE_KEYS.BRANDS,
      async () => {
        const { data, error } = await supabase
          .from('brands')
          .select('id, name')
          .order('name');
        if (error) {
          console.warn('Error fetching brands:', error);
          return [];
        }
        return data || [];
      },
      { ttlMs: CACHE_TTL.EXTENDED, forceRefresh }
    );
  },

  async getUnits(forceRefresh = false): Promise<UnitOption[]> {
    return fetchWithCache(
      CACHE_KEYS.UNITS,
      async () => {
        const { data, error } = await supabase
          .from('units')
          .select('id, name, code')
          .order('name');
        if (error) {
          console.warn('Error fetching units:', error);
          return [];
        }
        return data || [];
      },
      { ttlMs: CACHE_TTL.EXTENDED, forceRefresh }
    );
  },

  async getSuppliers(forceRefresh = false): Promise<SupplierOption[]> {
    return fetchWithCache(
      CACHE_KEYS.SUPPLIERS,
      async () => {
        const { data, error } = await supabase
          .from('suppliers')
          .select('id, name, phone')
          .order('name');
        if (error) {
          console.warn('Error fetching suppliers:', error);
          return [];
        }
        return data || [];
      },
      { ttlMs: CACHE_TTL.EXTENDED, forceRefresh }
    );
  },

  async getCustomers(forceRefresh = false): Promise<CustomerOption[]> {
    return fetchWithCache(
      CACHE_KEYS.CUSTOMERS,
      async () => {
        const { data, error } = await supabase
          .from('customers')
          .select('id, name, phone')
          .order('name');
        if (error) {
          console.warn('Error fetching customers:', error);
          return [];
        }
        return data || [];
      },
      { ttlMs: CACHE_TTL.EXTENDED, forceRefresh }
    );
  },

  /**
   * Batch preload all master tables in a single parallel step
   */
  async preloadAll(): Promise<void> {
    await Promise.allSettled([
      this.getWarehouses(),
      this.getCategories(),
      this.getBrands(),
      this.getUnits(),
      this.getSuppliers(),
      this.getCustomers()
    ]);
  },

  invalidate(type: 'warehouses' | 'categories' | 'brands' | 'units' | 'suppliers' | 'customers' | 'all') {
    if (type === 'all') {
      invalidateCache(CACHE_KEYS.WAREHOUSES);
      invalidateCache(CACHE_KEYS.CATEGORIES);
      invalidateCache(CACHE_KEYS.BRANDS);
      invalidateCache(CACHE_KEYS.UNITS);
      invalidateCache(CACHE_KEYS.SUPPLIERS);
      invalidateCache(CACHE_KEYS.CUSTOMERS);
    } else {
      invalidateCache(CACHE_KEYS[type.toUpperCase() as keyof typeof CACHE_KEYS] || type);
    }
  }
};
