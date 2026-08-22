const fs = require('fs');

let content = fs.readFileSync('src/pages/products/ProductsList.tsx', 'utf-8');
let restored = fs.readFileSync('restored_block.ts', 'utf-8');

// The file currently has:
//        error = updateError;
//        
//                      value={formData.unit_id}

let splitStr = `        error = updateError;
        
                      value={formData.unit_id}`;

let parts = content.split(splitStr);
if (parts.length === 2) {
  content = parts[0] + `        error = updateError;
        
` + restored + `
                      value={formData.unit_id}` + parts[1];
  fs.writeFileSync('src/pages/products/ProductsList.tsx', content, 'utf-8');
  console.log('Restored ProductsList.tsx successfully');
} else {
  console.log('Could not split precisely');
}
