const fs = require('fs');

let content = fs.readFileSync('src/pages/dashboard/Dashboard.tsx', 'utf8');

// Update useAuth destructuring
if (content.includes('const { profile } = useAuth();')) {
  content = content.replace(
    'const { profile } = useAuth();',
    'const { profile, user } = useAuth();\n  const displayName = profile?.first_name ? `${profile.first_name}${profile.last_name ? ` ${profile.last_name}` : \'\'}` : user?.email?.split(\'@\')[0] || \'User\';'
  );
}

// Extract exact string blocks that are currently in the file for hero title
const oldTitleRegex = /<h1 className=\{styles\.heroTitle\}>[\s\S]*?<\/h1>/;
const newTitle = `<h1 className={styles.heroTitle}>
                  {language === 'ar' ? \`مرحباً بك، \${displayName} 👋\` : \`Welcome, \${displayName} 👋\`}
                </h1>`;
content = content.replace(oldTitleRegex, newTitle);

const oldSubtitleRegex = /<p className=\{styles\.heroSubtitle\}>[\s\S]*?<\/p>/;
const newSubtitle = `<p className={styles.heroSubtitle}>
                  {language === 'ar' ? 'ملخص سريع لأداء النظام والبيانات الحالية' : 'Quick overview of system performance and current data'}
                </p>`;
content = content.replace(oldSubtitleRegex, newSubtitle);

fs.writeFileSync('src/pages/dashboard/Dashboard.tsx', content, 'utf8');
console.log("Updated Dashboard.tsx");
