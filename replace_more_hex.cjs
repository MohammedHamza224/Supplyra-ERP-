const fs = require('fs');
const path = require('path');

function replaceMoreHexColors(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      replaceMoreHexColors(fullPath);
    } else if (fullPath.endsWith('.tsx') || fullPath.endsWith('.ts')) {
      let content = fs.readFileSync(fullPath, 'utf8');
      
      const original = content;

      // LOVSelect and generic gray backgrounds
      content = content.replace(/['"]#f3f4f6['"]/g, "'var(--color-surface-hover)'");
      content = content.replace(/['"]#f9fafb['"]/g, "'var(--color-surface-hover)'");
      
      // AIAssistant
      content = content.replace(/['"]#111['"]/g, "'var(--color-text-primary)'");
      content = content.replace(/['"]#666['"]/g, "'var(--color-text-secondary)'");

      // Table Badges (PurchasesList, SalesList)
      content = content.replace(/color:\s*['"]#374151['"]/g, "color: 'var(--color-text-secondary)'");

      if (content !== original) {
        fs.writeFileSync(fullPath, content);
        console.log(`Updated ${fullPath}`);
      }
    }
  }
}

replaceMoreHexColors('src');
