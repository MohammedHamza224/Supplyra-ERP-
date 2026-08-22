const fs = require('fs');

let content = fs.readFileSync('src/pages/settings/Settings.tsx', 'utf8');

// I need to add `Building2` and `KeyRound` to imports if they aren't there.
if (!content.includes('Building2')) {
  content = content.replace(
    /import \{([^\}]+)\} from 'lucide-react';/,
    (match, p1) => {
      return `import {${p1}, Building2, KeyRound} from 'lucide-react';`;
    }
  );
}

// Check if permissions exists in useAuth()
if (!content.includes('permissions } = useAuth()') && !content.includes('permissions, hasPermission } = useAuth()')) {
  content = content.replace(
    "const { user, profile, roleName, hasPermission } = useAuth();",
    "const { user, profile, roleName, hasPermission, permissions } = useAuth();"
  );
}

const oldPermissionsTabStart = `          {/* ROLE & PERMISSIONS */}`;
const oldPermissionsTabEndMarker = `          {/* SYSTEM INFO (Managers Only) */}`;

// Extract the old permissions code
const startIndex = content.indexOf(oldPermissionsTabStart);
const endIndex = content.indexOf(oldPermissionsTabEndMarker);

if (startIndex === -1 || endIndex === -1) {
  console.log("Could not find permissions block");
  process.exit(1);
}

const oldBlock = content.substring(startIndex, endIndex);

const newPermissionsBlock = `          {/* ROLE & PERMISSIONS */}
          {activeTab === 'permissions' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', width: '100%', maxWidth: '1000px' }}>
              
              {/* Role Summary Cards */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
                <div className="card" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '8px', border: '1px solid var(--color-border)' }}>
                  <span style={{ color: 'var(--color-text-secondary)', fontSize: '0.9rem', fontWeight: 500 }}>{isRtl ? 'الدور الحالي' : 'Current Role'}</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <ShieldCheck size={24} style={{ color: 'var(--color-primary)' }} />
                    <span style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--color-text)' }}>{roleName || 'N/A'}</span>
                  </div>
                </div>
                <div className="card" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '8px', border: '1px solid var(--color-border)' }}>
                  <span style={{ color: 'var(--color-text-secondary)', fontSize: '0.9rem', fontWeight: 500 }}>{isRtl ? 'الصلاحيات الممنوحة' : 'Granted Permissions'}</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <KeyRound size={24} style={{ color: 'var(--color-primary)' }} />
                    <span style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--color-text)' }}>{permissions?.length || 0}</span>
                  </div>
                </div>
                <div className="card" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '8px', border: '1px solid var(--color-border)' }}>
                  <span style={{ color: 'var(--color-text-secondary)', fontSize: '0.9rem', fontWeight: 500 }}>{isRtl ? 'حالة الحساب' : 'Account Status'}</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <CheckCircle2 size={24} style={{ color: '#10b981' }} />
                    <span style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--color-text)' }}>{isRtl ? 'نشط' : 'Active'}</span>
                  </div>
                </div>
              </div>

              {/* Header Title */}
              <div style={{ marginTop: '8px', marginBottom: '8px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <h3 style={{ fontSize: '1.2rem', fontWeight: 600, color: 'var(--color-text)', margin: 0 }}>
                  {isRtl ? 'الصلاحيات التفصيلية' : 'Detailed Permissions'}
                </h3>
                <p style={{ color: 'var(--color-text-secondary)', margin: 0, fontSize: '0.95rem' }}>
                  {isRtl 
                    ? 'الصلاحيات الفعلية الممنوحة لك حسب دورك في النظام.' 
                    : 'The actual permissions granted to you based on your role.'}
                </p>
              </div>

              {/* Permissions Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' }}>
                {[
                  {
                    id: 'products',
                    title: isRtl ? 'المنتجات' : 'Products',
                    icon: Package,
                    perms: [
                      { key: 'products.view', label: isRtl ? 'عرض المنتجات' : 'View Products', icon: Eye },
                      { key: 'products.create', label: isRtl ? 'إنشاء المنتجات' : 'Create Products', icon: Plus },
                      { key: 'products.update', label: isRtl ? 'تعديل المنتجات' : 'Update Products', icon: Edit2 },
                      { key: 'products.deactivate', label: isRtl ? 'تعطيل المنتجات' : 'Deactivate Products', icon: Ban },
                    ]
                  },
                  {
                    id: 'sales',
                    title: isRtl ? 'المبيعات' : 'Sales',
                    icon: ShoppingCart,
                    perms: [
                      { key: 'sales.view', label: isRtl ? 'عرض المبيعات' : 'View Sales', icon: Eye },
                      { key: 'sales.create', label: isRtl ? 'إنشاء المبيعات' : 'Create Sales', icon: Plus },
                      { key: 'sales.update', label: isRtl ? 'تعديل المبيعات' : 'Update Sales', icon: Edit2 },
                      { key: 'sales.receive_payment', label: isRtl ? 'استلام المدفوعات' : 'Receive Payments', icon: DollarSign },
                      { key: 'sales.cancel', label: isRtl ? 'إلغاء المبيعات' : 'Cancel Sales', icon: X },
                      { key: 'sales.discount.approve', label: isRtl ? 'اعتماد الخصم' : 'Approve Discount', icon: Check },
                    ]
                  },
                  {
                    id: 'purchases',
                    title: isRtl ? 'المشتريات' : 'Purchases',
                    icon: Truck,
                    perms: [
                      { key: 'purchases.view', label: isRtl ? 'عرض المشتريات' : 'View Purchases', icon: Eye },
                      { key: 'purchases.create', label: isRtl ? 'إنشاء المشتريات' : 'Create Purchases', icon: Plus },
                      { key: 'purchases.update', label: isRtl ? 'تعديل المشتريات' : 'Update Purchases', icon: Edit2 },
                      { key: 'purchases.receive', label: isRtl ? 'استلام المشتريات' : 'Receive Purchases', icon: Check },
                      { key: 'purchases.cancel', label: isRtl ? 'إلغاء المشتريات' : 'Cancel Purchases', icon: X },
                    ]
                  },
                  {
                    id: 'customers',
                    title: isRtl ? 'العملاء' : 'Customers',
                    icon: Users,
                    perms: [
                      { key: 'customers.view', label: isRtl ? 'عرض العملاء' : 'View Customers', icon: Eye },
                      { key: 'customers.create', label: isRtl ? 'إنشاء العملاء' : 'Create Customers', icon: Plus },
                      { key: 'customers.update', label: isRtl ? 'تعديل العملاء' : 'Update Customers', icon: Edit2 },
                      { key: 'customers.deactivate', label: isRtl ? 'تعطيل العملاء' : 'Deactivate Customers', icon: Ban },
                    ]
                  },
                  {
                    id: 'suppliers',
                    title: isRtl ? 'الموردين' : 'Suppliers',
                    icon: Building2,
                    perms: [
                      { key: 'suppliers.view', label: isRtl ? 'عرض الموردين' : 'View Suppliers', icon: Eye },
                      { key: 'suppliers.create', label: isRtl ? 'إنشاء الموردين' : 'Create Suppliers', icon: Plus },
                      { key: 'suppliers.update', label: isRtl ? 'تعديل الموردين' : 'Update Suppliers', icon: Edit2 },
                      { key: 'suppliers.deactivate', label: isRtl ? 'تعطيل الموردين' : 'Deactivate Suppliers', icon: Ban },
                    ]
                  },
                  {
                    id: 'warehouses',
                    title: isRtl ? 'المستودعات' : 'Warehouses',
                    icon: Warehouse,
                    perms: [
                      { key: 'warehouses.view', label: isRtl ? 'عرض المستودعات' : 'View Warehouses', icon: Eye },
                      { key: 'warehouses.create', label: isRtl ? 'إنشاء المستودعات' : 'Create Warehouses', icon: Plus },
                      { key: 'warehouses.update', label: isRtl ? 'تعديل المستودعات' : 'Update Warehouses', icon: Edit2 },
                      { key: 'warehouses.deactivate', label: isRtl ? 'تعطيل المستودعات' : 'Deactivate Warehouses', icon: Ban },
                    ]
                  },
                  {
                    id: 'users_roles',
                    title: isRtl ? 'المستخدمين والصلاحيات' : 'Users & Roles',
                    icon: KeyRound,
                    perms: [
                      { key: 'users.view', label: isRtl ? 'عرض المستخدمين' : 'View Users', icon: Eye },
                      { key: 'users.create', label: isRtl ? 'إنشاء مستخدمين' : 'Create Users', icon: Plus },
                      { key: 'users.update', label: isRtl ? 'تعديل المستخدمين' : 'Update Users', icon: Edit2 },
                      { key: 'users.assign_role', label: isRtl ? 'تعيين الأدوار' : 'Assign Roles', icon: ShieldCheck },
                      { key: 'users.activate', label: isRtl ? 'تفعيل المستخدمين' : 'Activate Users', icon: Check },
                      { key: 'roles.view', label: isRtl ? 'عرض الأدوار' : 'View Roles', icon: Eye },
                      { key: 'permissions.view', label: isRtl ? 'عرض الصلاحيات' : 'View Permissions', icon: Eye },
                    ]
                  }
                ].map(group => (
                  <div key={group.id} className="card" style={{ display: 'flex', flexDirection: 'column', border: '1px solid var(--color-border)', borderRadius: '12px', overflow: 'hidden' }}>
                    <div style={{ padding: '16px', borderBottom: '1px solid var(--color-border)', display: 'flex', alignItems: 'center', gap: '10px', backgroundColor: 'var(--color-surface-hover)' }}>
                      <group.icon size={20} style={{ color: 'var(--color-primary)' }} />
                      <h4 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 600, color: 'var(--color-text)' }}>{group.title}</h4>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', padding: '8px 0' }}>
                      {group.perms.map((p, i) => {
                        const allowed = hasPermission(p.key);
                        return (
                          <div key={p.key} style={{ padding: '10px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: i < group.perms.length - 1 ? '1px solid var(--color-border)' : 'none' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', color: allowed ? 'var(--color-text)' : 'var(--color-text-muted)' }}>
                              <p.icon size={16} />
                              <span style={{ fontSize: '0.9rem', fontWeight: allowed ? 500 : 400 }}>{p.label}</span>
                            </div>
                            {allowed ? (
                              <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--color-primary)', fontSize: '0.8rem', fontWeight: 600, backgroundColor: 'var(--color-primary-light)', padding: '4px 8px', borderRadius: '6px' }}>
                                <CheckCircle2 size={14} />
                                {isRtl ? 'مسموح' : 'Allowed'}
                              </div>
                            ) : (
                              <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--color-text-muted)', fontSize: '0.8rem', fontWeight: 500, backgroundColor: 'var(--color-surface-hover)', padding: '4px 8px', borderRadius: '6px' }}>
                                {isRtl ? '— غير مسموح' : '— Not Allowed'}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

`;

content = content.replace(oldBlock, newPermissionsBlock);

fs.writeFileSync('src/pages/settings/Settings.tsx', content);
