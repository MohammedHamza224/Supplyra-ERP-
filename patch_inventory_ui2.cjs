const fs = require('fs');
let content = fs.readFileSync('src/pages/inventory/InventoryList.tsx', 'utf8');

// Ensure Link is imported. It already is according to line 4 `import { useLocation, Link } from 'react-router-dom';`

const oldContainerMatch = /<div className="page-container">\s*\{productId && productSummary && \(\s*<>\s*<div className="card"/;

const newContainer = `<div className="page-container">
        {productId && productSummary && (
          <div style={{ marginBottom: '24px' }}>
            <Link to="/products" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '8px 16px', backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', color: 'var(--color-text-primary)', textDecoration: 'none', fontWeight: 500, marginBottom: '16px' }}>
              {isRtl ? '← العودة إلى المنتجات' : '← Back to Products'}
            </Link>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <Package size={32} color="var(--color-primary)" />
              <div>
                <div style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem', marginBottom: '4px' }}>{isRtl ? 'تفاصيل المنتج' : 'Product Details'}</div>
                <h2 style={{ margin: 0, fontSize: '1.5rem', color: 'var(--color-text-primary)' }}>{productSummary.name} — {productSummary.product_code}</h2>
              </div>
            </div>
          </div>
        )}
        {productId && productSummary && (
            <>
              <div className="card"`;

content = content.replace(oldContainerMatch, newContainer);


const oldStockDist = /\/\* Stock Distribution by Warehouse \*\/[\s\S]*?<\/div>\s*<\/div>\s*<\/>/;
const newStockDist = `</>`;
content = content.replace(oldStockDist, newStockDist);

fs.writeFileSync('src/pages/inventory/InventoryList.tsx', content, 'utf8');
