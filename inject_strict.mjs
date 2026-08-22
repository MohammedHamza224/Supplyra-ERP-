import fs from 'fs';
import path from 'path';

const targetFile = path.resolve('src/pages/products/ProductsList.tsx');
let content = fs.readFileSync(targetFile, 'utf8');

const regex = /\/\/ Handle initial batch if provided[\s\S]*?\/\/ STEP 10: MOST IMPORTANT TEST/;

const replacement = `// Handle initial batch if provided
        if (!error && newProduct) {
          const hasBatchData = formData.initial_quantity || formData.warehouse_id || formData.batch_number || formData.expiry_date;
          
          if (hasBatchData) {
            const isMissingFields = !formData.warehouse_id || !formData.batch_number || !formData.expiry_date || Number(formData.initial_quantity) <= 0;
            
            if (isMissingFields) {
              // Rollback product? We can't easily here without more code, so we just throw to show error.
              throw new Error("Batch data is incomplete. Please ensure Warehouse, Batch Number, Expiry Date, and Quantity (>0) are all filled.");
            }
            
            // Insert batch
            const { data: batchData, error: batchError } = await supabase.from('inventory_batches').insert([{
              product_id: newProduct.id,
              warehouse_id: formData.warehouse_id,
              batch_number: formData.batch_number,
              production_date: formData.production_date || null,
              expiry_date: formData.expiry_date,
              quantity: Number(formData.initial_quantity),
              active: true
            }]).select();
            
            if (batchError) {
              throw new Error('Failed to save Inventory Batch to Database: ' + batchError.message);
            }
            
            if (!batchData || batchData.length === 0) {
              throw new Error('Inventory Batch was not created in the database due to an unknown issue (possible RLS or trigger failure).');
            }
          }
        }

        // STEP 10: MOST IMPORTANT TEST`;

content = content.replace(regex, replacement);
fs.writeFileSync(targetFile, content);
console.log('Replaced batch insertion logic with strict error throwing.');
