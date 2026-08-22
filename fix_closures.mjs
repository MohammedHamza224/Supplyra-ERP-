import fs from 'fs';
import path from 'path';

const targetFile = path.resolve('src/pages/products/ProductsList.tsx');
let content = fs.readFileSync(targetFile, 'utf8');

// Fix LOVSelect stale closures
content = content.replace(/onChange=\{\(val\) => setFormData\(\{ \.\.\.formData, category_id: val \}\)\}/g, 'onChange={(val) => setFormData(prev => ({ ...prev, category_id: val }))}');
content = content.replace(/onChange=\{\(val\) => setFormData\(\{ \.\.\.formData, unit_id: val \}\)\}/g, 'onChange={(val) => setFormData(prev => ({ ...prev, unit_id: val }))}');
content = content.replace(/onChange=\{\(val\) => setFormData\(\{ \.\.\.formData, supplier_ids: val \? \[val\] : \[\] \}\)\}/g, 'onChange={(val) => setFormData(prev => ({ ...prev, supplier_ids: val ? [val] : [] }))}');

// Also strictly fix inputs just in case
content = content.replace(/name="warehouse_id"\s*value=\{formData\.warehouse_id\}\s*onChange=\{handleInputChange\}/g, 'name="warehouse_id" value={formData.warehouse_id} onChange={(e) => setFormData(prev => ({...prev, warehouse_id: e.target.value}))}');
content = content.replace(/name="batch_number"\s*value=\{formData\.batch_number\}\s*onChange=\{handleInputChange\}/g, 'name="batch_number" value={formData.batch_number} onChange={(e) => setFormData(prev => ({...prev, batch_number: e.target.value}))}');
content = content.replace(/name="initial_quantity"\s*value=\{formData\.initial_quantity\}\s*onChange=\{handleInputChange\}/g, 'name="initial_quantity" value={formData.initial_quantity} onChange={(e) => setFormData(prev => ({...prev, initial_quantity: e.target.value}))}');

fs.writeFileSync(targetFile, content);
console.log('Fixed stale closures in ProductsList.tsx');
