const fs = require('fs');

let content = fs.readFileSync('src/pages/sales/SalesForm.tsx', 'utf8');

const regex = /<div style=\{\{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.85rem' \}\}>\s*<span style=\{\{ color: 'var\(--color-text-muted\)' \}\}>\{t\('sales\.discount'\)\}:<\/span>\s*<input\s*type="number"\s*min="0"\s*step="0\.01"\s*value=\{formData\.discount\}\s*onChange=\{\(e\) => setFormData\(\{ \.\.\.formData, discount: Number\(e\.target\.value\) \}\)\}\s*style=\{\{ width: '80px', padding: '4px 8px', border: '1px solid var\(--color-border\)', borderRadius: 'var\(--radius-sm\)', textAlign: 'right', fontSize: '0\.85rem', outline: 'none' \}\}\s*\/>\s*<\/div>/g;

const newDiscountUI = `                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.85rem' }}>
                    <span style={{ color: 'var(--color-text-muted)' }}>{isRtl ? 'الخصم (%)' : 'Discount (%)'}:</span>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      step="0.01"
                      value={formData.discount_percentage}
                      onChange={(e) => {
                        let val = Number(e.target.value);
                        if (val < 0) val = 0;
                        if (val > 100) val = 100;
                        setFormData({ ...formData, discount_percentage: val });
                      }}
                      style={{ width: '80px', padding: '4px 8px', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)', textAlign: 'right', fontSize: '0.85rem', outline: 'none' }}
                    />
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.85rem' }}>
                    <span style={{ color: 'var(--color-text-muted)' }}>{isRtl ? 'قيمة الخصم' : 'Discount Amount'}:</span>
                    <span style={{ fontWeight: 500, color: '#ef4444' }}>- {discountAmount.toLocaleString(undefined, {minimumFractionDigits: 2})} {t('products.currency')}</span>
                  </div>`;

content = content.replace(regex, newDiscountUI);

fs.writeFileSync('src/pages/sales/SalesForm.tsx', content);
