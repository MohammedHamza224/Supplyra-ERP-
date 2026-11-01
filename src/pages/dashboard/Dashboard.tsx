import React, { useEffect, useState, useMemo } from 'react';
import { 
  Package, Users, Factory, MapPin, Calendar, RefreshCw, 
  Printer, FileText, Banknote, ShoppingBag,
  TrendingUp, TrendingDown, Clock, ArrowUp, ArrowDown, Minus, CheckCircle,
  DollarSign, BarChart3, Layers, Filter, Search, X, RotateCcw, Eye, ChevronLeft, ChevronRight, ExternalLink
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useTranslation } from '../../contexts/LanguageContext';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { useDebounce } from '../../hooks/useDebounce';
import SaleDetails from '../sales/SaleDetails';
import styles from './Dashboard.module.css';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, Cell
} from 'recharts';

export type DashboardDateFilter = 
  | 'today' 
  | 'yesterday' 
  | '7days' 
  | '30days' 
  | 'thisMonth' 
  | 'lastMonth' 
  | 'thisYear' 
  | 'custom' 
  | 'all';

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
  const isRtl = language === 'ar';
  const { profile, user } = useAuth();
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const navigate = useNavigate();
  const displayName = profile?.first_name ? `${profile.first_name}${profile.last_name ? ` ${profile.last_name}` : ''}` : user?.email?.split('@')[0] || 'User';
  
  // Controls & Filter States
  const [filter, setFilter] = useState<DashboardDateFilter>('30days');
  const [customFrom, setCustomFrom] = useState<string>(() => {
    const d = new Date();
    d.setDate(1);
    return d.toISOString().split('T')[0];
  });
  const [customTo, setCustomTo] = useState<string>(() => new Date().toISOString().split('T')[0]);
  
  const [searchQuery, setSearchQuery] = useState('');
  const debouncedSearch = useDebounce(searchQuery, 300);
  const [statusFilter, setStatusFilter] = useState<'all' | 'PAID' | 'UNPAID' | 'DRAFT'>('all');
  
  // Raw Data & Table Pagination States
  const [rawOrders, setRawOrders] = useState<any[]>([]);
  const [tablePage, setTablePage] = useState(1);
  const pageSize = 7;
  const [viewingSaleId, setViewingSaleId] = useState<string | null>(null);

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

  const getDateFilterLabel = (f: DashboardDateFilter) => {
    switch (f) {
      case 'today': return isRtl ? 'اليوم' : 'Today';
      case 'yesterday': return isRtl ? 'الأمس' : 'Yesterday';
      case '7days': return isRtl ? 'آخر 7 أيام' : 'Last 7 Days';
      case '30days': return isRtl ? 'آخر 30 يوم' : 'Last 30 Days';
      case 'thisMonth': return isRtl ? 'هذا الشهر' : 'This Month';
      case 'lastMonth': return isRtl ? 'الشهر السابق' : 'Last Month';
      case 'thisYear': return isRtl ? 'هذا العام' : 'This Year';
      case 'custom': return isRtl ? 'فترة مخصصة' : 'Custom Range';
      case 'all': return isRtl ? 'كافة الفترات' : 'All Time';
      default: return f;
    }
  };

  const fetchStats = async () => {
    setLoading(true);
    try {
      const now = new Date();
      let fromDateStr = '';
      let toDateStr = '';
      
      if (filter === 'today') {
        const d = new Date(now); d.setHours(0,0,0,0); fromDateStr = d.toISOString();
        const dEnd = new Date(now); dEnd.setHours(23,59,59,999); toDateStr = dEnd.toISOString();
      } else if (filter === 'yesterday') {
        const d = new Date(now); d.setDate(d.getDate() - 1); d.setHours(0,0,0,0); fromDateStr = d.toISOString();
        const dEnd = new Date(now); dEnd.setDate(dEnd.getDate() - 1); dEnd.setHours(23,59,59,999); toDateStr = dEnd.toISOString();
      } else if (filter === '7days') {
        const d = new Date(now); d.setDate(d.getDate() - 7); d.setHours(0,0,0,0); fromDateStr = d.toISOString();
      } else if (filter === '30days') {
        const d = new Date(now); d.setDate(d.getDate() - 30); d.setHours(0,0,0,0); fromDateStr = d.toISOString();
      } else if (filter === 'thisMonth') {
        const d = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0); fromDateStr = d.toISOString();
      } else if (filter === 'lastMonth') {
        const dFrom = new Date(now.getFullYear(), now.getMonth() - 1, 1, 0, 0, 0); fromDateStr = dFrom.toISOString();
        const dTo = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999); toDateStr = dTo.toISOString();
      } else if (filter === 'thisYear') {
        const d = new Date(now.getFullYear(), 0, 1, 0, 0, 0); fromDateStr = d.toISOString();
      } else if (filter === 'custom') {
        if (customFrom) {
          const dFrom = new Date(customFrom); dFrom.setHours(0,0,0,0); fromDateStr = dFrom.toISOString();
        }
        if (customTo) {
          const dTo = new Date(customTo); dTo.setHours(23,59,59,999); toDateStr = dTo.toISOString();
        }
      }

      // Base queries for master counts
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

      // 1. Sales / Orders Query (Filtered by Date Range)
      let ordersQuery = supabase
        .from('orders')
        .select(`
          id, 
          order_number, 
          total_amount, 
          grand_total,
          tax,
          discount,
          created_at, 
          status, 
          payment_status, 
          customer_id,
          customer:customers(name, phone)
        `)
        .neq('status', 'cancelled')
        .neq('status', 'CANCELLED')
        .order('created_at', { ascending: false });

      if (fromDateStr) ordersQuery = ordersQuery.gte('created_at', fromDateStr);
      if (toDateStr) ordersQuery = ordersQuery.lte('created_at', toDateStr);
      const { data: orders } = await ordersQuery;

      setRawOrders(orders || []);
      setTablePage(1);

      let totalSales = 0;
      let totalOrders = 0;
      let salesByDate: Record<string, number> = {};
      
      if (orders) {
        totalOrders = orders.length;
        orders.forEach(o => {
          const val = Number((o as any).grand_total ?? (o as any).total_amount ?? 0);
          totalSales += val;
          const dateKey = new Date(o.created_at).toLocaleDateString(language === 'ar' ? 'ar-SA' : 'en-US', { month: 'short', day: 'numeric' });
          salesByDate[dateKey] = (salesByDate[dateKey] || 0) + val;
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

      // 2. Purchases Query (Filtered by Date Range)
      const { data: rawPurchases } = await supabase
        .from('purchases')
        .select('*')
        .neq('status', 'cancelled')
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
        const dObj = parseDateSafe(p.purchase_date || p.issue_date || p.created_at);
        if (!dObj) return true;
        const t = dObj.getTime();
        if (fromTime && t < fromTime) return false;
        if (toTime && t > toTime) return false;
        return true;
      });

      const totalPurchases = purchases.reduce((sum, p) => sum + Number((p as any).grand_total ?? (p as any).total_amount ?? (p as any).total ?? (p as any).subtotal ?? 0), 0);

      // 3. Order Items (COGS, Top Products & Total Quantity Sold)
      let orderItemsQuery = supabase.from('order_items').select('quantity, subtotal, product:products(name, purchase_price)');
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
          const prod: any = Array.isArray(item.product) ? item.product[0] : item.product;
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
      const { data: batches } = await supabase
        .from('inventory_batches')
        .select('expiry_date, quantity')
        .gt('quantity', 0);

      let expiredBatches = 0;
      let expiringSoonBatches = 0;
      if (batches) {
        const todayTime = new Date().setHours(0,0,0,0);
        batches.forEach(b => {
          if (!b.expiry_date) return;
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
          const pStatus = (o.payment_status || '').toUpperCase();
          if (pStatus === 'UNPAID' || pStatus === 'PARTIALLY_PAID') {
            const cust: any = Array.isArray(o.customer) ? o.customer[0] : o.customer;
            if (cust?.name) customersSet.add(cust.name);
          }
        });
        customersWithReceivables = customersSet.size;
      }

      const { data: pendingPurchasesData } = await supabase
        .from('purchases')
        .select('id')
        .in('status', ['pending', 'PENDING', 'draft', 'DRAFT']);
      const pendingPurchases = pendingPurchasesData ? pendingPurchasesData.length : 0;

      // Recent Activity
      const recentActivity: any[] = [];
      if (orders) {
        orders.slice(0, 5).forEach(o => {
          const st = (o.status || '').toUpperCase();
          recentActivity.push({
            type: language === 'ar' ? 'فاتورة بيع' : 'Sale Invoice',
            ref: o.order_number,
            date: new Date(o.created_at),
            status: st === 'CONFIRMED' || st === 'DELIVERED' ? 'مكتملة' : st === 'DRAFT' ? 'مسودة' : 'ملغاة'
          });
        });
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

  // Real-time In-memory Filtered Orders for the Analysis Table
  const filteredOrders = useMemo(() => {
    const q = debouncedSearch.trim().toLowerCase();
    return rawOrders.filter(o => {
      // 1. Search filter across order_number, customer name, phone, and amount
      const matchesSearch = !q ||
        (o.order_number && o.order_number.toLowerCase().includes(q)) ||
        (o.customer?.name && o.customer.name.toLowerCase().includes(q)) ||
        (o.customer?.phone && o.customer.phone.includes(q)) ||
        (String(o.grand_total || o.total_amount || '').includes(q));

      // 2. Status filter
      let matchesStatus = true;
      if (statusFilter === 'PAID') {
        matchesStatus = (o.payment_status || '').toUpperCase() === 'PAID';
      } else if (statusFilter === 'UNPAID') {
        const ps = (o.payment_status || '').toUpperCase();
        matchesStatus = ps === 'UNPAID' || ps === 'PARTIALLY_PAID';
      } else if (statusFilter === 'DRAFT') {
        matchesStatus = (o.status || '').toUpperCase() === 'DRAFT';
      }

      return matchesSearch && matchesStatus;
    });
  }, [rawOrders, debouncedSearch, statusFilter]);

  // Reset pagination on filter or search changes
  useEffect(() => {
    setTablePage(1);
  }, [debouncedSearch, statusFilter, filter]);

  const totalPages = Math.max(1, Math.ceil(filteredOrders.length / pageSize));
  const paginatedOrders = useMemo(() => {
    return filteredOrders.slice((tablePage - 1) * pageSize, tablePage * pageSize);
  }, [filteredOrders, tablePage]);

  const handleResetFilters = () => {
    setSearchQuery('');
    setStatusFilter('all');
    setFilter('30days');
    setTablePage(1);
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat(language === 'ar' ? 'ar-SA' : 'en-US', {
      style: 'currency',
      currency: 'SAR',
      maximumFractionDigits: 0
    }).format(val);
  };

  return (
    <div className={styles.container}>
      
      {/* 1. Header Bar: Welcome, Date, Subtitle & Executive Actions */}
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>
            {language === 'ar' ? `مرحباً، ${displayName}` : `Welcome back, ${displayName}`} 👋
          </h1>
          <div style={{ fontSize: '0.875rem', color: 'var(--color-primary)', fontWeight: 600, marginTop: '3px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Calendar size={15} />
            {getTodayFormatted()}
          </div>
          <p className={styles.subtitle} style={{ marginTop: '4px' }}>
            {language === 'ar' ? 'لوحة التحكم التنفيذية — نظرة عامة شاملة على أداء المبيعات والمخزون والعمليات' : 'Executive Dashboard — Comprehensive overview of sales, inventory and operational performance'}
          </p>
        </div>

        {/* Quick Action Buttons */}
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <button 
            type="button"
            className="btn btn-secondary" 
            onClick={fetchStats}
            title={language === 'ar' ? 'تحديث البيانات' : 'Refresh Data'}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '0.8125rem', minHeight: '38px', padding: '0 14px' }}
          >
            <RefreshCw size={15} className={loading ? styles.spinning : ''} />
            <span>{language === 'ar' ? 'تحديث' : 'Refresh'}</span>
          </button>
          <button 
            type="button"
            className="btn btn-secondary" 
            onClick={() => window.print()}
            title={language === 'ar' ? 'طباعة ملخص اللوحة' : 'Print Summary'}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '0.8125rem', minHeight: '38px', padding: '0 14px' }}
          >
            <Printer size={15} />
            <span>{language === 'ar' ? 'طباعة' : 'Print'}</span>
          </button>
        </div>
      </div>

      {/* 2. KPI Cards Grid (10 Core Business Indicators) */}
      <div className={styles.kpiGrid}>
        
        {/* Card 1: Total Sales */}
        <div className={styles.kpiCard}>
          <div className={styles.kpiIconWrapper} style={{ background: '#10b981' }}>
            <Banknote size={24} />
          </div>
          <div className={styles.kpiInfo}>
            <span className={styles.kpiValue}>{loading ? '...' : formatCurrency(stats.totalSales)}</span>
            <span className={styles.kpiLabel}>{language === 'ar' ? 'إجمالي المبيعات' : 'Total Sales'}</span>
            <span className={`${styles.kpiTrend} ${styles.positive}`}><ArrowUp size={12}/> {language === 'ar' ? 'عن الفترة المحددة' : 'vs selected period'}</span>
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

      {/* 3. Executive Analytics Section: Analysis Table + Side Controls Panel */}
      <div className={styles.analyticsSection}>
        
        {/* Main Analysis Table Area (~70% width, positioned right in RTL) */}
        <div className={styles.tableMainArea}>
          <div className={styles.tableHeaderBar}>
            <div className={styles.tableTitleArea}>
              <FileText size={20} color="var(--color-primary)" />
              <h2 className={styles.tableMainTitle}>
                {language === 'ar' ? 'جدول تحليل العمليات والطلبات' : 'Executive Transactions Analysis'}
              </h2>
              <span className={styles.tableCountBadge}>
                {filteredOrders.length} {language === 'ar' ? 'معاملة' : 'records'}
              </span>
            </div>

            <Link to="/sales" className={styles.viewAllLink}>
              <span>{language === 'ar' ? 'عرض كافة المبيعات' : 'View all sales'}</span>
              {isRtl ? <ChevronLeft size={16} /> : <ChevronRight size={16} />}
            </Link>
          </div>

          {/* Desktop Table View */}
          <div className="desktop-table-view table-responsive">
            <table style={{ width: '100%', minWidth: '720px', borderCollapse: 'collapse', textAlign: isRtl ? 'right' : 'left' }}>
              <thead style={{ backgroundColor: 'var(--color-background)', borderBottom: '2px solid var(--color-border)' }}>
                <tr>
                  <th style={{ padding: '10px 14px', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--color-text-secondary)', whiteSpace: 'nowrap' }}>
                    {language === 'ar' ? 'رقم المعاملة' : 'Order #'}
                  </th>
                  <th style={{ padding: '10px 14px', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--color-text-secondary)' }}>
                    {language === 'ar' ? 'العميل' : 'Customer'}
                  </th>
                  <th style={{ padding: '10px 14px', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--color-text-secondary)', whiteSpace: 'nowrap' }}>
                    {language === 'ar' ? 'التاريخ' : 'Date'}
                  </th>
                  <th style={{ padding: '10px 14px', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--color-text-secondary)', whiteSpace: 'nowrap', textAlign: isRtl ? 'left' : 'right' }}>
                    {language === 'ar' ? 'الإجمالي' : 'Amount'}
                  </th>
                  <th style={{ padding: '10px 14px', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--color-text-secondary)', whiteSpace: 'nowrap' }}>
                    {language === 'ar' ? 'حالة الدفع' : 'Payment'}
                  </th>
                  <th style={{ padding: '10px 14px', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--color-text-secondary)', whiteSpace: 'nowrap' }}>
                    {language === 'ar' ? 'الحالة' : 'Status'}
                  </th>
                  <th style={{ padding: '10px 14px', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--color-text-secondary)', whiteSpace: 'nowrap', textAlign: isRtl ? 'left' : 'right' }}>
                    {language === 'ar' ? 'معاينة' : 'Action'}
                  </th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={7} style={{ padding: '32px 16px', textAlign: 'center', color: 'var(--color-text-secondary)' }}>
                      {language === 'ar' ? 'جاري تحميل العمليات...' : 'Loading transactions...'}
                    </td>
                  </tr>
                ) : filteredOrders.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{ padding: '36px 16px', textAlign: 'center', color: 'var(--color-text-muted)' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                        <Search size={32} style={{ opacity: 0.3 }} />
                        <span style={{ fontSize: '0.9rem', fontWeight: 500 }}>
                          {language === 'ar' ? 'لا توجد معاملات مطابقة لمعايير البحث أو الفترة المحددة' : 'No transactions found matching current filters'}
                        </span>
                        {(searchQuery || statusFilter !== 'all' || filter !== '30days') && (
                          <button 
                            type="button"
                            onClick={handleResetFilters}
                            className="btn btn-secondary"
                            style={{ marginTop: '6px', fontSize: '0.8rem', padding: '4px 12px' }}
                          >
                            {language === 'ar' ? 'إعادة ضبط أدوات البحث والفلاتر' : 'Reset search and filters'}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ) : (
                  paginatedOrders.map(order => {
                    const amount = Number(order.grand_total ?? order.total_amount ?? 0);
                    const isPaid = (order.payment_status || '').toUpperCase() === 'PAID';
                    const isConfirmed = (order.status || '').toUpperCase() === 'CONFIRMED' || (order.status || '').toUpperCase() === 'DELIVERED';

                    return (
                      <tr key={order.id} style={{ borderBottom: '1px solid var(--color-border)', transition: 'background-color 0.15s ease' }}>
                        <td style={{ padding: '10px 14px', whiteSpace: 'nowrap' }}>
                          <span style={{ 
                            fontSize: '0.78rem', 
                            fontFamily: 'monospace', 
                            backgroundColor: 'var(--color-background)', 
                            border: '1px solid var(--color-border)', 
                            padding: '3px 8px', 
                            borderRadius: '4px',
                            fontWeight: 600,
                            color: 'var(--color-primary)'
                          }}>
                            {order.order_number || '-'}
                          </span>
                        </td>
                        <td style={{ padding: '10px 14px' }}>
                          <div style={{ fontWeight: 600, fontSize: '0.85rem', color: 'var(--color-text-primary)' }}>
                            {order.customer?.name || (language === 'ar' ? 'عميل نقدي' : 'Walk-in Customer')}
                          </div>
                          {order.customer?.phone && (
                            <div style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)' }}>
                              {order.customer.phone}
                            </div>
                          )}
                        </td>
                        <td style={{ padding: '10px 14px', fontSize: '0.8rem', color: 'var(--color-text-secondary)', whiteSpace: 'nowrap' }}>
                          {new Date(order.created_at).toLocaleDateString(language === 'ar' ? 'ar-SA' : 'en-US', {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric'
                          })}
                        </td>
                        <td style={{ padding: '10px 14px', textAlign: isRtl ? 'left' : 'right', whiteSpace: 'nowrap' }}>
                          <span style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--color-text-primary)' }}>
                            {formatCurrency(amount)}
                          </span>
                        </td>
                        <td style={{ padding: '10px 14px', whiteSpace: 'nowrap' }}>
                          {isPaid ? (
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '2px 8px', borderRadius: '12px', fontSize: '0.72rem', fontWeight: 600, backgroundColor: 'rgba(16, 185, 129, 0.1)', color: 'rgb(16, 185, 129)' }}>
                              <CheckCircle size={12} /> {language === 'ar' ? 'مدفوعة' : 'Paid'}
                            </span>
                          ) : (
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '2px 8px', borderRadius: '12px', fontSize: '0.72rem', fontWeight: 600, backgroundColor: 'rgba(245, 158, 11, 0.1)', color: 'rgb(217, 119, 6)' }}>
                              <Clock size={12} /> {language === 'ar' ? 'بانتظار التحصيل' : 'Unpaid'}
                            </span>
                          )}
                        </td>
                        <td style={{ padding: '10px 14px', whiteSpace: 'nowrap' }}>
                          <span style={{ 
                            display: 'inline-flex', 
                            alignItems: 'center', 
                            padding: '2px 8px', 
                            borderRadius: '12px', 
                            fontSize: '0.72rem', 
                            fontWeight: 600, 
                            backgroundColor: isConfirmed ? 'rgba(59, 130, 246, 0.1)' : 'var(--color-surface-hover)', 
                            color: isConfirmed ? '#2563eb' : 'var(--color-text-secondary)', 
                            border: '1px solid var(--color-border)' 
                          }}>
                            {isConfirmed ? (language === 'ar' ? 'مؤكدة' : 'Confirmed') : (order.status || '-')}
                          </span>
                        </td>
                        <td style={{ padding: '8px 14px', textAlign: isRtl ? 'left' : 'right', whiteSpace: 'nowrap' }}>
                          <button
                            type="button"
                            onClick={() => setViewingSaleId(order.id)}
                            title={language === 'ar' ? 'عرض تفاصيل الفاتورة' : 'View invoice details'}
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              width: '32px',
                              height: '32px',
                              borderRadius: '6px',
                              border: '1px solid var(--color-border)',
                              backgroundColor: 'var(--color-surface)',
                              color: 'var(--color-primary)',
                              cursor: 'pointer',
                              transition: 'all 0.15s ease'
                            }}
                          >
                            <Eye size={15} />
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Mobile Cards View (< 768px) */}
          <div className="mobile-cards-view" style={{ flexDirection: 'column', gap: '10px', padding: '12px' }}>
            {filteredOrders.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '24px 16px', color: 'var(--color-text-muted)' }}>
                {language === 'ar' ? 'لا توجد معاملات مطابقة للبحث أو الفترة' : 'No matching transactions'}
              </div>
            ) : (
              paginatedOrders.map(order => {
                const amount = Number(order.grand_total ?? order.total_amount ?? 0);
                const isPaid = (order.payment_status || '').toUpperCase() === 'PAID';

                return (
                  <div
                    key={`mob-order-${order.id}`}
                    style={{
                      backgroundColor: 'var(--color-surface)',
                      border: '1px solid var(--color-border)',
                      borderRadius: '10px',
                      padding: '12px 14px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '8px',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '0.75rem', fontFamily: 'monospace', backgroundColor: 'var(--color-background)', border: '1px solid var(--color-border)', padding: '2px 6px', borderRadius: '4px', fontWeight: 600, color: 'var(--color-primary)' }}>
                        {order.order_number}
                      </span>
                      {isPaid ? (
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', padding: '1px 7px', borderRadius: '10px', fontSize: '0.7rem', fontWeight: 600, backgroundColor: 'rgba(16, 185, 129, 0.1)', color: 'rgb(16, 185, 129)' }}>
                          <CheckCircle size={11} /> {language === 'ar' ? 'مدفوعة' : 'Paid'}
                        </span>
                      ) : (
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', padding: '1px 7px', borderRadius: '10px', fontSize: '0.7rem', fontWeight: 600, backgroundColor: 'rgba(245, 158, 11, 0.1)', color: 'rgb(217, 119, 6)' }}>
                          <Clock size={11} /> {language === 'ar' ? 'بانتظار التحصيل' : 'Unpaid'}
                        </span>
                      )}
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>
                        {order.customer?.name || (language === 'ar' ? 'عميل نقدي' : 'Walk-in')}
                      </div>
                      <div style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--color-primary)' }}>
                        {formatCurrency(amount)}
                      </div>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px dashed var(--color-border)', paddingTop: '6px', fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>
                      <span>{new Date(order.created_at).toLocaleDateString(language === 'ar' ? 'ar-SA' : 'en-US')}</span>
                      <button 
                        type="button" 
                        onClick={() => setViewingSaleId(order.id)}
                        style={{ background: 'none', border: 'none', color: 'var(--color-primary)', fontWeight: 600, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                      >
                        <Eye size={13} /> {language === 'ar' ? 'معاينة' : 'View'}
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Pagination Footer */}
          {filteredOrders.length > pageSize && (
            <div className={styles.paginationContainer}>
              <div>
                <span>{language === 'ar' ? 'عرض' : 'Showing'} </span>
                <strong>{(tablePage - 1) * pageSize + 1} - {Math.min(tablePage * pageSize, filteredOrders.length)}</strong>
                <span> {language === 'ar' ? 'من أصل' : 'of'} </span>
                <strong>{filteredOrders.length}</strong>
              </div>

              <div style={{ display: 'flex', gap: '6px' }}>
                <button
                  type="button"
                  onClick={() => setTablePage(p => Math.max(1, p - 1))}
                  disabled={tablePage === 1}
                  className={styles.paginationBtn}
                >
                  {isRtl ? <ChevronRight size={15} /> : <ChevronLeft size={15} />}
                  <span>{language === 'ar' ? 'السابق' : 'Prev'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setTablePage(p => Math.min(totalPages, p + 1))}
                  disabled={tablePage === totalPages}
                  className={styles.paginationBtn}
                >
                  <span>{language === 'ar' ? 'التالي' : 'Next'}</span>
                  {isRtl ? <ChevronLeft size={15} /> : <ChevronRight size={15} />}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Side Controls Panel (~30% width, positioned left in RTL) */}
        <div className={styles.controlsSidePanel}>
          <div className={styles.panelHeader}>
            <h3 className={styles.panelTitle}>
              <Filter size={18} color="var(--color-primary)" />
              <span>{language === 'ar' ? 'أدوات البحث والتحكم' : 'Analytics Controls'}</span>
            </h3>
            <button
              type="button"
              onClick={handleResetFilters}
              className={styles.panelResetBtn}
              title={language === 'ar' ? 'إعادة ضبط البحث والفلاتر' : 'Reset search and filters'}
            >
              <RotateCcw size={12} />
              <span>{language === 'ar' ? 'إعادة ضبط' : 'Reset'}</span>
            </button>
          </div>

          {/* 1. Search Box with Clear Button */}
          <div className={styles.controlGroup}>
            <label className={styles.controlLabel}>
              <Search size={14} color="var(--color-primary)" />
              <span>{language === 'ar' ? 'البحث السريع في العمليات' : 'Quick Search'}</span>
            </label>
            <div className={styles.searchBox}>
              <Search 
                size={16} 
                style={{ 
                  position: 'absolute', 
                  top: '50%', 
                  transform: 'translateY(-50%)', 
                  right: isRtl ? '12px' : 'auto', 
                  left: isRtl ? 'auto' : '12px', 
                  color: 'var(--color-text-muted)',
                  pointerEvents: 'none'
                }} 
              />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={language === 'ar' ? 'رقم الفاتورة، العميل، المبلغ...' : 'Order #, customer, amount...'}
                className={styles.searchInput}
                style={{
                  paddingRight: isRtl ? '36px' : '32px',
                  paddingLeft: isRtl ? '32px' : '36px'
                }}
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className={styles.clearSearchBtn}
                  style={{ [isRtl ? 'left' : 'right']: '10px' }}
                  title={language === 'ar' ? 'مسح البحث' : 'Clear search'}
                >
                  <X size={15} />
                </button>
              )}
            </div>
            {debouncedSearch && (
              <div style={{ fontSize: '0.72rem', color: 'var(--color-primary)', fontWeight: 600, paddingInlineStart: '2px' }}>
                {language === 'ar' ? `نتائج البحث: ${filteredOrders.length} معاملة مطابقة` : `Found ${filteredOrders.length} matching transactions`}
              </div>
            )}
          </div>

          {/* 2. Date Range Filter with All 8 Options */}
          <div className={styles.controlGroup}>
            <label className={styles.controlLabel}>
              <Calendar size={14} color="var(--color-primary)" />
              <span>{language === 'ar' ? 'اختيار الفترة الزمنية' : 'Date Range'}</span>
            </label>
            <select
              value={filter}
              onChange={(e: any) => setFilter(e.target.value)}
              className={styles.statusFilterSelect}
            >
              <option value="today">{language === 'ar' ? 'اليوم' : 'Today'}</option>
              <option value="yesterday">{language === 'ar' ? 'الأمس' : 'Yesterday'}</option>
              <option value="7days">{language === 'ar' ? 'آخر 7 أيام' : 'Last 7 Days'}</option>
              <option value="30days">{language === 'ar' ? 'آخر 30 يوماً' : 'Last 30 Days'}</option>
              <option value="thisMonth">{language === 'ar' ? 'هذا الشهر' : 'This Month'}</option>
              <option value="lastMonth">{language === 'ar' ? 'الشهر السابق' : 'Last Month'}</option>
              <option value="thisYear">{language === 'ar' ? 'هذا العام' : 'This Year'}</option>
              <option value="custom">{language === 'ar' ? 'فترة مخصصة (Custom Range)' : 'Custom Range'}</option>
              <option value="all">{language === 'ar' ? 'كافة الفترات (All Time)' : 'All Time'}</option>
            </select>
          </div>

          {/* Custom Date Range Pickers (Active when 'custom' is selected) */}
          {filter === 'custom' && (
            <div className={styles.customDateContainer}>
              <div className={styles.customDateRow}>
                <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-text-secondary)', width: '35px' }}>
                  {language === 'ar' ? 'من:' : 'From:'}
                </span>
                <input
                  type="date"
                  value={customFrom}
                  onChange={(e) => setCustomFrom(e.target.value)}
                  className={styles.customDateInput}
                />
              </div>
              <div className={styles.customDateRow}>
                <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-text-secondary)', width: '35px' }}>
                  {language === 'ar' ? 'إلى:' : 'To:'}
                </span>
                <input
                  type="date"
                  value={customTo}
                  onChange={(e) => setCustomTo(e.target.value)}
                  className={styles.customDateInput}
                />
              </div>
              <button
                type="button"
                onClick={fetchStats}
                className={styles.applyDateBtn}
              >
                <CheckCircle size={14} />
                <span>{language === 'ar' ? 'تطبيق الفترة' : 'Apply Range'}</span>
              </button>
            </div>
          )}

          {/* 3. Transaction Status Filter */}
          <div className={styles.controlGroup}>
            <label className={styles.controlLabel}>
              <Banknote size={14} color="var(--color-primary)" />
              <span>{language === 'ar' ? 'حالة الدفع والمعاملة' : 'Payment Status'}</span>
            </label>
            <select
              value={statusFilter}
              onChange={(e: any) => setStatusFilter(e.target.value)}
              className={styles.statusFilterSelect}
            >
              <option value="all">{language === 'ar' ? 'كافة الحالات' : 'All Statuses'}</option>
              <option value="PAID">{language === 'ar' ? 'مدفوعة بالكامل' : 'Paid in Full'}</option>
              <option value="UNPAID">{language === 'ar' ? 'بانتظار التحصيل / آجل' : 'Unpaid / Partial'}</option>
              <option value="DRAFT">{language === 'ar' ? 'مسودة' : 'Draft'}</option>
            </select>
          </div>

          {/* 4. Compact Period Performance Summary Card */}
          <div className={styles.periodSummaryBox} style={{ margin: 0 }}>
            <div className={styles.periodSummaryHeader}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <TrendingUp size={16} color="var(--color-primary)" style={{ flexShrink: 0 }} />
                <span className={styles.periodSummaryTitle}>
                  {language === 'ar' ? 'ملخص أداء الفترة' : 'Period Summary'}
                </span>
              </div>
              <span className={styles.periodSummaryBadge}>
                {getDateFilterLabel(filter)}
              </span>
            </div>

            <div className={styles.periodSummaryGrid}>
              <div className={styles.periodChip}>
                <span className={styles.periodChipLabel}>
                  {language === 'ar' ? 'المبيعات' : 'Sales'}
                </span>
                <span className={styles.periodChipValueSales}>
                  {formatCurrency(stats.totalSales)}
                </span>
              </div>

              <div className={styles.periodChip}>
                <span className={styles.periodChipLabel}>
                  {language === 'ar' ? 'المشتريات' : 'Purchases'}
                </span>
                <span className={styles.periodChipValuePurchases}>
                  {formatCurrency(stats.totalPurchases)}
                </span>
              </div>

              <div className={styles.periodChip}>
                <span className={styles.periodChipLabel}>
                  {language === 'ar' ? 'صافي الأرباح' : 'Gross Profit'}
                </span>
                <span className={stats.grossProfit >= 0 ? styles.periodChipValueProfitPos : styles.periodChipValueProfitNeg}>
                  {formatCurrency(stats.grossProfit)}
                </span>
              </div>

              <div className={styles.periodChip}>
                <span className={styles.periodChipLabel}>
                  {language === 'ar' ? 'الطلبات' : 'Orders'}
                </span>
                <span className={styles.periodChipValueOrders}>
                  {stats.totalOrders} {language === 'ar' ? 'طلب' : 'orders'}
                </span>
              </div>
            </div>
          </div>

        </div>

      </div>

      {/* 4. Main Charts Section (Synchronized with Date Filter) */}
      <div className={styles.chartsGrid}>
        
        {/* Sales Trend Line Chart */}
        <div className={styles.cardSection}>
          <div className={styles.sectionHeader} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h2 className={styles.sectionTitle} style={{ margin: 0 }}>
              <TrendingUp size={20} color="#10b981" />
              <span>{language === 'ar' ? 'منحنى اتجاه المبيعات' : 'Sales Trend'}</span>
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
              <span>{language === 'ar' ? 'أكثر المنتجات طلباً ومبيعاً' : 'Top Selling Products'}</span>
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

      {/* 5. Business Analytics Row: Inventory Analytics & Customer Analytics */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 300px), 1fr))', gap: '1rem', marginTop: '0.25rem', width: '100%' }}>
        
        {/* Inventory Analytics */}
        <div className={styles.cardSection}>
          <div className={styles.sectionHeader} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Package size={20} color="var(--color-primary)" />
            <h2 className={styles.sectionTitle} style={{ margin: 0 }}>
              {language === 'ar' ? 'تحليلات المخزون والصلاحية' : 'Inventory & Stock Analytics'}
            </h2>
          </div>
          <div style={{ padding: '0.75rem 0', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 130px), 1fr))', gap: '12px' }}>
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
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px', borderRadius: '8px', backgroundColor: isDark ? 'rgba(59, 130, 246, 0.12)' : 'rgba(59, 130, 246, 0.08)', border: isDark ? '1px solid rgba(59, 130, 246, 0.3)' : '1px solid rgba(59, 130, 246, 0.2)', flexWrap: 'wrap', gap: '8px' }}>
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
          <div style={{ padding: '0.75rem 0', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 130px), 1fr))', gap: '12px' }}>
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
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px', borderRadius: '8px', backgroundColor: isDark ? 'rgba(139, 92, 246, 0.12)' : 'rgba(139, 92, 246, 0.08)', border: isDark ? '1px solid rgba(139, 92, 246, 0.3)' : '1px solid rgba(139, 92, 246, 0.2)', flexWrap: 'wrap', gap: '8px' }}>
              <span style={{ fontSize: '0.85rem', fontWeight: 500, color: isDark ? '#f8fafc' : 'inherit' }}>{language === 'ar' ? 'معدل الطلب للعميل' : 'Orders per Active Customer'}</span>
              <span style={{ fontWeight: 700, color: isDark ? '#a78bfa' : '#7c3aed' }}>
                {stats.customersCount > 0 ? (stats.totalOrders / stats.customersCount).toFixed(1) : 0}
              </span>
            </div>
          </div>
        </div>

      </div>

      {/* Sale Details Modal (If clicked from table) */}
      {viewingSaleId && (
        <SaleDetails 
          isOpen={Boolean(viewingSaleId)}
          saleId={viewingSaleId} 
          onClose={() => setViewingSaleId(null)} 
          onUpdate={fetchStats} 
        />
      )}

    </div>
  );
};

export default Dashboard;
