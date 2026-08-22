import React, { useEffect, useState } from 'react';
import { useTranslation } from '../../contexts/LanguageContext';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { Plus, Edit2, Trash2, Search, MapPin, X, Users, CheckCircle } from 'lucide-react';
import { useDebounce } from '../../hooks/useDebounce';

const CustomersList = () => {
  const { t, language } = useTranslation();
  const { hasPermission } = useAuth();
  const [customers, setCustomers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearchTerm = useDebounce(searchTerm, 300);

  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingLocationId, setEditingLocationId] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [deleteCustomerTarget, setDeleteCustomerTarget] = useState<any | null>(null);
  const [deleteErrorMsg, setDeleteErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const [formData, setFormData] = useState({
    name: '',
    mobile: '',
    payment_type: 'Cash',
    contact_person: '',
    region: '',
    credit_limit: '0',
    payment_terms_days: '0',
  });

  const [locationData, setLocationData] = useState({
    location_name: 'Main Location',
    address: '',
    google_maps_url: '',
    latitude: '',
    longitude: '',
  });

  useEffect(() => {
    fetchCustomers();
  }, [debouncedSearchTerm]);

  const fetchCustomers = async (showLoader = true) => {
    try {
      setFetchError(null);
      if (showLoader) setLoading(true);
      
      let query = supabase
        .from('customers')
        .select(`
          id, name, mobile, address, payment_type, active,
            customer_locations(id, address, google_maps_url, latitude, longitude)
        `)
        .order('created_at', { ascending: false });

      if (debouncedSearchTerm) {
        query = query.or(`name.ilike.%${debouncedSearchTerm}%,mobile.ilike.%${debouncedSearchTerm}%`);
      }

      const { data, error } = await query;

      if (error) throw error;
      setCustomers(data || []);
    } catch (error: any) {
      console.error('Error fetching customers:', error);
      setFetchError(`Failed to load customers: ${error.message || JSON.stringify(error)}`);
    } finally {
      if (showLoader) setLoading(false);
    }
  };

  
  
  
  
  
  const confirmDeleteClick = (customer: any) => {
    setDeleteConfirmId(customer.id);
    setDeleteCustomerTarget(customer);
    setDeleteErrorMsg('');
  };

  const executeDelete = async () => {
    if (!deleteConfirmId) return;
    const id = deleteConfirmId;
    const customerName = deleteCustomerTarget?.name || '';
    setSaving(true);
    setDeleteErrorMsg('');
    try {
      // Check dependencies
      const { count: orderCount } = await supabase.from('orders').select('id', { count: 'exact', head: true }).eq('customer_id', id);
      
      if ((orderCount || 0) > 0) {
        throw new Error(language === 'ar' ? 'لا يمكن حذف العميل لوجود طلبات مرتبطة به.' : 'Cannot delete customer because they have linked orders.');
      }

      // Perform HARD DELETE
      const { error: deleteError } = await supabase.from('customers').delete().eq('id', id);
      if (deleteError) {
        throw deleteError;
      }
      
      setDeleteConfirmId(null);
      setDeleteCustomerTarget(null);
      setSuccessMsg(language === 'ar' ? `تم حذف العميل "${customerName}" بنجاح.` : `Customer "${customerName}" was deleted successfully.`);
      fetchCustomers(false);
    } catch(e: any) {
       setDeleteErrorMsg(e.message || (language === 'ar' ? 'حدث خطأ أثناء حذف العميل.' : 'Error deleting customer.'));
    } finally {
      setSaving(false);
    }
  };

  const extractCoordsFromUrl = (url: string) => {
    const regex = /@(-?\d+\.\d+),(-?\d+\.\d+)/;
    const match = url.match(regex);
    if (match) {
      setLocationData(prev => ({ ...prev, latitude: match[1], longitude: match[2] }));
    }
  };

  const handleUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const url = e.target.value;
    setLocationData({ ...locationData, google_maps_url: url });
    extractCoordsFromUrl(url);
  };

  const openModal = (customer?: any) => {
     console.log('EDIT CUSTOMER DATA:', customer);

  setFormError('');
    setFormError('');
    if (customer) {
      setEditingId(customer.id);
      setFormData({
        name: customer.name,
        mobile: customer.mobile || '',
        payment_type: customer.payment_type || 'cash',
        contact_person: customer.contact_person || '',
        region: customer.region || '',
        credit_limit: customer.credit_limit ? customer.credit_limit.toString() : '0',
        payment_terms_days: customer.payment_terms_days ? customer.payment_terms_days.toString() : '0',
      });
      
      const loc = customer.customer_locations && customer.customer_locations.length > 0 ? customer.customer_locations[0] : null;
      if (loc) {
        setEditingLocationId(loc.id);
        setLocationData({
          location_name: loc.location_name || 'Main Location',
          address: loc.address || customer.address || '',
          google_maps_url: loc.google_maps_url || '',
          latitude: loc.latitude ? loc.latitude.toString() : '',
          longitude: loc.longitude ? loc.longitude.toString() : '',
        });
      } else {
        setEditingLocationId(null);
        setLocationData({
          location_name: 'Main Location',
          address: customer.address || '',
          google_maps_url: '',
          latitude: '',
          longitude: '',
        });
      }
    } else {
      setEditingId(null);
      setEditingLocationId(null);
      setFormData({
        name: '',
        mobile: '',
        payment_type: 'Cash',
        contact_person: '',
        region: '',
        credit_limit: '0',
        payment_terms_days: '0',
      });
      setLocationData({
        location_name: 'Main Location',
        address: '',
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
      const payload = {
        ...formData,
        credit_limit: parseFloat(formData.credit_limit || '0'),
        payment_terms_days: parseInt(formData.payment_terms_days || '0', 10),
      };

      let currentCustomerId = editingId;

      if (editingId) {
        const { error } = await supabase
          .from('customers')
          .update(payload)
          .eq('id', editingId);
        if (error) throw error;
      } else {
        const { data, error } = await supabase.from('customers').insert([payload]).select().single();
        if (error) throw error;
        currentCustomerId = data.id;
      }

      if (currentCustomerId) {
        const locPayload = {
          customer_id: currentCustomerId,
          location_name: locationData.location_name,
          address: locationData.address,
          google_maps_url: locationData.google_maps_url,
          latitude: locationData.latitude ? parseFloat(locationData.latitude) : null,
          longitude: locationData.longitude ? parseFloat(locationData.longitude) : null,
        };

        if (editingLocationId) {
           const { error: locError } = await supabase.from('customer_locations').update(locPayload).eq('id', editingLocationId);
           if (locError) console.error("Error updating location", locError);
        } else {
           const { error: locError } = await supabase.from('customer_locations').insert([locPayload]);
           if (locError) {
  console.error('LOCATION INSERT ERROR:', locError);
  throw locError;
}
        }
      }

      await fetchCustomers(false);
      closeModal();
    } catch (error: any) {
      console.error('Error saving customer:', error);
      setFormError(error?.message || 'Failed to save customer.');
    } finally {
      setSaving(false);
    }
  };

  

  return (
    <div className="card">
      <div className="card-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <Users size={28} color="var(--color-primary)" />
          <div>
            <h2 style={{ fontSize: '1.25rem', marginBottom: '4px' }}>{t('customers.title')}</h2>
            <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.875rem' }}>{t('customers.subtitle')}</p>
          </div>
        </div>
        {hasPermission('customers.create') && (
          <button className="btn btn-primary" onClick={() => openModal()} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Plus size={18} />
            {t('customers.newCustomer')}
          </button>
        )}
      </div>
      
      <div className="card-body" style={{ padding: 0 }}>
        <div style={{ padding: 'var(--spacing-4)', borderBottom: '1px solid var(--color-border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', backgroundColor: 'var(--color-background)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', padding: '4px 12px', width: '300px' }}>
            <Search size={16} color="var(--color-text-muted)" />
            <input 
              type="text" 
              placeholder={t('customers.search')} 
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

        {successMsg && (
          <div style={{ padding: '12px 16px', margin: '16px', backgroundColor: 'rgba(16, 185, 129, 0.1)', color: 'var(--color-success)', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-success)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span>{successMsg}</span>
            <button style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-success)' }} onClick={() => setSuccessMsg('')}>
              <X size={16} />
            </button>
          </div>
        )}

        <div className="table-responsive">
          <table className="table">
            <thead>
              <tr>
                <th>{t('customers.name')}</th>
                <th>{t('customers.mobile')}</th>
                <th>{t('customers.paymentType')}</th>
                <th>{language === 'ar' ? 'العنوان' : 'Address'}</th>
                <th>{language === 'ar' ? 'الموقع' : 'Location'}</th>
                <th>{t('common.status')}</th>
                <th style={{ textAlign: 'right' }}>{t('common.actions')}</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: 'var(--spacing-8)' }}>{t('common.loading')}</td>
                </tr>
              ) : customers.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: 'var(--spacing-8)', color: 'var(--color-text-muted)' }}>
                    {t('customers.noCustomers')}
                  </td>
                </tr>
              ) : (
                customers.map((customer) => (
                  <tr key={customer.id}>
                    <td style={{ fontWeight: 500 }}>{customer.name}</td>
                    <td>{customer.mobile || '-'}</td>
                    <td>
                      <span className={`badge ${
                        customer.payment_type === 'cash' ? 'badge-success' :
                        customer.payment_type === 'credit' ? 'badge-warning' :
                        'badge-neutral'
                      }`}>
                        {customer.payment_type === 'cash' ? t('customers.cash') :
                         customer.payment_type === 'credit' ? t('customers.credit') :
                         customer.payment_type === 'partial' ? t('customers.partial') :
                         customer.payment_type === 'card' ? t('customers.card') :
                         customer.payment_type === 'bank_transfer' ? t('customers.bank_transfer') :
                         customer.payment_type === 'wallet' ? t('customers.wallet') :
                         customer.payment_type}
                      </span>
                    </td>
                    <td>
                        {(() => {
                           const loc = customer.customer_locations && customer.customer_locations.length > 0 ? customer.customer_locations[0] : null;
                           const textAddress = loc?.address || customer.address;
                           return <span style={{ fontSize: '0.875rem' }}>{textAddress ? textAddress : (language === 'ar' ? 'غير محدد' : 'Not set')}</span>;
                        })()}
                      </td>
                      <td>
                        {(() => {
                            const loc = customer.customer_locations && customer.customer_locations.length > 0 ? customer.customer_locations[0] : null;
                            let mapsUrl = '';
                            if (loc) {
                              if (loc.google_maps_url) {
                                mapsUrl = loc.google_maps_url;
                              } else if (loc.latitude && loc.longitude) {
                                mapsUrl = `https://www.google.com/maps/search/?api=1&query=${loc.latitude},${loc.longitude}`;
                              }
                            }
                            
                            return mapsUrl ? (
                              <a href={mapsUrl} target="_blank" rel="noopener noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: 'var(--color-primary)', textDecoration: 'none', fontWeight: 500, fontSize: '0.875rem' }}>
                                📌 {language === 'ar' ? 'فتح الموقع' : 'Open Location'}
                              </a>
                            ) : (
                              <span style={{ color: 'var(--color-text-secondary)', fontSize: '0.875rem' }}>
                                📌 {language === 'ar' ? 'الموقع غير مدد' : 'Location not set'}
                              </span>
                            );
                        })()}
                      </td>
                    <td>
                      <span className={`badge ${customer.active ? 'badge-success' : 'badge-neutral'}`}>
                        {customer.active ? t('common.active') : t('common.inactive')}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      {hasPermission('customers.update') && (
                        <button className="btn btn-secondary" style={{ padding: '6px', marginRight: '4px' }} onClick={() => openModal(customer)}>
                          <Edit2 size={16} />
                        </button>
                      )}
                      {(hasPermission('customers.delete') || hasPermission('customers.update')) && (
                        <button className="btn btn-danger" style={{ padding: '6px', marginRight: '4px' }} onClick={() => confirmDeleteClick(customer)} title={t('common.delete')}>
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

      
        {/* Delete Confirmation Modal */}
        {deleteConfirmId && (
          <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }}>
            <div className="card" style={{ width: '100%', maxWidth: '400px', backgroundColor: 'var(--color-surface)', borderRadius: 'var(--radius-lg)' }}>
              <div className="card-header" style={{ padding: '16px 20px', borderBottom: '1px solid var(--color-border)' }}>
                <h3 style={{ margin: 0, fontSize: '1.2rem', color: 'var(--color-text-primary)' }}>{language === 'ar' ? 'تأكيد الحذف' : 'Confirm Delete'}</h3>
              </div>
              <div className="card-body" style={{ padding: '20px' }}>
                <p style={{ margin: '0 0 16px 0', fontSize: '1rem', color: 'var(--color-text-secondary)' }}>
                  {language === 'ar' 
                    ? `هل أنت متأكد من حذف العميل "${deleteCustomerTarget?.name || ''}" نهائيًا؟`
                    : `Are you sure you want to permanently delete customer "${deleteCustomerTarget?.name || ''}"?`}
                </p>
                {deleteErrorMsg && (
                  <div style={{ padding: '12px', backgroundColor: 'rgba(239, 68, 68, 0.1)', color: 'rgb(239, 68, 68)', borderRadius: 'var(--radius-md)', marginBottom: '16px', fontSize: '0.875rem' }}>
                    {deleteErrorMsg}
                  </div>
                )}
              </div>
              <div className="card-footer" style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', padding: '16px', borderTop: '1px solid var(--color-border)' }}>
                <button type="button" className="btn btn-secondary" onClick={() => { setDeleteConfirmId(null); setDeleteCustomerTarget(null); }} disabled={saving}>{language === 'ar' ? 'إلغاء' : 'Cancel'}</button>
                <button type="button" className="btn btn-danger" onClick={executeDelete} disabled={saving}>{saving ? t('common.loading') : (language === 'ar' ? 'حذف' : 'Delete')}</button>
              </div>
            </div>
          </div>
        )}

        {showModal && (

        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0, 0, 0, 0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '16px' }} onMouseDown={(e) => { if (e.target === e.currentTarget) closeModal(); }}>
          <div className="card" style={{ width: '100%', maxWidth: '550px', maxHeight: '90vh', overflowY: 'auto', margin: 0, display: 'flex', flexDirection: 'column' }}>
            <div className="card-header" style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--color-border)' }}>
              <div>
                <h2 style={{ fontSize: '1.125rem', margin: 0 }}>
                  {editingId ? t('common.edit') : t('customers.newCustomer')}
                </h2>
              </div>
              <button type="button" onClick={closeModal} className="btn btn-secondary" style={{ padding: '4px' }}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column' }}>
              <div className="card-body" style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {formError && (
                  <div style={{ padding: '8px 12px', backgroundColor: 'var(--color-danger-light)', color: 'var(--color-danger)', borderRadius: 'var(--radius-md)', fontSize: '0.875rem' }}>
                    {formError}
                  </div>
                )}
                
                {/* Basic Details Section */}
                <div>
                  <h3 style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--color-text-secondary)', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Customer Details</h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <div>
                      <label className="form-label" style={{ fontSize: '0.75rem', marginBottom: '4px' }}>{t('customers.name')} *</label>
                      <input type="text" className="form-input" style={{ padding: '6px 8px', fontSize: '0.875rem' }} value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} required />
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                      <div>
                        <label className="form-label" style={{ fontSize: '0.75rem', marginBottom: '4px' }}>{t('customers.mobile')}</label>
                        <input type="text" className="form-input" style={{ padding: '6px 8px', fontSize: '0.875rem' }} value={formData.mobile} onChange={(e) => setFormData({ ...formData, mobile: e.target.value })} />
                      </div>
                      <div>
                        <label className="form-label" style={{ fontSize: '0.75rem', marginBottom: '4px' }}>{t('customers.paymentType')}</label>
                        <select className="form-input" style={{ padding: '6px 8px', fontSize: '0.875rem' }} value={formData.payment_type} onChange={(e) => setFormData({ ...formData, payment_type: e.target.value })}>
                          <option value="Cash">{t('customers.cash')}</option>
                          <option value="Credit">{t('customers.credit')}</option>
                          <option value="Partial">{t('customers.partial')}</option>
                          <option value="Card">{t('customers.card')}</option>
                          <option value="Bank Transfer">{t('customers.bank_transfer')}</option>
                          <option value="Wallet">{t('customers.wallet')}</option>
                        </select>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Location Section */}
                <div>
                  <h3 style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--color-text-secondary)', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '0.05em', borderTop: '1px solid var(--color-border)', paddingTop: '16px' }}>Location Details</h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <div>
                      <label className="form-label" style={{ fontSize: '0.75rem', marginBottom: '4px' }}>Address / Location Name</label>
                      <input type="text" className="form-input" style={{ padding: '6px 8px', fontSize: '0.875rem' }} placeholder="e.g. Main Office, Riyadh" value={locationData.address} onChange={(e) => setLocationData({ ...locationData, address: e.target.value })} />
                    </div>
                    <div>
                      <label className="form-label" style={{ fontSize: '0.75rem', marginBottom: '4px' }}>Google Maps URL</label>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <input type="url" className="form-input" style={{ padding: '6px 8px', fontSize: '0.875rem' }} placeholder="https://maps.google.com/?q=..." value={locationData.google_maps_url} onChange={handleUrlChange} />
                      </div>
                    </div>
                  </div>
                </div>

              </div>
              <div className="card-footer" style={{ padding: '12px 16px', display: 'flex', justifyContent: 'flex-end', gap: '8px', borderTop: '1px solid var(--color-border)' }}>
                <button type="button" className="btn btn-secondary" style={{ padding: '6px 12px', fontSize: '0.875rem' }} onClick={closeModal} disabled={saving}>{t('common.cancel')}</button>
                <button type="submit" className="btn btn-primary" style={{ padding: '6px 12px', fontSize: '0.875rem' }} disabled={saving}>{saving ? t('common.loading') : t('common.save')}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default CustomersList;
