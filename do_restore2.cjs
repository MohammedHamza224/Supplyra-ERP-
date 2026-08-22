const fs = require('fs');

let content = fs.readFileSync('src/pages/products/ProductsList.tsx', 'utf-8');
let restored = fs.readFileSync('restored_block.ts', 'utf-8');

const regex = /error = updateError;\s+value=\{formData\.unit_id\}/;
if (regex.test(content)) {
  content = content.replace(regex, `error = updateError;
        
` + restored + `
                      value={formData.unit_id}`);
  fs.writeFileSync('src/pages/products/ProductsList.tsx', content, 'utf-8');
  console.log('Restored ProductsList.tsx successfully');
} else {
  console.log('Could not find regex match');
}
