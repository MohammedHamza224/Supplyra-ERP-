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
  
  content = content.replace(/backgroundColor:\s*['"]white['"]/g, "backgroundColor: 'var(--color-surface)'");
  content = content.replace(/backgroundColor:\s*['"]#fff['"]/g, "backgroundColor: 'var(--color-surface)'");
  content = content.replace(/backgroundColor:\s*['"]#ffffff['"]/g, "backgroundColor: 'var(--color-surface)'");
  
  content = content.replace(/border:\s*['"]1px solid #eee['"]/g, "border: '1px solid var(--color-border)'");
  content = content.replace(/border:\s*['"]1px solid #e5e7eb['"]/g, "border: '1px solid var(--color-border)'");

  if (content !== original) {
    fs.writeFileSync(file, content);
  }
});
