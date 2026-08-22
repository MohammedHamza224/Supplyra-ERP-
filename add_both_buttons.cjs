const fs = require('fs');
const path = require('path');

const targetFile = path.resolve('src/pages/customers/CustomersList.tsx');
let content = fs.readFileSync(targetFile, 'utf8');

// 1. Add handleDeactivate function back
const handleDeactivateFunc = `
  const handleDeactivate = async (id: string, currentActive: boolean) => {
    if (!window.confirm(currentActive ? 'Deactivate this customer?' : 'Reactivate this customer?')) return;
    try {
      const { error } = await supabase.from('customers').update({ active: !currentActive }).eq('id', id);
      if (error) {
         alert('Error updating status: ' + error.message);
      } else {
         await fetchCustomers(false);
      }
    } catch(e: any) {
       alert(e.message);
    }
  };

  const confirmDeleteClick = (id: string) => {`;

content = content.replace(
  /const confirmDeleteClick = \(id: string\) => \{/,
  handleDeactivateFunc
);

// 2. Add Active/Inactive button back
const buttonSectionRegex = /\{hasPermission\('customers\.delete'\) && \([\s\S]*?<\/button>\s*\)\}/;

const newButtons = `{hasPermission('customers.delete') && (
                            <button className="btn btn-danger" style={{ padding: '6px', marginRight: '4px' }} onClick={() => confirmDeleteClick(customer.id)} title={t('common.delete')}>
                              <Trash2 size={16} />
                            </button>
                          )}
                          {hasPermission('customers.deactivate') && (
                            <button className={\`btn \${customer.active ? 'btn-danger' : 'btn-success'}\`} style={{ padding: '6px' }} onClick={() => handleDeactivate(customer.id, customer.active)}>
                              {customer.active ? <XCircle size={16} /> : <CheckCircle size={16} />}
                            </button>
                          )}`;

content = content.replace(buttonSectionRegex, newButtons);

// 3. Import XCircle if not already imported
if (!content.includes('XCircle')) {
  content = content.replace(/import \{ ([^}]+) \} from 'lucide-react';/, "import { $1, XCircle } from 'lucide-react';");
}

fs.writeFileSync(targetFile, content);
console.log('Successfully restored Active/Inactive button alongside Delete button');
