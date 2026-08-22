const fs = require('fs');
const path = require('path');

const targetFile = path.resolve('src/pages/customers/CustomersList.tsx');
let content = fs.readFileSync(targetFile, 'utf8');

const sConfirmQ = Buffer.from('2YfZhCDYo9mG2Kog2YXYqtij2YPYryDZhdmGINit2LDZgSDZh9iw2Kcg2KfZhNi52YXZitmEINmG2YfYp9im2YrZi9in2J8=', 'base64').toString('utf8');
const sCancel = Buffer.from('2KXZhNi62KfYoQ==', 'base64').toString('utf8');
const sDelete = Buffer.from('2K3YsNmB', 'base64').toString('utf8');
const sConfirmDel = Buffer.from('2KrYo9mD2YrYryDYp9mE2K3YsNmB', 'base64').toString('utf8');

// Replace the modal title
content = content.replace(/<h3 style=\{\{ margin: 0, fontSize: '1\.2rem', color: 'var\(--color-text-primary\)' \}\}>[^<]+<\/h3>/, `<h3 style={{ margin: 0, fontSize: '1.2rem', color: 'var(--color-text-primary)' }}>{language === 'ar' ? '${sConfirmDel}' : 'Confirm Delete'}</h3>`);

// Replace the modal body text
content = content.replace(/<p style=\{\{ margin: '0 0 16px 0', fontSize: '1rem', color: 'var\(--color-text-secondary\)' \}\}>[\s\S]*?<\/p>/, `<p style={{ margin: '0 0 16px 0', fontSize: '1rem', color: 'var(--color-text-secondary)' }}>{language === 'ar' ? '${sConfirmQ}' : 'Are you sure you want to permanently delete this customer?'}</p>`);

// Replace Cancel button text
content = content.replace(/<button type="button" className="btn btn-secondary" onClick=\{\(\) => setDeleteConfirmId\(null\)\} disabled=\{saving\}>\s*[^<]*\s*<\/button>/, `<button type="button" className="btn btn-secondary" onClick={() => setDeleteConfirmId(null)} disabled={saving}>{language === 'ar' ? '${sCancel}' : 'Cancel'}</button>`);

// Replace Delete button text
content = content.replace(/<button type="button" className="btn btn-danger" onClick=\{executeDelete\} disabled=\{saving\}>\s*\{saving \? t\('common.loading'\) : '[^']+'\}\s*<\/button>/, `<button type="button" className="btn btn-danger" onClick={executeDelete} disabled={saving}>{saving ? t('common.loading') : (language === 'ar' ? '${sDelete}' : 'Delete')}</button>`);

// Also fix if it was using a hardcoded corrupted string for Delete button
content = content.replace(/<button type="button" className="btn btn-danger" onClick=\{executeDelete\} disabled=\{saving\}>\s*\{saving \? t\('common.loading'\) : [^}]+\}\s*<\/button>/, `<button type="button" className="btn btn-danger" onClick={executeDelete} disabled={saving}>{saving ? t('common.loading') : (language === 'ar' ? '${sDelete}' : 'Delete')}</button>`);

fs.writeFileSync(targetFile, content);
console.log('Successfully fixed corrupted Arabic text in Confirmation Modal for Customers');
