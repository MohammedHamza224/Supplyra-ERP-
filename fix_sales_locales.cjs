const fs = require('fs');
const path = require('path');

const filePath = path.resolve('src/pages/sales/SalesList.tsx');
let content = fs.readFileSync(filePath, 'utf8');

// Replace t('...') || '...' with just t('...')
content = content.replace(/t\('([^']+)'\)\s*\|\|\s*'[^']*'/g, "t('$1')");
content = content.replace(/t\('([^']+)'\)\s*\|\|\s*"[^"]*"/g, "t('$1')");

fs.writeFileSync(filePath, content, 'utf8');
console.log('Fixed fallbacks in SalesList.tsx');
