const fs = require('fs');
const path = require('path');

const filePath = path.join('src', 'pages', 'dashboard', 'Dashboard.tsx');
let content = fs.readFileSync(filePath, 'utf8');

const oldTitle = "{t('dashboard.welcome')} {profile?.first_name || ''}";
const newTitle = "{isRtl ? 'نظرة عامة' : 'Overview'}";

const oldSubtitle = "{t('dashboard.diagnostic')}";
const newSubtitle = "{isRtl ? 'ملخص سريع لأداء النظام والبيانات الحالية' : 'Quick summary of system performance and current data'}";

if (content.includes(oldTitle) && content.includes(oldSubtitle)) {
  content = content.replace(oldTitle, newTitle);
  content = content.replace(oldSubtitle, newSubtitle);
  fs.writeFileSync(filePath, content, 'utf8');
  console.log("Dashboard text updated.");
} else {
  console.log("Text not found in Dashboard.tsx");
}
