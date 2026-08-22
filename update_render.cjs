const fs = require('fs');
const path = require('path');

const targetFile = path.resolve('src/pages/products/ProductsList.tsx');
let content = fs.readFileSync(targetFile, 'utf8');

const replacement = `
                        style={{
                          padding: '4px 8px',
                          borderRadius: '12px',
                          fontSize: '0.75rem',
                          fontWeight: 500,
                          backgroundColor: (product.active && !product.has_expired_batch) ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                          color: (product.active && !product.has_expired_batch) ? 'rgb(16, 185, 129)' : 'rgb(239, 68, 68)',
                        }}
                      >
                        {(product.active && !product.has_expired_batch) ? t('products.active') : t('products.inactive')}
                      </span>
`;

content = content.replace(
  /style=\{\{\s*padding: '4px 8px',\s*borderRadius: '12px',\s*fontSize: '0\.75rem',\s*fontWeight: 500,\s*backgroundColor: product\.active \? 'rgba\(16, 185, 129, 0\.1\)' : 'rgba\(239, 68, 68, 0\.1\)',\s*color: product\.active \? 'rgb\(16, 185, 129\)' : 'rgb\(239, 68, 68\)',\s*\}\}\s*>\s*\{product\.active \? t\('products\.active'\) : t\('products\.inactive'\)\}\s*<\/span>/,
  replacement
);

fs.writeFileSync(targetFile, content);
console.log('Successfully updated product status rendering.');
