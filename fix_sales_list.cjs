const fs = require('fs');
const path = require('path');

const filePath = path.resolve('src/pages/sales/SalesList.tsx');
let content = fs.readFileSync(filePath, 'utf8');

const newFetchSales = `
  const fetchSales = async () => {
    try {
      setLoading(true);
      setError('');

      let query = supabase
        .from('orders')
        .select(\`
          *,
          customer:customers(name, mobile),
          warehouse:warehouses(name)
        \`)
        .order('created_at', {
          ascending: false,
        });

      if (debouncedSearchTerm) {
        query = query.ilike(
          'order_number',
          \`%\${debouncedSearchTerm}%\`
        );
      }

      console.log('SALES ORDERS FETCHING...');
      let { data, error: fetchError } = await query;

      if (fetchError) {
        console.warn('Failed to fetch orders with relations, falling back to safe fetch:', fetchError);
        
        let fallbackQuery = supabase
          .from('orders')
          .select('*')
          .order('created_at', { ascending: false });

        if (debouncedSearchTerm) {
          fallbackQuery = fallbackQuery.ilike(
            'order_number',
            \`%\${debouncedSearchTerm}%\`
          );
        }

        const fallbackRes = await fallbackQuery;
        data = fallbackRes.data;
        fetchError = fallbackRes.error;
        
        console.log('FALLBACK FETCH DATA:', data);
        console.log('FALLBACK FETCH ERROR:', fetchError);

        if (fetchError) {
          throw fetchError;
        }
      }

      console.log('SALES ORDERS DATA:', data);
      
      setSales(data || []);
    } catch (err: any) {
      console.error('Error fetching sales:', err);
      setError(err?.message || 'Failed to load sales.');
    } finally {
      setLoading(false);
    }
  };
`;

// We will replace the entire fetchSales function.
// First, let's find the start and end of fetchSales.
const lines = content.split('\n');
let startIndex = -1;
let endIndex = -1;
let braceCount = 0;
let inFunction = false;

for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('const fetchSales = async () => {')) {
    startIndex = i;
    inFunction = true;
  }
  if (inFunction) {
    braceCount += (lines[i].match(/\{/g) || []).length;
    braceCount -= (lines[i].match(/\}/g) || []).length;
    if (braceCount === 0 && startIndex !== -1) {
      endIndex = i;
      break;
    }
  }
}

if (startIndex !== -1 && endIndex !== -1) {
  lines.splice(startIndex, endIndex - startIndex + 1, newFetchSales);
  fs.writeFileSync(filePath, lines.join('\n'), 'utf8');
  console.log('Successfully replaced fetchSales in SalesList.tsx');
} else {
  console.error('Could not find fetchSales bounds');
}
