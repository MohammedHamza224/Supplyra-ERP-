import React, { useEffect, useState } from 'react';
import { useTranslation } from '../../contexts/LanguageContext';
import { Plus, Search, Eye, Edit2, Filter, BarChart2, List, ShieldCheck, ShoppingCart, Trash2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import SalesForm from './SalesForm';
import SaleDetails from './SaleDetails';
import SalesAnalytics from './SalesAnalytics';
import DiscountApprovalModal from './DiscountApprovalModal';
import { useDebounce } from '../../hooks/useDebounce';

const SalesList = () => {
  const { t, language } = useTranslation();
  const { hasPermission, user } = useAuth();
  
  const [viewMode, setViewMode] = useState<'list' | 'analytics'>('list');

  const [sales, setSales] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearchTerm = useDebounce(searchTerm, 300);

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [selectedSale, setSelectedSale] = useState<any>(null);
  
  const [isApprovalModalOpen, setIsApprovalModalOpen] = useState(false);
  const [approvalOrderId, setApprovalOrderId] = useState<string>('');

  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [deleteTargetSale, setDeleteTargetSale] = useState<any>(null);
  const [deleteErrorMsg, setDeleteErrorMsg] = useState('');
  const [deleting, setDeleting] = useState(false);

  const fetchSales = async () => {
    try {
      setLoading(true);
      setError('');

      let query = supabase
        .from('orders')
        .select(`
          *,
          customer:customers(name, mobile),
          warehouse:warehouses(id, name),
          order_items(warehouse_id, warehouse:warehouses(name))
        `)
        .order('created_at', { ascending: false });

      if (debouncedSearchTerm) {
        query = query.ilike('order_number', `%${debouncedSearchTerm}%`);
      }

      let { data, error: fetchError } = await query;

      if (fetchError) {
        console.warn('Failed to fetch orders with relations, falling back to safe fetch:', fetchError);
        let fallbackQuery = supabase
          .from('orders')
          .select('*')
          .order('created_at', { ascending: false });

        if (debouncedSearchTerm) {
          fallbackQuery = fallbackQuery.ilike('order_number', `%${debouncedSearchTerm}%`);
        }

        const fallbackRes = await fallbackQuery;
        data = fallbackRes.data;
        fetchError = fallbackRes.error;
        
        if (fetchError) throw fetchError;
      }

      const { data: warehousesList } = await supabase.from('warehouses').select('id, name');
      const warehouseMap = new Map((warehousesList || []).map((w: any) => [w.id, w.name]));
      const defaultWarehouseName = warehousesList && warehousesList.length > 0 ? warehousesList[0].name : '-';

      const enrichedSales = (data || []).map((sale: any) => {
        let whName = sale.warehouse?.name;
        if (!whName && sale.warehouse_id) {
          whName = warehouseMap.get(sale.warehouse_id);
        }
        if (!whName && sale.order_items && sale.order_items.length > 0) {
          const itemWh = sale.order_items[0];
          whName = itemWh.warehouse?.name || (itemWh.warehouse_id ? warehouseMap.get(itemWh.warehouse_id) : null);
        }
        if (!whName) {
          whName = defaultWarehouseName;
        }
        return {
          ...sale,
          warehouse_name_display: whName || '-'
        };
      });
      
      setSales(enrichedSales);
    } catch (err: any) {
      console.error('Error fetching sales:', err);
      setError(err?.message || 'Failed to load sales.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSales();
  }, [debouncedSearchTerm]);

  const handleOpenForm = (sale?: any) => {
    setSelectedSale(sale || null);
    setIsFormOpen(true);
  };

  const handleOpenDetails = (sale: any) => {
    setSelectedSale(sale);
    setIsDetailsOpen(true);
  };
  
  const handleOpenApproval = (orderId: string) => {
    setApprovalOrderId(orderId);
    setIsApprovalModalOpen(true);
  };

  const closeForm = (shouldRefresh = false) => {
    setIsFormOpen(false);
    setSelectedSale(null);
    if (shouldRefresh) fetchSales();
  };

  const closeDetails = (shouldRefresh = false) => {
    setIsDetailsOpen(false);
    setSelectedSale(null);
    if (shouldRefresh) fetchSales();
  };

  const closeApprovalModal = (shouldRefresh = false) => {
    setIsApprovalModalOpen(false);
    setApprovalOrderId('');
    if (shouldRefresh) fetchSales();
  };

  const getStatusStyle = (status: string) => {
    switch (status) {
      case 'PENDING': return { bg: '#fef08a', color: '#854d0e' };
      case 'CONFIRMED': return { bg: 'rgba(59, 130, 246, 0.15)', color: '#1e40af' };
      case 'PREPARING': return { bg: 'rgba(99, 102, 241, 0.15)', color: '#3730a3' };
      case 'READY': return { bg: '#f3e8ff', color: '#6b21a8' };
      case 'COMPLETED': return { bg: '#dcfce3', color: '#166534' };
      case 'CANCELLED': return { bg: 'rgba(239, 68, 68, 0.15)', color: '#991b1b' };
      default: return { bg: 'var(--color-surface-hover)', color: 'var(--color-text-secondary)' };
    }
  };

  const getApprovalStyle = (status: string) => {
    switch (status) {
      case 'PENDING': return { bg: '#fef08a', color: '#854d0e', text: 'sales.pendingApproval' };
      case 'APPROVED': return { bg: '#dcfce3', color: '#166534', text: 'sales.approved' };
      case 'REJECTED': return { bg: 'rgba(239, 68, 68, 0.15)', color: '#991b1b', text: 'sales.rejected' };
      case 'NONE': return { bg: '#dcfce3', color: '#166534', text: 'sales.approved' };
      default: return { bg: '#dcfce3', color: '#166534', text: 'sales.approved' };
    }
  };

  const getPaymentStatusStyle = (status: string) => {
    switch (status) {
      case 'UNPAID': return { bg: 'rgba(239, 68, 68, 0.15)', color: '#991b1b' };
      case 'PARTIALLY_PAID': return { bg: '#fef08a', color: '#854d0e' };
      case 'PAID': return { bg: '#dcfce3', color: '#166534' };
      case 'REFUNDED': return { bg: 'var(--color-surface-hover)', color: 'var(--color-text-secondary)' };
      default: return { bg: 'var(--color-surface-hover)', color: 'var(--color-text-secondary)' };
    }
  };

  const confirmDeleteClick = (sale: any) => {
    setDeleteConfirmId(sale.id);
    setDeleteTargetSale(sale);
    setDeleteErrorMsg('');
  };

  const executeDelete = async () => {
    if (!deleteConfirmId) return;
    setDeleting(true);
    setDeleteErrorMsg('');
    try {
      const isAlreadyCancelled = deleteTargetSale?.status === 'CANCELLED';

      // 1. If not cancelled yet, cancel first to restore inventory to warehouse once
      if (!isAlreadyCancelled) {
        try {
          await supabase.rpc('cancel_sale', {
            p_order_id: deleteConfirmId,
            p_user_id: user?.id
          });
        } catch (cErr) {
          console.warn('cancel_sale notice before delete:', cErr);
        }
      }

      // 2. Direct delete on orders with count verification
      const { error: delError, count } = await supabase
        .from('orders')
        .delete({ count: 'exact' })
        .eq('id', deleteConfirmId);

      if (delError) {
        throw delError;
      }

      if (count === 0) {
        console.warn('Direct delete returned 0 rows, attempting child cleanup before retry...');
        await supabase.from('payments').delete().eq('order_id', deleteConfirmId);
        await supabase.from('order_items').delete().eq('order_id', deleteConfirmId);
        const { error: retryError, count: retryCount } = await supabase
          .from('orders')
          .delete({ count: 'exact' })
          .eq('id', deleteConfirmId);
        
        if (retryError) throw retryError;
        if (retryCount === 0) {
          throw new Error(
            language === 'ar'
              ? 'لم يتم حذف الفاتورة من قاعدة البيانات. يرجى تفعيل سياسة الحذف (RLS DELETE Policy) على جدول orders في Supabase.'
              : 'The invoice was not deleted from the database. Please ensure DELETE RLS policy is enabled on the orders table in Supabase.'
          );
        }
      }

      setSales(prev => prev.filter(s => s.id !== deleteConfirmId));
      setDeleteConfirmId(null);
      setDeleteTargetSale(null);
      await fetchSales();
    } catch (e: any) {
      console.error('Error executing delete sale:', e);
      setDeleteErrorMsg(e.message || (language === 'ar' ? 'فشل حذف الفاتورة' : 'Failed to delete sale'));
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="page-container">
      <div className="card">
        <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <ShoppingCart size={28} color="var(--color-primary)" />
            <div>
              <h2 style={{ fontSize: '1.25rem', marginBottom: '4px' }}>{t('sales.title')}</h2>
              <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.875rem' }}>{t('sales.subtitle')}</p>
            </div>
          </div>
          
          <div style={{ display: 'flex', gap: '12px' }}>
            <div className="btn-group" style={{ display: 'flex', backgroundColor: 'var(--color-background)', padding: '3px', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)' }}>
              <button 
                className={`btn ${viewMode === 'list' ? 'btn-primary' : 'btn-ghost'}`} 
                onClick={() => setViewMode('list')}
                style={{ padding: '6px 12px', fontSize: '0.875rem' }}
              >
                <List size={16} style={{ marginLeft: language === 'ar' ? '6px' : 0, marginRight: language === 'ar' ? 0 : '6px' }} />
                {language === 'ar' ? 'قائمة الفواتير' : 'Invoices List'}
              </button>
              <button 
                className={`btn ${viewMode === 'analytics' ? 'btn-primary' : 'btn-ghost'}`} 
                onClick={() => setViewMode('analytics')}
                style={{ padding: '6px 12px', fontSize: '0.875rem' }}
              >
                <BarChart2 size={16} style={{ marginLeft: language === 'ar' ? '6px' : 0, marginRight: language === 'ar' ? 0 : '6px' }} />
                {t('sales.analytics')}
              </button>
            </div>

            {hasPermission('sales.create') && (
              <button className="btn btn-primary" onClick={() => handleOpenForm()}>
                <Plus size={18} />
                {t('sales.newSale')}
              </button>
            )}
          </div>
        </div>

        {viewMode === 'analytics' ? (
          <div className="card-body">
            <SalesAnalytics />
          </div>
        ) : (
          <div className="card-body" style={{ padding: 0 }}>
            {error && (
              <div style={{ padding: 'var(--spacing-4)', backgroundColor: 'rgba(239, 68, 68, 0.1)', color: '#dc2626', borderBottom: '1px solid var(--color-border)' }}>
                {error}
              </div>
            )}

            <div style={{ padding: 'var(--spacing-4)', borderBottom: '1px solid var(--color-border)' }}>
              <div style={{ display: 'flex', alignItems: 'center', backgroundColor: 'var(--color-background)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', padding: '4px 12px', width: '300px' }}>
                <Search size={16} color="var(--color-text-muted)" />
                <input 
                  type="text" 
                  placeholder={t('sales.search')} 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  style={{ border: 'none', background: 'transparent', padding: '8px', width: '100%', outline: 'none', fontSize: '0.875rem' }}
                />
              </div>
            </div>

            <div className="table-responsive">
              <table className="table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--color-border)', textAlign: 'left' }}>
                    <th style={{ padding: '12px' }}>{t('sales.orderNumber')}</th>
                    <th style={{ padding: '12px' }}>{t('sales.date')}</th>
                    <th style={{ padding: '12px' }}>{t('sales.customer')}</th>
                    <th style={{ padding: '12px' }}>{t('sales.warehouse')}</th>
                    <th style={{ padding: '12px' }}>{t('sales.grandTotal')}</th>
                    <th style={{ padding: '12px' }}>{t('sales.status')}</th>
                    <th style={{ padding: '12px' }}>{t('sales.paymentStatus')}</th>
                    <th style={{ padding: '12px', textAlign: 'right' }}>{t('common.actions')}</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={8} style={{ textAlign: 'center', padding: 'var(--spacing-8)' }}>{t('common.loading')}</td>
                    </tr>
                  ) : sales.length === 0 ? (
                    <tr>
                      <td colSpan={8} style={{ textAlign: 'center', padding: 'var(--spacing-8)', color: 'var(--color-text-muted)' }}>
                        {t('common.noData')}
                      </td>
                    </tr>
                  ) : (
                    sales.map((sale) => {
                      const statusStyle = getStatusStyle(sale.status);
                      const pStatusStyle = getPaymentStatusStyle(sale.payment_status);
                      const aStyle = getApprovalStyle(sale.discount_approval_status);
                      
                      return (
                        <tr key={sale.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                          <td style={{ padding: '12px', fontWeight: 500 }}>{sale.order_number || '-'}</td>
                          <td style={{ padding: '12px' }}>{sale.order_date ? new Date(sale.order_date).toLocaleDateString() : '-'}</td>
                          <td style={{ padding: '12px' }}>{sale.customer?.name || t('sales.walkIn')}</td>
                          <td style={{ padding: '12px' }}>{sale.warehouse_name_display || sale.warehouse?.name || '-'}</td>
                          <td style={{ padding: '12px', fontWeight: 500 }}>{Number(sale.grand_total || 0).toLocaleString()} {t('products.currency')}</td>
                          <td style={{ padding: '12px' }}>
                            <span style={{ 
                              display: 'inline-block', padding: '4px 8px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 500,
                              backgroundColor: statusStyle.bg, color: statusStyle.color
                            }}>
                              {t(`sales.${sale.status?.toLowerCase()}`) || sale.status}
                            </span>
                            {aStyle && (
                              <div style={{ marginTop: '4px' }}>
                                <span style={{ 
                                  display: 'inline-block', padding: '2px 6px', borderRadius: '8px', fontSize: '0.65rem', fontWeight: 600,
                                  backgroundColor: aStyle.bg, color: aStyle.color
                                }}>
                                  {t(aStyle.text) || sale.discount_approval_status}
                                </span>
                              </div>
                            )}
                          </td>
                          <td style={{ padding: '12px' }}>
                            <span style={{ 
                              display: 'inline-block', padding: '4px 8px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 500,
                              backgroundColor: pStatusStyle.bg, color: pStatusStyle.color
                            }}>
                              {t(`sales.${sale.payment_status?.toLowerCase()}`) || sale.payment_status}
                            </span>
                          </td>
                          <td style={{ padding: '12px', textAlign: 'right' }}>
                            <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
                              {sale.discount_approval_status === 'PENDING' && hasPermission('sales.discount.approve') && (
                                <button 
                                  onClick={() => handleOpenApproval(sale.id)}
                                  className="btn btn-secondary"
                                  title={t('sales.viewApproval') || 'Review Approval'}
                                  style={{ padding: '6px' }}
                                >
                                  <ShieldCheck size={16} />
                                </button>
                              )}
                              <button 
                                onClick={() => handleOpenDetails(sale)}
                                className="btn btn-secondary"
                                title={language === 'ar' ? 'عرض الفاتورة' : 'View Invoice'}
                                style={{ padding: '6px' }}
                              >
                                <Eye size={16} />
                              </button>
                              {hasPermission('sales.update') && (
                                <button 
                                  onClick={() => handleOpenForm(sale)}
                                  className="btn btn-secondary"
                                  title={language === 'ar' ? 'تعديل الفاتورة' : 'Edit Sale'}
                                  style={{ padding: '6px' }}
                                >
                                  <Edit2 size={16} />
                                </button>
                              )}
                              {(hasPermission('sales.cancel') || hasPermission('sales.update')) && (
                                <button 
                                  onClick={() => confirmDeleteClick(sale)}
                                  className="btn btn-danger"
                                  title={language === 'ar' ? 'حذف الفاتورة' : 'Delete Invoice'}
                                  style={{ padding: '6px' }}
                                >
                                  <Trash2 size={16} />
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
        )}
      </div>

      {isFormOpen && (
        <SalesForm
          isOpen={isFormOpen}
          onClose={() => closeForm()}
          onSuccess={() => closeForm(true)}
          sale={selectedSale}
        />
      )}

      {isDetailsOpen && selectedSale && (
        <SaleDetails
          isOpen={isDetailsOpen}
          onClose={() => closeDetails()}
          saleId={selectedSale.id}
          onUpdate={() => fetchSales()}
        />
      )}

      <DiscountApprovalModal
        isOpen={isApprovalModalOpen}
        onClose={() => closeApprovalModal()}
        onSuccess={() => closeApprovalModal(true)}
        orderId={approvalOrderId}
      />

      {deleteConfirmId && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }}>
          <div className="card" style={{ width: '100%', maxWidth: '400px', backgroundColor: 'var(--color-surface)', borderRadius: 'var(--radius-lg)' }}>
            <div className="card-header" style={{ padding: '16px 20px', borderBottom: '1px solid var(--color-border)' }}>
              <h3 style={{ margin: 0, fontSize: '1.2rem', color: 'var(--color-text-primary)' }}>{t('common.confirmDelete')}</h3>
            </div>
            <div className="card-body" style={{ padding: '20px' }}>
              <p style={{ margin: '0 0 16px 0', fontSize: '1rem', color: 'var(--color-text-secondary)' }}>
                {deleteTargetSale?.status === 'CANCELLED'
                  ? (language === 'ar'
                      ? `هل أنت متأكد من حذف هذه الفاتورة الملغاة #${deleteTargetSale?.order_number || deleteConfirmId} نهائياً؟`
                      : `Are you sure you want to permanently delete this cancelled invoice #${deleteTargetSale?.order_number || deleteConfirmId}?`)
                  : (language === 'ar'
                      ? `هل أنت متأكد من إلغاء وحذف فاتورة المبيعات #${deleteTargetSale?.order_number || deleteConfirmId}؟ سيتم استرجاع المخزون للمستودع.`
                      : `Are you sure you want to cancel and delete sales invoice #${deleteTargetSale?.order_number || deleteConfirmId}? Stock will be restored to warehouse.`)}
              </p>
              {deleteErrorMsg && (
                <div style={{ padding: '10px 14px', backgroundColor: 'rgba(239, 68, 68, 0.1)', color: '#dc2626', borderRadius: '6px', fontSize: '0.85rem', marginBottom: '16px' }}>
                  {deleteErrorMsg}
                </div>
              )}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                <button type="button" className="btn btn-secondary" onClick={() => { setDeleteConfirmId(null); setDeleteTargetSale(null); }} disabled={deleting}>
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

export default SalesList;
