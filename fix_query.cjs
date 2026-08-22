const fs = require('fs');
const path = require('path');

const targetFile = path.resolve('src/pages/products/ProductsList.tsx');
let content = fs.readFileSync(targetFile, 'utf8');

content = content.replace(
  /product_suppliers\(supplier_id, is_preferred, suppliers\(name\)\)/,
  'product_suppliers(supplier_id, is_preferred, suppliers(name)), inventory_batches(expiry_date)'
);

fs.writeFileSync(targetFile, content);
console.log('Added inventory_batches to fetchProducts query.');
