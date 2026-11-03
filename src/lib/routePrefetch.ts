/**
 * SPECULATIVE ROUTE PRE-FETCHING ENGINE
 * 
 * Preloads route JavaScript chunks on hover or touch start so that
 * navigation occurs instantly without waiting for network chunk downloads.
 */

const routeLoaders: Record<string, () => Promise<any>> = {
  '/': () => import('../pages/dashboard/Dashboard'),
  '/products': () => import('../pages/products/ProductsList'),
  '/inventory': () => import('../pages/inventory/InventoryList'),
  '/sales': () => import('../pages/sales/SalesList'),
  '/purchases': () => import('../pages/purchases/PurchasesList'),
  '/customers': () => import('../pages/customers/CustomersList'),
  '/suppliers': () => import('../pages/suppliers/SuppliersList'),
  '/warehouses': () => import('../pages/warehouses/WarehousesList'),
  '/users': () => import('../pages/users/UsersList'),
  '/analytics': () => import('../pages/analytics/AnalyticsDashboard'),
  '/ai-assistant': () => import('../pages/ai-assistant/AIAssistant'),
  '/settings': () => import('../pages/settings/Settings'),
};

const preloadedRoutes = new Set<string>();

export function prefetchRoute(path: string): void {
  // Normalize path
  const normalizedPath = path.split('?')[0].replace(/\/+$/, '') || '/';
  
  if (preloadedRoutes.has(normalizedPath)) return;
  
  const loader = routeLoaders[normalizedPath];
  if (loader) {
    preloadedRoutes.add(normalizedPath);
    // Execute dynamic import in background idle time
    if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
      window.requestIdleCallback(() => {
        loader().catch(err => console.debug('Preload route idle notice:', err));
      });
    } else {
      setTimeout(() => {
        loader().catch(err => console.debug('Preload route notice:', err));
      }, 50);
    }
  }
}
