import React, { useState, useRef, useEffect } from 'react';
import { useTranslation } from '../../contexts/LanguageContext';
import { supabase } from '../../lib/supabase';
import { Bot, Send, User, Sparkles, TrendingUp, Package, Users, Factory, FileText, AlertTriangle, CheckCircle, RefreshCw, Layers, DollarSign } from 'lucide-react';

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
    const diff = now.getDate() - day + (day === 6 ? 0 : -1); // Saturday as start of week
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

export default function AIAssistant() {
  const { t, language } = useTranslation();
  const isRtl = language === 'ar';
  
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'assistant',
      content: isRtl 
        ? 'مرحباً بك في المساعد الذكي لنظام Supplyra ERP! 🤖\nيمكنني مساعدتك في الإجابة عن كافة بيانات المبيعات، المشتريات، المخزون، المنتجات، الموردين، والعملاء.\n\nجرّب أن تسألني بأي صياغة تريد:'
        : 'Welcome to Supplyra ERP Smart Assistant! 🤖\nI can answer questions about your sales, purchases, inventory, products, suppliers, and customers.\n\nTry asking me in natural language:',
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
        console.log('Querying orders table by order_number ilike:', `%${targetCode}%`);
        
        // Search in Orders (Sales)
        const { data: orderData, error: orderErr } = await supabase
          .from('orders')
          .select(`
            id, order_number, order_date, grand_total, status, payment_status, created_at,
            customer:customers(name, mobile, phone)
          `)
          .ilike('order_number', `%${targetCode}%`)
          .maybeSingle();

        if (orderErr) {
          console.error('[AI Diagnostic] Orders query error:', orderErr);
        }

        if (orderData) {
          console.log('[AI Diagnostic] Order found:', orderData);
          const od: any = orderData;
          setContext({ lastCategory: 'sales', lastEntity: { type: 'invoice', code: od.order_number } });
          const custName = (Array.isArray(od.customer) ? od.customer[0]?.name : od.customer?.name) || (isRtl ? 'عميل نقدي' : 'Cash Customer');
          
          // Fetch order items
          const { data: itemsList, error: itemsErr } = await supabase
            .from('order_items')
            .select(`
              quantity, unit_price, total,
              product:products(name, product_code)
            `)
            .eq('order_id', od.id);

          if (itemsErr) console.warn('[AI Diagnostic] Order items error:', itemsErr);
          console.groupEnd();

          return {
            response: (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ fontWeight: 700, fontSize: '1.05rem', color: 'var(--color-primary)' }}>
                  📄 {isRtl ? `تفاصيل فاتورة المبيعات (${od.order_number})` : `Sales Invoice Details (${od.order_number})`}
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '0.875rem' }}>
                  <div><strong>{isRtl ? 'العميل:' : 'Customer:'}</strong> {custName}</div>
                  <div><strong>{isRtl ? 'التاريخ:' : 'Date:'}</strong> {new Date(od.created_at).toLocaleDateString(isRtl ? 'ar-SA' : 'en-US')}</div>
                  <div><strong>{isRtl ? 'الحالة:' : 'Status:'}</strong> {od.status}</div>
                  <div><strong>{isRtl ? 'حالة الدفع:' : 'Payment:'}</strong> {od.payment_status}</div>
                  <div style={{ gridColumn: 'span 2' }}>
                    <strong>{isRtl ? 'الإجمالي:' : 'Total Amount:'}</strong> <span style={{ color: 'var(--color-primary)', fontWeight: 700 }}>{formatCurrency(Number(od.grand_total || 0))}</span>
                  </div>
                </div>
                {(itemsList || []).length > 0 && (
                  <div style={{ marginTop: '6px', borderTop: '1px solid var(--color-border)', paddingTop: '6px' }}>
                    <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--color-text-secondary)', marginBottom: '4px' }}>
                      {isRtl ? 'المنتجات بالفاتورة:' : 'Invoice Items:'}
                    </div>
                    <ul style={{ margin: 0, paddingInlineStart: '20px', fontSize: '0.85rem' }}>
                      {(itemsList || []).map((it: any, idx: number) => {
                        const pName = (Array.isArray(it.product) ? it.product[0]?.name : it.product?.name) || (isRtl ? 'منتج' : 'Item');
                        return <li key={idx}>{pName} × {it.quantity} = {formatCurrency(Number(it.total || (it.quantity * it.unit_price)))}</li>;
                      })}
                    </ul>
                  </div>
                )}
              </div>
            )
          };
        }

        // Search in Purchases
        console.log('Querying purchases table by purchase_number / invoice_number ilike:', `%${targetCode}%`);
        const { data: purchaseData, error: purErr } = await supabase
          .from('purchases')
          .select(`
            id, purchase_number, invoice_number, purchase_date, grand_total, subtotal, status, payment_status, created_at,
            supplier:suppliers(name, phone)
          `)
          .or(`purchase_number.ilike.%${targetCode}%,invoice_number.ilike.%${targetCode}%`)
          .maybeSingle();

        if (purErr) {
          console.error('[AI Diagnostic] Purchases query error:', purErr);
        }

        if (purchaseData) {
          console.log('[AI Diagnostic] Purchase found:', purchaseData);
          const pd: any = purchaseData;
          setContext({ lastCategory: 'purchases', lastEntity: { type: 'invoice', code: pd.purchase_number } });
          const suppName = (Array.isArray(pd.supplier) ? pd.supplier[0]?.name : pd.supplier?.name) || (isRtl ? 'مورد غير محدد' : 'Unknown Supplier');
          
          const { data: pItemsList, error: pItemsErr } = await supabase
            .from('purchase_items')
            .select(`
              quantity, purchase_price, total,
              product:products(name, product_code)
            `)
            .eq('purchase_id', pd.id);

          if (pItemsErr) console.warn('[AI Diagnostic] Purchase items error:', pItemsErr);
          console.groupEnd();

          return {
            response: (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ fontWeight: 700, fontSize: '1.05rem', color: '#2563eb' }}>
                  📦 {isRtl ? `تفاصيل فاتورة المشتريات (${pd.purchase_number})` : `Purchase Invoice Details (${pd.purchase_number})`}
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '0.875rem' }}>
                  <div><strong>{isRtl ? 'المورد:' : 'Supplier:'}</strong> {suppName}</div>
                  <div><strong>{isRtl ? 'التاريخ:' : 'Date:'}</strong> {new Date(pd.purchase_date || pd.created_at).toLocaleDateString(isRtl ? 'ar-SA' : 'en-US')}</div>
                  <div><strong>{isRtl ? 'الحالة:' : 'Status:'}</strong> {pd.status}</div>
                  <div><strong>{isRtl ? 'حالة الدفع:' : 'Payment:'}</strong> {pd.payment_status}</div>
                  <div style={{ gridColumn: 'span 2' }}>
                    <strong>{isRtl ? 'الإجمالي:' : 'Total Amount:'}</strong> <span style={{ color: '#2563eb', fontWeight: 700 }}>{formatCurrency(Number(pd.grand_total ?? pd.subtotal ?? 0))}</span>
                  </div>
                </div>
                {(pItemsList || []).length > 0 && (
                  <div style={{ marginTop: '6px', borderTop: '1px solid var(--color-border)', paddingTop: '6px' }}>
                    <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--color-text-secondary)', marginBottom: '4px' }}>
                      {isRtl ? 'الأصناف المشتراة:' : 'Purchased Items:'}
                    </div>
                    <ul style={{ margin: 0, paddingInlineStart: '20px', fontSize: '0.85rem' }}>
                      {(pItemsList || []).map((it: any, idx: number) => {
                        const pName = (Array.isArray(it.product) ? it.product[0]?.name : it.product?.name) || (isRtl ? 'منتج' : 'Item');
                        return <li key={idx}>{pName} × {it.quantity} = {formatCurrency(Number(it.total ?? (it.quantity * (it.purchase_price || 0))))}</li>;
                      })}
                    </ul>
                  </div>
                )}
              </div>
            )
          };
        }
        console.groupEnd();
      }
    }

    // -------------------------------------------------------------
    // 2. SPECIFIC PRODUCT SEARCH (e.g., "كم مخزون منتج X", "سعر منتج X", "تكلفة منتج X")
    // -------------------------------------------------------------
    let productSearchTerm = '';
    const prodMatch = cleanRaw.match(/(?:منتج|المنتج|product|مخزون|سعر|تكلفة|تكلفه)\s+([^\s\?؟]+(?:\s+[^\s\?؟]+)?)/i);
    if (prodMatch && !['منخفض', 'قليل', 'ناقص', 'الاكثر', 'اكثر', 'مبيعا', 'جديد', 'low', 'top', 'عدد', 'كم'].includes(normalizeArabic(prodMatch[1]))) {
      productSearchTerm = prodMatch[1].trim();
    }

    if (productSearchTerm) {
      console.group(`🤖 [AI Diagnostic] Specific Product Search: "${productSearchTerm}"`);
      const { data: matchedProducts, error: prodErr } = await supabase
        .from('products')
        .select('id, name, product_code, purchase_price, selling_price, min_stock, active')
        .or(`name.ilike.%${productSearchTerm}%,product_code.ilike.%${productSearchTerm}%`)
        .limit(3);

      if (prodErr) {
        console.error('[AI Diagnostic] Product search error:', prodErr);
      }

      if (matchedProducts && matchedProducts.length > 0) {
        const p = matchedProducts[0];
        setContext({ lastCategory: 'products', lastEntity: { type: 'product', id: p.id, name: p.name, code: p.product_code } });
        
        // Fetch batches for this product safely
        const { data: pBatches, error: batchErr } = await supabase
          .from('inventory_batches')
          .select('id, quantity, active, warehouse:warehouses(name)')
          .eq('product_id', p.id);

        if (batchErr) console.warn('[AI Diagnostic] Batches error for product:', batchErr);

        const totalQty = (pBatches || []).reduce((acc: number, b: any) => b.active ? acc + Number(b.quantity || 0) : acc, 0);
        const warehouseBreakdown: Record<string, number> = {};
        (pBatches || []).forEach((b: any) => {
          if (b.active) {
            const wName = (Array.isArray(b.warehouse) ? b.warehouse[0]?.name : b.warehouse?.name) || (isRtl ? 'مستودع عام' : 'Main Warehouse');
            warehouseBreakdown[wName] = (warehouseBreakdown[wName] || 0) + Number(b.quantity || 0);
          }
        });

        console.log('[AI Diagnostic] Product details resolved:', { product: p, totalQty, warehouseBreakdown });
        console.groupEnd();

        return {
          response: (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ fontWeight: 700, fontSize: '1.05rem', color: 'var(--color-primary)' }}>
                📦 {p.name} <span style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>({p.product_code})</span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px', fontSize: '0.875rem' }}>
                <div><strong>{isRtl ? 'سعر البيع:' : 'Selling Price:'}</strong> {formatCurrency(Number(p.selling_price || 0))}</div>
                <div><strong>{isRtl ? 'تكلفة الشراء:' : 'Purchase Cost:'}</strong> {formatCurrency(Number(p.purchase_price || 0))}</div>
                <div><strong>{isRtl ? 'إجمالي المخزون:' : 'Total Stock:'}</strong> <span style={{ fontWeight: 700, color: totalQty <= p.min_stock ? '#dc2626' : '#059669' }}>{totalQty}</span></div>
                <div><strong>{isRtl ? 'حد إعادة الطلب:' : 'Min Stock:'}</strong> {p.min_stock}</div>
              </div>
              {Object.keys(warehouseBreakdown).length > 0 ? (
                <div style={{ marginTop: '6px', borderTop: '1px solid var(--color-border)', paddingTop: '6px' }}>
                  <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--color-text-secondary)', marginBottom: '4px' }}>
                    {isRtl ? 'التوزيع في المستودعات:' : 'Warehouse Distribution:'}
                  </div>
                  <ul style={{ margin: 0, paddingInlineStart: '20px', fontSize: '0.85rem' }}>
                    {Object.entries(warehouseBreakdown).map(([wName, qty], i) => (
                      <li key={i}>{wName}: <strong>{qty}</strong> {isRtl ? 'وحدة' : 'units'}</li>
                    ))}
                  </ul>
                </div>
              ) : (
                <div style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', marginTop: '4px' }}>
                  {isRtl ? '⚠️ لا توجد دفعات مخزون متوفرة لهذا المنتج حالياً.' : '⚠️ No inventory batches available for this product currently.'}
                </div>
              )}
            </div>
          ),
          suggestions: isRtl ? [
            'المنتجات منخفضة المخزون',
            'إجمالي المبيعات',
            'عدد المنتجات'
          ] : [
            'Low stock products',
            'Total sales',
            'Products count'
          ]
        };
      }
      console.groupEnd();
    }

    // -------------------------------------------------------------
    // 3. LOW STOCK & INVENTORY ALERTS (e.g., "المنتجات منخفضة المخزون", "مخزونها قليل", "low stock")
    // -------------------------------------------------------------
    const isLowStock = normalized.includes('منخفض') || normalized.includes('قليل') || normalized.includes('ناقص') ||
                       normalized.includes('low stock') || normalized.includes('reorder') || normalized.includes('اعاده طلب') ||
                       normalized.includes('نفد') || normalized.includes('غير متوفر') || normalized.includes('out of stock');

    if (isLowStock) {
      console.group(`🤖 [AI Diagnostic] Low Stock Query`);
      setContext({ lastCategory: 'inventory' });
      
      // 1. Fetch active products
      const { data: prods, error: pErr } = await supabase
        .from('products')
        .select('id, name, product_code, min_stock, purchase_price, selling_price, active')
        .eq('active', true);

      if (pErr) {
        console.error('[AI Diagnostic] Products fetch error:', pErr);
        throw pErr;
      }

      // 2. Fetch all active inventory batches
      const { data: batches, error: bErr } = await supabase
        .from('inventory_batches')
        .select('product_id, quantity, active');

      if (bErr) {
        console.error('[AI Diagnostic] Batches fetch error:', bErr);
        throw bErr;
      }

      const stockMap: Record<string, number> = {};
      (batches || []).forEach(b => {
        if (b.active) {
          stockMap[b.product_id] = (stockMap[b.product_id] || 0) + Number(b.quantity || 0);
        }
      });

      const lowStockItems = (prods || []).map(p => {
        const stock = stockMap[p.id] || 0;
        return {
          id: p.id,
          name: p.name,
          code: p.product_code,
          stock,
          min: p.min_stock || 0,
          deficit: (p.min_stock || 0) - stock
        };
      }).filter(p => p.stock <= p.min);

      console.log(`[AI Diagnostic] Found ${lowStockItems.length} low stock items out of ${(prods || []).length} products.`);
      console.groupEnd();

      if (lowStockItems.length === 0) {
        return {
          response: isRtl 
            ? '✅ حالة المخزون ممتازة! لا توجد منتجات منخفضة أو واصلة لحد إعادة الطلب حالياً.'
            : '✅ Inventory health is optimal! No low-stock or reorder-level products currently.'
        };
      }

      return {
        response: (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ fontWeight: 700, fontSize: '1rem', color: '#dc2626', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <AlertTriangle size={18} />
              {isRtl ? `تنبيه المخزون: هناك ${lowStockItems.length} منتجات تحتاج لإعادة طلب:` : `Stock Alert: ${lowStockItems.length} products require reordering:`}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {lowStockItems.slice(0, 6).map((item, idx) => (
                <div key={idx} style={{ padding: '8px 12px', backgroundColor: 'rgba(239, 68, 68, 0.08)', borderRadius: '8px', border: '1px solid rgba(239, 68, 68, 0.2)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <strong style={{ fontSize: '0.9rem' }}>{item.name}</strong>
                    <div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>{item.code} — {isRtl ? 'الحد الأدنى المطلوب:' : 'Min Required:'} {item.min}</div>
                  </div>
                  <div style={{ textAlign: isRtl ? 'left' : 'right' }}>
                    <span style={{ fontWeight: 700, color: item.stock === 0 ? '#dc2626' : '#d97706', fontSize: '0.95rem' }}>
                      {item.stock} {isRtl ? 'متبقي' : 'left'}
                    </span>
                  </div>
                </div>
              ))}
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
      
      const { data: orderItems, error: oiErr } = await supabase
        .from('order_items')
        .select(`
          quantity, total, unit_price,
          product:products(name, product_code, selling_price)
        `);

      if (oiErr) {
        console.error('[AI Diagnostic] Order items query error:', oiErr);
        throw oiErr;
      }

      if (!orderItems || orderItems.length === 0) {
        console.groupEnd();
        return { response: isRtl ? 'لا توجد بيانات مبيعات مسجلة حتى الآن.' : 'No sales records available yet.' };
      }

      const salesMap: Record<string, { name: string; code: string; qty: number; revenue: number }> = {};
      orderItems.forEach((it: any) => {
        const p = Array.isArray(it.product) ? it.product[0] : it.product;
        const name = p?.name || 'Unknown';
        const code = p?.product_code || '';
        const qty = Number(it.quantity || 0);
        const rev = Number(it.total || (qty * (it.unit_price || 0)));

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
              {isRtl ? 'أكثر المنتجات مبيعاً وتحقيقاً للإيرادات:' : 'Top Selling & Highest Revenue Products:'}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {topProducts.map((p, i) => (
                <div key={i} style={{ padding: '8px 12px', backgroundColor: 'var(--color-surface-hover)', borderRadius: '8px', border: '1px solid var(--color-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{i + 1}. {p.name}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>{p.code}</div>
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
      console.group(`🤖 [AI Diagnostic] Sales Query`);
      console.log('Date range:', dateRange);
      setContext({ lastCategory: 'sales', lastDateRange: dateRange });
      
      let query = supabase
        .from('orders')
        .select('id, order_number, grand_total, status, payment_status, created_at')
        .neq('status', 'CANCELLED');

      if (dateRange.start) {
        query = query.gte('created_at', dateRange.start.toISOString());
      }
      if (dateRange.end) {
        query = query.lte('created_at', dateRange.end.toISOString());
      }

      const { data: salesData, error } = await query;
      if (error) {
        console.error('[AI Diagnostic] Orders query error:', error);
        throw error;
      }

      const totalSales = (salesData || []).reduce((acc, curr: any) => acc + Number(curr.grand_total ?? curr.total ?? curr.subtotal ?? 0), 0);
      const ordersCount = (salesData || []).length;
      const paidOrders = (salesData || []).filter(o => o.payment_status === 'PAID').length;
      const unpaidOrders = (salesData || []).filter(o => o.payment_status === 'UNPAID' || o.payment_status === 'PARTIALLY_PAID').length;

      const periodText = isRtl ? dateRange.labelAr : dateRange.labelEn;
      console.log(`[AI Diagnostic] Total Sales: ${totalSales}, Orders Count: ${ordersCount}`);
      console.groupEnd();

      return {
        response: (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ fontWeight: 700, fontSize: '1.05rem', color: 'var(--color-primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <DollarSign size={18} />
              {isRtl ? `تقرير المبيعات (${periodText}):` : `Sales Report (${periodText}):`}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '0.875rem' }}>
              <div style={{ padding: '8px 12px', backgroundColor: 'var(--color-surface-hover)', borderRadius: '8px', border: '1px solid var(--color-border)' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>{isRtl ? 'إجمالي قيمة المبيعات' : 'Total Revenue'}</div>
                <div style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--color-primary)', marginTop: '2px' }}>{formatCurrency(totalSales)}</div>
              </div>
              <div style={{ padding: '8px 12px', backgroundColor: 'var(--color-surface-hover)', borderRadius: '8px', border: '1px solid var(--color-border)' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>{isRtl ? 'عدد فواتير البيع' : 'Total Invoices'}</div>
                <div style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--color-text-primary)', marginTop: '2px' }}>{ordersCount} {isRtl ? 'فاتورة' : 'orders'}</div>
              </div>
              <div style={{ padding: '6px 10px', backgroundColor: 'rgba(16, 185, 129, 0.08)', borderRadius: '6px', fontSize: '0.8rem' }}>
                {isRtl ? 'فواتير مسددة:' : 'Paid:'} <strong>{paidOrders}</strong>
              </div>
              <div style={{ padding: '6px 10px', backgroundColor: 'rgba(239, 68, 68, 0.08)', borderRadius: '6px', fontSize: '0.8rem' }}>
                {isRtl ? 'فواتير غير مسددة:' : 'Unpaid:'} <strong>{unpaidOrders}</strong>
              </div>
            </div>
          </div>
        ),
        suggestions: isRtl ? [
          'مبيعات الشهر اللي فات',
          'أكثر المنتجات مبيعاً',
          'إجمالي المشتريات',
          'ملخص أداء النظام'
        ] : [
          'Sales last month',
          'Top selling products',
          'Total purchases',
          'Performance summary'
        ]
      };
    }

    // -------------------------------------------------------------
    // 6. PURCHASES INTENTS (e.g., "اجمالي المشتريات هذا الشهر", "كم مشترياتي", "purchases count")
    // -------------------------------------------------------------
    const isPurchases = normalized.includes('مشتري') || normalized.includes('شراء') || normalized.includes('purchase') ||
                        normalized.includes('توريد') || (context.lastCategory === 'purchases' && dateRange.hasExplicitDate);

    if (isPurchases) {
      console.group(`🤖 [AI Diagnostic] Purchases Query`);
      setContext({ lastCategory: 'purchases', lastDateRange: dateRange });
      
      // Check if user asked about a specific supplier
      let supplierFilterId: string | null = null;
      let supplierFilterName = '';
      const suppMatch = cleanRaw.match(/(?:مورد|المورد|supplier)\s+([^\s\?؟]+(?:\s+[^\s\?؟]+)?)/i);
      if (suppMatch && !['عدد', 'كم', 'اكثر', 'top'].includes(normalizeArabic(suppMatch[1]))) {
        const { data: sMatch } = await supabase.from('suppliers').select('id, name').ilike('name', `%${suppMatch[1].trim()}%`).limit(1);
        if (sMatch && sMatch.length > 0) {
          supplierFilterId = sMatch[0].id;
          supplierFilterName = sMatch[0].name;
        }
      }

      // Check if user asked about a specific warehouse
      let warehouseFilterId: string | null = null;
      let warehouseFilterName = '';
      const wareMatch = cleanRaw.match(/(?:مستودع|المستودع|warehouse)\s+([^\s\?؟]+(?:\s+[^\s\?؟]+)?)/i);
      if (wareMatch && !['عدد', 'كم'].includes(normalizeArabic(wareMatch[1]))) {
        const { data: wMatch } = await supabase.from('warehouses').select('id, name').ilike('name', `%${wareMatch[1].trim()}%`).limit(1);
        if (wMatch && wMatch.length > 0) {
          warehouseFilterId = wMatch[0].id;
          warehouseFilterName = wMatch[0].name;
        }
      }

      let query = supabase
        .from('purchases')
        .select(`
          id, purchase_number, invoice_number, supplier_id, warehouse_id, grand_total, subtotal, purchase_date, status, payment_status, created_at,
          supplier:suppliers(name),
          warehouse:warehouses(name)
        `)
        .neq('status', 'CANCELLED');

      if (supplierFilterId) {
        query = query.eq('supplier_id', supplierFilterId);
      }
      if (warehouseFilterId) {
        query = query.eq('warehouse_id', warehouseFilterId);
      }

      const { data: rawPurchases, error } = await query;
      if (error) {
        console.error('[AI Diagnostic] Purchases query error:', error);
        throw error;
      }

      // Safe date filtering on purchase_date or created_at
      const purchasesData = (rawPurchases || []).filter((p: any) => {
        if (!dateRange.start && !dateRange.end) return true;
        const dStr = p.purchase_date || p.created_at;
        if (!dStr) return true;
        const t = new Date(dStr).getTime();
        if (dateRange.start && t < dateRange.start.getTime()) return false;
        if (dateRange.end && t > dateRange.end.getTime()) return false;
        return true;
      });

      const totalPurchases = purchasesData.reduce((acc, curr: any) => acc + Number(curr.grand_total ?? curr.subtotal ?? 0), 0);
      const count = purchasesData.length;
      const periodText = isRtl ? dateRange.labelAr : dateRange.labelEn;
      const extraFilterText = supplierFilterName 
        ? ` (${isRtl ? `المورد: ${supplierFilterName}` : `Supplier: ${supplierFilterName}`})`
        : warehouseFilterName 
        ? ` (${isRtl ? `المستودع: ${warehouseFilterName}` : `Warehouse: ${warehouseFilterName}`})`
        : '';

      console.log(`[AI Diagnostic] Total Purchases: ${totalPurchases}, Invoices Count: ${count}`);
      console.groupEnd();

      return {
        response: (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ fontWeight: 700, fontSize: '1.05rem', color: '#2563eb', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Layers size={18} />
              {isRtl ? `تقرير المشتريات (${periodText})${extraFilterText}:` : `Purchases Report (${periodText})${extraFilterText}:`}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '0.875rem' }}>
              <div style={{ padding: '8px 12px', backgroundColor: 'var(--color-surface-hover)', borderRadius: '8px', border: '1px solid var(--color-border)' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>{isRtl ? 'إجمالي المشتريات' : 'Total Purchases'}</div>
                <div style={{ fontSize: '1.15rem', fontWeight: 800, color: '#2563eb', marginTop: '2px' }}>{formatCurrency(totalPurchases)}</div>
              </div>
              <div style={{ padding: '8px 12px', backgroundColor: 'var(--color-surface-hover)', borderRadius: '8px', border: '1px solid var(--color-border)' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>{isRtl ? 'عدد فواتير الشراء' : 'Purchase Invoices'}</div>
                <div style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--color-text-primary)', marginTop: '2px' }}>{count} {isRtl ? 'فاتورة' : 'invoices'}</div>
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
      
      const { data: suppliersList, count, error } = await supabase
        .from('suppliers')
        .select('id, name, code, phone, active', { count: 'exact' });

      if (error) {
        console.error('[AI Diagnostic] Suppliers query error:', error);
        throw error;
      }

      console.log(`[AI Diagnostic] Suppliers Count: ${count}`);
      console.groupEnd();

      return {
        response: (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ fontWeight: 700, fontSize: '1.05rem', color: '#8b5cf6', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Factory size={18} />
              {isRtl ? `الموردون المعتمدون (${count || (suppliersList || []).length} مورد):` : `Approved Suppliers (${count || (suppliersList || []).length} suppliers):`}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {(suppliersList || []).slice(0, 5).map((s, i) => (
                <div key={i} style={{ padding: '6px 12px', backgroundColor: 'var(--color-surface-hover)', borderRadius: '6px', border: '1px solid var(--color-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.85rem' }}>
                  <strong>{s.name}</strong>
                  <span style={{ color: 'var(--color-text-muted)' }}>{s.code} {s.phone ? `— 📞 ${s.phone}` : ''}</span>
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
      
      const { data: customersList, count, error } = await supabase
        .from('customers')
        .select('id, name, code, phone, active', { count: 'exact' });

      if (error) {
        console.error('[AI Diagnostic] Customers query error:', error);
        throw error;
      }

      console.log(`[AI Diagnostic] Customers Count: ${count}`);
      console.groupEnd();

      return {
        response: (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ fontWeight: 700, fontSize: '1.05rem', color: '#10b981', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Users size={18} />
              {isRtl ? `قاعدة العملاء المسجلين (${count || (customersList || []).length} عميل):` : `Registered Customers Base (${count || (customersList || []).length} customers):`}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {(customersList || []).slice(0, 5).map((c, i) => (
                <div key={i} style={{ padding: '6px 12px', backgroundColor: 'var(--color-surface-hover)', borderRadius: '6px', border: '1px solid var(--color-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.85rem' }}>
                  <strong>{c.name}</strong>
                  <span style={{ color: 'var(--color-text-muted)' }}>{c.code} {c.phone ? `— 📞 ${c.phone}` : ''}</span>
                </div>
              ))}
            </div>
          </div>
        ),
        suggestions: isRtl ? ['إجمالي المبيعات هذا الشهر', 'أكثر المنتجات مبيعاً', 'العملاء عليهم مستحقات'] : ['Sales This Month', 'Top Selling Products', 'Customers With Receivables']
      };
    }

    // -------------------------------------------------------------
    // 9. WAREHOUSES & PRODUCTS COUNT (e.g., "عدد المنتجات", "عدد المستودعات")
    // -------------------------------------------------------------
    if (normalized.includes('عدد المنتجات') || normalized.includes('كم منتج') || normalized.includes('products count') || normalized.includes('المنتجات')) {
      console.group(`🤖 [AI Diagnostic] Products Count Query`);
      const { count, error } = await supabase.from('products').select('*', { count: 'exact', head: true }).eq('active', true);
      
      if (error) {
        console.error('[AI Diagnostic] Products count error:', error);
        throw error;
      }

      console.log(`[AI Diagnostic] Products Count: ${count}`);
      console.groupEnd();

      return {
        response: isRtl 
          ? `عدد المنتجات النشطة والمسجلة في النظام حالياً: **${count || 0}** منتج.`
          : `Total active registered products in system: **${count || 0}** products.`,
        suggestions: isRtl ? ['المنتجات منخفضة المخزون', 'أكثر المنتجات مبيعاً', 'إجمالي المبيعات'] : ['Low Stock Products', 'Top Selling Products', 'Total Sales']
      };
    }

    if (normalized.includes('المستودعات') || normalized.includes('مستودع') || normalized.includes('warehouses')) {
      console.group(`🤖 [AI Diagnostic] Warehouses Query`);
      const { data: wList, count, error } = await supabase.from('warehouses').select('name, code, location, active', { count: 'exact' });
      
      if (error) {
        console.error('[AI Diagnostic] Warehouses query error:', error);
        throw error;
      }

      console.log(`[AI Diagnostic] Warehouses Count: ${count}`);
      console.groupEnd();

      return {
        response: (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <div style={{ fontWeight: 700, color: 'var(--color-primary)' }}>
              🏢 {isRtl ? `المستودعات المتاحة (${count || (wList || []).length} مستودع):` : `Available Warehouses (${count || (wList || []).length} warehouses):`}
            </div>
            {(wList || []).map((w, i) => (
              <div key={i} style={{ padding: '6px 10px', backgroundColor: 'var(--color-surface-hover)', borderRadius: '6px', fontSize: '0.85rem' }}>
                <strong>{w.name}</strong> ({w.code}) {w.location ? `— 📍 ${w.location}` : ''}
              </div>
            ))}
          </div>
        )
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
      
      const [{ data: sales, error: sErr }, { data: purchases, error: pErr }, { data: orderItems, error: oiErr }] = await Promise.all([
        supabase.from('orders').select('grand_total, subtotal').neq('status', 'CANCELLED'),
        supabase.from('purchases').select('grand_total, subtotal').neq('status', 'CANCELLED'),
        supabase.from('order_items').select('quantity, product:products(purchase_price)')
      ]);

      if (sErr) console.error('[AI Diagnostic] Sales summary error:', sErr);
      if (pErr) console.error('[AI Diagnostic] Purchases summary error:', pErr);
      if (oiErr) console.error('[AI Diagnostic] Order items summary error:', oiErr);

      const totalSales = (sales || []).reduce((acc, curr: any) => acc + Number(curr.grand_total ?? curr.subtotal ?? 0), 0);
      const totalPurchases = (purchases || []).reduce((acc, curr: any) => acc + Number(curr.grand_total ?? curr.subtotal ?? 0), 0);
      
      let totalCogs = 0;
      (orderItems || []).forEach((it: any) => {
        const prod = Array.isArray(it.product) ? it.product[0] : it.product;
        const cost = Number(prod?.purchase_price || 0);
        totalCogs += cost * Number(it.quantity || 0);
      });

      const grossProfit = totalSales - totalCogs;
      console.log(`[AI Diagnostic] Summary -> Sales: ${totalSales}, Purchases: ${totalPurchases}, COGS: ${totalCogs}, Gross Profit: ${grossProfit}`);
      console.groupEnd();

      return {
        response: (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ fontWeight: 700, fontSize: '1.05rem', color: 'var(--color-primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Sparkles size={18} />
              {isRtl ? 'ملخص الأداء المالي العام للنظام:' : 'Overall Business & Financial Summary:'}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '0.875rem' }}>
              <div style={{ padding: '8px', backgroundColor: 'rgba(16, 185, 129, 0.1)', borderRadius: '6px' }}>
                <div style={{ fontSize: '0.75rem', color: '#047857' }}>{isRtl ? 'إجمالي المبيعات' : 'Total Sales'}</div>
                <div style={{ fontSize: '1.05rem', fontWeight: 800, color: '#047857' }}>{formatCurrency(totalSales)}</div>
              </div>
              <div style={{ padding: '8px', backgroundColor: 'rgba(37, 99, 235, 0.1)', borderRadius: '6px' }}>
                <div style={{ fontSize: '0.75rem', color: '#1d4ed8' }}>{isRtl ? 'إجمالي المشتريات' : 'Total Purchases'}</div>
                <div style={{ fontSize: '1.05rem', fontWeight: 800, color: '#2563eb' }}>{formatCurrency(totalPurchases)}</div>
              </div>
              <div style={{ padding: '8px', backgroundColor: 'rgba(16, 185, 129, 0.15)', borderRadius: '6px', gridColumn: 'span 2' }}>
                <div style={{ fontSize: '0.75rem', color: '#064e3b' }}>{isRtl ? 'صافي الأرباح التقديري (المبيعات - تكلفة البضاعة)' : 'Gross Profit (Sales - COGS)'}</div>
                <div style={{ fontSize: '1.15rem', fontWeight: 800, color: grossProfit >= 0 ? '#059669' : '#dc2626' }}>{formatCurrency(grossProfit)}</div>
              </div>
            </div>
          </div>
        ),
        suggestions: isRtl ? ['مبيعات آخر 7 أيام', 'أكثر المنتجات مبيعاً', 'المنتجات منخفضة المخزون'] : ['Sales last 7 days', 'Top selling products', 'Low stock products']
      };
    }

    // -------------------------------------------------------------
    // 11. SMART FALLBACK & HELPFUL GUIDANCE
    // -------------------------------------------------------------
    return {
      response: isRtl ? (
        <div>
          <p style={{ margin: '0 0 8px 0' }}>
            عذرًا، لم أتمكن من استخراج القصد بدقة من سؤالك: <em>"{rawQuery}"</em>.
          </p>
          <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--color-text-secondary)' }}>
            يمكنك سؤالي بأي صيغة طبيعية عن:
          </p>
          <ul style={{ margin: '6px 0 0 0', paddingInlineStart: '20px', fontSize: '0.85rem' }}>
            <li><strong>المبيعات:</strong> "كم إجمالي المبيعات هذا الشهر؟" أو "مبيعات آخر 7 أيام"</li>
            <li><strong>المشتريات:</strong> "إجمالي المشتريات" أو "فواتير الشراء اليوم"</li>
            <li><strong>المخزون:</strong> "المنتجات منخفضة المخزون" أو "كم مخزون منتج معين"</li>
            <li><strong>الفواتير:</strong> "هاتلي فاتورة SO-2026-00018"</li>
            <li><strong>الأداء:</strong> "ملخص أداء النظام" أو "صافي الأرباح"</li>
          </ul>
        </div>
      ) : (
        <div>
          <p style={{ margin: '0 0 8px 0' }}>
            I couldn't quite pinpoint the intent for: <em>"{rawQuery}"</em>.
          </p>
          <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--color-text-secondary)' }}>
            You can ask me naturally about:
          </p>
          <ul style={{ margin: '6px 0 0 0', paddingInlineStart: '20px', fontSize: '0.85rem' }}>
            <li><strong>Sales:</strong> "Total sales this month" or "Sales for last 7 days"</li>
            <li><strong>Purchases:</strong> "Total purchases" or "Purchases today"</li>
            <li><strong>Inventory:</strong> "Low stock products" or "Stock of specific product"</li>
            <li><strong>Invoices:</strong> "Invoice SO-2026-00018 details"</li>
            <li><strong>Analytics:</strong> "Performance summary" or "Gross profit"</li>
          </ul>
        </div>
      ),
      suggestions: isRtl ? [
        'كم عدد المنتجات؟',
        'كم إجمالي المبيعات؟',
        'كم عدد الموردين؟',
        'ما هي المنتجات منخفضة المخزون؟',
        'كم إجمالي المشتريات؟'
      ] : [
        'How many products?',
        "What's total sales?",
        'How many suppliers?',
        'Low stock products',
        'Total purchases'
      ]
    };
  };

  const executeMessage = async (queryText: string) => {
    if (!queryText.trim()) return;

    setMessages(prev => [...prev, { 
      id: Date.now().toString(), 
      role: 'user', 
      content: queryText, 
      timestamp: new Date() 
    }]);
    
    setLoading(true);

    try {
      await new Promise(r => setTimeout(r, 300));
      const { response, suggestions } = await processQuery(queryText);
      
      setMessages(prev => [...prev, { 
        id: (Date.now() + 1).toString(), 
        role: 'assistant', 
        content: response, 
        suggestions,
        timestamp: new Date() 
      }]);
    } catch (err: any) {
      console.error('[AI Assistant Fatal Execution Error]', {
        code: err?.code,
        message: err?.message,
        details: err?.details,
        hint: err?.hint,
        stack: err?.stack
      });

      const errDetails = err?.message || JSON.stringify(err);

      setMessages(prev => [...prev, { 
        id: (Date.now() + 1).toString(), 
        role: 'assistant', 
        content: isRtl ? (
          <div style={{ color: '#dc2626' }}>
            <strong>حدث خطأ أثناء تنفيذ الاستعلام:</strong>
            <div style={{ fontSize: '0.85rem', marginTop: '4px', opacity: 0.9 }}>
              {errDetails} {err?.code ? `(Error Code: ${err.code})` : ''}
            </div>
            {err?.hint && <div style={{ fontSize: '0.75rem', marginTop: '2px', color: 'var(--color-text-secondary)' }}>Hint: {err.hint}</div>}
          </div>
        ) : (
          <div style={{ color: '#dc2626' }}>
            <strong>Query execution error:</strong>
            <div style={{ fontSize: '0.85rem', marginTop: '4px', opacity: 0.9 }}>
              {errDetails} {err?.code ? `(Error Code: ${err.code})` : ''}
            </div>
            {err?.hint && <div style={{ fontSize: '0.75rem', marginTop: '2px', color: 'var(--color-text-secondary)' }}>Hint: {err.hint}</div>}
          </div>
        ), 
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
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 120px)', gap: '1rem' }}>
      <div>
        <h1 style={{ margin: 0, fontSize: '1.75rem', fontWeight: 700, color: 'var(--color-text-primary)', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <Sparkles size={28} style={{ color: '#8b5cf6' }} />
          {isRtl ? 'المساعد الذكي' : 'AI Assistant'}
        </h1>
        <p style={{ margin: '0.5rem 0 0', color: 'var(--color-text-secondary)', fontSize: '0.9rem' }}>
          {isRtl ? 'اطرح أسئلتك بأي صياغة طبيعية عن المبيعات، المشتريات، المخزون، والعملاء واحصل على إجابات مباشرة من بيانات النظام' : 'Ask questions naturally about sales, purchases, stock, and customers to query live ERP data'}
        </p>
      </div>

      <div style={{ flex: 1, backgroundColor: 'var(--color-surface)', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.05)', border: '1px solid var(--color-border)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {/* Messages Scroll Area */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {messages.map(msg => (
            <div key={msg.id} style={{ display: 'flex', gap: '1rem', alignSelf: msg.role === 'user' ? (isRtl ? 'flex-end' : 'flex-end') : 'flex-start', maxWidth: '85%', flexDirection: msg.role === 'user' ? 'row-reverse' : 'row' }}>
              <div style={{ width: '40px', height: '40px', borderRadius: '50%', backgroundColor: msg.role === 'user' ? 'var(--color-primary)' : '#8b5cf6', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', flexShrink: 0, boxShadow: '0 2px 6px rgba(0,0,0,0.1)' }}>
                {msg.role === 'user' ? <User size={20} /> : <Bot size={20} />}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ backgroundColor: msg.role === 'user' ? 'var(--color-primary)' : 'var(--color-surface-hover)', color: msg.role === 'user' ? 'white' : 'var(--color-text-primary)', padding: '1rem 1.2rem', borderRadius: '12px', borderTopLeftRadius: msg.role === 'assistant' ? 0 : '12px', borderTopRightRadius: msg.role === 'user' ? 0 : '12px', whiteSpace: 'pre-wrap', lineHeight: 1.6, border: '1px solid var(--color-border)', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
                  {msg.content}
                </div>
                {msg.suggestions && msg.suggestions.length > 0 && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '2px' }}>
                    {msg.suggestions.map((sug, i) => (
                      <button
                        key={i}
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
            <div style={{ display: 'flex', gap: '1rem', alignSelf: 'flex-start' }}>
              <div style={{ width: '40px', height: '40px', borderRadius: '50%', backgroundColor: '#8b5cf6', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', flexShrink: 0 }}>
                <Bot size={20} />
              </div>
              <div style={{ backgroundColor: 'var(--color-surface-hover)', padding: '1rem 1.25rem', borderRadius: '12px', borderTopLeftRadius: 0, color: 'var(--color-text-secondary)', display: 'flex', alignItems: 'center', gap: '8px', border: '1px solid var(--color-border)' }}>
                <RefreshCw size={16} className="spinning" style={{ animation: 'spin 1s linear infinite' }} />
                <span>{isRtl ? 'جاري البحث والتحليل في بيانات النظام...' : 'Analyzing and querying live ERP data...'}</span>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
        
        {/* Input Bar */}
        <div style={{ padding: '1rem', borderTop: '1px solid var(--color-border)', backgroundColor: 'var(--color-surface)' }}>
          <form onSubmit={handleSend} style={{ display: 'flex', gap: '0.75rem' }}>
            <input 
              type="text" 
              value={input}
              onChange={e => setInput(e.target.value)}
              placeholder={isRtl ? 'اسأل عن المبيعات، المشتريات، المخزون، أو الفواتير...' : 'Ask about sales, purchases, stock, or invoices...'}
              style={{ flex: 1, padding: '0.75rem 1.25rem', borderRadius: '8px', border: '1px solid var(--color-border)', backgroundColor: 'var(--color-background)', color: 'var(--color-text-primary)', fontSize: '0.95rem', outline: 'none' }}
              disabled={loading}
            />
            <button 
              type="submit" 
              disabled={loading || !input.trim()}
              style={{ padding: '0 1.5rem', backgroundColor: '#8b5cf6', color: 'white', border: 'none', borderRadius: '8px', cursor: (loading || !input.trim()) ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', opacity: (loading || !input.trim()) ? 0.6 : 1, transition: 'all 0.2s', fontWeight: 600 }}
            >
              <Send size={18} style={{ transform: isRtl ? 'scaleX(-1)' : 'none' }} />
              <span>{isRtl ? 'إرسال' : 'Send'}</span>
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
