import React from 'react';
import { useLocation, Link } from 'react-router-dom';
import { Package, Users, Truck, ShoppingCart, BarChart3, Settings, LogOut, LayoutDashboard, Factory, MapPin, Shield, ClipboardList, Sparkles } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useTranslation } from '../../contexts/LanguageContext';
import { LanguageSwitcher } from './LanguageSwitcher';
import { ThemeSwitcher } from './ThemeSwitcher';
import { useAuth, usePermission } from '../../contexts/AuthContext';

const AppShell = ({ children }: { children: React.ReactNode }) => {
  const location = useLocation();
  const { t, language } = useTranslation();
  const { profile, roleName, permissions, hasPermission } = useAuth();
  
  const canViewProducts = usePermission('products.view');
  const canViewSuppliers = usePermission('suppliers.view');
  const canViewCustomers = usePermission('customers.view');
  const canViewWarehouses = usePermission('warehouses.view');
  const canViewUsers = usePermission('users.view');
  const canViewPurchases = usePermission('purchases.view');
  const canViewSales = usePermission('sales.view');
  const canViewAnalytics = usePermission('analytics.view');
  const canViewAI = usePermission('ai.view');


  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  const navItems = [
    { name: t('appShell.navigation.dashboard'), path: '/', icon: LayoutDashboard, show: true },
    { name: t('appShell.navigation.products'), path: '/products', icon: Package, show: canViewProducts },
    { name: t('inventory.title'), path: '/inventory', icon: ClipboardList, show: canViewProducts },
    { name: t('appShell.navigation.suppliers'), path: '/suppliers', icon: Factory, show: canViewSuppliers },
    { name: t('appShell.navigation.customers'), path: '/customers', icon: Users, show: canViewCustomers },
    { name: t('appShell.navigation.warehouses'), path: '/warehouses', icon: MapPin, show: canViewWarehouses },
    { name: t('appShell.navigation.users'), path: '/users', icon: Shield, show: canViewUsers },
    { name: t('sales.title') || 'Sales', path: '/sales', icon: ShoppingCart, show: canViewSales },
    { name: t('purchases.title') || 'Purchasing', path: '/purchases', icon: Truck, show: canViewPurchases },
    { name: t('appShell.navigation.analytics') || 'Analytics', path: '/analytics', icon: BarChart3, show: canViewAnalytics },
    { name: t('appShell.navigation.ai') || 'AI Assistant', path: '/ai-assistant', icon: Sparkles, show: canViewAI },
    { name: t('appShell.navigation.settings') || 'Settings', path: '/settings', icon: Settings, show: true, disabled: false },
  ];

  const isRtl = language === 'ar';

  return (
    <div className="app-container" style={{ direction: isRtl ? 'rtl' : 'ltr', display: 'flex', height: '100vh' }}>
      {/* Sidebar - Premium Midnight Theme */}
      <div style={{ width: '280px', backgroundColor: 'var(--sidebar-bg)', color: 'white', display: 'flex', flexDirection: 'column', position: 'relative', zIndex: 10, boxShadow: '4px 0 24px rgba(0,0,0,0.1)' }}>
        <div style={{ padding: 'var(--spacing-6) var(--spacing-8)', borderBottom: '1px solid var(--sidebar-border)', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <h2 style={{ color: 'white', fontSize: '1.75rem', letterSpacing: '2px', margin: 0, fontFamily: 'var(--font-heading)', background: 'linear-gradient(90deg, #fff, var(--color-success))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            SUPPLYRA
          </h2>
          <p style={{ color: 'var(--sidebar-text)', fontSize: '0.75rem', fontWeight: 500, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
            {t('login.brandTagline')}
          </p>
        </div>
        
        <nav style={{ flex: 1, padding: 'var(--spacing-6) 0', overflowY: 'auto' }}>
          <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '4px' }}>
            {navItems.filter(item => item.show).map((item) => {
              const isActive = location.pathname === item.path || (item.path !== '/' && location.pathname.startsWith(item.path + '/'));
              return (
                <li key={item.name} style={{ padding: '0 var(--spacing-4)' }}>
                  {item.disabled ? (
                    <div style={{ 
                      padding: 'var(--spacing-3) var(--spacing-4)', 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: 'var(--spacing-4)', 
                      color: 'var(--sidebar-text)', 
                      cursor: 'not-allowed', 
                      opacity: 0.5,
                      borderRadius: 'var(--radius-md)'
                    }}>
                      <item.icon size={20} />
                      <span style={{ fontWeight: 500, fontSize: '0.9375rem' }}>{item.name}</span>
                    </div>
                  ) : (
                    <Link 
                      to={item.path} 
                      style={{ 
                        padding: 'var(--spacing-3) var(--spacing-4)', 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: 'var(--spacing-4)', 
                        color: isActive ? 'var(--sidebar-text-active)' : 'var(--sidebar-text)',
                        backgroundColor: isActive ? 'var(--sidebar-active)' : 'transparent',
                        textDecoration: 'none',
                        borderRadius: 'var(--radius-md)',
                        transition: 'all 0.2s ease',
                        fontWeight: isActive ? 600 : 500,
                        fontSize: '0.9375rem',
                        boxShadow: isActive ? 'var(--shadow-glow)' : 'none',
                        border: isActive ? '1px solid rgba(16,185,129,0.2)' : '1px solid transparent'
                      }}
                      onMouseEnter={(e) => {
                        if (!isActive) e.currentTarget.style.backgroundColor = 'var(--sidebar-hover)';
                      }}
                      onMouseLeave={(e) => {
                        if (!isActive) e.currentTarget.style.backgroundColor = 'transparent';
                      }}
                    >
                      <item.icon size={20} style={{ color: isActive ? 'var(--color-primary-light)' : 'inherit' }} />
                      <span>{item.name}</span>
                    </Link>
                  )}
                </li>
              );
            })}
          </ul>
        </nav>

        <div style={{ padding: 'var(--spacing-6)', borderTop: '1px solid var(--sidebar-border)' }}>
          <button 
            onClick={handleLogout} 
            style={{ 
              width: '100%', display: 'flex', alignItems: 'center', gap: '12px', 
              color: 'var(--sidebar-text)', backgroundColor: 'transparent', 
              border: 'none', cursor: 'pointer', padding: '10px 16px',
              borderRadius: 'var(--radius-md)', transition: 'all 0.2s ease',
              fontWeight: 500, fontSize: '0.9375rem'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.1)';
              e.currentTarget.style.color = '#f87171';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
              e.currentTarget.style.color = 'var(--sidebar-text)';
            }}
          >
            <LogOut size={20} />
            <span>{t('appShell.logout')}</span>
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="main-content" style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        <header style={{ 
          height: '72px', 
          backgroundColor: 'var(--color-surface)', opacity: 0.98, 
          backdropFilter: 'blur(12px)',
          borderBottom: '1px solid var(--color-border)', 
          display: 'flex', alignItems: 'center', padding: '0 var(--spacing-8)', 
          justifyContent: 'flex-end',
          position: 'sticky', top: 0, zIndex: 5
        }}>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '32px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: isRtl ? 'flex-start' : 'flex-end' }}>
                <span style={{ fontSize: '0.9375rem', fontWeight: 600, color: 'var(--color-text-primary)' }}>
                  {profile?.first_name} {profile?.last_name}
                </span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', fontWeight: 500, letterSpacing: '0.02em' }}>
                    {roleName || 'No Role'}
                  </span>
                  {profile && (
                    <span style={{ 
                      display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', 
                      backgroundColor: profile.active ? 'var(--color-success)' : 'var(--color-danger)',
                      boxShadow: profile.active ? '0 0 8px rgba(16,185,129,0.5)' : 'none'
                    }} title={profile.active ? 'Active' : 'Inactive'} />
                  )}
                </div>
              </div>
              <div style={{ width: '40px', height: '40px', borderRadius: '50%', backgroundColor: 'var(--color-primary-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 600, fontSize: '1rem', boxShadow: 'var(--shadow-sm)' }}>
                {profile?.first_name?.charAt(0) || 'U'}
              </div>
            </div>
            
            <div style={{ width: '1px', height: '32px', backgroundColor: 'var(--color-border)' }} />
            <ThemeSwitcher />
              <LanguageSwitcher />
          </div>
        </header>
        
        <main className="page-container">
          {children}
        </main>
      </div>
    </div>
  );
};

export default AppShell;
