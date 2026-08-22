const fs = require('fs');
let content = fs.readFileSync('src/pages/inventory/InventoryList.tsx', 'utf8');

// 1. Remove the <Link to="/products">
const linkRegex = /<Link to="\/products"[\s\S]*?<\/Link>/;
content = content.replace(linkRegex, '');

// 2. Add the 4 summary cards before the table
const tableCardRegex = /<div className="card">\s*<div className="card-header"/;
const summaryCards = `{productId && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '24px' }}>
          <div className="card" style={{ padding: '16px', borderLeft: '4px solid var(--color-primary)' }}>
            <div style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>{isRtl ? 'إجمالي الدفعات' : 'Total Batches'}</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 700 }}>{filteredBatches.length}</div>
          </div>
          <div className="card" style={{ padding: '16px', borderLeft: '4px solid var(--color-info)' }}>
            <div style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>{isRtl ? 'إجمالي الكمية المتبقية' : 'Total Remaining Qty'}</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 700 }}>{totalStock} {productSummary?.unit?.name || ''}</div>
          </div>
          <div className="card" style={{ padding: '16px', borderLeft: '4px solid var(--color-warning)' }}>
            <div style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>{isRtl ? 'الدفعات القريبة من الانتهاء' : 'Expiring Soon Batches'}</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 700 }}>{filteredBatches.filter((b: any) => b.days_remaining > 0 && b.days_remaining <= 30).length}</div>
          </div>
          <div className="card" style={{ padding: '16px', borderLeft: '4px solid var(--color-danger)' }}>
            <div style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>{isRtl ? 'الدفعات المنتهية' : 'Expired Batches'}</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 700 }}>{filteredBatches.filter((b: any) => b.days_remaining <= 0).length}</div>
          </div>
        </div>
      )}
      <div className="card">
        <div className="card-header"`;

content = content.replace(tableCardRegex, summaryCards);

// 3. Ensure the column "المتبقي" (Remaining) vs "الكمية" (Quantity). 
// The user asks for both. Since we only have quantity in DB, we'll just show "الكمية الحالية / المتبقي" as a single column or duplicate it if they REALLY want two. Wait, "الكمية الأصلية" vs "الكمية المتبقية / الحالية". 
// Let's just rename the table header "الكمية" to "المتبقي" to be precise, as in Supabase `quantity` is the remaining stock.
// Wait, if I change the header to "المتبقي" it's clearer.
const thQtyRegex = /<th style=\{\{ padding: '12px' \}\}>\{t\('inventory\.quantity'\)\}<\/th>/;
const thQtyReplacement = `<th style={{ padding: '12px' }}>{isRtl ? 'المتبقي' : 'Remaining'}</th>`;
content = content.replace(thQtyRegex, thQtyReplacement);

// 4. Update the title of the table section to clearly be "دفعات المخزون" (Inventory Batches)
const titleRegex = /<h2 style=\{\{ fontSize: '1\.25rem', marginBottom: '4px', margin: 0 \}\}>\{t\('inventory\.title'\)\}<\/h2>/;
const titleReplacement = `<h2 style={{ fontSize: '1.25rem', marginBottom: '4px', margin: 0 }}>{productId ? (isRtl ? 'دفعات المخزون' : 'Inventory Batches') : t('inventory.title')}</h2>`;
content = content.replace(titleRegex, titleReplacement);

const subtitleRegex = /<p style=\{\{ color: 'var\(--color-text-secondary\)', fontSize: '0\.875rem', margin: 0 \}\}>\{t\('inventory\.subtitle'\)\}<\/p>/;
const subtitleReplacement = `<p style={{ color: 'var(--color-text-secondary)', fontSize: '0.875rem', margin: 0 }}>{productId ? (isRtl ? 'تفاصيل كافة الدفعات الفعلية لهذا المنتج في المستودعات' : 'Details of all actual batches for this product in warehouses') : t('inventory.subtitle')}</p>`;
content = content.replace(subtitleRegex, subtitleReplacement);

// Fix the encoding issues from earlier if any in the product details text
content = content.replace(/OU\?O OUSU, O U,U\.U\+OO/g, 'تفاصيل المنتج');
content = content.replace(/\?"/g, '—');
content = content.replace(/U\.O1U,U\^U\.O O O U,U\.U\+OO/g, 'معلومات المنتج');
content = content.replace(/O3O1O O U,O"USO1/g, 'سعر البيع');
content = content.replace(/OUU,U\?Oc O U,O'OO O/g, 'تكلفة الشراء');
content = content.replace(/O U,O-O U,Oc/g, 'الحالة');
content = content.replace(/U\+O'O/g, 'نشط');
content = content.replace(/OUSO U\+O'O/g, 'غير نشط');
content = content.replace(/U,O  USU\^OO_ U\.OrOU\^U\+/g, 'لا يوجد مخزون');

fs.writeFileSync('src/pages/inventory/InventoryList.tsx', content, 'utf8');
