const fs = require('fs');
let content = fs.readFileSync('src/pages/inventory/InventoryList.tsx', 'utf8');

const regex = /\{productId && \(\s*<div style=\{\{ display: 'grid', gridTemplateColumns: 'repeat\(auto-fit, minmax\(200px, 1fr\)\)', gap: '16px', marginBottom: '24px' \}\}>[\s\S]*?<\/div>\s*\)\}/;

content = content.replace(regex, '');

fs.writeFileSync('src/pages/inventory/InventoryList.tsx', content, 'utf8');
