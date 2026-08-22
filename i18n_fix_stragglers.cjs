const fs = require('fs');

// 1. Update ar.json
const arFile = 'src/locales/ar.json';
let ar = JSON.parse(fs.readFileSync(arFile, 'utf8'));
ar.common.optional = "اختياري";
ar.products.addSubtitle = "أضف منتجاً جديداً إلى مخزونك.";
ar.products.placeholderCode = "مثال: PROD-001";
ar.products.placeholderName = "مثال: كوكاكولا 330 مل";
ar.customers.mobile = "رقم الجوال";
ar.customers.paymentType = "طريقة الدفع";
ar.customers.locations = "الفروع";
ar.customers.noCustomers = "لا يوجد عملاء.";
ar.customers.credit = "آجل";
ar.customers.cash = "نقدي";
fs.writeFileSync(arFile, JSON.stringify(ar, null, 2), 'utf8');

// 2. Update ProductsList.tsx remaining strings
const prodFile = 'src/pages/products/ProductsList.tsx';
let prod = fs.readFileSync(prodFile, 'utf8');
prod = prod.replace(/>Add a new product to your inventory\.</g, ">{t('products.addSubtitle')}<");
prod = prod.replace(/"e\.g\. PROD-001"/g, "{t('products.placeholderCode')}");
prod = prod.replace(/"e\.g\. Coca Cola 330ml"/g, "{t('products.placeholderName')}");
prod = prod.replace(/"Optional"/g, "{t('common.optional')}");
prod = prod.replace(/>Add Product</g, ">{t('products.newProduct')}<");
fs.writeFileSync(prodFile, prod, 'utf8');

console.log('Stragglers fixed!');
