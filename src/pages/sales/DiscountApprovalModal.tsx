import React, { useState, useEffect } from 'react';
import { useTranslation } from '../../contexts/LanguageContext';
import { X, CheckCircle, XCircle, ShieldCheck } from 'lucide-react';
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
  const isRtl = language === 'ar';
  const { user, hasPermission } = useAuth();
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
      setActionType(null);
      setRejectionReason('');
      
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

      // Safe fetch of pending discount approval without auth.users join
      const { data: approvalRecord, error: approvalError } = await supabase
        .from('discount_approvals')
        .select('*')
        .eq('order_id', orderId)
        .eq('status', 'PENDING')
        .order('requested_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (approvalError && approvalError.code !== 'PGRST116') {
        throw approvalError;
      }

      let reqName = '';
      const targetUserId = approvalRecord?.requested_by || orderData.created_by;
      if (targetUserId) {
        const { data: prof } = await supabase
          .from('profiles')
          .select('first_name, last_name')
          .eq('id', targetUserId)
          .maybeSingle();
        if (prof) {
          reqName = `${prof.first_name || ''} ${prof.last_name || ''}`.trim();
        }
      }

      let activeApproval = approvalRecord;
      if (!activeApproval && orderData.discount_approval_status === 'PENDING') {
        const calcPct = orderData.subtotal > 0 ? Number(((orderData.discount / orderData.subtotal) * 100).toFixed(2)) : 0;
        const { data: createdAppr } = await supabase
          .from('discount_approvals')
          .insert({
            order_id: orderId,
            requested_by: orderData.created_by || user?.id,
            discount_percentage: calcPct,
            discount_amount: orderData.discount || 0,
            reason: orderData.notes || (isRtl ? 'طلب اعتماد خصم يتجاوز 5%' : 'Discount approval requested (>5%)'),
            status: 'PENDING'
          })
          .select()
          .single();
        activeApproval = createdAppr;
      }

      setApprovalData({
        order: orderData,
        approval: activeApproval || null,
        requesterName: reqName || (isRtl ? 'موظف المبيعات' : 'Sales Representative')
      });

    } catch (err: any) {
      console.error('Error fetching approval data', err);
      setError(isRtl ? 'فشل تحميل بيانات طلب الاعتماد' : 'Failed to load approval details.');
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async () => {
    if (!approvalData?.approval) {
      setError(isRtl ? 'لم يتم العثور على سجل طلب اعتماد معلق' : 'No pending approval record found.');
      return;
    }

    if (actionType === 'REJECT' && (!rejectionReason || rejectionReason.trim() === '')) {
      setError(isRtl ? 'يرجى إدخال سبب الرفض' : 'Rejection reason is required');
      return;
    }

    try {
      setLoading(true);
      setError('');

      if (actionType === 'APPROVE') {
        const { error: rpcError } = await supabase.rpc('approve_discount', {
          p_approval_id: approvalData.approval.id
        });
        
        if (rpcError) {
          console.warn('RPC approve_discount notice, trying direct update fallback:', rpcError);
          if (hasPermission('sales.discount.approve')) {
            await supabase.from('discount_approvals').update({
              status: 'APPROVED',
              approved_by: user?.id,
              approved_at: new Date().toISOString()
            }).eq('id', approvalData.approval.id);

            await supabase.from('orders').update({
              discount_approval_status: 'APPROVED'
            }).eq('id', approvalData.order.id);

            await supabase.rpc('confirm_sale', {
              p_order_id: approvalData.order.id,
              p_user_id: user?.id
            });
          } else {
            throw rpcError;
          }
        }
      } else if (actionType === 'REJECT') {
        const { error: rpcError } = await supabase.rpc('reject_discount', {
          p_approval_id: approvalData.approval.id,
          p_rejection_reason: rejectionReason
        });
        
        if (rpcError) {
          console.warn('RPC reject_discount notice, trying direct update fallback:', rpcError);
          if (hasPermission('sales.discount.approve')) {
            await supabase.from('discount_approvals').update({
              status: 'REJECTED',
              approved_by: user?.id,
              approved_at: new Date().toISOString(),
              rejection_reason: rejectionReason
            }).eq('id', approvalData.approval.id);

            await supabase.from('orders').update({
              discount_approval_status: 'REJECTED'
            }).eq('id', approvalData.order.id);
          } else {
            throw rpcError;
          }
        }
      }

      onSuccess();
    } catch (err: any) {
      console.error('Error processing approval', err);
      setError(err.message || (isRtl ? 'فشل تنفيذ الإجراء. تأكد من امتلاك صلاحية اعتماد الخصومات.' : 'Failed to process action. Make sure you are authorized.'));
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
          <h2 style={{ fontSize: '1.15rem', margin: 0, fontWeight: 700, color: 'var(--color-text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <ShieldCheck size={22} color="var(--color-primary)" />
            {t('sales.discountApproval') || (isRtl ? 'اعتماد خصم الفاتورة' : 'Discount Approval')}
          </h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-muted)', padding: '4px' }}>
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: '20px', flex: 1, overflowY: 'auto' }}>
          {error && (
            <div style={{ padding: '12px', backgroundColor: '#fef2f2', color: '#991b1b', borderRadius: 'var(--radius-md)', marginBottom: '16px', fontSize: '0.875rem' }}>
              {error}
            </div>
          )}

          {loading && !approvalData ? (
            <div style={{ textAlign: 'center', padding: '20px', color: 'var(--color-text-muted)' }}>
              {t('common.loading') || (isRtl ? 'جاري التحميل...' : 'Loading...')}
            </div>
          ) : approvalData ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 180px), 1fr))', gap: '12px', backgroundColor: 'var(--color-background)', padding: '14px', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)' }}>
                <div>
                  <span style={{ display: 'block', fontSize: '0.75rem', color: 'var(--color-text-muted)', marginBottom: '2px' }}>{t('sales.orderNumber') || 'Order Number'}</span>
                  <span style={{ fontWeight: 600, fontSize: '0.95rem' }}>{approvalData.order.order_number}</span>
                </div>
                <div>
                  <span style={{ display: 'block', fontSize: '0.75rem', color: 'var(--color-text-muted)', marginBottom: '2px' }}>{t('sales.customer') || 'Customer'}</span>
                  <span style={{ fontWeight: 600, fontSize: '0.95rem' }}>{approvalData.order.customer?.name || t('sales.walkIn')}</span>
                </div>
                <div>
                  <span style={{ display: 'block', fontSize: '0.75rem', color: 'var(--color-text-muted)', marginBottom: '2px' }}>{t('sales.warehouse') || 'Warehouse'}</span>
                  <span style={{ fontWeight: 500, fontSize: '0.9rem' }}>{approvalData.order.warehouse?.name || '-'}</span>
                </div>
                <div>
                  <span style={{ display: 'block', fontSize: '0.75rem', color: 'var(--color-text-muted)', marginBottom: '2px' }}>{t('sales.requestedBy') || 'Requested By'}</span>
                  <span style={{ fontWeight: 500, fontSize: '0.9rem' }}>{approvalData.requesterName}</span>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 120px), 1fr))', gap: '10px', backgroundColor: 'rgba(245, 158, 11, 0.12)', padding: '14px', borderRadius: 'var(--radius-md)', border: '1px solid #fcd34d' }}>
                <div>
                  <span style={{ display: 'block', fontSize: '0.75rem', color: '#92400e', marginBottom: '2px' }}>{t('sales.subtotal') || 'Subtotal'}</span>
                  <span style={{ fontWeight: 700, color: '#b45309', fontSize: '1rem' }}>{Number(approvalData.order.subtotal || 0).toLocaleString()} {t('products.currency')}</span>
                </div>
                <div>
                  <span style={{ display: 'block', fontSize: '0.75rem', color: '#92400e', marginBottom: '2px' }}>{t('sales.discount') || 'Discount'} %</span>
                  <span style={{ fontWeight: 800, color: '#b45309', fontSize: '1.05rem' }}>
                    {approvalData.approval?.discount_percentage || (approvalData.order.subtotal > 0 ? ((approvalData.order.discount / approvalData.order.subtotal) * 100).toFixed(1) : 0)}%
                  </span>
                </div>
                <div>
                  <span style={{ display: 'block', fontSize: '0.75rem', color: '#92400e', marginBottom: '2px' }}>{t('sales.discount') || 'Discount Amount'}</span>
                  <span style={{ fontWeight: 700, color: '#dc2626', fontSize: '1rem' }}>- {Number(approvalData.order.discount || 0).toLocaleString()} {t('products.currency')}</span>
                </div>
              </div>

              <div>
                <span style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--color-text-secondary)', marginBottom: '4px' }}>
                  {t('sales.discountReason') || (isRtl ? 'سبب طلب الخصم' : 'Discount Reason')}
                </span>
                <div style={{ padding: '10px 12px', backgroundColor: 'var(--color-background)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', fontSize: '0.9rem', fontStyle: 'italic' }}>
                  "{approvalData.approval?.reason || approvalData.order.notes || (isRtl ? 'طلب اعتماد خصم خاص للعميل' : 'Customer special discount requested')}"
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', backgroundColor: '#f0fdf4', borderRadius: 'var(--radius-md)', border: '1px solid #bbf7d0' }}>
                <span style={{ fontWeight: 600, color: '#166534', fontSize: '0.95rem' }}>{t('sales.grandTotal') || 'Grand Total'}</span>
                <span style={{ fontWeight: 800, color: '#166534', fontSize: '1.15rem' }}>{Number(approvalData.order.grand_total || 0).toLocaleString()} {t('products.currency')}</span>
              </div>

              {actionType === 'REJECT' && (
                <div style={{ marginTop: '4px' }}>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '6px', color: '#991b1b' }}>
                    {t('sales.rejectionReason') || (isRtl ? 'سبب الرفض' : 'Rejection Reason')} *
                  </label>
                  <textarea
                    required
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    placeholder={isRtl ? 'أدخل سبب رفض الخصم...' : 'Enter reason for rejecting this discount...'}
                    style={{ width: '100%', padding: '10px', border: '1px solid #fecaca', borderRadius: 'var(--radius-md)', outline: 'none', fontSize: '0.875rem', minHeight: '70px', backgroundColor: '#fef2f2' }}
                  />
                </div>
              )}

            </div>
          ) : (
             <div style={{ textAlign: 'center', padding: '20px', color: 'var(--color-text-muted)' }}>
               {isRtl ? 'لم يتم العثور على طلب الاعتماد' : 'Approval request not found.'}
             </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ padding: '14px 20px', borderTop: '1px solid var(--color-border)', display: 'flex', justifyContent: 'flex-end', gap: '10px', flexWrap: 'wrap', backgroundColor: 'var(--color-background)', borderBottomLeftRadius: 'var(--radius-lg)', borderBottomRightRadius: 'var(--radius-lg)' }}>
          {actionType ? (
             <>
               <button
                  type="button"
                  onClick={() => setActionType(null)}
                  disabled={loading}
                  className="btn"
                  style={{ padding: '8px 16px', border: '1px solid var(--color-border)', backgroundColor: 'var(--color-surface)', borderRadius: 'var(--radius-md)', cursor: 'pointer', fontSize: '0.875rem' }}
                >
                  {t('common.cancel') || 'Cancel'}
                </button>
                <button
                  type="button"
                  onClick={handleAction}
                  disabled={loading}
                  className="btn"
                  style={{ 
                    padding: '8px 18px', 
                    border: 'none', 
                    borderRadius: 'var(--radius-md)', 
                    cursor: loading ? 'not-allowed' : 'pointer',
                    backgroundColor: actionType === 'APPROVE' ? '#10b981' : '#ef4444',
                    color: 'white',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    fontWeight: 600,
                    fontSize: '0.875rem'
                  }}
                >
                  {actionType === 'APPROVE' ? <CheckCircle size={16} /> : <XCircle size={16} />}
                  {actionType === 'APPROVE' 
                    ? (t('sales.approve') || (isRtl ? 'تأكيد الموافقة' : 'Confirm Approve')) 
                    : (t('sales.reject') || (isRtl ? 'تأكيد الرفض' : 'Confirm Reject'))}
                </button>
             </>
          ) : (
            <>
              <button
                type="button"
                onClick={onClose}
                disabled={loading}
                className="btn"
                style={{ padding: '8px 16px', border: '1px solid var(--color-border)', backgroundColor: 'var(--color-surface)', borderRadius: 'var(--radius-md)', cursor: 'pointer', fontSize: '0.875rem' }}
              >
                {t('common.cancel') || (isRtl ? 'إلغاء' : 'Cancel')}
              </button>
              <button
                type="button"
                onClick={() => setActionType('REJECT')}
                disabled={loading || !approvalData?.approval}
                className="btn"
                style={{ padding: '8px 16px', border: '1px solid #ef4444', color: '#ef4444', backgroundColor: 'transparent', borderRadius: 'var(--radius-md)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.875rem', fontWeight: 600 }}
              >
                <XCircle size={16} />
                {t('sales.reject') || (isRtl ? 'رفض' : 'Reject')}
              </button>
              <button
                type="button"
                onClick={() => setActionType('APPROVE')}
                disabled={loading || !approvalData?.approval}
                className="btn"
                style={{ padding: '8px 18px', border: 'none', backgroundColor: '#10b981', color: 'white', borderRadius: 'var(--radius-md)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.875rem', fontWeight: 600 }}
              >
                <CheckCircle size={16} />
                {t('sales.approve') || (isRtl ? 'موافقة' : 'Approve')}
              </button>
            </>
          )}
        </div>

      </div>
    </div>
  );
};

export default DiscountApprovalModal;
