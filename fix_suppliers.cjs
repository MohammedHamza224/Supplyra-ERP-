const fs = require('fs');

let content = fs.readFileSync('src/pages/products/ProductsList.tsx', 'utf-8');

// 1. Fix LOVSelect
const lovTarget = `<LOVSelect
                      options={suppliers}
                      value={formData.supplier_ids}
                      onChange={(val) => setFormData({ ...formData, supplier_ids: val })}
                      multiple
                      placeholder={t('product_suppliers.selectSupplier')}
                      searchPlaceholder={t('common.search')}
                    />`;

const lovReplacement = `<LOVSelect
                      options={suppliers}
                      value={formData.supplier_ids && formData.supplier_ids.length > 0 ? formData.supplier_ids[0] : ''}
                      onChange={(val) => setFormData({ ...formData, supplier_ids: val ? [val] : [] })}
                      placeholder={suppliers.length === 0 ? (t('products.noSuppliers') || 'لا يوجد موردون') : (t('products.selectSupplier') || 'اختر المورد')}
                      searchPlaceholder={t('common.search') || 'بحث...'}
                      disabled={suppliers.length === 0}
                    />`;

content = content.replace(lovTarget, lovReplacement);


// 2. Fix Edit Path Error Handling
const editInsertTarget = `            if (formData.supplier_ids && formData.supplier_ids.length > 0) {
              const inserts = formData.supplier_ids.map((sId: string, index: number) => ({
                product_id: editingId,
                supplier_id: sId,
                is_preferred: index === 0 // First selected is preferred
              }));
              await supabase.from('product_suppliers').insert(inserts);
            }`;

const editInsertReplacement = `            if (formData.supplier_ids && formData.supplier_ids.length > 0) {
              const inserts = formData.supplier_ids.map((sId: string, index: number) => ({
                product_id: editingId,
                supplier_id: sId,
                is_preferred: index === 0 // First selected is preferred
              }));
              const { error: psError } = await supabase.from('product_suppliers').insert(inserts);
              if (psError) {
                console.error('PRODUCT SUPPLIER INSERT ERROR', psError);
                throw new Error(t('products.supplierSaveError') || 'تعذر حفظ المورد المرتبط بالمنتج.');
              }
            }`;

content = content.replace(editInsertTarget, editInsertReplacement);

// 3. Fix New Product Path Error Handling
const newInsertTarget = `          if (!error && newProduct && formData.supplier_ids && formData.supplier_ids.length > 0) {
            const inserts = formData.supplier_ids.map((sId: string, index: number) => ({
              product_id: newProduct.id,
              supplier_id: sId,
              is_preferred: index === 0
            }));
            await supabase.from('product_suppliers').insert(inserts);
          }`;

const newInsertReplacement = `          if (!error && newProduct && formData.supplier_ids && formData.supplier_ids.length > 0) {
            const inserts = formData.supplier_ids.map((sId: string, index: number) => ({
              product_id: newProduct.id,
              supplier_id: sId,
              is_preferred: index === 0
            }));
            const { error: psError } = await supabase.from('product_suppliers').insert(inserts);
            if (psError) {
              console.error('PRODUCT SUPPLIER INSERT ERROR', psError);
              throw new Error(t('products.supplierSaveError') || 'تعذر حفظ المورد المرتبط بالمنتج.');
            }
          }`;

content = content.replace(newInsertTarget, newInsertReplacement);


// Check if mapping in openModal is correct
// `supplier_ids: product.product_suppliers ? product.product_suppliers.map((ps: any) => ps.supplier_id) : [],`
// This is already correct.

fs.writeFileSync('src/pages/products/ProductsList.tsx', content, 'utf-8');
console.log('ProductsList.tsx supplier fixes applied!');
