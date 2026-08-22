const fs = require('fs');

let settings = fs.readFileSync('src/pages/settings/Settings.tsx', 'utf8');

// Fix UserRound syntax issue
settings = settings.replace(
  "{ id: 'account', icon: User, UserRound, label: isRtl ? 'الحساب' : 'Account' },",
  "{ id: 'account', icon: User, label: isRtl ? 'الحساب' : 'Account' },"
);
settings = settings.replace(
  "{ id: 'account', icon: User, UserRound, label: isRtl ? 'Ø§Ù„Ø­Ø³Ø§Ø¨' : 'Account' },",
  "{ id: 'account', icon: User, label: isRtl ? 'الحساب' : 'Account' },"
);

// We need to inject the system tab just before the end of the content area.
const systemTabBlock = `
          {/* SYSTEM SETTINGS */}
          {activeTab === 'system' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', width: '100%' }}>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <h4 style={{ margin: 0, fontSize: '1.2rem', color: 'var(--color-text-primary)' }}>
                  {isRtl ? 'معلومات النظام' : 'System Information'}
                </h4>
                <span style={{ color: 'var(--color-text-secondary)', fontSize: '0.95rem' }}>
                  {isRtl ? 'التفاصيل التقنية وحالة النظام' : 'Technical details and system status'}
                </span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '24px' }}>
                
                {/* App Info Card */}
                <div style={{ backgroundColor: 'var(--color-surface)', padding: '24px', borderRadius: '12px', border: '1px solid var(--color-border)', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', color: 'var(--color-primary)', fontWeight: 600, fontSize: '1.1rem', borderBottom: '1px solid var(--color-border)', paddingBottom: '12px' }}>
                    <Package size={20} />
                    {isRtl ? 'معلومات التطبيق' : 'Application Info'}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: 'var(--color-text-secondary)' }}>{isRtl ? 'اسم النظام' : 'System Name'}</span>
                      <span style={{ color: 'var(--color-text-primary)', fontWeight: 500 }}>Supplyra</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: 'var(--color-text-secondary)' }}>{isRtl ? 'الوصف' : 'Description'}</span>
                      <span style={{ color: 'var(--color-text-primary)', fontWeight: 500 }}>{isRtl ? 'إدارة توزيع الأغذية وسلاسل الإمداد' : 'Food Distribution & Supply Chain'}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: 'var(--color-text-secondary)' }}>{isRtl ? 'الإصدار' : 'Version'}</span>
                      <span style={{ color: 'var(--color-text-primary)', fontWeight: 500 }}>1.0.0</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: 'var(--color-text-secondary)' }}>{isRtl ? 'البيئة' : 'Environment'}</span>
                      <span style={{ color: 'var(--color-text-primary)', fontWeight: 500 }}>{import.meta.env.MODE === 'development' ? 'Development' : 'Production'}</span>
                    </div>
                  </div>
                </div>

                {/* User Info Card */}
                <div style={{ backgroundColor: 'var(--color-surface)', padding: '24px', borderRadius: '12px', border: '1px solid var(--color-border)', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', color: 'var(--color-primary)', fontWeight: 600, fontSize: '1.1rem', borderBottom: '1px solid var(--color-border)', paddingBottom: '12px' }}>
                    <UserRound size={20} />
                    {isRtl ? 'المستخدم الحالي' : 'Current User'}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: 'var(--color-text-secondary)' }}>{isRtl ? 'الاسم' : 'Name'}</span>
                      <span style={{ color: 'var(--color-text-primary)', fontWeight: 500 }}>{fullName || (isRtl ? 'غير متوفر' : 'N/A')}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: 'var(--color-text-secondary)' }}>{isRtl ? 'البريد الإلكتروني' : 'Email'}</span>
                      <span style={{ color: 'var(--color-text-primary)', fontWeight: 500 }}>{user?.email || (isRtl ? 'غير متوفر' : 'N/A')}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: 'var(--color-text-secondary)' }}>{isRtl ? 'الدور الحالي' : 'Role'}</span>
                      <span style={{ color: 'var(--color-text-primary)', fontWeight: 500 }}>{roleName || (isRtl ? 'غير متوفر' : 'N/A')}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: 'var(--color-text-secondary)' }}>{isRtl ? 'حالة الحساب' : 'Account Status'}</span>
                      <span style={{ color: 'var(--color-success)', fontWeight: 600 }}>{isRtl ? 'نشط' : 'Active'}</span>
                    </div>
                  </div>
                </div>

                {/* DB Info Card */}
                <div style={{ backgroundColor: 'var(--color-surface)', padding: '24px', borderRadius: '12px', border: '1px solid var(--color-border)', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', color: 'var(--color-primary)', fontWeight: 600, fontSize: '1.1rem', borderBottom: '1px solid var(--color-border)', paddingBottom: '12px' }}>
                    <Database size={20} />
                    {isRtl ? 'قاعدة البيانات' : 'Database Info'}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: 'var(--color-text-secondary)' }}>{isRtl ? 'المزود' : 'Provider'}</span>
                      <span style={{ color: 'var(--color-text-primary)', fontWeight: 500 }}>Supabase</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ color: 'var(--color-text-secondary)' }}>{isRtl ? 'حالة الاتصال' : 'Connection'}</span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: dbStatus.includes('Connected') || dbStatus.includes('متصل') && !dbStatus.includes('غير') ? 'var(--color-success)' : 'var(--color-danger)', fontWeight: 600 }}>
                        {dbStatus === 'Checking...' ? (isRtl ? 'جاري الفحص...' : 'Checking...') : dbStatus}
                      </div>
                    </div>
                  </div>
                </div>

                {/* System Settings Card */}
                <div style={{ backgroundColor: 'var(--color-surface)', padding: '24px', borderRadius: '12px', border: '1px solid var(--color-border)', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', color: 'var(--color-primary)', fontWeight: 600, fontSize: '1.1rem', borderBottom: '1px solid var(--color-border)', paddingBottom: '12px' }}>
                    <Globe size={20} />
                    {isRtl ? 'إعدادات النظام' : 'System Settings'}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: 'var(--color-text-secondary)' }}>{isRtl ? 'اللغة' : 'Language'}</span>
                      <span style={{ color: 'var(--color-text-primary)', fontWeight: 500 }}>{language === 'ar' ? 'العربية' : 'English'}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: 'var(--color-text-secondary)' }}>{isRtl ? 'اتجاه الواجهة' : 'Direction'}</span>
                      <span style={{ color: 'var(--color-text-primary)', fontWeight: 500 }}>{isRtl ? 'RTL (من اليمين لليسار)' : 'LTR (Left to Right)'}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: 'var(--color-text-secondary)' }}>{isRtl ? 'المظهر (Theme)' : 'Theme'}</span>
                      <span style={{ color: 'var(--color-text-primary)', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '4px' }}>
                        {theme === 'dark' ? <Moon size={14} /> : <Sun size={14} />}
                        {theme === 'dark' ? (isRtl ? 'داكن' : 'Dark') : (isRtl ? 'فاتح' : 'Light')}
                      </span>
                    </div>
                  </div>
                </div>

              </div>
            </div>
          )}
`;

// Insert it right before the last closing tags
const targetString = `          )}
        </div>
      </div>
    </div>
  );
}`;

if (settings.includes(targetString)) {
  settings = settings.replace(targetString, systemTabBlock + targetString);
} else {
  // Try another approach if it didn't match perfectly
  const lines = settings.split('\n');
  const insertIndex = lines.length - 6; // Around where the closing tags are
  lines.splice(insertIndex, 0, systemTabBlock);
  settings = lines.join('\n');
}

fs.writeFileSync('src/pages/settings/Settings.tsx', settings);
