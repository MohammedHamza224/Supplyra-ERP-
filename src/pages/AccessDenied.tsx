import React from 'react';
import { useTranslation } from '../contexts/LanguageContext';
import { ShieldAlert } from 'lucide-react';
import { Link } from 'react-router-dom';

const AccessDenied = () => {
  const { t, language } = useTranslation();
  const isRtl = language === 'ar';

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      height: '100%',
      minHeight: '60vh',
      direction: isRtl ? 'rtl' : 'ltr',
      textAlign: 'center',
      padding: '24px'
    }}>
      <div style={{
        backgroundColor: 'rgba(239, 68, 68, 0.15)',
        color: 'var(--color-danger)',
        padding: '24px',
        borderRadius: '50%',
        marginBottom: '24px'
      }}>
        <ShieldAlert size={64} />
      </div>
      
      <h1 style={{ fontSize: '32px', color: 'var(--color-text-primary)', marginBottom: '8px', fontWeight: 700 }}>
        403
      </h1>
      
      <h2 style={{ fontSize: '24px', color: 'var(--color-text-primary)', marginBottom: '16px', fontWeight: 600 }}>
        {t('auth.accessDeniedTitle') || (isRtl ? 'غير مصرح لك بالوصول' : 'Access Denied')}
      </h2>
      
      <p style={{ fontSize: '16px', color: 'var(--color-text-secondary)', marginBottom: '32px', maxWidth: '400px' }}>
        {t('auth.accessDeniedMessage') || (isRtl ? 'ليس لديك الصلاحيات الكافية للوصول إلى هذه الصفحة. يرجى التواصل مع المسؤول.' : 'You do not have the necessary permissions to view this page. Please contact your administrator.')}
      </p>

      <Link 
        to="/" 
        style={{
          backgroundColor: 'var(--color-primary)',
          color: 'white',
          padding: '12px 24px',
          borderRadius: '8px',
          textDecoration: 'none',
          fontWeight: 600,
          transition: 'background-color 0.2s'
        }}
      >
        {t('auth.backToHome') || (isRtl ? 'العودة للرئيسية' : 'Back to Home')}
      </Link>
    </div>
  );
};

export default AccessDenied;
