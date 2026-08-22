const fs = require('fs');
const path = require('path');

const targetFile = path.resolve('src/pages/warehouses/WarehousesList.tsx');
let content = fs.readFileSync(targetFile, 'utf8');

const errorMessage = Buffer.from('2YTYpyDZitmF2YPZhiDYrdiw2YEg2KfZhNmF2LPYqtmI2K/YuSDZhNmI2KzZiNivINiz2KzZhNin2Kog2YXYsdiq2KjYt9ipINio2Ycu', 'base64').toString('utf8');

const regex = /throw new Error\(t\('warehouses\.cannotDeleteDependencies'\) \|\| 'Cannot delete warehouse because it is linked to inventory, orders, or purchases\.'\);/;

content = content.replace(regex, `throw new Error('${errorMessage}');`);

fs.writeFileSync(targetFile, content);
console.log('Fixed warehouse error message');
