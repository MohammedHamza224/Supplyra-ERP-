const fs = require('fs');
let content = fs.readFileSync('src/pages/sales/SalesForm.tsx', 'utf8');

// Line 88: (data || []).forEach(batch => { const wname = batch.warehouse?.name || 'Unknown'; ...
// Ah, `batch.warehouse` might be an array if it's a one-to-many join or whatever, but actually `warehouse` is a single object or array depending on Supabase mapping. Usually Supabase returns it as `{ name: 'Main' }` or an array `[{ name: 'Main' }]`. The TS type inferred by `data` is `warehouse: { name: any } | { name: any }[] | null`. Let's cast it!
content = content.replace(
  "const wname = batch.warehouse?.name || 'Unknown';",
  "const wname = (Array.isArray(batch.warehouse) ? batch.warehouse[0]?.name : batch.warehouse?.name) || 'Unknown';"
);

// Now let's remove any remaining `(stockMap[p.id] || 0) > 0` and `formData.warehouse_id` references inside JSX map.
// The whole block for `select Product` looks like this:
/*
                          <select
                            required
                            value={item.product_id}
...
                          >
                            <option value="">Select Product...</option>
                            {products
                                .filter(p => !formData.warehouse_id || (stockMap[p.id] || 0) > 0)
                                .map(p => {
                                  const stock = stockMap[p.id] || 0;
                                  const stockText = \` (Stock: \${stock})\`;
                                  return (
                                    <option key={p.id} value={p.id}>
                                      {p.name} {formData.warehouse_id ? stockText : ''}
                                    </option>
                                  );
                              })}
                              {formData.warehouse_id && products.filter(p => (stockMap[p.id] || 0) > 0).length === 0 && (
                                <option disabled>{t('sales.noProductsInWarehouse') || 'U,O  OU^OO_ U.U+OOO O U.OO O-Oc U?US UOO  O U,U.O3OU^O_O1'}</option>
                              )}
                          </select>
*/

// My previous script DID replace this! Wait, maybe it didn't match the exact string?
// Let's replace the ENTIRE select for product using a simple regex since I know what it starts and ends with.
// We'll replace from `<select` that has `value={item.product_id}` until `</select>`.

const regex = /<select\s+required\s+value=\{item\.product_id\}[\s\S]*?<\/select>/;

const newSelect = `<select
                            required
                            value={item.product_id}
                            onChange={(e) => handleItemChange(index, 'product_id', e.target.value)}
                            style={{ width: '100%', padding: '6px 8px', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', fontSize: '0.85rem', backgroundColor: 'var(--color-surface)', outline: 'none' }}
                          >
                            <option value="">Select Product...</option>
                            {products
                                .filter(p => {
                                   const wList = stockMap[p.id] || [];
                                   return wList.length > 0;
                                })
                                .map(p => {
                                  return (
                                    <option key={p.id} value={p.id}>
                                      {p.name}
                                    </option>
                                  );
                              })}
                          </select>`;

content = content.replace(regex, newSelect);


fs.writeFileSync('src/pages/sales/SalesForm.tsx', content, 'utf8');
