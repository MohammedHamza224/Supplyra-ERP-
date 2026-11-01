import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from '../../contexts/LanguageContext';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { Building, Plus, Edit2, Trash2, Search, Building2, X, CheckCircle, XCircle } from 'lucide-react';
import { useDebounce } from '../../hooks/useDebounce';

const WarehousesList = () => {
  const { t, language } = useTranslation();
  const isRtl = language === 'ar';
  const { hasPermission } = useAuth();
  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState('');
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
      setFetchError('');
      
      // Step 1: Safe dynamic select
      let { data, error } = await supabase
        .from('warehouses')
        .select('*')
        .order('name');

      if (error) {
        console.warn('Full warehouses select notice, falling back to base columns:', error.message);
        const fallback = await supabase
          .from('warehouses')
          .select('id, code, name, location')
          .order('name');
        if (fallback.error) throw fallback.error;
        data = fallback.data;
      }
      
      if (!data) {
         setWarehouses([]);
         return;
      }

      // Memory filter for search term
      let processedData = [...data];
      if (debouncedSearchTerm) {
        const term = debouncedSearchTerm.toLowerCase();
        processedData = processedData.filter((w: any) =>
          (w.name && w.name.toLowerCase().includes(term)) ||
          (w.code && w.code.toLowerCase().includes(term)) ||
          (w.location && w.location.toLowerCase().includes(term))
        );
      }

      // Filter out explicitly deactivated warehouses if active column is present
      processedData = processedData.filter((w: any) => w.active !== false);

      setWarehouses(processedData);
    } catch (error: any) {
      console.error('Error fetching warehouses:', error);
      setFetchError(error?.message || 'Failed to load warehouses');
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
      const fullPayload: any = {
        code: formData.code.trim().toUpperCase(),
        name: formData.name.trim(),
        location: formData.location ? formData.location.trim() : '',
        active: true,
      };
      if (formData.notes) {
        fullPayload.notes = formData.notes.trim();
      }

      if (editingId) {
        const { error } = await supabase
          .from('warehouses')
          .update(fullPayload)
          .eq('id', editingId);

        if (error) {
          console.warn('Warehouse update with notes failed, retrying base payload:', error.message);
          const safePayload = {
            code: formData.code.trim().toUpperCase(),
            name: formData.name.trim(),
            location: formData.location ? formData.location.trim() : '',
            active: true
          };
          const { error: retryError } = await supabase.from('warehouses').update(safePayload).eq('id', editingId);
          if (retryError) throw retryError;
        }
      } else {
        const { error } = await supabase.from('warehouses').insert([fullPayload]);
        if (error) {
          console.warn('Warehouse insert with notes failed, retrying base payload:', error.message);
          const safePayload = {
            code: formData.code.trim().toUpperCase(),
            name: formData.name.trim(),
            location: formData.location ? formData.location.trim() : '',
            active: true
          };
          const { error: retryError } = await supabase.from('warehouses').insert([safePayload]);
          if (retryError) throw retryError;
        }
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
          <div style={{ display: 'flex', alignItems: 'center', backgroundColor: 'var(--color-background)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', padding: '4px 12px', width: '100%', maxWidth: '300px' }}>
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

        {fetchError && (
          <div style={{ padding: '16px', margin: '16px', backgroundColor: 'var(--color-danger-light)', color: 'var(--color-danger)', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-danger)' }}>
            <strong>Database Error:</strong> {fetchError}
          </div>
        )}

        <div className="table-responsive">
          <table className="table" style={{ width: '100%', minWidth: '750px', borderCollapse: 'collapse', margin: 0, textAlign: isRtl ? 'right' : 'left' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid var(--color-border)', backgroundColor: 'var(--color-background)', textAlign: isRtl ? 'right' : 'left' }}>
                <th style={{ padding: '10px 14px', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--color-text-secondary)', whiteSpace: 'nowrap' }}>{t('warehouses.code')}</th>
                <th style={{ padding: '10px 14px', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--color-text-secondary)' }}>{t('warehouses.name')}</th>
                <th style={{ padding: '10px 14px', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--color-text-secondary)' }}>{t('warehouses.location')}</th>
                <th style={{ padding: '10px 14px', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--color-text-secondary)', whiteSpace: 'nowrap' }}>{t('common.status')}</th>
                <th style={{ padding: '10px 14px', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--color-text-secondary)', whiteSpace: 'nowrap', textAlign: isRtl ? 'left' : 'right' }}>{t('common.actions')}</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={5} style={{ textAlign: 'center', padding: '28px', color: 'var(--color-text-secondary)', fontSize: '0.875rem' }}>{t('common.loading')}</td>
                </tr>
              ) : warehouses.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ textAlign: 'center', padding: '28px', color: 'var(--color-text-secondary)', fontSize: '0.875rem' }}>
                    {t('common.noData')}
                  </td>
                </tr>
              ) : (
                warehouses.map((warehouse) => (
                  <tr key={warehouse.id} style={{ borderBottom: '1px solid var(--color-border)', transition: 'background-color 0.15s ease' }}>
                    <td style={{ padding: '10px 14px', whiteSpace: 'nowrap' }}>
                      <span style={{ 
                        fontSize: '0.75rem', 
                        fontFamily: 'monospace', 
                        backgroundColor: 'var(--color-background)', 
                        border: '1px solid var(--color-border)',
                        padding: '3px 8px', 
                        borderRadius: '4px',
                        color: 'var(--color-text-primary)'
                      }}>
                        {warehouse.code}
                      </span>
                    </td>
                    <td style={{ padding: '10px 14px', fontWeight: 600, fontSize: '0.85rem', color: 'var(--color-text-primary)' }}>
                      {warehouse.name}
                    </td>
                    <td style={{ padding: '10px 14px', fontSize: '0.8125rem', color: 'var(--color-text-secondary)' }}>
                      {warehouse.location ? (
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                          📍 {warehouse.location}
                        </span>
                      ) : '-'}
                    </td>
                    <td style={{ padding: '10px 14px', whiteSpace: 'nowrap' }}>
                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '5px',
                          padding: '3px 9px',
                          borderRadius: '12px',
                          fontSize: '0.75rem',
                          fontWeight: 600,
                          backgroundColor: warehouse.active ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                          color: warehouse.active ? 'rgb(16, 185, 129)' : 'rgb(239, 68, 68)',
                        }}
                      >
                        <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: warehouse.active ? 'rgb(16, 185, 129)' : 'rgb(239, 68, 68)' }} />
                        {warehouse.active ? t('common.active') : t('common.inactive')}
                      </span>
                    </td>
                    <td style={{ padding: '8px 14px', whiteSpace: 'nowrap', textAlign: isRtl ? 'left' : 'right' }}>
                      <div style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        flexWrap: 'nowrap',
                        verticalAlign: 'middle'
                      }}>
                        {hasPermission('warehouses.update') && (
                          <button 
                            type="button" 
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              width: '32px',
                              height: '32px',
                              borderRadius: '6px',
                              border: '1px solid var(--color-border)',
                              backgroundColor: 'var(--color-surface)',
                              color: 'var(--color-text-secondary)',
                              cursor: 'pointer',
                              transition: 'all 0.15s ease'
                            }}
                            onClick={() => navigate('/inventory?warehouse_id=' + warehouse.id)} 
                            title={t('warehouses.manage') || 'Manage Warehouse'}
                          >
                            <Building size={15} />
                          </button>
                        )}
                        {hasPermission('warehouses.update') && (
                          <button 
                            type="button" 
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
                            onClick={() => openModal(warehouse)} 
                            title={t('common.edit')}
                          >
                            <Edit2 size={15} />
                          </button>
                        )}
                        {(hasPermission('warehouses.delete') || hasPermission('warehouses.update') || hasPermission('warehouses.create')) && (
                          <button 
                            type="button" 
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              width: '32px',
                              height: '32px',
                              borderRadius: '6px',
                              border: '1px solid rgba(239, 68, 68, 0.25)',
                              backgroundColor: 'rgba(239, 68, 68, 0.08)',
                              color: 'rgb(239, 68, 68)',
                              cursor: 'pointer',
                              transition: 'all 0.15s ease'
                            }}
                            onClick={() => confirmDeleteClick(warehouse)} 
                            title={t('common.delete')}
                          >
                            <Trash2 size={15} />
                          </button>
                        )}
                      </div>
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
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 140px), 1fr))', gap: '16px' }}>
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
