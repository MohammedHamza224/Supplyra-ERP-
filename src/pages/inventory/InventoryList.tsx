import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useTranslation } from '../../contexts/LanguageContext';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { Search, Plus, Edit2, AlertTriangle, CircleCheck, Calendar, Clock, Package, Building2, X } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useDebounce } from '../../hooks/useDebounce';

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
  
  const [batches, setBatches] = useState<InventoryBatch[]>([]);
  const [loading, setLoading] = useState(true);
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

  // Modals
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const [formData, setFormData] = useState({
    warehouse_id: warehouseIdParam || '',
    batch_number: '',
    quantity: '',
    production_date: '',
    expiry_date: ''
  });

  const fetchWarehouses = async () => {
    const { data } = await supabase.from('warehouses').select('id, name').eq('active', true);
    if (data) setWarehouses(data);
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
        .select('id, code, name, location, notes, active')
        .eq('id', wId)
        .maybeSingle();
      if (data) setSelectedWarehouseSummary(data);
    } catch (e) {
      console.error('Error fetching warehouse summary:', e);
    }
  };

  const fetchBatches = async (wFilter = warehouseFilter) => {
    setLoading(true);
    try {
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
        setBatches([]);
        return;
      }
      
      const formattedData = (data || []).map((b: any) => {
        const [yyyy, mm, dd] = b.expiry_date.split('-');
        const expDate = new Date(Number(yyyy), Number(mm) - 1, Number(dd), 0, 0, 0, 0);
        const today = new Date();
        today.setHours(0,0,0,0);
        const diffTime = expDate.getTime() - today.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        let status = 'Valid';
        if (diffDays < 0) status = 'Expired';
        else if (diffDays === 0) status = 'Expires Today';
        else if (diffDays <= 30) status = 'Expiring Soon';

        const qty = Number(b.quantity);
        const cost = Number(b.products?.purchase_price || 0);

        return {
          ...b,
          product_name: b.products?.name,
          product_code: b.products?.product_code,
          purchase_price: cost,
          warehouse_name: b.warehouses?.name,
          expiry_status: status,
          days_remaining: diffDays,
          inventory_value: qty * cost
        };
      });

      setBatches(formattedData);
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

  const handleAddStock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!productId) return;
    
    setFormError('');
    if (!formData.warehouse_id || !formData.batch_number || !formData.quantity || !formData.expiry_date) {
      setFormError('Please fill all required fields');
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase.from('inventory_batches').insert([{
        product_id: productId,
        warehouse_id: formData.warehouse_id,
        batch_number: formData.batch_number,
        quantity: parseFloat(formData.quantity),
        production_date: formData.production_date || null,
        expiry_date: formData.expiry_date
      }]);

      if (error) throw error;

      setShowModal(false);
      setFormData({ warehouse_id: '', batch_number: '', quantity: '', production_date: '', expiry_date: '' });
      fetchBatches();
    } catch (err: any) {
      setFormError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const getStatusBadge = (status?: string) => {
    switch (status) {
      case 'Expired':
        return <span className="badge badge-danger"><AlertTriangle size={12} style={{marginRight: '4px'}}/> {t('expiry.expired')}</span>;
      case 'Expires Today':
        return <span className="badge badge-danger"><Clock size={12} style={{marginRight: '4px'}}/> {t('expiry.expiresToday')}</span>;
      case 'Expiring Soon':
        return <span className="badge badge-warning"><Calendar size={12} style={{marginRight: '4px'}}/> {t('expiry.expiringSoon')}</span>;
      default:
        return <span className="badge badge-success"><CircleCheck size={12} style={{marginRight: '4px'}}/> {t('expiry.valid')}</span>;
    }
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

  return (
    <div className="page-container">
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
          {productId && hasPermission('inventory.create') && (
            <button
              className="btn btn-primary"
              onClick={() => setShowModal(true)}
              style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
            >
              <Plus size={18} />
              {t('inventory.addStock')}
            </button>
          )}
        </div>

        <div className="card-body" style={{ padding: 0 }}>
          <div style={{ padding: 'var(--spacing-4)', borderBottom: '1px solid var(--color-border)', display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', backgroundColor: 'var(--color-background)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', padding: '4px 12px', flex: 1, minWidth: '250px' }}>
              <Search size={16} color="var(--color-text-muted)" />
              <input 
                type="text" 
                placeholder={t('common.search')}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={{ border: 'none', background: 'transparent', padding: '8px', width: '100%', outline: 'none', fontSize: '0.875rem' }}
              />
            </div>
            
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} style={{ padding: '8px 12px', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', minWidth: '150px' }}>
              <option value="">{t('common.status')} (All)</option>
              <option value="Valid">{t('expiry.valid')}</option>
              <option value="Expiring Soon">{t('expiry.expiringSoon')}</option>
              <option value="Expires Today">{t('expiry.expiresToday')}</option>
              <option value="Expired">{t('expiry.expired')}</option>
            </select>

            <select value={warehouseFilter} onChange={(e) => handleWarehouseFilterChange(e.target.value)} style={{ padding: '8px 12px', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', minWidth: '150px' }}>
              <option value="">{t('warehouses.title')} (All)</option>
              {warehouses.map(w => (
                <option key={w.id} value={w.id}>{w.name}</option>
              ))}
            </select>
          </div>

          <div className="table-responsive">
            <table className="table" style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid var(--color-border)', textAlign: 'left' }}>
                  {!productId && <th style={{ padding: '12px' }}>{t('products.code')}</th>}
                  {!productId && <th style={{ padding: '12px' }}>{t('products.name')}</th>}
                  <th style={{ padding: '12px' }}>{t('inventory.batchNumber')}</th>
                  <th style={{ padding: '12px' }}>{t('warehouses.title')}</th>
                  <th style={{ padding: '12px' }}>{isRtl ? 'المتبقي' : 'Remaining'}</th>
                  <th style={{ padding: '12px' }}>{t('inventory.cost')}</th>
                  <th style={{ padding: '12px' }}>{t('inventory.productionDate')}</th>
                  <th style={{ padding: '12px' }}>{t('inventory.expiryDate')}</th>
                  <th style={{ padding: '12px' }}>{t('inventory.daysRemaining')}</th>
                  <th style={{ padding: '12px' }}>{t('inventory.inventoryValue')}</th>
                  <th style={{ padding: '12px' }}>{t('inventory.status')}</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={productId ? 9 : 11} style={{ textAlign: 'center', padding: '24px' }}>{t('common.loading')}</td></tr>
                ) : filteredBatches.length === 0 ? (
                  <tr>
                    <td colSpan={productId ? 9 : 11} style={{ textAlign: 'center', padding: '36px 20px', color: 'var(--color-text-muted)' }}>
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
                        {productId && hasPermission('inventory.create') && (
                          <button className="btn btn-primary" onClick={() => setShowModal(true)}>
                            {t('inventory.addStock')}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredBatches.map(batch => (
                    <tr key={batch.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                      {!productId && <td style={{ padding: '12px', fontWeight: 600, color: 'var(--color-primary-dark)' }}>{batch.product_code}</td>}
                      {!productId && <td style={{ padding: '12px', fontWeight: 500 }}>{batch.product_name}</td>}
                      <td style={{ padding: '12px', fontWeight: 600 }}>{batch.batch_number}</td>
                      <td style={{ padding: '12px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <Building2 size={14} color="var(--color-text-muted)"/>
                          {batch.warehouse_name}
                        </div>
                      </td>
                      <td style={{ padding: '12px', fontWeight: 700 }}>{batch.quantity}</td>
                      <td style={{ padding: '12px', direction: 'ltr', textAlign: isRtl ? 'right' : 'left' }}>{Number(batch.purchase_price).toFixed(2)} {t('products.currency')}</td>
                      <td style={{ padding: '12px' }}>{batch.production_date || '-'}</td>
                      <td style={{ padding: '12px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <Calendar size={14} color="var(--color-text-muted)"/>
                          {batch.expiry_date}
                        </div>
                      </td>
                      <td style={{ padding: '12px', fontWeight: 500 }}>{batch.days_remaining}</td>
                      <td style={{ padding: '12px', fontWeight: 700, direction: 'ltr', textAlign: isRtl ? 'right' : 'left' }}>{Number(batch.inventory_value).toFixed(2)} {t('products.currency')}</td>
                      <td style={{ padding: '12px' }}>{getStatusBadge(batch.expiry_status)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Add Stock Modal */}
      {showModal && productId && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }}>
          <div className="card" style={{ width: '100%', maxWidth: '500px', backgroundColor: 'var(--color-surface)', borderRadius: 'var(--radius-lg)' }}>
            <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', borderBottom: '1px solid var(--color-border)' }}>
              <h3 style={{ margin: 0, fontSize: '1.2rem' }}>{t('inventory.addStock')}</h3>
              <button onClick={() => setShowModal(false)} className="btn btn-icon" style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={24} /></button>
            </div>
            <form onSubmit={handleAddStock}>
              <div className="card-body" style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {formError && (
                  <div style={{ padding: '8px 12px', borderRadius: 'var(--radius-md)', backgroundColor: 'rgba(239, 68, 68, 0.15)', color: '#b91c1c', fontSize: '0.85rem' }}>
                    {formError}
                  </div>
                )}
                
                <div>
                  <label style={{ display: 'block', marginBottom: '4px', fontSize: '0.8rem', fontWeight: 500 }}>{t('products.product')}</label>
                  <input type="text" value={productSummary?.name || ''} disabled style={{ width: '100%', padding: '8px 12px', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', backgroundColor: 'var(--color-background)' }} />
                </div>

                <div>
                  <label style={{ display: 'block', marginBottom: '4px', fontSize: '0.8rem', fontWeight: 500 }}>{t('warehouses.title')} *</label>
                  <select name="warehouse_id" value={formData.warehouse_id} onChange={handleInputChange} required style={{ width: '100%', padding: '8px 12px', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', backgroundColor: 'var(--color-surface)' }}>
                    <option value="">Select...</option>
                    {warehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                  </select>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <div>
                    <label style={{ display: 'block', marginBottom: '4px', fontSize: '0.8rem', fontWeight: 500 }}>{t('inventory.batchNumber')} *</label>
                    <input type="text" name="batch_number" value={formData.batch_number} onChange={handleInputChange} required style={{ width: '100%', padding: '8px 12px', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)' }} />
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '4px', fontSize: '0.8rem', fontWeight: 500 }}>{t('inventory.quantity')} *</label>
                    <input type="number" min="0" step="0.01" name="quantity" value={formData.quantity} onChange={handleInputChange} required style={{ width: '100%', padding: '8px 12px', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)' }} />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <div>
                    <label style={{ display: 'block', marginBottom: '4px', fontSize: '0.8rem', fontWeight: 500 }}>{t('inventory.productionDate')}</label>
                    <input type="date" name="production_date" value={formData.production_date} onChange={handleInputChange} style={{ width: '100%', padding: '8px 12px', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)' }} />
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '4px', fontSize: '0.8rem', fontWeight: 500 }}>{t('inventory.expiryDate')} *</label>
                    <input type="date" name="expiry_date" value={formData.expiry_date} onChange={handleInputChange} required style={{ width: '100%', padding: '8px 12px', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)' }} />
                  </div>
                </div>
              </div>
              <div className="card-footer" style={{ padding: '16px 20px', borderTop: '1px solid var(--color-border)', display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                <button type="button" onClick={() => setShowModal(false)} className="btn btn-secondary" disabled={saving}>{t('common.cancel')}</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? t('common.saving') : t('common.save')}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default InventoryList;
