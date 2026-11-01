import React, { useState, useEffect } from 'react';
import { useTranslation } from '../../contexts/LanguageContext';
import { X, Plus, Trash2, Save, ShoppingCart } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import LOVSelect from '../../components/ui/LOVSelect';

interface PurchaseFormProps {
  purchaseId?: string;
  onClose: () => void;
  onSave: () => void;
}

const PurchaseForm: React.FC<PurchaseFormProps> = ({ purchaseId, onClose, onSave }) => {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  // Master data
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [units, setUnits] = useState<any[]>([]);

  // Form State
  const [formData, setFormData] = useState({
    supplier_id: '',
    warehouse_id: '',
    purchase_date: new Date().toISOString().split('T')[0],
    invoice_number: '',
    notes: ''
  });

  const [items, setItems] = useState<any[]>([{
    id: Math.random().toString(),
    product_id: '',
    quantity: 1,
    unit_id: '',
    purchase_price: 0,
    batch_number: '',
    production_date: '',
    expiry_date: '',
    total: 0
  }]);

  const [purchaseNumber, setPurchaseNumber] = useState('');

  useEffect(() => {
    fetchMasterData();
    if (purchaseId) {
      fetchPurchaseDetails();
    }
  }, [purchaseId]);

  const fetchMasterData = async () => {
    try {
      const [suppRes, wareRes, prodRes, unitRes] = await Promise.all([
        supabase.from('suppliers').select('id, name').eq('active', true),
        supabase.from('warehouses').select('id, name').eq('active', true),
        supabase.from('products').select('id, name, unit_id, purchase_price').eq('active', true),
        supabase.from('units').select('id, name, code')
      ]);

      setSuppliers(suppRes.data || []);
      setWarehouses(wareRes.data || []);
      setProducts(prodRes.data || []);
      setUnits(unitRes.data || []);
    } catch (err) {
      console.error('Error fetching master data', err);
    }
  };

  const fetchPurchaseDetails = async () => {
    try {
      setLoading(true);
      setError('');
      const { data: pData, error: pError } = await supabase
        .from('purchases')
        .select('*')
        .eq('id', purchaseId)
        .single();

      if (pError) throw pError;
      if (pData) {
        setPurchaseNumber(pData.purchase_number || '');
        setFormData({
          supplier_id: pData.supplier_id || '',
          warehouse_id: pData.warehouse_id || '',
          purchase_date: pData.purchase_date ? pData.purchase_date.split('T')[0] : new Date().toISOString().split('T')[0],
          invoice_number: pData.invoice_number || '',
          notes: pData.notes || ''
        });

        const { data: iData, error: iError } = await supabase
          .from('purchase_items')
          .select('*')
          .eq('purchase_id', purchaseId);

        if (iError) throw iError;
        if (iData && iData.length > 0) {
          setItems(iData.map(item => ({
            id: item.id,
            product_id: item.product_id,
            quantity: Number(item.quantity) || 1,
            unit_id: item.unit_id || '',
            purchase_price: Number(item.purchase_price) || 0,
            batch_number: item.batch_number || '',
            production_date: item.production_date ? item.production_date.split('T')[0] : '',
            expiry_date: item.expiry_date ? item.expiry_date.split('T')[0] : '',
            total: Number(item.total) || (Number(item.quantity) * Number(item.purchase_price)) || 0
          })));
        }
      }
    } catch (err: any) {
      console.error('Error fetching purchase details:', err);
      setError(err.message || 'Failed to load purchase details');
    } finally {
      setLoading(false);
    }
  };

  const handleItemChange = async (index: number, field: string, value: any) => {
    const newItems = [...items];
    newItems[index][field] = value;
    
    // Auto-fill defaults when product changes
    if (field === 'product_id' && value) {
      const selectedProduct = products.find(p => p.id === value);
      if (selectedProduct) {
        newItems[index].unit_id = selectedProduct.unit_id;
        newItems[index].purchase_price = selectedProduct.purchase_price || 0;
        
        // Try fetching supplier-specific price
        if (formData.supplier_id) {
          const { data: ps } = await supabase
            .from('product_suppliers')
            .select('purchase_price')
            .eq('product_id', value)
            .eq('supplier_id', formData.supplier_id)
            .maybeSingle();
            
          if (ps && ps.purchase_price) {
            newItems[index].purchase_price = ps.purchase_price;
          }
        }
      }
    }

    // Recalculate total
    if (['quantity', 'purchase_price', 'product_id'].includes(field)) {
      const qty = Number(newItems[index].quantity) || 0;
      const price = Number(newItems[index].purchase_price) || 0;
      newItems[index].total = qty * price;
    }

    setItems(newItems);
  };

  const addItem = () => {
    setItems([...items, {
      id: Math.random().toString(),
      product_id: '', quantity: 1, unit_id: '', purchase_price: 0,
      batch_number: '', production_date: '', expiry_date: '', total: 0
    }]);
  };

  const removeItem = (index: number) => {
    if (items.length > 1) {
      setItems(items.filter((_, i) => i !== index));
    }
  };

  const calculateGrandTotal = () => items.reduce((sum, item) => sum + (Number(item.total) || 0), 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (!formData.supplier_id || !formData.warehouse_id) {
        throw new Error('Supplier and Warehouse are required.');
      }
      
      const validItems = items.filter(item => item.product_id && item.quantity > 0);
      if (validItems.length === 0) {
        throw new Error('At least one valid item is required.');
      }

      const grandTotal = calculateGrandTotal();

      if (purchaseId) {
        // UPDATE existing purchase
        const { error: updateError } = await supabase
          .from('purchases')
          .update({
            supplier_id: formData.supplier_id,
            warehouse_id: formData.warehouse_id,
            purchase_date: formData.purchase_date,
            invoice_number: formData.invoice_number,
            notes: formData.notes,
            subtotal: grandTotal,
            grand_total: grandTotal,
            updated_at: new Date().toISOString()
          })
          .eq('id', purchaseId);

        if (updateError) throw updateError;

        // Delete old items
        const { error: delItemsError } = await supabase
          .from('purchase_items')
          .delete()
          .eq('purchase_id', purchaseId);

        if (delItemsError) throw delItemsError;

        // Insert updated items
        const itemsToInsert = validItems.map(item => ({
          purchase_id: purchaseId,
          product_id: item.product_id,
          quantity: item.quantity,
          unit_id: item.unit_id || null,
          purchase_price: item.purchase_price,
          total: item.total,
          batch_number: item.batch_number || null,
          production_date: item.production_date || null,
          expiry_date: item.expiry_date || null
        }));

        const { error: itemsError } = await supabase
          .from('purchase_items')
          .insert(itemsToInsert);

        if (itemsError) throw itemsError;

        onSave();
        return;
      }

      // Insert Purchase (Draft)
      const { data: purchase, error: purchaseError } = await supabase
        .from('purchases')
        .insert({
          supplier_id: formData.supplier_id,
          warehouse_id: formData.warehouse_id,
          purchase_date: formData.purchase_date,
          invoice_number: formData.invoice_number,
          notes: formData.notes,
          subtotal: grandTotal,
          grand_total: grandTotal,
          status: 'DRAFT',
          payment_status: 'UNPAID'
        })
        .select()
        .single();

      if (purchaseError) throw purchaseError;

      // Insert Items
      const itemsToInsert = validItems.map(item => ({
        purchase_id: purchase.id,
        product_id: item.product_id,
        quantity: item.quantity,
        unit_id: item.unit_id,
        purchase_price: item.purchase_price,
        total: item.total,
        batch_number: item.batch_number || null,
        production_date: item.production_date || null,
        expiry_date: item.expiry_date || null
      }));

      const { error: itemsError } = await supabase.from('purchase_items').insert(itemsToInsert);
      if (itemsError) throw itemsError;

      onSave();
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Failed to save purchase');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1000,
      display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '16px'
    }}>
      <div style={{
        backgroundColor: 'var(--color-surface)', width: '100%', maxWidth: '900px',
        maxHeight: '90vh', borderRadius: 'var(--radius-lg)', display: 'flex', flexDirection: 'column',
        boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)'
      }}>
        {/* Header */}
        <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--color-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ fontSize: '1.1rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <ShoppingCart size={20} color="var(--color-primary)" />
            {purchaseId 
              ? `${t('purchases.edit') || 'Edit Purchase'} ${purchaseNumber ? `#${purchaseNumber}` : ''}`
              : t('purchases.newPurchase')}
          </h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-muted)' }}>
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div style={{ padding: '16px', overflowY: 'auto', flex: 1 }}>
          {error && <div style={{ padding: '10px', backgroundColor: '#fef2f2', color: '#991b1b', borderRadius: 'var(--radius-md)', marginBottom: '16px', fontSize: '0.85rem' }}>{error}</div>}
          
          <form id="purchaseForm" onSubmit={handleSubmit}>
            {/* Header section */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px', marginBottom: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 500, marginBottom: '6px' }}>{t('purchases.supplier')} *</label>
                <LOVSelect
                  options={suppliers}
                  value={formData.supplier_id}
                  onChange={(val) => setFormData({...formData, supplier_id: val})}
                  placeholder={t('purchases.supplier')}
                  searchPlaceholder={t('common.search')}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 500, marginBottom: '6px' }}>{t('purchases.warehouse')} *</label>
                <LOVSelect
                  options={warehouses}
                  value={formData.warehouse_id}
                  onChange={(val) => setFormData({...formData, warehouse_id: val})}
                  placeholder={t('purchases.warehouse')}
                  searchPlaceholder={t('common.search')}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 500, marginBottom: '4px' }}>{t('purchases.date')} *</label>
                <input type="date" required value={formData.purchase_date} onChange={e => setFormData({...formData, purchase_date: e.target.value})} style={{ width: '100%', padding: '6px 10px', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', outline: 'none', fontSize: '0.85rem' }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 500, marginBottom: '4px' }}>{t('purchases.invoiceNumber')}</label>
                <input type="text" value={formData.invoice_number} onChange={e => setFormData({...formData, invoice_number: e.target.value})} style={{ width: '100%', padding: '6px 10px', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', outline: 'none', fontSize: '0.85rem' }} />
              </div>
            </div>

            {/* Items Section */}
            <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '12px', borderBottom: '1px solid var(--color-border)', paddingBottom: '6px' }}>{t('purchases.items')}</h3>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '16px' }}>
              {items.map((item, index) => (
                <div key={item.id} style={{ display: 'flex', gap: '12px', alignItems: 'flex-start', flexWrap: 'wrap', backgroundColor: 'var(--color-background)', padding: '12px', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)' }}>
                  
                  {/* Item Left block - main details */}
                  <div style={{ flex: '1 1 280px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 130px), 1fr))', gap: '10px' }}>
                      <div style={{ gridColumn: '1 / -1' }}>
                        <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 500, marginBottom: '4px' }}>{t('purchases.product')} *</label>
                        <select
                          required
                          value={item.product_id}
                          onChange={e => handleItemChange(index, 'product_id', e.target.value)}
                          style={{ width: '100%', padding: '6px 8px', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', outline: 'none', fontSize: '0.85rem', backgroundColor: 'var(--color-surface)' }}
                        >
                          <option value="">{t('products.selectProduct') || 'Select Product'}</option>
                          {products.map(p => <option key={p.id} value={p.id}>{p.name} {p.product_code ? `(${p.product_code})` : ''}</option>)}
                        </select>
                      </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 500, marginBottom: '4px' }}>{t('purchases.quantity')} *</label>
                      <input type="number" min="0.01" step="0.01" required value={item.quantity} onChange={e => handleItemChange(index, 'quantity', e.target.value)} style={{ width: '100%', padding: '6px 8px', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', fontSize: '0.85rem' }} />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 500, marginBottom: '4px' }}>{t('purchases.purchasePrice')} *</label>
                      <input type="number" min="0" step="0.01" required value={item.purchase_price} onChange={e => handleItemChange(index, 'purchase_price', e.target.value)} style={{ width: '100%', padding: '6px 8px', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', fontSize: '0.85rem' }} />
                    </div>
                    
                    {/* Expiry Details row */}
                    <div>
                      <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 500, marginBottom: '4px' }}>{t('purchases.batch')}</label>
                      <input type="text" value={item.batch_number} onChange={e => handleItemChange(index, 'batch_number', e.target.value)} style={{ width: '100%', padding: '6px 8px', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', fontSize: '0.85rem' }} />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 500, marginBottom: '4px' }}>{t('purchases.productionDate')}</label>
                      <input type="date" value={item.production_date} onChange={e => handleItemChange(index, 'production_date', e.target.value)} style={{ width: '100%', padding: '6px 8px', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', fontSize: '0.85rem' }} />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 500, marginBottom: '4px' }}>{t('purchases.expiryDate')}</label>
                      <input type="date" value={item.expiry_date} onChange={e => handleItemChange(index, 'expiry_date', e.target.value)} style={{ width: '100%', padding: '6px 8px', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', fontSize: '0.85rem' }} />
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', borderTop: '1px solid var(--color-border)', paddingTop: '8px', marginTop: '4px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '0.8rem', fontWeight: 500, color: 'var(--color-text-secondary)' }}>{t('purchases.total')}:</span>
                      <span style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--color-primary)' }}>{Number(item.total).toLocaleString()} {t('products.currency')}</span>
                    </div>

                    <button type="button" onClick={() => removeItem(index)} disabled={items.length === 1} style={{ padding: '6px 10px', background: 'rgba(239, 68, 68, 0.1)', border: 'none', borderRadius: 'var(--radius-sm)', color: items.length === 1 ? '#ccc' : '#ef4444', cursor: items.length === 1 ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.8rem' }}>
                      <Trash2 size={16} />
                      <span>{t('common.delete') || 'Delete'}</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <button type="button" onClick={addItem} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 12px', backgroundColor: 'var(--color-background)', border: '1px dashed var(--color-primary)', color: 'var(--color-primary)', borderRadius: 'var(--radius-md)', cursor: 'pointer', fontWeight: 500, fontSize: '0.85rem' }}>
              <Plus size={16} /> {t('purchases.addProduct')}
            </button>
            
          </form>
        </div>

        {/* Footer */}
        <div style={{ padding: '12px 16px', borderTop: '1px solid var(--color-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'var(--color-background)', flexWrap: 'wrap', gap: '10px' }}>
          <div style={{ fontSize: '1.1rem', fontWeight: 600 }}>
            {t('purchases.grandTotal')}: <span style={{ color: 'var(--color-primary)' }}>{calculateGrandTotal().toLocaleString()} {t('products.currency')}</span>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button onClick={onClose} type="button" style={{ padding: '8px 16px', border: '1px solid var(--color-border)', backgroundColor: 'var(--color-surface)', borderRadius: 'var(--radius-md)', cursor: 'pointer', fontWeight: 500, fontSize: '0.85rem' }}>
              {t('common.cancel')}
            </button>
            <button form="purchaseForm" type="submit" disabled={loading} style={{ padding: '8px 16px', border: 'none', backgroundColor: 'var(--color-primary)', color: 'white', borderRadius: 'var(--radius-md)', cursor: loading ? 'not-allowed' : 'pointer', fontWeight: 500, fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Save size={16} /> {loading ? t('common.saving') : t('common.save')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PurchaseForm;
