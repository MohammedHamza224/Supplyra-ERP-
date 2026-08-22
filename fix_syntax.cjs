const fs = require('fs');
let content = fs.readFileSync('src/pages/inventory/InventoryList.tsx', 'utf8');

content = content.replace('{</>', '</>');

fs.writeFileSync('src/pages/inventory/InventoryList.tsx', content, 'utf8');
