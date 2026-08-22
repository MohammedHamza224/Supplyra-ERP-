const fs = require('fs');
const path = require('path');

function replaceTailwindClasses(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      replaceTailwindClasses(fullPath);
    } else if (fullPath.endsWith('.tsx') || fullPath.endsWith('.ts')) {
      let content = fs.readFileSync(fullPath, 'utf8');
      
      const original = content;

      // Backgrounds
      content = content.replace(/\bbg-white\b/g, "bg-[var(--color-surface)]");
      content = content.replace(/\bbg-gray-50\b/g, "bg-[var(--color-surface-hover)]");
      content = content.replace(/\bbg-gray-100\b/g, "bg-[var(--color-surface-hover)]");
      content = content.replace(/\bbg-gray-200\b/g, "bg-[var(--color-border)]");
      
      // Text colors
      content = content.replace(/\btext-gray-400\b/g, "text-[var(--color-text-muted)]");
      content = content.replace(/\btext-gray-500\b/g, "text-[var(--color-text-secondary)]");
      content = content.replace(/\btext-gray-600\b/g, "text-[var(--color-text-secondary)]");
      content = content.replace(/\btext-gray-700\b/g, "text-[var(--color-text-primary)]");
      content = content.replace(/\btext-gray-800\b/g, "text-[var(--color-text-primary)]");
      content = content.replace(/\btext-gray-900\b/g, "text-[var(--color-text-primary)]");
      
      // Borders
      content = content.replace(/\bborder-gray-200\b/g, "border-[var(--color-border)]");
      content = content.replace(/\bborder-gray-300\b/g, "border-[var(--color-border)]");

      if (content !== original) {
        fs.writeFileSync(fullPath, content);
        console.log(`Updated ${fullPath}`);
      }
    }
  }
}

replaceTailwindClasses('src');
