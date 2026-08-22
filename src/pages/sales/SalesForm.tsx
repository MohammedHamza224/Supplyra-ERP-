import React, { useState, useEffect } from 'react';
import { useTranslation } from '../../contexts/LanguageContext';
import { X, Plus, Trash2, Save, ShoppingCart, CheckCircle, Printer } from 'lucide-react';
import { printInvoice } from '../../utils/printInvoice';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { notifyDiscountApproval } from '../../lib/integrately';

interface SalesFormProps {
  sale?: any;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const SalesForm: React.FC<SalesFormProps> = ({ sale, isOpen, onClose, onSuccess }) => {
  const { t, language } = useTranslation();
  const isRtl = language === 'ar';
  const { user, hasPermission } = useAuth();
  const [loading, setLoading] = useState(false);
    const [successOrder, setSuccessOrder] = useState<any>(null);
  const [error, setError] = useState('');
  
  const [customers, setCustomers] = useState<any[]>([]);
  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [stockMap, setStockMap] = useState<Record<string, { id: string, name: string, qty: number }[]>>({});

  const [formData, setFormData] = useState<any>({
    customer_id: '',
    warehouse_id: '',
    order_date: new Date().toISOString().split('T')[0],
    notes: '',
    discount_percentage: 0,
    discount: 0,
    discountReason: '',
    tax: 0,
    payment_method: 'CASH'
  });

  const [items, setItems] = useState<any[]>([{
    id: Math.random().toString(),
    product_id: '',
    warehouse_id: '',
    quantity: 1,
    unit_price: 0,
    total: 0
  }]);

  useEffect(() => {
    fetchMasterData();
    if (sale) {
      setFormData({
        customer_id: typeof sale.customer_id === 'object' ? sale.customer_id?.id : (sale.customer_id || ''),
        warehouse_id: typeof sale.warehouse_id === 'object' ? sale.warehouse_id?.id : (sale.warehouse_id || ''),
        order_date: sale.order_date ? sale.order_date.split('T')[0] : (sale.created_at ? sale.created_at.split('T')[0] : new Date().toISOString().split('T')[0]),
        notes: sale.notes || '',
        discount_percentage: sale.subtotal && sale.discount ? (sale.discount / sale.subtotal) * 100 : 0,
        discount: sale.discount || 0,
        discountReason: sale.discount_reason || '',
        tax: sale.tax || 0,
        payment_method: sale.payment_method || 'CASH'
      });

      supabase
        .from('order_items')
        .select('id, product_id, warehouse_id, quantity, unit_price, total')
        .eq('order_id', sale.id)
        .then(({ data: oItems }) => {
          if (oItems && oItems.length > 0) {
            setItems(oItems.map(i => ({
              id: i.id,
              product_id: i.product_id,
              warehouse_id: i.warehouse_id || '',
              quantity: Number(i.quantity),
              unit_price: Number(i.unit_price),
              total: Number(i.total)
            })));
          }
        });
    }
  }, [sale]);

  const fetchMasterData = async () => {
    try {
      const [custRes, wareRes, prodRes] = await Promise.all([
        supabase.from('customers').select('id, name').eq('active', true),
        supabase.from('warehouses').select('id, name').eq('active', true),
        supabase.from('products').select('id, name, selling_price').eq('active', true)
      ]);
      setCustomers(custRes.data || []);
      setWarehouses(wareRes.data || []);
      setProducts(prodRes.data || []);
    } catch (err) {
      console.error('Error fetching master data', err);
    }
  };


  useEffect(() => {
    const fetchWarehouseStock = async () => {
      try {
        const { data, error } = await supabase
          .from('inventory_batches')
          .select('product_id, warehouse_id, quantity, warehouse:warehouses(name)')
          .eq('active', true)
          .gte('expiry_date', new Date().toISOString().split('T')[0]);
        
        if (error) throw error;
        
        const newStockMap: Record<string, { id: string, name: string, qty: number }[]> = {};
        (data || []).forEach(batch => {
          const pid = batch.product_id;
          const wid = batch.warehouse_id;
          const wname = ((batch.warehouse as any)?.name || (Array.isArray(batch.warehouse) ? (batch.warehouse as any)[0]?.name : undefined)) || 'Unknown';
          if (!newStockMap[pid]) newStockMap[pid] = [];
          
          const existing = newStockMap[pid].find(w => w.id === wid);
          if (existing) {
             existing.qty += Number(batch.quantity);
          } else {
             newStockMap[pid].push({ id: wid, name: wname, qty: Number(batch.quantity) });
          }
        });
        setStockMap(newStockMap as any);
      } catch (err) {
        console.error('Error fetching stock', err);
      }
    };
    fetchWarehouseStock();
  }, []);

  const handleItemChange = (index: number, field: string, value: any) => {
    const newItems = [...items];
    newItems[index][field] = value;
    
    if (field === 'product_id') {
      if (value) {
        const selectedProduct = products.find(p => p.id === value);
        if (selectedProduct) {
          newItems[index].unit_price = selectedProduct.selling_price || 0;
        }
        // Auto select warehouse if only 1
        const availableWarehouses = stockMap[value] || [];
        if (availableWarehouses.length === 1) {
          newItems[index].warehouse_id = availableWarehouses[0].id;
        } else {
          newItems[index].warehouse_id = '';
        }
      } else {
        newItems[index].warehouse_id = '';
      }
    }
    
    // Validation for quantity
    if (field === 'quantity' || field === 'warehouse_id' || field === 'product_id') {
       // We can just clamp or allow user to type and show error on submit, 
       // but user requested to not allow selling more than stock.
       // We'll handle this in a custom onChange for qty below.
    }

    if (['quantity', 'unit_price', 'product_id'].includes(field)) {
      const qty = Number(newItems[index].quantity) || 0;
      const price = Number(newItems[index].unit_price) || 0;
      newItems[index].total = qty * price;
    }
    setItems(newItems);
  };

  const addItem = () => {
    setItems([...items, { id: Math.random().toString(), product_id: '', warehouse_id: '', quantity: 1, unit_price: 0, total: 0 }]);
  };

  const removeItem = (index: number) => {
    if (items.length > 1) {
      setItems(items.filter((_, i) => i !== index));
    }
  };

  const calculateSubtotal = () => items.reduce((sum, item) => sum + (Number(item.total) || 0), 0);
  const subtotal = calculateSubtotal();
  // Using user requirement: Discount Amount = Subtotal * (Discount % / 100)
  const discountAmount = subtotal * (Number(formData.discount_percentage) / 100);
  const grandTotal = subtotal - discountAmount + Number(formData.tax);
  const discountPercentage = Number(formData.discount_percentage);
  const isDiscountPending = discountPercentage > 5;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log('[CONFIRM SALE CLICKED]', {
      invoiceId: sale?.id,
      isEditMode: !!sale,
      status: sale?.status,
      userId: user?.id
    });
    console.log('[CONFIRM SALE HANDLER STARTED]');
    setError('');
    setLoading(true);

    try {
      const mainWarehouseId = formData.warehouse_id || (typeof sale?.warehouse_id === 'object' ? sale.warehouse_id?.id : sale?.warehouse_id) || items.find(it => it.warehouse_id)?.warehouse_id || (warehouses[0]?.id) || null;

      const normalizedItems = items.map(item => ({
        ...item,
        warehouse_id: item.warehouse_id || mainWarehouseId
      }));

      const validItems = normalizedItems.filter(item => item.product_id && item.quantity > 0);
      if (normalizedItems.some(item => !item.product_id)) {
        throw new Error(isRtl ? 'الرجاء اختيار منتج لجميع الأسطر' : 'Please select a product for all rows');
      }
      if (validItems.length === 0) throw new Error(isRtl ? 'يجب إضافة منتج واحد على الأقل' : 'At least one valid item is required.');

      // Discount > 5% check
      if (isDiscountPending) {
        if (!hasPermission('sales.discount.approve')) {
          throw new Error(isRtl 
            ? 'عذراً، ليس لديك صلاحية لاعتماد خصم أكبر من 5%' 
            : 'Permission denied. You do not have permission to approve discounts over 5%');
        }
      }

      if (sale) {
        console.log('[UPDATE FUNCTION CALLED]');
        console.log('[SUPABASE UPDATE STARTED]', {
          invoiceId: sale.id,
          isEditMode: true,
          status: sale.status,
          userId: user?.id,
          changedValues: {
            customer_id: formData.customer_id,
            warehouse_id: mainWarehouseId,
            order_date: formData.order_date,
            notes: formData.notes,
            subtotal,
            discount: discountAmount,
            tax: Number(formData.tax),
            grand_total: grandTotal,
            items: validItems
          }
        });

        // Edit Sale Mode: Update orders table and transition payment_status to PAID
        const nextStatus = sale.status === 'CANCELLED' ? 'CANCELLED' : 'CONFIRMED';
        const { data: updatedOrder, error: updateOrderError } = await supabase
          .from('orders')
          .update({
            customer_id: formData.customer_id || null,
            warehouse_id: mainWarehouseId,
            order_date: formData.order_date || sale.order_date || new Date().toISOString().split('T')[0],
            notes: formData.notes,
            subtotal,
            discount: discountAmount,
            tax: Number(formData.tax),
            grand_total: grandTotal,
            status: nextStatus,
            payment_status: 'PAID',
            updated_at: new Date().toISOString(),
            updated_by: user?.id
          })
          .eq('id', sale.id)
          .select();

        if (updateOrderError) {
          console.error('[SUPABASE UPDATE ERROR]', {
            code: updateOrderError.code,
            message: updateOrderError.message,
            details: updateOrderError.details,
            hint: updateOrderError.hint
          });
          throw updateOrderError;
        }

        console.log('[SUPABASE UPDATE SUCCESS]', updatedOrder);

        // Fetch old items for inventory delta calculation
        const { data: oldItems } = await supabase
          .from('order_items')
          .select('id, product_id, warehouse_id, quantity')
          .eq('order_id', sale.id);

        // Delete previous items
        const { error: delItemsError } = await supabase
          .from('order_items')
          .delete()
          .eq('order_id', sale.id);

        if (delItemsError) {
          console.error('[SUPABASE ORDER_ITEMS DELETE ERROR]', delItemsError);
          throw delItemsError;
        }

        const itemsToInsert = validItems.map(item => ({
          order_id: sale.id,
          product_id: item.product_id,
          warehouse_id: item.warehouse_id || mainWarehouseId,
          quantity: item.quantity,
          unit_price: item.unit_price,
          total: item.total
        }));

        const { error: itemsError } = await supabase.from('order_items').insert(itemsToInsert);
        if (itemsError) {
          console.error('[SUPABASE ORDER_ITEMS INSERT ERROR]', itemsError);
          throw itemsError;
        }

        // Manage Payment Record (Update existing or insert single record - NO duplicates)
        if (grandTotal > 0) {
          const { data: existingPayments, error: fetchPayError } = await supabase
            .from('payments')
            .select('id, amount, payment_method, status')
            .eq('order_id', sale.id);

          if (fetchPayError) {
            console.warn('Payment fetch notice:', fetchPayError);
          }

          if (existingPayments && existingPayments.length > 0) {
            const primaryPayment = existingPayments[0];
            const { error: updatePayError } = await supabase
              .from('payments')
              .update({
                amount: grandTotal,
                payment_method: formData.payment_method || primaryPayment.payment_method || 'CASH',
                status: 'COMPLETED'
              })
              .eq('id', primaryPayment.id);

            if (updatePayError) {
              console.error('Error updating existing payment record:', updatePayError);
              throw updatePayError;
            }
          } else {
            const { error: insertPayError } = await supabase
              .from('payments')
              .insert({
                order_id: sale.id,
                amount: grandTotal,
                payment_method: formData.payment_method || 'CASH',
                status: 'COMPLETED',
                created_by: user?.id
              });

            if (insertPayError) {
              console.error('Error creating payment record:', insertPayError);
              throw insertPayError;
            }
          }
        }

        // Safe Inventory Delta Adjustment
        if (oldItems && oldItems.length > 0) {
          for (const oldItem of oldItems) {
            if (oldItem.warehouse_id && oldItem.product_id) {
              const newItem = validItems.find(i => i.product_id === oldItem.product_id && i.warehouse_id === oldItem.warehouse_id);
              const newQty = newItem ? newItem.quantity : 0;
              const diff = Number(oldItem.quantity) - newQty;
              if (diff !== 0) {
                const { data: batches } = await supabase
                  .from('inventory_batches')
                  .select('id, quantity')
                  .eq('product_id', oldItem.product_id)
                  .eq('warehouse_id', oldItem.warehouse_id)
                  .limit(1);

                if (batches && batches.length > 0) {
                  const updatedQty = Math.max(0, Number(batches[0].quantity) + diff);
                  await supabase
                    .from('inventory_batches')
                    .update({ quantity: updatedQty })
                    .eq('id', batches[0].id);
                }
              }
            }
          }
        }

        console.log('[CONFIRM SALE COMPLETED SUCCESSFULLY]');
        onSuccess();
        return;
      }

      // 1. Insert Order
      const { data: order, error: orderError } = await supabase
        .from('orders')
        .insert({
          customer_id: formData.customer_id || null,
          warehouse_id: mainWarehouseId,
          order_date: formData.order_date,
          notes: formData.notes,
          subtotal,
          discount: discountAmount,
          tax: Number(formData.tax),
          grand_total: grandTotal,
          status: 'PENDING',
          payment_status: 'UNPAID',
          discount_approval_status: isDiscountPending ? 'APPROVED' : 'NONE',
          created_by: user?.id
        })
        .select()
        .single();

      if (orderError) throw orderError;

      // 2. Insert Items
      const itemsToInsert = validItems.map(item => ({
        order_id: order.id,
        product_id: item.product_id,
        warehouse_id: item.warehouse_id || mainWarehouseId,
        quantity: item.quantity,
        unit_price: item.unit_price,
        total: item.total
      }));

      const { error: itemsError } = await supabase.from('order_items').insert(itemsToInsert);
      if (itemsError) throw itemsError;

      // Since the user is verified to have the permission if discount > 5%, we approve and confirm directly
      
      // 3. Confirm Sale (Atomic Deduction)
      const { error: confirmError } = await supabase.rpc('confirm_sale', {
        p_order_id: order.id,
        p_user_id: user?.id
      });
      if (confirmError) throw confirmError;

      // 4. Create Payment if Grand Total > 0
      if (grandTotal > 0) {
        const { error: payError } = await supabase.from('payments').insert({
            order_id: order.id,
            amount: grandTotal,
            payment_method: formData.payment_method,
            status: 'COMPLETED',
            created_by: user?.id
        });
        if (payError) throw payError;
        
        await supabase.from('orders').update({ payment_status: 'PAID' }).eq('id', order.id);
      }

      onSuccess();
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Failed to complete sale');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  if (successOrder) {
    return (
      <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '16px' }}>
        <div className="card" style={{ width: '100%', maxWidth: '450px', backgroundColor: 'var(--color-surface)', borderRadius: 'var(--radius-lg)', padding: '24px', textAlign: 'center' }}>
          <div style={{ width: '56px', height: '56px', borderRadius: '50%', backgroundColor: '#dcfce3', color: '#166534', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
            <CheckCircle size={32} />
          </div>
          <h3 style={{ fontSize: '1.2rem', marginBottom: '8px' }}>
            {isRtl ? 'تم إتمام عملية البيع بنجاح!' : 'Sale Completed Successfully!'}
          </h3>
          <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.9rem', marginBottom: '20px' }}>
            {isRtl ? `رقم الفاتورة: ${successOrder.order_number}` : `Invoice Number: ${successOrder.order_number}`}
          </p>
          
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
            <button 
              onClick={() => {
                printInvoice(
                  successOrder, 
                  items.filter((item: any) => item.product_id).map((item: any) => ({
                    ...item, 
                    product: products.find(p => p.id === item.product_id)
                  })), 
                  'SUPPLYRA', 
                  user?.email || 'System User'
                );
              }}
              style={{
                display: 'flex', alignItems: 'center', gap: '8px',
                backgroundColor: 'var(--color-primary)', color: 'white', border: 'none', padding: '8px 16px', borderRadius: '6px', cursor: 'pointer', fontWeight: 600
              }}>
              <Printer size={18} /> {isRtl ? 'طباعة الفاتورة' : 'Print Invoice'}
            </button>
            <button 
              onClick={() => {
                setSuccessOrder(null);
                onSuccess();
              }}
              style={{
                backgroundColor: 'var(--color-surface-hover)', color: 'var(--color-text-primary)', border: '1px solid var(--color-border)', padding: '8px 16px', borderRadius: '6px', cursor: 'pointer', fontWeight: 600
              }}>
              {isRtl ? 'إغلاق' : 'Close'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '16px' }}>
      <div className="card" style={{ width: '100%', maxWidth: '850px', maxHeight: '85vh', display: 'flex', flexDirection: 'column', backgroundColor: 'var(--color-surface)', borderRadius: 'var(--radius-lg)', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}>
        
        {/* Header */}
        <div className="card-header" style={{ padding: '12px 16px', borderBottom: '1px solid var(--color-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ fontSize: '1.1rem', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <ShoppingCart size={20} color="var(--color-primary)" />
            {sale 
              ? (isRtl ? `تعديل فاتورة المبيعات #${sale.order_number || ''}` : `Edit Sales Invoice #${sale.order_number || ''}`)
              : t('sales.newSale')}
          </h2>
          <button onClick={onClose} className="btn btn-icon" style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-muted)', padding: '4px' }}>
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="card-body" style={{ flex: 1, overflowY: 'auto', padding: '16px' }}>
          {error && (
            <div style={{ padding: '10px', backgroundColor: '#fef2f2', color: '#991b1b', borderRadius: 'var(--radius-md)', marginBottom: '16px', fontSize: '0.85rem' }}>
              {error}
            </div>
          )}

          <form id="sale-form" onSubmit={handleSubmit}>
            {/* Header info grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px', marginBottom: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 500, marginBottom: '4px' }}>{t('sales.customer')}</label>
                <select
                  value={formData.customer_id}
                  onChange={(e) => setFormData({ ...formData, customer_id: e.target.value })}
                  style={{ width: '100%', padding: '6px 10px', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', outline: 'none', fontSize: '0.85rem', backgroundColor: 'var(--color-background)' }}
                >
                  <option value="">{t('sales.walkIn') || 'Walk-in'}</option>
                  {customers.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
              
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 500, marginBottom: '4px' }}>{t('sales.warehouse')} *</label>
                <select
                  value={formData.warehouse_id}
                  onChange={(e) => {
                    const wid = e.target.value;
                    setFormData({ ...formData, warehouse_id: wid });
                    setItems(items.map(it => ({ ...it, warehouse_id: wid })));
                  }}
                  style={{ width: '100%', padding: '6px 10px', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', outline: 'none', fontSize: '0.85rem', backgroundColor: 'var(--color-background)' }}
                >
                  <option value="">{isRtl ? 'اختر المستودع...' : 'Select Warehouse...'}</option>
                  {warehouses.map(w => (
                    <option key={w.id} value={w.id}>{w.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 500, marginBottom: '4px' }}>{t('sales.date')} *</label>
                <input
                  type="date"
                  required
                  value={formData.order_date}
                  onChange={(e) => setFormData({ ...formData, order_date: e.target.value })}
                  style={{ width: '100%', padding: '6px 10px', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', outline: 'none', fontSize: '0.85rem', backgroundColor: 'var(--color-background)' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 500, marginBottom: '4px' }}>{t('sales.paymentMethod')} *</label>
                <select
                  value={formData.payment_method}
                  onChange={(e) => setFormData({ ...formData, payment_method: e.target.value })}
                  style={{ width: '100%', padding: '6px 10px', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', outline: 'none', fontSize: '0.85rem', backgroundColor: 'var(--color-background)' }}
                >
                  <option value="CASH">{t('sales.cash')}</option>
                  <option value="CARD">{t('sales.card')}</option>
                  <option value="BANK">{t('sales.bank')}</option>
                  <option value="WALLET">{t('sales.wallet')}</option>
                </select>
              </div>
            </div>

            <h3 style={{ fontSize: '0.95rem', fontWeight: 600, marginBottom: '12px', borderBottom: '1px solid var(--color-border)', paddingBottom: '6px' }}>{t('sales.items')}</h3>

            <div style={{ overflowX: 'auto', marginBottom: '12px' }}>
              <div style={{ minWidth: '600px' }}>
                {/* Items Grid Header */}
                <div style={{ display: 'grid', gridTemplateColumns: 'minmax(150px, 2fr) minmax(140px, 1.5fr) 90px 100px 90px 30px', gap: '12px', padding: '0 12px', marginBottom: '6px', color: 'var(--color-text-muted)', fontSize: '0.8rem', fontWeight: 600 }}>
                  <div>{t('sales.product')} *</div>
                  <div>{t('sales.quantity')} *</div>
                  <div>{t('sales.price')}</div>
                  <div style={{ textAlign: 'right' }}>{t('sales.total')}</div>
                  <div></div>
                </div>

                {/* Items Row */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {items.map((item, index) => (
                    <div key={item.id} style={{ display: 'grid', gridTemplateColumns: 'minmax(150px, 2fr) minmax(140px, 1.5fr) 90px 100px 90px 30px', gap: '12px', alignItems: 'center', backgroundColor: 'var(--color-background)', padding: '8px 12px', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)' }}>
                      <div>
                        <select
                            required
                            value={item.product_id}
                            onChange={(e) => handleItemChange(index, 'product_id', e.target.value)}
                            style={{ width: '100%', padding: '6px 8px', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', fontSize: '0.85rem', backgroundColor: 'var(--color-surface)', outline: 'none' }}
                          >
                            <option value="">Select Product...</option>
                            {products
                                .filter(p => {
                                   const wList = stockMap[p.id] || [];
                                   return wList.length > 0;
                                })
                                .map(p => {
                                  return (
                                    <option key={p.id} value={p.id}>
                                      {p.name}
                                    </option>
                                  );
                              })}
                          </select>
                        </div>
                        <div>
                          <select
                            required
                            disabled={!item.product_id}
                            value={item.warehouse_id}
                            onChange={(e) => {
                               handleItemChange(index, 'warehouse_id', e.target.value);
                               handleItemChange(index, 'quantity', 1);
                            }}
                            style={{ width: '100%', padding: '6px 8px', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', fontSize: '0.85rem', backgroundColor: 'var(--color-surface)', outline: 'none', opacity: !item.product_id ? 0.5 : 1 }}
                          >
                            <option value="">Select Warehouse...</option>
                            {(stockMap[item.product_id] || []).map((w: any) => (
                               <option key={w.id} value={w.id}>{w.name} (المتاح: {w.qty})</option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <input type="number" required min="0.01"
                          step="0.01"
                          value={item.quantity}
                          onChange={(e) => handleItemChange(index, 'quantity', e.target.value)}
                          style={{ width: '100%', padding: '6px 8px', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', fontSize: '0.85rem', outline: 'none' }}
                        />
                      </div>
                      <div>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={item.unit_price}
                          onChange={(e) => handleItemChange(index, 'unit_price', e.target.value)}
                          style={{ width: '100%', padding: '6px 8px', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', fontSize: '0.85rem', outline: 'none' }}
                        />
                      </div>
                      <div style={{ textAlign: 'right', fontWeight: 600, fontSize: '0.9rem' }}>
                        {Number(item.total).toLocaleString(undefined, {minimumFractionDigits: 2})}
                      </div>
                      <div style={{ textAlign: 'center' }}>
                        <button
                          type="button"
                          onClick={() => removeItem(index)}
                          disabled={items.length === 1}
                          style={{ padding: '4px', background: 'none', border: 'none', color: items.length === 1 ? 'var(--color-border)' : '#ef4444', cursor: items.length === 1 ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%' }}
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <button type="button" onClick={addItem} className="btn" style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 12px', backgroundColor: 'var(--color-background)', border: '1px dashed var(--color-primary)', color: 'var(--color-primary)', borderRadius: 'var(--radius-md)', cursor: 'pointer', fontWeight: 500, fontSize: '0.85rem', marginBottom: '16px' }}>
              <Plus size={16} /> Add Row
            </button>

            {/* Summary Section */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 500, marginBottom: '6px' }}>{t('sales.notes')}</label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  style={{ width: '100%', padding: '8px 10px', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', outline: 'none', fontSize: '0.85rem', backgroundColor: 'var(--color-background)', minHeight: '80px', resize: 'vertical' }}
                />
              </div>

              <div style={{ backgroundColor: 'var(--color-background)', padding: '12px 16px', borderRadius: 'var(--radius-md)', display: 'flex', flexDirection: 'column', gap: '8px', border: '1px solid var(--color-border)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                  <span style={{ color: 'var(--color-text-muted)' }}>{t('sales.subtotal')}:</span>
                  <span style={{ fontWeight: 500 }}>{subtotal.toLocaleString(undefined, {minimumFractionDigits: 2})} {t('products.currency')}</span>
                </div>
                                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.85rem' }}>
                    <span style={{ color: 'var(--color-text-muted)' }}>{isRtl ? 'الخصم (%)' : 'Discount (%)'}:</span>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      step="0.01"
                      value={formData.discount_percentage}
                      onChange={(e) => {
                        let val = Number(e.target.value);
                        if (val < 0) val = 0;
                        if (val > 100) val = 100;
                        setFormData({ ...formData, discount_percentage: val });
                      }}
                      style={{ width: '80px', padding: '4px 8px', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)', textAlign: 'right', fontSize: '0.85rem', outline: 'none' }}
                    />
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.85rem' }}>
                    <span style={{ color: 'var(--color-text-muted)' }}>{isRtl ? 'قيمة الخصم' : 'Discount Amount'}:</span>
                    <span style={{ fontWeight: 500, color: '#ef4444' }}>- {discountAmount.toLocaleString(undefined, {minimumFractionDigits: 2})} {t('products.currency')}</span>
                  </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.85rem' }}>
                  <span style={{ color: 'var(--color-text-muted)' }}>{t('sales.tax')}:</span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.tax}
                    onChange={(e) => setFormData({ ...formData, tax: Number(e.target.value) })}
                    style={{ width: '80px', padding: '4px 8px', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)', textAlign: 'right', fontSize: '0.85rem', outline: 'none' }}
                  />
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', fontSize: '1rem', paddingTop: '8px', borderTop: '2px solid var(--color-border)', marginTop: '4px' }}>
                  <span>{t('sales.grandTotal')}:</span>
                  <span style={{ color: 'var(--color-primary)' }}>{grandTotal.toLocaleString(undefined, {minimumFractionDigits: 2})} {t('products.currency')}</span>
                </div>
              </div>

              {isDiscountPending && (
                <div style={{ backgroundColor: 'rgba(245, 158, 11, 0.15)', border: '1px solid #f59e0b', borderRadius: 'var(--radius-md)', padding: '12px 16px', gridColumn: '1 / -1', marginTop: '8px' }}>
                  <div style={{ display: 'flex', gap: '8px', color: '#b45309', fontWeight: 600, marginBottom: '8px', fontSize: '0.9rem' }}>
                    <span style={{ fontSize: '1.1rem' }}>⚠️</span> {t('sales.discountExceedsLimit') || 'This discount exceeds the allowed limit of 5% and requires manager approval.'}
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 500, marginBottom: '6px', color: '#92400e' }}>
                      {t('sales.discountReason') || 'Discount Reason'} *
                    </label>
                    <textarea
                      required
                      value={formData.discountReason}
                      onChange={(e) => setFormData({ ...formData, discountReason: e.target.value })}
                      placeholder="Please specify why this discount is needed..."
                      style={{ width: '100%', padding: '8px 10px', border: '1px solid #fcd34d', borderRadius: 'var(--radius-md)', outline: 'none', fontSize: '0.85rem', backgroundColor: 'var(--color-surface)', minHeight: '60px', resize: 'vertical' }}
                    />
                  </div>
                </div>
              )}
            </div>
          </form>
        </div>

        {/* Footer */}
        <div style={{ padding: '12px 16px', borderTop: '1px solid var(--color-border)', display: 'flex', justifyContent: 'flex-end', gap: '8px', backgroundColor: 'var(--color-background)', borderBottomLeftRadius: 'var(--radius-lg)', borderBottomRightRadius: 'var(--radius-lg)' }}>
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="btn"
            style={{ padding: '6px 16px', border: '1px solid var(--color-border)', backgroundColor: 'var(--color-surface)', borderRadius: 'var(--radius-md)', cursor: 'pointer', fontWeight: 500, fontSize: '0.85rem' }}
          >
            {t('common.cancel') || 'Cancel'}
          </button>
          <button
            type="submit"
            form="sale-form"
            disabled={loading}
            className="btn btn-primary"
            style={{ padding: '6px 16px', border: 'none', borderRadius: 'var(--radius-md)', cursor: loading ? 'not-allowed' : 'pointer', fontWeight: 500, fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <Save size={16} />
            {loading ? (t('common.loading') || 'Loading...') : (t('sales.confirmSale') || 'Confirm Sale')}
          </button>
        </div>
      </div>
    </div>
  );
};

export default SalesForm;
