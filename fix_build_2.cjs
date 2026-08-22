const fs = require('fs');

let settings = fs.readFileSync('src/pages/settings/Settings.tsx', 'utf8');

// Replace the bad line
settings = settings.replace(
  /import \{ Sun, Moon, useTranslation \} from '\.\.\/\.\.\/contexts\/LanguageContext';/,
  "import { useTranslation } from '../../contexts/LanguageContext';"
);

// If it somehow missed, let's just do a greedy replacement:
settings = settings.replace(
  /import \{.*?useTranslation.*?\} from '\.\.\/\.\.\/contexts\/LanguageContext';/,
  "import { useTranslation } from '../../contexts/LanguageContext';"
);

// Ensure Sun, Moon are in lucide-react
if (!settings.includes('Sun,') && !settings.match(/Sun.*from 'lucide-react'/)) {
  settings = settings.replace(
    /import\s*\{\s*User,/,
    "import { Sun, Moon, User,"
  );
}

fs.writeFileSync('src/pages/settings/Settings.tsx', settings);
