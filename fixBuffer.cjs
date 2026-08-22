const fs = require('fs');
const path = require('path');

const targetFile = path.resolve('src/pages/suppliers/SuppliersList.tsx');
let content = fs.readFileSync(targetFile, 'utf8');

// Use regex to find and replace all Buffer.from(...).toString('utf8') with the decoded string literal
const regex = /Buffer\.from\('([^']+)',\s*'base64'\)\.toString\('utf8'\)/g;

content = content.replace(regex, (match, base64Str) => {
  const decoded = Buffer.from(base64Str, 'base64').toString('utf8');
  return `'${decoded}'`;
});

fs.writeFileSync(targetFile, content, 'utf8');
console.log('Fixed Buffer in SuppliersList.tsx');
