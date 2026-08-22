const fs = require('fs');
const path = require('path');

const targetFile = path.resolve('src/pages/warehouses/WarehousesList.tsx');
let content = fs.readFileSync(targetFile, 'utf8');

// 1. Imports
if (!content.includes('useNavigate')) {
  content = content.replace(
    /import React, { useState, useEffect } from 'react';/,
    `import React, { useState, useEffect } from 'react';\nimport { useNavigate } from 'react-router-dom';`
  );
}

if (!content.includes('Building,')) {
  content = content.replace(
    /import {([^}]+)} from 'lucide-react';/,
    "import { Building, $1 } from 'lucide-react';"
  );
}

// 2. Add State inside component
content = content.replace(
  /const \[editingId, setEditingId\] = useState<string \| null>\(null\);/,
  `const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [deleteErrorMsg, setDeleteErrorMsg] = useState('');
  const navigate = useNavigate();`
);

// 3. Transform handleDelete to executeDelete
const oldHandleDelete = /const handleDelete = async \(id: string\) => \{[\s\S]*?\}\s*catch\s*\(e:\s*any\)\s*\{\s*alert\(e\.message\);\s*\}\s*\};/;

const newExecuteDelete = `const confirmDeleteClick = (id: string) => {
    setDeleteConfirmId(id);
    setDeleteErrorMsg('');
  };

  const executeDelete = async () => {
    if (!deleteConfirmId) return;
    const id = deleteConfirmId;
    setSaving(true);
    setDeleteErrorMsg('');
    try {
      const [inventoryRes, orderRes, purchaseRes] = await Promise.all([
        supabase.from('inventory_batches').select('id', { count: 'exact', head: true }).eq('warehouse_id', id),
        supabase.from('orders').select('id', { count: 'exact', head: true }).eq('warehouse_id', id),
        supabase.from('purchases').select('id', { count: 'exact', head: true }).eq('warehouse_id', id),
      ]);

      const hasDependencies = 
        (inventoryRes.count || 0) > 0 || 
        (orderRes.count || 0) > 0 || 
        (purchaseRes.count || 0) > 0;

      if (hasDependencies) {
        throw new Error(t('warehouses.cannotDeleteDependencies') || 'Cannot delete warehouse because it is linked to inventory, orders, or purchases.');
      }

      const { error } = await supabase.from('warehouses').delete().eq('id', id);
      if (error) throw error;
      
      setDeleteConfirmId(null);
      await fetchWarehouses();
    } catch(e: any) {
      setDeleteErrorMsg(e.message);
    } finally {
      setSaving(false);
    }
  };`;

content = content.replace(oldHandleDelete, newExecuteDelete);

// 4. Update the Action buttons
const oldActions = /<td style=\{\{ textAlign: 'right', display: 'flex', justifyContent: 'flex-end', gap: '4px' \}\}>[\s\S]*?<\/td>/;

const newActions = `<td style={{ textAlign: 'right' }}>
                        {hasPermission('warehouses.update') && (
                          <button type="button" className="btn btn-secondary" style={{ padding: '6px', marginRight: '4px' }} onClick={() => openModal(warehouse)} title={t('common.edit')}>
                            <Edit2 size={16} />
                          </button>
                        )}
                        {hasPermission('warehouses.update') && (
                          <button type="button" className="btn btn-secondary" style={{ padding: '6px', marginRight: '4px' }} onClick={() => navigate('/inventory?warehouse_id=' + warehouse.id)} title={t('warehouses.manage') || 'Manage Warehouse'}>
                            <Building size={16} />
                          </button>
                        )}
                        {hasPermission('warehouses.delete') && (
                          <button type="button" className="btn btn-danger" style={{ padding: '6px' }} onClick={() => confirmDeleteClick(warehouse.id)} title={t('common.delete')}>
                            <Trash2 size={16} />
                          </button>
                        )}
                      </td>`;

content = content.replace(oldActions, newActions);

// 5. Add Delete Confirmation Modal just before {showModal && (
const modalUI = `{deleteConfirmId && (
          <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }}>
            <div className="card" style={{ width: '100%', maxWidth: '400px', backgroundColor: 'var(--color-surface)', borderRadius: 'var(--radius-lg)' }}>
              <div className="card-header" style={{ padding: '16px 20px', borderBottom: '1px solid var(--color-border)' }}>
                <h3 style={{ margin: 0, fontSize: '1.2rem', color: 'var(--color-text-primary)' }}>{t('common.confirmDelete')}</h3>
              </div>
              <div className="card-body" style={{ padding: '20px' }}>
                <p style={{ margin: '0 0 16px 0', fontSize: '1rem', color: 'var(--color-text-secondary)' }}>
                  {t('common.deleteConfirm')}
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
        
        {showModal && (`;

content = content.replace(/\{showModal && \(/, modalUI);

fs.writeFileSync(targetFile, content);
console.log('Successfully aligned Warehouses actions with Products actions');
