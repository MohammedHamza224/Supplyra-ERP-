const fs = require('fs');
const path = require('path');

const targetFile = path.resolve('src/pages/products/ProductsList.tsx');
let content = fs.readFileSync(targetFile, 'utf8');

content = content.replace(
  /\)\.eq\('active', true\)/,
  ')'
);

fs.writeFileSync(targetFile, content);
console.log('Removed active filter');
