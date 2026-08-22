const fs = require('fs');

const permissionsContent = `
          {/* ROLE & PERMISSIONS */}
          {activeTab === 'permissions' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              <div style={{ backgroundColor: '#f0f9ff', border: '1px solid #bae6fd', borderRadius: '12px', padding: '16px 24px', display: 'flex', alignItems: 'center', gap: '16px' }}>
                <div style={{ backgroundColor: '#0284c7', color: 'white', padding: '8px 16px', borderRadius: '8px', fontWeight: 600, fontSize: '1.1rem' }}>
                  {roleName || 'N/A'}
                </div>
                <div style={{ color: '#0369a1', fontSize: '0.95rem' }}>
                  {isRtl 
                    ? 'هذه هي الصلاحيات الفعلية الممنوحة لدورك الحالي في النظام. لا يمكنك تعديل الصلاحيات من هنا.' 
                    : 'These are the actual permissions granted to your current role. You cannot modify permissions from here.'}
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '24px' }}>
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
                    icon: ClipboardList,
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
                    icon: Truck,
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
                    icon: Factory,
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
                    icon: Shield,
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
                  <div key={group.id} style={{ border: '1px solid var(--color-border)', borderRadius: '12px', overflow: 'hidden', backgroundColor: 'white' }}>
                    <div style={{ padding: '16px', backgroundColor: '#f9fafb', borderBottom: '1px solid var(--color-border)', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 600 }}>
                      <group.icon size={18} style={{ color: 'var(--color-text-secondary)' }} />
                      {group.title}
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      {group.perms.map((p, i) => {
                        const allowed = hasPermission(p.key);
                        return (
                          <div key={p.key} style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: i < group.perms.length - 1 ? '1px solid var(--color-border)' : 'none' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', color: allowed ? 'var(--color-text)' : 'var(--color-text-secondary)' }}>
                              <p.icon size={16} />
                              <span style={{ fontSize: '0.95rem' }}>{p.label}</span>
                            </div>
                            {allowed ? (
                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#10b981', fontSize: '0.85rem', fontWeight: 600, backgroundColor: '#d1fae5', padding: '4px 10px', borderRadius: '999px' }}>
                                <CheckCircle2 size={14} />
                                {isRtl ? 'مسموح' : 'Allowed'}
                              </div>
                            ) : (
                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#9ca3af', fontSize: '0.85rem', fontWeight: 500 }}>
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

let content = fs.readFileSync('src/pages/settings/Settings.tsx', 'utf8');
content = content.replace(
  '        </div>\n      </div>\n    </div>\n  );\n}',
  permissionsContent + '\n        </div>\n      </div>\n    </div>\n  );\n}'
);

fs.writeFileSync('src/pages/settings/Settings.tsx', content);
