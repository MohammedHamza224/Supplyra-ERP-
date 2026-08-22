const fs = require('fs');
const path = require('path');

const targetFile = path.resolve('src/pages/products/ProductsList.tsx');
let content = fs.readFileSync(targetFile, 'utf8');

// Set width on Status header
content = content.replace(
  /<th style=\{\{ padding: '12px' \}\}>\{t\('products\.status'\)\}<\/th>/,
  `<th style={{ padding: '12px', width: '100px' }}>{t('products.status')}</th>`
);

// Set width on Actions header
content = content.replace(
  /<th style=\{\{ padding: '12px' \}\}>\{t\('products\.actions'\)\}<\/th>/,
  `<th style={{ padding: '12px', width: '130px', textAlign: 'right' }}>{t('products.actions')}</th>`
);

fs.writeFileSync(targetFile, content);
console.log('Successfully set widths on headers');
