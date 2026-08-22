const fs = require('fs');
const path = require('path');

const filePath = path.resolve('src/pages/products/ProductsList.tsx');
let content = fs.readFileSync(filePath, 'utf8');

// Use regex to replace t('something') || 'fallback string' with just t('something')
content = content.replace(/t\('([^']+)'\)\s*\|\|\s*'[^']*'/g, "t('$1')");
content = content.replace(/t\('([^']+)'\)\s*\|\|\s*"[^"]*"/g, "t('$1')");

fs.writeFileSync(filePath, content, 'utf8');
console.log('Fixed fallbacks in ProductsList.tsx');
