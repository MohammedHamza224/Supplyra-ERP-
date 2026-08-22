const fs = require('fs');

let content = fs.readFileSync('src/pages/sales/SalesForm.tsx', 'utf8');

// 1. Imports
if (!content.includes('printInvoice')) {
  content = content.replace(
    "import { X, Plus, Trash2, Save, ShoppingCart } from 'lucide-react';",
    "import { X, Plus, Trash2, Save, ShoppingCart, CheckCircle, Printer } from 'lucide-react';\nimport { printInvoice } from '../../utils/printInvoice';"
  );
}

// 2. Add successOrder state
if (!content.includes('const [successOrder, setSuccessOrder] = useState<any>(null);')) {
  content = content.replace(
    "const [loading, setLoading] = useState(false);",
    "const [loading, setLoading] = useState(false);\n    const [successOrder, setSuccessOrder] = useState<any>(null);"
  );
}

// 3. Update handleSubmit
const oldSubmit = `        if (grandTotal > 0) {
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
      } catch (err: any) {`;

const newSubmit = `        if (grandTotal > 0) {
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
  
        setSuccessOrder({ ...order, customer: customers.find(c => c.id === formData.customer_id) });
      } catch (err: any) {`;

if (content.includes(oldSubmit)) {
  content = content.replace(oldSubmit, newSubmit);
}

// 4. Return early if successOrder
const returnEarly = `    if (!isOpen) return null;
  
    return (`;

const newReturnEarly = `    if (!isOpen) return null;

    if (successOrder) {
      return (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '16px' }}>
          <div className="card" style={{ width: '100%', maxWidth: '400px', backgroundColor: 'var(--color-surface)', padding: '24px', borderRadius: '12px', textAlign: 'center', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}>
            <CheckCircle size={48} color="#10b981" style={{ margin: '0 auto 16px' }} />
            <h2 style={{ fontSize: '1.25rem', marginBottom: '8px', color: 'var(--color-text-primary)' }}>{isRtl ? 'تم تسجيل البيع بنجاح ✓' : 'Sale Recorded Successfully ✓'}</h2>
            <p style={{ color: 'var(--color-text-secondary)', marginBottom: '24px' }}>Invoice #{successOrder.id.slice(0,8).toUpperCase()}</p>
            
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
              <button 
                onClick={() => {
                  printInvoice(
                    successOrder, 
                    validItems.map(item => ({
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
  
    return (`;

if (content.includes(returnEarly)) {
  content = content.replace(returnEarly, newReturnEarly);
}

fs.writeFileSync('src/pages/sales/SalesForm.tsx', content);
console.log("Updated SalesForm.tsx");
