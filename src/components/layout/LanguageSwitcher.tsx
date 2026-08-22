import React from 'react';
import { useTranslation } from '../../contexts/LanguageContext';

export const LanguageSwitcher: React.FC<{ className?: string }> = ({ className = '' }) => {
  const { language, setLanguage } = useTranslation();

  return (
    <div className={`language-switcher ${className}`} style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
      <button 
        type="button"
        onClick={() => setLanguage('en')}
        style={{ 
          background: 'none', 
          border: 'none', 
          cursor: 'pointer',
          fontWeight: language === 'en' ? 'bold' : 'normal',
          color: language === 'en' ? 'var(--color-primary)' : 'inherit',
          padding: 0
        }}
      >
        English
      </button>
      <span>|</span>
      <button 
        type="button"
        onClick={() => setLanguage('ar')}
        style={{ 
          background: 'none', 
          border: 'none', 
          cursor: 'pointer',
          fontWeight: language === 'ar' ? 'bold' : 'normal',
          color: language === 'ar' ? 'var(--color-primary)' : 'inherit',
          fontFamily: 'system-ui, -apple-system, sans-serif',
          padding: 0
        }}
      >
        العربية
      </button>
    </div>
  );
};
