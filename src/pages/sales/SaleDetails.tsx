import React, { useState, useEffect } from 'react';
import { useTranslation } from '../../contexts/LanguageContext';
import { X, FileText, CheckCircle, XCircle, Printer, Calendar, Clock, User, Building2, CreditCard, DollarSign, Package, Trash2, ShieldCheck, AlertTriangle } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { printInvoice } from '../../utils/printInvoice';
import { useAuth } from '../../contexts/AuthContext';
import DiscountApprovalModal from './DiscountApprovalModal';

interface SaleDetailsProps {
  saleId: string;
  isOpen: boolean;
  onClose: () => void;
  onUpdate: () => void;
}

const SaleDetails: React.FC<SaleDetailsProps> = ({ saleId, isOpen, onClose, onUpdate }) => {
  const { t, language } = useTranslation();
  const isRtl = language === 'ar';
  const { hasPermission, user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [isApprovalModalOpen, setIsApprovalModalOpen] = useState(false);
  const [error, setError] = useState('');
  
  const [sale, setSale] = useState<any>(null);
  const [items, setItems] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);

  useEffect(() => {
    if (saleId && isOpen) {
      fetchSaleDetails();
    }
  }, [saleId, isOpen]);

  const fetchSaleDetails = async () => {
    try {
      setLoading(true);
      setError('');
      
      // 1. Fetch Order
      let fetchedSale: any = null;
      const { data: saleData, error: saleError } = await supabase
        .from('orders')
        .select(`
          *,
          customer:customers(name, mobile, phone, address, email),
          warehouse:warehouses(name)
        `)
        .eq('id', saleId)
        .maybeSingle();
        
      if (saleError || !saleData) {
        const { data: fallbackSale, error: fallbackError } = await supabase
          .from('orders')
          .select('*')
          .eq('id', saleId)
          .single();
        if (fallbackError) throw fallbackError;
        fetchedSale = fallbackSale;
      } else {
        fetchedSale = saleData;
      }

      // If customer wasn't joined, fetch customer manually
      if (fetchedSale && fetchedSale.customer_id && !fetchedSale.customer) {
        const { data: cust } = await supabase.from('customers').select('name, mobile, phone, address, email').eq('id', fetchedSale.customer_id).maybeSingle();
        if (cust) fetchedSale.customer = cust;
      }
      
      // If warehouse wasn't joined, fetch warehouse manually
      if (fetchedSale && fetchedSale.warehouse_id && !fetchedSale.warehouse) {
        const { data: wh } = await supabase.from('warehouses').select('name').eq('id', fetchedSale.warehouse_id).maybeSingle();
        if (wh) fetchedSale.warehouse = wh;
      }

      setSale(fetchedSale);

      // 2. Fetch Order Items safely without assuming 'units' FK relation exists
      let fetchedItems: any[] = [];
      const { data: itemsData, error: itemsError } = await supabase
        .from('order_items')
        .select(`
          *,
          product:products(
            name,
            product_code,
            category:categories(name),
            brand:brands(name)
          )
        `)
        .eq('order_id', saleId);
        
      if (itemsError) {
        const { data: basicItems } = await supabase
          .from('order_items')
          .select('*')
          .eq('order_id', saleId);
        fetchedItems = basicItems || [];
      } else {
        fetchedItems = itemsData || [];
      }

      setItems(fetchedItems);

      // 3. Fetch Payments
      try {
        const { data: paymentsData } = await supabase
          .from('payments')
          .select('*')
          .eq('order_id', saleId);
        setPayments(paymentsData || []);
      } catch (pErr) {
        setPayments([]);
      }
      
    } catch (err: any) {
      console.error('Error in fetchSaleDetails:', err);
      setError(isRtl ? 'فشل تحميل تفاصيل الفاتورة' : 'Failed to fetch sale details');
    } finally {
      setLoading(false);
    }
  };

  const handleCancelSale = async () => {
    const confirmMsg = isRtl ? "هل أنت متأكد من إلغاء هذه الفاتورة؟ سيتم إرجاع المخزون." : "Are you sure you want to cancel this sale? Stock will be restored.";
    if (!window.confirm(confirmMsg)) return;
    
    try {
      setCancelling(true);
      setError('');
      
      const { error: rpcError } = await supabase.rpc('cancel_sale', {
        p_order_id: saleId,
        p_user_id: user?.id
      });
      
      if (rpcError) throw rpcError;
      
      await fetchSaleDetails();
      onUpdate();
    } catch (err: any) {
      console.error(err);
      setError(err.message || (isRtl ? 'فشل إلغاء الفاتورة' : 'Failed to cancel sale'));
    } finally {
      setCancelling(false);
    }
  };

  const handleDeleteCancelledSale = async () => {
    const confirmMsg = isRtl
      ? "هل أنت متأكد من حذف هذه الفاتورة الملغاة نهائياً؟"
      : "Are you sure you want to permanently delete this cancelled invoice?";
    if (!window.confirm(confirmMsg)) return;

    try {
      setDeleting(true);
      setError('');

      const { error: delError, count } = await supabase
        .from('orders')
        .delete({ count: 'exact' })
        .eq('id', saleId);

      if (delError) {
        throw delError;
      }

      if (count === 0) {
        console.warn('Direct delete returned 0 rows, attempting child cleanup before retry...');
        await supabase.from('payments').delete().eq('order_id', saleId);
        await supabase.from('order_items').delete().eq('order_id', saleId);
        const { error: retryError, count: retryCount } = await supabase
          .from('orders')
          .delete({ count: 'exact' })
          .eq('id', saleId);
        
        if (retryError) throw retryError;
        if (retryCount === 0) {
          throw new Error(
            isRtl
              ? 'لم يتم حذف الفاتورة من قاعدة البيانات. يرجى تفعيل سياسة الحذف (RLS DELETE Policy) على جدول orders في Supabase.'
              : 'The invoice was not deleted from the database. Please ensure DELETE RLS policy is enabled on the orders table in Supabase.'
          );
        }
      }

      onUpdate();
      onClose();
    } catch (err: any) {
      console.error('Error deleting cancelled sale:', err);
      setError(err.message || (isRtl ? 'فشل حذف الفاتورة' : 'Failed to delete sale'));
    } finally {
      setDeleting(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return `${Number(amount || 0).toLocaleString(isRtl ? 'ar-EG' : 'en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${isRtl ? 'ر.س' : 'SAR'}`;
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '-';
    const d = new Date(dateStr);
    return d.toLocaleDateString(isRtl ? 'ar-SA' : 'en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  };

  const formatTime = (dateStr: string) => {
    if (!dateStr) return '-';
    const d = new Date(dateStr);
    return d.toLocaleTimeString(isRtl ? 'ar-SA' : 'en-US', { hour: '2-digit', minute: '2-digit' });
  };

  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.55)', zIndex: 1000,
      display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '16px',
      direction: isRtl ? 'rtl' : 'ltr'
    }}>
      <div style={{
        backgroundColor: 'var(--color-surface)', width: '100%', maxWidth: '820px',
        maxHeight: '86vh', borderRadius: '12px', display: 'flex', flexDirection: 'column',
        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.25), 0 8px 10px -6px rgba(0, 0, 0, 0.1)', border: '1px solid var(--color-border)', overflow: 'hidden'
      }}>
        
        {/* Modal Header */}
        <div style={{
          padding: '12px 20px', borderBottom: '1px solid var(--color-border)',
          backgroundColor: 'var(--color-surface-hover)', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          flexWrap: 'wrap', gap: '10px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            <FileText size={20} color="var(--color-primary)" />
            <div>
              <div style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--color-text-primary)' }}>
                {isRtl ? 'تفاصيل فاتورة المبيعات' : 'Sales Invoice Details'} #{sale?.order_number || ''}
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', marginTop: '1px' }}>
                {isRtl ? 'معلومات الفاتورة والمنتجات والمدفوعات' : 'Invoice details, products, and payment record'}
              </div>
            </div>
            {sale?.status === 'CANCELLED' && (
              <span style={{ padding: '3px 8px', backgroundColor: 'rgba(239, 68, 68, 0.15)', color: '#dc2626', borderRadius: '10px', fontSize: '0.7rem', fontWeight: 700 }}>
                {isRtl ? 'ملغاة' : 'CANCELLED'}
              </span>
            )}
          </div>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button 
              onClick={() => printInvoice(sale, items, 'SUPPLYRA', '', language)} 
              className="btn btn-secondary" 
              title={isRtl ? 'طباعة الفاتورة' : 'Print Invoice'}
              style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '6px 12px', minHeight: '38px', color: 'var(--color-primary)', fontSize: '0.85rem' }}
            >
              <Printer size={16} />
              <span>{isRtl ? 'طباعة' : 'Print'}</span>
            </button>
            <button onClick={onClose} className="btn btn-secondary" style={{ padding: '6px 10px', minHeight: '38px' }} aria-label="Close">
              <X size={18} color="var(--color-text-secondary)" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div style={{ padding: '16px 20px', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '14px' }}>
          
          {error && (
            <div style={{ padding: '10px 14px', backgroundColor: 'rgba(239, 68, 68, 0.1)', color: '#dc2626', borderRadius: '6px', border: '1px solid rgba(239, 68, 68, 0.2)', fontSize: '0.85rem' }}>
              {error}
            </div>
          )}

          {loading ? (
            <div style={{ padding: '30px', textAlign: 'center', color: 'var(--color-text-secondary)' }}>
              {t('common.loading') || (isRtl ? 'جاري التحميل...' : 'Loading...')}
            </div>
          ) : sale ? (
            <>
              {/* 1. Header Metadata Section */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 180px), 1fr))', gap: '12px', backgroundColor: 'var(--color-background)', padding: '12px 14px', borderRadius: '8px', border: '1px solid var(--color-border)' }}>
                
                <div>
                  <span style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', display: 'block', marginBottom: '4px' }}>
                    {isRtl ? 'العميل' : 'Customer Name'}
                  </span>
                  <div style={{ fontWeight: 600, fontSize: '0.95rem', color: 'var(--color-text-primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <User size={16} color="var(--color-primary)" />
                    {sale.customer?.name || (isRtl ? 'عميل نقدي' : 'Walk-in Customer')}
                  </div>
                  {sale.customer?.phone || sale.customer?.mobile ? (
                    <span style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)', marginTop: '2px', display: 'block' }}>
                      📱 {sale.customer.phone || sale.customer.mobile}
                    </span>
                  ) : null}
                </div>

                <div>
                  <span style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', display: 'block', marginBottom: '4px' }}>
                    {isRtl ? 'تاريخ ووقت الفاتورة' : 'Sale Date & Time'}
                  </span>
                  <div style={{ fontWeight: 600, fontSize: '0.95rem', color: 'var(--color-text-primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Calendar size={16} color="var(--color-primary)" />
                    {formatDate(sale.order_date || sale.created_at)}
                  </div>
                  <span style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Clock size={12} /> {formatTime(sale.created_at || sale.order_date)}
                  </span>
                </div>

                <div>
                  <span style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', display: 'block', marginBottom: '4px' }}>
                    {isRtl ? 'المستودع' : 'Warehouse'}
                  </span>
                  <div style={{ fontWeight: 600, fontSize: '0.95rem', color: 'var(--color-text-primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Building2 size={16} color="var(--color-primary)" />
                    {sale.warehouse?.name || (isRtl ? 'الرئيسي' : 'Main Warehouse')}
                  </div>
                </div>

                <div>
                  <span style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', display: 'block', marginBottom: '4px' }}>
                    {isRtl ? 'حالة الفاتورة والدفع والخصم' : 'Order, Payment & Approval Status'}
                  </span>
                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                    <span className={`badge ${sale.status === 'COMPLETED' || sale.status === 'CONFIRMED' ? 'badge-success' : sale.status === 'CANCELLED' ? 'badge-danger' : 'badge-neutral'}`}>
                      {sale.status}
                    </span>
                    <span className={`badge ${sale.payment_status === 'PAID' ? 'badge-success' : sale.payment_status === 'PARTIALLY_PAID' ? 'badge-warning' : 'badge-neutral'}`}>
                      {sale.payment_status}
                    </span>
                    <span style={{
                      padding: '2px 8px',
                      borderRadius: '12px',
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      backgroundColor: sale.discount_approval_status === 'PENDING' ? '#fef08a' : sale.discount_approval_status === 'REJECTED' ? 'rgba(239, 68, 68, 0.15)' : '#dcfce3',
                      color: sale.discount_approval_status === 'PENDING' ? '#854d0e' : sale.discount_approval_status === 'REJECTED' ? '#991b1b' : '#166534'
                    }}>
                      {sale.discount_approval_status === 'PENDING'
                        ? (isRtl ? 'في انتظار الموافقة' : 'Pending Approval')
                        : sale.discount_approval_status === 'REJECTED'
                        ? (isRtl ? 'تم الرفض' : 'Rejected')
                        : (isRtl ? 'تمت الموافقة' : 'Approved')}
                    </span>
                  </div>
                </div>

              </div>

              {/* Discount Approval Pending / Rejected Banner */}
              {sale.discount_approval_status === 'PENDING' && (
                <div style={{ backgroundColor: '#fef3c7', border: '1px solid #f59e0b', borderRadius: '8px', padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#92400e', fontWeight: 600, fontSize: '0.9rem' }}>
                    <AlertTriangle size={20} color="#d97706" />
                    <span>{isRtl ? 'هذه الفاتورة بانتظار موافقة المدير على الخصم (يتجاوز 5%)' : 'This invoice is pending Manager approval for discount > 5%'}</span>
                  </div>
                  {hasPermission('sales.discount.approve') && (
                    <button
                      onClick={() => setIsApprovalModalOpen(true)}
                      className="btn"
                      style={{ backgroundColor: '#d97706', color: 'white', border: 'none', padding: '6px 14px', borderRadius: '6px', cursor: 'pointer', fontWeight: 600, fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '6px' }}
                    >
                      <ShieldCheck size={16} />
                      {isRtl ? 'مراجعة واعتماد الخصم' : 'Review & Approve Discount'}
                    </button>
                  )}
                </div>
              )}

              {sale.discount_approval_status === 'REJECTED' && (
                <div style={{ backgroundColor: '#fee2e2', border: '1px solid #ef4444', borderRadius: '8px', padding: '10px 14px', color: '#991b1b', fontWeight: 600, fontSize: '0.875rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <XCircle size={18} color="#dc2626" />
                  <span>{isRtl ? 'تم رفض طلب الخصم لهذه الفاتورة من قبل المدير.' : 'Discount request for this invoice was rejected by Manager.'}</span>
                </div>
              )}

              {/* 2. Items Table Section */}
              <div>
                <h3 style={{ fontSize: '1rem', fontWeight: 700, margin: '0 0 10px 0', color: 'var(--color-text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Package size={18} color="var(--color-primary)" />
                  {isRtl ? 'المنتجات المطلوبة' : 'Order Items'} ({items.length})
                </h3>

                <div className="table-responsive" style={{ border: '1px solid var(--color-border)', borderRadius: '8px', overflow: 'hidden' }}>
                  <table className="table" style={{ width: '100%', borderCollapse: 'collapse', margin: 0, textAlign: isRtl ? 'right' : 'left' }}>
                    <thead>
                      <tr style={{ borderBottom: '2px solid var(--color-border)', backgroundColor: 'var(--color-background)', textAlign: isRtl ? 'right' : 'left' }}>
                        <th style={{ padding: '10px 14px', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--color-text-secondary)', width: '40px' }}>#</th>
                        <th style={{ padding: '10px 14px', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--color-text-secondary)' }}>{isRtl ? 'المنتج' : 'Product'}</th>
                        <th style={{ padding: '10px 14px', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--color-text-secondary)' }}>{isRtl ? 'الفئة' : 'Category'}</th>
                        <th style={{ padding: '10px 14px', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--color-text-secondary)', textAlign: 'center' }}>{isRtl ? 'الكمية' : 'Quantity'}</th>
                        <th style={{ padding: '10px 14px', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--color-text-secondary)', textAlign: isRtl ? 'left' : 'right' }}>{isRtl ? 'سعر الوحدة' : 'Unit Price'}</th>
                        <th style={{ padding: '10px 14px', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--color-text-secondary)', textAlign: isRtl ? 'left' : 'right' }}>{isRtl ? 'الإجمالي' : 'Total'}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {items.length === 0 ? (
                        <tr>
                          <td colSpan={6} style={{ textAlign: 'center', padding: '24px', color: 'var(--color-text-muted)', fontSize: '0.875rem' }}>
                            {isRtl ? 'لا توجد منتجات مسجلة' : 'No items found'}
                          </td>
                        </tr>
                      ) : (
                        items.map((item, idx) => (
                          <tr key={item.id || idx} style={{ borderBottom: '1px solid var(--color-border)', transition: 'background-color 0.15s ease' }}>
                            <td style={{ padding: '10px 14px', color: 'var(--color-text-muted)', fontSize: '0.8rem' }}>{idx + 1}</td>
                            <td style={{ padding: '10px 14px', fontWeight: 600, fontSize: '0.85rem' }}>
                              <div>{item.product?.name || (isRtl ? 'منتج غير معروف' : 'Unknown Product')}</div>
                              {item.product?.product_code && (
                                <span style={{ fontSize: '0.72rem', fontFamily: 'monospace', color: 'var(--color-text-secondary)', backgroundColor: 'var(--color-background)', border: '1px solid var(--color-border)', padding: '1px 6px', borderRadius: '4px', marginTop: '2px', display: 'inline-block' }}>
                                  {item.product.product_code}
                                </span>
                              )}
                            </td>
                            <td style={{ padding: '10px 14px', fontSize: '0.8125rem', color: 'var(--color-text-secondary)' }}>
                              {item.product?.category?.name || '-'}
                            </td>
                            <td style={{ padding: '10px 14px', textAlign: 'center', fontWeight: 700, fontSize: '0.875rem' }}>
                              {item.quantity} {item.unit?.code || item.unit?.name || ''}
                            </td>
                            <td style={{ padding: '10px 14px', textAlign: isRtl ? 'left' : 'right', fontSize: '0.85rem' }}>
                              {formatCurrency(item.unit_price || item.selling_price || 0)}
                            </td>
                            <td style={{ padding: '10px 14px', textAlign: isRtl ? 'left' : 'right', fontWeight: 700, color: 'var(--color-primary)', fontSize: '0.875rem' }}>
                              {formatCurrency(item.total || (item.quantity * (item.unit_price || 0)))}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* 3. Financial Summary & Payments Row */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px' }}>
                
                {/* Payments Log */}
                <div style={{ border: '1px solid var(--color-border)', borderRadius: '8px', padding: '16px', backgroundColor: 'var(--color-surface)' }}>
                  <h4 style={{ margin: '0 0 12px 0', fontSize: '0.95rem', fontWeight: 700, color: 'var(--color-text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <CreditCard size={18} color="var(--color-primary)" />
                    {isRtl ? 'سجل المدفوعات' : 'Payment History'}
                  </h4>

                  {payments.length > 0 ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {payments.map(p => (
                        <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', backgroundColor: 'var(--color-background)', borderRadius: '6px', border: '1px solid var(--color-border)' }}>
                          <div>
                            <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>{p.payment_method}</div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>{formatDate(p.payment_date || p.created_at)}</div>
                          </div>
                          <div style={{ textAlign: 'right' }}>
                            <div style={{ fontWeight: 700, color: '#10b981', fontSize: '0.9rem' }}>{formatCurrency(p.amount)}</div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>{p.status}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)', fontStyle: 'italic', padding: '12px', textAlign: 'center', backgroundColor: 'var(--color-background)', borderRadius: '6px' }}>
                      {isRtl ? 'لا توجد مدفوعات مسجلة لهذه الفاتورة' : 'No payments recorded for this invoice'}
                    </div>
                  )}
                </div>

                {/* Financial Summary Card */}
                <div style={{ border: '1px solid var(--color-border)', borderRadius: '8px', padding: '16px', backgroundColor: 'var(--color-background)', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem', color: 'var(--color-text-secondary)' }}>
                    <span>{isRtl ? 'المجموع الفرعي:' : 'Subtotal:'}</span>
                    <span style={{ fontWeight: 600, color: 'var(--color-text-primary)' }}>{formatCurrency(sale.subtotal)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem', color: 'var(--color-text-secondary)' }}>
                    <span>{isRtl ? 'الخصم:' : 'Discount:'}</span>
                    <span style={{ fontWeight: 600, color: '#dc2626' }}>- {formatCurrency(sale.discount)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem', color: 'var(--color-text-secondary)', borderBottom: '1px dashed var(--color-border)', paddingBottom: '8px' }}>
                    <span>{isRtl ? 'الضريبة (VAT):' : 'Tax (VAT):'}</span>
                    <span style={{ fontWeight: 600, color: 'var(--color-text-primary)' }}>{formatCurrency(sale.tax)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1.1rem', fontWeight: 700, color: 'var(--color-primary)', paddingTop: '4px' }}>
                    <span>{isRtl ? 'الإجمالي النهائي:' : 'Grand Total:'}</span>
                    <span>{formatCurrency(sale.grand_total)}</span>
                  </div>
                </div>

              </div>

              {/* Notes */}
              {sale.notes && (
                <div style={{ padding: '12px 16px', backgroundColor: 'rgba(234, 179, 8, 0.1)', borderRadius: '8px', border: '1px solid rgba(234, 179, 8, 0.2)' }}>
                  <h4 style={{ margin: '0 0 4px 0', fontSize: '0.85rem', color: '#b45309', fontWeight: 700 }}>
                    {isRtl ? 'ملاحظات الفاتورة' : 'Invoice Notes'}
                  </h4>
                  <p style={{ margin: 0, fontSize: '0.85rem', color: '#92400e' }}>{sale.notes}</p>
                </div>
              )}
            </>
          ) : (
            <div style={{ padding: '40px', textAlign: 'center', color: '#dc2626' }}>
              {isRtl ? 'لم يتم العثور على الفاتورة' : 'Sale not found.'}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div style={{
          padding: '12px 20px', borderTop: '1px solid var(--color-border)',
          backgroundColor: 'var(--color-surface)', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          flexWrap: 'wrap', gap: '10px'
        }}>
          <div>
            {(hasPermission('sales.cancel') || hasPermission('sales.update')) && sale?.status !== 'CANCELLED' && (
              <button
                onClick={handleCancelSale}
                disabled={cancelling}
                className="btn btn-danger"
                style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', padding: '8px 14px', minHeight: '38px' }}
              >
                <XCircle size={16} />
                {cancelling ? (isRtl ? 'جاري الإلغاء...' : 'Cancelling...') : (isRtl ? 'إلغاء الفاتورة' : 'Cancel Sale')}
              </button>
            )}
            {(hasPermission('sales.cancel') || hasPermission('sales.update')) && sale?.status === 'CANCELLED' && (
              <button
                onClick={handleDeleteCancelledSale}
                disabled={deleting}
                className="btn btn-danger"
                style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', padding: '8px 14px', minHeight: '38px' }}
              >
                <Trash2 size={16} />
                {deleting ? (isRtl ? 'جاري الحذف...' : 'Deleting...') : (isRtl ? 'حذف الفاتورة نهائياً' : 'Delete Invoice')}
              </button>
            )}
          </div>
          
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <button 
              onClick={() => printInvoice(sale, items, 'SUPPLYRA', '', language)}
              className="btn btn-secondary"
              style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.85rem', padding: '8px 14px', minHeight: '38px' }}
            >
              <Printer size={16} />
              {isRtl ? 'طباعة الفاتورة' : 'Print Invoice'}
            </button>
            <button
              onClick={onClose}
              className="btn btn-primary"
              style={{ fontSize: '0.85rem', padding: '8px 18px', minHeight: '38px' }}
            >
              {isRtl ? 'إغلاق' : 'Close'}
            </button>
          </div>
        </div>

      </div>

      {isApprovalModalOpen && saleId && (
        <DiscountApprovalModal
          orderId={saleId}
          isOpen={isApprovalModalOpen}
          onClose={() => setIsApprovalModalOpen(false)}
          onSuccess={() => {
            setIsApprovalModalOpen(false);
            fetchSaleDetails();
            onUpdate();
          }}
        />
      )}
    </div>
  );
};

export default SaleDetails;
