const fs = require('fs');
const path = require('path');

const targetFile = path.resolve('src/pages/customers/CustomersList.tsx');
let content = fs.readFileSync(targetFile, 'utf8');

// 1. Refactor executeDelete
const executeDeleteRegex = /const executeDelete = async \(\) => \{[\s\S]*?fetchCustomers\(\);\s*\}\s*catch\(e: any\)\s*\{\s*setDeleteErrorMsg\(e\.message\);\s*\}\s*finally\s*\{\s*setSaving\(false\);\s*\}\s*\};/;

const newExecuteDelete = `const executeDelete = async () => {
    if (!deleteConfirmId) return;
    const id = deleteConfirmId;
    setSaving(true);
    setDeleteErrorMsg('');
    try {
      // Check dependencies
      const { count: orderCount } = await supabase.from('orders').select('id', { count: 'exact', head: true }).eq('customer_id', id);
      
      if ((orderCount || 0) > 0) {
        throw new Error('لا يمكن حذف العميل لوجود سجلات طلبات مرتبطة به. (Cannot delete customer because they have linked orders)');
      }

      // Perform HARD DELETE
      const { error: deleteError } = await supabase.from('customers').delete().eq('id', id);
      if (deleteError) {
        throw deleteError;
      }
      
      setDeleteConfirmId(null);
      fetchCustomers();
    } catch(e: any) {
       setDeleteErrorMsg(e.message);
    } finally {
      setSaving(false);
    }
  };`;

content = content.replace(executeDeleteRegex, newExecuteDelete);

// 2. Remove handleDeactivate
const handleDeactivateRegex = /const handleDeactivate = async \([\s\S]*?catch\(e: any\)\s*\{\s*alert\(e\.message\);\s*\}\s*\};\s*/;
content = content.replace(handleDeactivateRegex, '');

// 3. Update the buttons in the UI
const actionsRegex = /\{hasPermission\('customers\.delete'\) && \([\s\S]*?\{hasPermission\('customers\.deactivate'\) && \([\s\S]*?<\/button>\s*\)\}/;

const newActions = `{hasPermission('customers.delete') && (
                          <button className="btn btn-danger" style={{ padding: '6px' }} onClick={() => confirmDeleteClick(customer.id)} title={t('common.delete')}>
                            <Trash2 size={16} />
                          </button>
                        )}`;

content = content.replace(actionsRegex, newActions);

fs.writeFileSync(targetFile, content);
console.log('Successfully applied Hard Delete and removed Active/Inactive toggle');
