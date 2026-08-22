const fs = require('fs');

let content = fs.readFileSync('src/pages/settings/Settings.tsx', 'utf8');

if (!content.includes('Building2')) {
  content = content.replace(
    "Truck,",
    "Truck,\n  Building2,\n  KeyRound,\n  Warehouse,"
  );
}

fs.writeFileSync('src/pages/settings/Settings.tsx', content);
