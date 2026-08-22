const fs = require('fs');
let content = fs.readFileSync('src/pages/sales/SalesForm.tsx', 'utf8');

const regex = /const wname = \(Array\.isArray\(batch\.warehouse\) \? batch\.warehouse\[0\]\?\.name : batch\.warehouse\?\.name\) \|\| 'Unknown';/;
content = content.replace(regex, "const wname = ((batch.warehouse as any)?.name || (Array.isArray(batch.warehouse) ? (batch.warehouse as any)[0]?.name : undefined)) || 'Unknown';");

fs.writeFileSync('src/pages/sales/SalesForm.tsx', content, 'utf8');
