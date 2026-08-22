import React, { useEffect, useState } from 'react';
import { useTranslation } from '../../contexts/LanguageContext';
import { supabase } from '../../lib/supabase';
import { TrendingUp, DollarSign, ShoppingBag, XCircle, Package } from 'lucide-react';

const SalesAnalytics: React.FC = () => {
  const { t, language } = useTranslation();
  const [filter, setFilter] = useState<'today' | 'week' | 'month' | 'all'>('month');
  const [loading, setLoading] = useState(true);

  // Metrics
  const [revenue, setRevenue] = useState(0);
  const [totalOrders, setTotalOrders] = useState(0);
  const [completedOrders, setCompletedOrders] = useState(0);
  const [cancelledOrders, setCancelledOrders] = useState(0);
  
  // Breakdowns
  const [statusBreakdown, setStatusBreakdown] = useState<Record<string, number>>({});
  const [paymentBreakdown, setPaymentBreakdown] = useState<Record<string, number>>({});
  const [topProducts, setTopProducts] = useState<any[]>([]);

  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      let fromDateFilter = '';
      const now = new Date();
      
      if (filter === 'today') {
        const start = new Date(now);
        start.setHours(0, 0, 0, 0);
        fromDateFilter = start.toISOString();
      } else if (filter === 'week') {
        const start = new Date(now);
        start.setDate(start.getDate() - 7);
        fromDateFilter = start.toISOString();
      } else if (filter === 'month') {
        const start = new Date(now);
        start.setDate(start.getDate() - 30);
        fromDateFilter = start.toISOString();
      }

      // 1. Fetch Orders
      let ordersQuery = supabase.from('orders').select('id, status, payment_status, grand_total, created_at');
      if (fromDateFilter) {
        ordersQuery = ordersQuery.gte('created_at', fromDateFilter);
      }

      const { data: orders, error: ordersError } = await ordersQuery;
      if (ordersError) throw ordersError;

      // 2. Fetch Order Items for Top Products
      // We use order:orders!inner to ensure we only get items for the filtered orders.
      let itemsQuery = supabase.from('order_items').select('quantity, total, product:products(name), order:orders!inner(status, created_at)');
      if (fromDateFilter) {
        itemsQuery = itemsQuery.gte('orders.created_at', fromDateFilter);
      }
      
      const { data: items, error: itemsError } = await itemsQuery;
      if (itemsError) throw itemsError;

      // Aggregate Orders
      let totalRev = 0;
      let completedCount = 0;
      let cancelledCount = 0;
      
      const statusCounts: Record<string, number> = {
        'PENDING': 0, 'CONFIRMED': 0, 'PREPARING': 0, 'READY': 0, 'COMPLETED': 0, 'CANCELLED': 0
      };
      
      const paymentCounts: Record<string, number> = {
        'PAID': 0, 'PARTIALLY_PAID': 0, 'UNPAID': 0, 'REFUNDED': 0
      };

      const validRevenueStatuses = ['CONFIRMED', 'PREPARING', 'READY', 'COMPLETED'];

      (orders || []).forEach(o => {
        if (statusCounts[o.status] !== undefined) {
          statusCounts[o.status]++;
        } else {
          statusCounts[o.status] = 1;
        }

        if (paymentCounts[o.payment_status] !== undefined) {
          paymentCounts[o.payment_status]++;
        } else {
          paymentCounts[o.payment_status] = 1;
        }

        if (validRevenueStatuses.includes(o.status)) {
          totalRev += Number(o.grand_total || 0);
        }

        if (o.status === 'COMPLETED') completedCount++;
        if (o.status === 'CANCELLED') cancelledCount++;
      });

      setRevenue(totalRev);
      setTotalOrders((orders || []).length);
      setCompletedOrders(completedCount);
      setCancelledOrders(cancelledCount);
      setStatusBreakdown(statusCounts);
      setPaymentBreakdown(paymentCounts);

      // Aggregate Products
      const productMap: Record<string, { name: string, quantity: number, total: number }> = {};
      
      (items || []).forEach(item => {
        const orderStatus = (item.order as any)?.status;
        if (!validRevenueStatuses.includes(orderStatus)) return;

        const prodName = (item.product as any)?.name || 'Unknown';
        if (!productMap[prodName]) {
          productMap[prodName] = { name: prodName, quantity: 0, total: 0 };
        }
        productMap[prodName].quantity += Number(item.quantity || 0);
        productMap[prodName].total += Number(item.total || 0);
      });

      const sortedProducts = Object.values(productMap)
        .sort((a, b) => b.quantity - a.quantity)
        .slice(0, 5);

      setTopProducts(sortedProducts);

    } catch (e: any) {
      console.error('Analytics Fetch Error:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, [filter]);

  const aov = totalOrders > 0 ? (revenue / totalOrders) : 0;
  const cancelRate = totalOrders > 0 ? ((cancelledOrders / totalOrders) * 100) : 0;

  const formatCurrency = (val: number) => {
    return val.toLocaleString(language === 'ar' ? 'ar-SA' : 'en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  };

  const statusColors: Record<string, string> = {
    'PENDING': '#eab308', 
    'CONFIRMED': '#3b82f6', 
    'PREPARING': '#6366f1', 
    'READY': '#a855f7', 
    'COMPLETED': '#22c55e', 
    'CANCELLED': '#ef4444'
  };

  const paymentColors: Record<string, string> = {
    'PAID': '#22c55e',
    'PARTIALLY_PAID': '#eab308',
    'UNPAID': '#ef4444',
    'REFUNDED': '#9ca3af'
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      {/* Filters */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
        {(['today', 'week', 'month', 'all'] as const).map(f => (
          <button 
            key={f}
            onClick={() => setFilter(f)}
            style={{
              padding: '6px 16px',
              borderRadius: '20px',
              border: 'none',
              backgroundColor: filter === f ? 'var(--color-primary)' : 'var(--color-background)',
              color: filter === f ? '#fff' : 'var(--color-text-secondary)',
              cursor: 'pointer',
              fontWeight: 500,
              fontSize: '0.9rem',
              boxShadow: filter === f ? '0 2px 4px rgba(0,0,0,0.1)' : 'none'
            }}
          >
            {f === 'today' ? (t('dashboard.filters.today')) :
             f === 'week' ? (t('dashboard.filters.week')) :
             f === 'month' ? (t('dashboard.filters.month')) :
             (t('dashboard.filters.all'))}
          </button>
        ))}
      </div>

      {loading ? (
        <div style={{ padding: '40px', textAlign: 'center', color: 'var(--color-text-muted)' }}>
          {t('common.loading')}
        </div>
      ) : (
        <>
          {/* KPI Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
            <div className="card" style={{ padding: '20px', display: 'flex', alignItems: 'center', gap: '16px', borderInlineStart: '4px solid #22c55e' }}>
              <div style={{ backgroundColor: '#dcfce3', padding: '12px', borderRadius: '50%', color: '#166534' }}>
                <DollarSign size={24} />
              </div>
              <div>
                <p style={{ margin: 0, color: 'var(--color-text-secondary)', fontSize: '0.875rem' }}>{t('sales.totalRevenue')}</p>
                <h3 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 'bold' }}>{formatCurrency(revenue)}</h3>
              </div>
            </div>

            <div className="card" style={{ padding: '20px', display: 'flex', alignItems: 'center', gap: '16px', borderInlineStart: '4px solid var(--color-primary)' }}>
              <div style={{ backgroundColor: 'var(--color-primary-light)', padding: '12px', borderRadius: '50%', color: 'var(--color-primary)' }}>
                <ShoppingBag size={24} />
              </div>
              <div>
                <p style={{ margin: 0, color: 'var(--color-text-secondary)', fontSize: '0.875rem' }}>{t('sales.totalOrders')}</p>
                <h3 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 'bold' }}>{totalOrders}</h3>
              </div>
            </div>

            <div className="card" style={{ padding: '20px', display: 'flex', alignItems: 'center', gap: '16px', borderInlineStart: '4px solid #8b5cf6' }}>
              <div style={{ backgroundColor: '#ede9fe', padding: '12px', borderRadius: '50%', color: '#5b21b6' }}>
                <TrendingUp size={24} />
              </div>
              <div>
                <p style={{ margin: 0, color: 'var(--color-text-secondary)', fontSize: '0.875rem' }}>{t('sales.avgOrderValue')}</p>
                <h3 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 'bold' }}>{formatCurrency(aov)}</h3>
              </div>
            </div>

            <div className="card" style={{ padding: '20px', display: 'flex', alignItems: 'center', gap: '16px', borderInlineStart: '4px solid #ef4444' }}>
              <div style={{ backgroundColor: 'rgba(239, 68, 68, 0.15)', padding: '12px', borderRadius: '50%', color: '#991b1b' }}>
                <XCircle size={24} />
              </div>
              <div>
                <p style={{ margin: 0, color: 'var(--color-text-secondary)', fontSize: '0.875rem' }}>{t('sales.cancelRate')}</p>
                <h3 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 'bold' }}>{cancelRate.toFixed(1)}%</h3>
              </div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '24px' }}>
            
            {/* Top Products */}
            <div className="card" style={{ padding: '20px' }}>
              <h3 style={{ fontSize: '1.1rem', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Package size={18} color="var(--color-primary)" />
                {t('sales.topProducts')}
              </h3>
              
              {topProducts.length === 0 ? (
                <div style={{ color: 'var(--color-text-muted)', textAlign: 'center', padding: '20px' }}>
                  {t('common.noData')}
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {topProducts.map((p, i) => (
                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px', backgroundColor: 'var(--color-background)', borderRadius: 'var(--radius-md)' }}>
                      <div>
                        <span style={{ fontWeight: 600, display: 'block', color: 'var(--color-text)' }}>{p.name}</span>
                        <span style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)' }}>
                          {p.quantity} {t('common.units')}
                        </span>
                      </div>
                      <div style={{ fontWeight: 'bold', color: 'var(--color-primary-dark)' }}>
                        {formatCurrency(p.total)}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Breakdowns */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              {/* Order Status */}
              <div className="card" style={{ padding: '20px' }}>
                <h3 style={{ fontSize: '1.1rem', marginBottom: '16px' }}>
                  {t('sales.orderStatus')}
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {Object.entries(statusBreakdown).map(([status, count]) => (
                    <div key={status} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div style={{ width: '120px', fontSize: '0.85rem', fontWeight: 500, color: 'var(--color-text-secondary)' }}>
                        {status}
                      </div>
                      <div style={{ flex: 1, backgroundColor: 'var(--color-background)', height: '8px', borderRadius: '4px', overflow: 'hidden' }}>
                        <div style={{ 
                          width: `${totalOrders > 0 ? (count / totalOrders) * 100 : 0}%`, 
                          backgroundColor: statusColors[status] || '#ccc', 
                          height: '100%' 
                        }} />
                      </div>
                      <div style={{ width: '40px', textAlign: 'right', fontWeight: 'bold', fontSize: '0.9rem' }}>
                        {count}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Payment Status */}
              <div className="card" style={{ padding: '20px' }}>
                <h3 style={{ fontSize: '1.1rem', marginBottom: '16px' }}>
                  {t('sales.paymentStatus')}
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {Object.entries(paymentBreakdown).map(([status, count]) => (
                    <div key={status} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div style={{ width: '120px', fontSize: '0.85rem', fontWeight: 500, color: 'var(--color-text-secondary)' }}>
                        {status}
                      </div>
                      <div style={{ flex: 1, backgroundColor: 'var(--color-background)', height: '8px', borderRadius: '4px', overflow: 'hidden' }}>
                        <div style={{ 
                          width: `${totalOrders > 0 ? (count / totalOrders) * 100 : 0}%`, 
                          backgroundColor: paymentColors[status] || '#ccc', 
                          height: '100%' 
                        }} />
                      </div>
                      <div style={{ width: '40px', textAlign: 'right', fontWeight: 'bold', fontSize: '0.9rem' }}>
                        {count}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            
          </div>
        </>
      )}
    </div>
  );
};

export default SalesAnalytics;
