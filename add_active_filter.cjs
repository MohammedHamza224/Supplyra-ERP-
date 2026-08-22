const fs = require('fs');
const path = require('path');

const targetFile = path.resolve('src/pages/customers/CustomersList.tsx');
let content = fs.readFileSync(targetFile, 'utf8');

content = content.replace(
  /\.select\(`\s*id, name, mobile, payment_type, active,\s*customer_locations\(id\)\s*`\)/,
  `.select(\`
          id, name, mobile, payment_type, active,
          customer_locations(id)
        \`).eq('active', true)`
);

fs.writeFileSync(targetFile, content);
console.log('Successfully added eq(active, true) to Customers query');
