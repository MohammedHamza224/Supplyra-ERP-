const fs = require('fs');

let content = fs.readFileSync('src/pages/products/ProductsList.tsx', 'utf-8');

const regex = /<label htmlFor="supplier_ids"([\s\S]*?)value=\{formData.unit_id\}/;
const replacement = `<label htmlFor="supplier_ids" style={{ display: 'block', marginBottom: '4px', fontSize: '0.8rem', fontWeight: 500 }}>{t('products.supplier')}</label>
                    <LOVSelect
                      options={suppliers}
                      value={formData.supplier_ids && formData.supplier_ids.length > 0 ? formData.supplier_ids[0] : ''}
                      onChange={(val) => setFormData({ ...formData, supplier_ids: val ? [val] : [] })}
                      placeholder={suppliers.length === 0 ? (t('products.noSuppliers') || 'لا يوجد موردون') : (t('products.selectSupplier') || 'اختر المورد')}
                      searchPlaceholder={t('common.search') || 'بحث...'}
                      disabled={suppliers.length === 0}
                    />
                  </div>
                  <div>
                    <label htmlFor="unit_id" style={{ display: 'block', marginBottom: '4px', fontSize: '0.8rem', fontWeight: 500 }}>{t('products.unit')} *</label>
                    <LOVSelect
                      options={units}
                      value={formData.unit_id}`;

content = content.replace(regex, replacement);
fs.writeFileSync('src/pages/products/ProductsList.tsx', content, 'utf-8');
console.log('Fixed the truncated end of LOVSelect');
