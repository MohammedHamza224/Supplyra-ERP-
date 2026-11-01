import React, { useState, useRef, useEffect } from 'react';
import { useTranslation } from '../../contexts/LanguageContext';
import { supabase } from '../../lib/supabase';
import { Bot, Send, User, Sparkles, TrendingUp, Package, Users, Factory, FileText, AlertTriangle, CheckCircle, RefreshCw, Layers, DollarSign, Building2, ShoppingCart, HelpCircle } from 'lucide-react';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: React.ReactNode;
  timestamp: Date;
  suggestions?: string[];
}

interface ConversationContext {
  lastCategory?: 'sales' | 'purchases' | 'inventory' | 'products' | 'suppliers' | 'customers' | 'analytics' | 'invoices' | 'payments';
  lastEntity?: {
    type: 'product' | 'warehouse' | 'supplier' | 'customer' | 'invoice';
    id?: string;
    name?: string;
    code?: string;
  };
  lastDateRange?: {
    start?: Date;
    end?: Date;
    labelAr: string;
    labelEn: string;
  };
}

// Arabic Text Normalization (Diacritics, Alefs, Taas, Yaas, Punctuation)
const normalizeArabic = (text: string): string => {
  return text
    .toLowerCase()
    .replace(/[\u064B-\u065F\u0670]/g, '') // remove tashkeel
    .replace(/[أإآٱ]/g, 'ا')
    .replace(/[ة]/g, 'ه')
    .replace(/[يى]/g, 'ي')
    .replace(/[؟?!\.,،;:"'()\[\]{}]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
};

// Date Range Parser
interface DateRangeResult {
  start?: Date;
  end?: Date;
  labelAr: string;
  labelEn: string;
  hasExplicitDate: boolean;
}

const parseDateRange = (normalizedText: string): DateRangeResult => {
  const now = new Date();
  
  // Today / اليوم / النهاردة
  if (normalizedText.includes('اليوم') || normalizedText.includes('النهارده') || normalizedText.includes('النهاردة') || normalizedText.includes('today')) {
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
    const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
    return { start, end, labelAr: 'اليوم', labelEn: 'Today', hasExplicitDate: true };
  }

  // Yesterday / أمس / امبارح
  if (normalizedText.includes('امس') || normalizedText.includes('امبارح') || normalizedText.includes('البارحه') || normalizedText.includes('yesterday')) {
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 0, 0, 0);
    const end = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 23, 59, 59, 999);
    return { start, end, labelAr: 'الأمس', labelEn: 'Yesterday', hasExplicitDate: true };
  }

  // Last 7 days / آخر 7 أيام
  if (normalizedText.includes('اخر 7') || normalizedText.includes('اخر سبع') || normalizedText.includes('اخر ٧') || normalizedText.includes('last 7') || normalizedText.includes('7 days') || normalizedText.includes('سبعه ايام')) {
    const start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    start.setHours(0, 0, 0, 0);
    return { start, end: now, labelAr: 'آخر 7 أيام', labelEn: 'Last 7 Days', hasExplicitDate: true };
  }

  // This week / هذا الأسبوع
  if (normalizedText.includes('هذا الاسبوع') || normalizedText.includes('الاسبوع الحالي') || normalizedText.includes('this week') || normalizedText.includes('اسبوعنا')) {
    const day = now.getDay();
    const diff = now.getDate() - day + (day === 6 ? 0 : -1);
    const start = new Date(now.setDate(diff));
    start.setHours(0, 0, 0, 0);
    return { start, end: new Date(), labelAr: 'هذا الأسبوع', labelEn: 'This Week', hasExplicitDate: true };
  }

  // Last week / الأسبوع الماضي
  if (normalizedText.includes('الاسبوع الماضي') || normalizedText.includes('الاسبوع اللي فات') || normalizedText.includes('الاسبوع السابق') || normalizedText.includes('last week')) {
    const start = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
    start.setHours(0, 0, 0, 0);
    const end = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    end.setHours(23, 59, 59, 999);
    return { start, end, labelAr: 'الأسبوع الماضي', labelEn: 'Last Week', hasExplicitDate: true };
  }

  // This month / هذا الشهر
  if (normalizedText.includes('هذا الشهر') || normalizedText.includes('الشهر الحالي') || normalizedText.includes('this month') || normalizedText.includes('شهرنا')) {
    const start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0);
    return { start, end: now, labelAr: 'هذا الشهر', labelEn: 'This Month', hasExplicitDate: true };
  }

  // Last month / الشهر الماضي / الشهر اللي فات
  if (normalizedText.includes('الشهر الماضي') || normalizedText.includes('الشهر اللي فات') || normalizedText.includes('الشهر السابق') || normalizedText.includes('last month')) {
    const start = new Date(now.getFullYear(), now.getMonth() - 1, 1, 0, 0, 0);
    const end = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
    return { start, end, labelAr: 'الشهر الماضي', labelEn: 'Last Month', hasExplicitDate: true };
  }

  // Last 30 days / آخر 30 يوم
  if (normalizedText.includes('اخر 30') || normalizedText.includes('اخر ثلاثين') || normalizedText.includes('last 30') || normalizedText.includes('30 days') || normalizedText.includes('ثلاثين يوم')) {
    const start = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    start.setHours(0, 0, 0, 0);
    return { start, end: now, labelAr: 'آخر 30 يوم', labelEn: 'Last 30 Days', hasExplicitDate: true };
  }

  // This year / السنة الحالية
  if (normalizedText.includes('هذه السنه') || normalizedText.includes('هذا العام') || normalizedText.includes('السنه الحاليه') || normalizedText.includes('this year')) {
    const start = new Date(now.getFullYear(), 0, 1, 0, 0, 0);
    return { start, end: now, labelAr: 'هذه السنة', labelEn: 'This Year', hasExplicitDate: true };
  }

  return { labelAr: 'كافة الفترات', labelEn: 'All Time', hasExplicitDate: false };
};

// ============================================================================
// SCHEMA-DEFENSIVE SUPABASE QUERY LAYER (Zero Error 42703 Risk)
// ============================================================================

const safeFetchOrders = async (dateRange?: { start?: Date; end?: Date }) => {
  try {
    let q = supabase.from('orders').select('*');
    if (dateRange?.start) q = q.gte('created_at', dateRange.start.toISOString());
    if (dateRange?.end) q = q.lte('created_at', dateRange.end.toISOString());
    const { data, error } = await q;
    if (error) {
      console.warn('[AI SafeQuery] Orders filtered notice, falling back:', error.message);
      const fallback = await supabase.from('orders').select('*');
      return fallback.data || [];
    }
    return data || [];
  } catch (err) {
    console.error('[AI SafeQuery] Orders exception:', err);
    return [];
  }
};

const safeFetchInventoryBatches = async (productId?: string) => {
  try {
    let q = supabase.from('inventory_batches').select('*');
    if (productId) q = q.eq('product_id', productId);
    const { data, error } = await q;
    if (error) {
      console.warn('[AI SafeQuery] Batches query notice:', error.message);
      return [];
    }
    return data || [];
  } catch (err) {
    console.error('[AI SafeQuery] Batches exception:', err);
    return [];
  }
};

const safeFetchProducts = async () => {
  try {
    const { data, error } = await supabase.from('products').select('*');
    if (error) {
      console.warn('[AI SafeQuery] Products query notice:', error.message);
      return [];
    }
    return data || [];
  } catch (err) {
    console.error('[AI SafeQuery] Products exception:', err);
    return [];
  }
};

const safeFetchPurchases = async () => {
  try {
    const { data, error } = await supabase.from('purchases').select('*');
    if (error) {
      console.warn('[AI SafeQuery] Purchases query notice:', error.message);
      return [];
    }
    return data || [];
  } catch (err) {
    console.error('[AI SafeQuery] Purchases exception:', err);
    return [];
  }
};

const safeFetchSuppliers = async () => {
  try {
    const { data, error } = await supabase.from('suppliers').select('*');
    if (error) {
      console.warn('[AI SafeQuery] Suppliers query notice:', error.message);
      return [];
    }
    return data || [];
  } catch (err) {
    console.error('[AI SafeQuery] Suppliers exception:', err);
    return [];
  }
};

const safeFetchCustomers = async () => {
  try {
    const { data, error } = await supabase.from('customers').select('*');
    if (error) {
      console.warn('[AI SafeQuery] Customers query notice:', error.message);
      return [];
    }
    return data || [];
  } catch (err) {
    console.error('[AI SafeQuery] Customers exception:', err);
    return [];
  }
};

const safeFetchWarehouses = async () => {
  try {
    const { data, error } = await supabase.from('warehouses').select('*');
    if (error) {
      console.warn('[AI SafeQuery] Warehouses query notice:', error.message);
      return [];
    }
    return data || [];
  } catch (err) {
    console.error('[AI SafeQuery] Warehouses exception:', err);
    return [];
  }
};

const safeFetchOrderItems = async () => {
  try {
    const { data, error } = await supabase.from('order_items').select('*');
    if (error) {
      console.warn('[AI SafeQuery] Order items query notice:', error.message);
      return [];
    }
    return data || [];
  } catch (err) {
    console.error('[AI SafeQuery] Order items exception:', err);
    return [];
  }
};

// ============================================================================
// MAIN AI ASSISTANT COMPONENT
// ============================================================================

export default function AIAssistant() {
  const { t, language } = useTranslation();
  const isRtl = language === 'ar';
  
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'assistant',
      content: isRtl 
        ? 'مرحباً بك في المساعد الذكي لنظام Supplyra ERP! 🤖\nيمكنني مساعدتك في الإجابة عن كافة بيانات المبيعات، المشتريات، المخزون، المنتجات، الموردين، والعملاء.\n\nجرّب أن تضغط على أحد الاقتراحات السريعة أو تسأل بأي صياغة تريد:'
        : 'Welcome to Supplyra ERP Smart Assistant! 🤖\nI can answer questions about your sales, purchases, inventory, products, suppliers, and customers.\n\nTry clicking a quick prompt or ask anything in natural language:',
      timestamp: new Date(),
      suggestions: isRtl ? [
        'كم عدد المنتجات؟',
        'كم إجمالي المبيعات؟',
        'كم عدد الموردين؟',
        'ما هي المنتجات منخفضة المخزون؟',
        'كم إجمالي المشتريات؟',
        'كم مبيعات آخر 7 أيام؟'
      ] : [
        'How many products?',
        "What's total sales?",
        'How many suppliers?',
        'Low stock products',
        'Total purchases',
        'Sales for last 7 days'
      ]
    }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [context, setContext] = useState<ConversationContext>({});
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat(isRtl ? 'ar-SA' : 'en-US', {
      style: 'currency',
      currency: 'SAR',
      maximumFractionDigits: 2
    }).format(val);
  };

  const processQuery = async (rawQuery: string): Promise<{ response: React.ReactNode; suggestions?: string[] }> => {
    const cleanRaw = rawQuery.trim();
    const normalized = normalizeArabic(cleanRaw);
    const dateRange = parseDateRange(normalized);

    // -------------------------------------------------------------
    // 0. AMBIGUITY CHECK (e.g., "كام الاجمالي؟", "ما هو المجموع؟", "total?")
    // -------------------------------------------------------------
    const isVagueTotal = /^(كام|كم|ايه|ما هو|ما هي|show|get|what is|whats|how much)?\s*(الاجمالي|المجموع|الكل|المبالغ|total|sum)\s*[\?؟]?$/i.test(normalized) ||
                         normalized === 'الاجمالي' || normalized === 'المجموع' || normalized === 'total';
    if (isVagueTotal) {
      return {
        response: isRtl 
          ? 'هل تقصد إجمالي المبيعات، إجمالي المشتريات، أم ملخص أداء النظام الشامل؟'
          : 'Did you mean total sales, total purchases, or overall performance summary?',
        suggestions: isRtl 
          ? ['إجمالي المبيعات', 'إجمالي المشتريات', 'ملخص أداء النظام']
          : ['Total Sales', 'Total Purchases', 'Performance Summary']
      };
    }

    // -------------------------------------------------------------
    // 1. SPECIFIC INVOICE / ORDER SEARCH (e.g., SO-2026-00018, PO-..., فاتورة ...)
    // -------------------------------------------------------------
    const invoiceMatch = cleanRaw.match(/\b(SO|PO|INV)[-\s]?\d{4}[-\s]?\d{3,6}\b/i) ||
                         cleanRaw.match(/\b(SO|PO)-\d+\b/i) ||
                         cleanRaw.match(/\bSO-[A-Za-z0-9-]+\b/i) ||
                         cleanRaw.match(/\bPO-[A-Za-z0-9-]+\b/i);

    if (invoiceMatch || (normalized.includes('فاتوره') && (normalized.includes('رقم') || /\d{3,}/.test(normalized)))) {
      const targetCode = invoiceMatch ? invoiceMatch[0].toUpperCase().replace(/\s+/g, '') : cleanRaw.match(/\d{4,}/)?.[0];
      
      if (targetCode) {
        console.group(`🤖 [AI Diagnostic] Invoice Search: "${targetCode}"`);
        
        // Search in Orders (Sales) safely
        const allOrders = await safeFetchOrders();
        const matchedOrder = allOrders.find((o: any) => 
          o.order_number && o.order_number.toUpperCase().includes(targetCode)
        );

        if (matchedOrder) {
          const od: any = matchedOrder;
          setContext({ lastCategory: 'sales', lastEntity: { type: 'invoice', code: od.order_number } });
          
          let custName = isRtl ? 'عميل نقدي' : 'Cash Customer';
          if (od.customer_id) {
            const customers = await safeFetchCustomers();
            const cust = customers.find((c: any) => c.id === od.customer_id);
            if (cust) custName = cust.name;
          }

          const allItems = await safeFetchOrderItems();
          const itemsList = allItems.filter((it: any) => it.order_id === od.id);
          const products = await safeFetchProducts();
          const prodMap = new Map(products.map((p: any) => [p.id, p]));

          const totalAmount = Number(od.grand_total ?? od.total_amount ?? od.total ?? od.subtotal ?? 0);
          console.groupEnd();

          return {
            response: (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div style={{ fontWeight: 700, fontSize: '1.05rem', color: 'var(--color-primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <FileText size={18} />
                  <span>{isRtl ? `تفاصيل فاتورة المبيعات (${od.order_number})` : `Sales Invoice Details (${od.order_number})`}</span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '0.875rem', backgroundColor: 'var(--color-surface-hover)', padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--color-border)' }}>
                  <div><strong>{isRtl ? 'العميل:' : 'Customer:'}</strong> {custName}</div>
                  <div><strong>{isRtl ? 'التاريخ:' : 'Date:'}</strong> {od.order_date || new Date(od.created_at).toLocaleDateString(isRtl ? 'ar-SA' : 'en-US')}</div>
                  <div>
                    <strong>{isRtl ? 'الحالة:' : 'Status:'}</strong>{' '}
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '2px 8px', borderRadius: '12px', fontSize: '0.75rem', backgroundColor: 'rgba(16, 185, 129, 0.1)', color: 'rgb(16, 185, 129)', fontWeight: 600 }}>
                      {od.status}
                    </span>
                  </div>
                  <div>
                    <strong>{isRtl ? 'حالة الدفع:' : 'Payment:'}</strong>{' '}
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '2px 8px', borderRadius: '12px', fontSize: '0.75rem', backgroundColor: 'rgba(59, 130, 246, 0.1)', color: 'rgb(59, 130, 246)', fontWeight: 600 }}>
                      {od.payment_status}
                    </span>
                  </div>
                  <div style={{ gridColumn: 'span 2', marginTop: '4px', paddingTop: '6px', borderTop: '1px dashed var(--color-border)' }}>
                    <strong>{isRtl ? 'الإجمالي:' : 'Total Amount:'}</strong>{' '}
                    <span style={{ color: 'var(--color-primary)', fontWeight: 700, fontSize: '1rem' }}>{formatCurrency(totalAmount)}</span>
                  </div>
                </div>
                {itemsList.length > 0 && (
                  <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: '8px' }}>
                    <div style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--color-text-secondary)', marginBottom: '6px' }}>
                      {isRtl ? 'بنود الفاتورة:' : 'Invoice Items:'}
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      {itemsList.map((it: any, idx: number) => {
                        const prod = prodMap.get(it.product_id);
                        const pName = prod?.name || (isRtl ? 'منتج غير محدد' : 'Item');
                        const pCode = prod?.product_code || '';
                        const qty = Number(it.quantity || 0);
                        const price = Number(it.unit_price || 0);
                        const rowTotal = Number(it.total || (qty * price));
                        return (
                          <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 10px', backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: '6px', fontSize: '0.85rem' }}>
                            <div>
                              <strong>{pName}</strong> {pCode && <span style={{ fontFamily: 'monospace', fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>({pCode})</span>}
                            </div>
                            <div>
                              <span>{qty} × {price.toFixed(2)} = </span>
                              <strong style={{ color: 'var(--color-primary)' }}>{formatCurrency(rowTotal)}</strong>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            ),
            suggestions: isRtl ? ['إجمالي المبيعات', 'المنتجات منخفضة المخزون', 'مبيعات هذا الشهر'] : ['Total Sales', 'Low Stock Products', 'Sales This Month']
          };
        }

        // Search in Purchases safely
        const allPurchases = await safeFetchPurchases();
        const matchedPurchase = allPurchases.find((p: any) => 
          (p.purchase_number && p.purchase_number.toUpperCase().includes(targetCode)) ||
          (p.invoice_number && p.invoice_number.toUpperCase().includes(targetCode))
        );

        if (matchedPurchase) {
          const pd: any = matchedPurchase;
          setContext({ lastCategory: 'purchases', lastEntity: { type: 'invoice', code: pd.purchase_number } });
          
          let suppName = isRtl ? 'مورد غير محدد' : 'Unknown Supplier';
          if (pd.supplier_id) {
            const suppliers = await safeFetchSuppliers();
            const supp = suppliers.find((s: any) => s.id === pd.supplier_id);
            if (supp) suppName = supp.name;
          }

          const totalPurchase = Number(pd.grand_total ?? pd.total_amount ?? pd.subtotal ?? pd.total ?? 0);
          console.groupEnd();

          return {
            response: (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div style={{ fontWeight: 700, fontSize: '1.05rem', color: '#2563eb', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <FileText size={18} />
                  <span>{isRtl ? `تفاصيل فاتورة الشراء (${pd.purchase_number || pd.invoice_number})` : `Purchase Invoice Details (${pd.purchase_number || pd.invoice_number})`}</span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '0.875rem', backgroundColor: 'var(--color-surface-hover)', padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--color-border)' }}>
                  <div><strong>{isRtl ? 'المورد:' : 'Supplier:'}</strong> {suppName}</div>
                  <div><strong>{isRtl ? 'التاريخ:' : 'Date:'}</strong> {pd.purchase_date || new Date(pd.created_at).toLocaleDateString(isRtl ? 'ar-SA' : 'en-US')}</div>
                  <div><strong>{isRtl ? 'الحالة:' : 'Status:'}</strong> {pd.status}</div>
                  <div><strong>{isRtl ? 'حالة الدفع:' : 'Payment:'}</strong> {pd.payment_status}</div>
                  <div style={{ gridColumn: 'span 2', marginTop: '4px', paddingTop: '6px', borderTop: '1px dashed var(--color-border)' }}>
                    <strong>{isRtl ? 'الإجمالي:' : 'Total Amount:'}</strong>{' '}
                    <span style={{ color: '#2563eb', fontWeight: 700, fontSize: '1rem' }}>{formatCurrency(totalPurchase)}</span>
                  </div>
                </div>
              </div>
            ),
            suggestions: isRtl ? ['إجمالي المشتريات', 'عدد الموردين', 'المنتجات منخفضة المخزون'] : ['Total Purchases', 'Suppliers Count', 'Low Stock Products']
          };
        }
        console.groupEnd();
      }
    }

    // -------------------------------------------------------------
    // 2. PRODUCT DETAILS & INVENTORY INQUIRY (e.g., بيبسي, ارز, كود منتج ...)
    // -------------------------------------------------------------
    const allProducts = await safeFetchProducts();
    const matchedProducts = allProducts.filter((p: any) => {
      const pNameNorm = normalizeArabic(p.name || '');
      const pCodeNorm = normalizeArabic(p.product_code || '');
      return (pNameNorm && normalized.includes(pNameNorm)) || (pCodeNorm && normalized.includes(pCodeNorm));
    });

    if (matchedProducts.length > 0 && !normalized.includes('كم عدد المنتجات') && !normalized.includes('عدد المنتجات')) {
      const p = matchedProducts[0];
      setContext({ lastCategory: 'products', lastEntity: { type: 'product', id: p.id, name: p.name, code: p.product_code } });
      
      const batches = await safeFetchInventoryBatches(p.id);
      const warehouses = await safeFetchWarehouses();
      const warehouseMap = new Map(warehouses.map((w: any) => [w.id, w.name]));

      let totalStock = 0;
      const warehouseBreakdown: Record<string, number> = {};

      batches.forEach((b: any) => {
        const isActive = b.active !== undefined ? Boolean(b.active) : true;
        const qty = Number(b.quantity || 0);
        if (isActive && qty > 0) {
          totalStock += qty;
          const wName = warehouseMap.get(b.warehouse_id) || (isRtl ? 'مستودع رئيسي' : 'Main Warehouse');
          warehouseBreakdown[wName] = (warehouseBreakdown[wName] || 0) + qty;
        }
      });

      const isLow = totalStock <= (p.min_stock || 0);

      return {
        response: (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ fontWeight: 700, fontSize: '1.05rem', color: 'var(--color-primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Package size={18} />
                <span>{p.name}</span>
                <span style={{ fontSize: '0.75rem', fontFamily: 'monospace', backgroundColor: 'var(--color-background)', border: '1px solid var(--color-border)', padding: '2px 7px', borderRadius: '4px' }}>
                  {p.product_code}
                </span>
              </div>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', padding: '3px 9px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 600, backgroundColor: isLow ? 'rgba(239, 68, 68, 0.1)' : 'rgba(16, 185, 129, 0.1)', color: isLow ? 'rgb(239, 68, 68)' : 'rgb(16, 185, 129)' }}>
                <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: isLow ? 'rgb(239, 68, 68)' : 'rgb(16, 185, 129)' }} />
                {isLow ? (isRtl ? 'مخزون منخفض' : 'Low Stock') : (isRtl ? 'متوفر' : 'In Stock')}
              </span>
            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px', fontSize: '0.85rem', backgroundColor: 'var(--color-surface-hover)', padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--color-border)' }}>
              <div><strong>{isRtl ? 'سعر البيع:' : 'Selling Price:'}</strong> {formatCurrency(Number(p.selling_price || 0))}</div>
              <div><strong>{isRtl ? 'تكلفة الشراء:' : 'Purchase Cost:'}</strong> {formatCurrency(Number(p.purchase_price || 0))}</div>
              <div><strong>{isRtl ? 'الرصيد المتاح:' : 'Total In Stock:'}</strong> <span style={{ fontWeight: 700, color: isLow ? '#dc2626' : '#059669', fontSize: '0.95rem' }}>{totalStock} {isRtl ? 'وحدة' : 'units'}</span></div>
              <div><strong>{isRtl ? 'حد إعادة الطلب:' : 'Min Reorder Level:'}</strong> {p.min_stock || 0}</div>
            </div>

            {Object.keys(warehouseBreakdown).length > 0 ? (
              <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: '6px' }}>
                <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--color-text-secondary)', marginBottom: '4px' }}>
                  {isRtl ? 'توزيع المخزون في المستودعات:' : 'Warehouse Distribution:'}
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                  {Object.entries(warehouseBreakdown).map(([wName, qty], i) => (
                    <div key={i} style={{ padding: '4px 10px', backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: '6px', fontSize: '0.8rem' }}>
                      🏢 {wName}: <strong>{qty}</strong>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', fontStyle: 'italic' }}>
                {isRtl ? '⚠️ لا توجد دفعات مخزون مسجلة لهذا المنتج في المستودعات.' : '⚠️ No warehouse stock batches recorded for this item.'}
              </div>
            )}
          </div>
        ),
        suggestions: isRtl ? [
          'المنتجات منخفضة المخزون',
          'إجمالي المبيعات',
          'كم عدد المنتجات؟'
        ] : [
          'Low stock products',
          'Total sales',
          'Products count'
        ]
      };
    }

    // -------------------------------------------------------------
    // 3. LOW STOCK & INVENTORY ALERTS (e.g., "المنتجات منخفضة المخزون", "مخزونها قليل", "low stock")
    // -------------------------------------------------------------
    const isLowStock = normalized.includes('منخفض') || normalized.includes('قليل') || normalized.includes('ناقص') ||
                       normalized.includes('low stock') || normalized.includes('reorder') || normalized.includes('اعاده طلب') ||
                       normalized.includes('نفد') || normalized.includes('غير متوفر') || normalized.includes('out of stock');

    if (isLowStock) {
      console.group(`🤖 [AI Diagnostic] Low Stock Query (Defensive Schema)`);
      setContext({ lastCategory: 'inventory' });
      
      const products = await safeFetchProducts();
      const batches = await safeFetchInventoryBatches();

      // Aggregate stock safely
      const stockMap: Record<string, number> = {};
      batches.forEach((b: any) => {
        const isActive = b.active !== undefined ? Boolean(b.active) : true;
        const qty = Number(b.quantity || 0);
        if (isActive && qty > 0) {
          stockMap[b.product_id] = (stockMap[b.product_id] || 0) + qty;
        }
      });

      const lowStockItems = products.map((p: any) => {
        const stock = stockMap[p.id] || 0;
        const min = Number(p.min_stock || 0);
        return {
          id: p.id,
          name: p.name,
          code: p.product_code,
          stock,
          min,
          deficit: min - stock
        };
      }).filter(p => p.stock <= p.min);

      console.log(`[AI Diagnostic] Found ${lowStockItems.length} low stock items.`);
      console.groupEnd();

      if (lowStockItems.length === 0) {
        return {
          response: isRtl 
            ? '✅ حالة المخزون ممتازة! جميع المنتجات يتوفر منها كميات أعلى من حد إعادة الطلب الأدنى.'
            : '✅ Inventory health is optimal! All products are stocked above reorder thresholds.',
          suggestions: isRtl ? ['إجمالي المبيعات', 'إجمالي المشتريات', 'عدد المنتجات'] : ['Total Sales', 'Total Purchases', 'Products Count']
        };
      }

      return {
        response: (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{ fontWeight: 700, fontSize: '1rem', color: '#dc2626', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <AlertTriangle size={18} />
              <span>{isRtl ? `تنبيه المخزون: هناك ${lowStockItems.length} منتجات تحتاج لإعادة طلب:` : `Stock Alert: ${lowStockItems.length} products require reordering:`}</span>
            </div>
            
            <div className="table-responsive" style={{ border: '1px solid var(--color-border)', borderRadius: '8px', overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', margin: 0, textAlign: isRtl ? 'right' : 'left' }}>
                <thead>
                  <tr style={{ backgroundColor: 'var(--color-background)', borderBottom: '2px solid var(--color-border)' }}>
                    <th style={{ padding: '8px 12px', fontSize: '0.8rem', fontWeight: 600, color: 'var(--color-text-secondary)' }}>{isRtl ? 'الكود' : 'Code'}</th>
                    <th style={{ padding: '8px 12px', fontSize: '0.8rem', fontWeight: 600, color: 'var(--color-text-secondary)' }}>{isRtl ? 'المنتج' : 'Product'}</th>
                    <th style={{ padding: '8px 12px', fontSize: '0.8rem', fontWeight: 600, color: 'var(--color-text-secondary)' }}>{isRtl ? 'المتاح' : 'Stock'}</th>
                    <th style={{ padding: '8px 12px', fontSize: '0.8rem', fontWeight: 600, color: 'var(--color-text-secondary)' }}>{isRtl ? 'الحد الأدنى' : 'Min'}</th>
                    <th style={{ padding: '8px 12px', fontSize: '0.8rem', fontWeight: 600, color: 'var(--color-text-secondary)' }}>{isRtl ? 'الحالة' : 'Status'}</th>
                  </tr>
                </thead>
                <tbody>
                  {lowStockItems.slice(0, 8).map((item, idx) => (
                    <tr key={idx} style={{ borderBottom: '1px solid var(--color-border)' }}>
                      <td style={{ padding: '8px 12px' }}>
                        <span style={{ fontSize: '0.75rem', fontFamily: 'monospace', backgroundColor: 'var(--color-background)', border: '1px solid var(--color-border)', padding: '2px 6px', borderRadius: '4px' }}>
                          {item.code}
                        </span>
                      </td>
                      <td style={{ padding: '8px 12px', fontSize: '0.85rem', fontWeight: 600 }}>{item.name}</td>
                      <td style={{ padding: '8px 12px', fontSize: '0.875rem', fontWeight: 700, color: item.stock === 0 ? '#dc2626' : '#d97706' }}>
                        {item.stock}
                      </td>
                      <td style={{ padding: '8px 12px', fontSize: '0.85rem', color: 'var(--color-text-secondary)' }}>{item.min}</td>
                      <td style={{ padding: '8px 12px' }}>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '2px 8px', borderRadius: '12px', fontSize: '0.72rem', fontWeight: 600, backgroundColor: item.stock === 0 ? 'rgba(239, 68, 68, 0.1)' : 'rgba(245, 158, 11, 0.1)', color: item.stock === 0 ? 'rgb(239, 68, 68)' : 'rgb(217, 119, 6)' }}>
                          <span style={{ width: '5px', height: '5px', borderRadius: '50%', backgroundColor: item.stock === 0 ? 'rgb(239, 68, 68)' : 'rgb(217, 119, 6)' }} />
                          {item.stock === 0 ? (isRtl ? 'نفد تماماً' : 'Out of Stock') : (isRtl ? 'منخفض' : 'Low')}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ),
        suggestions: isRtl ? ['إجمالي المشتريات', 'عدد الموردين', 'إجمالي المبيعات'] : ['Total Purchases', 'Suppliers Count', 'Total Sales']
      };
    }

    // -------------------------------------------------------------
    // 4. TOP SELLING PRODUCTS (e.g., "اكثر المنتجات مبيعا", "top selling", "best sellers")
    // -------------------------------------------------------------
    const isTopSelling = normalized.includes('اكثر') || normalized.includes('اعلى') || normalized.includes('top') ||
                         normalized.includes('best selling') || normalized.includes('most sold') || normalized.includes('الاشهر');

    if (isTopSelling && (normalized.includes('منتج') || normalized.includes('مبيع') || normalized.includes('طلب') || normalized.includes('product') || normalized.includes('sale'))) {
      console.group(`🤖 [AI Diagnostic] Top Selling Products Query`);
      setContext({ lastCategory: 'products' });
      
      const orderItems = await safeFetchOrderItems();
      const products = await safeFetchProducts();
      const prodMap = new Map(products.map((p: any) => [p.id, p]));

      if (orderItems.length === 0) {
        console.groupEnd();
        return { response: isRtl ? 'لا توجد بيانات مبيعات أو بنود فواتير مسجلة حتى الآن.' : 'No sales item records available yet.' };
      }

      const salesMap: Record<string, { name: string; code: string; qty: number; revenue: number }> = {};
      orderItems.forEach((it: any) => {
        const prod = prodMap.get(it.product_id);
        const name = prod?.name || 'Unknown Product';
        const code = prod?.product_code || '';
        const qty = Number(it.quantity || 0);
        const unitPrice = Number(it.unit_price || prod?.selling_price || 0);
        const rev = Number(it.total || (qty * unitPrice));

        if (!salesMap[name]) {
          salesMap[name] = { name, code, qty: 0, revenue: 0 };
        }
        salesMap[name].qty += qty;
        salesMap[name].revenue += rev;
      });

      const topProducts = Object.values(salesMap).sort((a, b) => b.qty - a.qty).slice(0, 5);
      console.log('[AI Diagnostic] Top products calculated:', topProducts);
      console.groupEnd();

      return {
        response: (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ fontWeight: 700, fontSize: '1.05rem', color: 'var(--color-primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <TrendingUp size={18} />
              <span>{isRtl ? 'أكثر المنتجات طلباً ومبيعاً في النظام:' : 'Top Selling & Highest Demand Products:'}</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {topProducts.map((p, i) => (
                <div key={i} style={{ padding: '8px 12px', backgroundColor: 'var(--color-surface-hover)', borderRadius: '8px', border: '1px solid var(--color-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{i + 1}. {p.name}</div>
                    {p.code && <div style={{ fontSize: '0.75rem', fontFamily: 'monospace', color: 'var(--color-text-secondary)' }}>{p.code}</div>}
                  </div>
                  <div style={{ textAlign: isRtl ? 'left' : 'right' }}>
                    <div style={{ fontWeight: 700, color: 'var(--color-primary)' }}>{p.qty} {isRtl ? 'وحدة مباعة' : 'units sold'}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>{formatCurrency(p.revenue)}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ),
        suggestions: isRtl ? ['إجمالي المبيعات', 'مبيعات هذا الشهر', 'المنتجات منخفضة المخزون'] : ['Total Sales', 'Sales This Month', 'Low Stock Products']
      };
    }

    // -------------------------------------------------------------
    // 5. SALES INTENTS (e.g., "كم اجمالي المبيعات", "مبيعاتي كام", "sales last 7 days", "مبيعات اليوم")
    // -------------------------------------------------------------
    const isSales = normalized.includes('مبيع') || normalized.includes('بيع') || normalized.includes('sales') ||
                    normalized.includes('revenue') || normalized.includes('دخل') ||
                    (context.lastCategory === 'sales' && dateRange.hasExplicitDate);

    if (isSales) {
      console.group(`🤖 [AI Diagnostic] Sales Query (Defensive Schema)`);
      setContext({ lastCategory: 'sales', lastDateRange: dateRange });
      
      const allOrders = await safeFetchOrders(dateRange.hasExplicitDate ? dateRange : undefined);
      
      // Calculate revenue defensively without relying on exact column name
      let totalSales = 0;
      let paidOrders = 0;
      let unpaidOrders = 0;

      allOrders.forEach((o: any) => {
        if (o.status !== 'CANCELLED') {
          const val = Number(o.grand_total ?? o.total_amount ?? o.total ?? o.subtotal ?? 0);
          totalSales += val;
          if (o.payment_status === 'PAID') {
            paidOrders++;
          } else {
            unpaidOrders++;
          }
        }
      });

      const ordersCount = allOrders.filter((o: any) => o.status !== 'CANCELLED').length;
      const periodText = isRtl ? dateRange.labelAr : dateRange.labelEn;
      console.log(`[AI Diagnostic] Total Sales: ${totalSales}, Orders Count: ${ordersCount}`);
      console.groupEnd();

      return {
        response: (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{ fontWeight: 700, fontSize: '1.05rem', color: 'var(--color-primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <DollarSign size={18} />
              <span>{isRtl ? `تقرير المبيعات (${periodText}):` : `Sales Report (${periodText}):`}</span>
            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px', fontSize: '0.875rem' }}>
              <div style={{ padding: '10px 14px', backgroundColor: 'var(--color-surface-hover)', borderRadius: '8px', border: '1px solid var(--color-border)' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>{isRtl ? 'إجمالي قيمة المبيعات' : 'Total Revenue'}</div>
                <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--color-primary)', marginTop: '2px' }}>{formatCurrency(totalSales)}</div>
              </div>
              <div style={{ padding: '10px 14px', backgroundColor: 'var(--color-surface-hover)', borderRadius: '8px', border: '1px solid var(--color-border)' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>{isRtl ? 'عدد طلبات البيع' : 'Total Orders'}</div>
                <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--color-text-primary)', marginTop: '2px' }}>{ordersCount} {isRtl ? 'طلب' : 'orders'}</div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '12px', fontSize: '0.8rem', color: 'var(--color-text-secondary)', paddingInlineStart: '4px' }}>
              <span>✅ {isRtl ? 'مدفوعة بالكامل:' : 'Paid Orders:'} <strong>{paidOrders}</strong></span>
              <span>⏳ {isRtl ? 'بانتظار التحصيل:' : 'Unpaid/Partial:'} <strong>{unpaidOrders}</strong></span>
            </div>
          </div>
        ),
        suggestions: isRtl ? [
          'مبيعات اليوم',
          'مبيعات آخر 7 أيام',
          'أكثر المنتجات مبيعاً',
          'المنتجات منخفضة المخزون'
        ] : [
          'Sales today',
          'Sales last 7 days',
          'Top selling products',
          'Low stock products'
        ]
      };
    }

    // -------------------------------------------------------------
    // 6. PURCHASES INTENTS (e.g., "كم اجمالي المشتريات", "مشترياتي", "purchases")
    // -------------------------------------------------------------
    const isPurchases = normalized.includes('مشتري') || normalized.includes('شراء') || normalized.includes('purchas') ||
                        normalized.includes('فواتير الشراء') || (context.lastCategory === 'purchases' && dateRange.hasExplicitDate);

    if (isPurchases) {
      console.group(`🤖 [AI Diagnostic] Purchases Query (Defensive Schema)`);
      setContext({ lastCategory: 'purchases', lastDateRange: dateRange });
      
      const allPurchases = await safeFetchPurchases();
      
      const filtered = allPurchases.filter((p: any) => {
        if (p.status === 'CANCELLED') return false;
        if (!dateRange.start && !dateRange.end) return true;
        const dStr = p.purchase_date || p.created_at;
        if (!dStr) return true;
        const t = new Date(dStr).getTime();
        if (dateRange.start && t < dateRange.start.getTime()) return false;
        if (dateRange.end && t > dateRange.end.getTime()) return false;
        return true;
      });

      let totalPurchases = 0;
      filtered.forEach((p: any) => {
        const val = Number(p.grand_total ?? p.total_amount ?? p.subtotal ?? p.total ?? 0);
        totalPurchases += val;
      });

      const count = filtered.length;
      const periodText = isRtl ? dateRange.labelAr : dateRange.labelEn;
      console.log(`[AI Diagnostic] Total Purchases: ${totalPurchases}, Count: ${count}`);
      console.groupEnd();

      return {
        response: (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{ fontWeight: 700, fontSize: '1.05rem', color: '#2563eb', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Layers size={18} />
              <span>{isRtl ? `تقرير المشتريات (${periodText}):` : `Purchases Report (${periodText}):`}</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px', fontSize: '0.875rem' }}>
              <div style={{ padding: '10px 14px', backgroundColor: 'var(--color-surface-hover)', borderRadius: '8px', border: '1px solid var(--color-border)' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>{isRtl ? 'إجمالي المشتريات' : 'Total Purchases'}</div>
                <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#2563eb', marginTop: '2px' }}>{formatCurrency(totalPurchases)}</div>
              </div>
              <div style={{ padding: '10px 14px', backgroundColor: 'var(--color-surface-hover)', borderRadius: '8px', border: '1px solid var(--color-border)' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>{isRtl ? 'عدد فواتير الشراء' : 'Purchase Invoices'}</div>
                <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--color-text-primary)', marginTop: '2px' }}>{count} {isRtl ? 'فاتورة' : 'invoices'}</div>
              </div>
            </div>
          </div>
        ),
        suggestions: isRtl ? ['عدد الموردين', 'إجمالي المبيعات', 'المنتجات منخفضة المخزون'] : ['Suppliers Count', 'Total Sales', 'Low Stock Products']
      };
    }

    // -------------------------------------------------------------
    // 7. SUPPLIERS INTENTS (e.g., "كم عدد الموردين", "الموردين", "suppliers")
    // -------------------------------------------------------------
    const isSuppliers = normalized.includes('مورد') || normalized.includes('الموردين') || normalized.includes('الموردون') || normalized.includes('supplier');
    if (isSuppliers) {
      console.group(`🤖 [AI Diagnostic] Suppliers Query`);
      setContext({ lastCategory: 'suppliers' });
      
      const suppliersList = await safeFetchSuppliers();
      const count = suppliersList.length;
      console.log(`[AI Diagnostic] Suppliers Count: ${count}`);
      console.groupEnd();

      return {
        response: (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ fontWeight: 700, fontSize: '1.05rem', color: '#8b5cf6', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Factory size={18} />
              <span>{isRtl ? `الموردون المعتمدون في النظام (${count} مورد):` : `Approved System Suppliers (${count} suppliers):`}</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {suppliersList.slice(0, 6).map((s: any, i: number) => (
                <div key={i} style={{ padding: '8px 12px', backgroundColor: 'var(--color-surface-hover)', borderRadius: '6px', border: '1px solid var(--color-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.85rem' }}>
                  <strong>{s.name}</strong>
                  <span style={{ color: 'var(--color-text-muted)', fontSize: '0.8rem' }}>{s.code || ''} {s.phone ? `— 📞 ${s.phone}` : ''}</span>
                </div>
              ))}
            </div>
          </div>
        ),
        suggestions: isRtl ? ['إجمالي المشتريات', 'المنتجات منخفضة المخزون', 'إجمالي المبيعات'] : ['Total Purchases', 'Low Stock Products', 'Total Sales']
      };
    }

    // -------------------------------------------------------------
    // 8. CUSTOMERS INTENTS (e.g., "كم عدد العملاء", "العملاء", "customers")
    // -------------------------------------------------------------
    const isCustomers = normalized.includes('عميل') || normalized.includes('العملاء') || normalized.includes('زبون') || normalized.includes('customer');
    if (isCustomers) {
      console.group(`🤖 [AI Diagnostic] Customers Query`);
      setContext({ lastCategory: 'customers' });
      
      const customersList = await safeFetchCustomers();
      const count = customersList.length;
      console.log(`[AI Diagnostic] Customers Count: ${count}`);
      console.groupEnd();

      return {
        response: (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ fontWeight: 700, fontSize: '1.05rem', color: '#10b981', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Users size={18} />
              <span>{isRtl ? `قاعدة العملاء المسجلين (${count} عميل):` : `Registered Customers Base (${count} customers):`}</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {customersList.slice(0, 6).map((c: any, i: number) => (
                <div key={i} style={{ padding: '8px 12px', backgroundColor: 'var(--color-surface-hover)', borderRadius: '6px', border: '1px solid var(--color-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.85rem' }}>
                  <strong>{c.name}</strong>
                  <span style={{ color: 'var(--color-text-muted)', fontSize: '0.8rem' }}>{c.phone || c.mobile || ''}</span>
                </div>
              ))}
            </div>
          </div>
        ),
        suggestions: isRtl ? ['إجمالي المبيعات هذا الشهر', 'أكثر المنتجات مبيعاً', 'المنتجات منخفضة المخزون'] : ['Sales This Month', 'Top Selling Products', 'Low Stock Products']
      };
    }

    // -------------------------------------------------------------
    // 9. WAREHOUSES & PRODUCTS COUNT (e.g., "عدد المنتجات", "عدد المستودعات")
    // -------------------------------------------------------------
    if (normalized.includes('عدد المنتجات') || normalized.includes('كم منتج') || normalized.includes('products count') || normalized === 'المنتجات') {
      const prods = await safeFetchProducts();
      const count = prods.length;

      return {
        response: (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.95rem' }}>
            <Package size={20} color="var(--color-primary)" />
            <span>
              {isRtl 
                ? `عدد المنتجات المسجلة في النظام حالياً: `
                : `Total registered products in system: `}
              <strong style={{ color: 'var(--color-primary)', fontSize: '1.1rem' }}>{count}</strong> {isRtl ? 'منتج' : 'products'}.
            </span>
          </div>
        ),
        suggestions: isRtl ? ['المنتجات منخفضة المخزون', 'أكثر المنتجات مبيعاً', 'إجمالي المبيعات'] : ['Low Stock Products', 'Top Selling Products', 'Total Sales']
      };
    }

    if (normalized.includes('المستودعات') || normalized.includes('مستودع') || normalized.includes('warehouses')) {
      const wList = await safeFetchWarehouses();
      const count = wList.length;

      return {
        response: (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ fontWeight: 700, color: 'var(--color-primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Building2 size={18} />
              <span>{isRtl ? `المستودعات المتاحة في النظام (${count} مستودع):` : `Available Warehouses (${count} warehouses):`}</span>
            </div>
            {wList.map((w: any, i: number) => (
              <div key={i} style={{ padding: '8px 12px', backgroundColor: 'var(--color-surface-hover)', borderRadius: '6px', border: '1px solid var(--color-border)', fontSize: '0.85rem' }}>
                <strong>{w.name}</strong> <span style={{ fontFamily: 'monospace', fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>({w.code || '-'})</span> {w.location ? `— 📍 ${w.location}` : ''}
              </div>
            ))}
          </div>
        ),
        suggestions: isRtl ? ['المنتجات منخفضة المخزون', 'إجمالي المبيعات', 'عدد المنتجات'] : ['Low Stock Products', 'Total Sales', 'Products Count']
      };
    }

    // -------------------------------------------------------------
    // 10. OVERALL PERFORMANCE / ANALYTICS SUMMARY
    // -------------------------------------------------------------
    const isPerformance = normalized.includes('ملخص') || normalized.includes('تقرير') || normalized.includes('اداء') ||
                          normalized.includes('ارباح') || normalized.includes('صافي') || normalized.includes('performance') ||
                          normalized.includes('summary') || normalized.includes('profit');

    if (isPerformance) {
      console.group(`🤖 [AI Diagnostic] Performance Summary Query`);
      setContext({ lastCategory: 'analytics' });
      
      const [orders, purchases, orderItems, products] = await Promise.all([
        safeFetchOrders(),
        safeFetchPurchases(),
        safeFetchOrderItems(),
        safeFetchProducts()
      ]);

      let totalSales = 0;
      orders.forEach((o: any) => {
        if (o.status !== 'CANCELLED') {
          totalSales += Number(o.grand_total ?? o.total_amount ?? o.total ?? o.subtotal ?? 0);
        }
      });

      let totalPurchases = 0;
      purchases.forEach((p: any) => {
        if (p.status !== 'CANCELLED') {
          totalPurchases += Number(p.grand_total ?? p.total_amount ?? p.subtotal ?? p.total ?? 0);
        }
      });

      const prodCostMap = new Map(products.map((p: any) => [p.id, Number(p.purchase_price || 0)]));
      let totalCogs = 0;
      orderItems.forEach((it: any) => {
        const cost = prodCostMap.get(it.product_id) || 0;
        totalCogs += cost * Number(it.quantity || 0);
      });

      const grossProfit = totalSales - totalCogs;
      console.log(`[AI Diagnostic] Summary -> Sales: ${totalSales}, Purchases: ${totalPurchases}, COGS: ${totalCogs}, Gross Profit: ${grossProfit}`);
      console.groupEnd();

      return {
        response: (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{ fontWeight: 700, fontSize: '1.05rem', color: 'var(--color-primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Sparkles size={18} />
              <span>{isRtl ? 'ملخص الأداء المالي والتشغيلي للنظام:' : 'Overall Business & Financial Summary:'}</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px', fontSize: '0.875rem' }}>
              <div style={{ padding: '10px 14px', backgroundColor: 'rgba(16, 185, 129, 0.1)', borderRadius: '8px', border: '1px solid rgba(16, 185, 129, 0.2)' }}>
                <div style={{ fontSize: '0.75rem', color: '#047857', fontWeight: 600 }}>{isRtl ? 'إجمالي المبيعات' : 'Total Sales'}</div>
                <div style={{ fontSize: '1.15rem', fontWeight: 800, color: '#047857', marginTop: '2px' }}>{formatCurrency(totalSales)}</div>
              </div>
              <div style={{ padding: '10px 14px', backgroundColor: 'rgba(37, 99, 235, 0.1)', borderRadius: '8px', border: '1px solid rgba(37, 99, 235, 0.2)' }}>
                <div style={{ fontSize: '0.75rem', color: '#1d4ed8', fontWeight: 600 }}>{isRtl ? 'إجمالي المشتريات' : 'Total Purchases'}</div>
                <div style={{ fontSize: '1.15rem', fontWeight: 800, color: '#1d4ed8', marginTop: '2px' }}>{formatCurrency(totalPurchases)}</div>
              </div>
              <div style={{ padding: '10px 14px', backgroundColor: 'rgba(245, 158, 11, 0.1)', borderRadius: '8px', border: '1px solid rgba(245, 158, 11, 0.2)' }}>
                <div style={{ fontSize: '0.75rem', color: '#b45309', fontWeight: 600 }}>{isRtl ? 'تكلفة البضاعة المباعة (COGS)' : 'Total COGS'}</div>
                <div style={{ fontSize: '1.15rem', fontWeight: 800, color: '#b45309', marginTop: '2px' }}>{formatCurrency(totalCogs)}</div>
              </div>
              <div style={{ padding: '10px 14px', backgroundColor: grossProfit >= 0 ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)', borderRadius: '8px', border: '1px solid var(--color-border)' }}>
                <div style={{ fontSize: '0.75rem', color: grossProfit >= 0 ? '#047857' : '#b91c1c', fontWeight: 600 }}>{isRtl ? 'مجمل الربح التقديري' : 'Est. Gross Profit'}</div>
                <div style={{ fontSize: '1.15rem', fontWeight: 800, color: grossProfit >= 0 ? '#047857' : '#b91c1c', marginTop: '2px' }}>{formatCurrency(grossProfit)}</div>
              </div>
            </div>
          </div>
        ),
        suggestions: isRtl ? ['إجمالي المبيعات هذا الشهر', 'أكثر المنتجات مبيعاً', 'المنتجات منخفضة المخزون'] : ['Sales This Month', 'Top Selling Products', 'Low Stock Products']
      };
    }

    // -------------------------------------------------------------
    // DEFAULT INTENT: GENERAL ASSISTANCE
    // -------------------------------------------------------------
    return {
      response: isRtl ? (
        <div>
          <p style={{ margin: '0 0 6px 0' }}>
            لم أستطع تحديد المطلوب بدقة من عبارتك. يمكنك الاستفسار عن:
          </p>
          <ul style={{ margin: 0, paddingInlineStart: '20px', fontSize: '0.875rem' }}>
            <li>المبيعات (إجمالي المبيعات، مبيعات اليوم، مبيعات الشهر)</li>
            <li>المخزون (المنتجات منخفضة المخزون، الاستفسار عن منتج بالاسم أو الكود)</li>
            <li>المشتريات والموردين (إجمالي المشتريات، عدد الموردين)</li>
            <li>البحث عن فاتورة محددة (مثل: SO-2026-00018 أو رقم الفاتورة)</li>
          </ul>
        </div>
      ) : (
        <div>
          <p style={{ margin: '0 0 6px 0' }}>
            I couldn't quite understand your query. You can ask about:
          </p>
          <ul style={{ margin: 0, paddingInlineStart: '20px', fontSize: '0.875rem' }}>
            <li>Sales (Total sales, today's sales, this month)</li>
            <li>Inventory (Low stock items, search product stock by name or code)</li>
            <li>Purchases & Suppliers (Total purchases, suppliers list)</li>
            <li>Specific Invoices (e.g., SO-2026-00018)</li>
          </ul>
        </div>
      ),
      suggestions: isRtl ? [
        'كم إجمالي المبيعات؟',
        'ما هي المنتجات منخفضة المخزون؟',
        'كم إجمالي المشتريات؟',
        'كم عدد المنتجات؟'
      ] : [
        "What's total sales?",
        'Low stock products',
        'Total purchases',
        'Products count'
      ]
    };
  };

  const executeMessage = async (queryText: string) => {
    const userMsg: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: queryText,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMsg]);
    setLoading(true);

    try {
      await new Promise(r => setTimeout(r, 200));
      const { response, suggestions } = await processQuery(queryText);
      
      setMessages(prev => [...prev, { 
        id: (Date.now() + 1).toString(), 
        role: 'assistant', 
        content: response, 
        suggestions,
        timestamp: new Date() 
      }]);
    } catch (err: any) {
      console.error('[AI Assistant Safe Fallback Catch]', err);
      setMessages(prev => [...prev, { 
        id: (Date.now() + 1).toString(), 
        role: 'assistant', 
        content: isRtl ? (
          <div>
            <p style={{ margin: 0, fontWeight: 600 }}>
              نعتذر، لم نتمكن من إتمام الاستعلام حالياً.
            </p>
            <p style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)', margin: '4px 0 0 0' }}>
              يرجى المحاولة مجدداً أو اختيار أحد الأسئلة السريعة أدناه.
            </p>
          </div>
        ) : (
          <div>
            <p style={{ margin: 0, fontWeight: 600 }}>
              Could not complete this query at the moment.
            </p>
            <p style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)', margin: '4px 0 0 0' }}>
              Please try again or pick one of the quick options below.
            </p>
          </div>
        ),
        suggestions: isRtl ? ['إجمالي المبيعات', 'المنتجات منخفضة المخزون', 'عدد المنتجات'] : ['Total Sales', 'Low Stock Products', 'Products Count'],
        timestamp: new Date() 
      }]);
    } finally {
      setLoading(false);
    }
  };

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || loading) return;
    const q = input;
    setInput('');
    executeMessage(q);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 120px)', minHeight: '500px', gap: '1rem' }}>
      <div>
        <h1 style={{ margin: 0, fontSize: 'clamp(1.3rem, 4vw, 1.75rem)', fontWeight: 700, color: 'var(--color-text-primary)', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <span>{isRtl ? 'المساعد الذكي' : 'AI Assistant'}</span>
          <Sparkles style={{ color: '#8b5cf6' }} size={24} />
        </h1>
        <p style={{ color: 'var(--color-text-secondary)', margin: '4px 0 0 0', fontSize: '0.9rem' }}>
          {isRtl 
            ? 'اطرح أسئلتك بأي صياغة طبيعية عن المبيعات، المشتريات، المخزون، والعملاء، واحصل على إجابات مباشرة من بيانات النظام'
            : 'Ask questions in natural language about sales, purchases, inventory, and customers, backed by real live data'}
        </p>
      </div>

      <div className="card" style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', padding: 0, backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: '12px' }}>
        {/* Messages Scroll Area */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {messages.map((msg) => (
            <div 
              key={msg.id} 
              style={{ 
                display: 'flex', 
                gap: '0.875rem', 
                alignSelf: msg.role === 'user' ? (isRtl ? 'flex-start' : 'flex-end') : (isRtl ? 'flex-end' : 'flex-start'),
                maxWidth: '85%',
                flexDirection: msg.role === 'user' ? 'row-reverse' : 'row'
              }}
            >
              <div 
                style={{ 
                  width: '36px', 
                  height: '36px', 
                  borderRadius: '50%', 
                  backgroundColor: msg.role === 'user' ? 'var(--color-primary)' : '#8b5cf6',
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center', 
                  color: 'white',
                  flexShrink: 0
                }}
              >
                {msg.role === 'user' ? <User size={18} /> : <Bot size={18} />}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxWidth: '100%' }}>
                <div 
                  style={{ 
                    backgroundColor: msg.role === 'user' ? 'var(--color-primary)' : 'var(--color-surface-hover)',
                    color: msg.role === 'user' ? 'white' : 'var(--color-text-primary)',
                    padding: '0.875rem 1.15rem',
                    borderRadius: '12px',
                    borderTopRightRadius: msg.role === 'user' && !isRtl ? 0 : '12px',
                    borderTopLeftRadius: msg.role === 'user' && isRtl ? 0 : (msg.role === 'assistant' && !isRtl ? 0 : '12px'),
                    fontSize: '0.9rem',
                    lineHeight: '1.5',
                    border: msg.role === 'assistant' ? '1px solid var(--color-border)' : 'none',
                    whiteSpace: typeof msg.content === 'string' ? 'pre-wrap' : 'normal'
                  }}
                >
                  {msg.content}
                </div>
                
                {/* Suggestions Pills */}
                {msg.suggestions && msg.suggestions.length > 0 && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '2px' }}>
                    {msg.suggestions.map((sug, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => executeMessage(sug)}
                        disabled={loading}
                        style={{
                          backgroundColor: 'var(--color-surface)',
                          border: '1px solid var(--color-border)',
                          borderRadius: '16px',
                          padding: '4px 12px',
                          fontSize: '0.78rem',
                          fontWeight: 500,
                          color: 'var(--color-primary)',
                          cursor: loading ? 'not-allowed' : 'pointer',
                          transition: 'all 0.15s ease',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px'
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--color-surface-hover)')}
                        onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'var(--color-surface)')}
                      >
                        ⚡ {sug}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}

          {loading && (
            <div style={{ display: 'flex', gap: '0.875rem', alignSelf: 'flex-start' }}>
              <div style={{ width: '36px', height: '36px', borderRadius: '50%', backgroundColor: '#8b5cf6', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', flexShrink: 0 }}>
                <Bot size={18} />
              </div>
              <div style={{ backgroundColor: 'var(--color-surface-hover)', padding: '0.875rem 1.15rem', borderRadius: '12px', borderTopLeftRadius: 0, color: 'var(--color-text-secondary)', display: 'flex', alignItems: 'center', gap: '8px', border: '1px solid var(--color-border)', fontSize: '0.85rem' }}>
                <RefreshCw size={15} style={{ animation: 'spin 1s linear infinite' }} />
                <span>{isRtl ? 'جاري البحث والتحليل في بيانات النظام المباشرة...' : 'Querying and analyzing live ERP data...'}</span>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
        
        {/* Input Bar */}
        <div style={{ padding: '0.875rem 1rem', borderTop: '1px solid var(--color-border)', backgroundColor: 'var(--color-surface)' }}>
          <form onSubmit={handleSend} style={{ display: 'flex', gap: '0.75rem' }}>
            <input 
              type="text" 
              value={input}
              onChange={e => setInput(e.target.value)}
              placeholder={isRtl ? 'اسأل عن المبيعات، المشتريات، المخزون، أو الفواتير...' : 'Ask about sales, purchases, stock, or invoices...'}
              style={{ flex: 1, padding: '0.75rem 1.25rem', borderRadius: '8px', border: '1px solid var(--color-border)', backgroundColor: 'var(--color-background)', color: 'var(--color-text-primary)', fontSize: '0.9rem', outline: 'none' }}
              disabled={loading}
            />
            <button 
              type="submit" 
              disabled={loading || !input.trim()}
              style={{ padding: '0 1.5rem', backgroundColor: '#8b5cf6', color: 'white', border: 'none', borderRadius: '8px', cursor: (loading || !input.trim()) ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', opacity: (loading || !input.trim()) ? 0.6 : 1, transition: 'all 0.2s', fontWeight: 600, fontSize: '0.875rem' }}
            >
              <Send size={16} style={{ transform: isRtl ? 'scaleX(-1)' : 'none' }} />
              <span>{isRtl ? 'إرسال' : 'Send'}</span>
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
