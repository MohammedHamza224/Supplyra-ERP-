import React from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import { Sun, Moon } from 'lucide-react';
import { useTranslation } from '../../contexts/LanguageContext';

export function ThemeSwitcher() {
  const { theme, setTheme } = useTheme();
  const { language } = useTranslation();
  const isRtl = language === 'ar';

  return (
    <div style={{ display: 'flex', alignItems: 'center', backgroundColor: 'var(--color-surface-hover)', borderRadius: '20px', padding: '4px', border: '1px solid var(--color-border)' }}>
      <button
        onClick={() => setTheme('light')}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          padding: '6px 12px',
          borderRadius: '16px',
          border: 'none',
          backgroundColor: theme === 'light' ? 'var(--color-primary)' : 'transparent',
          color: theme === 'light' ? 'white' : 'var(--color-text-secondary)',
          cursor: 'pointer',
          transition: 'all 0.2s',
          fontSize: '0.85rem',
          fontWeight: 600
        }}
        title="الوضع الفاتح / Light Mode"
      >
        <Sun size={16} />
      </button>
      <button
        onClick={() => setTheme('dark')}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          padding: '6px 12px',
          borderRadius: '16px',
          border: 'none',
          backgroundColor: theme === 'dark' ? 'var(--color-primary)' : 'transparent',
          color: theme === 'dark' ? 'white' : 'var(--color-text-secondary)',
          cursor: 'pointer',
          transition: 'all 0.2s',
          fontSize: '0.85rem',
          fontWeight: 600
        }}
        title="الوضع الداكن / Dark Mode"
      >
        <Moon size={16} />
      </button>
    </div>
  );
}
