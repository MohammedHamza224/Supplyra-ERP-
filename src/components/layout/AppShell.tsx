import React, { useState, useEffect } from 'react';
import { useLocation, Link } from 'react-router-dom';
import { 
  Package, Users, Truck, ShoppingCart, BarChart3, Settings, LogOut, 
  LayoutDashboard, Factory, MapPin, Shield, ClipboardList, Sparkles, 
  Menu, X, ChevronRight, ChevronLeft, ChevronDown 
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useTranslation } from '../../contexts/LanguageContext';
import { LanguageSwitcher } from './LanguageSwitcher';
import { ThemeSwitcher } from './ThemeSwitcher';
import { useAuth, usePermission } from '../../contexts/AuthContext';

const AppShell = ({ children }: { children: React.ReactNode }) => {
  const location = useLocation();
  const { t, language } = useTranslation();
  const { profile, roleName } = useAuth();
  
  // Responsive navigation state
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState(false);
  const [isDesktopCollapsed, setIsDesktopCollapsed] = useState(() => {
    return localStorage.getItem('supplyra_sidebar_collapsed') === 'true';
  });
  const [isMobileOrTablet, setIsMobileOrTablet] = useState(() => {
    if (typeof window !== 'undefined') {
      return window.innerWidth < 1024;
    }
    return false;
  });

  const canViewProducts = usePermission('products.view');
  const canViewSuppliers = usePermission('suppliers.view');
  const canViewCustomers = usePermission('customers.view');
  const canViewWarehouses = usePermission('warehouses.view');
  const canViewUsers = usePermission('users.view');
  const canViewPurchases = usePermission('purchases.view');
  const canViewSales = usePermission('sales.view');
  const canViewAnalytics = usePermission('analytics.view');
  const canViewAI = usePermission('ai.view');

  // Handle responsive viewport resize
  useEffect(() => {
    const handleResize = () => {
      const under1024 = window.innerWidth < 1024;
      setIsMobileOrTablet(under1024);
      if (!under1024) {
        setIsMobileDrawerOpen(false);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Auto-close mobile drawer on route navigation
  useEffect(() => {
    setIsMobileDrawerOpen(false);
  }, [location.pathname]);

  // Handle ESC key to close drawer
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isMobileDrawerOpen) {
        setIsMobileDrawerOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isMobileDrawerOpen]);

  const toggleDesktopCollapse = () => {
    setIsDesktopCollapsed(prev => {
      const next = !prev;
      localStorage.setItem('supplyra_sidebar_collapsed', String(next));
      return next;
    });
  };

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
    <div className="app-container" style={{ direction: isRtl ? 'rtl' : 'ltr', display: 'flex', height: '100vh', width: '100vw', overflow: 'hidden' }}>
      
      {/* Mobile/Tablet Backdrop Overlay */}
      {isMobileOrTablet && isMobileDrawerOpen && (
        <div 
          className="sidebar-backdrop" 
          onClick={() => setIsMobileDrawerOpen(false)}
          aria-label={isRtl ? 'إغلاق القائمة' : 'Close menu'}
        />
      )}

      {/* Sidebar - Responsive Drawer for Mobile/Tablet & Collapsible for Desktop */}
      <aside 
        style={{
          width: isMobileOrTablet ? '280px' : (isDesktopCollapsed ? '78px' : '280px'),
          backgroundColor: 'var(--sidebar-bg)',
          color: 'white',
          display: 'flex',
          flexDirection: 'column',
          position: isMobileOrTablet ? 'fixed' : 'relative',
          top: 0,
          bottom: 0,
          height: '100vh',
          zIndex: isMobileOrTablet ? 1000 : 10,
          boxShadow: isMobileOrTablet 
            ? (isRtl ? '-6px 0 24px rgba(0,0,0,0.3)' : '6px 0 24px rgba(0,0,0,0.3)') 
            : '4px 0 24px rgba(0,0,0,0.1)',
          transition: 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1), width 0.25s ease',
          ...(isMobileOrTablet ? {
            ...(isRtl 
              ? { right: 0, transform: isMobileDrawerOpen ? 'translateX(0)' : 'translateX(100%)' } 
              : { left: 0, transform: isMobileDrawerOpen ? 'translateX(0)' : 'translateX(-100%)' }
            )
          } : {})
        }}
        aria-hidden={isMobileOrTablet && !isMobileDrawerOpen}
      >
        {/* Sidebar Brand Header */}
        <div style={{ 
          padding: isDesktopCollapsed && !isMobileOrTablet ? 'var(--spacing-5) var(--spacing-3)' : 'var(--spacing-5) var(--spacing-6)', 
          borderBottom: '1px solid var(--sidebar-border)', 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'space-between',
          minHeight: '72px'
        }}>
          {(!isDesktopCollapsed || isMobileOrTablet) ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', overflow: 'hidden' }}>
              <h2 style={{ 
                color: 'white', 
                fontSize: '1.5rem', 
                letterSpacing: '2px', 
                margin: 0, 
                fontFamily: 'var(--font-heading)', 
                background: 'linear-gradient(90deg, #fff, var(--color-success))', 
                WebkitBackgroundClip: 'text', 
                WebkitTextFillColor: 'transparent',
                whiteSpace: 'nowrap'
              }}>
                SUPPLYRA
              </h2>
              <p style={{ color: 'var(--sidebar-text)', fontSize: '0.7rem', fontWeight: 500, letterSpacing: '0.05em', textTransform: 'uppercase', margin: 0 }}>
                {t('login.brandTagline')}
              </p>
            </div>
          ) : (
            <div style={{ width: '100%', textAlign: 'center' }}>
              <span style={{ fontWeight: 800, fontSize: '1.5rem', color: 'var(--color-primary-light)' }}>S</span>
            </div>
          )}

          {/* Close button on Mobile Drawer */}
          {isMobileOrTablet && (
            <button
              onClick={() => setIsMobileDrawerOpen(false)}
              className="touch-target"
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--sidebar-text)',
                cursor: 'pointer',
                padding: '8px',
                borderRadius: 'var(--radius-md)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                minWidth: '44px',
                minHeight: '44px'
              }}
              aria-label={isRtl ? 'إغلاق القائمة' : 'Close menu'}
            >
              <X size={22} />
            </button>
          )}

          {/* Desktop Collapse / Expand Toggle */}
          {!isMobileOrTablet && (
            <button
              onClick={toggleDesktopCollapse}
              style={{
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid var(--sidebar-border)',
                color: 'var(--sidebar-text)',
                cursor: 'pointer',
                padding: '6px',
                borderRadius: '6px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.2s'
              }}
              title={isDesktopCollapsed ? (isRtl ? 'توسيع القائمة' : 'Expand Sidebar') : (isRtl ? 'تصغير القائمة' : 'Collapse Sidebar')}
            >
              {isDesktopCollapsed ? (isRtl ? <ChevronLeft size={16} /> : <ChevronRight size={16} />) : (isRtl ? <ChevronRight size={16} /> : <ChevronLeft size={16} />)}
            </button>
          )}
        </div>
        
        {/* Navigation List */}
        <nav style={{ flex: 1, padding: 'var(--spacing-4) 0', overflowY: 'auto' }}>
          <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '4px' }}>
            {navItems.filter(item => item.show).map((item) => {
              const isActive = location.pathname === item.path || (item.path !== '/' && location.pathname.startsWith(item.path + '/'));
              const showText = !isDesktopCollapsed || isMobileOrTablet;
              
              return (
                <li key={item.name} style={{ padding: showText ? '0 var(--spacing-4)' : '0 var(--spacing-2)' }}>
                  <Link 
                    to={item.path} 
                    style={{ 
                      padding: showText ? '10px 14px' : '10px 0', 
                      minHeight: '44px',
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: showText ? 'flex-start' : 'center',
                      gap: 'var(--spacing-3)', 
                      color: isActive ? 'var(--sidebar-text-active)' : 'var(--sidebar-text)',
                      backgroundColor: isActive ? 'var(--sidebar-active)' : 'transparent',
                      textDecoration: 'none',
                      borderRadius: 'var(--radius-md)',
                      transition: 'all 0.2s ease',
                      fontWeight: isActive ? 600 : 500,
                      fontSize: '0.9375rem',
                      boxShadow: isActive ? 'var(--shadow-glow)' : 'none',
                      border: isActive ? '1px solid rgba(16,185,129,0.2)' : '1px solid transparent',
                      touchAction: 'manipulation'
                    }}
                    title={!showText ? item.name : undefined}
                  >
                    <item.icon size={20} style={{ color: isActive ? 'var(--color-primary-light)' : 'inherit', flexShrink: 0 }} />
                    {showText && <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.name}</span>}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* Sidebar Footer - Logout */}
        <div style={{ padding: isDesktopCollapsed && !isMobileOrTablet ? 'var(--spacing-4) var(--spacing-2)' : 'var(--spacing-4) var(--spacing-6)', borderTop: '1px solid var(--sidebar-border)' }}>
          <button 
            onClick={handleLogout} 
            style={{ 
              width: '100%', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: (!isDesktopCollapsed || isMobileOrTablet) ? 'flex-start' : 'center',
              gap: '12px', 
              color: 'var(--sidebar-text)', 
              backgroundColor: 'transparent', 
              border: 'none', 
              cursor: 'pointer', 
              padding: '10px 14px',
              minHeight: '44px',
              borderRadius: 'var(--radius-md)', 
              transition: 'all 0.2s ease',
              fontWeight: 500, 
              fontSize: '0.9375rem',
              touchAction: 'manipulation'
            }}
            title={isRtl ? 'تسجيل الخروج' : 'Logout'}
          >
            <LogOut size={20} style={{ flexShrink: 0 }} />
            {(!isDesktopCollapsed || isMobileOrTablet) && <span>{t('appShell.logout')}</span>}
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="main-content" style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, width: '100%', height: '100vh', overflow: 'hidden' }}>
        
        {/* Top Header Navbar */}
        <header style={{ 
          height: '70px', 
          backgroundColor: 'var(--color-surface)', 
          opacity: 0.98, 
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          borderBottom: '1px solid var(--color-border)', 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'space-between',
          padding: '0 var(--spacing-4)',
          position: 'sticky', 
          top: 0, 
          zIndex: 5,
          flexShrink: 0
        }}>
          
          {/* Header Start: Mobile Menu Toggle Button & Brand */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            {isMobileOrTablet && (
              <button
                onClick={() => setIsMobileDrawerOpen(true)}
                className="hamburger-btn"
                style={{
                  minWidth: '44px',
                  minHeight: '44px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: 'var(--color-background)',
                  border: '1px solid var(--color-border)',
                  borderRadius: 'var(--radius-md)',
                  color: 'var(--color-text-primary)',
                  cursor: 'pointer'
                }}
                aria-label={isRtl ? 'فتح القائمة الجانبية' : 'Open menu'}
              >
                <Menu size={22} />
              </button>
            )}

            {isMobileOrTablet && (
              <span style={{ 
                fontFamily: 'var(--font-heading)', 
                fontSize: '1.25rem', 
                fontWeight: 700, 
                color: 'var(--color-primary)',
                letterSpacing: '1px'
              }}>
                SUPPLYRA
              </span>
            )}
          </div>
          
          {/* Header End: Profile, Theme Switcher, Language Switcher */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            
            {/* User Profile Badge */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div className="user-text-info" style={{ 
                display: 'flex', 
                flexDirection: 'column', 
                alignItems: isRtl ? 'flex-start' : 'flex-end',
                lineHeight: 1.2
              }}>
                <span style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--color-text-primary)', whiteSpace: 'nowrap' }}>
                  {profile?.first_name ? `${profile.first_name} ${profile?.last_name || ''}` : 'User'}
                </span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', fontWeight: 500 }}>
                    {roleName || 'No Role'}
                  </span>
                  {profile && (
                    <span style={{ 
                      display: 'inline-block', width: '7px', height: '7px', borderRadius: '50%', 
                      backgroundColor: profile.active ? 'var(--color-success)' : 'var(--color-danger)',
                      boxShadow: profile.active ? '0 0 6px rgba(16,185,129,0.5)' : 'none'
                    }} title={profile.active ? 'Active' : 'Inactive'} />
                  )}
                </div>
              </div>

              {/* User Avatar Circle */}
              <div style={{ 
                width: '38px', 
                height: '38px', 
                minWidth: '38px',
                minHeight: '38px',
                borderRadius: '50%', 
                backgroundColor: 'var(--color-primary-light)', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center', 
                color: 'white', 
                fontWeight: 600, 
                fontSize: '0.9375rem', 
                boxShadow: 'var(--shadow-sm)' 
              }}>
                {profile?.first_name?.charAt(0) || 'U'}
              </div>
            </div>
            
            <div style={{ width: '1px', height: '24px', backgroundColor: 'var(--color-border)', margin: '0 4px' }} />
            
            <ThemeSwitcher />
            <LanguageSwitcher />
          </div>
        </header>
        
        {/* Main Body Viewport */}
        <main className="page-container" style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden' }}>
          {children}
        </main>
      </div>
    </div>
  );
};

export default AppShell;
