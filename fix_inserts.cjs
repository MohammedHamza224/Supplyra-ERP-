const fs = require('fs');

let content = fs.readFileSync('src/pages/products/ProductsList.tsx', 'utf-8');

// Replace Edit path
const editTarget = `              const inserts = formData.supplier_ids.map((sId: string, index: number) => ({
                product_id: editingId,
                supplier_id: sId,
                is_preferred: index === 0 // First selected is preferred
              }));
              await supabase.from('product_suppliers').insert(inserts);`;

const editReplace = `              console.log('=== SUPPLIER SAVE DEBUG (EDIT) ===');
              console.log('FORM SUPPLIER IDS:', formData.supplier_ids);
              const inserts = formData.supplier_ids.map((sId: string, index: number) => ({
                product_id: editingId,
                supplier_id: sId,
                is_preferred: index === 0 // First selected is preferred
              }));
              console.log('SUPPLIER INSERT PAYLOAD:', inserts);
              const { data: psData, error: psError } = await supabase.from('product_suppliers').insert(inserts).select('*');
              console.log('SUPPLIER INSERT DATA:', psData);
              console.log('SUPPLIER INSERT ERROR:', psError);
              if (psError) {
                console.error('PRODUCT SUPPLIER INSERT ERROR:', psError);
                throw new Error(t('products.supplierSaveError') || 'تعذر حفظ المورد المرتبط بالمنتج.');
              }`;

content = content.replace(editTarget, editReplace);

// Replace New path
const newTarget = `          const inserts = formData.supplier_ids.map((sId: string, index: number) => ({
            product_id: newProduct.id,
            supplier_id: sId,
            is_preferred: index === 0
          }));
          await supabase.from('product_suppliers').insert(inserts);`;

const newReplace = `          console.log('=== SUPPLIER SAVE DEBUG (NEW) ===');
          console.log('FORM SUPPLIER IDS:', formData.supplier_ids);
          console.log('CREATED PRODUCT ID:', newProduct.id);
          const inserts = formData.supplier_ids.map((sId: string, index: number) => ({
            product_id: newProduct.id,
            supplier_id: sId,
            is_preferred: index === 0
          }));
          console.log('SUPPLIER INSERT PAYLOAD:', inserts);
          const { data: psData, error: psError } = await supabase.from('product_suppliers').insert(inserts).select('*');
          console.log('SUPPLIER INSERT DATA:', psData);
          console.log('SUPPLIER INSERT ERROR:', psError);
          if (psError) {
            console.error('PRODUCT SUPPLIER INSERT ERROR:', psError);
            throw new Error(t('products.supplierSaveError') || 'تعذر حفظ المورد المرتبط بالمنتج.');
          }`;

content = content.replace(newTarget, newReplace);

fs.writeFileSync('src/pages/products/ProductsList.tsx', content, 'utf-8');
console.log('Inserts logging and error throwing added.');
