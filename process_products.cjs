const fs = require('fs');
const path = require('path');

const targetFile = path.resolve('src/pages/products/ProductsList.tsx');
let content = fs.readFileSync(targetFile, 'utf8');

// Replace setProducts(data || []) with the processed data
const replacement = `
      console.log('BEFORE setProducts:', data);
      
      const processedData = (data || []).map(product => {
        let hasExpiredBatch = false;
        
        if (product.inventory_batches && product.inventory_batches.length > 0) {
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          const todayTime = today.getTime();
          
          hasExpiredBatch = product.inventory_batches.some((batch: any) => {
            if (!batch.expiry_date) return false;
            const [yyyy, mm, dd] = batch.expiry_date.split('-');
            const exp = new Date(Number(yyyy), Number(mm) - 1, Number(dd), 0, 0, 0, 0);
            return exp.getTime() < todayTime;
          });
        }
        
        return {
          ...product,
          has_expired_batch: hasExpiredBatch
        };
      });

      setProducts(processedData);
`;

content = content.replace(
  /console\.log\('BEFORE setProducts:', data\);\s*setProducts\(data \|\| \[\]\);/,
  replacement
);

fs.writeFileSync(targetFile, content);
console.log('Successfully injected processing logic for has_expired_batch');
