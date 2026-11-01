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
      
      const { data: pData, error: pError } = await supabase
        .from('purchases')
        .select(`
          *,
          supplier:suppliers(name, phone, email, address, tax_number),
          warehouse:warehouses(name)
        `)
        .eq('id', purchaseId)
        .single();
        
      if (pError) throw pError;
      setPurchase(pData);

      const { data: iData, error: iError } = await supabase
        .from('purchase_items')
        .select(`
          *,
          product:products(
            name,
            product_code,
            category:categories(name),
            brand:brands(name)
          ),
          unit:units(name, code)
        `)
        .eq('purchase_id', purchaseId);
        
      if (iError) throw iError;
      setItems(iData || []);
      
    } catch (err: any) {
      console.error(err);
      setError('Failed to load details');
    } finally {
      setLoading(false);
    }
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

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1000,
      display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '24px'
    }}>
      <div style={{
        backgroundColor: 'var(--color-surface)', width: '100%', maxWidth: '1000px',
        maxHeight: '90vh', borderRadius: 'var(--radius-lg)', display: 'flex', flexDirection: 'column',
        boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)'
      }}>
        <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--color-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <ShoppingCart size={20} color="var(--color-primary)" />
            {purchase.purchase_number} - {purchase.supplier?.name}
          </h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-muted)' }}>
            <X size={24} />
          </button>
        </div>

        <div style={{ padding: '24px', overflowY: 'auto', flex: 1 }}>
          {error && <div style={{ padding: '12px', backgroundColor: '#fef2f2', color: '#991b1b', borderRadius: 'var(--radius-md)', marginBottom: '20px' }}>{error}</div>}
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '20px', marginBottom: '24px', backgroundColor: 'var(--color-background)', padding: '16px', borderRadius: 'var(--radius-md)' }}>
            <div>
              <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>{t('purchases.date')}</div>
              <div style={{ fontWeight: 500 }}>{purchase.purchase_date}</div>
            </div>
            <div>
              <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>{t('purchases.warehouse')}</div>
              <div style={{ fontWeight: 500 }}>{purchase.warehouse?.name}</div>
            </div>
            <div>
              <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>{t('purchases.status')}</div>
              <div style={{ fontWeight: 500 }}>{t(`purchases.${purchase.status.toLowerCase()}`) || purchase.status}</div>
            </div>
            <div>
              <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>{t('purchases.invoiceNumber')}</div>
              <div style={{ fontWeight: 500 }}>{purchase.invoice_number || '-'}</div>
            </div>
          </div>

          <h3 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '16px' }}>{t('purchases.items')}</h3>
          <div className="table-responsive" style={{ border: '1px solid var(--color-border)', borderRadius: '8px', overflow: 'hidden', marginBottom: '16px' }}>
            <table className="table" style={{ width: '100%', borderCollapse: 'collapse', margin: 0, textAlign: isRtl ? 'right' : 'left' }}>
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
              {items.map(item => (
                <tr key={item.id} style={{ borderBottom: '1px solid var(--color-border)', transition: 'background-color 0.15s ease' }}>
                  <td style={{ padding: '10px 14px' }}>
                    <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>{item.product?.name}</div>
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
                    {Number(item.purchase_price).toFixed(2)}
                  </td>
                  <td style={{ padding: '10px 14px', textAlign: isRtl ? 'left' : 'right', fontWeight: 700, color: 'var(--color-primary)', fontSize: '0.875rem' }}>
                    {Number(item.total).toFixed(2)} <span style={{ fontSize: '0.75rem', fontWeight: 400, color: 'var(--color-text-secondary)' }}>{t('products.currency')}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
          
          {purchase.notes && (
            <div>
              <h3 style={{ fontSize: '0.9rem', fontWeight: 600, marginBottom: '8px' }}>{t('purchases.notes')}</h3>
              <div style={{ padding: '12px', backgroundColor: 'var(--color-background)', borderRadius: 'var(--radius-md)', fontSize: '0.9rem' }}>{purchase.notes}</div>
            </div>
          )}
        </div>

        <div style={{ padding: '16px 20px', borderTop: '1px solid var(--color-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'var(--color-background)', flexWrap: 'wrap', gap: '12px' }}>
          <div style={{ fontSize: '1.25rem', fontWeight: 600 }}>
            {t('purchases.grandTotal')}: <span style={{ color: 'var(--color-primary)' }}>{Number(purchase.grand_total).toLocaleString()} {t('products.currency')}</span>
          </div>
          <div style={{ display: 'flex', gap: '12px' }}>
            <button 
              onClick={() => printPurchaseInvoice(purchase, items, language, 'SUPPLYRA')}
              type="button"
              style={{ padding: '10px 20px', border: '1px solid var(--color-primary)', backgroundColor: 'var(--color-surface)', color: 'var(--color-primary)', borderRadius: 'var(--radius-md)', cursor: 'pointer', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '8px' }}
            >
              <Printer size={18} /> {language === 'ar' ? 'طباعة الفاتورة' : 'Print Invoice'}
            </button>

            {purchase.status !== 'CANCELLED' && hasPermission('purchases.cancel') && (
              <button 
                onClick={handleCancel} disabled={actionLoading}
                style={{ padding: '10px 20px', border: '1px solid #ef4444', backgroundColor: 'var(--color-surface)', color: '#ef4444', borderRadius: 'var(--radius-md)', cursor: actionLoading ? 'not-allowed' : 'pointer', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '8px' }}
              >
                <XCircle size={18} /> {t('purchases.cancel')}
              </button>
            )}
            
            {purchase.status === 'DRAFT' && hasPermission('purchases.receive') && (
              <button 
                onClick={handleReceive} disabled={actionLoading}
                style={{ padding: '10px 20px', border: 'none', backgroundColor: '#10b981', color: 'white', borderRadius: 'var(--radius-md)', cursor: actionLoading ? 'not-allowed' : 'pointer', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '8px' }}
              >
                <CheckCircle size={18} /> {t('purchases.receive')}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PurchaseDetails;
