const fs = require('fs');
let content = fs.readFileSync('src/pages/inventory/InventoryList.tsx', 'utf8');

// Replace the Product Summary section
const oldSummaryMatch = /\{productId && productSummary && \([\s\S]*?<\/div>\s*<\/div>\s*\)\}/;

const newSummary = `{productId && productSummary && (
          <>
            <div className="card" style={{ marginBottom: '16px', borderLeft: '4px solid var(--color-primary)' }}>
              <div className="card-body">
                <h3 style={{ margin: '0 0 16px 0', display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--color-primary-dark)' }}>
                  <Package size={20} />
                  {isRtl ? 'معلومات المنتج' : 'Product Information'}
                </h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '16px' }}>
                  <div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>{t('products.name') || 'Product Name'}</div>
                    <div style={{ fontWeight: 600 }}>{productSummary.name}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>{t('products.code') || 'SKU'}</div>
                    <div style={{ fontWeight: 600 }}>{productSummary.product_code}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>{t('products.category') || 'Category'}</div>
                    <div style={{ fontWeight: 500 }}>{productSummary.category?.name || '-'}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>{t('products.brand') || 'Brand'}</div>
                    <div style={{ fontWeight: 500 }}>{productSummary.brand?.name || '-'}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>{t('products.unit') || 'Unit'}</div>
                    <div style={{ fontWeight: 500 }}>{productSummary.unit?.name || '-'}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>{isRtl ? 'سعر البيع' : 'Selling Price'}</div>
                    <div style={{ fontWeight: 600, color: 'var(--color-primary)' }}>{Number(productSummary.selling_price || 0).toFixed(2)} {t('products.currency')}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>{isRtl ? 'تكلفة الشراء' : 'Purchase Cost'}</div>
                    <div style={{ fontWeight: 600 }}>{Number(productSummary.purchase_price || 0).toFixed(2)} {t('products.currency')}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>{t('inventory.currentStock') || 'Current Stock'}</div>
                    <div style={{ fontWeight: 700, color: totalStock < productSummary.min_stock ? 'var(--color-danger)' : 'var(--color-success)' }}>
                      {totalStock} {productSummary.unit?.name || ''}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>{t('products.minStock') || 'Min Stock'}</div>
                    <div style={{ fontWeight: 500 }}>{productSummary.min_stock}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>{t('inventory.totalValue') || 'Stock Value'}</div>
                    <div style={{ fontWeight: 700, direction: 'ltr', textAlign: isRtl ? 'right' : 'left' }}>
                      {totalValue.toFixed(2)} {t('products.currency')}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>{isRtl ? 'الحالة' : 'Status'}</div>
                    <div style={{ fontWeight: 600, color: productSummary.active ? 'var(--color-success)' : 'var(--color-text-muted)' }}>
                      {productSummary.active ? (isRtl ? 'نشط' : 'Active') : (isRtl ? 'غير نشط' : 'Inactive')}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Stock Distribution by Warehouse */}
            <div className="card" style={{ marginBottom: '16px', borderLeft: '4px solid var(--color-info)' }}>
              <div className="card-body">
                <h3 style={{ margin: '0 0 16px 0', display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--color-info)' }}>
                  <Building2 size={20} />
                  {isRtl ? 'توزيع المخزون' : 'Stock Distribution'}
                </h3>
                {filteredBatches.length > 0 ? (
                  <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
                    {Object.entries(
                      filteredBatches.reduce((acc, b) => {
                        acc[b.warehouse_name || 'Unknown'] = (acc[b.warehouse_name || 'Unknown'] || 0) + b.quantity;
                        return acc;
                      }, {} as Record<string, number>)
                    ).map(([wName, qty]) => (
                      <div key={wName} style={{ padding: '12px 16px', backgroundColor: 'var(--color-background)', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)', minWidth: '150px' }}>
                        <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', marginBottom: '4px' }}>{wName}</div>
                        <div style={{ fontSize: '1.2rem', fontWeight: 700 }}>{qty} {productSummary.unit?.name || ''}</div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div style={{ color: 'var(--color-text-muted)' }}>{isRtl ? 'لا يوجد مخزون' : 'No stock available'}</div>
                )}
              </div>
            </div>
          </>
        )}`;
content = content.replace(oldSummaryMatch, newSummary);

// Update fetchProductSummary to include selling_price
content = content.replace(
  "name, product_code, purchase_price, min_stock, active,",
  "name, product_code, purchase_price, selling_price, min_stock, active,"
);

// Update Empty State Message
const oldEmptyState = `<p>{productId ? t('inventory.noBatchesFound') : t('inventory.noBatches')}</p>`;
const newEmptyState = `<div style={{ marginBottom: '8px' }}>
                          <p style={{ fontWeight: 600, fontSize: '1.1rem', color: 'var(--color-text-primary)' }}>
                            {productId ? (isRtl ? 'لا توجد دفعات مخزون مسجلة لهذا المنتج.' : 'No inventory batches recorded for this product.') : t('inventory.noBatches')}
                          </p>
                          {productId && (
                            <p style={{ fontSize: '0.9rem', color: 'var(--color-text-muted)' }}>
                              {isRtl ? 'بيانات المنتج الأساسية موجودة في النظام، ولكن لم يتم تسجيل أي دفعات أو كميات له في أي مستودع حتى الآن.' : 'The product exists in the system, but no batches or quantities have been added to any warehouse yet.'}
                            </p>
                          )}
                        </div>`;
content = content.replace(oldEmptyState, newEmptyState);


fs.writeFileSync('src/pages/inventory/InventoryList.tsx', content, 'utf8');
