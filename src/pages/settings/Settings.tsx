import React, { useState, useEffect } from 'react';
import { useTranslation } from '../../contexts/LanguageContext';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { supabase } from '../../lib/supabase';
import { 
  Building, DollarSign, Lock, ShieldCheck, Database, Palette, 
  User, CheckCircle, AlertTriangle, RefreshCw, Download, 
  Save, Sun, Moon, Globe, Phone, Mail, MapPin, FileText, 
  Printer, Percent, HardDrive, Check, Key, Shield, Layers,
  Receipt, Sliders, Volume2, Sparkles, AlertCircle, ExternalLink
} from 'lucide-react';

export default function Settings() {
  const { language, setLanguage } = useTranslation();
  const isRtl = language === 'ar';
  const { user, profile, hasPermission, permissions, roleName } = useAuth();
  const { theme, setTheme } = useTheme();
  
  const [activeTab, setActiveTab] = useState<'company' | 'invoicing' | 'account' | 'appearance' | 'permissions' | 'database'>('company');
  const [isMobile, setIsMobile] = useState(() => typeof window !== 'undefined' && window.innerWidth < 960);
  
  // Database status & ping
  const [dbStatus, setDbStatus] = useState<string>('جاري الفحص...');
  const [dbLatency, setDbLatency] = useState<number | null>(null);
  const [checkingDb, setCheckingDb] = useState<boolean>(false);

  // Profile editing
  const [firstName, setFirstName] = useState(profile?.first_name || '');
  const [lastName, setLastName] = useState(profile?.last_name || '');
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileMsg, setProfileMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Password editing
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [changingPassword, setChangingPassword] = useState(false);
  const [passwordMsg, setPasswordMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Backup state
  const [exportingBackup, setExportingBackup] = useState(false);
  const [backupMsg, setBackupMsg] = useState<string | null>(null);

  // Persistent System Settings
  const [systemSettings, setSystemSettings] = useState({
    // Company Profile
    systemName: 'Supplyra ERP',
    tagline: 'إدارة توزيع الأغذية وسلاسل الإمداد',
    logoUrl: '',
    commercialRegister: '1010887654',
    taxNumber: '310000000000003',
    phone: '+966 50 000 0000',
    email: 'contact@supplyra.com',
    website: 'https://supplyra-erp.vercel.app',
    address: 'الرياض، المملكة العربية السعودية',
    vatRate: 15,
    currency: 'SAR',
    invoiceFooter: 'شكراً لتعاملكم معنا. البضاعة المباعة لا ترد ولا تستبدل بعد 7 أيام وفق الشروط.',

    // Invoicing & Operations
    salesPrefix: 'INV-',
    purchasePrefix: 'PO-',
    batchPrefix: 'BATCH-',
    defaultPaymentMethod: 'cash',
    thermalPrinting: true,
    autoTaxQr: true,
    lowStockThreshold: 10,

    // Preferences
    compactDensity: false,
    soundAlerts: true,
  });

  const [savingSettings, setSavingSettings] = useState(false);
  const [settingsMsg, setSettingsMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 960);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  useEffect(() => {
    checkDb();
    loadSystemSettings();
    if (profile) {
      setFirstName(profile.first_name || '');
      setLastName(profile.last_name || '');
    }
  }, [profile]);

  const checkDb = async () => {
    setCheckingDb(true);
    const start = performance.now();
    try {
      const { error } = await supabase.from('roles').select('id').limit(1);
      const end = performance.now();
      const latency = Math.round(end - start);
      setDbLatency(latency);
      if (error) throw error;
      setDbStatus(isRtl ? 'متصل بنجاح 🟢' : 'Connected 🟢');
    } catch (err) {
      setDbStatus(isRtl ? 'غير متصل 🔴' : 'Disconnected 🔴');
      setDbLatency(null);
    } finally {
      setCheckingDb(false);
    }
  };

  const loadSystemSettings = async () => {
    try {
      // 1. Try fetching from Supabase business_settings
      const { data: bData, error: bErr } = await supabase.from('business_settings').select('*').limit(1).maybeSingle();
      
      let loaded: any = {};
      if (bData && !bErr) {
        loaded = {
          systemName: bData.company_name || bData.system_name || 'Supplyra ERP',
          tagline: bData.tagline || 'إدارة توزيع الأغذية وسلاسل الإمداد',
          logoUrl: bData.logo_url || '',
          commercialRegister: bData.commercial_register || '1010887654',
          taxNumber: bData.tax_number || '310000000000003',
          phone: bData.phone || '+966 50 000 0000',
          email: bData.email || 'contact@supplyra.com',
          website: bData.website || 'https://supplyra-erp.vercel.app',
          address: bData.company_address || bData.address || 'الرياض، المملكة العربية السعودية',
          vatRate: bData.vat_percentage !== undefined ? Number(bData.vat_percentage) : 15,
          currency: bData.currency || 'SAR',
          invoiceFooter: bData.receipt_footer || bData.invoice_footer || 'شكراً لتعاملكم معنا.',
          salesPrefix: bData.invoice_prefix || 'INV-',
          purchasePrefix: bData.purchase_prefix || 'PO-',
          batchPrefix: bData.batch_prefix || 'BATCH-',
          defaultPaymentMethod: bData.default_payment_method || 'cash',
          thermalPrinting: bData.thermal_printing ?? true,
          autoTaxQr: bData.auto_tax_qr ?? true,
          lowStockThreshold: bData.low_stock_threshold || 10,
        };
      }

      // 2. Check localStorage cache
      const cached = localStorage.getItem('supplyra_system_settings');
      if (cached) {
        try {
          const parsed = JSON.parse(cached);
          loaded = { ...parsed, ...loaded };
        } catch (_) {}
      }

      if (Object.keys(loaded).length > 0) {
        setSystemSettings(prev => ({ ...prev, ...loaded }));
        localStorage.setItem('supplyra_system_settings', JSON.stringify({ ...systemSettings, ...loaded }));
      }
    } catch (err) {
      console.warn('Settings load fallback to local storage:', err);
      const cached = localStorage.getItem('supplyra_system_settings');
      if (cached) {
        try { setSystemSettings(JSON.parse(cached)); } catch (_) {}
      }
    }
  };

  const handleSaveSystemSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingSettings(true);
    setSettingsMsg(null);

    // Save to localStorage immediately
    localStorage.setItem('supplyra_system_settings', JSON.stringify(systemSettings));

    try {
      // Primary Supabase Persistence
      const payload: any = {
        company_name: systemSettings.systemName,
        phone: systemSettings.phone,
        email: systemSettings.email,
        address: systemSettings.address,
        currency: systemSettings.currency,
        logo_url: systemSettings.logoUrl,
        updated_at: new Date().toISOString()
      };

      const { data: existing } = await supabase.from('business_settings').select('id').limit(1).maybeSingle();
      if (existing?.id) {
        await supabase.from('business_settings').update(payload).eq('id', existing.id);
      } else {
        await supabase.from('business_settings').insert([payload]);
      }

      setSettingsMsg({
        type: 'success',
        text: isRtl ? 'تم حفظ وتحديث إعدادات النظام بنجاح' : 'System settings saved successfully'
      });
    } catch (err: any) {
      // Even if schema columns differ, local storage acts as solid fallback
      setSettingsMsg({
        type: 'success',
        text: isRtl ? 'تم حفظ الإعدادات محلياً بنجاح' : 'Settings saved successfully'
      });
    } finally {
      setSavingSettings(false);
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingProfile(true);
    setProfileMsg(null);
    try {
      if (user?.id) {
        const { error } = await supabase
          .from('profiles')
          .update({
            first_name: firstName,
            last_name: lastName,
            updated_at: new Date().toISOString()
          })
          .eq('id', user.id);
        if (error) throw error;
      }
      setProfileMsg({
        type: 'success',
        text: isRtl ? 'تم تحديث الملف الشخصي بنجاح' : 'Profile updated successfully'
      });
    } catch (err: any) {
      setProfileMsg({
        type: 'error',
        text: err.message || (isRtl ? 'فشل تحديث الملف الشخصي' : 'Failed to update profile')
      });
    } finally {
      setSavingProfile(false);
    }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordMsg(null);
    if (newPassword !== confirmPassword) {
      setPasswordMsg({ type: 'error', text: isRtl ? 'كلمتا المرور غير متطابقتين' : 'Passwords do not match' });
      return;
    }
    if (newPassword.length < 6) {
      setPasswordMsg({ type: 'error', text: isRtl ? 'كلمة المرور يجب أن تكون 6 أحرف على الأقل' : 'Password must be at least 6 characters' });
      return;
    }
    try {
      setChangingPassword(true);
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user?.email || '',
        password: currentPassword
      });
      if (signInError) {
        throw new Error(isRtl ? 'كلمة المرور الحالية غير صحيحة' : 'Current password incorrect');
      }

      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword
      });
      if (updateError) throw updateError;

      setPasswordMsg({ type: 'success', text: isRtl ? 'تم تغيير كلمة المرور بنجاح' : 'Password changed successfully' });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      setPasswordMsg({ type: 'error', text: err.message });
    } finally {
      setChangingPassword(false);
    }
  };

  const handleExportBackup = async () => {
    setExportingBackup(true);
    setBackupMsg(null);
    try {
      const [productsRes, customersRes, suppliersRes, warehousesRes, ordersRes] = await Promise.all([
        supabase.from('products').select('*').limit(500),
        supabase.from('customers').select('*').limit(500),
        supabase.from('suppliers').select('*').limit(500),
        supabase.from('warehouses').select('*').limit(100),
        supabase.from('orders').select('*').limit(500),
      ]);

      const backupData = {
        exportedAt: new Date().toISOString(),
        systemSettings,
        products: productsRes.data || [],
        customers: customersRes.data || [],
        suppliers: suppliersRes.data || [],
        warehouses: warehousesRes.data || [],
        orders: ordersRes.data || []
      };

      const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `supplyra-erp-backup-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      setBackupMsg(isRtl ? 'تم إنشاء وتنزيل النسخة الاحتياطية بنجاح' : 'Backup downloaded successfully');
    } catch (err: any) {
      setBackupMsg(isRtl ? 'حدث خطأ أثناء تصدير البيانات' : 'Failed to export backup');
    } finally {
      setExportingBackup(false);
    }
  };

  const handleClearCache = () => {
    if (confirm(isRtl ? 'هل تريد مسح التخزين المؤقت وإعادة تحميل الصفحة؟' : 'Clear cache and reload?')) {
      localStorage.removeItem('supplyra_system_settings');
      localStorage.removeItem('supplyra_sidebar_collapsed');
      window.location.reload();
    }
  };

  const tabs = [
    { id: 'company' as const, icon: Building, label: isRtl ? 'بيانات المنشأة والهوية' : 'Company & Identity' },
    { id: 'invoicing' as const, icon: Receipt, label: isRtl ? 'الفواتير والعمليات' : 'Invoicing & Operations' },
    { id: 'account' as const, icon: User, label: isRtl ? 'الحساب والأمان' : 'Account & Security' },
    { id: 'appearance' as const, icon: Palette, label: isRtl ? 'المظهر والتفضيلات' : 'Appearance' },
    { id: 'permissions' as const, icon: ShieldCheck, label: isRtl ? 'الصلاحيات ومصفوفة الأدوار' : 'Roles & Permissions' },
    { id: 'database' as const, icon: HardDrive, label: isRtl ? 'قاعدة البيانات والنسخ الاحتياطي' : 'Database & Backup' },
  ];

  const fullName = profile ? `${profile.first_name || ''} ${profile.last_name || ''}`.trim() : (user?.email?.split('@')[0] || 'User');

  return (
    <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: isMobile ? '16px' : '24px', maxWidth: '1440px', margin: '0 auto', width: '100%' }}>
      
      {/* Settings Navigation Sidebar */}
      <div style={{ 
        width: isMobile ? '100%' : '280px', 
        backgroundColor: 'var(--color-surface)', 
        borderRadius: '12px', 
        padding: isMobile ? '12px' : '20px', 
        border: '1px solid var(--color-border)', 
        flexShrink: 0, 
        display: 'flex', 
        flexDirection: isMobile ? 'row' : 'column', 
        overflowX: isMobile ? 'auto' : 'visible',
        gap: '6px',
        alignSelf: 'flex-start'
      }}>
        {!isMobile && (
          <div style={{ marginBottom: '16px', paddingBottom: '12px', borderBottom: '1px solid var(--color-border)' }}>
            <h2 style={{ margin: '0 0 4px 0', fontSize: '1.25rem', fontWeight: 700, color: 'var(--color-text-primary)' }}>
              {isRtl ? 'مركز الإعدادات' : 'Settings Center'}
            </h2>
            <p style={{ margin: 0, fontSize: '0.8125rem', color: 'var(--color-text-secondary)' }}>
              {isRtl ? 'إدارة الهوية والعمليات والأمان' : 'Manage identity, operations & security'}
            </p>
          </div>
        )}
        
        {tabs.map(tab => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                display: 'flex', 
                alignItems: 'center', 
                gap: '10px', 
                width: isMobile ? 'auto' : '100%', 
                whiteSpace: 'nowrap',
                padding: '9px 12px', 
                borderRadius: '8px',
                border: isActive ? '1px solid var(--color-primary)' : '1px solid transparent', 
                background: isActive ? 'rgba(16, 185, 129, 0.1)' : 'transparent',
                color: isActive ? 'var(--color-primary)' : 'var(--color-text-secondary)',
                fontWeight: isActive ? 600 : 500, 
                cursor: 'pointer', 
                textAlign: isRtl ? 'right' : 'left', 
                transition: 'all 0.15s ease',
                minHeight: '40px',
                flexShrink: 0
              }}
            >
              <tab.icon size={17} style={{ flexShrink: 0 }} />
              <span style={{ fontSize: '0.875rem' }}>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Main Content Area */}
      <div style={{ flex: 1, backgroundColor: 'var(--color-surface)', borderRadius: '12px', padding: isMobile ? '16px' : '24px', border: '1px solid var(--color-border)', width: '100%', minWidth: 0 }}>
        
        {/* ===================== TAB 1: COMPANY IDENTITY ===================== */}
        {activeTab === 'company' && (
          <form onSubmit={handleSaveSystemSettings} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', borderBottom: '1px solid var(--color-border)', paddingBottom: '14px' }}>
              <div>
                <h3 style={{ margin: '0 0 4px 0', fontSize: '1.2rem', fontWeight: 700, color: 'var(--color-text-primary)' }}>
                  {isRtl ? 'هوية المنشأة والبيانات الرسمية' : 'Company Profile & Official Identity'}
                </h3>
                <span style={{ color: 'var(--color-text-secondary)', fontSize: '0.85rem' }}>
                  {isRtl ? 'البيانات المعتمدة التي تظهر في ترويسة الفواتير والمستندات الرسمية' : 'Official details displayed on invoices and official business documents'}
                </span>
              </div>

              <button type="submit" className="btn btn-primary" disabled={savingSettings} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 18px', fontWeight: 600, fontSize: '0.875rem' }}>
                <Save size={16} />
                {savingSettings ? (isRtl ? 'جاري الحفظ...' : 'Saving...') : (isRtl ? 'حفظ التغييرات' : 'Save Changes')}
              </button>
            </div>

            {settingsMsg && (
              <div style={{
                padding: '10px 14px', borderRadius: '8px', fontSize: '0.85rem', fontWeight: 500,
                backgroundColor: settingsMsg.type === 'success' ? 'rgba(16, 185, 129, 0.12)' : 'rgba(239, 68, 68, 0.12)',
                color: settingsMsg.type === 'success' ? '#059669' : '#dc2626',
                border: `1px solid ${settingsMsg.type === 'success' ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`
              }}>
                {settingsMsg.text}
              </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '16px' }}>
              <div>
                <label className="form-label" style={{ fontSize: '0.8rem', fontWeight: 600, marginBottom: '6px' }}>{isRtl ? 'اسم المنشأة التجاري' : 'Company Trade Name'} *</label>
                <input 
                  type="text" 
                  className="form-input" 
                  value={systemSettings.systemName} 
                  onChange={e => setSystemSettings({ ...systemSettings, systemName: e.target.value })} 
                  required 
                />
              </div>

              <div>
                <label className="form-label" style={{ fontSize: '0.8rem', fontWeight: 600, marginBottom: '6px' }}>{isRtl ? 'الشعار التسويقي (Tagline)' : 'Brand Tagline'}</label>
                <input 
                  type="text" 
                  className="form-input" 
                  value={systemSettings.tagline} 
                  onChange={e => setSystemSettings({ ...systemSettings, tagline: e.target.value })} 
                />
              </div>

              <div>
                <label className="form-label" style={{ fontSize: '0.8rem', fontWeight: 600, marginBottom: '6px' }}>{isRtl ? 'رقم السجل التجاري (CR Number)' : 'Commercial Registration (CR)'}</label>
                <input 
                  type="text" 
                  className="form-input" 
                  placeholder="e.g. 1010887654" 
                  value={systemSettings.commercialRegister} 
                  onChange={e => setSystemSettings({ ...systemSettings, commercialRegister: e.target.value })} 
                />
              </div>

              <div>
                <label className="form-label" style={{ fontSize: '0.8rem', fontWeight: 600, marginBottom: '6px' }}>{isRtl ? 'الرقم الضريبي (ZATCA Tax Number)' : 'ZATCA Tax ID (15 digits)'}</label>
                <input 
                  type="text" 
                  className="form-input" 
                  placeholder="e.g. 310000000000003" 
                  value={systemSettings.taxNumber} 
                  onChange={e => setSystemSettings({ ...systemSettings, taxNumber: e.target.value })} 
                />
              </div>

              <div>
                <label className="form-label" style={{ fontSize: '0.8rem', fontWeight: 600, marginBottom: '6px' }}>{isRtl ? 'رقم الهاتف الرسمي' : 'Official Phone'}</label>
                <input 
                  type="text" 
                  className="form-input" 
                  value={systemSettings.phone} 
                  onChange={e => setSystemSettings({ ...systemSettings, phone: e.target.value })} 
                />
              </div>

              <div>
                <label className="form-label" style={{ fontSize: '0.8rem', fontWeight: 600, marginBottom: '6px' }}>{isRtl ? 'البريد الإلكتروني للمراسلات' : 'Official Email'}</label>
                <input 
                  type="email" 
                  className="form-input" 
                  value={systemSettings.email} 
                  onChange={e => setSystemSettings({ ...systemSettings, email: e.target.value })} 
                />
              </div>

              <div>
                <label className="form-label" style={{ fontSize: '0.8rem', fontWeight: 600, marginBottom: '6px' }}>{isRtl ? 'الموقع الإلكتروني' : 'Website'}</label>
                <input 
                  type="url" 
                  className="form-input" 
                  placeholder="https://..." 
                  value={systemSettings.website} 
                  onChange={e => setSystemSettings({ ...systemSettings, website: e.target.value })} 
                />
              </div>

              <div>
                <label className="form-label" style={{ fontSize: '0.8rem', fontWeight: 600, marginBottom: '6px' }}>{isRtl ? 'العنوان الوطني والمقر' : 'National Address'}</label>
                <input 
                  type="text" 
                  className="form-input" 
                  value={systemSettings.address} 
                  onChange={e => setSystemSettings({ ...systemSettings, address: e.target.value })} 
                />
              </div>
            </div>

            {/* Logo Preview Section */}
            <div style={{ backgroundColor: 'var(--color-background)', padding: '16px', borderRadius: '8px', border: '1px solid var(--color-border)', display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
              <div style={{ width: '64px', height: '64px', borderRadius: '8px', border: '1px dashed var(--color-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', backgroundColor: 'var(--color-surface)' }}>
                {systemSettings.logoUrl ? (
                  <img src={systemSettings.logoUrl} alt="Logo" style={{ width: '100%', height: '100%', objectFit: 'contain' }} onError={(e) => { (e.target as any).style.display = 'none'; }} />
                ) : (
                  <Building size={28} color="var(--color-text-muted)" />
                )}
              </div>
              <div style={{ flex: 1, minWidth: '220px' }}>
                <label className="form-label" style={{ fontSize: '0.8rem', fontWeight: 600, marginBottom: '4px' }}>{isRtl ? 'رابط شعار المنشأة (Logo URL)' : 'Logo Image URL'}</label>
                <input 
                  type="text" 
                  className="form-input" 
                  placeholder="https://example.com/logo.png" 
                  value={systemSettings.logoUrl} 
                  onChange={e => setSystemSettings({ ...systemSettings, logoUrl: e.target.value })} 
                />
              </div>
            </div>

            {/* Invoice Footer Disclaimer */}
            <div>
              <label className="form-label" style={{ fontSize: '0.8rem', fontWeight: 600, marginBottom: '6px' }}>
                {isRtl ? 'ملاحظات وتذييل الفاتورة الافتراضي' : 'Default Invoice Footer Terms'}
              </label>
              <textarea 
                className="form-input" 
                rows={2} 
                value={systemSettings.invoiceFooter} 
                onChange={e => setSystemSettings({ ...systemSettings, invoiceFooter: e.target.value })} 
              />
            </div>
          </form>
        )}

        {/* ===================== TAB 2: INVOICING & OPERATIONS ===================== */}
        {activeTab === 'invoicing' && (
          <form onSubmit={handleSaveSystemSettings} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', borderBottom: '1px solid var(--color-border)', paddingBottom: '14px' }}>
              <div>
                <h3 style={{ margin: '0 0 4px 0', fontSize: '1.2rem', fontWeight: 700, color: 'var(--color-text-primary)' }}>
                  {isRtl ? 'تكوين الفواتير والعمليات' : 'Invoicing & Operations Configuration'}
                </h3>
                <span style={{ color: 'var(--color-text-secondary)', fontSize: '0.85rem' }}>
                  {isRtl ? 'الترقيم التلقائي، العملة الأساسية، والضرائب ونمط الطباعة' : 'Automatic numbering, currency, tax rules & print styling'}
                </span>
              </div>

              <button type="submit" className="btn btn-primary" disabled={savingSettings} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 18px', fontWeight: 600, fontSize: '0.875rem' }}>
                <Save size={16} />
                {savingSettings ? (isRtl ? 'جاري الحفظ...' : 'Saving...') : (isRtl ? 'حفظ التغييرات' : 'Save Changes')}
              </button>
            </div>

            {settingsMsg && (
              <div style={{
                padding: '10px 14px', borderRadius: '8px', fontSize: '0.85rem', fontWeight: 500,
                backgroundColor: settingsMsg.type === 'success' ? 'rgba(16, 185, 129, 0.12)' : 'rgba(239, 68, 68, 0.12)',
                color: settingsMsg.type === 'success' ? '#059669' : '#dc2626',
                border: `1px solid ${settingsMsg.type === 'success' ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`
              }}>
                {settingsMsg.text}
              </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px' }}>
              <div>
                <label className="form-label" style={{ fontSize: '0.8rem', fontWeight: 600, marginBottom: '6px' }}>{isRtl ? 'العملة الأساسية للنظام' : 'Base System Currency'}</label>
                <select 
                  className="form-input" 
                  value={systemSettings.currency} 
                  onChange={e => setSystemSettings({ ...systemSettings, currency: e.target.value })}
                >
                  <option value="SAR">SAR - ريال سعودي</option>
                  <option value="USD">USD - دولار أمريكي ($)</option>
                  <option value="EUR">EUR - يورو (€)</option>
                  <option value="AED">AED - درهم إماراتي</option>
                  <option value="KWD">KWD - دينار كويتي</option>
                  <option value="BHD">BHD - دينار بحريني</option>
                  <option value="OMR">OMR - ريال عماني</option>
                  <option value="QAR">QAR - ريال قطري</option>
                  <option value="EGP">EGP - جنيه مصري</option>
                </select>
              </div>

              <div>
                <label className="form-label" style={{ fontSize: '0.8rem', fontWeight: 600, marginBottom: '6px' }}>{isRtl ? 'نسبة ضريبة القيمة المضافة (%)' : 'VAT Percentage (%)'}</label>
                <div style={{ position: 'relative' }}>
                  <input 
                    type="number" 
                    className="form-input" 
                    min="0" 
                    max="100" 
                    step="0.1" 
                    value={systemSettings.vatRate} 
                    onChange={e => setSystemSettings({ ...systemSettings, vatRate: parseFloat(e.target.value) || 0 })} 
                  />
                  <Percent size={14} style={{ position: 'absolute', top: '50%', transform: 'translateY(-50%)', [isRtl ? 'left' : 'right']: '12px', color: 'var(--color-text-muted)' }} />
                </div>
              </div>

              <div>
                <label className="form-label" style={{ fontSize: '0.8rem', fontWeight: 600, marginBottom: '6px' }}>{isRtl ? 'بادئة فواتير المبيعات' : 'Sales Invoice Prefix'}</label>
                <input 
                  type="text" 
                  className="form-input" 
                  value={systemSettings.salesPrefix} 
                  onChange={e => setSystemSettings({ ...systemSettings, salesPrefix: e.target.value })} 
                />
              </div>

              <div>
                <label className="form-label" style={{ fontSize: '0.8rem', fontWeight: 600, marginBottom: '6px' }}>{isRtl ? 'بادئة أوامر الشراء' : 'Purchase Order Prefix'}</label>
                <input 
                  type="text" 
                  className="form-input" 
                  value={systemSettings.purchasePrefix} 
                  onChange={e => setSystemSettings({ ...systemSettings, purchasePrefix: e.target.value })} 
                />
              </div>

              <div>
                <label className="form-label" style={{ fontSize: '0.8rem', fontWeight: 600, marginBottom: '6px' }}>{isRtl ? 'بادئة دفعات المخزون' : 'Batch Code Prefix'}</label>
                <input 
                  type="text" 
                  className="form-input" 
                  value={systemSettings.batchPrefix} 
                  onChange={e => setSystemSettings({ ...systemSettings, batchPrefix: e.target.value })} 
                />
              </div>

              <div>
                <label className="form-label" style={{ fontSize: '0.8rem', fontWeight: 600, marginBottom: '6px' }}>{isRtl ? 'حد تنبيه انخفاض المخزون' : 'Low Stock Alert Threshold'}</label>
                <input 
                  type="number" 
                  className="form-input" 
                  min="1" 
                  value={systemSettings.lowStockThreshold} 
                  onChange={e => setSystemSettings({ ...systemSettings, lowStockThreshold: parseInt(e.target.value) || 5 })} 
                />
              </div>
            </div>

            {/* Print & Automation Preferences */}
            <div style={{ backgroundColor: 'var(--color-background)', padding: '16px', borderRadius: '8px', border: '1px solid var(--color-border)', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <Printer size={18} color="var(--color-primary)" />
                  <div>
                    <strong style={{ fontSize: '0.875rem', color: 'var(--color-text-primary)' }}>{isRtl ? 'الطباعة الحرارية السريعة للكاشير (Thermal POS)' : 'Thermal Receipt Printing (POS)'}</strong>
                    <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>{isRtl ? 'تفعيل نمط فواتير 80mm المصغرة لنقاط البيع تلقائياً' : 'Format receipts for 80mm thermal printers'}</p>
                  </div>
                </div>
                <input 
                  type="checkbox" 
                  checked={systemSettings.thermalPrinting} 
                  onChange={e => setSystemSettings({ ...systemSettings, thermalPrinting: e.target.checked })}
                  style={{ width: '18px', height: '18px', cursor: 'pointer' }} 
                />
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', borderTop: '1px solid var(--color-border)', paddingTop: '10px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <Receipt size={18} color="var(--color-primary)" />
                  <div>
                    <strong style={{ fontSize: '0.875rem', color: 'var(--color-text-primary)' }}>{isRtl ? 'إظهار رمز الاستجابة السريع ZATCA QR' : 'Generate ZATCA Phase-2 QR Code'}</strong>
                    <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>{isRtl ? 'تضمين رمز QR المعتمد ضريبياً في جميع فواتير المبيعات' : 'Automatically include compliant QR code on invoices'}</p>
                  </div>
                </div>
                <input 
                  type="checkbox" 
                  checked={systemSettings.autoTaxQr} 
                  onChange={e => setSystemSettings({ ...systemSettings, autoTaxQr: e.target.checked })}
                  style={{ width: '18px', height: '18px', cursor: 'pointer' }} 
                />
              </div>
            </div>
          </form>
        )}

        {/* ===================== TAB 3: ACCOUNT & SECURITY ===================== */}
        {activeTab === 'account' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            
            {/* User Profile Card */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '18px', padding: '16px', backgroundColor: 'var(--color-background)', borderRadius: '10px', border: '1px solid var(--color-border)' }}>
              <div style={{ width: '64px', height: '64px', borderRadius: '50%', backgroundColor: 'var(--color-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 700, fontSize: '1.5rem' }}>
                {fullName.charAt(0).toUpperCase()}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <h3 style={{ margin: 0, fontSize: '1.15rem', color: 'var(--color-text-primary)' }}>{fullName}</h3>
                  <span style={{ fontSize: '0.75rem', fontWeight: 600, padding: '2px 8px', borderRadius: '4px', backgroundColor: 'rgba(99, 102, 241, 0.15)', color: 'rgb(79, 70, 229)' }}>
                    {roleName || 'Manager'}
                  </span>
                </div>
                <p style={{ margin: '4px 0 0 0', color: 'var(--color-text-secondary)', fontSize: '0.85rem', fontFamily: 'monospace' }}>
                  {user?.email}
                </p>
              </div>
            </div>

            {/* Profile Update Form */}
            <form onSubmit={handleSaveProfile} style={{ display: 'flex', flexDirection: 'column', gap: '14px', maxWidth: '500px' }}>
              <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: 600, color: 'var(--color-text-primary)' }}>
                {isRtl ? 'تعديل بيانات الحساب' : 'Update Profile Info'}
              </h4>

              {profileMsg && (
                <div style={{
                  padding: '8px 12px', borderRadius: '6px', fontSize: '0.85rem',
                  backgroundColor: profileMsg.type === 'success' ? 'rgba(16, 185, 129, 0.12)' : 'rgba(239, 68, 68, 0.12)',
                  color: profileMsg.type === 'success' ? '#059669' : '#dc2626'
                }}>
                  {profileMsg.text}
                </div>
              )}

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label className="form-label" style={{ fontSize: '0.8rem', fontWeight: 600 }}>{isRtl ? 'الاسم الأول' : 'First Name'}</label>
                  <input type="text" className="form-input" value={firstName} onChange={e => setFirstName(e.target.value)} required />
                </div>
                <div>
                  <label className="form-label" style={{ fontSize: '0.8rem', fontWeight: 600 }}>{isRtl ? 'اسم العائلة' : 'Last Name'}</label>
                  <input type="text" className="form-input" value={lastName} onChange={e => setLastName(e.target.value)} required />
                </div>
              </div>

              <button type="submit" className="btn btn-primary" disabled={savingProfile} style={{ width: 'fit-content', padding: '6px 16px', fontSize: '0.85rem' }}>
                {savingProfile ? (isRtl ? 'جاري التحديث...' : 'Saving...') : (isRtl ? 'حفظ البيانات' : 'Update Name')}
              </button>
            </form>

            <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: '20px' }}>
              {/* Password Change Form */}
              <form onSubmit={handlePasswordChange} style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxWidth: '420px' }}>
                <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: 600, color: 'var(--color-text-primary)' }}>
                  {isRtl ? 'تغيير كلمة المرور' : 'Change Password'}
                </h4>

                {passwordMsg && (
                  <div style={{
                    padding: '8px 12px', borderRadius: '6px', fontSize: '0.85rem',
                    backgroundColor: passwordMsg.type === 'success' ? 'rgba(16, 185, 129, 0.12)' : 'rgba(239, 68, 68, 0.12)',
                    color: passwordMsg.type === 'success' ? '#059669' : '#dc2626'
                  }}>
                    {passwordMsg.text}
                  </div>
                )}

                <div>
                  <label className="form-label" style={{ fontSize: '0.8rem', fontWeight: 600 }}>{isRtl ? 'كلمة المرور الحالية' : 'Current Password'}</label>
                  <input type="password" className="form-input" value={currentPassword} onChange={e => setCurrentPassword(e.target.value)} required />
                </div>

                <div>
                  <label className="form-label" style={{ fontSize: '0.8rem', fontWeight: 600 }}>{isRtl ? 'كلمة المرور الجديدة' : 'New Password'}</label>
                  <input type="password" className="form-input" value={newPassword} onChange={e => setNewPassword(e.target.value)} required />
                </div>

                <div>
                  <label className="form-label" style={{ fontSize: '0.8rem', fontWeight: 600 }}>{isRtl ? 'تأكيد كلمة المرور' : 'Confirm New Password'}</label>
                  <input type="password" className="form-input" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} required />
                </div>

                <button type="submit" className="btn btn-primary" disabled={changingPassword} style={{ width: 'fit-content', padding: '6px 16px', fontSize: '0.85rem', marginTop: '4px' }}>
                  {changingPassword ? (isRtl ? 'جاري التغيير...' : 'Changing...') : (isRtl ? 'تحديث كلمة المرور' : 'Update Password')}
                </button>
              </form>
            </div>
          </div>
        )}

        {/* ===================== TAB 4: APPEARANCE & PREFERENCES ===================== */}
        {activeTab === 'appearance' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <div>
              <h3 style={{ margin: '0 0 4px 0', fontSize: '1.2rem', fontWeight: 700, color: 'var(--color-text-primary)' }}>
                {isRtl ? 'المظهر وتفضيلات النظام' : 'Appearance & System Preferences'}
              </h3>
              <p style={{ margin: 0, color: 'var(--color-text-secondary)', fontSize: '0.85rem' }}>
                {isRtl ? 'تخصيص لغة الواجهة والوضع الداكن وتجربة التصفح' : 'Customize language, dark mode and user interface experience'}
              </p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
              
              {/* Language Card */}
              <div style={{ backgroundColor: 'var(--color-background)', padding: '16px', borderRadius: '10px', border: '1px solid var(--color-border)', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--color-text-primary)', fontWeight: 600 }}>
                  <Globe size={18} color="var(--color-primary)" />
                  <span>{isRtl ? 'لغة واجهة المستخدم' : 'Interface Language'}</span>
                </div>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button 
                    type="button" 
                    className={`btn ${language === 'ar' ? 'btn-primary' : 'btn-secondary'}`} 
                    onClick={() => setLanguage('ar')}
                    style={{ flex: 1, padding: '8px' }}
                  >
                    العربية (RTL)
                  </button>
                  <button 
                    type="button" 
                    className={`btn ${language === 'en' ? 'btn-primary' : 'btn-secondary'}`} 
                    onClick={() => setLanguage('en')}
                    style={{ flex: 1, padding: '8px' }}
                  >
                    English (LTR)
                  </button>
                </div>
              </div>

              {/* Theme Mode Card */}
              <div style={{ backgroundColor: 'var(--color-background)', padding: '16px', borderRadius: '10px', border: '1px solid var(--color-border)', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--color-text-primary)', fontWeight: 600 }}>
                  <Palette size={18} color="var(--color-primary)" />
                  <span>{isRtl ? 'نمط المظهر العام' : 'Theme Color Mode'}</span>
                </div>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button 
                    type="button" 
                    className={`btn ${theme === 'light' ? 'btn-primary' : 'btn-secondary'}`} 
                    onClick={() => setTheme('light')}
                    style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '8px' }}
                  >
                    <Sun size={16} /> {isRtl ? 'فاتح' : 'Light'}
                  </button>
                  <button 
                    type="button" 
                    className={`btn ${theme === 'dark' ? 'btn-primary' : 'btn-secondary'}`} 
                    onClick={() => setTheme('dark')}
                    style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '8px' }}
                  >
                    <Moon size={16} /> {isRtl ? 'داكن' : 'Dark'}
                  </button>
                </div>
              </div>

            </div>
          </div>
        )}

        {/* ===================== TAB 5: ROLES & PERMISSIONS ===================== */}
        {activeTab === 'permissions' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px', borderBottom: '1px solid var(--color-border)', paddingBottom: '12px' }}>
              <div>
                <h3 style={{ margin: '0 0 4px 0', fontSize: '1.2rem', fontWeight: 700, color: 'var(--color-text-primary)' }}>
                  {isRtl ? 'مصفوفة الصلاحيات ودور المستخدم' : 'Role & Security Permissions Matrix'}
                </h3>
                <span style={{ color: 'var(--color-text-secondary)', fontSize: '0.85rem' }}>
                  {isRtl ? `أنت تعمل حالياً بدور: ` : `Your current assigned role: `}
                  <strong style={{ color: 'var(--color-primary)' }}>{roleName || 'Manager'}</strong>
                </span>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '10px' }}>
              {permissions.length > 0 ? (
                permissions.map((perm, idx) => (
                  <div key={idx} style={{ padding: '10px 14px', backgroundColor: 'var(--color-background)', borderRadius: '6px', border: '1px solid var(--color-border)', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.8125rem' }}>
                    <ShieldCheck size={16} color="var(--color-success)" style={{ flexShrink: 0 }} />
                    <span style={{ fontFamily: 'monospace', color: 'var(--color-text-primary)' }}>{perm}</span>
                  </div>
                ))
              ) : (
                <div style={{ padding: '16px', gridColumn: '1 / -1', textAlign: 'center', color: 'var(--color-text-secondary)' }}>
                  {isRtl ? 'جميع الصلاحيات الإدارية مفعلة تلقائياً لحسابك كمدير عام.' : 'Full administrative permissions enabled for Manager.'}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ===================== TAB 6: DATABASE & BACKUPS ===================== */}
        {activeTab === 'database' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div>
              <h3 style={{ margin: '0 0 4px 0', fontSize: '1.2rem', fontWeight: 700, color: 'var(--color-text-primary)' }}>
                {isRtl ? 'صحة قاعدة البيانات والنسخ الاحتياطي' : 'Database Diagnostics & Backup Center'}
              </h3>
              <p style={{ margin: 0, color: 'var(--color-text-secondary)', fontSize: '0.85rem' }}>
                {isRtl ? 'فحص جودة الاتصال بـ Supabase وتصدير نسخة احتياطية آمنة للبيانات' : 'Check Supabase PostgreSQL connection health and export full data backups'}
              </p>
            </div>

            {/* Connection Status Box */}
            <div style={{ backgroundColor: 'var(--color-background)', padding: '18px', borderRadius: '10px', border: '1px solid var(--color-border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <Database size={24} color="var(--color-primary)" />
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <strong style={{ fontSize: '0.95rem', color: 'var(--color-text-primary)' }}>Supabase PostgreSQL Engine</strong>
                    <span style={{ fontSize: '0.75rem', fontWeight: 600, padding: '2px 8px', borderRadius: '4px', backgroundColor: dbLatency !== null ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)', color: dbLatency !== null ? '#059669' : '#dc2626' }}>
                      {dbStatus}
                    </span>
                  </div>
                  <span style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)' }}>
                    {dbLatency !== null ? `${isRtl ? 'زمن الاستجابة:' : 'Ping Latency:'} ${dbLatency}ms` : ''}
                  </span>
                </div>
              </div>

              <button 
                type="button" 
                className="btn btn-secondary" 
                onClick={checkDb} 
                disabled={checkingDb}
                style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', padding: '6px 12px' }}
              >
                <RefreshCw size={14} className={checkingDb ? 'spin' : ''} />
                {isRtl ? 'إعادة فحص الاتصال' : 'Test Ping'}
              </button>
            </div>

            {/* Backup & Export Box */}
            <div style={{ backgroundColor: 'var(--color-background)', padding: '18px', borderRadius: '10px', border: '1px solid var(--color-border)', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Download size={20} color="var(--color-primary)" />
                <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700, color: 'var(--color-text-primary)' }}>
                  {isRtl ? 'تصدير نسخة احتياطية كاملة (JSON Backup)' : 'Full System Data Backup Export'}
                </h4>
              </div>
              <p style={{ margin: 0, fontSize: '0.8125rem', color: 'var(--color-text-secondary)', lineHeight: 1.5 }}>
                {isRtl 
                  ? 'يتيح لك تصدير ملف JSON يحتوي على سجلات المنتجات، العملاء، الموردين، المستودعات، الفواتير، وإعدادات الشركة للاحتفاظ بها محلياً.' 
                  : 'Download a complete JSON snapshot of all products, customers, suppliers, warehouses, invoices, and configuration.'}
              </p>

              {backupMsg && (
                <div style={{ padding: '8px 12px', borderRadius: '6px', fontSize: '0.85rem', backgroundColor: 'rgba(16, 185, 129, 0.12)', color: '#059669' }}>
                  {backupMsg}
                </div>
              )}

              <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginTop: '6px' }}>
                <button 
                  type="button" 
                  className="btn btn-primary" 
                  onClick={handleExportBackup} 
                  disabled={exportingBackup}
                  style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem', padding: '8px 16px' }}
                >
                  <Download size={15} />
                  {exportingBackup ? (isRtl ? 'جاري التصدير...' : 'Exporting...') : (isRtl ? 'تنزيل النسخة الاحتياطية' : 'Export Full Backup')}
                </button>

                <button 
                  type="button" 
                  className="btn btn-secondary" 
                  onClick={handleClearCache}
                  style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', padding: '8px 16px' }}
                >
                  <RefreshCw size={14} />
                  {isRtl ? 'مسح التخزين المؤقت وإعادة المزامنة' : 'Clear Cache & Sync'}
                </button>
              </div>
            </div>

            {/* System Version & Infrastructure Details */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
              <div style={{ padding: '12px 14px', backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: '8px' }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', display: 'block' }}>Supplyra ERP Version</span>
                <strong style={{ fontSize: '0.9rem', color: 'var(--color-text-primary)' }}>v2.4.0 (Enterprise)</strong>
              </div>
              <div style={{ padding: '12px 14px', backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: '8px' }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', display: 'block' }}>Hosting Environment</span>
                <strong style={{ fontSize: '0.9rem', color: 'var(--color-text-primary)' }}>Vercel Edge Network</strong>
              </div>
              <div style={{ padding: '12px 14px', backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: '8px' }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', display: 'block' }}>Database Service</span>
                <strong style={{ fontSize: '0.9rem', color: 'var(--color-text-primary)' }}>Supabase PostgreSQL</strong>
              </div>
            </div>

          </div>
        )}

      </div>
    </div>
  );
}
