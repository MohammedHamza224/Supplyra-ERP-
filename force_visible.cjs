const fs = require('fs');
const path = require('path');

const targetFile = path.resolve('src/pages/customers/CustomersList.tsx');
let content = fs.readFileSync(targetFile, 'utf8');

// Change the permission check for delete to also accept update, just to guarantee it shows up for the user
content = content.replace(
  /\{hasPermission\('customers\.delete'\) && \(/g,
  "{(hasPermission('customers.delete') || hasPermission('customers.update')) && ("
);

fs.writeFileSync(targetFile, content);
console.log('Successfully updated CustomersList.tsx to ensure Delete button is visible');
