import React, { useEffect, useState } from 'react';
import { 
  Package, Users, Factory, MapPin, PlusCircle, Calendar, RefreshCw, 
  AlertTriangle, Printer, FileText, Download, Banknote, ShoppingBag,
  TrendingUp, TrendingDown, Clock, FileWarning, ArrowUp, ArrowDown, Minus, CheckCircle,
  DollarSign, ShoppingCart, BarChart3, Layers, Filter
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useTranslation } from '../../contexts/LanguageContext';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import styles from './Dashboard.module.css';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, Cell
} from 'recharts';

interface DashboardStats {
  totalSales: number;
  totalOrders: number;
  productsCount: number;
  customersCount: number;
  suppliersCount: number;
  warehousesCount: number;
  
  // 4 Business Analytics KPIs
  grossProfit: number;
  totalPurchases: number;
  purchasesCount: number;
  avgOrderValue: number;
  totalQtySold: number;
  trendStatus: 'increasing' | 'decreasing' | 'stable';

  lowStockProducts: number;
  expiringSoonBatches: number;
  expiredBatches: number;
  customersWithReceivables: number;
  pendingPurchases: number;

  salesTrend: any[];
  topProducts: any[];
  recentActivity: any[];
}

const Dashboard = () => {
  const { t, language } = useTranslation();
  const { profile, user } = useAuth();
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const navigate = useNavigate();
  const displayName = profile?.first_name ? `${profile.first_name}${profile.last_name ? ` ${profile.last_name}` : ''}` : user?.email?.split('@')[0] || 'User';
  
  const [filter, setFilter] = useState<'30days' | 'today' | 'yesterday' | '7days' | 'thisMonth' | 'custom' | 'all'>('30days');
  const [customFrom, setCustomFrom] = useState<string>(() => {
    const d = new Date();
    d.setDate(1);
    return d.toISOString().split('T')[0];
  });
  const [customTo, setCustomTo] = useState<string>(() => new Date().toISOString().split('T')[0]);

  const [stats, setStats] = useState<DashboardStats>({
    totalSales: 0,
    totalOrders: 0,
    productsCount: 0,
    customersCount: 0,
    suppliersCount: 0,
    warehousesCount: 0,
    grossProfit: 0,
    totalPurchases: 0,
    purchasesCount: 0,
    avgOrderValue: 0,
    totalQtySold: 0,
    trendStatus: 'stable',
    lowStockProducts: 0,
    expiringSoonBatches: 0,
    expiredBatches: 0,
    customersWithReceivables: 0,
    pendingPurchases: 0,
    salesTrend: [],
    topProducts: [],
    recentActivity: []
  });
  const [loading, setLoading] = useState(true);

  const getTodayFormatted = () => {
    const d = new Date();
    const dayName = d.toLocaleDateString(language === 'ar' ? 'ar-EG' : 'en-US', { weekday: 'long' });
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return language === 'ar' ? `${dayName}، ${day}-${month}-${year}` : `${dayName}, ${day}-${month}-${year}`;
  };

  const fetchStats = async () => {
    setLoading(true);
    try {
      const now = new Date();
      let fromDateStr = '';
      let toDateStr = '';
      
      if (filter === 'today') {
        const d = new Date(now); d.setHours(0,0,0,0); fromDateStr = d.toISOString();
      } else if (filter === 'yesterday') {
        const d = new Date(now); d.setDate(d.getDate() - 1); d.setHours(0,0,0,0); fromDateStr = d.toISOString();
        const dEnd = new Date(now); dEnd.setDate(dEnd.getDate() - 1); dEnd.setHours(23,59,59,999); toDateStr = dEnd.toISOString();
      } else if (filter === '7days') {
        const d = new Date(now); d.setDate(d.getDate() - 7); fromDateStr = d.toISOString();
      } else if (filter === '30days') {
        const d = new Date(now); d.setDate(d.getDate() - 30); fromDateStr = d.toISOString();
      } else if (filter === 'thisMonth') {
        const d = new Date(now.getFullYear(), now.getMonth(), 1); fromDateStr = d.toISOString();
      } else if (filter === 'custom') {
        if (customFrom) {
          const dFrom = new Date(customFrom); dFrom.setHours(0,0,0,0); fromDateStr = dFrom.toISOString();
        }
        if (customTo) {
          const dTo = new Date(customTo); dTo.setHours(23,59,59,999); toDateStr = dTo.toISOString();
        }
      }

      // Base queries for counts
      const [
        { count: pCount },
        { count: cCount },
        { count: sCount },
        { count: wCount }
      ] = await Promise.all([
        supabase.from('products').select('*', { count: 'exact', head: true }).eq('active', true),
        supabase.from('customers').select('*', { count: 'exact', head: true }).eq('active', true),
        supabase.from('suppliers').select('*', { count: 'exact', head: true }).eq('active', true),
        supabase.from('warehouses').select('*', { count: 'exact', head: true }).eq('active', true)
      ]);

      // 1. Sales / Orders Query
      let ordersQuery = supabase.from('orders').select('id, order_number, grand_total, created_at, status, payment_status, customer_id (name)').neq('status', 'CANCELLED');
      if (fromDateStr) ordersQuery = ordersQuery.gte('created_at', fromDateStr);
      if (toDateStr) ordersQuery = ordersQuery.lte('created_at', toDateStr);
      const { data: orders } = await ordersQuery;

      let totalSales = 0;
      let totalOrders = 0;
      let salesByDate: Record<string, number> = {};
      
      if (orders) {
        totalOrders = orders.length;
        orders.forEach(o => {
          totalSales += Number(o.grand_total || 0);
          const dateKey = new Date(o.created_at).toLocaleDateString(language === 'ar' ? 'ar-SA' : 'en-US', { month: 'short', day: 'numeric' });
          salesByDate[dateKey] = (salesByDate[dateKey] || 0) + Number(o.grand_total || 0);
        });
      }

      const salesTrend = Object.keys(salesByDate).map(date => ({
        date,
        total: salesByDate[date]
      }));

      // Trend Slope Calculation
      let trendStatus: 'increasing' | 'decreasing' | 'stable' = 'stable';
      if (salesTrend.length >= 2) {
        const mid = Math.floor(salesTrend.length / 2);
        const firstHalf = salesTrend.slice(0, mid).reduce((sum, p) => sum + p.total, 0);
        const secondHalf = salesTrend.slice(mid).reduce((sum, p) => sum + p.total, 0);
        if (secondHalf > firstHalf * 1.05) trendStatus = 'increasing';
        else if (secondHalf < firstHalf * 0.95) trendStatus = 'decreasing';
      }

      // 2. Purchases Query
      const { data: rawPurchases } = await supabase
        .from('purchases')
        .select('*')
        .neq('status', 'CANCELLED');

      const parseDateSafe = (dInput: any): Date | null => {
        if (!dInput) return null;
        if (dInput instanceof Date) return dInput;
        const str = String(dInput);
        if (str.length === 10 && str.includes('-')) {
          const [y, m, d] = str.split('-').map(Number);
          return new Date(y, m - 1, d, 12, 0, 0);
        }
        const parsed = new Date(str);
        return isNaN(parsed.getTime()) ? null : parsed;
      };

      const fromTime = fromDateStr ? parseDateSafe(fromDateStr)?.getTime() || null : null;
      const toTime = toDateStr ? parseDateSafe(toDateStr)?.getTime() || null : null;

      const purchases = (rawPurchases || []).filter((p: any) => {
        const dObj = parseDateSafe(p.purchase_date || p.created_at);
        if (!dObj) return true;
        const t = dObj.getTime();
        if (fromTime && t < fromTime) return false;
        if (toTime && t > toTime) return false;
        return true;
      });

      const totalPurchases = purchases.reduce((sum, p) => sum + Number(p.grand_total ?? p.total ?? p.subtotal ?? 0), 0);

      // 3. Order Items (COGS, Top Products & Total Quantity Sold)
      let orderItemsQuery = supabase.from('order_items').select('quantity, total, products (name, purchase_price)');
      if (orders && orders.length > 0) {
        orderItemsQuery = orderItemsQuery.in('order_id', orders.map(o => o.id));
      } else {
        orderItemsQuery = orderItemsQuery.eq('order_id', '00000000-0000-0000-0000-000000000000');
      }
      const { data: orderItems } = await orderItemsQuery;

      let totalCogs = 0;
      let totalQtySold = 0;
      const productSales: Record<string, number> = {};

      if (orderItems) {
        orderItems.forEach((item: any) => {
          const prod: any = Array.isArray(item.products) ? item.products[0] : item.products;
          const cost = Number(prod?.purchase_price || 0);
          const qty = Number(item.quantity || 0);
          const name = prod?.name || 'Unknown';

          totalCogs += (cost * qty);
          totalQtySold += qty;
          productSales[name] = (productSales[name] || 0) + qty;
        });
      }

      const grossProfit = totalSales - totalCogs;
      const avgOrderValue = totalOrders > 0 ? totalSales / totalOrders : 0;

      const topProducts = Object.keys(productSales)
        .map(name => ({ name, quantity: productSales[name] }))
        .sort((a, b) => b.quantity - a.quantity)
        .slice(0, 5);

      // 4. Expiry & Inventory Alert Counts
      const { data: batches } = await supabase.from('inventory_batches').select('expiry_date, quantity').eq('active', true).gt('quantity', 0);
      let expiredBatches = 0;
      let expiringSoonBatches = 0;
      if (batches) {
        const todayTime = new Date().setHours(0,0,0,0);
        batches.forEach(b => {
          const [yyyy, mm, dd] = b.expiry_date.split('-');
          const expTime = new Date(Number(yyyy), Number(mm) - 1, Number(dd)).setHours(0,0,0,0);
          const diffDays = Math.ceil((expTime - todayTime) / (1000 * 60 * 60 * 24));
          if (diffDays < 0) expiredBatches++;
          else if (diffDays <= 30) expiringSoonBatches++;
        });
      }

      const { count: lowStockProducts } = await supabase.from('products').select('*', { count: 'exact', head: true }).eq('active', true); 

      let customersWithReceivables = 0;
      if (orders) {
        const customersSet = new Set();
        orders.forEach(o => {
          if (o.payment_status === 'UNPAID' || o.payment_status === 'PARTIALLY_PAID') {
            const cust: any = Array.isArray(o.customer_id) ? o.customer_id[0] : o.customer_id;
            if (cust?.name) customersSet.add(cust.name);
          }
        });
        customersWithReceivables = customersSet.size;
      }

      const { data: pendingPurchasesData } = await supabase.from('purchases').select('id').in('status', ['PENDING', 'APPROVED']);
      const pendingPurchases = pendingPurchasesData ? pendingPurchasesData.length : 0;

      // Recent Activity
      const recentActivity: any[] = [];
      if (orders) {
        orders.slice(0, 3).forEach(o => recentActivity.push({
          type: language === 'ar' ? 'فاتورة بيع' : 'Sale Invoice',
          ref: o.order_number,
          date: new Date(o.created_at),
          status: o.status === 'COMPLETED' ? 'مكتملة' : o.status === 'PENDING' ? 'قيد الانتظار' : 'ملغاة'
        }));
      }

      setStats({
        totalSales,
        totalOrders,
        productsCount: pCount || 0,
        customersCount: cCount || 0,
        suppliersCount: sCount || 0,
        warehousesCount: wCount || 0,
        grossProfit,
        totalPurchases,
        purchasesCount: purchases.length,
        avgOrderValue,
        totalQtySold,
        trendStatus,
        lowStockProducts: lowStockProducts || 0,
        expiringSoonBatches,
        expiredBatches,
        customersWithReceivables,
        pendingPurchases,
        salesTrend,
        topProducts,
        recentActivity
      });
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, [filter]);

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat(language === 'ar' ? 'ar-SA' : 'en-US', {
      style: 'currency',
      currency: 'SAR',
      maximumFractionDigits: 0
    }).format(val);
  };

  return (
    <div className={styles.container}>
      {/* Header Bar */}
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>
            {language === 'ar' ? `مرحباً، ${displayName}` : `Welcome back, ${displayName}`} 👋
          </h1>
          {/* Dynamic Date directly under welcome message */}
          <div style={{ fontSize: '0.9rem', color: 'var(--color-primary)', fontWeight: 600, marginTop: '2px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Calendar size={15} />
            {getTodayFormatted()}
          </div>
          <p className={styles.subtitle} style={{ marginTop: '4px' }}>
            {language === 'ar' ? 'إليك نظرة عامة على نشاط النظام والأداء اليومي' : 'Here is your system overview and daily performance'}
          </p>
        </div>

        {/* Upper-Left / Controls Area with Compact Business Summary & Date Filters */}
        <div className={styles.controls} style={{ flexWrap: 'wrap', gap: '12px' }}>
          {/* Period Performance Summary Box */}
          <div className={styles.periodSummaryBox}>
            <div className={styles.periodSummaryHeader}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <TrendingUp size={16} color="var(--color-primary)" style={{ flexShrink: 0 }} />
                <span className={styles.periodSummaryTitle}>
                  {language === 'ar' ? 'ملخص أداء الفترة' : 'Period Performance Summary'}
                </span>
              </div>
              <span className={styles.periodSummaryBadge}>
                {filter === '30days' ? (language === 'ar' ? 'آخر 30 يوم' : 'Last 30 Days') :
                 filter === '7days' ? (language === 'ar' ? 'آخر 7 أيام' : 'Last 7 Days') :
                 filter === 'thisMonth' ? (language === 'ar' ? 'هذا الشهر' : 'This Month') :
                 filter === 'today' ? (language === 'ar' ? 'اليوم' : 'Today') :
                 filter === 'yesterday' ? (language === 'ar' ? 'الأمس' : 'Yesterday') :
                 filter === 'custom' ? (language === 'ar' ? 'فترة مخصصة' : 'Custom') :
                 (language === 'ar' ? 'الكل' : 'All Time')}
              </span>
            </div>

            <div className={styles.periodSummaryGrid}>
              {/* Sales Chip */}
              <div className={styles.periodChip}>
                <span className={styles.periodChipLabel}>
                  {language === 'ar' ? 'المبيعات' : 'Sales'}
                </span>
                <span className={styles.periodChipValueSales}>
                  {formatCurrency(stats.totalSales)}
                </span>
              </div>

              {/* Purchases Chip */}
              <div className={styles.periodChip}>
                <span className={styles.periodChipLabel}>
                  {language === 'ar' ? 'المشتريات' : 'Purchases'}
                </span>
                <span className={styles.periodChipValuePurchases}>
                  {formatCurrency(stats.totalPurchases)}
                </span>
              </div>

              {/* Profit Chip */}
              <div className={styles.periodChip}>
                <span className={styles.periodChipLabel}>
                  {language === 'ar' ? 'صافي الأرباح' : 'Gross Profit'}
                </span>
                <span className={stats.grossProfit >= 0 ? styles.periodChipValueProfitPos : styles.periodChipValueProfitNeg}>
                  {formatCurrency(stats.grossProfit)}
                </span>
              </div>

              {/* Orders Chip */}
              <div className={styles.periodChip}>
                <span className={styles.periodChipLabel}>
                  {language === 'ar' ? 'عدد الطلبات' : 'Orders'}
                </span>
                <span className={styles.periodChipValueOrders}>
                  {stats.totalOrders} {language === 'ar' ? 'طلب' : 'orders'}
                </span>
              </div>
            </div>
          </div>

          {/* Quick Date Filters */}
          <div className={styles.filterGroup}>
            <Calendar size={16} color="var(--color-text-secondary)" />
            <select 
              value={filter} 
              onChange={(e: any) => setFilter(e.target.value)}
              className={styles.filterSelect}
            >
              <option value="today">{language === 'ar' ? 'اليوم' : 'Today'}</option>
              <option value="yesterday">{language === 'ar' ? 'الأمس' : 'Yesterday'}</option>
              <option value="7days">{language === 'ar' ? 'آخر 7 أيام' : 'Last 7 Days'}</option>
              <option value="30days">{language === 'ar' ? 'آخر 30 يوم' : 'Last 30 Days'}</option>
              <option value="thisMonth">{language === 'ar' ? 'هذا الشهر' : 'This Month'}</option>
              <option value="custom">{language === 'ar' ? 'فترة مخصصة' : 'Custom Range'}</option>
              <option value="all">{language === 'ar' ? 'الكل' : 'All Time'}</option>
            </select>
          </div>

          {/* Custom Date Range Picker */}
          {filter === 'custom' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', backgroundColor: 'var(--color-surface)', padding: '6px 12px', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>{language === 'ar' ? 'من:' : 'From:'}</span>
                <input type="date" value={customFrom} onChange={(e) => setCustomFrom(e.target.value)} className="form-input" style={{ padding: '3px 6px', fontSize: '0.8rem' }} />
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>{language === 'ar' ? 'إلى:' : 'To:'}</span>
                <input type="date" value={customTo} onChange={(e) => setCustomTo(e.target.value)} className="form-input" style={{ padding: '3px 6px', fontSize: '0.8rem' }} />
              </div>
              <button onClick={fetchStats} className="btn btn-primary" style={{ padding: '4px 10px', fontSize: '0.8rem' }}>
                {language === 'ar' ? 'تطبيق' : 'Apply'}
              </button>
            </div>
          )}

          <button className={styles.iconBtn} onClick={fetchStats} title="Refresh">
            <RefreshCw size={18} className={loading ? styles.spinning : ''} />
          </button>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className={styles.kpiGrid}>
        
        {/* Card 1: Total Sales */}
        <div className={styles.kpiCard}>
          <div className={styles.kpiIconWrapper} style={{ background: '#10b981' }}>
            <Banknote size={24} />
          </div>
          <div className={styles.kpiInfo}>
            <span className={styles.kpiValue}>{loading ? '...' : formatCurrency(stats.totalSales)}</span>
            <span className={styles.kpiLabel}>{language === 'ar' ? 'إجمالي المبيعات' : 'Total Sales'}</span>
            <span className={`${styles.kpiTrend} ${styles.positive}`}><ArrowUp size={12}/> {language === 'ar' ? 'عن الفترة السابقة' : 'vs previous period'}</span>
          </div>
        </div>

        {/* Card 2: Orders Count */}
        <div className={styles.kpiCard}>
          <div className={styles.kpiIconWrapper} style={{ background: '#8b5cf6' }}>
            <ShoppingBag size={24} />
          </div>
          <div className={styles.kpiInfo}>
            <span className={styles.kpiValue}>{loading ? '...' : stats.totalOrders.toLocaleString()}</span>
            <span className={styles.kpiLabel}>{language === 'ar' ? 'عدد الطلبات' : 'Total Orders'}</span>
            <span className={`${styles.kpiTrend} ${styles.positive}`}><ArrowUp size={12}/> {language === 'ar' ? 'مبيعات نشطة' : 'active orders'}</span>
          </div>
        </div>

        {/* Analytical Card 1: Gross Profit */}
        <div className={styles.kpiCard}>
          <div className={styles.kpiIconWrapper} style={{ background: '#059669' }}>
            <DollarSign size={24} />
          </div>
          <div className={styles.kpiInfo}>
            <span className={styles.kpiValue}>{loading ? '...' : formatCurrency(stats.grossProfit)}</span>
            <span className={styles.kpiLabel}>{language === 'ar' ? 'إجمالي الأرباح' : 'Gross Profit'}</span>
            <span className={`${styles.kpiTrend} ${stats.grossProfit >= 0 ? styles.positive : styles.negative}`}>
              {stats.grossProfit >= 0 ? <ArrowUp size={12}/> : <ArrowDown size={12}/>} {language === 'ar' ? 'الربح الإجمالي' : 'Gross Margin'}
            </span>
          </div>
        </div>

        {/* Analytical Card 2: Total Purchases */}
        <div className={styles.kpiCard}>
          <div className={styles.kpiIconWrapper} style={{ background: '#2563eb' }}>
            <TrendingDown size={24} />
          </div>
          <div className={styles.kpiInfo}>
            <span className={styles.kpiValue}>{loading ? '...' : formatCurrency(stats.totalPurchases)}</span>
            <span className={styles.kpiLabel}>{language === 'ar' ? 'إجمالي المشتريات' : 'Total Purchases'}</span>
            <span className={`${styles.kpiTrend} ${styles.neutral}`}>
              {language === 'ar' ? `عدد الفواتير: ${stats.purchasesCount}` : `Invoices: ${stats.purchasesCount}`}
            </span>
          </div>
        </div>

        {/* Analytical Card 3: Average Order Value (AOV) */}
        <div className={styles.kpiCard}>
          <div className={styles.kpiIconWrapper} style={{ background: '#d97706' }}>
            <BarChart3 size={24} />
          </div>
          <div className={styles.kpiInfo}>
            <span className={styles.kpiValue}>{loading ? '...' : formatCurrency(stats.avgOrderValue)}</span>
            <span className={styles.kpiLabel}>{language === 'ar' ? 'متوسط قيمة الطلب' : 'Average Order Value'}</span>
            <span className={`${styles.kpiTrend} ${styles.positive}`}><ArrowUp size={12}/> {language === 'ar' ? 'لكل فاتورة' : 'per invoice'}</span>
          </div>
        </div>

        {/* Analytical Card 4: Total Quantity Sold */}
        <div className={styles.kpiCard}>
          <div className={styles.kpiIconWrapper} style={{ background: '#7c3aed' }}>
            <Layers size={24} />
          </div>
          <div className={styles.kpiInfo}>
            <span className={styles.kpiValue}>{loading ? '...' : stats.totalQtySold.toLocaleString()}</span>
            <span className={styles.kpiLabel}>{language === 'ar' ? 'إجمالي الكميات المباعة' : 'Total Quantity Sold'}</span>
            <span className={`${styles.kpiTrend} ${styles.positive}`}>{language === 'ar' ? 'وحدة مباعة' : 'units sold'}</span>
          </div>
        </div>

        {/* Customers */}
        <div className={styles.kpiCard}>
          <div className={styles.kpiIconWrapper} style={{ background: '#10b981' }}>
            <Users size={24} />
          </div>
          <div className={styles.kpiInfo}>
            <span className={styles.kpiValue}>{loading ? '...' : stats.customersCount}</span>
            <span className={styles.kpiLabel}>{language === 'ar' ? 'العملاء' : 'Customers'}</span>
            <span className={`${styles.kpiTrend} ${styles.neutral}`}>{language === 'ar' ? 'عملاء نشطون' : 'active customers'}</span>
          </div>
        </div>

        {/* Products */}
        <div className={styles.kpiCard}>
          <div className={styles.kpiIconWrapper} style={{ background: '#3b82f6' }}>
            <Package size={24} />
          </div>
          <div className={styles.kpiInfo}>
            <span className={styles.kpiValue}>{loading ? '...' : stats.productsCount}</span>
            <span className={styles.kpiLabel}>{language === 'ar' ? 'المنتجات' : 'Products'}</span>
            <span className={`${styles.kpiTrend} ${styles.neutral}`}>{language === 'ar' ? 'دليل المنتجات' : 'catalog items'}</span>
          </div>
        </div>

        {/* Warehouses */}
        <div className={styles.kpiCard}>
          <div className={styles.kpiIconWrapper} style={{ background: '#f59e0b' }}>
            <MapPin size={24} />
          </div>
          <div className={styles.kpiInfo}>
            <span className={styles.kpiValue}>{loading ? '...' : stats.warehousesCount}</span>
            <span className={styles.kpiLabel}>{language === 'ar' ? 'المستودعات' : 'Warehouses'}</span>
            <span className={`${styles.kpiTrend} ${styles.neutral}`}>{language === 'ar' ? 'مستودعات الفروع' : 'branch warehouses'}</span>
          </div>
        </div>

        {/* Suppliers */}
        <div className={styles.kpiCard}>
          <div className={styles.kpiIconWrapper} style={{ background: '#8b5cf6' }}>
            <Factory size={24} />
          </div>
          <div className={styles.kpiInfo}>
            <span className={styles.kpiValue}>{loading ? '...' : stats.suppliersCount}</span>
            <span className={styles.kpiLabel}>{language === 'ar' ? 'الموردون' : 'Suppliers'}</span>
            <span className={`${styles.kpiTrend} ${styles.positive}`}><ArrowUp size={12}/> {language === 'ar' ? 'موردون معتمدون' : 'approved suppliers'}</span>
          </div>
        </div>

      </div>

      {/* Main Charts Row */}
      <div className={styles.chartsGrid}>
        
        {/* Sales Trend Line Chart */}
        <div className={styles.cardSection}>
          <div className={styles.sectionHeader} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h2 className={styles.sectionTitle} style={{ margin: 0 }}>
              <TrendingUp size={20} color="#10b981" />
              {language === 'ar' ? 'مبيعات آخر فترة' : 'Sales Trend'}
            </h2>
            {stats.salesTrend.length > 0 && (
              <span style={{ 
                fontSize: '0.75rem', 
                padding: '3px 8px', 
                borderRadius: '12px', 
                fontWeight: 600,
                backgroundColor: stats.trendStatus === 'increasing' ? 'rgba(16, 185, 129, 0.15)' : stats.trendStatus === 'decreasing' ? 'rgba(239, 68, 68, 0.15)' : 'var(--color-surface-hover)',
                color: stats.trendStatus === 'increasing' ? '#059669' : stats.trendStatus === 'decreasing' ? '#dc2626' : 'var(--color-text-secondary)',
                display: 'flex', alignItems: 'center', gap: '4px'
              }}>
                {stats.trendStatus === 'increasing' && <><ArrowUp size={12} /> {language === 'ar' ? 'اتجاه تصاعدي' : 'Increasing'}</>}
                {stats.trendStatus === 'decreasing' && <><ArrowDown size={12} /> {language === 'ar' ? 'اتجاه تنازلي' : 'Decreasing'}</>}
                {stats.trendStatus === 'stable' && <><Minus size={12} /> {language === 'ar' ? 'مستقر' : 'Stable'}</>}
              </span>
            )}
          </div>
          <div className={styles.chartContainer}>
            {stats.salesTrend.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={stats.salesTrend} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={isDark ? '#334155' : '#e5e7eb'} />
                  <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: isDark ? '#94a3b8' : '#6b7280' }} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: isDark ? '#94a3b8' : '#6b7280' }} tickFormatter={(val) => val >= 1000 ? `${(val/1000).toFixed(1)}k` : val} />
                  <Tooltip 
                    contentStyle={isDark ? { backgroundColor: '#1e293b', borderColor: '#334155', color: '#f8fafc', borderRadius: '8px' } : { borderRadius: '8px' }}
                    itemStyle={isDark ? { color: '#34d399' } : undefined}
                    formatter={(value: any) => formatCurrency(Number(value))} 
                  />
                  <Line type="monotone" dataKey="total" stroke="#10b981" strokeWidth={3} dot={{ r: 4, fill: '#10b981', strokeWidth: 2, stroke: isDark ? '#1e293b' : 'white' }} activeDot={{ r: 6 }} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className={styles.emptyState}>
                <TrendingUp size={48} opacity={0.2} />
                <span>{language === 'ar' ? 'لا توجد بيانات مبيعات لهذه الفترة' : 'No sales data for this period'}</span>
              </div>
            )}
          </div>
        </div>

        {/* Top Selling Products */}
        <div className={styles.cardSection}>
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>
              <TrendingUp size={20} color="#3b82f6" />
              {language === 'ar' ? 'أكثر المنتجات مبيعاً' : 'Top Selling Products'}
            </h2>
          </div>
          <div className={styles.chartContainer}>
            {stats.topProducts.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats.topProducts} layout="vertical" margin={{ top: 5, right: 30, left: 60, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke={isDark ? '#334155' : '#e5e7eb'} />
                  <XAxis type="number" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: isDark ? '#94a3b8' : '#6b7280' }} />
                  <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: isDark ? '#e2e8f0' : '#374151', width: 60 }} width={80} />
                  <Tooltip 
                    contentStyle={isDark ? { backgroundColor: '#1e293b', borderColor: '#334155', color: '#f8fafc', borderRadius: '8px' } : { borderRadius: '8px' }}
                    itemStyle={isDark ? { color: '#f8fafc' } : undefined}
                  />
                  <Bar dataKey="quantity" radius={[0, 4, 4, 0]} barSize={20}>
                    {stats.topProducts.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={['#10b981', '#3b82f6', '#8b5cf6', '#ea580c', '#eab308'][index % 5]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className={styles.emptyState}>
                <Package size={48} opacity={0.2} />
                <span>{language === 'ar' ? 'لا توجد بيانات منتجات' : 'No product data available'}</span>
              </div>
            )}
          </div>
        </div>

      </div>

      {/* Business Analytics Row: Inventory Analytics & Customer Analytics */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem', marginTop: '0.5rem' }}>
        
        {/* Inventory Analytics */}
        <div className={styles.cardSection}>
          <div className={styles.sectionHeader} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Package size={20} color="var(--color-primary)" />
            <h2 className={styles.sectionTitle} style={{ margin: 0 }}>
              {language === 'ar' ? 'تحليلات المخزون والصلاحية' : 'Inventory & Stock Analytics'}
            </h2>
          </div>
          <div style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div style={{ padding: '12px', borderRadius: '8px', backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>{language === 'ar' ? 'دفعة منتهية الصلاحية' : 'Expired Batches'}</div>
                <div style={{ fontSize: '1.25rem', fontWeight: 700, color: stats.expiredBatches > 0 ? (isDark ? '#f87171' : '#dc2626') : (isDark ? '#ffffff' : 'var(--color-text-primary)'), marginTop: '4px' }}>
                  {stats.expiredBatches}
                </div>
              </div>
              <div style={{ padding: '12px', borderRadius: '8px', backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>{language === 'ar' ? 'تنتهي خلال 30 يوم' : 'Expiring in 30 Days'}</div>
                <div style={{ fontSize: '1.25rem', fontWeight: 700, color: stats.expiringSoonBatches > 0 ? (isDark ? '#fbbf24' : '#d97706') : (isDark ? '#ffffff' : 'var(--color-text-primary)'), marginTop: '4px' }}>
                  {stats.expiringSoonBatches}
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px', borderRadius: '8px', backgroundColor: isDark ? 'rgba(59, 130, 246, 0.12)' : 'rgba(59, 130, 246, 0.08)', border: isDark ? '1px solid rgba(59, 130, 246, 0.3)' : '1px solid rgba(59, 130, 246, 0.2)' }}>
              <span style={{ fontSize: '0.85rem', fontWeight: 500, color: isDark ? '#f8fafc' : 'inherit' }}>{language === 'ar' ? 'المنتجات المسجلة بالمخزن' : 'Registered Products in Inventory'}</span>
              <span style={{ fontWeight: 700, color: isDark ? '#60a5fa' : '#2563eb' }}>{stats.productsCount}</span>
            </div>
          </div>
        </div>

        {/* Customer Analytics */}
        <div className={styles.cardSection}>
          <div className={styles.sectionHeader} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Users size={20} color="#8b5cf6" />
            <h2 className={styles.sectionTitle} style={{ margin: 0 }}>
              {language === 'ar' ? 'تحليلات العملاء والمستحقات' : 'Customer & Receivables Analytics'}
            </h2>
          </div>
          <div style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div style={{ padding: '12px', borderRadius: '8px', backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>{language === 'ar' ? 'إجمالي العملاء' : 'Total Active Customers'}</div>
                <div style={{ fontSize: '1.25rem', fontWeight: 700, color: isDark ? '#34d399' : '#10b981', marginTop: '4px' }}>
                  {stats.customersCount}
                </div>
              </div>
              <div style={{ padding: '12px', borderRadius: '8px', backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>{language === 'ar' ? 'عملاء عليهم مستحقات' : 'Customers with Receivables'}</div>
                <div style={{ fontSize: '1.25rem', fontWeight: 700, color: stats.customersWithReceivables > 0 ? (isDark ? '#fbbf24' : '#d97706') : (isDark ? '#ffffff' : 'var(--color-text-primary)'), marginTop: '4px' }}>
                  {stats.customersWithReceivables}
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px', borderRadius: '8px', backgroundColor: isDark ? 'rgba(139, 92, 246, 0.12)' : 'rgba(139, 92, 246, 0.08)', border: isDark ? '1px solid rgba(139, 92, 246, 0.3)' : '1px solid rgba(139, 92, 246, 0.2)' }}>
              <span style={{ fontSize: '0.85rem', fontWeight: 500, color: isDark ? '#f8fafc' : 'inherit' }}>{language === 'ar' ? 'معدل الطلب للعميل' : 'Orders per Active Customer'}</span>
              <span style={{ fontWeight: 700, color: isDark ? '#a78bfa' : '#7c3aed' }}>
                {stats.customersCount > 0 ? (stats.totalOrders / stats.customersCount).toFixed(1) : 0}
              </span>
            </div>
          </div>
        </div>

      </div>

    </div>
  );
};

export default Dashboard;
