import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { useTranslation } from '../contexts/LanguageContext';
import { Mail, Lock, Eye, EyeOff, Globe, LogIn } from 'lucide-react';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const { t, language, setLanguage } = useTranslation();

  React.useEffect(() => {
    try {
      const savedRemember = localStorage.getItem('supplyra_remember_me');
      if (savedRemember === 'true') {
        setRememberMe(true);
        const savedEmail = localStorage.getItem('supplyra_saved_email') || '';
        const savedPassword = localStorage.getItem('supplyra_saved_password') || '';
        if (savedEmail) setEmail(savedEmail);
        if (savedPassword) setPassword(savedPassword);
      }
    } catch (e) {
      console.warn('Could not load remembered login:', e);
    }
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    if (!email || !password) {
      setError(t('auth.errorMissingCredentials'));
      return;
    }
    setLoading(true);
    try {
      const { error: authError } = await supabase.auth.signInWithPassword({ email, password });
      if (authError) {
        if (authError.message === 'Failed to fetch') {
          setError(t('auth.errorNetwork') + " (AUTH_ENDPOINT: UNREACHABLE)");
        } else if (authError.status === 400) {
          setError(t('auth.errorInvalidCredentials'));
        } else {
          setError(authError.message);
        }
      } else {
        try {
          if (rememberMe) {
            localStorage.setItem('supplyra_remember_me', 'true');
            localStorage.setItem('supplyra_saved_email', email);
            localStorage.setItem('supplyra_saved_password', password);
          } else {
            localStorage.removeItem('supplyra_remember_me');
            localStorage.removeItem('supplyra_saved_email');
            localStorage.removeItem('supplyra_saved_password');
          }
        } catch (e) {
          console.warn('Could not save login credentials:', e);
        }
        setSuccess(t('auth.successLogin'));
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || t('auth.errorNetwork'));
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    if (!email) {
      setError("Please provide your email address.");
      return;
    }
    setLoading(true);
    try {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (resetError) {
        if (resetError.message === 'Failed to fetch') {
          setError(t('auth.errorNetwork'));
        } else {
          setError(resetError.message);
        }
      } else {
        setSuccess(t('auth.successResetLink'));
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || t('auth.errorNetwork'));
    } finally {
      setLoading(false);
    }
  };

  const isRtl = language === 'ar';

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      fontFamily: 'system-ui, -apple-system, sans-serif',
      backgroundImage: 'url(/login-bg.jpg)',
      backgroundSize: 'cover',
      backgroundPosition: 'center',
      position: 'relative'
    }}>
      {/* Cinematic Dark Overlay for readability - Lightened */}
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.4)', // Lighter overlay
        backdropFilter: 'blur(2px)',
        zIndex: 0
      }} />

      {/* Main Container */}
      <div style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', flex: 1, alignItems: 'center', justifyContent: 'center', padding: 'clamp(16px, 4vw, 32px)' }}>
        
        {/* Top Branding */}
        <div style={{ textAlign: 'center', marginBottom: 'clamp(24px, 5vw, 40px)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', width: 'fit-content', margin: '0 auto' }}>
            <div style={{ position: 'absolute', top: '-24px', left: '50%', transform: 'translateX(-50%)' }}>
               <svg width="40" height="40" viewBox="0 0 24 24" fill="var(--color-primary)" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 22C12 22 20 18 20 12C20 6 12 2 12 2C12 2 4 6 4 12C4 18 12 22 12 22Z" />
              </svg>
            </div>
            <h1 style={{ fontSize: 'clamp(2.5rem, 8vw, 3.8rem)', fontWeight: 800, color: 'white', margin: 0, letterSpacing: '1px', textShadow: '0 4px 12px rgba(0,0,0,0.5)' }}>
              SUPPLY<span style={{ color: 'var(--color-primary)' }}>RA</span>
            </h1>
          </div>
          <p style={{ color: 'var(--color-border)', fontSize: 'clamp(0.95rem, 3vw, 1.15rem)', fontWeight: 500, margin: '10px 0 0 0', letterSpacing: '0.5px', textShadow: '0 2px 8px rgba(0,0,0,0.5)' }}>
            {t('login.brandTagline')}
          </p>
        </div>

        {/* Premium Login Card */}
        <div style={{ width: '100%', maxWidth: '440px', backgroundColor: 'var(--color-surface)', borderRadius: '12px', padding: 'clamp(24px, 5vw, 40px) clamp(16px, 4vw, 32px)', boxShadow: '0 20px 40px -10px rgba(0, 0, 0, 0.4)', direction: isRtl ? 'rtl' : 'ltr', boxSizing: 'border-box' }}>
          
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '32px' }}>
            <div>
              <h2 style={{ color: 'var(--color-text-primary)', fontSize: '24px', fontWeight: 700, margin: '0 0 6px 0' }}>
                {isForgotPassword ? t('forgotPassword.title') : t('login.welcome')}
              </h2>
              <p style={{ color: 'var(--color-text-secondary)', fontSize: '14px', margin: 0 }}>
                {isForgotPassword ? t('forgotPassword.subtitle') : t('login.subtitle')}
              </p>
            </div>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--color-text-secondary)', fontSize: '14px' }}>
              <Globe size={16} />
              <button type="button" onClick={() => setLanguage('en')} style={{ background: 'none', border: 'none', color: language === 'en' ? 'var(--color-primary)' : 'var(--color-text-secondary)', fontWeight: language === 'en' ? 600 : 400, cursor: 'pointer', padding: 0 }}>English</button>
              <span style={{ color: 'var(--color-border)' }}>|</span>
              <button type="button" onClick={() => setLanguage('ar')} style={{ background: 'none', border: 'none', color: language === 'ar' ? 'var(--color-primary)' : 'var(--color-text-secondary)', fontWeight: language === 'ar' ? 600 : 400, cursor: 'pointer', padding: 0, fontFamily: 'system-ui' }}>العربية</button>
            </div>
          </div>

          <form onSubmit={isForgotPassword ? handleForgotPassword : handleLogin}>
            {error && <div style={{ padding: '12px', backgroundColor: '#fef2f2', color: '#b91c1c', borderRadius: '6px', marginBottom: '20px', fontSize: '14px', border: '1px solid #fecaca' }}>{error}</div>}
            {success && <div style={{ padding: '12px', backgroundColor: '#f0fdf4', color: '#15803d', borderRadius: '6px', marginBottom: '20px', fontSize: '14px', border: '1px solid #bbf7d0' }}>{success}</div>}
            
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--color-text-secondary)', marginBottom: '8px' }}>{t('login.email')}</label>
              <div style={{ position: 'relative' }}>
                <div style={{ position: 'absolute', top: '50%', transform: 'translateY(-50%)', left: isRtl ? 'auto' : '14px', right: isRtl ? '14px' : 'auto', color: 'var(--color-text-muted)' }}>
                  <Mail size={18} />
                </div>
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder={t('login.email')} required
                  style={{
                    width: '100%', padding: '12px', paddingLeft: isRtl ? '12px' : '40px', paddingRight: isRtl ? '40px' : '12px',
                    borderRadius: '6px', border: '1px solid var(--color-border)', outline: 'none', fontSize: '14px', boxSizing: 'border-box',
                    transition: 'border-color 0.2s'
                  }} 
                  onFocus={(e) => e.target.style.borderColor = 'var(--color-primary)'}
                  onBlur={(e) => e.target.style.borderColor = 'var(--color-border)'}
                />
              </div>
            </div>

            {!isForgotPassword && (
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--color-text-secondary)', marginBottom: '8px' }}>{t('login.password')}</label>
                <div style={{ position: 'relative' }}>
                  <div style={{ position: 'absolute', top: '50%', transform: 'translateY(-50%)', left: isRtl ? 'auto' : '14px', right: isRtl ? '14px' : 'auto', color: 'var(--color-text-muted)' }}>
                    <Lock size={18} />
                  </div>
                  <input type={showPassword ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} placeholder={t('login.password')} required
                    style={{
                      width: '100%', padding: '12px', paddingLeft: isRtl ? '40px' : '40px', paddingRight: isRtl ? '40px' : '40px',
                      borderRadius: '6px', border: '1px solid var(--color-border)', outline: 'none', fontSize: '14px', boxSizing: 'border-box',
                      transition: 'border-color 0.2s'
                    }}
                    onFocus={(e) => e.target.style.borderColor = 'var(--color-primary)'}
                    onBlur={(e) => e.target.style.borderColor = 'var(--color-border)'}
                  />
                  <button type="button" onClick={() => setShowPassword(!showPassword)}
                    style={{
                      position: 'absolute', top: '50%', transform: 'translateY(-50%)', right: isRtl ? 'auto' : '14px', left: isRtl ? '14px' : 'auto',
                      background: 'none', border: 'none', color: 'var(--color-text-muted)', cursor: 'pointer', padding: 0, display: 'flex'
                    }}
                    title={showPassword ? t('login.hidePassword') : t('login.showPassword')}
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>
            )}

            {!isForgotPassword && (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: 'var(--color-text-secondary)', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    style={{ width: '16px', height: '16px', accentColor: 'var(--color-primary)', cursor: 'pointer' }}
                  />
                  {t('login.rememberMe')}
                </label>
                <button
                  type="button"
                  onClick={() => { setIsForgotPassword(true); setError(null); setSuccess(null); }}
                  style={{ background: 'none', border: 'none', color: 'var(--color-primary)', fontSize: '13px', fontWeight: 600, cursor: 'pointer', padding: 0 }}
                >
                  {t('login.forgotPassword')}
                </button>
              </div>
            )}

            <button type="submit" disabled={loading || (success !== null && success.includes('Redirecting'))}
              style={{
                width: '100%', backgroundColor: 'var(--color-primary)', color: 'white', border: 'none', padding: '12px', borderRadius: '6px',
                fontSize: '15px', fontWeight: 600, cursor: (loading || success !== null) ? 'not-allowed' : 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px',
                opacity: (loading || success !== null) ? 0.7 : 1, transition: 'background-color 0.2s'
              }}
            >
              {!isForgotPassword && <LogIn size={18} />}
              {isForgotPassword 
                ? (loading ? t('forgotPassword.sending') : t('forgotPassword.sendLink'))
                : (loading ? t('login.signingIn') : t('login.signIn'))
              }
            </button>

            {isForgotPassword && (
              <div style={{ textAlign: 'center', marginTop: '16px' }}>
                <button
                  type="button"
                  onClick={() => { setIsForgotPassword(false); setError(null); setSuccess(null); }}
                  style={{ background: 'none', border: 'none', color: 'var(--color-text-secondary)', cursor: 'pointer', fontSize: '13px', fontWeight: 500 }}
                >
                  {t('forgotPassword.backToLogin')}
                </button>
              </div>
            )}
          </form>
        </div>
      </div>
    </div>
  );
};

export default Login;
