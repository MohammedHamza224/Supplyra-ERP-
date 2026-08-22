import fs from 'fs';
import path from 'path';

const targetFile = path.resolve('src/pages/products/ProductsList.tsx');
let content = fs.readFileSync(targetFile, 'utf8');

const regex = /<label htmlFor="brand_id"[^>]*>\{t\('products\.brand'\)\}<\/label>\s*<LOVSelect\s*options=\{brands\}\s*value=\{formData\.brand_id\}\s*onChange=\{\(val\) => setFormData\(\{ \.\.\.formData, brand_id: val \}\)\}\s*placeholder=\{t\('products\.selectBrand'\)\}\s*searchPlaceholder=\{t\('common\.search'\)\}\s*\/>/g;

const newJsx = `<label htmlFor="brand_name" style={{ display: 'block', marginBottom: '4px', fontSize: '0.8rem', fontWeight: 500 }}>{t('products.brand')}</label>
                      <input
                        id="brand_name"
                        name="brand_name"
                        type="text"
                        value={formData.brand_name}
                        onChange={handleInputChange}
                        placeholder={t('products.brand')}
                        style={{ width: '100%', padding: '6px 10px', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', outline: 'none', fontSize: '0.85rem', backgroundColor: 'var(--color-background)', color: 'var(--color-text-primary)' }}
                      />`;

content = content.replace(regex, newJsx);

fs.writeFileSync(targetFile, content);
console.log('Replaced JSX');
