import React, { useState, useEffect } from 'react';
import { useTranslation } from '../../contexts/LanguageContext';
import { X, CheckCircle, XCircle, ShoppingCart, Printer } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { printPurchaseInvoice } from '../../utils/printPurchaseInvoice';

interface PurchaseDetailsProps {
  purchaseId: string;
  onClose: () => void;
  onRefresh: () => void;
}

const PurchaseDetails: React.FC<PurchaseDetailsProps> = ({ purchaseId, onClose, onRefresh }) => {
  const { t, language } = useTranslation();
  const isRtl = language === 'ar';
  const { user, hasPermission } = useAuth();
  
  const [purchase, setPurchase] = useState<any>(null);
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchPurchaseData();
  }, [purchaseId]);

  const fetchPurchaseData = async () => {
    try {
      setLoading(true);
      setError('');
      
      // 1. Fetch purchase record safely
      let pData: any = null;
      const { data: pJoined, error: pJoinErr } = await supabase
        .from('purchases')
        .select(`
          *,
          supplier:suppliers(name, phone, email),
          warehouse:warehouses(name)
        `)
        .eq('id', purchaseId)
        .maybeSingle();

      if (pJoinErr || !pJoined) {
        console.warn('Purchase detail join query notice, falling back to base select:', pJoinErr?.message);
        const { data: pBase, error: pBaseErr } = await supabase
          .from('purchases')
          .select('*')
          .eq('id', purchaseId)
          .maybeSingle();

        if (pBaseErr) throw pBaseErr;
        pData = pBase;

        if (pData?.supplier_id) {
          const { data: s } = await supabase.from('suppliers').select('name, phone, email').eq('id', pData.supplier_id).maybeSingle();
          if (s) pData.supplier = s;
        }
        if (pData?.warehouse_id) {
          const { data: w } = await supabase.from('warehouses').select('name').eq('id', pData.warehouse_id).maybeSingle();
          if (w) pData.warehouse = w;
        }
      } else {
        pData = pJoined;
      }

      setPurchase(pData);

      // 2. Fetch purchase items safely
      let itemsList: any[] = [];
      const { data: iJoined, error: iJoinErr } = await supabase
        .from('purchase_items')
        .select(`
          *,
          product:products(name, product_code)
        `)
        .eq('purchase_id', purchaseId);

      if (iJoinErr || !iJoined) {
        console.warn('Purchase items detail join notice, falling back:', iJoinErr?.message);
        const { data: iBase, error: iBaseErr } = await supabase
          .from('purchase_items')
          .select('*')
          .eq('purchase_id', purchaseId);

        if (iBaseErr) throw iBaseErr;
        itemsList = iBase || [];

        if (itemsList.length > 0) {
          const prodIds = itemsList.map((it: any) => it.product_id).filter(Boolean);
          if (prodIds.length > 0) {
            const { data: prods } = await supabase.from('products').select('id, name, product_code').in('id', prodIds);
            const pMap = new Map((prods || []).map((p: any) => [p.id, p]));
            itemsList = itemsList.map((it: any) => ({
              ...it,
              product: pMap.get(it.product_id) || it.product
            }));
          }
        }
      } else {
        itemsList = iJoined;
      }

      setItems(itemsList);
    } catch (err: any) {
      console.error('Error fetching purchase details:', err);
      setError(language === 'ar' ? 'تعذر تحميل بعض تفاصيل الفاتورة.' : 'Failed to load details');
    } finally {
      setLoading(false);
    }
  };

  const getStatusText = (status: string) => {
    const s = (status || '').toUpperCase();
    if (s === 'PENDING') return isRtl ? 'قيد الانتظار' : 'Pending';
    if (s === 'CONFIRMED') return isRtl ? 'مؤكد' : 'Confirmed';
    if (s === 'RECEIVED') return isRtl ? 'مستلمة' : 'Received';
    if (s === 'DRAFT') return isRtl ? 'مسودة' : 'Draft';
    if (s === 'ORDERED') return isRtl ? 'مطلوبة' : 'Ordered';
    if (s === 'CANCELLED') return isRtl ? 'ملغاة' : 'Cancelled';
    return t(`purchases.${status?.toLowerCase()}`) || status;
  };

  const handleReceive = async () => {
    if (!confirm('Are you sure you want to receive this purchase? This will insert batches into inventory.')) return;
    
    setActionLoading(true);
    setError('');
    try {
      const { data, error } = await supabase.rpc('receive_purchase', {
        p_purchase_id: purchaseId,
        p_user_id: user?.id
      });
      if (error) throw error;
      
      onRefresh();
      fetchPurchaseData();
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Failed to receive purchase.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCancel = async () => {
    if (!confirm('Are you sure you want to cancel this purchase? If it was received, inventory will be reverted.')) return;
    
    setActionLoading(true);
    setError('');
    try {
      const { data, error } = await supabase.rpc('cancel_purchase', {
        p_purchase_id: purchaseId,
        p_user_id: user?.id
      });
      if (error) throw error;
      
      onRefresh();
      fetchPurchaseData();
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Failed to cancel purchase.');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading || !purchase) {
    return (
      <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
        <div style={{ backgroundColor: 'var(--color-surface)', padding: '24px', borderRadius: '8px' }}>Loading...</div>
      </div>
    );
  }

  const grandTotal = Number(purchase?.grand_total ?? purchase?.total_amount ?? purchase?.total ?? purchase?.subtotal ?? 0);

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(3px)', zIndex: 1000,
      display: 'flex', justifyContent: 'center', alignItems: 'flex-start', padding: '24px 16px',
      overflowY: 'auto', direction: isRtl ? 'rtl' : 'ltr'
    }}>
      <div style={{
        backgroundColor: 'var(--color-surface)', width: '100%', maxWidth: '960px',
        maxHeight: 'calc(100vh - 48px)', margin: 'auto 0', borderRadius: '12px', display: 'flex', flexDirection: 'column',
        boxShadow: '0 20px 25px -5px rgba(0,0,0,0.25)', overflow: 'hidden', border: '1px solid var(--color-border)'
      }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--color-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'var(--color-surface)', flexShrink: 0 }}>
          <h2 style={{ fontSize: '1.15rem', fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--color-text-primary)' }}>
            <ShoppingCart size={20} color="var(--color-primary)" />
            <span>{purchase?.purchase_number || (isRtl ? 'فاتورة مشتريات' : 'Purchase Invoice')} {purchase?.supplier?.name ? `— ${purchase.supplier.name}` : ''}</span>
          </h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-muted)', padding: '4px' }}>
            <X size={20} />
          </button>
        </div>

        <div style={{ padding: '20px', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {error && <div style={{ padding: '12px', backgroundColor: '#fef2f2', color: '#991b1b', borderRadius: 'var(--radius-md)', fontSize: '0.875rem' }}>{error}</div>}
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 180px), 1fr))', gap: '14px', backgroundColor: 'var(--color-background)', padding: '16px', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)' }}>
            <div>
              <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginBottom: '2px' }}>{t('purchases.date')}</div>
              <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>
                {purchase?.purchase_date ? new Date(purchase.purchase_date).toLocaleDateString(isRtl ? 'ar-SA' : 'en-US') : (purchase?.created_at ? new Date(purchase.created_at).toLocaleDateString(isRtl ? 'ar-SA' : 'en-US') : '-')}
              </div>
            </div>
            <div>
              <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginBottom: '2px' }}>{t('purchases.warehouse')}</div>
              <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{purchase?.warehouse?.name || '-'}</div>
            </div>
            <div>
              <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginBottom: '2px' }}>{t('purchases.status')}</div>
              <div>
                <span style={{ 
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '5px',
                  padding: '2px 8px',
                  borderRadius: '12px',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  backgroundColor: purchase?.status === 'RECEIVED' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(245, 158, 11, 0.1)',
                  color: purchase?.status === 'RECEIVED' ? 'rgb(16, 185, 129)' : 'rgb(217, 119, 6)'
                }}>
                  <span style={{ width: '5px', height: '5px', borderRadius: '50%', backgroundColor: purchase?.status === 'RECEIVED' ? 'rgb(16, 185, 129)' : 'rgb(217, 119, 6)' }} />
                  {getStatusText(purchase?.status)}
                </span>
              </div>
            </div>
            <div>
              <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginBottom: '2px' }}>{t('purchases.invoiceNumber')}</div>
              <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{purchase?.invoice_number || '-'}</div>
            </div>
          </div>

          <h3 style={{ fontSize: '1rem', fontWeight: 700, margin: '4px 0 0 0', display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--color-text-primary)' }}>
            {t('purchases.items')} ({items.length})
          </h3>
          <div className="table-responsive" style={{ border: '1px solid var(--color-border)', borderRadius: '8px', overflow: 'hidden' }}>
            <table className="table" style={{ width: '100%', minWidth: '780px', borderCollapse: 'collapse', margin: 0, textAlign: isRtl ? 'right' : 'left' }}>
            <thead>
              <tr style={{ backgroundColor: 'var(--color-background)', borderBottom: '2px solid var(--color-border)', textAlign: isRtl ? 'right' : 'left' }}>
                <th style={{ padding: '10px 14px', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--color-text-secondary)' }}>{t('purchases.product')}</th>
                <th style={{ padding: '10px 14px', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--color-text-secondary)' }}>{language === 'ar' ? 'الفئة' : 'Category'}</th>
                <th style={{ padding: '10px 14px', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--color-text-secondary)' }}>{language === 'ar' ? 'العلامة التجارية' : 'Brand'}</th>
                <th style={{ padding: '10px 14px', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--color-text-secondary)' }}>{t('purchases.batch')} / {t('purchases.expiryDate')}</th>
                <th style={{ padding: '10px 14px', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--color-text-secondary)', textAlign: 'center' }}>{t('purchases.quantity')}</th>
                <th style={{ padding: '10px 14px', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--color-text-secondary)', textAlign: isRtl ? 'left' : 'right' }}>{t('purchases.unitPrice')}</th>
                <th style={{ padding: '10px 14px', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--color-text-secondary)', textAlign: isRtl ? 'left' : 'right' }}>{t('purchases.total')}</th>
              </tr>
            </thead>
            <tbody>
              {items.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: '24px', color: 'var(--color-text-muted)', fontSize: '0.85rem' }}>
                    {isRtl ? 'لا توجد بنود مسجلة لهذه الفاتورة' : 'No items recorded for this invoice'}
                  </td>
                </tr>
              ) : (
                items.map(item => (
                  <tr key={item.id} style={{ borderBottom: '1px solid var(--color-border)', transition: 'background-color 0.15s ease' }}>
                    <td style={{ padding: '10px 14px' }}>
                      <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>{item.product?.name || (isRtl ? 'منتج غير محدد' : 'Item')}</div>
                      {item.product?.product_code && (
                        <span style={{ fontSize: '0.72rem', fontFamily: 'monospace', color: 'var(--color-text-secondary)', backgroundColor: 'var(--color-background)', border: '1px solid var(--color-border)', padding: '1px 6px', borderRadius: '4px', marginTop: '2px', display: 'inline-block' }}>
                          {item.product.product_code}
                        </span>
                      )}
                    </td>
                    <td style={{ padding: '10px 14px', fontSize: '0.8125rem', color: 'var(--color-text-secondary)' }}>
                      {item.product?.category?.name || '-'}
                    </td>
                    <td style={{ padding: '10px 14px', fontSize: '0.8125rem', color: 'var(--color-text-secondary)' }}>
                      {item.product?.brand?.name || '-'}
                    </td>
                    <td style={{ padding: '10px 14px', fontSize: '0.8125rem', whiteSpace: 'nowrap' }}>
                      {item.batch_number ? (
                        <span style={{ fontSize: '0.75rem', fontFamily: 'monospace', backgroundColor: 'var(--color-background)', border: '1px solid var(--color-border)', padding: '2px 6px', borderRadius: '4px' }}>
                          {item.batch_number}
                        </span>
                      ) : '-'}
                      {item.expiry_date && (
                        <div style={{ color: 'var(--color-text-muted)', fontSize: '0.72rem', marginTop: '2px' }}>Exp: {item.expiry_date}</div>
                      )}
                    </td>
                    <td style={{ padding: '10px 14px', textAlign: 'center', fontWeight: 700, fontSize: '0.875rem' }}>
                      {item.quantity} {item.unit?.code || ''}
                    </td>
                    <td style={{ padding: '10px 14px', textAlign: isRtl ? 'left' : 'right', fontSize: '0.85rem' }}>
                      {Number(item.purchase_price || 0).toFixed(2)}
                    </td>
                    <td style={{ padding: '10px 14px', textAlign: isRtl ? 'left' : 'right', fontWeight: 700, color: 'var(--color-primary)', fontSize: '0.875rem' }}>
                      {Number(item.total || 0).toFixed(2)} <span style={{ fontSize: '0.75rem', fontWeight: 400, color: 'var(--color-text-secondary)' }}>{t('products.currency')}</span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
          </div>
          
          {purchase?.notes && (
            <div>
              <h3 style={{ fontSize: '0.85rem', fontWeight: 600, margin: '0 0 6px 0', color: 'var(--color-text-secondary)' }}>{t('purchases.notes')}</h3>
              <div style={{ padding: '10px 14px', backgroundColor: 'var(--color-background)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', fontSize: '0.85rem', color: 'var(--color-text-primary)' }}>{purchase.notes}</div>
            </div>
          )}
        </div>

        <div style={{ padding: '14px 20px', borderTop: '1px solid var(--color-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'var(--color-background)', flexWrap: 'wrap', gap: '12px', flexShrink: 0 }}>
          <div style={{ fontSize: '1.15rem', fontWeight: 700 }}>
            {t('purchases.grandTotal')}: <span style={{ color: 'var(--color-primary)' }}>{grandTotal.toLocaleString()} {t('products.currency')}</span>
          </div>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button 
              onClick={() => printPurchaseInvoice(purchase, items, language, 'SUPPLYRA')}
              type="button"
              style={{ padding: '8px 16px', border: '1px solid var(--color-primary)', backgroundColor: 'var(--color-surface)', color: 'var(--color-primary)', borderRadius: 'var(--radius-md)', cursor: 'pointer', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem' }}
            >
              <Printer size={16} /> {language === 'ar' ? 'طباعة الفاتورة' : 'Print Invoice'}
            </button>

            {purchase?.status !== 'CANCELLED' && hasPermission('purchases.cancel') && (
              <button 
                onClick={handleCancel} disabled={actionLoading}
                style={{ padding: '8px 16px', border: '1px solid #ef4444', backgroundColor: 'var(--color-surface)', color: '#ef4444', borderRadius: 'var(--radius-md)', cursor: actionLoading ? 'not-allowed' : 'pointer', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem' }}
              >
                <XCircle size={16} /> {t('purchases.cancel')}
              </button>
            )}
            
            {purchase?.status === 'DRAFT' && hasPermission('purchases.receive') && (
              <button 
                onClick={handleReceive} disabled={actionLoading}
                style={{ padding: '8px 16px', border: 'none', backgroundColor: '#10b981', color: 'white', borderRadius: 'var(--radius-md)', cursor: actionLoading ? 'not-allowed' : 'pointer', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem' }}
              >
                <CheckCircle size={16} /> {t('purchases.receive')}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PurchaseDetails;
