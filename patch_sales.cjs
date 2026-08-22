const fs = require('fs');

let content = fs.readFileSync('src/pages/sales/SalesForm.tsx', 'utf8');

// The file has:
// const [formData, setFormData] = useState({
//   ...
//   discount: 0,
//   discountReason: '',
//   tax: 0,
//   payment_method: 'CASH'
// });
// We'll add discount_percentage.
content = content.replace(
  "discount: 0,",
  "discount_percentage: 0,\n    discount: 0,"
);

// In calculate:
// const subtotal = calculateSubtotal();
// const grandTotal = subtotal - Number(formData.discount) + Number(formData.tax);
// const discountPercentage = subtotal > 0 ? (Number(formData.discount) / subtotal) * 100 : 0;
// const isDiscountPending = discountPercentage > 5;

const oldCalc = `  const subtotal = calculateSubtotal();
  const grandTotal = subtotal - Number(formData.discount) + Number(formData.tax);
  const discountPercentage = subtotal > 0 ? (Number(formData.discount) / subtotal) * 100 : 0;
  const isDiscountPending = discountPercentage > 5;`;

const newCalc = `  const subtotal = calculateSubtotal();
  // Using user requirement: Discount Amount = Subtotal * (Discount % / 100)
  const discountAmount = subtotal * (Number(formData.discount_percentage) / 100);
  const grandTotal = subtotal - discountAmount + Number(formData.tax);
  const discountPercentage = Number(formData.discount_percentage);
  const isDiscountPending = discountPercentage > 5;`;

content = content.replace(oldCalc, newCalc);

// In handleSubmit:
// discount: Number(formData.discount),
// We need to change to discount: discountAmount
content = content.replace(
  /discount: Number\(formData\.discount\),/g,
  "discount: discountAmount,"
);

// We need to block submit if discount > 5% and NO sales.discount.approve permission
// Replace the block:
/*
      if (isDiscountPending && (!formData.discountReason || formData.discountReason.trim() === '')) {
        throw new Error(t('sales.discountReason') + ' is required');
      }
*/
const oldValidation = `      if (isDiscountPending && (!formData.discountReason || formData.discountReason.trim() === '')) {
        throw new Error(t('sales.discountReason') + ' is required');
      }`;

const newValidation = `      // Discount > 5% check
      if (isDiscountPending) {
        if (!hasPermission('sales.discount.approve')) {
          throw new Error(isRtl 
            ? 'عذراً، ليس لديك صلاحية لاعتماد خصم أكبر من 5%' 
            : 'Permission denied. You do not have permission to approve discounts over 5%');
        }
      }`;

content = content.replace(oldValidation, newValidation);

// Also we need to make sure we don't insert a discount_approvals record anymore
// and we just set discount_approval_status to 'NONE' or 'APPROVED'
// Actually the DB might complain if we set it to 'NONE' and it expects pending, but wait, if it's approved by a user with permission, it should be 'APPROVED' maybe?
// But the requirement says "المستخدم الذي يمتلك الصلاحية .. اسمح بالحفظ"
// Let's just bypass the pending logic completely.
const oldInsert = `          discount_approval_status: isDiscountPending ? 'PENDING' : 'NONE',`;
const newInsert = `          discount_approval_status: isDiscountPending ? 'APPROVED' : 'NONE',`;
content = content.replace(oldInsert, newInsert);

const oldApprovalLogic = `      if (isDiscountPending) {
        // Create discount approval record
        const { error: auditError } = await supabase.from('discount_approvals').insert({
          order_id: order.id,
          requested_by: user?.id,
          discount_percentage: Number(discountPercentage.toFixed(2)),
          discount_amount: Number(formData.discount),
          reason: formData.discountReason,
          status: 'PENDING'
        });
        if (auditError) throw auditError;

        // Fire webhook asynchronously without blocking
        notifyDiscountApproval({
          order_number: order.order_number,
          discount_percentage: Number(discountPercentage.toFixed(2)),
          discount_amount: Number(formData.discount),
          reason: formData.discountReason,
          requested_by: user?.id || ''
        });

      } else {
        // 3. Confirm Sale (Atomic Deduction) - ONLY if discount <= 5%
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
      }`;

const newApprovalLogic = `      // Since the user is verified to have the permission if discount > 5%, we approve and confirm directly
      
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
      }`;

content = content.replace(oldApprovalLogic, newApprovalLogic);

// For UI, we need to replace the old discount input:
const oldUI = `                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', alignItems: 'center' }}>
                  <div style={{ gridColumn: 'span 1', textAlign: isRtl ? 'left' : 'right' }}>
                    <span style={{ color: 'var(--color-text-muted)' }}>{t('sales.discount')}:</span>
                  </div>
                  <div style={{ gridColumn: 'span 1' }}>
                    <input 
                      type="number" 
                      className="form-input" 
                      min="0"
                      value={formData.discount}
                      onChange={(e) => setFormData({ ...formData, discount: Number(e.target.value) })}
                    />
                  </div>
                </div>`;

const newUI = `                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', alignItems: 'center' }}>
                  <div style={{ gridColumn: 'span 1', textAlign: isRtl ? 'left' : 'right' }}>
                    <span style={{ color: 'var(--color-text-muted)' }}>{isRtl ? 'الخصم (%)' : 'Discount (%)'}:</span>
                  </div>
                  <div style={{ gridColumn: 'span 1' }}>
                    <input 
                      type="number" 
                      className="form-input" 
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
                    />
                  </div>
                </div>
                
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', alignItems: 'center' }}>
                  <div style={{ gridColumn: 'span 1', textAlign: isRtl ? 'left' : 'right' }}>
                    <span style={{ color: 'var(--color-text-muted)' }}>{isRtl ? 'قيمة الخصم' : 'Discount Amount'}:</span>
                  </div>
                  <div style={{ gridColumn: 'span 1' }}>
                    <span style={{ fontWeight: 600 }}>{discountAmount.toFixed(2)}</span>
                  </div>
                </div>`;

content = content.replace(oldUI, newUI);

// Remove the "pending" warning and "discountReason" input if they exist
const oldPendingWarning = `              {isDiscountPending && (
                <div style={{ marginTop: '16px', padding: '16px', backgroundColor: '#fffbeb', border: '1px solid #fef3c7', borderRadius: 'var(--radius-md)' }}>
                  <p style={{ margin: '0 0 12px 0', color: '#b45309', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '1.1rem' }}>⚠️</span> {t('sales.discountExceedsLimit') || 'This discount exceeds the allowed limit of 5% and requires manager approval.'}
                  </p>
                  <div>
                    <label className="form-label" style={{ color: '#92400e' }}>
                      {t('sales.discountReason') || 'Discount Reason'} *
                    </label>
                    <textarea 
                      className="form-input" 
                      style={{ width: '100%', borderColor: '#fde68a', backgroundColor: 'white' }}
                      rows={2}
                      value={formData.discountReason}
                      onChange={(e) => setFormData({ ...formData, discountReason: e.target.value })}
                      placeholder="Please specify why this discount is needed..."
                    />
                  </div>
                </div>
              )}`;

content = content.replace(oldPendingWarning, "");

fs.writeFileSync('src/pages/sales/SalesForm.tsx', content);
