const fs = require('fs');
const path = require('path');

const targetFile = path.resolve('src/pages/products/ProductsList.tsx');
let content = fs.readFileSync(targetFile, 'utf8');

content = content.replace(
  /const processedData = \(data \|\| \[\]\)\.map\(product => \{/,
  'const processedData = (data || []).map((product: any) => {'
);

fs.writeFileSync(targetFile, content);
console.log('Fixed typescript error');
