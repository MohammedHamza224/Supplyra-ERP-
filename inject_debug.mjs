import fs from 'fs';
import path from 'path';

const targetFile = path.resolve('src/pages/products/ProductsList.tsx');
let content = fs.readFileSync(targetFile, 'utf8');

const regex = /if \(!error && newProduct && Number\(formData\.initial_quantity\) > 0 && formData\.warehouse_id && formData\.batch_number && formData\.expiry_date\) \{[\s\S]*?if \(batchError\) \{ console\.error\('Failed to add initial batch:', batchError\); alert\('Failed to add batch: ' \+ JSON\.stringify\(batchError\)\); \}\s*\}/;

const replacement = `if (!error && newProduct && (formData.initial_quantity || formData.warehouse_id || formData.batch_number || formData.expiry_date)) {
            if (!formData.warehouse_id || !formData.batch_number || !formData.expiry_date || Number(formData.initial_quantity) <= 0) {
              alert("DEBUG: Missing required batch fields! qty=" + formData.initial_quantity + " wh=" + formData.warehouse_id + " batch=" + formData.batch_number + " exp=" + formData.expiry_date);
            } else {
              const { error: batchError } = await supabase.from('inventory_batches').insert([{
                product_id: newProduct.id,
                warehouse_id: formData.warehouse_id,
                batch_number: formData.batch_number,
                production_date: formData.production_date || null,
                expiry_date: formData.expiry_date,
                quantity: Number(formData.initial_quantity)
              }]);
              if (batchError) { 
                console.error('Failed to add initial batch:', batchError); 
                alert('Failed to add batch to Database: ' + batchError.message); 
              } else {
                alert('DEBUG: Batch successfully saved to Supabase Database!');
              }
            }
          }`;

content = content.replace(regex, replacement);
fs.writeFileSync(targetFile, content);
console.log('Injected debug alerts into ProductsList.tsx');
