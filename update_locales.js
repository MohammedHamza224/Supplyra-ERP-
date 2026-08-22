import fs from 'fs';
import path from 'path';

const arPath = path.resolve('src/locales/ar.json');
const enPath = path.resolve('src/locales/en.json');

const ar = JSON.parse(fs.readFileSync(arPath, 'utf8'));
const en = JSON.parse(fs.readFileSync(enPath, 'utf8'));

// Common missing keys
if (!ar.common) ar.common = {};
if (!en.common) en.common = {};
ar.common.confirmDelete = "هل أنت متأكد أنك تريد الحذف؟";
en.common.confirmDelete = "Are you sure you want to delete?";

// Products missing keys
if (!ar.products) ar.products = {};
if (!en.products) en.products = {};
const productsArKeys = {
  "delete": "حذف",
  "deleteConfirm": "هل أنت متأكد من حذف هذا المنتج؟",
  "cantDelete": "لا يمكن حذف هذا السجل لأنه مرتبط ببيانات أخرى.",
  "deactivatedInstead": "تم تعطيله بدلاً من حذفه."
};
const productsEnKeys = {
  "delete": "Delete",
  "deleteConfirm": "Are you sure you want to delete this product?",
  "cantDelete": "Cannot delete this record because it is linked to other data.",
  "deactivatedInstead": "It was deactivated instead of deleted."
};

for (const [k, v] of Object.entries(productsArKeys)) {
  if (!ar.products[k]) ar.products[k] = v;
}
for (const [k, v] of Object.entries(productsEnKeys)) {
  if (!en.products[k]) en.products[k] = v;
}

fs.writeFileSync(arPath, JSON.stringify(ar, null, 2), 'utf8');
fs.writeFileSync(enPath, JSON.stringify(en, null, 2), 'utf8');
console.log('Translations updated!');
