import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useTranslation } from '../../contexts/LanguageContext';
import { useLocation, useNavigate } from 'react-router-dom';
import { Search, Plus, Edit2, Calendar, Clock, Package, Building2, X, Printer } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useDebounce } from '../../hooks/useDebounce';
import { DocumentPrintModal } from '../../components/common/DocumentPrintModal';
import { cacheGet, fetchWithCache, invalidateCache, CACHE_KEYS } from '../../lib/dataCache';
import { MasterDataService } from '../../services/masterDataService';

interface InventoryBatch {
  id: string;
  product_id: string;
  warehouse_id: string;
  batch_number: string;
  production_date: string | null;
  expiry_date: string;
  quantity: number;
  active: boolean;
  product_name?: string;
  product_code?: string;
  purchase_price?: number;
  warehouse_name?: string;
  expiry_status?: string;
  days_remaining?: number;
  inventory_value?: number;
}

const InventoryList = () => {
  const { t, language } = useTranslation();
  const { hasPermission } = useAuth();
  const navigate = useNavigate();
  const isRtl = language === 'ar';
  
  const [batches, setBatches] = useState<InventoryBatch[]>(() => cacheGet(CACHE_KEYS.INVENTORY) || []);
  const [loading, setLoading] = useState(() => !cacheGet(CACHE_KEYS.INVENTORY));
  const [productSummary, setProductSummary] = useState<any>(null);
  const [selectedWarehouseSummary, setSelectedWarehouseSummary] = useState<any>(null);
  
  // Filters
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const productId = searchParams.get('product_id');
  const warehouseIdParam = searchParams.get('warehouse_id');
  
  const initialSearch = searchParams.get('search') || '';
  const [search, setSearch] = useState(initialSearch);
  const debouncedSearch = useDebounce(search, 300);
  const [statusFilter, setStatusFilter] = useState('');
  const [warehouseFilter, setWarehouseFilter] = useState(warehouseIdParam || '');
  const [warehouses, setWarehouses] = useState<{id: string, name: string}[]>([]);
  const [allProducts, setAllProducts] = useState<{id: string, name: string, product_code: string}[]>([]);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 15;

  // Modals & Batch Edit States
  const [showModal, setShowModal] = useState(false);
  const [editingBatch, setEditingBatch] = useState<InventoryBatch | null>(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const [formData, setFormData] = useState({
    product_id: '',
    warehouse_id: warehouseIdParam || '',
    batch_number: '',
    quantity: '',
    production_date: '',
    expiry_date: ''
  });

  const fetchWarehouses = async () => {
    const [warehousesList, prodRes] = await Promise.all([
      MasterDataService.getWarehouses(),
      supabase.from('products').select('id, name, product_code').eq('active', true).order('name')
    ]);
    if (warehousesList) setWarehouses(warehousesList);
    if (prodRes.data) setAllProducts(prodRes.data);
  };

  const fetchProductSummary = async () => {
    if (!productId) {
      setProductSummary(null);
      return;
    }
    const { data } = await supabase
      .from('products')
      .select(`
        name, product_code, purchase_price, selling_price, min_stock, active,
        category:categories(name),
        brand:brands(name),
        unit:units(name)
      `)
      .eq('id', productId)
      .single();
    if (data) setProductSummary(data);
  };

  const fetchWarehouseSummary = async (wId: string) => {
    if (!wId) {
      setSelectedWarehouseSummary(null);
      return;
    }
    try {
      const { data } = await supabase
        .from('warehouses')
        .select('*')
        .eq('id', wId)
        .maybeSingle();
      if (data) setSelectedWarehouseSummary(data);
    } catch (e) {
      console.error('Error fetching warehouse summary:', e);
    }
  };

  const fetchBatches = async (wFilter = warehouseFilter, forceRefresh = false) => {
    if (!cacheGet(CACHE_KEYS.INVENTORY) || forceRefresh) {
      setLoading(true);
    }
    try {
      const fetcher = async () => {
        let query = supabase
          .from('inventory_batches')
          .select(`
            *,
            products(name, product_code, purchase_price),
            warehouses(name)
          `)
          .order('expiry_date', { ascending: true });

        if (productId) {
          query = query.eq('product_id', productId);
        }

        if (wFilter) {
          query = query.eq('warehouse_id', wFilter);
        }

        const { data, error } = await query;
        if (error) {
          console.warn('Inventory table error:', error);
          return [];
        }
        
        return (data || []).map((b: any) => {
          let diffDays = 0;
          let expDate = new Date();
          const expStr = b.expiry_date ? String(b.expiry_date).split('T')[0] : '';
          if (expStr) {
            const parts = expStr.split('-').map(Number);
            if (parts.length === 3) {
              expDate = new Date(parts[0], parts[1] - 1, parts[2], 0, 0, 0, 0);
              const today = new Date();
              today.setHours(0, 0, 0, 0);
              const diffTime = expDate.getTime() - today.getTime();
              diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            }
          }
          
          let status = 'Valid';
          if (diffDays < 0) status = 'Expired';
          else if (diffDays === 0) status = 'Expires Today';
          else if (diffDays <= 30) status = 'Expiring Soon';

          const qty = Number(b.quantity || 0);
          const cost = Number(b.products?.purchase_price || 0);

          // Derive sensible production date if not already set in DB
          let prodDate = b.production_date ? String(b.production_date).split('T')[0] : '';
          if (!prodDate) {
            const pName = (b.products?.name || '').toLowerCase();
            const pCode = (b.products?.product_code || '').toLowerCase();
            let monthsBefore = 6;
            if (pName.includes('طازج') || pName.includes('عصير') || pCode.includes('juic')) {
              monthsBefore = 2; // ~60 days
            } else if (pName.includes('حليب') || pCode.includes('milk')) {
              monthsBefore = 6; // ~180 days
            } else if (pName.includes('أرز') || pName.includes('ارز') || pCode.includes('rice')) {
              monthsBefore = 12; // 1 year
            } else if (pName.includes('زيت') || pCode.includes('oil')) {
              monthsBefore = 12; // 1 year
            } else if (pName.includes('دقيق') || pCode.includes('flor')) {
              monthsBefore = 9; // 9 months
            }
            const baseDate = expStr ? expDate : new Date();
            const estimatedProd = new Date(baseDate);
            estimatedProd.setMonth(estimatedProd.getMonth() - monthsBefore);
            prodDate = estimatedProd.toISOString().split('T')[0];
          }

          return {
            ...b,
            production_date: prodDate,
            product_name: b.products?.name,
            product_code: b.products?.product_code,
            purchase_price: cost,
            warehouse_name: b.warehouses?.name,
            expiry_status: status,
            days_remaining: diffDays,
            inventory_value: qty * cost
          };
        });
      };

      let formattedData: any[];
      if (!productId && !wFilter) {
        formattedData = await fetchWithCache(CACHE_KEYS.INVENTORY, fetcher, { forceRefresh });
      } else {
        formattedData = await fetcher();
      }

      setBatches(formattedData);

      // Asynchronously backfill missing production_date to Supabase DB
      const batchesToBackfill = (formattedData || []).filter((b: any) => !b.production_date && b.expiry_date);
      if (batchesToBackfill.length > 0) {
        Promise.all(
          batchesToBackfill.map((b: any) => {
            const formatted = formattedData.find((f: any) => f.id === b.id);
            if (formatted?.production_date) {
              return supabase
                .from('inventory_batches')
                .update({ production_date: formatted.production_date })
                .eq('id', b.id);
            }
            return Promise.resolve();
          })
        ).catch(err => console.warn('Production date auto-backfill notice:', err));
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWarehouses();
    fetchProductSummary();
  }, [productId]);

  useEffect(() => {
    const wId = searchParams.get('warehouse_id') || '';
    setWarehouseFilter(wId);
    if (wId) {
      fetchWarehouseSummary(wId);
    } else {
      setSelectedWarehouseSummary(null);
    }
    fetchBatches(wId);
  }, [location.search]);

  const handleWarehouseFilterChange = (wId: string) => {
    setWarehouseFilter(wId);
    const params = new URLSearchParams(location.search);
    if (wId) {
      params.set('warehouse_id', wId);
      fetchWarehouseSummary(wId);
    } else {
      params.delete('warehouse_id');
      setSelectedWarehouseSummary(null);
    }
    navigate({ search: params.toString() ? `?${params.toString()}` : '' }, { replace: true });
    fetchBatches(wId);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleOpenAddModal = () => {
    setEditingBatch(null);
    setFormError('');
    setFormData({
      product_id: productId || (allProducts.length > 0 ? allProducts[0].id : ''),
      warehouse_id: warehouseFilter || (warehouses.length > 0 ? warehouses[0].id : ''),
      batch_number: `BTC-${Date.now().toString().slice(-6)}`,
      quantity: '',
      production_date: new Date().toISOString().split('T')[0],
      expiry_date: ''
    });
    setShowModal(true);
  };

  const handleOpenEditModal = (batch: InventoryBatch) => {
    setEditingBatch(batch);
    setFormError('');
    setFormData({
      product_id: batch.product_id,
      warehouse_id: batch.warehouse_id,
      batch_number: batch.batch_number,
      quantity: String(batch.quantity),
      production_date: batch.production_date || '',
      expiry_date: batch.expiry_date
    });
    setShowModal(true);
  };

  const handleSaveStock = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    const targetProductId = productId || formData.product_id;
    if (!targetProductId || !formData.warehouse_id || !formData.batch_number || !formData.quantity || !formData.expiry_date) {
      setFormError(isRtl ? 'يرجى ملء كافة الحقول المطلوبة' : 'Please fill all required fields');
      return;
    }

    setSaving(true);
    try {
      if (editingBatch) {
        const { error } = await supabase
          .from('inventory_batches')
          .update({
            production_date: formData.production_date || null,
            expiry_date: formData.expiry_date,
            batch_number: formData.batch_number,
            quantity: parseFloat(formData.quantity),
            warehouse_id: formData.warehouse_id
          })
          .eq('id', editingBatch.id);

        if (error) throw error;
      } else {
        const { error } = await supabase.from('inventory_batches').insert([{
          product_id: targetProductId,
          warehouse_id: formData.warehouse_id,
          batch_number: formData.batch_number,
          quantity: parseFloat(formData.quantity),
          production_date: formData.production_date || null,
          expiry_date: formData.expiry_date
        }]);

        if (error) throw error;
      }

      setShowModal(false);
      setFormData({ product_id: '', warehouse_id: '', batch_number: '', quantity: '', production_date: '', expiry_date: '' });
      invalidateCache(CACHE_KEYS.INVENTORY);
      invalidateCache(CACHE_KEYS.DASHBOARD_PREFIX);
      invalidateCache(CACHE_KEYS.ANALYTICS_PREFIX);
      fetchBatches(warehouseFilter, true);
    } catch (err: any) {
      console.error('Error saving batch:', err);
      setFormError(err.message || 'Failed to save batch');
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearch, statusFilter, warehouseFilter]);

  const getStatusBadge = (status?: string) => {
    let bg = 'rgba(16, 185, 129, 0.1)';
    let color = 'rgb(16, 185, 129)';
    let label = t('expiry.valid') || (isRtl ? 'صالح' : 'Valid');

    switch (status) {
      case 'Expired':
        bg = 'rgba(239, 68, 68, 0.12)';
        color = 'rgb(220, 38, 38)';
        label = t('expiry.expired') || (isRtl ? 'منتهي' : 'Expired');
        break;
      case 'Expires Today':
        bg = 'rgba(239, 68, 68, 0.12)';
        color = 'rgb(220, 38, 38)';
        label = t('expiry.expiresToday') || (isRtl ? 'اليوم' : 'Today');
        break;
      case 'Expiring Soon':
        bg = 'rgba(245, 158, 11, 0.12)';
        color = 'rgb(217, 119, 6)';
        label = t('expiry.expiringSoon') || (isRtl ? 'قريباً' : 'Soon');
        break;
      default:
        bg = 'rgba(16, 185, 129, 0.1)';
        color = 'rgb(16, 185, 129)';
        label = t('expiry.valid') || (isRtl ? 'صالح' : 'Valid');
        break;
    }

    return (
      <span
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '3px',
          padding: '1px 5px',
          borderRadius: '10px',
          fontSize: '0.68rem',
          fontWeight: 600,
          backgroundColor: bg,
          color: color,
          whiteSpace: 'nowrap',
        }}
      >
        <span
          style={{
            width: '4px',
            height: '4px',
            borderRadius: '50%',
            backgroundColor: color,
            flexShrink: 0,
          }}
        />
        {label}
      </span>
    );
  };

  const filteredBatches = batches.filter(b => {
    const s = debouncedSearch.toLowerCase();
    const matchesSearch = !s || 
      b.product_name?.toLowerCase().includes(s) || 
      b.product_code?.toLowerCase().includes(s) ||
      b.batch_number.toLowerCase().includes(s);
      
    const matchesStatus = !statusFilter || b.expiry_status === statusFilter;
    const matchesWarehouse = !warehouseFilter || b.warehouse_id === warehouseFilter;
    
    return matchesSearch && matchesStatus && matchesWarehouse;
  });

  const totalStock = filteredBatches.reduce((acc, curr) => acc + curr.quantity, 0);
  const totalValue = filteredBatches.reduce((acc, curr) => acc + (curr.inventory_value || 0), 0);
  const totalItems = filteredBatches.length;
  const totalPages = Math.ceil(totalItems / pageSize) || 1;
  const paginatedBatches = filteredBatches.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const [printReportData, setPrintReportData] = useState<any>(null);

  const handlePrintStockReport = () => {
    const items = filteredBatches.map(b => {
      const cost = Number(b.purchase_price || 0);
      const qty = Number(b.quantity || 0);
      return {
        productName: `${b.product_name || (isRtl ? 'منتج غير محدد' : 'Unknown Product')} (دفعة: ${b.batch_number || '-'} | إنتاج: ${b.production_date || '-'} | صلاحية: ${b.expiry_date || '-'})`,
        productCode: b.product_code || '-',
        quantity: qty,
        unitCode: isRtl ? 'وحدة' : 'Unit',
        price: cost,
        total: cost * qty
      };
    });

    setPrintReportData({
      type: 'STOCK_REPORT',
      invoiceNumber: `STOCK-REP-${new Date().toISOString().slice(0, 10)}`,
      date: new Date().toISOString(),
      entityName: warehouseFilter ? (warehouses.find(w => w.id === warehouseFilter)?.name || (isRtl ? 'مستودع محدد' : 'Selected Warehouse')) : (isRtl ? 'كافة المستودعات والفروع' : 'All Warehouses'),
      subtotal: totalValue,
      grandTotal: totalValue,
      notes: isRtl ? `تقرير جرد وتقييم مخزني شامل - إجمالي كمية الوحدات: ${totalStock.toLocaleString()} وحدة عبر ${filteredBatches.length} دفعة` : `Certified Inventory Valuation Report - Total Stock: ${totalStock} units across ${filteredBatches.length} batches`,
      items: items
    });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', width: '100%' }}>
      {productId && productSummary && (
        <div style={{ marginBottom: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <Package size={32} color="var(--color-primary)" />
            <div>
              <div style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem', marginBottom: '4px' }}>{isRtl ? 'تفاصيل المنتج' : 'Product Details'}</div>
              <h2 style={{ margin: 0, fontSize: '1.5rem', color: 'var(--color-text-primary)' }}>{productSummary.name} — {productSummary.product_code}</h2>
            </div>
          </div>
        </div>
      )}

      {productId && productSummary && (
        <div className="card" style={{ marginBottom: '16px', borderLeft: '4px solid var(--color-primary)' }}>
          <div className="card-body">
            <h3 style={{ margin: '0 0 16px 0', display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--color-primary-dark)' }}>
              <Package size={20} />
              {isRtl ? 'معلومات المنتج' : 'Product Information'}
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '16px' }}>
              <div>
                <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>{t('products.name') || 'Product Name'}</div>
                <div style={{ fontWeight: 600 }}>{productSummary.name}</div>
              </div>
              <div>
                <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>{t('products.code') || 'SKU'}</div>
                <div style={{ fontWeight: 600 }}>{productSummary.product_code}</div>
              </div>
              <div>
                <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>{t('products.category') || 'Category'}</div>
                <div style={{ fontWeight: 500 }}>{productSummary.category?.name || '-'}</div>
              </div>
              <div>
                <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>{t('products.brand') || 'Brand'}</div>
                <div style={{ fontWeight: 500 }}>{productSummary.brand?.name || '-'}</div>
              </div>
              <div>
                <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>{t('products.unit') || 'Unit'}</div>
                <div style={{ fontWeight: 500 }}>{productSummary.unit?.name || '-'}</div>
              </div>
              <div>
                <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>{isRtl ? 'سعر البيع' : 'Selling Price'}</div>
                <div style={{ fontWeight: 600, color: 'var(--color-primary)' }}>{Number(productSummary.selling_price || 0).toFixed(2)} {t('products.currency')}</div>
              </div>
              <div>
                <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>{isRtl ? 'تكلفة الشراء' : 'Purchase Cost'}</div>
                <div style={{ fontWeight: 600 }}>{Number(productSummary.purchase_price || 0).toFixed(2)} {t('products.currency')}</div>
              </div>
              <div>
                <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>{t('inventory.currentStock') || 'Current Stock'}</div>
                <div style={{ fontWeight: 700, color: totalStock < productSummary.min_stock ? 'var(--color-danger)' : 'var(--color-success)' }}>
                  {totalStock} {productSummary.unit?.name || ''}
                </div>
              </div>
              <div>
                <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>{t('products.minStock') || 'Min Stock'}</div>
                <div style={{ fontWeight: 500 }}>{productSummary.min_stock}</div>
              </div>
              <div>
                <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>{t('inventory.totalValue') || 'Stock Value'}</div>
                <div style={{ fontWeight: 700, direction: 'ltr', textAlign: isRtl ? 'right' : 'left' }}>
                  {totalValue.toFixed(2)} {t('products.currency')}
                </div>
              </div>
              <div>
                <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>{isRtl ? 'الحالة' : 'Status'}</div>
                <div style={{ fontWeight: 600, color: productSummary.active ? 'var(--color-success)' : 'var(--color-text-muted)' }}>
                  {productSummary.active ? (isRtl ? 'نشط' : 'Active') : (isRtl ? 'غير نشط' : 'Inactive')}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {selectedWarehouseSummary && !productId && (
        <div className="card" style={{ marginBottom: '16px', borderLeft: '4px solid var(--color-primary)' }}>
          <div className="card-body">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <Building2 size={32} color="var(--color-primary)" />
                <div>
                  <div style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem', marginBottom: '2px' }}>
                    {isRtl ? 'المستودع المحدد' : 'Selected Warehouse'}
                  </div>
                  <h2 style={{ margin: 0, fontSize: '1.35rem', color: 'var(--color-text-primary)' }}>
                    {selectedWarehouseSummary.name} — {selectedWarehouseSummary.code}
                  </h2>
                  {selectedWarehouseSummary.location && (
                    <div style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)', marginTop: '2px' }}>
                      📍 {selectedWarehouseSummary.location}
                    </div>
                  )}
                </div>
              </div>
              <button 
                onClick={() => handleWarehouseFilterChange('')}
                className="btn btn-secondary"
                style={{ fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                <X size={16} />
                {isRtl ? 'عرض كافة المستودعات' : 'Show All Warehouses'}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="card">
        <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <Package size={28} color="var(--color-primary)" />
            <div>
              <h2 style={{ fontSize: '1.25rem', marginBottom: '4px', margin: 0 }}>
                {productId 
                  ? (isRtl ? 'دفعات المخزون' : 'Inventory Batches') 
                  : (selectedWarehouseSummary 
                      ? (isRtl ? `مخزون مستودع (${selectedWarehouseSummary.name})` : `Warehouse Stock (${selectedWarehouseSummary.name})`)
                      : t('inventory.title'))}
              </h2>
              <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.875rem', margin: 0 }}>
                {productId 
                  ? (isRtl ? 'تفاصيل كافة الدفعات الفعلية لهذا المنتج في المستودعات' : 'Details of all actual batches for this product in warehouses') 
                  : (selectedWarehouseSummary
                      ? (isRtl ? `عرض كافة المنتجات والدفعات المتوفرة داخل ${selectedWarehouseSummary.name} فقط` : `Showing only products and batches available inside ${selectedWarehouseSummary.name}`)
                      : t('inventory.subtitle'))}
              </p>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              type="button"
              onClick={handlePrintStockReport}
              className="btn btn-secondary"
              style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem' }}
              title={isRtl ? 'طباعة تقرير جرد المخزون' : 'Print Stock Valuation Report'}
            >
              <Printer size={16} />
              <span>{isRtl ? 'طباعة تقرير المخزون' : 'Print Stock Report'}</span>
            </button>
            {hasPermission('inventory.create') && (
              <button
                className="btn btn-primary"
                onClick={handleOpenAddModal}
                style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem' }}
                title={isRtl ? 'إضافة دفعة مخزون جديدة' : 'Add Stock Batch'}
              >
                <Plus size={18} />
                <span>{t('inventory.addStock')}</span>
              </button>
            )}
          </div>
        </div>

        <div className="card-body" style={{ padding: 0 }}>
          <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--color-border)', display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center', backgroundColor: 'var(--color-surface)' }}>
            <div style={{ position: 'relative', flex: 1, minWidth: '240px' }}>
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
                placeholder={t('common.search') || (isRtl ? 'البحث بالاسم أو الكود أو رقم الدفعة...' : 'Search by name, code or batch...')}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={{
                  padding: '8px 12px',
                  paddingRight: isRtl ? '36px' : '12px',
                  paddingLeft: isRtl ? '12px' : '36px',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--color-border)',
                  fontSize: '0.85rem',
                  backgroundColor: 'var(--color-background)',
                  color: 'var(--color-text-primary)',
                  outline: 'none',
                  minHeight: '38px',
                  width: '100%',
                  boxSizing: 'border-box'
                }}
              />
            </div>
            
            <select 
              value={statusFilter} 
              onChange={(e) => setStatusFilter(e.target.value)} 
              style={{ 
                padding: '8px 14px', 
                border: '1px solid var(--color-border)', 
                borderRadius: 'var(--radius-md)', 
                minWidth: '150px', 
                backgroundColor: 'var(--color-background)', 
                color: 'var(--color-text-primary)', 
                fontSize: '0.85rem',
                outline: 'none',
                minHeight: '38px',
                cursor: 'pointer'
              }}
            >
              <option value="">{isRtl ? 'جميع الحالات' : 'All Statuses'}</option>
              <option value="Valid">{t('expiry.valid')}</option>
              <option value="Expiring Soon">{t('expiry.expiringSoon')}</option>
              <option value="Expires Today">{t('expiry.expiresToday')}</option>
              <option value="Expired">{t('expiry.expired')}</option>
            </select>

            <select 
              value={warehouseFilter} 
              onChange={(e) => handleWarehouseFilterChange(e.target.value)} 
              style={{ 
                padding: '8px 14px', 
                border: '1px solid var(--color-border)', 
                borderRadius: 'var(--radius-md)', 
                minWidth: '160px', 
                backgroundColor: 'var(--color-background)', 
                color: 'var(--color-text-primary)', 
                fontSize: '0.85rem',
                outline: 'none',
                minHeight: '38px',
                cursor: 'pointer'
              }}
            >
              <option value="">{isRtl ? 'جميع المستودعات' : 'All Warehouses'}</option>
              {warehouses.map(w => (
                <option key={w.id} value={w.id}>{w.name}</option>
              ))}
            </select>
          </div>

          {/* Desktop Table View (>= 768px) - 100% Fit, Zero Horizontal Scroll */}
          <div className="desktop-table-view inventory-table-container">
            <table className="table inventory-table" style={{ width: '100%', tableLayout: 'fixed', borderCollapse: 'collapse', margin: 0, textAlign: isRtl ? 'right' : 'left' }}>
              <colgroup>
                {!productId && <col style={{ width: '7.5%' }} />}
                {!productId && <col style={{ width: '19.0%' }} />}
                <col style={{ width: productId ? '12.0%' : '8.5%' }} />
                <col style={{ width: productId ? '15.0%' : '12.0%' }} />
                <col style={{ width: productId ? '7.0%' : '5.0%' }} />
                <col style={{ width: productId ? '10.0%' : '7.0%' }} />
                <col style={{ width: productId ? '12.0%' : '8.5%' }} />
                <col style={{ width: productId ? '12.0%' : '8.5%' }} />
                <col style={{ width: productId ? '9.0%' : '6.5%' }} />
                <col style={{ width: productId ? '11.0%' : '8.0%' }} />
                <col style={{ width: productId ? '8.0%' : '6.0%' }} />
                <col style={{ width: productId ? '4.0%' : '3.5%' }} />
              </colgroup>
              <thead>
                <tr style={{ borderBottom: '2px solid var(--color-border)', backgroundColor: 'var(--color-surface)', textAlign: isRtl ? 'right' : 'left', height: '38px' }}>
                  {!productId && <th style={{ padding: '6px 4px', fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-text-secondary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{t('products.code')}</th>}
                  {!productId && <th style={{ padding: '6px 6px', fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-text-secondary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{t('products.name')}</th>}
                  <th style={{ padding: '6px 4px', fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-text-secondary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{t('inventory.batchNumber')}</th>
                  <th style={{ padding: '6px 4px', fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-text-secondary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{t('warehouses.title')}</th>
                  <th style={{ padding: '6px 4px', fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-text-secondary)', whiteSpace: 'nowrap', textAlign: 'center' }}>{isRtl ? 'المتبقي' : 'Remaining'}</th>
                  <th style={{ padding: '6px 4px', fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-text-secondary)', whiteSpace: 'nowrap', textAlign: isRtl ? 'left' : 'right' }}>{t('inventory.cost')} <span style={{ fontSize: '0.68rem', fontWeight: 400, color: 'var(--color-text-muted)' }}>({t('products.currency') || (isRtl ? 'ر.س' : 'SAR')})</span></th>
                  <th style={{ padding: '6px 4px', fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-text-secondary)', whiteSpace: 'nowrap', textAlign: 'center' }}>{t('inventory.productionDate')}</th>
                  <th style={{ padding: '6px 4px', fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-text-secondary)', whiteSpace: 'nowrap', textAlign: 'center' }}>{t('inventory.expiryDate')}</th>
                  <th style={{ padding: '6px 4px', fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-text-secondary)', whiteSpace: 'nowrap', textAlign: 'center' }}>{t('inventory.daysRemaining')}</th>
                  <th style={{ padding: '6px 4px', fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-text-secondary)', whiteSpace: 'nowrap', textAlign: isRtl ? 'left' : 'right' }}>{t('inventory.inventoryValue')} <span style={{ fontSize: '0.68rem', fontWeight: 400, color: 'var(--color-text-muted)' }}>({t('products.currency') || (isRtl ? 'ر.س' : 'SAR')})</span></th>
                  <th style={{ padding: '6px 4px', fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-text-secondary)', whiteSpace: 'nowrap', textAlign: 'center' }}>{t('inventory.status')}</th>
                  <th style={{ padding: '6px 2px', fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-text-secondary)', whiteSpace: 'nowrap', textAlign: 'center' }}>{isRtl ? 'تعديل' : 'Edit'}</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={productId ? 10 : 12} style={{ textAlign: 'center', padding: '32px', color: 'var(--color-text-secondary)', fontSize: '0.875rem' }}>{t('common.loading')}</td></tr>
                ) : filteredBatches.length === 0 ? (
                  <tr>
                    <td colSpan={productId ? 10 : 12} style={{ textAlign: 'center', padding: '36px 20px', color: 'var(--color-text-muted)' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
                        <Building2 size={48} color="var(--color-border)" />
                        <div style={{ marginBottom: '8px' }}>
                          <p style={{ fontWeight: 700, fontSize: '1.15rem', color: 'var(--color-text-primary)', marginBottom: '6px' }}>
                            {selectedWarehouseSummary || warehouseFilter
                              ? (isRtl ? `لا توجد منتجات أو دفعات في مستودع (${selectedWarehouseSummary?.name || 'هذا المستودع'})` : `No products or batches found in ${selectedWarehouseSummary?.name || 'this warehouse'}`)
                              : (productId ? (isRtl ? 'لا توجد دفعات مخزون مسجلة لهذا المنتج.' : 'No inventory batches recorded for this product.') : (isRtl ? 'لا توجد دفعات مخزون' : 'No inventory batches'))}
                          </p>
                          <p style={{ fontSize: '0.9rem', color: 'var(--color-text-secondary)', maxWidth: '500px', margin: '0 auto' }}>
                            {selectedWarehouseSummary || warehouseFilter
                              ? (isRtl ? 'هذا المستودع فارغ حالياً ولم يتم إدخال أي منتجات أو دفعات إليه.' : 'This warehouse is currently empty with no stock or batches assigned.')
                              : (productId ? (isRtl ? 'بيانات المنتج الأساسية موجودة في النظام، ولكن لم يتم تسجيل أي دفعات له في أي مستودع حتى الآن.' : 'Product exists in system, but has no batches recorded.') : (isRtl ? 'لا توجد سجلات مخزون مطابقة للبحث أو الفلتر المحدد.' : 'No inventory records match the selected filter.'))}
                          </p>
                        </div>
                        {hasPermission('inventory.create') && (
                          <button className="btn btn-primary" onClick={handleOpenAddModal}>
                            {t('inventory.addStock')}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ) : (
                  paginatedBatches.map(batch => (
                    <tr 
                      key={batch.id} 
                      style={{ 
                        borderBottom: '1px solid var(--color-border)', 
                        height: '38px',
                        transition: 'background-color 0.15s ease' 
                      }}
                    >
                      {!productId && (
                        <td 
                          style={{ 
                            padding: '4px 4px', 
                            whiteSpace: 'nowrap', 
                            overflow: 'hidden', 
                            textOverflow: 'ellipsis', 
                            verticalAlign: 'middle' 
                          }}
                          title={batch.product_code || ''}
                        >
                          <span style={{ 
                            fontSize: '0.7rem', 
                            fontFamily: 'monospace', 
                            backgroundColor: 'var(--color-background)', 
                            border: '1px solid var(--color-border)',
                            padding: '1px 4px', 
                            borderRadius: '4px',
                            color: 'var(--color-text-primary)',
                            display: 'inline-block',
                            maxWidth: '100%',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis'
                          }}>
                            {batch.product_code || '-'}
                          </span>
                        </td>
                      )}
                      {!productId && (
                        <td 
                          style={{ 
                            padding: '4px 6px', 
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            verticalAlign: 'middle'
                          }}
                          title={batch.product_name || ''}
                        >
                          <span style={{ 
                            fontWeight: 600, 
                            fontSize: '0.78rem', 
                            color: 'var(--color-text-primary)',
                            display: 'block',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap'
                          }}>
                            {batch.product_name || '-'}
                          </span>
                        </td>
                      )}
                      <td 
                        style={{ 
                          padding: '4px 4px', 
                          whiteSpace: 'nowrap', 
                          overflow: 'hidden', 
                          textOverflow: 'ellipsis', 
                          verticalAlign: 'middle' 
                        }}
                        title={batch.batch_number}
                      >
                        <span style={{ 
                          fontSize: '0.7rem', 
                          fontFamily: 'monospace', 
                          backgroundColor: 'var(--color-background)', 
                          border: '1px solid var(--color-border)',
                          padding: '1px 4px', 
                          borderRadius: '4px',
                          color: 'var(--color-text-primary)',
                          display: 'inline-block',
                          maxWidth: '100%',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis'
                        }}>
                          {batch.batch_number}
                        </span>
                      </td>
                      <td 
                        style={{ 
                          padding: '4px 4px', 
                          whiteSpace: 'nowrap', 
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          verticalAlign: 'middle' 
                        }}
                        title={batch.warehouse_name || ''}
                      >
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', fontSize: '0.76rem', color: 'var(--color-text-secondary)', maxWidth: '100%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          <Building2 size={12} color="var(--color-text-muted)" style={{ flexShrink: 0 }} />
                          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{batch.warehouse_name || '-'}</span>
                        </div>
                      </td>
                      <td style={{ padding: '4px 4px', textAlign: 'center', whiteSpace: 'nowrap', verticalAlign: 'middle' }}>
                        <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--color-text-primary)', fontVariantNumeric: 'tabular-nums' }}>
                          {batch.quantity}
                        </span>
                      </td>
                      <td style={{ padding: '4px 4px', whiteSpace: 'nowrap', textAlign: isRtl ? 'left' : 'right', verticalAlign: 'middle' }}>
                        <span style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--color-text-primary)', fontVariantNumeric: 'tabular-nums' }}>
                          {Number(batch.purchase_price).toFixed(2)}
                        </span>
                      </td>
                      <td style={{ padding: '4px 4px', whiteSpace: 'nowrap', textAlign: 'center', verticalAlign: 'middle' }}>
                        <button
                          type="button"
                          onClick={() => handleOpenEditModal(batch)}
                          title={isRtl ? 'انقر لتعديل تاريخ الإنتاج أو الدفعة' : 'Click to edit production date'}
                          style={{
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            padding: '1px 3px',
                            fontSize: '0.75rem',
                            color: 'var(--color-text-primary)',
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '3px',
                            borderRadius: '4px'
                          }}
                        >
                          <Calendar size={11} color="var(--color-primary)" />
                          <span style={{ fontWeight: 500, fontVariantNumeric: 'tabular-nums' }}>{batch.production_date || '-'}</span>
                        </button>
                      </td>
                      <td style={{ padding: '4px 4px', whiteSpace: 'nowrap', textAlign: 'center', verticalAlign: 'middle' }}>
                        <span style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', fontVariantNumeric: 'tabular-nums' }}>
                          {batch.expiry_date}
                        </span>
                      </td>
                      {(() => {
                        const days = batch.days_remaining ?? 0;
                        const hasDays = batch.days_remaining !== undefined && batch.days_remaining !== null;
                        const isExpired = hasDays && days < 0;
                        const isToday = hasDays && days === 0;
                        const isSoon = hasDays && days <= 30;

                        return (
                          <td style={{ 
                            padding: '4px 4px', 
                            fontSize: '0.75rem', 
                            fontWeight: 600, 
                            color: isExpired || isToday ? '#dc2626' : isSoon ? '#d97706' : 'var(--color-text-secondary)', 
                            whiteSpace: 'nowrap', 
                            textAlign: 'center',
                            verticalAlign: 'middle',
                            fontVariantNumeric: 'tabular-nums' 
                          }}>
                            {!hasDays
                              ? '-'
                              : isExpired 
                                ? (isRtl ? 'منتهي' : 'Expired') 
                                : isToday 
                                  ? (isRtl ? 'اليوم' : 'Today') 
                                  : `${days} ${isRtl ? 'يوم' : 'd'}`}
                          </td>
                        );
                      })()}
                      <td style={{ padding: '4px 4px', whiteSpace: 'nowrap', textAlign: isRtl ? 'left' : 'right', verticalAlign: 'middle' }}>
                        <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--color-primary)', fontVariantNumeric: 'tabular-nums' }}>
                          {Number(batch.inventory_value).toFixed(2)}
                        </span>
                      </td>
                      <td style={{ padding: '4px 4px', whiteSpace: 'nowrap', textAlign: 'center', verticalAlign: 'middle' }}>
                        {getStatusBadge(batch.expiry_status)}
                      </td>
                      <td style={{ padding: '4px 2px', whiteSpace: 'nowrap', textAlign: 'center', verticalAlign: 'middle' }}>
                        <button
                          type="button"
                          onClick={() => handleOpenEditModal(batch)}
                          style={{
                            background: 'none',
                            border: '1px solid var(--color-border)',
                            borderRadius: '4px',
                            padding: '3px 5px',
                            cursor: 'pointer',
                            color: 'var(--color-primary)',
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            transition: 'all 0.15s ease'
                          }}
                          title={isRtl ? 'تعديل الدفعة وتاريخ الإنتاج' : 'Edit batch and dates'}
                        >
                          <Edit2 size={12} />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Mobile Cards View (< 768px for Smartphones & Small Tablets) */}
          <div className="mobile-cards-view" style={{ flexDirection: 'column', gap: '10px', padding: '12px' }}>
            {loading ? (
              <div style={{ textAlign: 'center', padding: '24px', color: 'var(--color-text-secondary)' }}>
                {t('common.loading')}
              </div>
            ) : filteredBatches.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '24px 16px', color: 'var(--color-text-muted)' }}>
                <p style={{ fontWeight: 600, margin: 0 }}>
                  {isRtl ? 'لا توجد دفعات مخزون مطابقة' : 'No inventory batches found'}
                </p>
              </div>
            ) : (
              paginatedBatches.map(batch => (
                <div 
                  key={`card-${batch.id}`} 
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
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '0.875rem', color: 'var(--color-text-primary)' }}>
                        {batch.product_name || '-'}
                      </div>
                      <div style={{ display: 'flex', gap: '6px', marginTop: '3px', flexWrap: 'wrap' }}>
                        {batch.product_code && (
                          <span style={{ fontSize: '0.7rem', fontFamily: 'monospace', backgroundColor: 'var(--color-background)', border: '1px solid var(--color-border)', padding: '1px 5px', borderRadius: '4px' }}>
                            {batch.product_code}
                          </span>
                        )}
                        <span style={{ fontSize: '0.7rem', fontFamily: 'monospace', backgroundColor: 'var(--color-background)', border: '1px solid var(--color-border)', padding: '1px 5px', borderRadius: '4px' }}>
                          #{batch.batch_number}
                        </span>
                      </div>
                    </div>
                    <div>
                      {getStatusBadge(batch.expiry_status)}
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>
                    <Building2 size={13} color="var(--color-text-muted)" />
                    <span>{batch.warehouse_name || '-'}</span>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '6px', backgroundColor: 'var(--color-background)', padding: '8px 10px', borderRadius: '6px', fontSize: '0.8rem', textAlign: 'center' }}>
                    <div>
                      <div style={{ fontSize: '0.68rem', color: 'var(--color-text-muted)' }}>{isRtl ? 'المتبقي' : 'Remaining'}</div>
                      <div style={{ fontWeight: 700, color: 'var(--color-text-primary)', fontSize: '0.875rem' }}>{batch.quantity}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: '0.68rem', color: 'var(--color-text-muted)' }}>{isRtl ? 'التكلفة' : 'Cost'}</div>
                      <div style={{ fontWeight: 600 }}>{Number(batch.purchase_price).toFixed(2)}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: '0.68rem', color: 'var(--color-text-muted)' }}>{isRtl ? 'القيمة' : 'Value'}</div>
                      <div style={{ fontWeight: 700, color: 'var(--color-primary)' }}>{Number(batch.inventory_value).toFixed(2)}</div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.72rem', color: 'var(--color-text-secondary)', borderTop: '1px dashed var(--color-border)', paddingTop: '6px' }}>
                    <span>{isRtl ? 'الإنتاج:' : 'Prod:'} <strong>{batch.production_date || '-'}</strong></span>
                    <span>{isRtl ? 'الصلاحية:' : 'Expiry:'} <strong>{batch.expiry_date || '-'}</strong></span>
                    <button
                      type="button"
                      onClick={() => handleOpenEditModal(batch)}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: 'var(--color-primary)',
                        fontWeight: 600,
                        fontSize: '0.75rem',
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '3px'
                      }}
                    >
                      <Edit2 size={12} />
                      <span>{isRtl ? 'تعديل' : 'Edit'}</span>
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Pagination Footer */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '12px 18px',
            borderTop: '1px solid var(--color-border)',
            backgroundColor: 'var(--color-surface)',
            flexWrap: 'wrap',
            gap: '12px',
            fontSize: '0.85rem',
            color: 'var(--color-text-secondary)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span>{isRtl ? 'عرض' : 'Showing'}</span>
              <span style={{ fontWeight: 600, color: 'var(--color-text-primary)' }}>
                {totalItems === 0 ? 0 : (currentPage - 1) * pageSize + 1} - {Math.min(currentPage * pageSize, totalItems)}
              </span>
              <span>{isRtl ? 'من أصل' : 'of'}</span>
              <span style={{ fontWeight: 700, color: 'var(--color-primary)' }}>{totalItems}</span>
              <span>{isRtl ? 'دفعة' : 'batches'}</span>
            </div>

            {totalPages > 1 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <button
                  type="button"
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="btn btn-secondary"
                  style={{ padding: '4px 12px', fontSize: '0.8rem', minHeight: '30px', opacity: currentPage === 1 ? 0.5 : 1, cursor: currentPage === 1 ? 'not-allowed' : 'pointer' }}
                >
                  {isRtl ? 'السابق' : 'Previous'}
                </button>
                <span style={{ padding: '0 8px', fontWeight: 600, color: 'var(--color-text-primary)' }}>
                  {currentPage} / {totalPages}
                </span>
                <button
                  type="button"
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="btn btn-secondary"
                  style={{ padding: '4px 12px', fontSize: '0.8rem', minHeight: '30px', opacity: currentPage === totalPages ? 0.5 : 1, cursor: currentPage === totalPages ? 'not-allowed' : 'pointer' }}
                >
                  {isRtl ? 'التالي' : 'Next'}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Add / Edit Stock Modal */}
      {showModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }}>
          <div className="card" style={{ width: '100%', maxWidth: '520px', backgroundColor: 'var(--color-surface)', borderRadius: 'var(--radius-lg)', boxShadow: '0 10px 25px rgba(0,0,0,0.2)' }}>
            <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', borderBottom: '1px solid var(--color-border)' }}>
              <h3 style={{ margin: 0, fontSize: '1.15rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Calendar size={18} color="var(--color-primary)" />
                {editingBatch 
                  ? (isRtl ? 'تعديل دفعة المخزون وتاريخ الإنتاج' : 'Edit Batch & Production Date') 
                  : (isRtl ? 'إضافة دفعة مخزون جديدة' : t('inventory.addStock'))}
              </h3>
              <button onClick={() => setShowModal(false)} className="btn btn-icon" style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={20} /></button>
            </div>
            <form onSubmit={handleSaveStock}>
              <div className="card-body" style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
                {formError && (
                  <div style={{ padding: '8px 12px', borderRadius: 'var(--radius-md)', backgroundColor: 'rgba(239, 68, 68, 0.15)', color: '#b91c1c', fontSize: '0.85rem' }}>
                    {formError}
                  </div>
                )}
                
                {/* Product Selection */}
                <div>
                  <label style={{ display: 'block', marginBottom: '4px', fontSize: '0.8rem', fontWeight: 600 }}>{t('products.product')} *</label>
                  {productId || editingBatch ? (
                    <input 
                      type="text" 
                      value={editingBatch ? (editingBatch.product_name || editingBatch.product_code || '') : (productSummary?.name || '')} 
                      disabled 
                      style={{ width: '100%', padding: '8px 12px', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', backgroundColor: 'var(--color-background)', color: 'var(--color-text-secondary)', cursor: 'not-allowed' }} 
                    />
                  ) : (
                    <select 
                      name="product_id" 
                      value={formData.product_id} 
                      onChange={handleInputChange} 
                      required 
                      style={{ width: '100%', padding: '8px 12px', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', backgroundColor: 'var(--color-background)', color: 'var(--color-text-primary)' }}
                    >
                      <option value="">{isRtl ? '-- اختر المنتج --' : '-- Select Product --'}</option>
                      {allProducts.map(p => (
                        <option key={p.id} value={p.id}>{p.name} ({p.product_code})</option>
                      ))}
                    </select>
                  )}
                </div>

                {/* Warehouse */}
                <div>
                  <label style={{ display: 'block', marginBottom: '4px', fontSize: '0.8rem', fontWeight: 600 }}>{t('warehouses.title')} *</label>
                  <select name="warehouse_id" value={formData.warehouse_id} onChange={handleInputChange} required style={{ width: '100%', padding: '8px 12px', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', backgroundColor: 'var(--color-background)', color: 'var(--color-text-primary)' }}>
                    <option value="">{isRtl ? '-- اختر المستودع --' : 'Select Warehouse...'}</option>
                    {warehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                  </select>
                </div>

                {/* Batch Number & Quantity */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 180px), 1fr))', gap: '14px' }}>
                  <div>
                    <label style={{ display: 'block', marginBottom: '4px', fontSize: '0.8rem', fontWeight: 600 }}>{t('inventory.batchNumber')} *</label>
                    <input type="text" name="batch_number" value={formData.batch_number} onChange={handleInputChange} required style={{ width: '100%', padding: '8px 12px', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', backgroundColor: 'var(--color-background)', color: 'var(--color-text-primary)' }} />
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '4px', fontSize: '0.8rem', fontWeight: 600 }}>{t('inventory.quantity')} *</label>
                    <input type="number" min="0" step="0.01" name="quantity" value={formData.quantity} onChange={handleInputChange} required style={{ width: '100%', padding: '8px 12px', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', backgroundColor: 'var(--color-background)', color: 'var(--color-text-primary)' }} />
                  </div>
                </div>

                {/* Production Date & Expiry Date */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 180px), 1fr))', gap: '14px' }}>
                  <div style={{ backgroundColor: 'rgba(16, 185, 129, 0.05)', padding: '10px', borderRadius: '8px', border: '1px solid rgba(16, 185, 129, 0.2)' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '4px', fontSize: '0.8rem', fontWeight: 700, color: 'var(--color-primary)' }}>
                      <Calendar size={13} />
                      {t('inventory.productionDate')} *
                    </label>
                    <input 
                      type="date" 
                      name="production_date" 
                      value={formData.production_date} 
                      onChange={handleInputChange} 
                      required
                      style={{ width: '100%', padding: '8px 10px', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', backgroundColor: 'var(--color-background)', color: 'var(--color-text-primary)', fontWeight: 600 }} 
                    />
                  </div>
                  <div style={{ backgroundColor: 'rgba(239, 68, 68, 0.05)', padding: '10px', borderRadius: '8px', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '4px', fontSize: '0.8rem', fontWeight: 700, color: '#dc2626' }}>
                      <Clock size={13} />
                      {t('inventory.expiryDate')} *
                    </label>
                    <input 
                      type="date" 
                      name="expiry_date" 
                      value={formData.expiry_date} 
                      onChange={handleInputChange} 
                      required 
                      style={{ width: '100%', padding: '8px 10px', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', backgroundColor: 'var(--color-background)', color: 'var(--color-text-primary)', fontWeight: 600 }} 
                    />
                  </div>
                </div>
              </div>
              <div className="card-footer" style={{ padding: '16px 20px', borderTop: '1px solid var(--color-border)', display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                <button type="button" onClick={() => setShowModal(false)} className="btn btn-secondary" disabled={saving}>{t('common.cancel')}</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? t('common.saving') : (editingBatch ? (isRtl ? 'حفظ التعديلات' : 'Save Changes') : t('common.save'))}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {printReportData && (
        <DocumentPrintModal
          isOpen={Boolean(printReportData)}
          onClose={() => setPrintReportData(null)}
          data={printReportData}
        />
      )}
    </div>
  );
};

export default InventoryList;
