const fs = require('fs');

let settings = fs.readFileSync('src/pages/settings/Settings.tsx', 'utf8');

const splitPattern = "{activeTab === 'permissions' && (";
const index = settings.indexOf(splitPattern);

if (index === -1) {
  console.log("Could not find permissions block.");
  process.exit(1);
}

const beforePermissions = settings.substring(0, index);

const newPermissionsBlock = `{activeTab === 'permissions' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', width: '100%' }}>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <h4 style={{ margin: 0, fontSize: '1.2rem', color: 'var(--color-text-primary)' }}>
                  {isRtl ? 'الدور والصلاحيات' : 'Role & Permissions'}
                </h4>
                <span style={{ color: 'var(--color-text-secondary)', fontSize: '0.95rem' }}>
                  {isRtl ? 'الصلاحيات الفعلية حسب دور المستخدم' : 'Actual permissions based on user role'}
                </span>
              </div>

              {/* Role Summary - 3 Columns */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
                <div style={{ backgroundColor: 'var(--color-surface)', padding: '20px', borderRadius: '12px', border: '1px solid var(--color-border)', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <span style={{ color: 'var(--color-text-secondary)', fontSize: '0.9rem', fontWeight: 500 }}>{isRtl ? 'الدور الحالي' : 'Current Role'}</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--color-primary)', fontWeight: 600, fontSize: '1.25rem' }}>
                    <ShieldCheck size={20} />
                    {roleName || 'N/A'}
                  </div>
                </div>
                <div style={{ backgroundColor: 'var(--color-surface)', padding: '20px', borderRadius: '12px', border: '1px solid var(--color-border)', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <span style={{ color: 'var(--color-text-secondary)', fontSize: '0.9rem', fontWeight: 500 }}>{isRtl ? 'الصلاحيات' : 'Permissions'}</span>
                  <div style={{ color: 'var(--color-text-primary)', fontWeight: 600, fontSize: '1.25rem' }}>
                    {permissions?.length || 0}
                  </div>
                </div>
                <div style={{ backgroundColor: 'var(--color-surface)', padding: '20px', borderRadius: '12px', border: '1px solid var(--color-border)', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <span style={{ color: 'var(--color-text-secondary)', fontSize: '0.9rem', fontWeight: 500 }}>{isRtl ? 'حالة الحساب' : 'Account Status'}</span>
                  <div style={{ color: 'var(--color-success)', fontWeight: 600, fontSize: '1.25rem' }}>
                    {isRtl ? 'نشط' : 'Active'}
                  </div>
                </div>
              </div>

              {/* Permissions Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px', marginTop: '8px' }}>
                {[
                  {
                    id: 'products',
                    title: isRtl ? 'المنتجات' : 'Products',
                    icon: Package,
                    perms: [
                      { key: 'products.view', label: isRtl ? 'عرض' : 'View', icon: Eye },
                      { key: 'products.create', label: isRtl ? 'إنشاء' : 'Create', icon: Plus },
                      { key: 'products.update', label: isRtl ? 'تعديل' : 'Update', icon: Edit2 },
                      { key: 'products.deactivate', label: isRtl ? 'تعطيل' : 'Deactivate', icon: Ban },
                    ]
                  },
                  {
                    id: 'sales',
                    title: isRtl ? 'المبيعات' : 'Sales',
                    icon: ShoppingCart,
                    perms: [
                      { key: 'sales.view', label: isRtl ? 'عرض' : 'View', icon: Eye },
                      { key: 'sales.create', label: isRtl ? 'إنشاء' : 'Create', icon: Plus },
                      { key: 'sales.update', label: isRtl ? 'تعديل' : 'Update', icon: Edit2 },
                      { key: 'sales.receive_payment', label: isRtl ? 'استلام المدفوعات' : 'Receive Payments', icon: DollarSign },
                      { key: 'sales.cancel', label: isRtl ? 'إلغاء' : 'Cancel', icon: X },
                      { key: 'sales.discount.approve', label: isRtl ? 'اعتماد الخصم' : 'Approve Discount', icon: Check },
                    ]
                  },
                  {
                    id: 'purchases',
                    title: isRtl ? 'المشتريات' : 'Purchases',
                    icon: Truck,
                    perms: [
                      { key: 'purchases.view', label: isRtl ? 'عرض' : 'View', icon: Eye },
                      { key: 'purchases.create', label: isRtl ? 'إنشاء' : 'Create', icon: Plus },
                      { key: 'purchases.update', label: isRtl ? 'تعديل' : 'Update', icon: Edit2 },
                      { key: 'purchases.receive', label: isRtl ? 'استلام' : 'Receive', icon: Check },
                      { key: 'purchases.cancel', label: isRtl ? 'إلغاء' : 'Cancel', icon: X },
                    ]
                  },
                  {
                    id: 'suppliers',
                    title: isRtl ? 'الموردين' : 'Suppliers',
                    icon: Building2,
                    perms: [
                      { key: 'suppliers.view', label: isRtl ? 'عرض' : 'View', icon: Eye },
                      { key: 'suppliers.create', label: isRtl ? 'إنشاء' : 'Create', icon: Plus },
                      { key: 'suppliers.update', label: isRtl ? 'تعديل' : 'Update', icon: Edit2 },
                      { key: 'suppliers.deactivate', label: isRtl ? 'تعطيل' : 'Deactivate', icon: Ban },
                    ]
                  },
                  {
                    id: 'warehouses',
                    title: isRtl ? 'المستودعات' : 'Warehouses',
                    icon: Warehouse,
                    perms: [
                      { key: 'warehouses.view', label: isRtl ? 'عرض' : 'View', icon: Eye },
                      { key: 'warehouses.create', label: isRtl ? 'إنشاء' : 'Create', icon: Plus },
                      { key: 'warehouses.update', label: isRtl ? 'تعديل' : 'Update', icon: Edit2 },
                      { key: 'warehouses.deactivate', label: isRtl ? 'تعطيل' : 'Deactivate', icon: Ban },
                    ]
                  },
                  {
                    id: 'customers',
                    title: isRtl ? 'العملاء' : 'Customers',
                    icon: Users,
                    perms: [
                      { key: 'customers.view', label: isRtl ? 'عرض' : 'View', icon: Eye },
                      { key: 'customers.create', label: isRtl ? 'إنشاء' : 'Create', icon: Plus },
                      { key: 'customers.update', label: isRtl ? 'تعديل' : 'Update', icon: Edit2 },
                      { key: 'customers.deactivate', label: isRtl ? 'تعطيل' : 'Deactivate', icon: Ban },
                    ]
                  },
                  {
                    id: 'users',
                    title: isRtl ? 'المستخدمين' : 'Users',
                    icon: UserRound,
                    perms: [
                      { key: 'users.view', label: isRtl ? 'عرض' : 'View', icon: Eye },
                      { key: 'users.create', label: isRtl ? 'إنشاء' : 'Create', icon: Plus },
                      { key: 'users.update', label: isRtl ? 'تعديل' : 'Update', icon: Edit2 },
                      { key: 'users.activate', label: isRtl ? 'تفعيل/تعطيل' : 'Activate/Deactivate', icon: Check },
                    ]
                  },
                  {
                    id: 'roles',
                    title: isRtl ? 'الأدوار والصلاحيات' : 'Roles & Permissions',
                    icon: ShieldCheck,
                    perms: [
                      { key: 'roles.view', label: isRtl ? 'عرض الأدوار' : 'View Roles', icon: Eye },
                      { key: 'permissions.view', label: isRtl ? 'عرض الصلاحيات' : 'View Permissions', icon: Eye },
                      { key: 'users.assign_role', label: isRtl ? 'تعيين دور' : 'Assign Role', icon: ShieldCheck },
                    ]
                  }
                ].map(group => {
                  const allowedPerms = group.perms.filter(p => hasPermission(p.key));
                  if (allowedPerms.length === 0) return null;
                  
                  return (
                    <div key={group.id} style={{ border: '1px solid var(--color-border)', borderRadius: '12px', overflow: 'hidden', backgroundColor: 'var(--color-surface)' }}>
                      <div style={{ padding: '16px', backgroundColor: 'var(--color-surface-hover)', borderBottom: '1px solid var(--color-border)', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 600, color: 'var(--color-text-primary)' }}>
                        <group.icon size={18} style={{ color: 'var(--color-primary)' }} />
                        {group.title}
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        {allowedPerms.map((p, i) => (
                          <div key={p.key} style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: i < allowedPerms.length - 1 ? '1px solid var(--color-border)' : 'none' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', color: 'var(--color-text-primary)' }}>
                              <p.icon size={16} style={{ color: 'var(--color-text-secondary)' }} />
                              <span style={{ fontSize: '0.95rem' }}>{p.label}</span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--color-success)', fontSize: '0.85rem', fontWeight: 600 }}>
                              <CheckCircle2 size={16} />
                              {isRtl ? 'مسموح' : 'Allowed'}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>

            </div>
          )}
        </div>
      </div>
    </div>
  );
}
`;

const finalFile = beforePermissions + newPermissionsBlock;
fs.writeFileSync('src/pages/settings/Settings.tsx', finalFile);
