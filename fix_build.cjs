const fs = require('fs');

// Fix ThemeContext.tsx
let themeContext = fs.readFileSync('src/contexts/ThemeContext.tsx', 'utf8');
themeContext = themeContext.replace(
  "import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';",
  "import React, { createContext, useContext, useState, useEffect, type ReactNode } from 'react';"
);
fs.writeFileSync('src/contexts/ThemeContext.tsx', themeContext);

// Fix Settings.tsx
let settings = fs.readFileSync('src/pages/settings/Settings.tsx', 'utf8');
settings = settings.replace(
  "import { Sun, Moon, useTranslation } from '../../contexts/LanguageContext';",
  "import { useTranslation } from '../../contexts/LanguageContext';"
);

// Add Sun, Moon to lucide-react import
if (!settings.includes('Sun') && !settings.includes('Moon')) {
  settings = settings.replace(
    /import\s*\{\s*User,\s*Globe,/,
    "import { Sun, Moon, User, Globe,"
  );
} else {
  // If they are missing but Sun is not in lucide-react
  if (!settings.match(/Sun.*from 'lucide-react'/)) {
    settings = settings.replace(
      /import\s*\{\s*/,
      "import { Sun, Moon, "
    );
  }
}

fs.writeFileSync('src/pages/settings/Settings.tsx', settings);
