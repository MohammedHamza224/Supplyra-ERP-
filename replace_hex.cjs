const fs = require('fs');
const path = require('path');

function replaceHexColors(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      replaceHexColors(fullPath);
    } else if (fullPath.endsWith('.tsx') || fullPath.endsWith('.ts')) {
      let content = fs.readFileSync(fullPath, 'utf8');
      
      const original = content;

      // Replace solid light red backgrounds with transparent red
      content = content.replace(/['"]#fee2e2['"]/g, "'rgba(239, 68, 68, 0.15)'");
      // Replace solid light yellow backgrounds with transparent amber
      content = content.replace(/['"]#fffbeb['"]/g, "'rgba(245, 158, 11, 0.15)'");
      content = content.replace(/['"]#fef3c7['"]/g, "'rgba(245, 158, 11, 0.15)'");
      
      // Also green backgrounds
      content = content.replace(/['"]#d1fae5['"]/g, "'rgba(16, 185, 129, 0.15)'"); // light green
      content = content.replace(/['"]#e0e7ff['"]/g, "'rgba(99, 102, 241, 0.15)'"); // light indigo
      content = content.replace(/['"]#dbeafe['"]/g, "'rgba(59, 130, 246, 0.15)'"); // light blue

      if (content !== original) {
        fs.writeFileSync(fullPath, content);
        console.log(`Updated ${fullPath}`);
      }
    }
  }
}

replaceHexColors('src');
