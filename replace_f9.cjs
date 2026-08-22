const fs = require('fs');
const path = require('path');

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(function(file) {
    file = path.join(dir, file);
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) { 
      results = results.concat(walk(file));
    } else { 
      if (file.endsWith('.tsx') || file.endsWith('.ts')) {
        results.push(file);
      }
    }
  });
  return results;
}

const files = walk('./src');

files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  let original = content;
  
  content = content.replace(/backgroundColor:\s*['"]#f9fafb['"]/g, "backgroundColor: 'var(--color-surface-hover)'");
  content = content.replace(/backgroundColor:\s*['"]#f8fafc['"]/g, "backgroundColor: 'var(--color-surface-hover)'");
  content = content.replace(/background:\s*['"]#f9fafb['"]/g, "background: 'var(--color-surface-hover)'");
  content = content.replace(/background:\s*['"]#f8fafc['"]/g, "background: 'var(--color-surface-hover)'");

  if (content !== original) {
    fs.writeFileSync(file, content);
  }
});
