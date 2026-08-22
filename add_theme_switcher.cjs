const fs = require('fs');
const path = require('path');

const appShellPath = path.join('src', 'components', 'layout', 'AppShell.tsx');
let content = fs.readFileSync(appShellPath, 'utf8');

// Add import
if (!content.includes("import { ThemeSwitcher } from './ThemeSwitcher';")) {
  content = content.replace(
    "import { LanguageSwitcher } from './LanguageSwitcher';",
    "import { LanguageSwitcher } from './LanguageSwitcher';\nimport { ThemeSwitcher } from './ThemeSwitcher';"
  );
}

// Fix header background color
content = content.replace(
  "backgroundColor: 'rgba(255, 255, 255, 0.8)',",
  "backgroundColor: 'rgba(var(--color-surface-rgb, 255, 255, 255), 0.8)', // Note: standard hex to rgb fallback if not defined, but var(--color-surface) is better if opaque. Let's just use var(--color-surface) since blur doesn't work well without rgb split in pure CSS vars"
);
content = content.replace(
  "backgroundColor: 'rgba(var(--color-surface-rgb, 255, 255, 255), 0.8)', // Note: standard hex to rgb fallback if not defined, but var(--color-surface) is better if opaque. Let's just use var(--color-surface) since blur doesn't work well without rgb split in pure CSS vars",
  "backgroundColor: 'var(--color-surface)', opacity: 0.98,"
);

// Add ThemeSwitcher next to LanguageSwitcher
content = content.replace(
  "<LanguageSwitcher />",
  "<ThemeSwitcher />\n              <LanguageSwitcher />"
);

fs.writeFileSync(appShellPath, content);
console.log("Updated AppShell.tsx");
