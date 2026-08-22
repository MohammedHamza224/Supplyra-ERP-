const fs = require('fs');
const path = require('path');

const targetFile = path.resolve('src/pages/warehouses/WarehousesList.tsx');
let content = fs.readFileSync(targetFile, 'utf8');

const oldFetch = /const fetchWarehouses = async \(\) => \{[\s\S]*?setWarehouses\(data \|\| \[\]\);[\s\S]*?\} finally \{\s*setLoading\(false\);\s*\}\s*\};/;

const newFetch = `const fetchWarehouses = async () => {
    try {
      setLoading(true);
      
      let query = supabase
        .from('warehouses')
        .select('id, code, name, location, notes, active')
        .order('code');

      if (debouncedSearchTerm) {
        query = query.or(\`name.ilike.%\${debouncedSearchTerm}%,code.ilike.%\${debouncedSearchTerm}%\`);
      }

      const { data, error } = await query;

      if (error) throw error;
      
      if (!data) {
         setWarehouses([]);
         return;
      }

      // Safe duplicate merging logic
      const nameCounts = data.reduce((acc: any, w: any) => {
         acc[w.name] = (acc[w.name] || 0) + 1;
         return acc;
      }, {});

      const processedData = [...data];

      for (const [name, count] of Object.entries(nameCounts)) {
        if ((count as number) > 1) {
           const duplicates = processedData.filter(w => w.name === name);
           
           // Fetch dependencies for each duplicate to find the primary one
           const withDeps = await Promise.all(duplicates.map(async (w) => {
              const [inv, ord, pur] = await Promise.all([
                 supabase.from('inventory_batches').select('id', { count: 'exact', head: true }).eq('warehouse_id', w.id),
                 supabase.from('orders').select('id', { count: 'exact', head: true }).eq('warehouse_id', w.id),
                 supabase.from('purchases').select('id', { count: 'exact', head: true }).eq('warehouse_id', w.id)
              ]);
              return {
                 ...w,
                 depCount: (inv.count || 0) + (ord.count || 0) + (pur.count || 0)
              };
           }));
           
           // Sort descending by dependencies
           withDeps.sort((a, b) => b.depCount - a.depCount);
           
           // Log diagnostics to console for user to see safely
           console.log(\`[Diagnostic] Found duplicates for: \${name}\`);
           withDeps.forEach(w => console.log(\`  - ID: \${w.id} | Dependencies: \${w.depCount}\`));
           
           // Keep the first one (most dependencies), remove the rest from UI
           for (let i = 1; i < withDeps.length; i++) {
              const idx = processedData.findIndex(w => w.id === withDeps[i].id);
              if (idx !== -1) processedData.splice(idx, 1);
           }
        }
      }

      setWarehouses(processedData);
    } catch (error: any) {
      console.error('Error fetching warehouses:', error);
    } finally {
      setLoading(false);
    }
  };`;

content = content.replace(oldFetch, newFetch);

fs.writeFileSync(targetFile, content);
console.log('Successfully injected duplicate filtering logic');
