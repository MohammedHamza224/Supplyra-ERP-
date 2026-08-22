const fs = require('fs');
const path = require('path');

const arPath = path.join(__dirname, 'src/locales/ar.json');
const enPath = path.join(__dirname, 'src/locales/en.json');

const arData = JSON.parse(fs.readFileSync(arPath, 'utf8'));
const enData = JSON.parse(fs.readFileSync(enPath, 'utf8'));

const addKeys = (data, lang) => {
  if (!data.auth) data.auth = {};
  if (!data.auth.accessDeniedTitle) data.auth.accessDeniedTitle = lang === 'ar' ? 'صلاحيات غير كافية' : 'Access Denied';
  if (!data.auth.accessDeniedMessage) data.auth.accessDeniedMessage = lang === 'ar' ? 'ليس لديك الصلاحيات اللازمة للوصول إلى هذه الصفحة.' : 'You do not have permission to access this page.';
  if (!data.auth.backToHome) data.auth.backToHome = lang === 'ar' ? 'العودة للرئيسية' : 'Back to Home';

  if (!data.sales) data.sales = {};
  if (!data.sales.subtitle) data.sales.subtitle = lang === 'ar' ? 'إدارة المبيعات' : 'Manage Sales';
  if (!data.sales.search) data.sales.search = lang === 'ar' ? 'البحث عن مبيعات...' : 'Search sales...';
  if (!data.sales.warehouse) data.sales.warehouse = lang === 'ar' ? 'المستودع' : 'Warehouse';

  if (!data.common) data.common = {};
  if (!data.common.list) data.common.list = lang === 'ar' ? 'القائمة' : 'List';
  if (!data.common.filter) data.common.filter = lang === 'ar' ? 'تصفية' : 'Filter';
};

addKeys(arData, 'ar');
addKeys(enData, 'en');

fs.writeFileSync(arPath, JSON.stringify(arData, null, 2));
fs.writeFileSync(enPath, JSON.stringify(enData, null, 2));

console.log('Done adding translations');
