import React, { useState, useEffect } from 'react';
import { useTranslation } from '../../contexts/LanguageContext';
import { Plus, Search, Eye, Filter, Edit2, FileText, CheckCircle, XCircle, ShoppingBag, Trash2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import PurchaseForm from './PurchaseForm';
import PurchaseDetails from './PurchaseDetails';
import { useDebounce } from '../../hooks/useDebounce';

const PurchasesList = () => {
  const { t, language } = useTranslation();
  const isRtl = language === 'ar';
  const { hasPermission } = useAuth();
  
  const [purchases, setPurchases] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearchTerm = useDebounce(searchTerm, 300);
  
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [selectedPurchase, setSelectedPurchase] = useState<any>(null);

  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [deleteTargetPurchase, setDeleteTargetPurchase] = useState<any>(null);
  const [deleteErrorMsg, setDeleteErrorMsg] = useState('');
  const [deleting, setDeleting] = useState(false);

  const fetchPurchases = async () => {
    try {
      setLoading(true);
      
      let query = supabase
        .from('purchases')
        .select(`
          *,
          supplier:suppliers(name),
          warehouse:warehouses(name)
        `)
        .order('created_at', { ascending: false });

      if (debouncedSearchTerm) {
        query = query.or(`purchase_number.ilike.%${debouncedSearchTerm}%,invoice_number.ilike.%${debouncedSearchTerm}%`);
      }

      const { data, error: fetchError } = await query;
      
      if (fetchError) throw fetchError;
      setPurchases(data || []);
    } catch (err: any) {
      console.error('Error fetching purchases:', err);
      setError('Failed to load purchases.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPurchases();
  }, [debouncedSearchTerm]);

  const handleCreate = () => {
    setSelectedPurchase(null);
    setIsFormOpen(true);
  };

  const handleEdit = (purchase: any) => {
    setSelectedPurchase(purchase);
    setIsFormOpen(true);
  };

  const handleView = (purchase: any) => {
    setSelectedPurchase(purchase);
    setIsDetailsOpen(true);
  };

  const confirmDeleteClick = (purchase: any) => {
    setDeleteConfirmId(purchase.id);
    setDeleteTargetPurchase(purchase);
    setDeleteErrorMsg('');
  };

  const executeDelete = async () => {
    if (!deleteConfirmId) return;
    setDeleting(true);
    setDeleteErrorMsg('');
    try {
      const { error: delError } = await supabase.from('purchases').delete().eq('id', deleteConfirmId);
      if (delError) {
        const { error: updError } = await supabase.from('purchases').update({ status: 'CANCELLED' }).eq('id', deleteConfirmId);
        if (updError) throw delError;
      }
      setDeleteConfirmId(null);
      setDeleteTargetPurchase(null);
      fetchPurchases();
    } catch (e: any) {
      setDeleteErrorMsg(e.message || (language === 'ar' ? 'فشل حذف الفاتورة' : 'Failed to delete purchase invoice'));
    } finally {
      setDeleting(false);
    }
  };

  const getStatusStyle = (status: string) => {
    switch (status) {
      case 'DRAFT': return { bg: 'var(--color-surface-hover)', color: 'var(--color-text-secondary)' };
      case 'ORDERED': return { bg: 'rgba(59, 130, 246, 0.15)', color: '#1e40af' };
      case 'PARTIALLY_RECEIVED': return { bg: '#fef08a', color: '#854d0e' };
      case 'RECEIVED': return { bg: '#dcfce3', color: '#166534' };
      case 'CANCELLED': return { bg: 'rgba(239, 68, 68, 0.15)', color: '#991b1b' };
      default: return { bg: 'var(--color-surface-hover)', color: 'var(--color-text-secondary)' };
    }
  };

  return (
    <div className="page-container">
      <div className="card">
        <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <ShoppingBag size={28} color="var(--color-primary)" />
            <div>
              <h2 style={{ fontSize: '1.25rem', marginBottom: '4px', margin: 0 }}>
                {t('purchases.title')}
              </h2>
              <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.875rem', margin: 0 }}>
                {t('purchases.subtitle')}
              </p>
            </div>
          </div>
          {hasPermission('purchases.create') && (
            <button 
              className="btn btn-primary"
              onClick={handleCreate}
              type="button"
              style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
            >
              <Plus size={18} />
              {t('purchases.newPurchase')}
            </button>
          )}
        </div>

        <div className="card-body" style={{ padding: 0 }}>
          <div style={{ padding: 'var(--spacing-4)', borderBottom: '1px solid var(--color-border)' }}>
            <div style={{ display: 'flex', alignItems: 'center', backgroundColor: 'var(--color-background)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', padding: '4px 12px', width: '100%', maxWidth: '300px' }}>
              <Search size={16} color="var(--color-text-muted)" />
              <input 
                type="text" 
                placeholder={t('purchases.search')}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{ border: 'none', background: 'transparent', padding: '8px', width: '100%', outline: 'none', fontSize: '0.875rem' }}
              />
            </div>
          </div>

          {error && (
            <div style={{ padding: '16px', color: '#ef4444', backgroundColor: '#fef2f2', borderBottom: '1px solid #fecaca' }}>
              {error}
            </div>
          )}

          <div className="table-responsive">
            <table className="table" style={{ width: '100%', minWidth: '950px', borderCollapse: 'collapse', margin: 0, textAlign: isRtl ? 'right' : 'left' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid var(--color-border)', backgroundColor: 'var(--color-background)', textAlign: isRtl ? 'right' : 'left' }}>
                  <th style={{ padding: '10px 14px', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--color-text-secondary)', whiteSpace: 'nowrap' }}>{t('purchases.purchaseNumber')}</th>
                  <th style={{ padding: '10px 14px', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--color-text-secondary)', whiteSpace: 'nowrap' }}>{t('purchases.invoiceNumber')}</th>
                  <th style={{ padding: '10px 14px', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--color-text-secondary)' }}>{t('purchases.supplier')}</th>
                  <th style={{ padding: '10px 14px', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--color-text-secondary)' }}>{t('purchases.warehouse')}</th>
                  <th style={{ padding: '10px 14px', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--color-text-secondary)', whiteSpace: 'nowrap' }}>{t('purchases.date')}</th>
                  <th style={{ padding: '10px 14px', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--color-text-secondary)', whiteSpace: 'nowrap' }}>{t('purchases.total')}</th>
                  <th style={{ padding: '10px 14px', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--color-text-secondary)', whiteSpace: 'nowrap' }}>{t('purchases.status')}</th>
                  <th style={{ padding: '10px 14px', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--color-text-secondary)', whiteSpace: 'nowrap', textAlign: isRtl ? 'left' : 'right' }}>{t('common.actions')}</th>
                </tr>
              </thead>
              <tbody>
              {loading ? (
                <tr>
                  <td colSpan={8} style={{ padding: '28px', textAlign: 'center', color: 'var(--color-text-secondary)', fontSize: '0.875rem' }}>
                    {t('common.loading')}
                  </td>
                </tr>
              ) : purchases.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ padding: '28px', textAlign: 'center', color: 'var(--color-text-secondary)', fontSize: '0.875rem' }}>
                    {t('purchases.noPurchases')}
                  </td>
                </tr>
              ) : (
                purchases.map((purchase) => {
                  const statusStyle = getStatusStyle(purchase.status);
                  const isReceived = purchase.status === 'RECEIVED' || purchase.status === 'PAID';
                  
                  return (
                    <tr key={purchase.id} style={{ borderBottom: '1px solid var(--color-border)', transition: 'background-color 0.15s ease' }}>
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
                          {purchase.purchase_number || '-'}
                        </span>
                      </td>
                      <td style={{ padding: '10px 14px', fontSize: '0.8125rem', color: 'var(--color-text-secondary)', whiteSpace: 'nowrap' }}>
                        {purchase.invoice_number || '-'}
                      </td>
                      <td style={{ padding: '10px 14px', fontWeight: 600, fontSize: '0.85rem', color: 'var(--color-text-primary)' }}>
                        {purchase.supplier?.name || '-'}
                      </td>
                      <td style={{ padding: '10px 14px', fontSize: '0.8125rem', color: 'var(--color-text-secondary)' }}>
                        {purchase.warehouse?.name || '-'}
                      </td>
                      <td style={{ padding: '10px 14px', fontSize: '0.8125rem', color: 'var(--color-text-secondary)', whiteSpace: 'nowrap' }}>
                        {purchase.purchase_date ? new Date(purchase.purchase_date).toLocaleDateString() : (purchase.issue_date ? new Date(purchase.issue_date).toLocaleDateString() : (purchase.created_at ? new Date(purchase.created_at).toLocaleDateString() : '-'))}
                      </td>
                      <td style={{ padding: '10px 14px', whiteSpace: 'nowrap' }}>
                        <span style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--color-text-primary)' }}>
                          {Number(purchase.total_amount || purchase.grand_total || purchase.subtotal || 0).toLocaleString()}
                        </span>
                        <span style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', marginInlineStart: '4px' }}>
                          {t('products.currency')}
                        </span>
                      </td>
                      <td style={{ padding: '10px 14px', whiteSpace: 'nowrap' }}>
                        <span style={{ 
                          display: 'inline-flex', 
                          alignItems: 'center', 
                          gap: '5px',
                          padding: '3px 9px', 
                          borderRadius: '12px', 
                          fontSize: '0.75rem', 
                          fontWeight: 600,
                          backgroundColor: statusStyle.bg, 
                          color: statusStyle.color
                        }}>
                          <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: statusStyle.color }} />
                          {t(`purchases.${purchase.status.toLowerCase()}`) || purchase.status}
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
                          <button 
                            type="button"
                            onClick={() => handleView(purchase)}
                            title={language === 'ar' ? 'عرض الفاتورة' : 'View Details'}
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
                          >
                            <Eye size={15} />
                          </button>
                          {hasPermission('purchases.update') && (
                            <button 
                              type="button"
                              onClick={() => handleEdit(purchase)}
                              title={language === 'ar' ? 'تعديل الفاتورة' : 'Edit Invoice'}
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
                            >
                              <Edit2 size={15} />
                            </button>
                          )}
                          {(hasPermission('purchases.cancel') || hasPermission('purchases.update')) && (
                            <button 
                              type="button"
                              onClick={() => confirmDeleteClick(purchase)}
                              title={language === 'ar' ? 'حذف الفاتورة' : 'Delete Invoice'}
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
                            >
                              <Trash2 size={15} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
              </table>
            </div>
          </div>
        </div>

      {isFormOpen && (
        <PurchaseForm 
          purchaseId={selectedPurchase?.id}
          onClose={() => setIsFormOpen(false)} 
          onSave={() => {
            setIsFormOpen(false);
            fetchPurchases();
          }} 
        />
      )}

      {isDetailsOpen && selectedPurchase && (
        <PurchaseDetails 
          purchaseId={selectedPurchase.id}
          onClose={() => setIsDetailsOpen(false)}
          onRefresh={() => fetchPurchases()}
        />
      )}

      {deleteConfirmId && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }}>
          <div className="card" style={{ width: '100%', maxWidth: '400px', backgroundColor: 'var(--color-surface)', borderRadius: 'var(--radius-lg)' }}>
            <div className="card-header" style={{ padding: '16px 20px', borderBottom: '1px solid var(--color-border)' }}>
              <h3 style={{ margin: 0, fontSize: '1.2rem', color: 'var(--color-text-primary)' }}>{t('common.confirmDelete')}</h3>
            </div>
            <div className="card-body" style={{ padding: '20px' }}>
              <p style={{ margin: '0 0 16px 0', fontSize: '1rem', color: 'var(--color-text-secondary)' }}>
                {language === 'ar' 
                  ? `هل أنت متأكد من حذف/إلغاء فاتورة المشتريات #${deleteTargetPurchase?.purchase_number || deleteConfirmId}؟`
                  : `Are you sure you want to delete/cancel purchase invoice #${deleteTargetPurchase?.purchase_number || deleteConfirmId}?`}
              </p>
              {deleteErrorMsg && (
                <div style={{ padding: '10px 14px', backgroundColor: 'rgba(239, 68, 68, 0.1)', color: '#dc2626', borderRadius: '6px', fontSize: '0.85rem', marginBottom: '16px' }}>
                  {deleteErrorMsg}
                </div>
              )}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                <button type="button" className="btn btn-secondary" onClick={() => { setDeleteConfirmId(null); setDeleteTargetPurchase(null); }} disabled={deleting}>
                  {t('common.cancel')}
                </button>
                <button type="button" className="btn btn-danger" onClick={executeDelete} disabled={deleting}>
                  {deleting ? t('common.loading') : (language === 'ar' ? 'تأكيد الحذف' : 'Confirm Delete')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PurchasesList;
