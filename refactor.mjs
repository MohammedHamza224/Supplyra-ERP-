import fs from 'fs';
import path from 'path';

const targetFile = path.resolve('src/pages/products/ProductsList.tsx');
let content = fs.readFileSync(targetFile, 'utf8');

// 1. Add new state variables
content = content.replace(
  /const \[editingId, setEditingId\] = useState<string \| null>\(null\);/g,
  `const [editingId, setEditingId] = useState<string | null>(null);\n  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);\n  const [deleteErrorMsg, setDeleteErrorMsg] = useState('');`
);

// 2. Modify fetchProducts to filter out inactive products
content = content.replace(
  /\.select\([\s\S]*?product_suppliers\(supplier_id, is_preferred, suppliers\(name\)\)\s*`\s*\)/g,
  `$&.eq('active', true)`
);

// 3. Replace handleDeactivate and handleDelete with new confirmDeleteClick and executeDelete
const handlerRegex = /const handleDeactivate = async[\s\S]*?const fetchProducts = async/g;
const newHandlers = `
    const confirmDeleteClick = (id: string) => {
      setDeleteConfirmId(id);
      setDeleteErrorMsg('');
    };

    const executeDelete = async () => {
      if (!deleteConfirmId) return;
      const id = deleteConfirmId;
      setSaving(true);
      setDeleteErrorMsg('');
      try {
        const [inventoryRes, orderRes, purchaseRes, supplierRes] = await Promise.all([
          supabase.from('inventory_batches').select('id', { count: 'exact', head: true }).eq('product_id', id),
          supabase.from('order_items').select('id', { count: 'exact', head: true }).eq('product_id', id),
          supabase.from('purchase_items').select('id', { count: 'exact', head: true }).eq('product_id', id),
          supabase.from('product_suppliers').select('product_id', { count: 'exact', head: true }).eq('product_id', id),
        ]);
        
        const hasDependencies = (inventoryRes.count || 0) > 0 || (orderRes.count || 0) > 0 || (purchaseRes.count || 0) > 0 || (supplierRes.count || 0) > 0;
        
        if (hasDependencies) {
          const { error: softDeleteError } = await supabase.from('products').update({ active: false }).eq('id', id);
          if (softDeleteError) throw softDeleteError;
        } else {
          const { error: deleteError } = await supabase.from('products').delete().eq('id', id);
          if (deleteError) {
            const { error: fallbackError } = await supabase.from('products').update({ active: false }).eq('id', id);
            if (fallbackError) throw fallbackError;
          }
        }
        
        setDeleteConfirmId(null);
        fetchProducts();
      } catch(e: any) {
         setDeleteErrorMsg(e.message);
      } finally {
        setSaving(false);
      }
    };

    const fetchProducts = async`;
content = content.replace(handlerRegex, newHandlers);

// 4. Update the UI Actions column
const actionsRegex = /\{hasPermission\('products\.update'\) && \([\s\S]*?<\/Trash2>\s*<\/button>\s*\)\}/g;
const newActions = `{hasPermission('products.update') && (
                        <button 
                          className="btn btn-secondary" 
                          style={{ padding: '6px', marginRight: '4px' }} 
                          onClick={() => openModal(product)}
                          title={t('products.edit')}
                        >
                          <Edit2 size={16} />
                        </button>
                      )}
                      {hasPermission('products.update') && (
                        <button 
                          className="btn btn-secondary" 
                          style={{ padding: '6px', marginRight: '4px' }} 
                          onClick={() => navigate('/inventory?product_id=' + product.id)}
                          title={t('products.manageStock')}
                        >
                          <Package size={16} />
                        </button>
                      )}
                      {hasPermission('products.delete') && (
                        <button 
                          type="button"
                          className="btn btn-danger" 
                          style={{ padding: '6px' }} 
                          onClick={() => confirmDeleteClick(product.id)}
                          title={t('common.delete')}
                        >
                          <Trash2 size={16} />
                        </button>
                      )}`;
content = content.replace(actionsRegex, newActions);

// 5. Insert Delete Modal before the main Modal
const modalRegex = /\{\/\* Modal \*\/\}/g;
const deleteModal = `{/* Delete Confirmation Modal */}
        {deleteConfirmId && (
          <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }}>
            <div className="card" style={{ width: '100%', maxWidth: '400px', backgroundColor: 'var(--color-surface)', borderRadius: 'var(--radius-lg)' }}>
              <div className="card-header" style={{ padding: '16px 20px', borderBottom: '1px solid var(--color-border)' }}>
                <h3 style={{ margin: 0, fontSize: '1.2rem', color: 'var(--color-text-primary)' }}>{t('common.confirmDelete')}</h3>
              </div>
              <div className="card-body" style={{ padding: '20px' }}>
                <p style={{ margin: '0 0 16px 0', fontSize: '1rem', color: 'var(--color-text-secondary)' }}>
                  هل أنت متأكد من حذف هذا المنتج؟
                </p>
                {deleteErrorMsg && (
                  <div style={{ padding: '12px', backgroundColor: 'rgba(239, 68, 68, 0.1)', color: 'rgb(239, 68, 68)', borderRadius: 'var(--radius-md)', marginBottom: '16px', fontSize: '0.875rem' }}>
                    {deleteErrorMsg}
                  </div>
                )}
              </div>
              <div className="card-footer" style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', padding: '16px', borderTop: '1px solid var(--color-border)' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setDeleteConfirmId(null)} disabled={saving}>
                  {t('common.cancel')}
                </button>
                <button type="button" className="btn btn-danger" onClick={executeDelete} disabled={saving}>
                  {saving ? t('common.loading') : t('common.delete')}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal */}`;
content = content.replace(modalRegex, deleteModal);

fs.writeFileSync(targetFile, content);
console.log("Refactor successful");
