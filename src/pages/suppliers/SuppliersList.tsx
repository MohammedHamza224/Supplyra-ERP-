import React, { useEffect, useState } from 'react';
import { useTranslation } from '../../contexts/LanguageContext';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { Plus, Edit2, Trash2, Search, X, Truck } from 'lucide-react';
import { useDebounce } from '../../hooks/useDebounce';
import SupplierProducts from './SupplierProducts';

const SuppliersList = () => {
  const { t, language } = useTranslation();
  const isRtl = language === 'ar';
  const { hasPermission } = useAuth();
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearchTerm = useDebounce(searchTerm, 300);

  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [deleteErrorMsg, setDeleteErrorMsg] = useState('');

  const [formData, setFormData] = useState({
    name: '',
    contact_person: '',
    phone: '',
    email: '',
    address: '',
    tax_number: '',
    notes: '',
    google_maps_url: '',
    latitude: '',
    longitude: '',
  });

  useEffect(() => {
    fetchSuppliers();
  }, [debouncedSearchTerm]);

  const fetchSuppliers = async () => {
    try {
      setFetchError(null);
      setLoading(true);
      
      let query = supabase
        .from('suppliers')
        .select('*')
        .order('name');

      if (debouncedSearchTerm) {
        query = query.or(`name.ilike.%${debouncedSearchTerm}%,contact_person.ilike.%${debouncedSearchTerm}%,phone.ilike.%${debouncedSearchTerm}%,email.ilike.%${debouncedSearchTerm}%`);
      }

      const { data, error } = await query;

      if (error) throw error;
      setSuppliers(data || []);
    } catch (error: any) {
      console.error('Error fetching suppliers:', error);
      setFetchError(`Failed to load suppliers: ${error.message || JSON.stringify(error)}`);
    } finally {
      setLoading(false);
    }
  };

  const extractMapsUrl = (supplier: any): string => {
    if (!supplier) return '';
    if (supplier.google_maps_url) return supplier.google_maps_url;
    if (supplier.location_url) return supplier.location_url;
    if (supplier.maps_url) return supplier.maps_url;
    if (supplier.latitude && supplier.longitude) {
      return `https://www.google.com/maps/search/?api=1&query=${supplier.latitude},${supplier.longitude}`;
    }
    if (supplier.notes && typeof supplier.notes === 'string') {
      const match = supplier.notes.match(/\[MAPS:(.*?)\]/);
      if (match && match[1]) return match[1];
    }
    return '';
  };

  const cleanNotes = (notes: string | null | undefined): string => {
    if (!notes) return '';
    return notes.replace(/\[MAPS:.*?\]\n?/, '').trim();
  };

  const packNotesWithMapsUrl = (rawNotes: string | null | undefined, mapsUrl: string | null | undefined): string | null => {
    const baseNotes = cleanNotes(rawNotes);
    if (mapsUrl && mapsUrl.trim()) {
      return `[MAPS:${mapsUrl.trim()}]${baseNotes ? '\n' + baseNotes : ''}`;
    }
    return baseNotes || null;
  };

  const extractCoordsFromUrl = (url: string) => {
    const regex = /@(-?\d+\.\d+),(-?\d+\.\d+)/;
    const match = url.match(regex);
    if (match) {
      setFormData(prev => ({ ...prev, latitude: match[1], longitude: match[2] }));
    }
  };

  const handleUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const url = e.target.value;
    setFormData({ ...formData, google_maps_url: url });
    extractCoordsFromUrl(url);
  };

  const openModal = (supplier?: any) => {
    setFormError('');
    if (supplier) {
      setEditingId(supplier.id);
      setFormData({
        name: supplier.name || '',
        contact_person: supplier.contact_person || '',
        phone: supplier.phone || '',
        email: supplier.email || '',
        address: supplier.address || supplier.location || '',
        tax_number: supplier.tax_number || '',
        notes: cleanNotes(supplier.notes),
        google_maps_url: extractMapsUrl(supplier),
        latitude: supplier.latitude ? supplier.latitude.toString() : '',
        longitude: supplier.longitude ? supplier.longitude.toString() : '',
      });
    } else {
      setEditingId(null);
      setFormData({
        name: '',
        contact_person: '',
        phone: '',
        email: '',
        address: '',
        tax_number: '',
        notes: '',
        google_maps_url: '',
        latitude: '',
        longitude: '',
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
      const payload: any = {
        name: formData.name,
        contact_person: formData.contact_person || null,
        phone: formData.phone || null,
        email: formData.email || null,
        address: formData.address || null,
        tax_number: formData.tax_number || null,
        notes: formData.notes || null,
        google_maps_url: formData.google_maps_url || null,
        latitude: formData.latitude ? parseFloat(formData.latitude) : null,
        longitude: formData.longitude ? parseFloat(formData.longitude) : null,
      };

      if (editingId) {
        const { error } = await supabase
          .from('suppliers')
          .update(payload)
          .eq('id', editingId);

        if (error) {
          if (error.message && (error.message.includes('column') || error.code === 'PGRST204')) {
            // If google_maps_url column is not present, safely package it into notes so it persists in Supabase
            const fallbackNotes = packNotesWithMapsUrl(formData.notes, formData.google_maps_url);
            const safePayload = {
              name: formData.name,
              contact_person: formData.contact_person || null,
              phone: formData.phone || null,
              email: formData.email || null,
              address: formData.address || null,
              tax_number: formData.tax_number || null,
              notes: fallbackNotes
            };
            const { error: err2 } = await supabase.from('suppliers').update(safePayload).eq('id', editingId);
            if (err2) throw err2;
          } else {
            throw error;
          }
        }
      } else {
        const { error } = await supabase.from('suppliers').insert([payload]);
        if (error) {
          if (error.message && (error.message.includes('column') || error.code === 'PGRST204')) {
            // If google_maps_url column is not present, safely package it into notes so it persists in Supabase
            const fallbackNotes = packNotesWithMapsUrl(formData.notes, formData.google_maps_url);
            const safePayload = {
              name: formData.name,
              contact_person: formData.contact_person || null,
              phone: formData.phone || null,
              email: formData.email || null,
              address: formData.address || null,
              tax_number: formData.tax_number || null,
              notes: fallbackNotes
            };
            const { error: err2 } = await supabase.from('suppliers').insert([safePayload]);
            if (err2) throw err2;
          } else {
            throw error;
          }
        }
      }

      await fetchSuppliers();
      closeModal();
    } catch (error: any) {
      console.error('Error saving supplier:', error);
      setFormError(error?.message || 'Failed to save supplier.');
    } finally {
      setSaving(false);
    }
  };

  const confirmDeleteClick = (id: string) => {
    setDeleteConfirmId(id);
    setDeleteErrorMsg('');
  };

  const executeDelete = async () => {
    if (!deleteConfirmId) return;
    const id = deleteConfirmId;
    setSaving(true);
    setDeleteErrorMsg('');
    try {
      const [prodRes, purRes] = await Promise.all([
        supabase.from('product_suppliers').select('id', { count: 'exact', head: true }).eq('supplier_id', id),
        supabase.from('purchases').select('id', { count: 'exact', head: true }).eq('supplier_id', id)
      ]);
      
      const hasDependencies = (prodRes.count || 0) > 0 || (purRes.count || 0) > 0;
      
      if (hasDependencies) {
        throw new Error(language === 'ar' ? 'لا يمكن حذف المورد لوجود سجلات مرتبطة به.' : 'Cannot delete supplier because it has linked records.');
      }
      
      const { error } = await supabase.from('suppliers').delete().eq('id', id);
      if (error) throw error;
      
      setDeleteConfirmId(null);
      await fetchSuppliers();
    } catch(e: any) {
      setDeleteErrorMsg(e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="card">
      <div className="card-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <Truck size={28} color="var(--color-primary)" />
          <div>
            <h2 style={{ fontSize: '1.25rem', marginBottom: '4px' }}>{t('suppliers.title')}</h2>
            <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.875rem' }}>{t('suppliers.subtitle')}</p>
          </div>
        </div>
        
        {hasPermission('suppliers.create') && (
          <button className="btn btn-primary" onClick={() => openModal()} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Plus size={18} />
            {t('suppliers.newSupplier')}
          </button>
        )}
      </div>
      
      <div className="card-body" style={{ padding: 0 }}>
        <div style={{ padding: 'var(--spacing-4)', borderBottom: '1px solid var(--color-border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', backgroundColor: 'var(--color-background)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', padding: '4px 12px', width: '100%', maxWidth: '300px' }}>
            <Search size={16} color="var(--color-text-muted)" />
            <input 
              type="text" 
              placeholder={t('suppliers.search')} 
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
          <table className="table" style={{ width: '100%', minWidth: '950px', borderCollapse: 'collapse', margin: 0, textAlign: isRtl ? 'right' : 'left' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid var(--color-border)', backgroundColor: 'var(--color-background)', textAlign: isRtl ? 'right' : 'left' }}>
                <th style={{ padding: '10px 14px', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--color-text-secondary)', whiteSpace: 'nowrap' }}>{t('suppliers.name')}</th>
                <th style={{ padding: '10px 14px', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--color-text-secondary)', whiteSpace: 'nowrap' }}>{t('suppliers.contact')}</th>
                <th style={{ padding: '10px 14px', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--color-text-secondary)', whiteSpace: 'nowrap' }}>{t('suppliers.phone')}</th>
                <th style={{ padding: '10px 14px', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--color-text-secondary)', whiteSpace: 'nowrap' }}>{t('suppliers.email')}</th>
                <th style={{ padding: '10px 14px', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--color-text-secondary)' }}>{language === 'ar' ? 'العنوان' : 'Address'}</th>
                <th style={{ padding: '10px 14px', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--color-text-secondary)', whiteSpace: 'nowrap' }}>{language === 'ar' ? 'الموقع' : 'Location'}</th>
                <th style={{ padding: '10px 14px', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--color-text-secondary)', whiteSpace: 'nowrap' }}>{t('common.status')}</th>
                <th style={{ padding: '10px 14px', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--color-text-secondary)', whiteSpace: 'nowrap', textAlign: isRtl ? 'left' : 'right' }}>{t('common.actions')}</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={8} style={{ textAlign: 'center', padding: '28px', color: 'var(--color-text-secondary)', fontSize: '0.875rem' }}>{t('common.loading')}</td>
                </tr>
              ) : suppliers.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ textAlign: 'center', padding: '28px', color: 'var(--color-text-secondary)', fontSize: '0.875rem' }}>
                    {t('common.noData')}
                  </td>
                </tr>
              ) : (
                suppliers.map((supplier) => (
                  <tr key={supplier.id} style={{ borderBottom: '1px solid var(--color-border)', transition: 'background-color 0.15s ease' }}>
                    <td style={{ padding: '10px 14px', fontWeight: 600, fontSize: '0.85rem', color: 'var(--color-text-primary)' }}>
                      {supplier.name}
                    </td>
                    <td style={{ padding: '10px 14px', fontSize: '0.8125rem', color: 'var(--color-text-secondary)', whiteSpace: 'nowrap' }}>
                      {supplier.contact_person || '-'}
                    </td>
                    <td style={{ padding: '10px 14px', whiteSpace: 'nowrap' }}>
                      <span style={{ fontSize: '0.8125rem', fontFamily: 'monospace', color: 'var(--color-text-secondary)' }}>
                        {supplier.phone || '-'}
                      </span>
                    </td>
                    <td style={{ padding: '10px 14px', fontSize: '0.8125rem', color: 'var(--color-text-secondary)' }}>
                      {supplier.email || '-'}
                    </td>
                    <td style={{ padding: '10px 14px', fontSize: '0.8125rem', color: 'var(--color-text-secondary)' }}>
                      {(supplier.address || supplier.location) ? (supplier.address || supplier.location) : (language === 'ar' ? 'غير محدد' : 'Not set')}
                    </td>
                    <td style={{ padding: '10px 14px', whiteSpace: 'nowrap' }}>
                      {(() => {
                        const mapsUrl = extractMapsUrl(supplier);
                        return mapsUrl ? (
                          <a 
                            href={mapsUrl} 
                            target="_blank" 
                            rel="noopener noreferrer" 
                            style={{ 
                              display: 'inline-flex', 
                              alignItems: 'center', 
                              gap: '4px', 
                              color: 'var(--color-primary)', 
                              textDecoration: 'none', 
                              fontWeight: 600, 
                              fontSize: '0.75rem',
                              padding: '2px 8px',
                              borderRadius: '4px',
                              backgroundColor: 'rgba(59, 130, 246, 0.08)',
                              border: '1px solid rgba(59, 130, 246, 0.2)'
                            }}
                          >
                            📍 {language === 'ar' ? 'الموقع' : 'Location'}
                          </a>
                        ) : (
                          <span style={{ color: 'var(--color-text-muted)', fontSize: '0.75rem' }}>
                            -
                          </span>
                        );
                      })()}
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
                          backgroundColor: supplier.active ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                          color: supplier.active ? 'rgb(16, 185, 129)' : 'rgb(239, 68, 68)',
                        }}
                      >
                        <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: supplier.active ? 'rgb(16, 185, 129)' : 'rgb(239, 68, 68)' }} />
                        {supplier.active ? t('common.active') : t('common.inactive')}
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
                        {hasPermission('suppliers.update') && (
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
                            onClick={() => openModal(supplier)}
                            title={t('common.edit')}
                          >
                            <Edit2 size={15} />
                          </button>
                        )}
                        {hasPermission('suppliers.deactivate') && (
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
                            onClick={() => confirmDeleteClick(supplier.id)} 
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

      {/* Delete Confirmation Modal */}
      {deleteConfirmId && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }}>
          <div className="card" style={{ width: '100%', maxWidth: '400px', backgroundColor: 'var(--color-surface)', borderRadius: 'var(--radius-lg)' }}>
            <div className="card-header" style={{ padding: '16px 20px', borderBottom: '1px solid var(--color-border)' }}>
              <h3 style={{ margin: 0, fontSize: '1.2rem', color: 'var(--color-text-primary)' }}>{language === 'ar' ? 'تأكيد الحذف' : 'Confirm Delete'}</h3>
            </div>
            <div className="card-body" style={{ padding: '20px' }}>
              <p style={{ margin: '0 0 16px 0', fontSize: '1rem', color: 'var(--color-text-secondary)' }}>
                {language === 'ar' ? 'هل أنت متأكد من حذف هذا المورد نهائيًا؟' : 'Are you sure you want to permanently delete this supplier?'}
              </p>
              {deleteErrorMsg && (
                <div style={{ padding: '12px', backgroundColor: 'rgba(239, 68, 68, 0.1)', color: 'rgb(239, 68, 68)', borderRadius: 'var(--radius-md)', marginBottom: '16px', fontSize: '0.875rem' }}>
                  {deleteErrorMsg}
                </div>
              )}
            </div>
            <div className="card-footer" style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', padding: '16px', borderTop: '1px solid var(--color-border)' }}>
              <button type="button" className="btn btn-secondary" onClick={() => setDeleteConfirmId(null)} disabled={saving}>
                {language === 'ar' ? 'إلغاء' : 'Cancel'}
              </button>
              <button type="button" className="btn btn-danger" onClick={executeDelete} disabled={saving}>
                {saving ? t('common.loading') : (language === 'ar' ? 'حذف' : 'Delete')}
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Compact Add/Edit Supplier Modal */}
      {showModal && (
        <div 
          style={{ 
            position: 'fixed', 
            inset: 0, 
            backgroundColor: 'rgba(0, 0, 0, 0.55)', 
            display: 'flex', 
            alignItems: 'flex-start', 
            justifyContent: 'center', 
            zIndex: 1000, 
            padding: '24px 16px',
            overflowY: 'auto'
          }} 
          onMouseDown={(e) => { if (e.target === e.currentTarget) closeModal(); }}
        >
          <div 
            className="card" 
            style={{ 
              width: '100%', 
              maxWidth: '620px', 
              maxHeight: 'calc(100vh - 48px)', 
              margin: 'auto 0', 
              display: 'flex', 
              flexDirection: 'column',
              backgroundColor: 'var(--color-surface)',
              borderRadius: 'var(--radius-lg)',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2), 0 10px 10px -5px rgba(0, 0, 0, 0.1)',
              overflow: 'hidden'
            }}
          >
            <div className="card-header" style={{ padding: '12px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--color-border)', flexShrink: 0, backgroundColor: 'var(--color-surface)' }}>
              <div>
                <h2 style={{ fontSize: '1.05rem', margin: 0, fontWeight: 700 }}>
                  {editingId ? (language === 'ar' ? 'تعديل بيانات المورد' : 'Edit Supplier') : t('suppliers.newSupplier')}
                </h2>
              </div>
              <button type="button" onClick={closeModal} className="btn btn-secondary" style={{ padding: '6px', minHeight: '32px', minWidth: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, overflow: 'hidden' }}>
              <div className="card-body" style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '14px', overflowY: 'auto', flex: 1 }}>
                {formError && (
                  <div style={{ padding: '10px 14px', backgroundColor: 'var(--color-danger-light)', color: 'var(--color-danger)', borderRadius: 'var(--radius-md)', fontSize: '0.875rem' }}>
                    {formError}
                  </div>
                )}
                
                {/* Supplier Details Section */}
                <div>
                  <h3 style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--color-text-secondary)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    {language === 'ar' ? 'تفاصيل المورد' : 'Supplier Details'}
                  </h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '10px' }}>
                      <div>
                        <label className="form-label" style={{ fontSize: '0.75rem', marginBottom: '3px' }}>{t('suppliers.name')} *</label>
                        <input type="text" className="form-input" style={{ padding: '5px 8px', fontSize: '0.875rem' }} value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} required />
                      </div>
                      <div>
                        <label className="form-label" style={{ fontSize: '0.75rem', marginBottom: '3px' }}>{t('suppliers.contact')}</label>
                        <input type="text" className="form-input" style={{ padding: '5px 8px', fontSize: '0.875rem' }} value={formData.contact_person} onChange={(e) => setFormData({ ...formData, contact_person: e.target.value })} />
                      </div>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '10px' }}>
                      <div>
                        <label className="form-label" style={{ fontSize: '0.75rem', marginBottom: '3px' }}>{t('suppliers.phone')}</label>
                        <input type="text" className="form-input" style={{ padding: '5px 8px', fontSize: '0.875rem' }} value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} />
                      </div>
                      <div>
                        <label className="form-label" style={{ fontSize: '0.75rem', marginBottom: '3px' }}>{t('suppliers.email')}</label>
                        <input type="email" className="form-input" style={{ padding: '5px 8px', fontSize: '0.875rem' }} value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} />
                      </div>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '10px' }}>
                      <div>
                        <label className="form-label" style={{ fontSize: '0.75rem', marginBottom: '3px' }}>{language === 'ar' ? 'الرقم الضريبي' : 'Tax Number'}</label>
                        <input type="text" className="form-input" style={{ padding: '5px 8px', fontSize: '0.875rem' }} value={formData.tax_number} onChange={(e) => setFormData({ ...formData, tax_number: e.target.value })} />
                      </div>
                      <div>
                        <label className="form-label" style={{ fontSize: '0.75rem', marginBottom: '3px' }}>{language === 'ar' ? 'ملاحظات' : 'Notes'}</label>
                        <input type="text" className="form-input" style={{ padding: '5px 8px', fontSize: '0.875rem' }} value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Location Section */}
                <div>
                  <h3 style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--color-text-secondary)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.05em', borderTop: '1px solid var(--color-border)', paddingTop: '10px' }}>
                    {language === 'ar' ? 'تفاصيل الموقع' : 'Location Details'}
                  </h3>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '10px' }}>
                    <div>
                      <label className="form-label" style={{ fontSize: '0.75rem', marginBottom: '3px' }}>
                        {language === 'ar' ? 'العنوان' : 'Address'}
                      </label>
                      <input type="text" className="form-input" style={{ padding: '5px 8px', fontSize: '0.875rem' }} placeholder="e.g. Main Office, Riyadh" value={formData.address} onChange={(e) => setFormData({ ...formData, address: e.target.value })} />
                    </div>
                    <div>
                      <label className="form-label" style={{ fontSize: '0.75rem', marginBottom: '3px' }}>
                        {language === 'ar' ? 'رابط خرائط جوجل' : 'Google Maps URL'}
                      </label>
                      <div style={{ display: 'flex', gap: '6px' }}>
                        <input type="url" className="form-input" style={{ padding: '5px 8px', fontSize: '0.875rem' }} placeholder="https://maps.google.com/?q=..." value={formData.google_maps_url} onChange={handleUrlChange} />
                      </div>
                    </div>
                  </div>
                </div>

                {editingId && (
                  <div style={{ marginTop: '12px', borderTop: '1px solid var(--color-border)', paddingTop: '12px' }}>
                    <SupplierProducts supplierId={editingId} />
                  </div>
                )}

              </div>
              <div className="card-footer" style={{ padding: '12px 18px', display: 'flex', justifyContent: 'flex-end', gap: '10px', borderTop: '1px solid var(--color-border)', flexShrink: 0, backgroundColor: 'var(--color-background)' }}>
                <button type="button" className="btn btn-secondary" style={{ padding: '6px 16px', fontSize: '0.875rem' }} onClick={closeModal} disabled={saving}>{t('common.cancel')}</button>
                <button type="submit" className="btn btn-primary" style={{ padding: '6px 18px', fontSize: '0.875rem', fontWeight: 600 }} disabled={saving}>{saving ? t('common.loading') : t('common.save')}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default SuppliersList;
