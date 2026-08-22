import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from '../../contexts/LanguageContext';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { Building, Plus, Edit2, Trash2, Search, Building2, X, CheckCircle, XCircle } from 'lucide-react';
import { useDebounce } from '../../hooks/useDebounce';

const WarehousesList = () => {
  const { t, language } = useTranslation();
  const { hasPermission } = useAuth();
  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearchTerm = useDebounce(searchTerm, 300);

  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [deleteTargetWarehouse, setDeleteTargetWarehouse] = useState<any>(null);
  const [deleteErrorMsg, setDeleteErrorMsg] = useState('');
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    code: '',
    name: '',
    location: '',
    notes: '',
  });

  useEffect(() => {
    fetchWarehouses();
  }, [debouncedSearchTerm]);

  const fetchWarehouses = async () => {
    try {
      setLoading(true);
      
      let query = supabase
        .from('warehouses')
        .select('id, code, name, location, notes, active')
        .neq('active', false)
        .order('code');

      if (debouncedSearchTerm) {
        query = query.or(`name.ilike.%${debouncedSearchTerm}%,code.ilike.%${debouncedSearchTerm}%`);
      }

      const { data, error } = await query;

      if (error) throw error;
      
      if (!data) {
         setWarehouses([]);
         return;
      }

      // Safe duplicate merging logic
      const nameCounts = data.reduce((acc: any, w: any) => {
         acc[w.name] = (acc[w.name] || 0) + 1;
         return acc;
      }, {});

      const processedData = [...data];

      for (const [name, count] of Object.entries(nameCounts)) {
        if ((count as number) > 1) {
           const duplicates = processedData.filter(w => w.name === name);
           
           const withDeps = await Promise.all(duplicates.map(async (w) => {
              const [inv, ord, pur] = await Promise.all([
                 supabase.from('inventory_batches').select('id', { count: 'exact', head: true }).eq('warehouse_id', w.id),
                 supabase.from('orders').select('id', { count: 'exact', head: true }).eq('warehouse_id', w.id),
                 supabase.from('purchases').select('id', { count: 'exact', head: true }).eq('warehouse_id', w.id)
              ]);
              return {
                 ...w,
                 depCount: (inv.count || 0) + (ord.count || 0) + (pur.count || 0)
              };
           }));
           
           withDeps.sort((a, b) => b.depCount - a.depCount);
           
           for (let i = 1; i < withDeps.length; i++) {
              const idx = processedData.findIndex(w => w.id === withDeps[i].id);
              if (idx !== -1) processedData.splice(idx, 1);
           }
        }
      }

      setWarehouses(processedData);
    } catch (error: any) {
      console.error('Error fetching warehouses:', error);
    } finally {
      setLoading(false);
    }
  };

  const openModal = (warehouse?: any) => {
    setFormError('');
    if (warehouse) {
      setEditingId(warehouse.id);
      setFormData({
        code: warehouse.code,
        name: warehouse.name,
        location: warehouse.location || '',
        notes: warehouse.notes || '',
      });
    } else {
      setEditingId(null);
      setFormData({
        code: '',
        name: '',
        location: '',
        notes: '',
      });
    }
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    setSaving(true);

    try {
      if (editingId) {
        const { error } = await supabase
          .from('warehouses')
          .update(formData)
          .eq('id', editingId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('warehouses').insert([formData]);
        if (error) throw error;
      }

      await fetchWarehouses();
      closeModal();
    } catch (error: any) {
      console.error('Error saving warehouse:', error);
      setFormError(error?.message || 'Failed to save warehouse.');
    } finally {
      setSaving(false);
    }
  };

  const confirmDeleteClick = (warehouse: any) => {
    setDeleteConfirmId(warehouse.id);
    setDeleteTargetWarehouse(warehouse);
    setDeleteErrorMsg('');
  };

  const executeDelete = async () => {
    if (!deleteConfirmId) return;
    const id = deleteConfirmId;
    setSaving(true);
    setDeleteErrorMsg('');
    try {
      const [inventoryRes, orderRes, purchaseRes] = await Promise.all([
        supabase.from('inventory_batches').select('id', { count: 'exact', head: true }).eq('warehouse_id', id),
        supabase.from('orders').select('id', { count: 'exact', head: true }).eq('warehouse_id', id),
        supabase.from('purchases').select('id', { count: 'exact', head: true }).eq('warehouse_id', id),
      ]);

      const hasDependencies = 
        (inventoryRes.count || 0) > 0 || 
        (orderRes.count || 0) > 0 || 
        (purchaseRes.count || 0) > 0;

      if (hasDependencies) {
        throw new Error(language === 'ar' 
          ? 'لا يمكن حذف هذا المستودع لأنه مرتبط ببيانات مخزون أو حركات تشغيلية.' 
          : 'This warehouse cannot be deleted because it is linked to inventory or operational records.');
      }

      let { error } = await supabase.from('warehouses').delete().eq('id', id);
      if (error && (error.message?.includes('permission') || error.code === '42501' || error.message?.includes('violates foreign key'))) {
        // If hard DELETE is restricted by table privileges, deactivate safely via authorized UPDATE
        const { error: updateError } = await supabase.from('warehouses').update({ active: false }).eq('id', id);
        if (updateError) throw error;
      } else if (error) {
        throw error;
      }
      
      setDeleteConfirmId(null);
      setDeleteTargetWarehouse(null);
      await fetchWarehouses();
    } catch(e: any) {
      setDeleteErrorMsg(e.message || (language === 'ar' ? 'حدث خطأ أثناء حذف المستودع.' : 'Error deleting warehouse.'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="card">
      <div className="card-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <Building2 size={28} color="var(--color-primary)" />
          <div>
            <h2 style={{ fontSize: '1.25rem', marginBottom: '4px' }}>{t('warehouses.title')}</h2>
            <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.875rem' }}>{t('warehouses.subtitle')}</p>
          </div>
        </div>
        {hasPermission('warehouses.create') && (
          <button className="btn btn-primary" onClick={() => openModal()} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Plus size={18} />
            {t('warehouses.newWarehouse')}
          </button>
        )}
      </div>
      
      <div className="card-body" style={{ padding: 0 }}>
        <div style={{ padding: 'var(--spacing-4)', borderBottom: '1px solid var(--color-border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', backgroundColor: 'var(--color-background)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', padding: '4px 12px', width: '300px' }}>
            <Search size={16} color="var(--color-text-muted)" />
            <input 
              type="text" 
              placeholder={t('warehouses.search')} 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{ border: 'none', background: 'transparent', padding: '8px', width: '100%', outline: 'none', fontSize: '0.875rem' }}
            />
          </div>
        </div>

        <div className="table-responsive">
          <table className="table">
            <thead>
              <tr>
                <th>{t('warehouses.code')}</th>
                <th>{t('warehouses.name')}</th>
                <th>{t('warehouses.location')}</th>
                <th>{t('common.status')}</th>
                <th style={{ textAlign: 'right' }}>{t('common.actions')}</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={5} style={{ textAlign: 'center', padding: 'var(--spacing-8)' }}>{t('common.loading')}</td>
                </tr>
              ) : warehouses.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ textAlign: 'center', padding: 'var(--spacing-8)', color: 'var(--color-text-muted)' }}>
                    {t('common.noData')}
                  </td>
                </tr>
              ) : (
                warehouses.map((warehouse) => (
                  <tr key={warehouse.id}>
                    <td style={{ fontWeight: 600, color: 'var(--color-primary-dark)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Building2 size={16} color="var(--color-text-muted)" />
                        {warehouse.code}
                      </div>
                    </td>
                    <td style={{ fontWeight: 500 }}>{warehouse.name}</td>
                    <td>{warehouse.location || '-'}</td>
                    <td>
                      <span className={`badge ${warehouse.active ? 'badge-success' : 'badge-neutral'}`}>
                        {warehouse.active ? t('common.active') : t('common.inactive')}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                        {hasPermission('warehouses.update') && (
                          <button type="button" className="btn btn-secondary" style={{ padding: '6px', marginRight: '4px' }} onClick={() => openModal(warehouse)} title={t('common.edit')}>
                            <Edit2 size={16} />
                          </button>
                        )}
                        {hasPermission('warehouses.update') && (
                          <button type="button" className="btn btn-secondary" style={{ padding: '6px', marginRight: '4px' }} onClick={() => navigate('/inventory?warehouse_id=' + warehouse.id)} title={t('warehouses.manage') || 'Manage Warehouse'}>
                            <Building size={16} />
                          </button>
                        )}
                        {(hasPermission('warehouses.delete') || hasPermission('warehouses.update') || hasPermission('warehouses.create')) && (
                          <button type="button" className="btn btn-danger" style={{ padding: '6px' }} onClick={() => confirmDeleteClick(warehouse)} title={t('common.delete')}>
                            <Trash2 size={16} />
                          </button>
                        )}
                      </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {deleteConfirmId && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }}>
          <div className="card" style={{ width: '100%', maxWidth: '400px', backgroundColor: 'var(--color-surface)', borderRadius: 'var(--radius-lg)' }}>
            <div className="card-header" style={{ padding: '16px 20px', borderBottom: '1px solid var(--color-border)' }}>
              <h3 style={{ margin: 0, fontSize: '1.2rem', color: 'var(--color-text-primary)' }}>{t('common.confirmDelete')}</h3>
            </div>
            <div className="card-body" style={{ padding: '20px' }}>
              <p style={{ margin: '0 0 16px 0', fontSize: '1rem', color: 'var(--color-text-secondary)' }}>
                هل أنت متأكد من حذف المستودع <strong>"{deleteTargetWarehouse?.name || deleteConfirmId}"</strong> نهائيًا؟
              </p>
              {deleteErrorMsg && (
                <div style={{ padding: '12px', backgroundColor: 'rgba(239, 68, 68, 0.1)', color: 'rgb(239, 68, 68)', borderRadius: 'var(--radius-md)', marginBottom: '16px', fontSize: '0.875rem' }}>
                  {deleteErrorMsg}
                </div>
              )}
            </div>
            <div className="card-footer" style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', padding: '16px', borderTop: '1px solid var(--color-border)' }}>
              <button type="button" className="btn btn-secondary" onClick={() => { setDeleteConfirmId(null); setDeleteTargetWarehouse(null); }} disabled={saving}>
                {t('common.cancel')}
              </button>
              <button type="button" className="btn btn-danger" onClick={executeDelete} disabled={saving}>
                {saving ? t('common.loading') : t('common.delete')}
              </button>
            </div>
          </div>
        </div>
      )}
        
      {showModal && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0, 0, 0, 0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }} onMouseDown={(e) => { if (e.target === e.currentTarget) closeModal(); }}>
          <div className="card" style={{ width: '100%', maxWidth: '500px', maxHeight: '90vh', overflowY: 'auto', margin: 0 }}>
            <div className="card-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <h2 style={{ fontSize: '1.25rem', marginBottom: '4px' }}>
                  {editingId ? t('common.edit') : t('warehouses.newWarehouse')}
                </h2>
              </div>
              <button type="button" onClick={closeModal} className="btn btn-secondary" style={{ padding: '4px' }}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {formError && (
                  <div style={{ padding: '12px', backgroundColor: 'var(--color-danger-light)', color: 'var(--color-danger)', borderRadius: 'var(--radius-md)', fontSize: '0.875rem' }}>
                    {formError}
                  </div>
                )}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '16px' }}>
                  <div>
                    <label className="form-label">{t('warehouses.code')} *</label>
                    <input type="text" className="form-input" value={formData.code} onChange={(e) => setFormData({ ...formData, code: e.target.value })} required />
                  </div>
                  <div>
                    <label className="form-label">{t('warehouses.name')} *</label>
                    <input type="text" className="form-input" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} required />
                  </div>
                </div>
                <div>
                  <label className="form-label">{t('warehouses.location')}</label>
                  <input type="text" className="form-input" value={formData.location} onChange={(e) => setFormData({ ...formData, location: e.target.value })} />
                </div>
              </div>
              <div className="card-footer" style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                <button type="button" className="btn btn-secondary" onClick={closeModal} disabled={saving}>{t('common.cancel')}</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? t('common.loading') : t('common.save')}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default WarehousesList;
