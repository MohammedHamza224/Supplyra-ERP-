const fs = require('fs');
const path = require('path');
const targetFile = path.resolve('src/pages/suppliers/SuppliersList.tsx');
let content = fs.readFileSync(targetFile, 'utf8');

content = content.replace(
  'setSuppliers(data || []);',
  'console.log("SUPABASE RESPONSE:", data); setSuppliers(data || []);'
);

fs.writeFileSync(targetFile, content, 'utf8');
