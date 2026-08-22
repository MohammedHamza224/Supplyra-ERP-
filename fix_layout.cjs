const fs = require('fs');
const path = require('path');

const targetFile = path.resolve('src/pages/products/ProductsList.tsx');
let content = fs.readFileSync(targetFile, 'utf8');

// 1. Add whiteSpace: 'nowrap' to the Status badge span
content = content.replace(
  /fontWeight: 500,\s*backgroundColor: \(product\.active && !product\.has_expired_batch\)/,
  `fontWeight: 500,
                            whiteSpace: 'nowrap',
                            backgroundColor: (product.active && !product.has_expired_batch)`
);

// 2. Add whiteSpace: 'nowrap' to the Actions td
content = content.replace(
  /<td style=\{\{ padding: '12px', textAlign: 'right' \}\}>/g,
  `<td style={{ padding: '12px', textAlign: 'right', whiteSpace: 'nowrap' }}>`
);

fs.writeFileSync(targetFile, content);
console.log('Successfully added whiteSpace: nowrap');
