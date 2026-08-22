const fs = require('fs');
const path = require('path');

const arPath = path.resolve('src/locales/ar.json');
const enPath = path.resolve('src/locales/en.json');
const analyticsPath = path.resolve('src/pages/sales/SalesAnalytics.tsx');

const ar = JSON.parse(fs.readFileSync(arPath, 'utf8'));
const en = JSON.parse(fs.readFileSync(enPath, 'utf8'));

if (!ar.sales) ar.sales = {};
if (!en.sales) en.sales = {};
if (!ar.common) ar.common = {};
if (!en.common) en.common = {};

const salesKeysAr = {
  "totalRevenue": "إجمالي الإيرادات",
  "totalOrders": "إجمالي الطلبات",
  "avgOrderValue": "متوسط قيمة الطلب",
  "cancelRate": "معدل الإلغاء",
  "topProducts": "أفضل 5 منتجات",
  "orderStatus": "حالة الطلبات",
  "paymentStatus": "حالة الدفع"
};

const salesKeysEn = {
  "totalRevenue": "Total Revenue",
  "totalOrders": "Total Orders",
  "avgOrderValue": "Avg Order Value",
  "cancelRate": "Cancellation Rate",
  "topProducts": "Top 5 Products",
  "orderStatus": "Order Status",
  "paymentStatus": "Payment Status"
};

for (const [k, v] of Object.entries(salesKeysAr)) {
  if (!ar.sales[k]) ar.sales[k] = v;
}
for (const [k, v] of Object.entries(salesKeysEn)) {
  if (!en.sales[k]) en.sales[k] = v;
}

if (!ar.common.units) ar.common.units = "وحدة";
if (!en.common.units) en.common.units = "units";

fs.writeFileSync(arPath, JSON.stringify(ar, null, 2), 'utf8');
fs.writeFileSync(enPath, JSON.stringify(en, null, 2), 'utf8');

// Remove fallbacks in SalesAnalytics.tsx
let content = fs.readFileSync(analyticsPath, 'utf8');
content = content.replace(/t\('([^']+)'\)\s*\|\|\s*'[^']*'/g, "t('$1')");
content = content.replace(/t\('([^']+)'\)\s*\|\|\s*"[^"]*"/g, "t('$1')");
fs.writeFileSync(analyticsPath, content, 'utf8');

console.log('Sales Analytics localization fixed.');
