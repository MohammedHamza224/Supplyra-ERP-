const fs = require('fs');

let content = fs.readFileSync('src/pages/sales/SalesForm.tsx', 'utf8');

content = content.replace(
  "const { t } = useTranslation();",
  "const { t, language } = useTranslation();\n  const isRtl = language === 'ar';"
);

fs.writeFileSync('src/pages/sales/SalesForm.tsx', content);
