const fs = require('fs');
const path = require('path');

const targetFile = path.resolve('src/pages/products/ProductsList.tsx');
let content = fs.readFileSync(targetFile, 'utf8');

// 1. Revert query
content = content.replace(
  /product_suppliers\(supplier_id, is_preferred, suppliers\(name\)\), inventory_batches\(expiry_date\)\s*\n\s*\`\)\s*\n\s*\.order/,
  "product_suppliers(supplier_id, is_preferred, suppliers(name))\n        `).eq('active', true)\n        .order"
);

// 2. Revert fetch data processing
const processDataRegex = /console\.log\('BEFORE setProducts:', data\);\s*const processedData = \(data \|\| \[\]\)\.map\(\(product: any\) => \{\s*let hasExpiredBatch = false;\s*if \(product\.inventory_batches && product\.inventory_batches\.length > 0\) \{\s*const today = new Date\(\);\s*today\.setHours\(0, 0, 0, 0\);\s*const todayTime = today\.getTime\(\);\s*hasExpiredBatch = product\.inventory_batches\.some\(\(batch: any\) => \{\s*if \(!batch\.expiry_date\) return false;\s*const \[yyyy, mm, dd\] = batch\.expiry_date\.split\('-'\);\s*const exp = new Date\(Number\(yyyy\), Number\(mm\) - 1, Number\(dd\), 0, 0, 0, 0\);\s*return exp\.getTime\(\) < todayTime;\s*\}\);\s*\}\s*return \{\s*\.\.\.product,\s*has_expired_batch: hasExpiredBatch\s*\};\s*\}\);\s*setProducts\(processedData\);/;

content = content.replace(
  processDataRegex,
  "console.log('BEFORE setProducts:', data);\n      setProducts(data || []);"
);

// 3. Revert table headers
content = content.replace(
  /<th style=\{\{ padding: '12px', width: '100px' \}\}>\{t\('products\.status'\)\}<\/th>/,
  "<th style={{ padding: '12px' }}>{t('products.status')}</th>"
);
content = content.replace(
  /<th style=\{\{ padding: '12px', width: '130px', textAlign: 'right' \}\}>\{t\('products\.actions'\)\}<\/th>/,
  "<th style={{ padding: '12px' }}>{t('products.actions')}</th>"
);

// 4. Revert <td> and badge styles
const spanStyleRegex = /<span\s*style=\{\{\s*padding: '4px 8px',\s*borderRadius: '12px',\s*fontSize: '0\.75rem',\s*fontWeight: 500,\s*whiteSpace: 'nowrap',\s*backgroundColor: \(product\.active && !product\.has_expired_batch\) \? 'rgba\(16, 185, 129, 0\.1\)' : 'rgba\(239, 68, 68, 0\.1\)',\s*color: \(product\.active && !product\.has_expired_batch\) \? 'rgb\(16, 185, 129\)' : 'rgb\(239, 68, 68\)',\s*\}\}\s*>\s*\{\(product\.active && !product\.has_expired_batch\) \? t\('products\.active'\) : t\('products\.inactive'\)\}\s*<\/span>/;

const originalSpan = `<span
                        style={{
                          padding: '4px 8px',
                          borderRadius: '12px',
                          fontSize: '0.75rem',
                          fontWeight: 500,
                          backgroundColor: product.active ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                          color: product.active ? 'rgb(16, 185, 129)' : 'rgb(239, 68, 68)',
                        }}
                      >
                        {product.active ? t('products.active') : t('products.inactive')}
                      </span>`;

content = content.replace(spanStyleRegex, originalSpan);

// 5. Revert actions td
content = content.replace(
  /<td style=\{\{ padding: '12px', textAlign: 'right', whiteSpace: 'nowrap' \}\}>/g,
  `<td style={{ padding: '12px', textAlign: 'right' }}>`
);

fs.writeFileSync(targetFile, content);
console.log('Successfully reverted all modifications');
