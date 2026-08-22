const fs = require('fs');
const path = require('path');

const filesToRefactor = [
  {
    file: 'src/pages/products/ProductsList.tsx',
    replacements: [
      { from: /<h2>\s*Products\s*<\/h2>/g, to: "<h2>{t('products.title')}</h2>" },
      { from: /Manage your product inventory and master data./g, to: "{t('products.subtitle')}" },
      { from: /Add Product/g, to: "{t('products.newProduct')}" },
      { from: /placeholder="Search products..."/g, to: "placeholder={t('products.search')}" },
      { from: /<th>Code<\/th>/g, to: "<th>{t('products.code')}</th>" },
      { from: /<th>Product Name<\/th>/g, to: "<th>{t('products.name')}</th>" },
      { from: /<th>Category<\/th>/g, to: "<th>{t('products.category')}</th>" },
      { from: /<th>Brand<\/th>/g, to: "<th>{t('products.brand')}</th>" },
      { from: /<th>Price<\/th>/g, to: "<th>{t('products.price')}</th>" },
      { from: /<th>Status<\/th>/g, to: "<th>{t('common.status')}</th>" },
      { from: /<th style={{ textAlign: 'right' }}>Actions<\/th>/g, to: "<th style={{ textAlign: 'right' }}>{t('common.actions')}</th>" },
      { from: />Active</g, to: ">{t('common.active')}<" },
      { from: />Inactive</g, to: ">{t('common.inactive')}<" },
      { from: /Loading products.../g, to: "{t('common.loading')}" },
      { from: /No products found. Add your first product./g, to: "{t('products.noProducts')}" },
      { from: /Product Code \*/g, to: "{t('products.code')} *" },
      { from: /Product Name \*/g, to: "{t('products.name')} *" },
      { from: /Purchase Price/g, to: "{t('products.purchasePrice')}" },
      { from: /Selling Price/g, to: "{t('products.sellingPrice')}" },
      { from: /Minimum Stock/g, to: "{t('products.minStock')}" },
      { from: /<option value="">Select category<\/option>/g, to: "<option value=\"\">{t('products.selectCategory')}</option>" },
      { from: /<option value="">Select brand<\/option>/g, to: "<option value=\"\">{t('products.selectBrand')}</option>" },
      { from: /<option value="">Select unit<\/option>/g, to: "<option value=\"\">{t('products.selectUnit')}</option>" },
      { from: /import \{ useTranslation \} from '\.\.\/\.\.\/contexts\/LanguageContext';/g, to: "import { useTranslation } from '../../contexts/LanguageContext';" } // Just to check
    ]
  },
  {
    file: 'src/pages/suppliers/SuppliersList.tsx',
    replacements: [
      { from: /<h2>\s*Suppliers\s*<\/h2>/g, to: "<h2>{t('suppliers.title')}</h2>" },
      { from: /Manage your suppliers network/g, to: "{t('suppliers.subtitle')}" },
      { from: /Add Supplier/g, to: "{t('suppliers.newSupplier')}" },
      { from: /placeholder="Search suppliers..."/g, to: "placeholder={t('suppliers.search')}" },
      { from: /<th>Supplier Name<\/th>/g, to: "<th>{t('suppliers.name')}</th>" },
      { from: /<th>Contact Person<\/th>/g, to: "<th>{t('suppliers.contact')}</th>" },
      { from: /<th>Email<\/th>/g, to: "<th>{t('suppliers.email')}</th>" },
      { from: /<th>Phone<\/th>/g, to: "<th>{t('suppliers.phone')}</th>" },
      { from: /<th>Status<\/th>/g, to: "<th>{t('common.status')}</th>" },
      { from: /<th style={{ textAlign: 'right' }}>Actions<\/th>/g, to: "<th style={{ textAlign: 'right' }}>{t('common.actions')}</th>" },
      { from: />Active</g, to: ">{t('common.active')}<" },
      { from: />Inactive</g, to: ">{t('common.inactive')}<" },
      { from: /Loading suppliers.../g, to: "{t('common.loading')}" },
      { from: /No suppliers found. Add your first supplier./g, to: "{t('common.noData')}" }
    ]
  },
  {
    file: 'src/pages/customers/CustomersList.tsx',
    replacements: [
      { from: /<h2>\s*Customers\s*<\/h2>/g, to: "<h2>{t('customers.title')}</h2>" },
      { from: /Manage your customer base/g, to: "{t('customers.subtitle')}" },
      { from: /Add Customer/g, to: "{t('customers.newCustomer')}" },
      { from: /placeholder="Search customers..."/g, to: "placeholder={t('customers.search')}" },
      { from: /<th>Customer Name<\/th>/g, to: "<th>{t('customers.name')}</th>" },
      { from: /<th>Type<\/th>/g, to: "<th>{t('customers.type')}</th>" },
      { from: /<th>Contact Person<\/th>/g, to: "<th>{t('customers.contact')}</th>" },
      { from: /<th>Email<\/th>/g, to: "<th>{t('customers.email')}</th>" },
      { from: /<th>Phone<\/th>/g, to: "<th>{t('customers.phone')}</th>" },
      { from: /<th>Status<\/th>/g, to: "<th>{t('common.status')}</th>" },
      { from: /<th style={{ textAlign: 'right' }}>Actions<\/th>/g, to: "<th style={{ textAlign: 'right' }}>{t('common.actions')}</th>" },
      { from: />Active</g, to: ">{t('common.active')}<" },
      { from: />Inactive</g, to: ">{t('common.inactive')}<" },
      { from: /Loading customers.../g, to: "{t('common.loading')}" },
      { from: /No customers found. Add your first customer./g, to: "{t('common.noData')}" }
    ]
  },
  {
    file: 'src/pages/warehouses/WarehousesList.tsx',
    replacements: [
      { from: /<h2>\s*Warehouses\s*<\/h2>/g, to: "<h2>{t('warehouses.title')}</h2>" },
      { from: /Manage warehouse locations and capacity/g, to: "{t('warehouses.subtitle')}" },
      { from: /Add Warehouse/g, to: "{t('warehouses.newWarehouse')}" },
      { from: /placeholder="Search warehouses..."/g, to: "placeholder={t('warehouses.search')}" },
      { from: /<th>Code<\/th>/g, to: "<th>{t('warehouses.code')}</th>" },
      { from: /<th>Warehouse Name<\/th>/g, to: "<th>{t('warehouses.name')}</th>" },
      { from: /<th>Location<\/th>/g, to: "<th>{t('warehouses.location')}</th>" },
      { from: /<th>Capacity<\/th>/g, to: "<th>{t('warehouses.capacity')}</th>" },
      { from: /<th>Manager<\/th>/g, to: "<th>{t('warehouses.manager')}</th>" },
      { from: /<th>Status<\/th>/g, to: "<th>{t('common.status')}</th>" },
      { from: /<th style={{ textAlign: 'right' }}>Actions<\/th>/g, to: "<th style={{ textAlign: 'right' }}>{t('common.actions')}</th>" },
      { from: />Active</g, to: ">{t('common.active')}<" },
      { from: />Inactive</g, to: ">{t('common.inactive')}<" },
      { from: /Loading warehouses.../g, to: "{t('common.loading')}" },
      { from: /No warehouses found. Add your first warehouse./g, to: "{t('common.noData')}" }
    ]
  },
  {
    file: 'src/pages/users/UsersList.tsx',
    replacements: [
      { from: /\{isRtl \? 'إدارة المستخدمين' : 'User Management'\}/g, to: "{t('users.title')}" },
      { from: /\{isRtl \? 'إدارة مستخدمي النظام والصلاحيات' : 'Manage system users and access roles'\}/g, to: "{t('users.subtitle')}" },
      { from: /\{isRtl \? 'مستخدم جديد' : 'Create User'\}/g, to: "{t('users.newUser')}" },
      { from: /\{isRtl \? 'البحث عن مستخدم\.\.\.' : 'Search users\.\.\.'\}/g, to: "{t('users.search')}" },
      { from: /\{isRtl \? 'جميع الأدوار' : 'All Roles'\}/g, to: "{t('users.allRoles')}" },
      { from: /\{isRtl \? 'جميع الحالات' : 'All Statuses'\}/g, to: "{t('users.allStatuses')}" },
      { from: /\{isRtl \? 'نشط' : 'Active'\}/g, to: "{t('common.active')}" },
      { from: /\{isRtl \? 'غير نشط' : 'Inactive'\}/g, to: "{t('common.inactive')}" },
      { from: /\{isRtl \? 'الاسم الأول' : 'First Name'\}/g, to: "{t('users.firstName')}" },
      { from: /\{isRtl \? 'الاسم الأخير' : 'Last Name'\}/g, to: "{t('users.lastName')}" },
      { from: /\{isRtl \? 'البريد الإلكتروني' : 'Email'\}/g, to: "{t('users.email')}" },
      { from: /\{isRtl \? 'الدور' : 'Role'\}/g, to: "{t('users.role')}" },
      { from: /\{isRtl \? 'الحالة' : 'Status'\}/g, to: "{t('common.status')}" },
      { from: /\{isRtl \? 'الإجراءات' : 'Actions'\}/g, to: "{t('common.actions')}" },
      { from: /\{isRtl \? 'جاري التحميل\.\.\.' : 'Loading\.\.\.'\}/g, to: "{t('common.loading')}" },
      { from: /\{isRtl \? 'لا يوجد مستخدمين\.' : 'No users found\.'\}/g, to: "{t('common.noData')}" }
    ]
  },
  {
    file: 'src/pages/users/UserForm.tsx',
    replacements: [
      { from: /\{isRtl \? 'تعديل مستخدم' : 'Edit User'\}/g, to: "{user ? t('common.edit') : t('users.newUser')}" }, // Fallback for title
      { from: /\{isRtl \? 'مستخدم جديد' : 'Create User'\}/g, to: "{t('users.newUser')}" },
      { from: /\{isRtl \? 'الاسم الأول \(\w+\)' : 'First Name \(Optional\)'\}/g, to: "{t('users.firstName')} (Optional)" },
      { from: /\{isRtl \? 'الاسم الأخير \(\w+\)' : 'Last Name \(Optional\)'\}/g, to: "{t('users.lastName')} (Optional)" },
      { from: /\{isRtl \? 'البريد الإلكتروني \*' : 'Email \*'\}/g, to: "{t('users.email')} *" },
      { from: /\{isRtl \? 'الدور \*' : 'Role \*'\}/g, to: "{t('users.role')} *" },
      { from: /\{isRtl \? 'الحالة' : 'Status'\}/g, to: "{t('common.status')}" },
      { from: /\{isRtl \? 'نشط' : 'Active'\}/g, to: "{t('common.active')}" },
      { from: /\{isRtl \? 'غير نشط' : 'Inactive'\}/g, to: "{t('common.inactive')}" },
      { from: /\{isRtl \? 'إلغاء' : 'Cancel'\}/g, to: "{t('common.cancel')}" },
      { from: /\{isRtl \? 'حفظ\.\.\.' : 'Saving\.\.\.'\}/g, to: "{saving ? t('common.loading') : t('common.save')}" },
      { from: /\{isRtl \? 'حفظ' : 'Save'\}/g, to: "{saving ? t('common.loading') : t('common.save')}" }
    ]
  }
];

filesToRefactor.forEach(item => {
  if (fs.existsSync(item.file)) {
    let content = fs.readFileSync(item.file, 'utf8');
    
    // Inject import { useTranslation } if missing
    if (!content.includes('useTranslation')) {
      content = content.replace(/(import React.*?;)/, "$1\nimport { useTranslation } from '../../contexts/LanguageContext';");
    }
    
    // Inject const { t } = useTranslation(); inside the component
    if (!content.includes('const { t } = useTranslation();') && !content.includes('const { t, language } = useTranslation();')) {
      content = content.replace(/(const [A-Za-z]+ = \([^\)]*\) => {)/, "$1\n  const { t } = useTranslation();");
    }

    item.replacements.forEach(r => {
      content = content.replace(r.from, r.to);
    });

    fs.writeFileSync(item.file, content, 'utf8');
    console.log(`Refactored: ${item.file}`);
  } else {
    console.log(`Not found: ${item.file}`);
  }
});
