const fs = require('fs');

let content = fs.readFileSync('src/pages/sales/SalesForm.tsx', 'utf8');
content = content.replace(
  "const { user } = useAuth();",
  "const { user, hasPermission } = useAuth();"
);

fs.writeFileSync('src/pages/sales/SalesForm.tsx', content);
