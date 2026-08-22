import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useTranslation } from '../contexts/LanguageContext';

const ResetPassword = () => {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const { t, language } = useTranslation();
  const navigate = useNavigate();

  useEffect(() => {
    // Check if we actually have a recovery session
    supabase.auth.getSession().then(({ data: { session } }: any) => {
      if (!session) {
        // If not authenticated, we shouldn't be here (recovery links log you in temporarily)
        navigate('/');
      }
    });
  }, [navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError(t('resetPassword.errorMismatch'));
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase.auth.updateUser({
        password: password
      });

      if (error) throw error;

      setSuccess(true);
      setTimeout(() => {
        navigate('/');
      }, 3000);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'An error occurred while updating the password');
    } finally {
      setLoading(false);
    }
  };

  const isRtl = language === 'ar';

  return (
    <div style={{
      display: 'flex',
      minHeight: '100vh',
      backgroundColor: 'var(--color-background)',
      fontFamily: 'system-ui, -apple-system, sans-serif'
    }}>
      <div style={{
        margin: 'auto',
        width: '100%',
        maxWidth: '400px',
        padding: '40px',
        backgroundColor: 'var(--color-surface)',
        borderRadius: '12px',
        boxShadow: '0 10px 25px rgba(0,0,0,0.05)',
        textAlign: isRtl ? 'right' : 'left'
      }}>
        <h2 style={{ color: 'var(--color-text-primary)', margin: '0 0 8px 0', fontSize: '24px' }}>{t('resetPassword.title')}</h2>
        <p style={{ color: 'var(--color-text-secondary)', margin: '0 0 24px 0', fontSize: '14px' }}>{t('resetPassword.subtitle')}</p>

        {error && (
          <div style={{
            padding: '12px',
            backgroundColor: '#fef2f2',
            color: '#b91c1c',
            borderRadius: '6px',
            marginBottom: '20px',
            fontSize: '14px',
            border: '1px solid #f87171'
          }}>
            {error}
          </div>
        )}

        {success ? (
          <div style={{
            padding: '16px',
            backgroundColor: '#f0fdf4',
            color: '#15803d',
            borderRadius: '6px',
            textAlign: 'center',
            fontSize: '15px',
            border: '1px solid #4ade80'
          }}>
            {t('resetPassword.success')}
          </div>
        ) : (
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '6px', color: 'var(--color-text-secondary)', fontSize: '14px', fontWeight: 500 }}>
                {t('resetPassword.newPassword')}
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                style={{
                  width: '100%',
                  padding: '12px',
                  borderRadius: '6px',
                  border: '1px solid var(--color-border)',
                  boxSizing: 'border-box',
                  fontSize: '15px'
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '6px', color: 'var(--color-text-secondary)', fontSize: '14px', fontWeight: 500 }}>
                {t('resetPassword.confirmPassword')}
              </label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                style={{
                  width: '100%',
                  padding: '12px',
                  borderRadius: '6px',
                  border: '1px solid var(--color-border)',
                  boxSizing: 'border-box',
                  fontSize: '15px'
                }}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              style={{
                backgroundColor: 'var(--color-success)', // Fresh green
                color: 'white',
                padding: '12px',
                borderRadius: '6px',
                border: 'none',
                cursor: loading ? 'not-allowed' : 'pointer',
                fontSize: '16px',
                fontWeight: 600,
                marginTop: '8px',
                opacity: loading ? 0.7 : 1,
                transition: 'background-color 0.2s'
              }}
            >
              {loading ? t('resetPassword.updating') : t('resetPassword.updatePassword')}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};

export default ResetPassword;
