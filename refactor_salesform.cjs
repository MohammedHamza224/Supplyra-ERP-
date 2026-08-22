const fs = require('fs');

let content = fs.readFileSync('src/pages/sales/SalesForm.tsx', 'utf8');

// 1. Remove warehouse_id from formData
content = content.replace(
  "warehouse_id: '',",
  ""
);

// 2. Remove warehouse_id from top form inputs
content = content.replace(
  /<div>\s*<label[^>]*>Warehouse \*<\/label>\s*<select[\s\S]*?<\/select>\s*<\/div>/,
  ''
);

// 3. Update items state to include warehouse_id
content = content.replace(
  "product_id: '',",
  "product_id: '',\n    warehouse_id: '',"
);

// 4. Update fetchWarehouseStock to fetch all stock and group by product and warehouse
const oldFetch = `    const fetchWarehouseStock = async () => {
      if (!formData.warehouse_id) {
        setStockMap({});
        return;
      }
      try {
        const { data, error } = await supabase
          .from('inventory_batches')
          .select('product_id, quantity')
          .eq('warehouse_id', formData.warehouse_id)
          .eq('active', true)
          .gte('expiry_date', new Date().toISOString().split('T')[0]);
        
        if (error) throw error;
        
        const newStockMap: Record<string, number> = {};
        (data || []).forEach(batch => {
          newStockMap[batch.product_id] = (newStockMap[batch.product_id] || 0) + Number(batch.quantity);
        });
        setStockMap(newStockMap);
      } catch (err) {
        console.error('Error fetching stock for warehouse', err);
      }
    };
    fetchWarehouseStock();
  }, [formData.warehouse_id]);`;

const newFetch = `    const fetchWarehouseStock = async () => {
      try {
        const { data, error } = await supabase
          .from('inventory_batches')
          .select('product_id, warehouse_id, quantity, warehouse:warehouses(name)')
          .eq('active', true)
          .gte('expiry_date', new Date().toISOString().split('T')[0]);
        
        if (error) throw error;
        
        const newStockMap: Record<string, { id: string, name: string, qty: number }[]> = {};
        (data || []).forEach(batch => {
          const pid = batch.product_id;
          const wid = batch.warehouse_id;
          const wname = batch.warehouse?.name || 'Unknown';
          if (!newStockMap[pid]) newStockMap[pid] = [];
          
          const existing = newStockMap[pid].find(w => w.id === wid);
          if (existing) {
             existing.qty += Number(batch.quantity);
          } else {
             newStockMap[pid].push({ id: wid, name: wname, qty: Number(batch.quantity) });
          }
        });
        setStockMap(newStockMap as any);
      } catch (err) {
        console.error('Error fetching stock', err);
      }
    };
    fetchWarehouseStock();
  }, []);`;

content = content.replace(oldFetch, newFetch);

// 5. Update handleItemChange to handle product_id change -> auto select warehouse
const oldHandleChange = `    if (field === 'product_id' && value) {
      const selectedProduct = products.find(p => p.id === value);
      if (selectedProduct) {
        newItems[index].unit_price = selectedProduct.selling_price || 0;
      }
    }`;

const newHandleChange = `    if (field === 'product_id') {
      if (value) {
        const selectedProduct = products.find(p => p.id === value);
        if (selectedProduct) {
          newItems[index].unit_price = selectedProduct.selling_price || 0;
        }
        // Auto select warehouse if only 1
        const availableWarehouses = stockMap[value] || [];
        if (availableWarehouses.length === 1) {
          newItems[index].warehouse_id = availableWarehouses[0].id;
        } else {
          newItems[index].warehouse_id = '';
        }
      } else {
        newItems[index].warehouse_id = '';
      }
    }
    
    // Validation for quantity
    if (field === 'quantity' || field === 'warehouse_id' || field === 'product_id') {
       // We can just clamp or allow user to type and show error on submit, 
       // but user requested to not allow selling more than stock.
       // We'll handle this in a custom onChange for qty below.
    }`;
content = content.replace(oldHandleChange, newHandleChange);

// 6. Update addItem to have warehouse_id
content = content.replace(
  "setItems([...items, { id: Math.random().toString(), product_id: '', quantity: 1, unit_price: 0, total: 0 }]);",
  "setItems([...items, { id: Math.random().toString(), product_id: '', warehouse_id: '', quantity: 1, unit_price: 0, total: 0 }]);"
);

// 7. Update gridTemplateColumns
content = content.replace(
  /gridTemplateColumns: 'minmax\(150px, 2fr\) 90px 110px 100px 30px'/g,
  "gridTemplateColumns: 'minmax(150px, 2fr) minmax(140px, 1.5fr) 90px 100px 90px 30px'"
);

// 8. Update items grid header
const oldHeader = `                    <div>{t('sales.product')} *</div>
                    <div>{t('sales.quantity')} *</div>
                    <div>{t('sales.price')}</div>
                    <div style={{ textAlign: 'right' }}>{t('sales.total')}</div>`;

const newHeader = `                    <div>{t('sales.product')} *</div>
                    <div>Warehouse *</div>
                    <div>{t('sales.quantity')} *</div>
                    <div>{t('sales.price')}</div>
                    <div style={{ textAlign: 'right' }}>{t('sales.total')}</div>`;
content = content.replace(oldHeader, newHeader);

// 9. Update the items mapping to render the new warehouse column
const oldItemMapStart = `<select
                            required
                            value={item.product_id}
                            onChange={(e) => handleItemChange(index, 'product_id', e.target.value)}
                            style={{ width: '100%', padding: '6px 8px', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', fontSize: '0.85rem', backgroundColor: 'var(--color-surface)', outline: 'none' }}
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
                                <option disabled>{t('sales.noProductsInWarehouse') || 'U,O  OU^OO_ U.U+OOO O U.OO OOc U?US UOO  O U,U.O3OU^O_O1'}</option>
                              )}
                          </select>
                        </div>
                        <div>
                          <input`;

const newItemMapStart = `<select
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
                          </select>
                        </div>
                        <div>
                          <select
                            required
                            disabled={!item.product_id}
                            value={item.warehouse_id}
                            onChange={(e) => {
                               handleItemChange(index, 'warehouse_id', e.target.value);
                               // Reset qty to 1 when changing warehouse to avoid overstock errors
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
                          <input`;
content = content.replace(oldItemMapStart, newItemMapStart);

// 10. Update Qty validation
const oldQtyInput = `value={item.quantity}
                            onChange={(e) => handleItemChange(index, 'quantity', e.target.value)}`;

const newQtyInput = `value={item.quantity}
                            onChange={(e) => {
                              const val = Number(e.target.value);
                              const wList = stockMap[item.product_id] || [];
                              const selectedW = wList.find((w: any) => w.id === item.warehouse_id);
                              if (selectedW && val > selectedW.qty) {
                                alert(isRtl ? 'الكمية المطلوبة أكبر من المخزون المتاح في هذا المستودع.' : 'Quantity requested exceeds available stock in this warehouse.');
                                handleItemChange(index, 'quantity', selectedW.qty);
                              } else {
                                handleItemChange(index, 'quantity', e.target.value);
                              }
                            }}`;
content = content.replace(oldQtyInput, newQtyInput);

// 11. Update handleSubmit to include warehouse_id and remove order warehouse_id
content = content.replace(
  "if (!formData.warehouse_id) throw new Error('Warehouse is required.');",
  ""
);

content = content.replace(
  "warehouse_id: formData.warehouse_id,",
  ""
);

// In itemsToInsert, map warehouse_id
const oldItemsToInsert = `      const itemsToInsert = validItems.map(item => ({
        order_id: order.id,
        product_id: item.product_id,
        quantity: item.quantity,
        unit_price: item.unit_price,
        total: item.total
      }));`;

const newItemsToInsert = `      const itemsToInsert = validItems.map(item => ({
        order_id: order.id,
        product_id: item.product_id,
        warehouse_id: item.warehouse_id,
        quantity: item.quantity,
        unit_price: item.unit_price,
        total: item.total
      }));`;
content = content.replace(oldItemsToInsert, newItemsToInsert);

// Fix empty product check (Error if no product or warehouse selected)
const oldValidItems = `const validItems = items.filter(item => item.product_id && item.quantity > 0);`;
const newValidItems = `const validItems = items.filter(item => item.product_id && item.warehouse_id && item.quantity > 0);
      if (items.some(item => !item.product_id)) {
        throw new Error(isRtl ? 'الرجاء اختيار منتج لجميع الأسطر' : 'Please select a product for all rows');
      }
      if (items.some(item => item.product_id && !item.warehouse_id)) {
        throw new Error(isRtl ? 'الرجاء اختيار مستودع لجميع المنتجات' : 'Please select a warehouse for all products');
      }`;
content = content.replace(oldValidItems, newValidItems);


fs.writeFileSync('src/pages/sales/SalesForm.tsx', content, 'utf8');
console.log('Refactored SalesForm.tsx for per-item warehouse');
