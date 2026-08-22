const fs = require('fs');

let shell = fs.readFileSync('src/components/layout/AppShell.tsx', 'utf8');

shell = shell.replace(
  `{ name: t('appShell.navigation.settings') || 'Settings', path: '/settings', icon: Settings, show: true },`,
  `{ name: t('appShell.navigation.settings') || 'Settings', path: '/settings', icon: Settings, show: true, disabled: false },`
);

fs.writeFileSync('src/components/layout/AppShell.tsx', shell);
