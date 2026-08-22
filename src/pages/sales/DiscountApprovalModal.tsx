import React, { useState, useEffect } from 'react';
import { useTranslation } from '../../contexts/LanguageContext';
import { X, CheckCircle, XCircle } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';

interface DiscountApprovalModalProps {
  orderId: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const DiscountApprovalModal: React.FC<DiscountApprovalModalProps> = ({ orderId, isOpen, onClose, onSuccess }) => {
  const { t, language } = useTranslation();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [approvalData, setApprovalData] = useState<any>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [actionType, setActionType] = useState<'APPROVE' | 'REJECT' | null>(null);

  useEffect(() => {
    if (isOpen && orderId) {
      fetchApprovalData();
    }
  }, [isOpen, orderId]);

  const fetchApprovalData = async () => {
    try {
      setLoading(true);
      setError('');
      
      const { data: orderData, error: orderError } = await supabase
        .from('orders')
        .select(`
          *,
          customer:customers(name),
          warehouse:warehouses(name)
        `)
        .eq('id', orderId)
        .single();
        
      if (orderError) throw orderError;

      const { data: approvalRecord, error: approvalError } = await supabase
        .from('discount_approvals')
        .select(`
          *,
          requester:auth.users!requested_by(email)
        `)
        .eq('order_id', orderId)
        .eq('status', 'PENDING')
        .order('requested_at', { ascending: false })
        .limit(1)
        .single();

      if (approvalError && approvalError.code !== 'PGRST116') {
        throw approvalError;
      }

      setApprovalData({
        order: orderData,
        approval: approvalRecord || null
      });

    } catch (err: any) {
      console.error('Error fetching approval data', err);
      setError('Failed to load approval details.');
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async () => {
    if (!approvalData?.approval) {
      setError('No pending approval record found.');
      return;
    }

    if (actionType === 'REJECT' && (!rejectionReason || rejectionReason.trim() === '')) {
      setError(t('sales.rejectionReason') + ' is required');
      return;
    }

    try {
      setLoading(true);
      setError('');

      if (actionType === 'APPROVE') {
        const { error: rpcError } = await supabase.rpc('approve_discount', {
          p_approval_id: approvalData.approval.id
        });
        if (rpcError) throw rpcError;
      } else if (actionType === 'REJECT') {
        const { error: rpcError } = await supabase.rpc('reject_discount', {
          p_approval_id: approvalData.approval.id,
          p_rejection_reason: rejectionReason
        });
        if (rpcError) throw rpcError;
      }

      onSuccess();
    } catch (err: any) {
      console.error('Error processing approval', err);
      setError(err.message || 'Failed to process action. Make sure you are authorized and not the requester.');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1100, padding: '16px' }}>
      <div className="card" style={{ width: '100%', maxWidth: '600px', backgroundColor: 'var(--color-surface)', borderRadius: 'var(--radius-lg)', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)', display: 'flex', flexDirection: 'column' }}>
        
        {/* Header */}
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--color-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ fontSize: '1.25rem', margin: 0, fontWeight: 600, color: 'var(--color-text)' }}>
            {t('sales.discountApproval') || 'Discount Approval'}
          </h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-muted)' }}>
            <X size={24} />
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: '20px', flex: 1, overflowY: 'auto' }}>
          {error && (
            <div style={{ padding: '12px', backgroundColor: '#fef2f2', color: '#991b1b', borderRadius: 'var(--radius-md)', marginBottom: '16px', fontSize: '0.9rem' }}>
              {error}
            </div>
          )}

          {loading && !approvalData ? (
            <div style={{ textAlign: 'center', padding: '20px' }}>Loading...</div>
          ) : approvalData ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', backgroundColor: 'var(--color-background)', padding: '16px', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)' }}>
                <div>
                  <span style={{ display: 'block', fontSize: '0.8rem', color: 'var(--color-text-muted)', marginBottom: '4px' }}>Order Number</span>
                  <span style={{ fontWeight: 500, fontSize: '0.95rem' }}>{approvalData.order.order_number}</span>
                </div>
                <div>
                  <span style={{ display: 'block', fontSize: '0.8rem', color: 'var(--color-text-muted)', marginBottom: '4px' }}>{t('sales.customer')}</span>
                  <span style={{ fontWeight: 500, fontSize: '0.95rem' }}>{approvalData.order.customer?.name || t('sales.walkIn')}</span>
                </div>
                <div>
                  <span style={{ display: 'block', fontSize: '0.8rem', color: 'var(--color-text-muted)', marginBottom: '4px' }}>Warehouse</span>
                  <span style={{ fontWeight: 500, fontSize: '0.95rem' }}>{approvalData.order.warehouse?.name || '-'}</span>
                </div>
                <div>
                  <span style={{ display: 'block', fontSize: '0.8rem', color: 'var(--color-text-muted)', marginBottom: '4px' }}>{t('sales.requestedBy')}</span>
                  <span style={{ fontWeight: 500, fontSize: '0.95rem' }}>{approvalData.approval?.requester?.email || '-'}</span>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px', backgroundColor: 'rgba(245, 158, 11, 0.15)', padding: '16px', borderRadius: 'var(--radius-md)', border: '1px solid #fcd34d' }}>
                <div>
                  <span style={{ display: 'block', fontSize: '0.8rem', color: '#92400e', marginBottom: '4px' }}>{t('sales.subtotal')}</span>
                  <span style={{ fontWeight: 600, color: '#b45309', fontSize: '1.05rem' }}>{Number(approvalData.order.subtotal).toLocaleString()}</span>
                </div>
                <div>
                  <span style={{ display: 'block', fontSize: '0.8rem', color: '#92400e', marginBottom: '4px' }}>{t('sales.discountAmount')}</span>
                  <span style={{ fontWeight: 600, color: '#b45309', fontSize: '1.05rem' }}>{Number(approvalData.order.discount).toLocaleString()}</span>
                </div>
                <div>
                  <span style={{ display: 'block', fontSize: '0.8rem', color: '#92400e', marginBottom: '4px' }}>{t('sales.discount')} %</span>
                  <span style={{ fontWeight: 600, color: '#b45309', fontSize: '1.05rem' }}>{approvalData.approval?.discount_percentage || 0}%</span>
                </div>
              </div>

              <div>
                <span style={{ display: 'block', fontSize: '0.8rem', color: 'var(--color-text-muted)', marginBottom: '4px' }}>{t('sales.discountReason')}</span>
                <div style={{ padding: '12px', backgroundColor: 'var(--color-background)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', fontSize: '0.95rem', fontStyle: 'italic' }}>
                  "{approvalData.approval?.reason || 'No reason provided'}"
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px', backgroundColor: '#f0fdf4', borderRadius: 'var(--radius-md)', border: '1px solid #bbf7d0', marginTop: '4px' }}>
                <span style={{ fontWeight: 600, color: '#166534', fontSize: '1rem' }}>{t('sales.grandTotal')}</span>
                <span style={{ fontWeight: 'bold', color: '#166534', fontSize: '1.2rem' }}>{Number(approvalData.order.grand_total).toLocaleString()} {t('products.currency')}</span>
              </div>

              {actionType === 'REJECT' && (
                <div style={{ marginTop: '12px' }}>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 500, marginBottom: '6px', color: '#991b1b' }}>
                    {t('sales.rejectionReason')} *
                  </label>
                  <textarea
                    required
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    placeholder="Enter reason for rejection..."
                    style={{ width: '100%', padding: '10px', border: '1px solid #fecaca', borderRadius: 'var(--radius-md)', outline: 'none', fontSize: '0.9rem', minHeight: '80px', backgroundColor: '#fef2f2' }}
                  />
                </div>
              )}

            </div>
          ) : (
             <div style={{ textAlign: 'center', padding: '20px', color: 'var(--color-text-muted)' }}>Approval request not found.</div>
          )}
        </div>

        {/* Footer */}
        <div style={{ padding: '16px 20px', borderTop: '1px solid var(--color-border)', display: 'flex', justifyContent: 'flex-end', gap: '12px', backgroundColor: 'var(--color-background)', borderBottomLeftRadius: 'var(--radius-lg)', borderBottomRightRadius: 'var(--radius-lg)' }}>
          {actionType ? (
             <>
               <button
                  type="button"
                  onClick={() => setActionType(null)}
                  disabled={loading}
                  className="btn"
                  style={{ padding: '8px 16px', border: '1px solid var(--color-border)', backgroundColor: 'var(--color-surface)', borderRadius: 'var(--radius-md)', cursor: 'pointer' }}
                >
                  {t('common.cancel') || 'Cancel'}
                </button>
                <button
                  type="button"
                  onClick={handleAction}
                  disabled={loading}
                  className="btn"
                  style={{ 
                    padding: '8px 16px', 
                    border: 'none', 
                    borderRadius: 'var(--radius-md)', 
                    cursor: loading ? 'not-allowed' : 'pointer',
                    backgroundColor: actionType === 'APPROVE' ? '#10b981' : '#ef4444',
                    color: 'white',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    fontWeight: 600
                  }}
                >
                  {actionType === 'APPROVE' ? <CheckCircle size={18} /> : <XCircle size={18} />}
                  {actionType === 'APPROVE' ? t('sales.approve') || 'Confirm Approve' : t('sales.reject') || 'Confirm Reject'}
                </button>
             </>
          ) : (
            <>
              <button
                type="button"
                onClick={() => setActionType('REJECT')}
                disabled={loading || !approvalData?.approval}
                className="btn"
                style={{ padding: '8px 16px', border: '1px solid #ef4444', color: '#ef4444', backgroundColor: 'transparent', borderRadius: 'var(--radius-md)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                <XCircle size={18} />
                {t('sales.reject') || 'Reject'}
              </button>
              <button
                type="button"
                onClick={() => setActionType('APPROVE')}
                disabled={loading || !approvalData?.approval}
                className="btn"
                style={{ padding: '8px 16px', border: 'none', backgroundColor: '#10b981', color: 'white', borderRadius: 'var(--radius-md)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                <CheckCircle size={18} />
                {t('sales.approve') || 'Approve'}
              </button>
            </>
          )}
        </div>

      </div>
    </div>
  );
};

export default DiscountApprovalModal;
