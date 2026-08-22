const fs = require('fs');

let content = fs.readFileSync('src/pages/settings/Settings.tsx', 'utf8');

// 1. Add Sun, Moon to imports
if (!content.includes('Sun, Moon')) {
  content = content.replace(
    "import { ",
    "import { Sun, Moon, "
  );
}

// 2. Import useTheme
if (!content.includes('useTheme')) {
  content = content.replace(
    "import { useAuth } from '../../contexts/AuthContext';",
    "import { useAuth } from '../../contexts/AuthContext';\nimport { useTheme } from '../../contexts/ThemeContext';"
  );
}

// 3. Call useTheme
if (!content.includes('const { theme, setTheme } = useTheme();')) {
  content = content.replace(
    "const { language, setLanguage } = useTranslation();",
    "const { language, setLanguage } = useTranslation();\n  const { theme, setTheme } = useTheme();"
  );
}

// 4. Update the appearance tab UI
const oldAppearance = `            {/* APPEARANCE SETTINGS */}
            {activeTab === 'appearance' && (
              <div style={{ maxWidth: '600px' }}>
                <h4 style={{ margin: '0 0 16px 0', fontSize: '1.1rem' }}>{isRtl ? 'اللغة والاتجاه' : 'Language & Direction'}</h4>
                <div style={{ display: 'flex', gap: '16px', marginBottom: '32px' }}>
                  <button 
                    onClick={() => setLanguage('en')}
                    style={{ 
                      flex: 1, padding: '24px', borderRadius: '12px', border: language === 'en' ? '2px solid var(--color-primary)' : '2px solid var(--color-border)',
                      backgroundColor: language === 'en' ? 'rgba(99, 102, 241, 0.05)' : 'white', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px'
                    }}
                  >
                    <Globe size={32} color={language === 'en' ? 'var(--color-primary)' : '#9ca3af'} />
                    <span style={{ fontWeight: 600, fontSize: '1.1rem' }}>English (LTR)</span>
                  </button>
                  <button 
                    onClick={() => setLanguage('ar')}
                    style={{ 
                      flex: 1, padding: '24px', borderRadius: '12px', border: language === 'ar' ? '2px solid var(--color-primary)' : '2px solid var(--color-border)',
                      backgroundColor: language === 'ar' ? 'rgba(99, 102, 241, 0.05)' : 'white', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px'
                    }}
                  >
                    <Globe size={32} color={language === 'ar' ? 'var(--color-primary)' : '#9ca3af'} />
                    <span style={{ fontWeight: 600, fontSize: '1.1rem' }}>العربية (RTL)</span>
                  </button>
                </div>
              </div>
            )}`;

// Sometimes characters might differ (encoding), so let's use regex to replace appearance tab block
const appearanceRegex = /\{\/\*\s*APPEARANCE SETTINGS\s*\*\/\}.*?activeTab === 'appearance'.*?<\/div>\s*<\/div>\s*\)\}/s;

const newAppearance = `{/* APPEARANCE SETTINGS */}
            {activeTab === 'appearance' && (
              <div style={{ maxWidth: '600px' }}>
                
                <h4 style={{ margin: '0 0 16px 0', fontSize: '1.1rem', color: 'var(--color-text)' }}>{isRtl ? 'المظهر' : 'Appearance'}</h4>
                <div style={{ display: 'flex', gap: '16px', marginBottom: '32px' }}>
                  <button 
                    onClick={() => setTheme('light')}
                    style={{ 
                      flex: 1, padding: '24px', borderRadius: '12px', border: theme === 'light' ? '2px solid var(--color-primary)' : '2px solid var(--color-border)',
                      backgroundColor: theme === 'light' ? 'var(--color-primary-light)' : 'var(--color-surface)', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px',
                      opacity: theme === 'light' ? 0.1 : 1, // Will fix this properly below
                      background: theme === 'light' ? 'rgba(16, 185, 129, 0.05)' : 'var(--color-surface)',
                      color: 'var(--color-text)'
                    }}
                  >
                    <Sun size={32} color={theme === 'light' ? 'var(--color-primary)' : 'var(--color-text-muted)'} />
                    <span style={{ fontWeight: 600, fontSize: '1.1rem' }}>{isRtl ? 'الوضع الفاتح' : 'Light Mode'}</span>
                  </button>
                  <button 
                    onClick={() => setTheme('dark')}
                    style={{ 
                      flex: 1, padding: '24px', borderRadius: '12px', border: theme === 'dark' ? '2px solid var(--color-primary)' : '2px solid var(--color-border)',
                      background: theme === 'dark' ? 'rgba(16, 185, 129, 0.05)' : 'var(--color-surface)', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px',
                      color: 'var(--color-text)'
                    }}
                  >
                    <Moon size={32} color={theme === 'dark' ? 'var(--color-primary)' : 'var(--color-text-muted)'} />
                    <span style={{ fontWeight: 600, fontSize: '1.1rem' }}>{isRtl ? 'الوضع الداكن' : 'Dark Mode'}</span>
                  </button>
                </div>

                <h4 style={{ margin: '0 0 16px 0', fontSize: '1.1rem', color: 'var(--color-text)' }}>{isRtl ? 'اللغة والاتجاه' : 'Language & Direction'}</h4>
                <div style={{ display: 'flex', gap: '16px', marginBottom: '32px' }}>
                  <button 
                    onClick={() => setLanguage('en')}
                    style={{ 
                      flex: 1, padding: '24px', borderRadius: '12px', border: language === 'en' ? '2px solid var(--color-primary)' : '2px solid var(--color-border)',
                      background: language === 'en' ? 'rgba(16, 185, 129, 0.05)' : 'var(--color-surface)', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px',
                      color: 'var(--color-text)'
                    }}
                  >
                    <Globe size={32} color={language === 'en' ? 'var(--color-primary)' : 'var(--color-text-muted)'} />
                    <span style={{ fontWeight: 600, fontSize: '1.1rem' }}>English (LTR)</span>
                  </button>
                  <button 
                    onClick={() => setLanguage('ar')}
                    style={{ 
                      flex: 1, padding: '24px', borderRadius: '12px', border: language === 'ar' ? '2px solid var(--color-primary)' : '2px solid var(--color-border)',
                      background: language === 'ar' ? 'rgba(16, 185, 129, 0.05)' : 'var(--color-surface)', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px',
                      color: 'var(--color-text)'
                    }}
                  >
                    <Globe size={32} color={language === 'ar' ? 'var(--color-primary)' : 'var(--color-text-muted)'} />
                    <span style={{ fontWeight: 600, fontSize: '1.1rem' }}>العربية (RTL)</span>
                  </button>
                </div>
              </div>
            )}`;

content = content.replace(appearanceRegex, newAppearance);

// Fix background of main card in Settings.tsx to var(--color-surface)
content = content.replace(
  `backgroundColor: 'white'`,
  `backgroundColor: 'var(--color-surface)'`
);

fs.writeFileSync('src/pages/settings/Settings.tsx', content);
