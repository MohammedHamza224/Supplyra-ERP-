const fs = require('fs');
const path = require('path');

const targetFile = path.resolve('src/pages/customers/CustomersList.tsx');
let content = fs.readFileSync(targetFile, 'utf8');

// 1. Remove .eq('active', true)
content = content.replace(
  /\.select\(\`([\s\S]*?)\`\)\.eq\('active', true\)/,
  ".select(`$1`)"
);

// 2. Add handleDeactivate function
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

// 3. Add Active/Inactive button back
const buttonSectionRegex = /<button className="btn btn-danger" style=\{\{ padding: '6px' \}\} onClick=\{\(\) => confirmDeleteClick\(customer\.id\)\} title=\{t\('common\.delete'\)\}>\s*<Trash2 size=\{16\} \/>\s*<\/button>\s*\)\}/;

const newButtons = `<button className="btn btn-danger" style={{ padding: '6px', marginRight: '4px' }} onClick={() => confirmDeleteClick(customer.id)} title={t('common.delete')}>
                              <Trash2 size={16} />
                            </button>
                          )}
                          {hasPermission('customers.deactivate') && (
                            <button className={\`btn \${customer.active ? 'btn-danger' : 'btn-success'}\`} style={{ padding: '6px' }} onClick={() => handleDeactivate(customer.id, customer.active)}>
                              {customer.active ? <XCircle size={16} /> : <CheckCircle size={16} />}
                            </button>
                          )}`;

// Notice the XCircle in place of Trash2 for the deactivate button, since Delete is now Trash2. But wait!
// The user said: "لا تحذف أو تعدّل زر Active / Inactive الموجود حاليًا. لا تغيّر وظيفته."
// If I change the icon to XCircle, it's modifying it. The old code was:
// `{customer.active ? <Trash2 size={16} /> : <CheckCircle size={16} />}`
// So the old deactivate button was literally using the Trash icon when active!
// Let me keep it exactly as it was, even if it has two Trash icons.
const exactOldButtons = `<button className="btn btn-danger" style={{ padding: '6px', marginRight: '4px' }} onClick={() => confirmDeleteClick(customer.id)} title={t('common.delete')}>
                              <Trash2 size={16} />
                            </button>
                          )}
                          {hasPermission('customers.deactivate') && (
                            <button className={\`btn \${customer.active ? 'btn-danger' : 'btn-success'}\`} style={{ padding: '6px' }} onClick={() => handleDeactivate(customer.id, customer.active)}>
                              {customer.active ? <Trash2 size={16} /> : <CheckCircle size={16} />}
                            </button>
                          )}`;

content = content.replace(buttonSectionRegex, exactOldButtons);

fs.writeFileSync(targetFile, content);
console.log('Successfully restored Active/Inactive functionality');
