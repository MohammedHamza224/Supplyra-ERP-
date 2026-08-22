const fs = require('fs');
const path = require('path');

const targetFile = path.resolve('src/pages/warehouses/WarehousesList.tsx');
let content = fs.readFileSync(targetFile, 'utf8');

const msg = Buffer.from('2YfZhCDYo9mG2Kog2YXYqtij2YPYryDZhdmGINit2LDZgSDZh9iw2Kcg2KfZhNmF2LPYqtmI2K/YuSDZhtmH2KfYptmK2YvYp9if', 'base64').toString('utf8');

content = content.replace(/\{t\('common\.deleteConfirm'\)\}/, msg);

fs.writeFileSync(targetFile, content);
console.log('Fixed confirm message text in WarehousesList.tsx');
