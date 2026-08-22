const fs = require('fs');
const path = require('path');

const targetFile = path.resolve('src/pages/suppliers/SuppliersList.tsx');
let content = fs.readFileSync(targetFile, 'utf8');

// 1. Add missing state variables
if (!content.includes('deleteConfirmId')) {
  content = content.replace(
    /const \[editingId, setEditingId\] = useState<string \| null>\(null\);/,
    `const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [deleteErrorMsg, setDeleteErrorMsg] = useState('');`
  );
}

// 2. Replace handleDeactivate with confirmDeleteClick and executeDelete
const sConfirmQ = Buffer.from('2YfZhCDYo9mG2Kog2YXYqtij2YPYryDZhdmGINit2LDZgSDYp9mE2YXZiNix2K8g2YbZh9in2KbZitmL2KfYnw==', 'base64').toString('utf8');
const sErrMsg = Buffer.from('2YTYpyDZitmF2YPZhiDYrdiw2YEg2KfZhNmF2YjYsdivINmE2YjYrNmI2K8g2LPYrNmE2KfYqiDZhdix2KrYqNi32Kkg2KjZhy4=', 'base64').toString('utf8');
const sCancel = Buffer.from('2KXZhNi62KfYoQ==', 'base64').toString('utf8');
const sDelete = Buffer.from('2K3YsNmB', 'base64').toString('utf8');
const sConfirmDel = Buffer.from('2KrYo9mD2YrYryDYp9mE2K3YsNmB', 'base64').toString('utf8');

const oldHandleDeactivateRegex = /const handleDeactivate = async \([\s\S]*?catch\(e: any\) \{\s*alert\(e\.message\);\s*\}\s*\};/;

const newDeleteLogic = `const confirmDeleteClick = (id: string) => {
    setDeleteConfirmId(id);
    setDeleteErrorMsg('');
  };

  const executeDelete = async () => {
    if (!deleteConfirmId) return;
    const id = deleteConfirmId;
    setSaving(true);
    setDeleteErrorMsg('');
    try {
      const [prodRes, purRes] = await Promise.all([
        supabase.from('product_suppliers').select('id', { count: 'exact', head: true }).eq('supplier_id', id),
        supabase.from('purchases').select('id', { count: 'exact', head: true }).eq('supplier_id', id)
      ]);
      
      const hasDependencies = (prodRes.count || 0) > 0 || (purRes.count || 0) > 0;
      
      if (hasDependencies) {
        throw new Error('${sErrMsg}');
      }
      
      const { error } = await supabase.from('suppliers').delete().eq('id', id);
      if (error) throw error;
      
      setDeleteConfirmId(null);
      await fetchSuppliers();
    } catch(e: any) {
      setDeleteErrorMsg(e.message);
    } finally {
      setSaving(false);
    }
  };`;

content = content.replace(oldHandleDeactivateRegex, newDeleteLogic);

// 3. Replace the Active/Inactive button in the Actions column
const oldActionBtnRegex = /<button className=\{`btn \$\{supplier\.active \? 'btn-danger' : 'btn-success'\}`\} style=\{\{ padding: '6px' \}\} onClick=\{\(\) => handleDeactivate\(supplier\.id, supplier\.active\)\}>\s*\{supplier\.active \? <Trash2 size=\{16\} \/> : <CheckCircle size=\{16\} \/>\}\s*<\/button>/;

const newActionBtn = `<button className="btn btn-danger" style={{ padding: '6px' }} onClick={() => confirmDeleteClick(supplier.id)} title={t('common.delete')}>
                            <Trash2 size={16} />
                          </button>`;

content = content.replace(oldActionBtnRegex, newActionBtn);

// 4. Inject Modal before {showModal && (
const modalUI = `{deleteConfirmId && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }}>
          <div className="card" style={{ width: '100%', maxWidth: '400px', backgroundColor: 'var(--color-surface)', borderRadius: 'var(--radius-lg)' }}>
            <div className="card-header" style={{ padding: '16px 20px', borderBottom: '1px solid var(--color-border)' }}>
              <h3 style={{ margin: 0, fontSize: '1.2rem', color: 'var(--color-text-primary)' }}>{language === 'ar' ? '${sConfirmDel}' : 'Confirm Delete'}</h3>
            </div>
            <div className="card-body" style={{ padding: '20px' }}>
              <p style={{ margin: '0 0 16px 0', fontSize: '1rem', color: 'var(--color-text-secondary)' }}>
                {language === 'ar' ? '${sConfirmQ}' : 'Are you sure you want to permanently delete this supplier?'}
              </p>
              {deleteErrorMsg && (
                <div style={{ padding: '12px', backgroundColor: 'rgba(239, 68, 68, 0.1)', color: 'rgb(239, 68, 68)', borderRadius: 'var(--radius-md)', marginBottom: '16px', fontSize: '0.875rem' }}>
                  {deleteErrorMsg}
                </div>
              )}
            </div>
            <div className="card-footer" style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', padding: '16px', borderTop: '1px solid var(--color-border)' }}>
              <button type="button" className="btn btn-secondary" onClick={() => setDeleteConfirmId(null)} disabled={saving}>
                {language === 'ar' ? '${sCancel}' : 'Cancel'}
              </button>
              <button type="button" className="btn btn-danger" onClick={executeDelete} disabled={saving}>
                {saving ? t('common.loading') : (language === 'ar' ? '${sDelete}' : 'Delete')}
              </button>
            </div>
          </div>
        </div>
      )}
      
      {showModal && (`;

content = content.replace(/\{showModal && \(/, modalUI);

// 5. Ensure language is defined if used
if (!content.includes('const { t, language } = useTranslation();') && !content.includes('const { language, t } = useTranslation();')) {
   content = content.replace(/const \{ t \} = useTranslation\(\);/, 'const { t, language } = useTranslation();');
}

fs.writeFileSync(targetFile, content);
console.log('Successfully applied delete logic to SuppliersList.tsx');
