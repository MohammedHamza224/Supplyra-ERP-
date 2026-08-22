const fs = require('fs');
const path = require('path');

const filePath = path.resolve('src/pages/sales/SalesForm.tsx');
let content = fs.readFileSync(filePath, 'utf8');

// 1. Fix sale_price to selling_price
content = content.replace(/sale_price/g, 'selling_price');

// 2. Add stockMap state
if (!content.includes('stockMap')) {
    const stateHook = `  const [products, setProducts] = useState<any[]>([]);\n  const [stockMap, setStockMap] = useState<Record<string, number>>({});`;
    content = content.replace(/  const \[products, setProducts\] = useState<any\[\]>\(\[\]\);/, stateHook);
}

// 3. Add useEffect for warehouse stock
if (!content.includes('fetchWarehouseStock')) {
    const stockEffect = `
  useEffect(() => {
    const fetchWarehouseStock = async () => {
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
  }, [formData.warehouse_id]);
`;
    // Insert after fetchMasterData function definition
    content = content.replace(/  const handleItemChange/g, stockEffect + '\n  const handleItemChange');
}

// 4. Update the Select options to show stock
content = content.replace(
    /\{products\.map\(p => \(\s*<option key=\{p\.id\} value=\{p\.id\}>\{p\.name\}<\/option>\s*\)\)\}/g,
    `{products.map(p => {
                              const stock = stockMap[p.id] || 0;
                              const stockText = stock > 0 ? \` (Stock: \${stock})\` : \` (غير متوفر)\`;
                              return (
                                <option key={p.id} value={p.id}>
                                  {p.name} {formData.warehouse_id ? stockText : ''}
                                </option>
                              );
                            })}`
);

fs.writeFileSync(filePath, content, 'utf8');
console.log('Fixed SalesForm.tsx');
