import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useTranslation } from '../../contexts/LanguageContext';
import { useAuth } from '../../contexts/AuthContext';
import { Plus, Edit2, Trash2, CheckCircle, X, Check } from 'lucide-react';

interface ProductSuppliersProps {
  productId: string;
}

const ProductSuppliers: React.FC<ProductSuppliersProps> = ({ productId }) => {
  const { t } = useTranslation();
  const { hasPermission } = useAuth();
  
  const [productSuppliers, setProductSuppliers] = useState<any[]>([]);
  const [availableSuppliers, setAvailableSuppliers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  
  // Form State
  const [editingSupplierId, setEditingSupplierId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    supplier_id: '',
    purchase_price: '',
    supplier_product_code: '',
    minimum_order_quantity: '',
    lead_time_days: '',
  });

  useEffect(() => {
    if (productId) {
      fetchProductSuppliers();
      fetchAvailableSuppliers();
    }
  }, [productId]);

  const fetchProductSuppliers = async () => {
    try {
      const { data, error } = await supabase
        .from('product_suppliers')
        .select(`
          *,
          supplier:suppliers(name)
        `)
        .eq('product_id', productId)
        .order('is_preferred', { ascending: false });

      if (error) throw error;
      setProductSuppliers(data || []);
    } catch (err: any) {
      console.error('Error fetching product suppliers:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchAvailableSuppliers = async () => {
    try {
      const { data, error } = await supabase
        .from('suppliers')
        .select('id, name')
        .eq('active', true)
        .order('name');
        
      if (error) throw error;
      setAvailableSuppliers(data || []);
    } catch (err: any) {
      console.error('Error fetching suppliers:', err);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const openAddForm = () => {
    setEditingSupplierId(null);
    setFormData({
      supplier_id: '',
      purchase_price: '',
      supplier_product_code: '',
      minimum_order_quantity: '',
      lead_time_days: '',
    });
    setShowAddForm(true);
    setError('');
  };

  const openEditForm = (ps: any) => {
    setEditingSupplierId(ps.supplier_id);
    setFormData({
      supplier_id: ps.supplier_id,
      purchase_price: ps.purchase_price ? ps.purchase_price.toString() : '',
      supplier_product_code: ps.supplier_product_code || '',
      minimum_order_quantity: ps.minimum_order_quantity ? ps.minimum_order_quantity.toString() : '',
      lead_time_days: ps.lead_time_days ? ps.lead_time_days.toString() : '',
    });
    setShowAddForm(true);
    setError('');
  };

  const saveRelationship = async () => {
    if (!formData.supplier_id) {
      setError(t('product_suppliers.selectSupplier'));
      return;
    }
    
    setSaving(true);
    setError('');

    try {
      const payload = {
        product_id: productId,
        supplier_id: formData.supplier_id,
        purchase_price: formData.purchase_price ? Number(formData.purchase_price) : null,
        supplier_product_code: formData.supplier_product_code || null,
        minimum_order_quantity: formData.minimum_order_quantity ? Number(formData.minimum_order_quantity) : null,
        lead_time_days: formData.lead_time_days ? parseInt(formData.lead_time_days) : null,
      };

      if (editingSupplierId) {
        const { error } = await supabase
          .from('product_suppliers')
          .update(payload)
          .eq('product_id', productId)
          .eq('supplier_id', editingSupplierId);
        
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('product_suppliers')
          .insert(payload);
          
        if (error) throw error;
      }

      setShowAddForm(false);
      fetchProductSuppliers();
    } catch (err: any) {
      console.error('Error saving supplier relationship:', err);
      setError(err.message || 'Failed to save relationship');
    } finally {
      setSaving(false);
    }
  };

  const removeRelationship = async (supplierId: string) => {
    if (!confirm(t('common.confirmDelete') || 'Are you sure?')) return;
    try {
      const { error } = await supabase
        .from('product_suppliers')
        .delete()
        .eq('product_id', productId)
        .eq('supplier_id', supplierId);
      
      if (error) throw error;
      fetchProductSuppliers();
    } catch (err: any) {
      console.error('Error deleting relationship:', err);
      alert('Failed to remove relationship');
    }
  };

  const setPrimary = async (supplierId: string) => {
    try {
      // Unset existing primary
      await supabase
        .from('product_suppliers')
        .update({ is_preferred: false })
        .eq('product_id', productId);
      
      // Set new primary
      const { error } = await supabase
        .from('product_suppliers')
        .update({ is_preferred: true })
        .eq('product_id', productId)
        .eq('supplier_id', supplierId);
        
      if (error) throw error;
      fetchProductSuppliers();
    } catch (err: any) {
      console.error('Error setting primary:', err);
      alert('Failed to set primary supplier');
    }
  };

  if (loading) return <div style={{ padding: '20px', textAlign: 'center' }}>Loading...</div>;

  return (
    <div style={{ marginTop: '24px', borderTop: '2px solid var(--color-border)', paddingTop: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <h4 style={{ margin: 0 }}>{t('product_suppliers.title')}</h4>
        {!showAddForm && hasPermission('products.update') && (
          <button type="button" className="btn btn-primary" onClick={openAddForm} style={{ padding: '6px 12px', fontSize: '0.875rem' }}>
            <Plus size={16} style={{ marginRight: '4px' }} />
            {t('product_suppliers.addSupplier')}
          </button>
        )}
      </div>

      {showAddForm && (
        <div style={{ backgroundColor: 'var(--color-background)', padding: '16px', borderRadius: 'var(--radius-md)', marginBottom: '16px', border: '1px solid var(--color-border)' }}>
          {error && <div style={{ color: 'var(--color-danger)', marginBottom: '12px', fontSize: '0.875rem' }}>{error}</div>}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div className="form-group">
              <label className="form-label">{t('product_suppliers.supplier')}</label>
              <select
                name="supplier_id"
                className="form-control"
                value={formData.supplier_id}
                onChange={handleInputChange}
                disabled={!!editingSupplierId}
              >
                <option value="">{t('product_suppliers.selectSupplier')}</option>
                {availableSuppliers.map(s => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">{t('product_suppliers.purchasePrice')} ({t('products.currency')})</label>
              <input
                type="number"
                name="purchase_price"
                className="form-control"
                value={formData.purchase_price}
                onChange={handleInputChange}
                step="0.01"
              />
            </div>
            <div className="form-group">
              <label className="form-label">{t('product_suppliers.supplierProductCode')}</label>
              <input
                type="text"
                name="supplier_product_code"
                className="form-control"
                value={formData.supplier_product_code}
                onChange={handleInputChange}
              />
            </div>
            <div className="form-group">
              <label className="form-label">{t('product_suppliers.minimumOrderQuantity')}</label>
              <input
                type="number"
                name="minimum_order_quantity"
                className="form-control"
                value={formData.minimum_order_quantity}
                onChange={handleInputChange}
                step="0.01"
              />
            </div>
            <div className="form-group">
              <label className="form-label">{t('product_suppliers.leadTime')} ({t('common.days') || 'Days'})</label>
              <input
                type="number"
                name="lead_time_days"
                className="form-control"
                value={formData.lead_time_days}
                onChange={handleInputChange}
                step="1"
              />
            </div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '16px' }}>
            <button type="button" className="btn btn-secondary" onClick={() => setShowAddForm(false)}>
              {t('common.cancel')}
            </button>
            <button type="button" className="btn btn-primary" onClick={saveRelationship} disabled={saving}>
              {saving ? t('common.saving') : t('common.save')}
            </button>
          </div>
        </div>
      )}

      {productSuppliers.length > 0 ? (
        <table className="table" style={{ width: '100%', fontSize: '0.875rem' }}>
          <thead>
            <tr>
              <th style={{ padding: '8px' }}>{t('product_suppliers.supplier')}</th>
              <th style={{ padding: '8px' }}>{t('product_suppliers.supplierProductCode')}</th>
              <th style={{ padding: '8px' }}>{t('product_suppliers.purchasePrice')}</th>
              <th style={{ padding: '8px', textAlign: 'center' }}>{t('product_suppliers.primarySupplier')}</th>
              <th style={{ padding: '8px', textAlign: 'right' }}>{t('products.actions')}</th>
            </tr>
          </thead>
          <tbody>
            {productSuppliers.map(ps => (
              <tr key={ps.supplier_id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                <td style={{ padding: '8px', fontWeight: 500 }}>{ps.supplier?.name}</td>
                <td style={{ padding: '8px' }}>{ps.supplier_product_code || '-'}</td>
                <td style={{ padding: '8px', direction: 'ltr', textAlign: 'left' }}>
                  {ps.purchase_price != null ? `${Number(ps.purchase_price).toFixed(2)} ${t('products.currency')}` : '-'}
                </td>
                <td style={{ padding: '8px', textAlign: 'center' }}>
                  {ps.is_preferred ? (
                    <span style={{ color: 'var(--color-success)' }}><CheckCircle size={16} /></span>
                  ) : (
                    hasPermission('products.update') && (
                      <button type="button" onClick={() => setPrimary(ps.supplier_id)} className="btn btn-secondary" style={{ padding: '2px 8px', fontSize: '0.75rem' }}>
                        {t('product_suppliers.setAsPrimary')}
                      </button>
                    )
                  )}
                </td>
                <td style={{ padding: '8px', textAlign: 'right' }}>
                  {hasPermission('products.update') && (
                    <button type="button" className="btn btn-secondary" style={{ padding: '4px', marginRight: '4px' }} onClick={() => openEditForm(ps)} title={t('product_suppliers.editSupplier')}>
                      <Edit2 size={14} />
                    </button>
                  )}
                  {hasPermission('products.update') && (
                    <button type="button" className="btn btn-danger" style={{ padding: '4px' }} onClick={() => removeRelationship(ps.supplier_id)} title={t('product_suppliers.removeSupplier')}>
                      <Trash2 size={14} />
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <div style={{ textAlign: 'center', padding: '20px', color: 'var(--color-text-secondary)', fontSize: '0.875rem' }}>
          {t('product_suppliers.noSuppliers')}
        </div>
      )}
    </div>
  );
};

export default ProductSuppliers;
