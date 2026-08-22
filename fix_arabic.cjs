const fs = require('fs');
const path = require('path');

const targetFile = path.resolve('src/pages/customers/CustomersList.tsx');
let content = fs.readFileSync(targetFile, 'utf8');

const s1 = Buffer.from('2K3YsNmBINin2YTYudmF2YrZhA==', 'base64').toString('utf8'); // حذف العميل
const s2 = Buffer.from('2YfZhCDYo9mG2Kog2YXYqtij2YPYryDYo9mG2YMg2KrYsdmK2K8g2K3YsNmBINmH2LDYpyDYp9mE2LnZhdmK2YQg2YbZh9in2KbZitmL2KfYnw==', 'base64').toString('utf8'); // هل أنت متأكد أنك تريد حذف هذا العميل نهائيًا؟
const s3 = Buffer.from('2YTYpyDZitmF2YPZhiDYp9mE2KrYsdin2KzYuSDYudmGINmH2LDZhyDYp9mE2LnZhdmE2YrYqS4=', 'base64').toString('utf8'); // لا يمكن التراجع عن هذه العملية.
const s4 = Buffer.from('2KXZhNi62KfYoQ==', 'base64').toString('utf8'); // إلغاء
const s5 = Buffer.from('2K3YsNmBINmG2YfYp9im2Yo=', 'base64').toString('utf8'); // حذف نهائي
const s6 = Buffer.from('2YTYpyDZitmF2YPZhiDYrdiw2YEg2KfZhNi52YXZitmEINmE2YjYrNmI2K8g2LfZhNio2KfYqiDZhdix2KrYqNi32Kkg2KjZhy4=', 'base64').toString('utf8'); // لا يمكن حذف العميل لوجود طلبات مرتبطة به.

// Fix executeDelete error message
content = content.replace(
  /throw new Error\('U,O[\s\S]*?orders\)'\);/g,
  `throw new Error('${s6}');`
);

// Fix Modal Title
content = content.replace(
  /<h3 style=\{\{ margin: 0, fontSize: '1\.2rem', color: 'var\(--color-text-primary\)' \}\}>\{t\('common\.confirmDelete'\)\}<\/h3>/,
  `<h3 style={{ margin: 0, fontSize: '1.2rem', color: 'var(--color-text-primary)' }}>${s1}</h3>`
);

// Fix Modal Body Text
content = content.replace(
  /<p style=\{\{ margin: '0 0 16px 0', fontSize: '1rem', color: 'var\(--color-text-secondary\)' \}\}>[\s\S]*?<\/p>/,
  `<p style={{ margin: '0 0 16px 0', fontSize: '1rem', color: 'var(--color-text-secondary)' }}>
                    ${s2}<br/><br/>${s3}
                  </p>`
);

// Fix Cancel Button
content = content.replace(
  /\{t\('common\.cancel'\)\}\s*<\/button>/,
  `${s4}\n                  </button>`
);

// Fix Delete Button
content = content.replace(
  /\{saving \? t\('common\.loading'\) : t\('common\.delete'\)\}\s*<\/button>/,
  `{saving ? t('common.loading') : '${s5}'}\n                  </button>`
);

fs.writeFileSync(targetFile, content);
console.log('Fixed Arabic text corruption in CustomersList.tsx');
