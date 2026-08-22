const fs = require('fs');

let content = fs.readFileSync('src/pages/ai-assistant/AIAssistant.tsx', 'utf8');

// Function to normalize arabic text
const normalizeArabic = `
  const normalizeArabic = (text: string) => {
    return text.toLowerCase()
      .replace(/[أإآا]/g, 'ا')
      .replace(/[ة]/g, 'ه')
      .replace(/[يى]/g, 'ي')
      .trim();
  };
`;

// Insert the function outside the component
content = content.replace('export default function AIAssistant() {', normalizeArabic + '\nexport default function AIAssistant() {');

// Rewrite processQuery completely
const newProcessQuery = `  const processQuery = async (query: string): Promise<React.ReactNode> => {
    console.log('AI DEBUG — QUESTION:', query);
    
    const normalized = normalizeArabic(query);
    console.log('AI DEBUG — NORMALIZED QUESTION:', normalized);
    
    let detectedIntent = 'unknown';
    
    try {
      // 1. Sales Total
      if (normalized.includes('اجمالي المبيعات') || normalized.includes('total sales') || normalized.includes('مجموع المبيعات')) {
        detectedIntent = 'sales_total';
        console.log('AI DEBUG — DETECTED INTENT:', detectedIntent);
        console.log('AI DEBUG — QUERY START: SELECT total_amount FROM orders WHERE status != Cancelled');
        
        const { data, error } = await supabase.from('orders').select('total_amount').neq('status', 'CANCELLED');
        
        if (error) {
          console.error('AI DEBUG — SUPABASE ERROR:', error);
          throw error;
        }
        
        console.log('AI DEBUG — SUPABASE RESULT:', data);
        const sum = data?.reduce((acc, curr) => acc + (curr.total_amount || 0), 0) || 0;
        
        const response = isRtl 
          ? \`إجمالي المبيعات حتى الآن هو: **\${new Intl.NumberFormat('ar-SA', { style: 'currency', currency: 'SAR' }).format(sum)}**\`
          : \`Total sales to date: **\${new Intl.NumberFormat('en-US', { style: 'currency', currency: 'SAR' }).format(sum)}**\`;
          
        console.log('AI DEBUG — FINAL RESPONSE:', response);
        return response;
      }
      
      // 2. Top Selling Products
      if (normalized.includes('اكثر المنتجات مبيعا') || normalized.includes('top selling products') || normalized.includes('best selling')) {
        detectedIntent = 'top_selling';
        console.log('AI DEBUG — DETECTED INTENT:', detectedIntent);
        
        const { data, error } = await supabase.from('order_items').select('quantity, products(name)');
        if (error) {
           console.error('AI DEBUG — SUPABASE ERROR:', error);
           throw error;
        }
        
        console.log('AI DEBUG — SUPABASE RESULT:', data?.length + ' rows fetched');
        
        if (!data || data.length === 0) return isRtl ? 'لا توجد بيانات مبيعات حالياً.' : 'No sales data currently.';
        
        const map: Record<string, number> = {};
        data.forEach(d => {
          const name = (Array.isArray(d.products) ? d.products[0]?.name : (d.products as any)?.name) || 'Unknown';
          map[name] = (map[name] || 0) + (d.quantity || 0);
        });
        const top = Object.entries(map).sort((a, b) => b[1] - a[1]).slice(0, 3);
        
        let msg = isRtl ? 'أكثر المنتجات مبيعاً هي:\\n' : 'Top selling products are:\\n';
        top.forEach((item, i) => {
          msg += \`\${i+1}. **\${item[0]}** (\${item[1]} \${isRtl ? 'وحدة' : 'units'})\\n\`;
        });
        
        console.log('AI DEBUG — FINAL RESPONSE:', msg);
        return <div style={{ whiteSpace: 'pre-wrap' }}>{msg}</div>;
      }
      
      // 3. Low Stock
      if (normalized.includes('منخفضه المخزون') || normalized.includes('منخفضة المخزون') || normalized.includes('اعاده طلب') || normalized.includes('low stock') || normalized.includes('reorder')) {
        detectedIntent = 'low_stock';
        console.log('AI DEBUG — DETECTED INTENT:', detectedIntent);
        
        const { data, error } = await supabase.from('products').select('name, min_stock_level, inventory_batches(remaining_quantity)');
        if (error) {
           console.error('AI DEBUG — SUPABASE ERROR:', error);
           throw error;
        }
        
        const low = (data || []).map(p => {
          const stock = p.inventory_batches?.reduce((sum: number, b: any) => sum + (b.remaining_quantity || 0), 0) || 0;
          return { name: p.name, stock, min: p.min_stock_level || 0 };
        }).filter(p => p.stock <= p.min);
        
        if (low.length === 0) return isRtl ? 'المخزون ممتاز، لا توجد منتجات منخفضة.' : 'Inventory is great, no low stock products.';
        
        let msg = isRtl ? \`هناك \${low.length} منتجات تحتاج لإعادة طلب:\\n\` : \`There are \${low.length} products to reorder:\\n\`;
        low.slice(0, 5).forEach(p => {
          msg += \`- **\${p.name}** (متوفر: \${p.stock}, الحد الأدنى: \${p.min})\\n\`;
        });
        return <div style={{ whiteSpace: 'pre-wrap' }}>{msg}</div>;
      }
      
      // 4. Suppliers Count
      if (normalized.includes('الموردين') || normalized.includes('الموردون') || normalized.includes('suppliers')) {
        detectedIntent = 'suppliers_count';
        console.log('AI DEBUG — DETECTED INTENT:', detectedIntent);
        
        const { count, error } = await supabase.from('suppliers').select('*', { count: 'exact', head: true });
        if (error) {
          console.error('AI DEBUG — SUPABASE ERROR:', error);
          throw error;
        }
        
        console.log('AI DEBUG — SUPABASE RESULT: count =', count);
        return isRtl 
          ? \`عدد الموردين الحاليين: **\${count}**\`
          : \`Current suppliers count: **\${count}**\`;
      }

      // 5. Products Count
      if (normalized.includes('عدد المنتجات') || normalized.includes('products count') || normalized.includes('كم منتج')) {
        detectedIntent = 'products_count';
        console.log('AI DEBUG — DETECTED INTENT:', detectedIntent);
        
        const { count, error } = await supabase.from('products').select('*', { count: 'exact', head: true });
        if (error) {
          console.error('AI DEBUG — SUPABASE ERROR:', error);
          throw error;
        }
        return isRtl ? \`عدد المنتجات المسجلة: **\${count}**\` : \`Registered products: **\${count}**\`;
      }
      
      // 6. Customers Count
      if (normalized.includes('عدد العملاء') || normalized.includes('customers count') || normalized.includes('كم عميل')) {
        detectedIntent = 'customers_count';
        console.log('AI DEBUG — DETECTED INTENT:', detectedIntent);
        
        const { count, error } = await supabase.from('customers').select('*', { count: 'exact', head: true });
        if (error) {
          console.error('AI DEBUG — SUPABASE ERROR:', error);
          throw error;
        }
        return isRtl ? \`إجمالي عدد العملاء: **\${count}**\` : \`Total customers: **\${count}**\`;
      }

      // 7. Warehouses Count
      if (normalized.includes('عدد المستودعات') || normalized.includes('warehouses count') || normalized.includes('كم مستودع')) {
        detectedIntent = 'warehouses_count';
        console.log('AI DEBUG — DETECTED INTENT:', detectedIntent);
        
        const { count, error } = await supabase.from('warehouses').select('*', { count: 'exact', head: true });
        if (error) {
          console.error('AI DEBUG — SUPABASE ERROR:', error);
          throw error;
        }
        return isRtl ? \`المستودعات المتاحة: **\${count}**\` : \`Available warehouses: **\${count}**\`;
      }
      
      console.log('AI DEBUG — DETECTED INTENT:', detectedIntent);
      console.log('AI DEBUG — FALLBACK TRIGGERED for query:', query);
      
      return isRtl 
        ? 'عذرًا، لم أفهم سؤالك تمامًا. جرب أسئلة مثل: إجمالي المبيعات، عدد الموردين، عدد المنتجات، أو المنتجات منخفضة المخزون.'
        : 'Sorry, I didn\\'t quite catch that. Try asking about total sales, suppliers count, products count, or low stock products.';
        
    } catch (err: any) {
      console.error('AI DEBUG — SUPABASE ERROR:', err);
      return isRtl ? \`حدث خطأ أثناء الاتصال بقاعدة البيانات: \${err.message}\` : \`Database connection error: \${err.message}\`;
    }
  };`;

// replace the old processQuery
const regex = /const processQuery = async \(query: string\): Promise<React\.ReactNode> => \{[\s\S]*?\n  \};\n\n  const handleSend/m;
content = content.replace(regex, newProcessQuery + '\n\n  const handleSend');

fs.writeFileSync('src/pages/ai-assistant/AIAssistant.tsx', content);
console.log('AIAssistant modified for debugging');
