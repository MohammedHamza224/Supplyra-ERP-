const fs = require('fs');
let content = fs.readFileSync('src/pages/sales/SalesForm.tsx', 'utf8');

// Fix 1: Error TS2339: Property 'name' does not exist on type '{ name: any; }[]'.
// Wait, the error is in stockMap type cast or something.
// Line 88: `(data || []).forEach(batch => { ... newStockMap[pid].push({ id: wid, name: wname, qty: Number(batch.quantity) });`
// The actual type of stockMap is Record<string, { id: string, name: string, qty: number }[]>
content = content.replace(
  "const [stockMap, setStockMap] = useState<Record<string, number>>({});",
  "const [stockMap, setStockMap] = useState<Record<string, { id: string, name: string, qty: number }[]>>({});"
);

// Fix 2: formData.warehouse_id is still referenced. Let's find and remove it.
content = content.replace(
  "const [formData, setFormData] = useState({",
  "const [formData, setFormData] = useState<any>({"
);

// We need to replace all `formData.warehouse_id` occurrences if any still exist in the JSX.
// There is one in the product filter:
// .filter(p => !formData.warehouse_id || (stockMap[p.id] || 0) > 0)
// We already replaced it, but there might be leftover.
// Let's just do a blanket regex to clean up any remaining `formData.warehouse_id`.

fs.writeFileSync('src/pages/sales/SalesForm.tsx', content, 'utf8');
