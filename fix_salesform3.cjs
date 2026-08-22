const fs = require('fs');
let content = fs.readFileSync('src/pages/sales/SalesForm.tsx', 'utf8');

const oldRegex = /<\/select>\s*<\/div>\s*<div>\s*<input\s+type="number"\s+required\s+min="0\.01"/;
const replaceWith = `</select>
                        </div>
                        <div>
                          <select
                            required
                            disabled={!item.product_id}
                            value={item.warehouse_id}
                            onChange={(e) => {
                               handleItemChange(index, 'warehouse_id', e.target.value);
                               handleItemChange(index, 'quantity', 1);
                            }}
                            style={{ width: '100%', padding: '6px 8px', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', fontSize: '0.85rem', backgroundColor: 'var(--color-surface)', outline: 'none', opacity: !item.product_id ? 0.5 : 1 }}
                          >
                            <option value="">Select Warehouse...</option>
                            {(stockMap[item.product_id] || []).map((w: any) => (
                               <option key={w.id} value={w.id}>{w.name} (المتاح: {w.qty})</option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <input type="number" required min="0.01"`;

content = content.replace(oldRegex, replaceWith);
fs.writeFileSync('src/pages/sales/SalesForm.tsx', content, 'utf8');
