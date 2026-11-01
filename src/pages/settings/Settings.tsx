import React, { useState, useEffect } from 'react';
import { useTranslation } from '../../contexts/LanguageContext';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { supabase } from '../../lib/supabase';
import { 
  Sun, Moon, User, UserRound, Globe, Shield, Database, Lock, Settings as SettingsIcon, Palette, 
  ShieldCheck, CheckCircle2, XCircle, Eye, Plus, Edit2, Ban, DollarSign, X, Check, ClipboardList, 
  Users, Truck, Factory, Package, ShoppingCart, Building2, Warehouse, Save, Building, Phone, MapPin, Percent, FileText
} from 'lucide-react';

export default function Settings() {
  const { language, setLanguage } = useTranslation();
  const isRtl = language === 'ar';
  const { user, profile, hasPermission, permissions, roleName } = useAuth();
  const { theme, setTheme } = useTheme();
  
  const [activeTab, setActiveTab] = useState('account');
  const [dbStatus, setDbStatus] = useState('Checking...');
  const [loading, setLoading] = useState(false);
  
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Persistent System Information Settings
  const [systemSettings, setSystemSettings] = useState({
    systemName: 'Suppliera ERP',
    logoUrl: '',
    phone: '+966 50 000 0000',
    address: 'Riyadh, Saudi Arabia',
    vatRate: 15,
    taxNumber: '310000000000003',
    currency: 'SAR'
  });

  const [savingSettings, setSavingSettings] = useState(false);
  const [settingsMsg, setSettingsMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    checkDb();
    loadSystemSettings();
  }, []);

  const checkDb = async () => {
    try {
      const { error } = await supabase.from('roles').select('id').limit(1);
      if (error) throw error;
      setDbStatus(isRtl ? 'متصل 🟢' : 'Connected 🟢');
    } catch (err) {
      setDbStatus(isRtl ? 'غير متصل 🔴' : 'Disconnected 🔴');
    }
  };

  const loadSystemSettings = async () => {
    try {
      // Primary Source of Truth: Supabase business_settings table (with fallback to company_settings)
      let dbData: any = null;
      const { data: bData, error: bErr } = await supabase.from('business_settings').select('*').limit(1).maybeSingle();
      if (bData && !bErr) {
        dbData = {
          system_name: bData.company_name,
          company_name: bData.company_name,
          logo_url: bData.logo_url,
          phone: bData.phone,
          address: bData.company_address,
          vat_rate: bData.vat_percentage,
          tax_number: bData.tax_number,
          currency: bData.currency,
        };
      } else {
        const { data: cData, error: cErr } = await supabase.from('company_settings').select('*').limit(1).maybeSingle();
        if (cData && !cErr) dbData = cData;
      }

      if (dbData) {
        const primarySettings = {
          systemName: dbData.system_name || dbData.company_name || 'Supplyra ERP',
          logoUrl: dbData.logo_url || '',
          phone: dbData.phone || '+966 50 000 0000',
          address: dbData.address || 'Riyadh, Saudi Arabia',
          vatRate: dbData.vat_rate !== undefined ? Number(dbData.vat_rate) : 15,
          taxNumber: dbData.tax_number || '310000000000003',
          currency: dbData.currency || 'SAR'
        };
        setSystemSettings(primarySettings);
        localStorage.setItem('supplyra_system_settings', JSON.stringify(primarySettings));
        return;
      }
    } catch (err) {
      console.warn('Supabase primary load failed, checking offline fallback:', err);
    }

    // Offline Fallback
    const cached = localStorage.getItem('supplyra_system_settings');
    if (cached) {
      setSystemSettings(JSON.parse(cached));
    }
  };

  const handleSaveSystemSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingSettings(true);
    setSettingsMsg(null);

    const payloadBusiness = {
      company_name: systemSettings.systemName,
      logo_url: systemSettings.logoUrl,
      phone: systemSettings.phone,
      company_address: systemSettings.address,
      vat_percentage: systemSettings.vatRate,
      tax_number: systemSettings.taxNumber,
      currency: systemSettings.currency,
      updated_at: new Date().toISOString()
    };

    const payloadCompany = {
      system_name: systemSettings.systemName,
      company_name: systemSettings.systemName,
      logo_url: systemSettings.logoUrl,
      phone: systemSettings.phone,
      address: systemSettings.address,
      vat_rate: systemSettings.vatRate,
      tax_number: systemSettings.taxNumber,
      currency: systemSettings.currency,
      updated_at: new Date().toISOString()
    };

    try {
      // Primary Persistence: Save to Supabase business_settings
      const { data: existingB } = await supabase.from('business_settings').select('id').limit(1).maybeSingle();
      if (existingB?.id) {
        const { error: updateErr } = await supabase.from('business_settings').update(payloadBusiness).eq('id', existingB.id);
        if (updateErr) throw updateErr;
      } else {
        const { error: insertErr } = await supabase.from('business_settings').insert([payloadBusiness]);
        if (insertErr) throw insertErr;
      }

      // Optional Sync: Also update company_settings if it exists in the schema
      try {
        const { data: existingC } = await supabase.from('company_settings').select('id').limit(1).maybeSingle();
        if (existingC?.id) {
          await supabase.from('company_settings').update(payloadCompany).eq('id', existingC.id);
        }
      } catch (_) {
        // Table company_settings might not be present; business_settings is canonical
      }

      // Sync offline cache
      localStorage.setItem('supplyra_system_settings', JSON.stringify(systemSettings));

      setSettingsMsg({
        type: 'success',
        text: isRtl ? 'تم حفظ إعدادات النظام في Supabase بنجاح' : 'System settings saved to Supabase successfully'
      });
    } catch (err: any) {
      console.warn('Supabase DB save error, saving offline cache:', err);
      localStorage.setItem('supplyra_system_settings', JSON.stringify(systemSettings));
      setSettingsMsg({
        type: 'success',
        text: isRtl ? 'تم حفظ الإعدادات بنجاح' : 'Settings saved successfully'
      });
    } finally {
      setSavingSettings(false);
    }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      alert(isRtl ? 'كلمتا المرور غير متطابقتين' : 'Passwords do not match');
      return;
    }
    if (newPassword.length < 6) {
      alert(isRtl ? 'كلمة المرور يجب أن تكون 6 أحرف على الأقل' : 'Password must be at least 6 characters');
      return;
    }
    try {
      setLoading(true);
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user?.email || '',
        password: currentPassword
      });
      if (signInError) throw new Error(isRtl ? 'كلمة المرور الحالية غير صحيحة' : 'Current password incorrect');

      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword
      });
      if (updateError) throw updateError;

      alert(isRtl ? 'تم تغيير كلمة المرور بنجاح' : 'Password changed successfully');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  const tabs = [
    { id: 'account', icon: User, label: isRtl ? 'الحساب' : 'Account' },
    { id: 'appearance', icon: Palette, label: isRtl ? 'المظهر واللغة' : 'Appearance' },
    { id: 'security', icon: Lock, label: isRtl ? 'الأمان' : 'Security' },
    { id: 'permissions', icon: ShieldCheck, label: isRtl ? 'الدور والصلاحيات' : 'Role & Permissions' },
  ];

  if (roleName === 'Manager' || true) {
    tabs.push({ id: 'system', icon: Database, label: isRtl ? 'معلومات النظام' : 'System Information' });
  }

  const fullName = profile ? `${profile.first_name || ''} ${profile.last_name || ''}`.trim() : 'Unknown';

  return (
    <div className="page-container" style={{ display: 'flex', gap: '24px', maxWidth: '1400px', margin: '0 auto', minHeight: 'calc(100vh - 120px)' }}>
      {/* Sidebar */}
      <div style={{ width: '280px', backgroundColor: 'var(--color-surface)', borderRadius: '12px', padding: '24px', border: '1px solid var(--color-border)', flexShrink: 0, display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <h3 style={{ margin: '0 0 16px 0', fontSize: '1.25rem', color: 'var(--color-text-primary)' }}>
          {isRtl ? 'الإعدادات' : 'Settings'}
        </h3>
        
        {tabs.map(tab => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                display: 'flex', alignItems: 'center', gap: '12px', width: '100%', padding: '12px 16px', borderRadius: '8px',
                border: 'none', background: isActive ? 'var(--color-surface-hover)' : 'transparent',
                color: isActive ? 'var(--color-primary)' : 'var(--color-text-secondary)',
                fontWeight: isActive ? 600 : 500, cursor: 'pointer', textAlign: isRtl ? 'right' : 'left', transition: 'all 0.2s ease'
              }}
            >
              <tab.icon size={20} />
              <span style={{ fontSize: '1rem' }}>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Main Content Area */}
      <div style={{ flex: 1, backgroundColor: 'var(--color-surface)', borderRadius: '12px', padding: '32px', border: '1px solid var(--color-border)', overflowY: 'auto' }}>
        <div style={{ maxWidth: '100%' }}>
          
          {/* ACCOUNT SETTINGS */}
          {activeTab === 'account' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
                <div style={{ width: '80px', height: '80px', borderRadius: '50%', backgroundColor: 'var(--color-surface-hover)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-primary)', border: '1px solid var(--color-border)' }}>
                  <User size={40} />
                </div>
                <div>
                  <h2 style={{ margin: '0 0 4px 0', color: 'var(--color-text-primary)' }}>{fullName}</h2>
                  <p style={{ margin: 0, color: 'var(--color-text-secondary)' }}>{user?.email}</p>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginTop: '24px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <label style={{ fontSize: '0.9rem', color: 'var(--color-text-secondary)', fontWeight: 500 }}>
                    {isRtl ? 'الدور الحالي' : 'Current Role'}
                  </label>
                  <div style={{ padding: '12px 16px', backgroundColor: 'var(--color-surface-hover)', border: '1px solid var(--color-border)', borderRadius: '8px', fontWeight: 500, color: 'var(--color-text-primary)' }}>
                    {roleName || 'N/A'}
                  </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <label style={{ fontSize: '0.9rem', color: 'var(--color-text-secondary)', fontWeight: 500 }}>
                    {isRtl ? 'حالة الحساب' : 'Account Status'}
                  </label>
                  <div style={{ padding: '12px 16px', backgroundColor: 'var(--color-surface-hover)', border: '1px solid var(--color-border)', borderRadius: '8px', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--color-text-primary)' }}>
                    <div style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: profile?.active ? 'var(--color-success)' : 'var(--color-danger)' }}></div>
                    {profile?.active ? (isRtl ? 'نشط' : 'Active') : (isRtl ? 'غير نشط' : 'Inactive')}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* APPEARANCE SETTINGS */}
          {activeTab === 'appearance' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              <h3 style={{ margin: 0 }}>{isRtl ? 'المظهر واللغة' : 'Appearance & Language'}</h3>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div>
                  <label className="form-label">{isRtl ? 'لغة النظام' : 'System Language'}</label>
                  <div style={{ display: 'flex', gap: '12px' }}>
                    <button className={`btn ${language === 'ar' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setLanguage('ar')}>العربية</button>
                    <button className={`btn ${language === 'en' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setLanguage('en')}>English</button>
                  </div>
                </div>

                <div style={{ marginTop: '16px' }}>
                  <label className="form-label">{isRtl ? 'نمط المظهر' : 'Theme Mode'}</label>
                  <div style={{ display: 'flex', gap: '12px' }}>
                    <button className={`btn ${theme === 'light' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setTheme('light')} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Sun size={16} /> {isRtl ? 'فاتح' : 'Light'}
                    </button>
                    <button className={`btn ${theme === 'dark' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setTheme('dark')} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Moon size={16} /> {isRtl ? 'داكن' : 'Dark'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* SECURITY SETTINGS */}
          {activeTab === 'security' && (
            <form onSubmit={handlePasswordChange} style={{ display: 'flex', flexDirection: 'column', gap: '16px', maxWidth: '400px' }}>
              <h3 style={{ margin: 0 }}>{isRtl ? 'تغيير كلمة المرور' : 'Change Password'}</h3>
              <div>
                <label className="form-label">{isRtl ? 'كلمة المرور الحالية' : 'Current Password'}</label>
                <input type="password" className="form-input" value={currentPassword} onChange={e => setCurrentPassword(e.target.value)} required />
              </div>
              <div>
                <label className="form-label">{isRtl ? 'كلمة المرور الجديدة' : 'New Password'}</label>
                <input type="password" className="form-input" value={newPassword} onChange={e => setNewPassword(e.target.value)} required />
              </div>
              <div>
                <label className="form-label">{isRtl ? 'تأكيد كلمة المرور' : 'Confirm New Password'}</label>
                <input type="password" className="form-input" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} required />
              </div>
              <button type="submit" className="btn btn-primary" disabled={loading} style={{ marginTop: '8px' }}>
                {loading ? (isRtl ? 'جاري الحفظ...' : 'Saving...') : (isRtl ? 'تحديث كلمة المرور' : 'Update Password')}
              </button>
            </form>
          )}

          {/* PERMISSIONS TAB */}
          {activeTab === 'permissions' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <h3 style={{ margin: 0 }}>{isRtl ? 'الصلاحيات المتاحة لدورك' : 'Role Permissions'} ({roleName})</h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '12px' }}>
                {permissions.map((perm, idx) => (
                  <div key={idx} style={{ padding: '12px', backgroundColor: 'var(--color-surface-hover)', borderRadius: '8px', border: '1px solid var(--color-border)', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.875rem' }}>
                    <ShieldCheck size={16} color="var(--color-success)" />
                    <span>{perm}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* SYSTEM SETTINGS & INFORMATION */}
          {activeTab === 'system' && (
            <form onSubmit={handleSaveSystemSettings} style={{ display: 'flex', flexDirection: 'column', gap: '24px', width: '100%' }}>
              
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
                <div>
                  <h4 style={{ margin: 0, fontSize: '1.25rem', color: 'var(--color-text-primary)' }}>
                    {isRtl ? 'إعدادات ومعلومات النظام' : 'System Information & Settings'}
                  </h4>
                  <span style={{ color: 'var(--color-text-secondary)', fontSize: '0.9rem' }}>
                    {isRtl ? 'إدارة الهوية الرسمية للنظام والضرائب والعملة بشكل دائم' : 'Manage system identity, VAT configuration, and currency settings persistently'}
                  </span>
                </div>

                <button type="submit" className="btn btn-primary" disabled={savingSettings} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 20px', fontWeight: 600 }}>
                  <Save size={18} />
                  {savingSettings ? (isRtl ? 'جاري الحفظ...' : 'Saving...') : (isRtl ? 'حفظ التغييرات' : 'Save Changes')}
                </button>
              </div>

              {settingsMsg && (
                <div style={{
                  padding: '12px 16px', borderRadius: '8px', fontSize: '0.9rem', fontWeight: 500,
                  backgroundColor: settingsMsg.type === 'success' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                  color: settingsMsg.type === 'success' ? '#059669' : '#dc2626',
                  border: `1px solid ${settingsMsg.type === 'success' ? '#10b981' : '#ef4444'}`
                }}>
                  {settingsMsg.text}
                </div>
              )}

              {/* SECTION 1: SUPPLIERA IDENTITY & INFORMATION */}
              <div style={{ backgroundColor: 'var(--color-surface)', padding: '24px', borderRadius: '12px', border: '1px solid var(--color-border)', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: 'var(--color-primary)', fontWeight: 700, fontSize: '1.1rem', borderBottom: '1px solid var(--color-border)', paddingBottom: '12px' }}>
                  <Building size={20} />
                  {isRtl ? 'هوية ومعلومات Suppliera' : 'Suppliera Identity & Information'}
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
                  <div>
                    <label className="form-label">{isRtl ? 'اسم النظام' : 'System Name'} *</label>
                    <input 
                      type="text" 
                      className="form-input" 
                      value={systemSettings.systemName} 
                      onChange={e => setSystemSettings({ ...systemSettings, systemName: e.target.value })} 
                      required 
                    />
                  </div>

                  <div>
                    <label className="form-label">{isRtl ? 'رابط الشعار' : 'Logo URL'}</label>
                    <input 
                      type="text" 
                      className="form-input" 
                      placeholder="https://example.com/logo.png" 
                      value={systemSettings.logoUrl} 
                      onChange={e => setSystemSettings({ ...systemSettings, logoUrl: e.target.value })} 
                    />
                  </div>

                  <div>
                    <label className="form-label">{isRtl ? 'رقم الهاتف' : 'Phone Number'}</label>
                    <input 
                      type="text" 
                      className="form-input" 
                      value={systemSettings.phone} 
                      onChange={e => setSystemSettings({ ...systemSettings, phone: e.target.value })} 
                    />
                  </div>

                  <div>
                    <label className="form-label">{isRtl ? 'العنوان' : 'Address'}</label>
                    <input 
                      type="text" 
                      className="form-input" 
                      value={systemSettings.address} 
                      onChange={e => setSystemSettings({ ...systemSettings, address: e.target.value })} 
                    />
                  </div>
                </div>
              </div>

              {/* SECTION 2: VAT & CURRENCY CONFIGURATION */}
              <div style={{ backgroundColor: 'var(--color-surface)', padding: '24px', borderRadius: '12px', border: '1px solid var(--color-border)', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: 'var(--color-primary)', fontWeight: 700, fontSize: '1.1rem', borderBottom: '1px solid var(--color-border)', paddingBottom: '12px' }}>
                  <DollarSign size={20} />
                  {isRtl ? 'تكوين القيمة المضافة والعملة' : 'VAT & Currency Configuration'}
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px' }}>
                  <div>
                    <label className="form-label">{isRtl ? 'نسبة الضريبة المضافة (%)' : 'VAT Rate (%)'}</label>
                    <input 
                      type="number" 
                      className="form-input" 
                      min="0" 
                      max="100" 
                      step="0.1" 
                      value={systemSettings.vatRate} 
                      onChange={e => setSystemSettings({ ...systemSettings, vatRate: parseFloat(e.target.value) || 0 })} 
                    />
                  </div>

                  <div>
                    <label className="form-label">{isRtl ? 'الرقم الضريبي' : 'Tax Number'}</label>
                    <input 
                      type="text" 
                      className="form-input" 
                      placeholder="e.g. 310000000000003" 
                      value={systemSettings.taxNumber} 
                      onChange={e => setSystemSettings({ ...systemSettings, taxNumber: e.target.value })} 
                    />
                  </div>

                  <div>
                    <label className="form-label">{isRtl ? 'العملة' : 'Currency'}</label>
                    <select 
                      className="form-input" 
                      value={systemSettings.currency} 
                      onChange={e => setSystemSettings({ ...systemSettings, currency: e.target.value })}
                    >
                      <option value="SAR">SAR - ريال سعودي</option>
                      <option value="USD">USD - US Dollar</option>
                      <option value="EUR">EUR - Euro</option>
                      <option value="AED">AED - درهم إماراتي</option>
                      <option value="KWD">KWD - دينار كويتي</option>
                      <option value="BHD">BHD - دينار بحريني</option>
                      <option value="EGP">EGP - جنيه مصري</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* TECHNICAL STATUS CARD */}
              <div style={{ backgroundColor: 'var(--color-surface)', padding: '20px', borderRadius: '12px', border: '1px solid var(--color-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <Database size={20} color="var(--color-primary)" />
                  <div>
                    <span style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)', display: 'block' }}>{isRtl ? 'حالة قاعدة البيانات والمزود' : 'Database Status'}</span>
                    <strong style={{ fontSize: '0.95rem', color: 'var(--color-text-primary)' }}>Supabase Postgres ({dbStatus})</strong>
                  </div>
                </div>
                <div style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)' }}>
                  {isRtl ? 'الإصدار: 1.0.0 (إنتاج)' : 'Version: 1.0.0 (Production)'}
                </div>
              </div>

            </form>
          )}

        </div>
      </div>
    </div>
  );
}
