import React, { createContext, useContext, useState, useEffect } from 'react';
import enTranslations from '../locales/en.json';
import arTranslations from '../locales/ar.json';

type Language = 'en' | 'ar';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<Language>('en');

  useEffect(() => {
    // Initialize from localStorage or default to 'en'
    const storedLang = localStorage.getItem('supplyra_language') as Language;
    if (storedLang && (storedLang === 'en' || storedLang === 'ar')) {
      setLanguageState(storedLang);
      document.documentElement.dir = storedLang === 'ar' ? 'rtl' : 'ltr';
    }
  }, []);

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem('supplyra_language', lang);
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
  };

  const t = (path: string): string => {
    const keys = path.split('.');
    let current: any = language === 'ar' ? arTranslations : enTranslations;
    
    for (const key of keys) {
      if (current[key] === undefined) {
        console.warn(`Missing translation key: ${path}`);
        return path;
      }
      current = current[key];
    }
    
    return current as string;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useTranslation = () => {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useTranslation must be used within a LanguageProvider');
  }
  return context;
};
