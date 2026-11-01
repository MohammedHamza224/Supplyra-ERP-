import React, { useEffect, useState } from 'react';
import { useTranslation } from '../../contexts/LanguageContext';
import { supabase } from '../../lib/supabase';
import { 
  BarChart3, TrendingUp, TrendingDown, Users, Package, 
  ShoppingCart, Factory, AlertTriangle, Clock, Award, DollarSign,
  Printer, Download, FileText
} from 'lucide-react';
import { 
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, AreaChart, Area, Cell, LineChart, Line
} from 'recharts';

type DateFilter = 'today' | 'week' | 'month' | 'year' | 'custom' | 'all';

interface BusinessInsight {
  type: 'danger' | 'warning' | 'info' | 'success';
  title: string;
  detail: string;
}

export default function AnalyticsDashboard() {
  const { t, language } = useTranslation();
  const isRtl = language === 'ar';
  
  const [dateFilter, setDateFilter] = useState<DateFilter>('month');
  const [customFrom, setCustomFrom] = useState<string>(() => {
    const d = new Date();
    d.setDate(1);
    return d.toISOString().split('T')[0];
  });
  const [customTo, setCustomTo] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [loading, setLoading] = useState(true);

  // Executive KPIs
  const [kpis, setKpis] = useState({
    totalSales: 0,
    salesCount: 0,
    totalPurchases: 0,
    purchasesCount: 0,
    grossProfit: 0,
    grossMargin: 0,
    totalCustomers: 0,
    activeCustomers: 0,
    totalSuppliers: 0,
    activeSuppliers: 0,
    totalProducts: 0,
    lowStockCount: 0,
    expiredBatchesCount: 0,
    expiringSoonCount: 0
  });

  // Ranking & Breakdown Data
  const [purchaseTrends, setPurchaseTrends] = useState<any[]>([]);
  const [topProducts, setTopProducts] = useState<any[]>([]);
  const [topCustomers, setTopCustomers] = useState<any[]>([]);
  const [topSuppliers, setTopSuppliers] = useState<any[]>([]);
  const [categorySales, setCategorySales] = useState<any[]>([]);
  const [lowStockProducts, setLowStockProducts] = useState<any[]>([]);
  const [expiringBatches, setExpiringBatches] = useState<any[]>([]);
  const [insights, setInsights] = useState<BusinessInsight[]>([]);

  useEffect(() => {
    fetchAnalytics();
  }, [dateFilter]);

  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      // Determine date threshold
      const now = new Date();
      let fromDateStr: string | null = null;
      let toDateStr: string | null = null;

      if (dateFilter === 'today') {
        const startOfDay = new Date(now);
        startOfDay.setHours(0, 0, 0, 0);
        fromDateStr = startOfDay.toISOString();
      } else if (dateFilter === 'week') {
        const startOfWeek = new Date(now);
        startOfWeek.setDate(startOfWeek.getDate() - 7);
        fromDateStr = startOfWeek.toISOString();
      } else if (dateFilter === 'month') {
        const startOfMonth = new Date(now);
        startOfMonth.setDate(startOfMonth.getDate() - 30);
        fromDateStr = startOfMonth.toISOString();
      } else if (dateFilter === 'year') {
        const startOfYear = new Date(now.getFullYear(), 0, 1);
        fromDateStr = startOfYear.toISOString();
      } else if (dateFilter === 'custom') {
        if (customFrom) {
          const dFrom = new Date(customFrom); dFrom.setHours(0, 0, 0, 0); fromDateStr = dFrom.toISOString();
        }
        if (customTo) {
          const dTo = new Date(customTo); dTo.setHours(23, 59, 59, 999); toDateStr = dTo.toISOString();
        }
      }

      // Parallel Data Retrieval
      const [
        { data: rawOrders },
        { data: rawOrderItems },
        { data: rawPurchases },
        { data: rawPurchaseItems },
        { data: rawProducts },
        { data: rawBatches },
        { data: rawCustomers },
        { data: rawSuppliers }
      ] = await Promise.all([
        supabase.from('orders').select('id, total_amount, status, created_at, customer_id, customer:customers(name)'),
        supabase.from('order_items').select('quantity, unit_price, subtotal, product_id, product:products(name, product_code, purchase_price, category:categories(name), brand:brands(name)), order:orders!inner(status, created_at)'),
        supabase.from('purchases').select('*'),
        supabase.from('purchase_items').select('id, purchase_id, product_id, quantity, unit_cost, subtotal'),
        supabase.from('products').select('id, name, product_code, purchase_price, selling_price, min_stock, active, category:categories(name), brand:brands(name)'),
        supabase.from('inventory_batches').select('id, product_id, batch_number, quantity, expiry_date, product:products(name, min_stock, category:categories(name))'),
        supabase.from('customers').select('id, name, active'),
        supabase.from('suppliers').select('id, name, active')
      ]);

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

      // Filter Sales Orders based on selected Date Range
      const validOrders = (rawOrders || []).filter((o: any) => {
        if ((o.status || '').toUpperCase() === 'CANCELLED') return false;
        const dObj = parseDateSafe(o.order_date || o.created_at);
        if (!dObj) return true;
        const t = dObj.getTime();
        if (fromTime && t < fromTime) return false;
        if (toTime && t > toTime) return false;
        return true;
      });

      // Filter Purchases based on selected Date Range
      const validPurchases = (rawPurchases || []).filter((p: any) => {
        if (p.status === 'CANCELLED') return false;
        const dObj = parseDateSafe(p.purchase_date || p.created_at);
        if (!dObj) return true;
        const t = dObj.getTime();
        if (fromTime && t < fromTime) return false;
        if (toTime && t > toTime) return false;
        return true;
      });

      // Filter Order Items based on Date Range
      const validOrderItems = (rawOrderItems || []).filter((item: any) => {
        const orderStatus = (item.order?.status || '').toUpperCase();
        if (orderStatus === 'CANCELLED') return false;
        const dStr = item.order?.created_at;
        if (!dStr) return true;
        const d = new Date(dStr);
        if (fromDateStr && d < new Date(fromDateStr)) return false;
        if (toDateStr && d > new Date(toDateStr)) return false;
        return true;
      });

      // 1. Calculate Sales & Purchase Financial Metrics
      const totalSalesRevenue = validOrders.reduce((sum: number, o: any) => sum + Number(o.total_amount || o.grand_total || 0), 0);
      const totalPurchasesAmount = validPurchases.reduce((sum: number, p: any) => sum + Number(p.total_amount ?? p.grand_total ?? p.total ?? p.subtotal ?? 0), 0);

      // COGS (Cost of Goods Sold) calculation based on sold items
      let totalCogs = 0;
      validOrderItems.forEach((item: any) => {
        const prod: any = Array.isArray(item.product) ? item.product[0] : item.product;
        const costPrice = Number(prod?.purchase_price || 0);
        const qty = Number(item.quantity || 0);
        totalCogs += (costPrice * qty);
      });

      const grossProfit = totalSalesRevenue - totalCogs;
      const grossMargin = totalSalesRevenue > 0 ? (grossProfit / totalSalesRevenue) * 100 : 0;

      // 2. Aggregate Top Selling Products
      const productSalesMap: Record<string, { name: string; code: string; category: string; qty: number; revenue: number }> = {};
      validOrderItems.forEach((item: any) => {
        const pId = item.product_id;
        const prod: any = Array.isArray(item.product) ? item.product[0] : item.product;
        const cat: any = Array.isArray(prod?.category) ? prod?.category[0] : prod?.category;

        const pName = prod?.name || (isRtl ? 'منتج غير معروف' : 'Unknown Product');
        const pCode = prod?.product_code || '-';
        const catName = cat?.name || (isRtl ? 'غير محدد' : 'Not Set');
        const qty = Number(item.quantity || 0);
        const rev = Number(item.total || 0);

        if (!productSalesMap[pId]) {
          productSalesMap[pId] = { name: pName, code: pCode, category: catName, qty: 0, revenue: 0 };
        }
        productSalesMap[pId].qty += qty;
        productSalesMap[pId].revenue += rev;
      });

      const sortedTopProducts = Object.values(productSalesMap)
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 5);

      // 3. Aggregate Top Customers
      const customerSalesMap: Record<string, { name: string; count: number; totalSpent: number }> = {};
      validOrders.forEach((o: any) => {
        const cust: any = Array.isArray(o.customer) ? o.customer[0] : o.customer;
        const cName = cust?.name || (isRtl ? 'عميل نقدي' : 'Walk-in Customer');
        if (!customerSalesMap[cName]) {
          customerSalesMap[cName] = { name: cName, count: 0, totalSpent: 0 };
        }
        customerSalesMap[cName].count += 1;
        customerSalesMap[cName].totalSpent += Number(o.grand_total || 0);
      });

      const sortedTopCustomers = Object.values(customerSalesMap)
        .sort((a, b) => b.totalSpent - a.totalSpent)
        .slice(0, 5);

      // 4. Aggregate Top Suppliers & Purchase Trends
      const supplierByIdMap = new Map((rawSuppliers || []).map((s: any) => [s.id, s.name]));
      const supplierPurchaseMap: Record<string, { name: string; count: number; totalAmount: number }> = {};
      const purchaseTrendMap: Record<string, { date: string; total: number; count: number }> = {};

      validPurchases.forEach((p: any) => {
        const sName = supplierByIdMap.get(p.supplier_id) || (isRtl ? 'مورد غير محدد' : 'Unspecified Supplier');
        if (!supplierPurchaseMap[sName]) {
          supplierPurchaseMap[sName] = { name: sName, count: 0, totalAmount: 0 };
        }
        supplierPurchaseMap[sName].count += 1;
        supplierPurchaseMap[sName].totalAmount += Number(p.grand_total || p.total_amount || p.subtotal || 0);

        const dObj = parseDateSafe(p.purchase_date || p.created_at);
        const dateKey = dObj ? `${dObj.getFullYear()}-${String(dObj.getMonth() + 1).padStart(2, '0')}-${String(dObj.getDate()).padStart(2, '0')}` : 'Other';
        if (!purchaseTrendMap[dateKey]) {
          purchaseTrendMap[dateKey] = { date: dateKey, total: 0, count: 0 };
        }
        purchaseTrendMap[dateKey].total += Number(p.grand_total || p.total_amount || p.subtotal || 0);
        purchaseTrendMap[dateKey].count += 1;
      });

      const sortedTopSuppliers = Object.values(supplierPurchaseMap)
        .sort((a, b) => b.totalAmount - a.totalAmount)
        .slice(0, 5);

      const sortedPurchaseTrends = Object.values(purchaseTrendMap).sort((a, b) => a.date.localeCompare(b.date));

      // 5. Category Sales Breakdown
      const categoryMap: Record<string, number> = {};
      validOrderItems.forEach((item: any) => {
        const prod: any = Array.isArray(item.product) ? item.product[0] : item.product;
        const cat: any = Array.isArray(prod?.category) ? prod?.category[0] : prod?.category;
        const catName = cat?.name || (isRtl ? 'غير محدد' : 'Not Set');
        categoryMap[catName] = (categoryMap[catName] || 0) + Number(item.total || 0);
      });

      const sortedCategorySales = Object.entries(categoryMap)
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value);

      // 6. Inventory & Expiry Metrics
      const productStockMap: Record<string, { name: string; code: string; minStock: number; currentStock: number }> = {};
      (rawProducts || []).forEach((p: any) => {
        productStockMap[p.id] = {
          name: p.name,
          code: p.product_code || '-',
          minStock: Number(p.min_stock || 0),
          currentStock: 0
        };
      });

      const todayDate = new Date();
      let expiredCount = 0;
      let expiringSoonCount = 0;

      const expiringBatchesList: any[] = [];

      (rawBatches || []).forEach((b: any) => {
        if (!b.active) return;
        const qty = Number(b.quantity || 0);
        const batchProd: any = Array.isArray(b.product) ? b.product[0] : b.product;

        if (productStockMap[b.product_id]) {
          productStockMap[b.product_id].currentStock += qty;
        }

        if (b.expiry_date) {
          const exp = new Date(b.expiry_date);
          const diffDays = Math.ceil((exp.getTime() - todayDate.getTime()) / (1000 * 3600 * 24));

          if (diffDays < 0) {
            expiredCount += 1;
          } else if (diffDays <= 30) {
            expiringSoonCount += 1;
            expiringBatchesList.push({
              productName: batchProd?.name || (isRtl ? 'منتج' : 'Product'),
              batchNumber: b.batch_number,
              quantity: qty,
              daysLeft: diffDays,
              expiryDate: b.expiry_date
            });
          }
        }
      });

      const lowStockList = Object.values(productStockMap)
        .filter(p => p.currentStock <= p.minStock)
        .sort((a, b) => a.currentStock - b.currentStock);

      // 7. Generate Real Business Insights
      const generatedInsights: BusinessInsight[] = [];

      if (lowStockList.length > 0) {
        generatedInsights.push({
          type: 'danger',
          title: isRtl ? 'تنبيه مخزون منخفض' : 'Low Stock Warning',
          detail: isRtl 
            ? `يوجد ${lowStockList.length} منتج وصل أو قل عن حد الأمان للمخزون.` 
            : `${lowStockList.length} products have reached or dropped below minimum safety stock.`
        });
      }

      if (expiringSoonCount > 0) {
        generatedInsights.push({
          type: 'warning',
          title: isRtl ? 'تنبيه انتهاء صلاحية وشيك' : 'Expiring Batches Warning',
          detail: isRtl 
            ? `يوجد ${expiringSoonCount} دفعة مخزنية ستنتهي صلاحيتها خلال الـ 30 يوماً القادمة.` 
            : `${expiringSoonCount} inventory batches are expiring within the next 30 days.`
        });
      }

      if (sortedCategorySales.length > 0) {
        const topCat = sortedCategorySales[0];
        generatedInsights.push({
          type: 'success',
          title: isRtl ? 'الفئة الأكثر مبيعاً' : 'Top Performing Category',
          detail: isRtl 
            ? `حققت فئة "${topCat.name}" أعلى المبيعات بقيمة ${topCat.value.toLocaleString()} ر.س.` 
            : `Category "${topCat.name}" generated highest sales of SAR ${topCat.value.toLocaleString()}.`
        });
      }

      if (sortedTopCustomers.length > 0) {
        const topC = sortedTopCustomers[0];
        generatedInsights.push({
          type: 'info',
          title: isRtl ? 'أعلى عميل مشترياً' : 'Top Customer Insight',
          detail: isRtl 
            ? `العميل "${topC.name}" هو الأكثر شراءً بإجمالي ${topC.totalSpent.toLocaleString()} ر.س عبر ${topC.count} طلب.` 
            : `Customer "${topC.name}" leads purchases with SAR ${topC.totalSpent.toLocaleString()} across ${topC.count} orders.`
        });
      }

      // Update States
      setKpis({
        totalSales: totalSalesRevenue,
        salesCount: validOrders.length,
        totalPurchases: totalPurchasesAmount,
        purchasesCount: validPurchases.length,
        grossProfit,
        grossMargin,
        totalCustomers: (rawCustomers || []).length,
        activeCustomers: (rawCustomers || []).filter((c: any) => c.active).length,
        totalSuppliers: (rawSuppliers || []).length,
        activeSuppliers: (rawSuppliers || []).filter((s: any) => s.active).length,
        totalProducts: (rawProducts || []).length,
        lowStockCount: lowStockList.length,
        expiredBatchesCount: expiredCount,
        expiringSoonCount: expiringSoonCount
      });

      setTopProducts(sortedTopProducts);
      setTopCustomers(sortedTopCustomers);
      setTopSuppliers(sortedTopSuppliers);
      setPurchaseTrends(sortedPurchaseTrends);
      setCategorySales(sortedCategorySales);
      setLowStockProducts(lowStockList.slice(0, 5));
      setExpiringBatches(expiringBatchesList.slice(0, 5));
      setInsights(generatedInsights);

    } catch (err) {
      console.error('Error fetching analytics:', err);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (val: number) => {
    return `${val.toLocaleString(isRtl ? 'ar-EG' : 'en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${isRtl ? 'ر.س' : 'SAR'}`;
  };

  if (loading) {
    return (
      <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--color-text-secondary)' }}>
        <BarChart3 size={40} style={{ animation: 'spin 1.5s linear infinite', marginBottom: '1rem', color: 'var(--color-primary)' }} />
        <div style={{ fontSize: '1.1rem', fontWeight: 500 }}>{isRtl ? 'جاري تحميل التحليلات والبيانات...' : 'Loading analytics and real system metrics...'}</div>
      </div>
    );
  }

  const handlePrintAnalytics = () => {
    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    document.body.appendChild(iframe);

    const doc = iframe.contentWindow?.document;
    if (!doc) return;

    const html = `
      <!DOCTYPE html>
      <html dir="${isRtl ? 'rtl' : 'ltr'}" lang="${isRtl ? 'ar' : 'en'}">
        <head>
          <meta charset="utf-8" />
          <title>${isRtl ? 'تقرير تحليلات الأعمال' : 'Analytics Report'} - ${dateFilter.toUpperCase()}</title>
          <style>
            @media print { @page { margin: 10mm; size: A4 portrait; } }
            * { box-sizing: border-box; }
            body { font-family: ${isRtl ? "'Segoe UI', Tahoma, sans-serif" : "'Inter', sans-serif"}; padding: 20px; color: #1e293b; line-height: 1.5; background: #fff; }
            .header { border-bottom: 2px solid #0f172a; padding-bottom: 10px; margin-bottom: 16px; }
            h1 { color: #047857; font-size: 22px; margin: 0 0 4px 0; }
            .meta { color: #64748b; font-size: 12px; }
            .kpi-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin: 16px 0; }
            .kpi-card { background: #f8fafc; border: 1px solid #e2e8f0; padding: 10px 14px; border-radius: 6px; }
            .kpi-title { font-size: 11px; color: #64748b; font-weight: bold; }
            .kpi-value { font-size: 17px; font-weight: bold; color: #0f172a; margin-top: 2px; }
            table { width: 100%; border-collapse: collapse; margin-top: 14px; font-size: 12px; }
            th, td { border: 1px solid #cbd5e1; padding: 8px 10px; text-align: ${isRtl ? 'right' : 'left'}; }
            th { background: #f1f5f9; font-weight: 600; }
            .section-title { font-size: 14px; font-weight: bold; margin-top: 20px; margin-bottom: 8px; color: #047857; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>SUPPLYRA - ${isRtl ? 'تقرير تحليلات الأعمال' : 'Business Analytics Report'}</h1>
            <div class="meta">
              ${isRtl ? 'الفترة الزمنية:' : 'Period:'} <strong>${dateFilter.toUpperCase()}</strong> | 
              ${isRtl ? 'تاريخ التقرير:' : 'Generated Date:'} ${new Date().toLocaleString(isRtl ? 'ar-EG' : 'en-US')}
            </div>
          </div>

          <div class="kpi-grid">
            <div class="kpi-card"><div class="kpi-title">${isRtl ? 'إجمالي المبيعات' : 'Sales Revenue'}</div><div class="kpi-value">${formatCurrency(kpis.totalSales)}</div></div>
            <div class="kpi-card"><div class="kpi-title">${isRtl ? 'إجمالي المشتريات' : 'Purchases Cost'}</div><div class="kpi-value">${formatCurrency(kpis.totalPurchases)}</div></div>
            <div class="kpi-card"><div class="kpi-title">${isRtl ? 'إجمالي الربح' : 'Gross Profit'}</div><div class="kpi-value">${formatCurrency(kpis.grossProfit)} (${kpis.grossMargin.toFixed(1)}%)</div></div>
            <div class="kpi-card"><div class="kpi-title">${isRtl ? 'إجمالي العملاء' : 'Total Customers'}</div><div class="kpi-value">${kpis.totalCustomers}</div></div>
            <div class="kpi-card"><div class="kpi-title">${isRtl ? 'إجمالي المنتجات' : 'Total Products'}</div><div class="kpi-value">${kpis.totalProducts}</div></div>
            <div class="kpi-card"><div class="kpi-title">${isRtl ? 'إجمالي الموردين' : 'Total Suppliers'}</div><div class="kpi-value">${kpis.totalSuppliers}</div></div>
          </div>

          <div class="section-title">${isRtl ? 'الأكثر مبيعاً' : 'Top Selling Products'}</div>
          <table>
            <thead>
              <tr><th>#</th><th>${isRtl ? 'المنتج' : 'Product'}</th><th>${isRtl ? 'الفئة' : 'Category'}</th><th>${isRtl ? 'الكمية' : 'Qty'}</th><th>${isRtl ? 'الإجمالي' : 'Total'}</th></tr>
            </thead>
            <tbody>
              ${topProducts.map((p, i) => `<tr><td>${i+1}</td><td>${p.name}</td><td>${p.category}</td><td>${p.qty}</td><td>${formatCurrency(p.revenue)}</td></tr>`).join('')}
            </tbody>
          </table>

          <div class="section-title">${isRtl ? 'أعلى العملاء مشترياً' : 'Top Customers'}</div>
          <table>
            <thead>
              <tr><th>#</th><th>${isRtl ? 'العميل' : 'Customer'}</th><th>${isRtl ? 'عدد الطلبات' : 'Orders'}</th><th>${isRtl ? 'إجمالي الشراء' : 'Total Spent'}</th></tr>
            </thead>
            <tbody>
              ${topCustomers.map((c, i) => `<tr><td>${i+1}</td><td>${c.name}</td><td>${c.count}</td><td>${formatCurrency(c.totalSpent)}</td></tr>`).join('')}
            </tbody>
          </table>
        </body>
      </html>
    `;

    doc.open();
    doc.write(html);
    doc.close();

    setTimeout(() => {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
      setTimeout(() => { if (document.body.contains(iframe)) document.body.removeChild(iframe); }, 1000);
    }, 250);
  };

  const handleExportExcel = () => {
    let csv = `SUPPLYRA Analytics Report - ${dateFilter.toUpperCase()}\n`;
    csv += `Generated Date: ${new Date().toLocaleString()}\n\n`;

    csv += `EXECUTIVE KPIS\n`;
    csv += `Sales Revenue,Purchases Cost,Gross Profit,Gross Margin %,Customers,Products,Suppliers\n`;
    csv += `"${kpis.totalSales}","${kpis.totalPurchases}","${kpis.grossProfit}","${kpis.grossMargin.toFixed(1)}%","${kpis.totalCustomers}","${kpis.totalProducts}","${kpis.totalSuppliers}"\n\n`;

    csv += `TOP SELLING PRODUCTS\n`;
    csv += `Product Name,Category,Quantity Sold,Revenue\n`;
    topProducts.forEach(p => {
      csv += `"${p.name}","${p.category}","${p.qty}","${p.revenue}"\n`;
    });
    csv += `\nTOP CUSTOMERS\n`;
    csv += `Customer Name,Order Count,Total Spent\n`;
    topCustomers.forEach(c => {
      csv += `"${c.name}","${c.count}","${c.totalSpent}"\n`;
    });

    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `Supplyra_Analytics_${dateFilter}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem', paddingBottom: '2rem' }}>
      
      {/* Header & Date Filter Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '1.6rem', fontWeight: 700, color: 'var(--color-text-primary)', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <BarChart3 size={28} style={{ color: 'var(--color-primary)' }} />
            {t('analytics.title') || (isRtl ? 'لوحة تحليلات الأعمال' : 'Business Analytics Dashboard')}
          </h1>
          <p style={{ margin: '0.35rem 0 0', color: 'var(--color-text-secondary)', fontSize: '0.875rem' }}>
            {isRtl ? 'مؤشرات الأداء الحقيقية ورؤى العمليات الذكية' : 'Real operational ERP performance indicators and insights'}
          </p>
        </div>

        <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
          {/* Action Buttons: Print, Excel, PDF */}
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={handlePrintAnalytics}
              className="btn btn-secondary"
              title={isRtl ? 'طباعة التقرير' : 'Print Report'}
              style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 12px', fontSize: '0.85rem' }}
            >
              <Printer size={16} />
              {isRtl ? 'طباعة' : 'Print'}
            </button>
            <button
              onClick={handleExportExcel}
              className="btn btn-secondary"
              title={isRtl ? 'تصدير Excel' : 'Export Excel'}
              style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 12px', fontSize: '0.85rem', color: '#059669' }}
            >
              <Download size={16} />
              {isRtl ? 'تصدير Excel' : 'Excel'}
            </button>
            <button
              onClick={handlePrintAnalytics}
              className="btn btn-secondary"
              title={isRtl ? 'تصدير PDF' : 'Export PDF'}
              style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 12px', fontSize: '0.85rem', color: '#dc2626' }}
            >
              <FileText size={16} />
              {isRtl ? 'تصدير PDF' : 'PDF'}
            </button>
          </div>

          {/* Date Filter Tabs */}
          <div style={{ display: 'flex', gap: '4px', backgroundColor: 'var(--color-surface)', padding: '4px', borderRadius: '8px', border: '1px solid var(--color-border)' }}>
            {[
              { id: 'today', label: isRtl ? 'اليوم' : 'Today' },
              { id: 'week', label: isRtl ? 'هذا الأسبوع' : 'This Week' },
              { id: 'month', label: isRtl ? 'هذا الشهر' : 'This Month' },
              { id: 'year', label: isRtl ? 'هذه السنة' : 'This Year' },
              { id: 'all', label: isRtl ? 'الكل' : 'All Time' }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setDateFilter(tab.id as DateFilter)}
                style={{
                  padding: '6px 14px',
                  borderRadius: '6px',
                  border: 'none',
                  fontSize: '0.85rem',
                  fontWeight: 500,
                  cursor: 'pointer',
                  backgroundColor: dateFilter === tab.id ? 'var(--color-primary)' : 'transparent',
                  color: dateFilter === tab.id ? 'white' : 'var(--color-text-secondary)',
                  transition: 'all 0.2s ease'
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Section 1: Executive KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.25rem' }}>
        
        {/* Sales KPI */}
        <div className="card" style={{ padding: '1.25rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)', fontWeight: 500 }}>{isRtl ? 'إجمالي المبيعات' : 'Sales Revenue'}</div>
              <div style={{ fontSize: '1.4rem', fontWeight: 700, margin: '0.35rem 0', color: '#10b981' }}>{formatCurrency(kpis.totalSales)}</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>{kpis.salesCount} {isRtl ? 'فاتورة مبيعات' : 'sales orders'}</div>
            </div>
            <div style={{ width: '42px', height: '42px', borderRadius: '10px', backgroundColor: 'rgba(16, 185, 129, 0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#10b981' }}>
              <TrendingUp size={22} />
            </div>
          </div>
        </div>

        {/* Purchases KPI */}
        <div className="card" style={{ padding: '1.25rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)', fontWeight: 500 }}>{isRtl ? 'إجمالي المشتريات' : 'Purchases Cost'}</div>
              <div style={{ fontSize: '1.4rem', fontWeight: 700, margin: '0.35rem 0', color: '#3b82f6' }}>{formatCurrency(kpis.totalPurchases)}</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>{kpis.purchasesCount} {isRtl ? 'فاتورة شراء' : 'purchase invoices'}</div>
            </div>
            <div style={{ width: '42px', height: '42px', borderRadius: '10px', backgroundColor: 'rgba(59, 130, 246, 0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#3b82f6' }}>
              <TrendingDown size={22} />
            </div>
          </div>
        </div>

        {/* Gross Profit KPI */}
        <div className="card" style={{ padding: '1.25rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)', fontWeight: 500 }}>{isRtl ? 'إجمالي الربح' : 'Gross Profit'}</div>
              <div style={{ fontSize: '1.4rem', fontWeight: 700, margin: '0.35rem 0', color: kpis.grossProfit >= 0 ? '#059669' : '#dc2626' }}>{formatCurrency(kpis.grossProfit)}</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>{isRtl ? 'هامش الربح:' : 'Margin:'} {kpis.grossMargin.toFixed(1)}%</div>
            </div>
            <div style={{ width: '42px', height: '42px', borderRadius: '10px', backgroundColor: 'rgba(5, 150, 105, 0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#059669' }}>
              <DollarSign size={22} />
            </div>
          </div>
        </div>

        {/* Products & Low Stock */}
        <div className="card" style={{ padding: '1.25rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)', fontWeight: 500 }}>{isRtl ? 'إجمالي المنتجات' : 'Total Products'}</div>
              <div style={{ fontSize: '1.4rem', fontWeight: 700, margin: '0.35rem 0' }}>{kpis.totalProducts}</div>
              <div style={{ fontSize: '0.75rem', color: kpis.lowStockCount > 0 ? '#dc2626' : 'var(--color-text-muted)' }}>
                {kpis.lowStockCount} {isRtl ? 'منتج منخفض المخزون' : 'low stock items'}
              </div>
            </div>
            <div style={{ width: '42px', height: '42px', borderRadius: '10px', backgroundColor: 'rgba(139, 92, 246, 0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#8b5cf6' }}>
              <Package size={22} />
            </div>
          </div>
        </div>

      </div>

      {/* Section 2: Real Business Insights Bar */}
      {insights.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 600, color: 'var(--color-text-primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Award size={18} color="var(--color-primary)" />
            {isRtl ? 'رؤى وتوصيات الأعمال' : 'Actionable Business Insights'}
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem' }}>
            {insights.map((insight, idx) => (
              <div 
                key={idx} 
                style={{
                  padding: '12px 16px',
                  borderRadius: '8px',
                  borderLeft: isRtl ? 'none' : `4px solid ${insight.type === 'danger' ? '#ef4444' : insight.type === 'warning' ? '#f59e0b' : insight.type === 'success' ? '#10b981' : '#3b82f6'}`,
                  borderRight: isRtl ? `4px solid ${insight.type === 'danger' ? '#ef4444' : insight.type === 'warning' ? '#f59e0b' : insight.type === 'success' ? '#10b981' : '#3b82f6'}` : 'none',
                  backgroundColor: 'var(--color-surface)',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                  borderTop: '1px solid var(--color-border)',
                  borderBottom: '1px solid var(--color-border)'
                }}
              >
                <div style={{ fontSize: '0.85rem', fontWeight: 700, marginBottom: '4px', color: insight.type === 'danger' ? '#dc2626' : insight.type === 'warning' ? '#d97706' : insight.type === 'success' ? '#059669' : '#2563eb' }}>
                  {insight.title}
                </div>
                <div style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)', lineHeight: 1.4 }}>
                  {insight.detail}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Section 2.5: Purchase Trends & Supply Flow */}
      <div className="card" style={{ padding: '1.25rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '8px' }}>
          <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <TrendingDown size={20} color="#3b82f6" />
            {isRtl ? 'اتجاه المشتريات والتوريدات' : 'Purchase Trends & Supply Flow'}
          </h3>
          <div style={{ display: 'flex', gap: '16px', fontSize: '0.85rem', fontWeight: 600 }}>
            <span style={{ color: '#3b82f6' }}>
              {isRtl ? 'إجمالي المشتريات:' : 'Total Purchases:'} {formatCurrency(kpis.totalPurchases)}
            </span>
            <span style={{ color: 'var(--color-text-secondary)' }}>
              {isRtl ? 'عدد الفواتير:' : 'Invoices Count:'} {kpis.purchasesCount}
            </span>
          </div>
        </div>

        <div style={{ width: '100%', height: '240px' }}>
          {purchaseTrends.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={purchaseTrends} margin={{ top: 10, right: 20, left: 10, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-border)" />
                <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: 'var(--color-text-secondary)' }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: 'var(--color-text-secondary)' }} tickFormatter={(val) => val >= 1000 ? `${(val/1000).toFixed(0)}k` : val} />
                <Tooltip formatter={(val: any) => [formatCurrency(Number(val)), isRtl ? 'قيمة المشتريات' : 'Purchase Amount']} labelFormatter={(l) => `${isRtl ? 'التاريخ:' : 'Date:'} ${l}`} />
                <Bar dataKey="total" fill="#3b82f6" radius={[4, 4, 0, 0]} maxBarSize={50} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--color-text-muted)', gap: '8px' }}>
              <TrendingDown size={40} opacity={0.2} />
              <span>{isRtl ? 'لا توجد فواتير مشتريات مسجلة لهذه الفترة' : 'No purchase records found for selected period'}</span>
            </div>
          )}
        </div>
      </div>

      {/* Section 3: Performance Rankings Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.25rem' }}>
        
        {/* Top Products */}
        <div className="card" style={{ padding: '1.25rem' }}>
          <h3 style={{ margin: '0 0 1rem', fontSize: '1rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <ShoppingCart size={18} color="#10b981" />
            {isRtl ? 'الأكثر مبيعاً' : 'Top Selling Products'}
          </h3>
          {topProducts.length === 0 ? (
            <div style={{ padding: '1.5rem', textAlign: 'center', color: 'var(--color-text-muted)', fontSize: '0.85rem' }}>
              {isRtl ? 'لا توجد مبيعات في هذه الفترة' : 'No sales recorded in selected period'}
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {topProducts.map((p, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '8px', borderBottom: i < topProducts.length - 1 ? '1px solid var(--color-border)' : 'none' }}>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>{p.name}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                      {p.category} • {p.qty} {isRtl ? 'مباع' : 'sold'}
                    </div>
                  </div>
                  <div style={{ fontWeight: 700, fontSize: '0.85rem', color: '#10b981' }}>
                    {formatCurrency(p.revenue)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Top Customers */}
        <div className="card" style={{ padding: '1.25rem' }}>
          <h3 style={{ margin: '0 0 1rem', fontSize: '1rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Users size={18} color="#3b82f6" />
            {isRtl ? 'أعلى العملاء مشترياً' : 'Top Customers'}
          </h3>
          {topCustomers.length === 0 ? (
            <div style={{ padding: '1.5rem', textAlign: 'center', color: 'var(--color-text-muted)', fontSize: '0.85rem' }}>
              {isRtl ? 'لا يوجد بيانات عملاء في هذه الفترة' : 'No customer activity in selected period'}
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {topCustomers.map((c, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '8px', borderBottom: i < topCustomers.length - 1 ? '1px solid var(--color-border)' : 'none' }}>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>{c.name}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                      {c.count} {isRtl ? 'طلب مبيعات' : 'orders'}
                    </div>
                  </div>
                  <div style={{ fontWeight: 700, fontSize: '0.85rem', color: '#3b82f6' }}>
                    {formatCurrency(c.totalSpent)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Top Suppliers */}
        <div className="card" style={{ padding: '1.25rem' }}>
          <h3 style={{ margin: '0 0 1rem', fontSize: '1rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Factory size={18} color="#f59e0b" />
            {isRtl ? 'أعلى الموردين توريداً' : 'Top Suppliers'}
          </h3>
          {topSuppliers.length === 0 ? (
            <div style={{ padding: '1.5rem', textAlign: 'center', color: 'var(--color-text-muted)', fontSize: '0.85rem' }}>
              {isRtl ? 'لا توجد توريدات في هذه الفترة' : 'No purchases in selected period'}
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {topSuppliers.map((s, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '8px', borderBottom: i < topSuppliers.length - 1 ? '1px solid var(--color-border)' : 'none' }}>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>{s.name}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                      {s.count} {isRtl ? 'فاتورة شراء' : 'purchase invoices'}
                    </div>
                  </div>
                  <div style={{ fontWeight: 700, fontSize: '0.85rem', color: '#f59e0b' }}>
                    {formatCurrency(s.totalAmount)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>

      {/* Section 4: Inventory & Expiry Risk Assessment */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.25rem' }}>
        
        {/* Low Stock Alerts */}
        <div className="card" style={{ padding: '1.25rem' }}>
          <h3 style={{ margin: '0 0 1rem', fontSize: '1rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <AlertTriangle size={18} color="#ef4444" />
            {isRtl ? 'تنبيهات المخزون المنخفض' : 'Low Stock Alerts'}
          </h3>
          {lowStockProducts.length === 0 ? (
            <div style={{ padding: '1.5rem', textAlign: 'center', color: '#10b981', fontSize: '0.85rem', fontWeight: 500 }}>
              ✓ {isRtl ? 'جميع المنتجات فوق حد الأمان للمخزون' : 'All product stocks are at healthy levels'}
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {lowStockProducts.map((p, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '8px', borderBottom: i < lowStockProducts.length - 1 ? '1px solid var(--color-border)' : 'none' }}>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>{p.name}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                      {isRtl ? 'حد الأمان:' : 'Safety Limit:'} {p.minStock}
                    </div>
                  </div>
                  <div style={{ fontWeight: 700, fontSize: '0.8rem', color: p.currentStock === 0 ? '#ef4444' : '#d97706', backgroundColor: p.currentStock === 0 ? 'rgba(239,68,68,0.1)' : 'rgba(245,158,11,0.1)', padding: '3px 8px', borderRadius: '12px' }}>
                    {p.currentStock} {isRtl ? 'المتاح' : 'in stock'}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Expiring Soon Batches */}
        <div className="card" style={{ padding: '1.25rem' }}>
          <h3 style={{ margin: '0 0 1rem', fontSize: '1rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Clock size={18} color="#f59e0b" />
            {isRtl ? 'شحنات قريبة من انتهاء الصلاحية (خلال 30 يوم)' : 'Expiring Soon (Next 30 Days)'}
          </h3>
          {expiringBatches.length === 0 ? (
            <div style={{ padding: '1.5rem', textAlign: 'center', color: '#10b981', fontSize: '0.85rem', fontWeight: 500 }}>
              ✓ {isRtl ? 'لا توجد شحنات تنتهي صلاحيتها قريباً' : 'No inventory batches expiring soon'}
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {expiringBatches.map((b, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '8px', borderBottom: i < expiringBatches.length - 1 ? '1px solid var(--color-border)' : 'none' }}>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>{b.productName}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                      {isRtl ? 'دفعة:' : 'Batch:'} {b.batchNumber} • {b.quantity} {isRtl ? 'وحدة' : 'qty'}
                    </div>
                  </div>
                  <div style={{ fontWeight: 700, fontSize: '0.8rem', color: '#d97706', backgroundColor: 'rgba(245,158,11,0.1)', padding: '3px 8px', borderRadius: '12px' }}>
                    {b.daysLeft} {isRtl ? 'يوم متبقي' : 'days left'}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>

    </div>
  );
}
