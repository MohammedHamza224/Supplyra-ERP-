import React, { useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useTranslation } from '../../contexts/LanguageContext';
import { X } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

interface UserFormProps {
  user: any | null;
  roles: { id: string; name: string }[];
  onClose: () => void;
  onSuccess: () => void;
}

const UserForm: React.FC<UserFormProps> = ({ user, roles, onClose, onSuccess }) => {
  const { t, language } = useTranslation();
  const { session } = useAuth();
  const isRtl = language === 'ar';

  const [formData, setFormData] = useState({
    email: user?.email || '',
    firstName: user?.first_name || '',
    lastName: user?.last_name || '',
    roleId: user?.role_id || '',
    active: user ? user.active : true,
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (user) {
        // Update existing user securely via Edge Function
        const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/update-user`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session?.access_token}`
          },
          body: JSON.stringify({
            userId: user.id,
            email: formData.email,
            firstName: formData.firstName,
            lastName: formData.lastName,
            roleId: formData.roleId || null,
            active: formData.active,
          })
        });

        const result = await response.json();
        
        if (!response.ok) {
          throw new Error(result.error || 'Failed to update user');
        }
      } else {
        // Create new user via Edge Function securely
        const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-user`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session?.access_token}`
          },
          body: JSON.stringify({
            email: formData.email,
            firstName: formData.firstName,
            lastName: formData.lastName,
            roleId: formData.roleId || null,
            active: formData.active,
          })
        });

        const result = await response.json();
        
        if (!response.ok) {
          throw new Error(result.error || 'Failed to create user');
        }
      }

      onSuccess();
    } catch (err: any) {
      console.error(err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1000,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      direction: isRtl ? 'rtl' : 'ltr'
    }}>
      <div style={{ backgroundColor: 'var(--color-surface)', borderRadius: '12px', width: '100%', maxWidth: '500px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}>
        
        <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--color-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ margin: 0, fontSize: '18px', color: 'var(--color-text-primary)' }}>
            {user ? (isRtl ? 'تعديل المستخدم' : 'Edit User') : (isRtl ? 'إنشاء مستخدم جديد' : 'Create New User')}
          </h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-secondary)' }}>
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ padding: '24px' }}>
          {error && <div style={{ backgroundColor: 'rgba(239, 68, 68, 0.15)', color: 'var(--color-danger)', padding: '12px', borderRadius: '6px', marginBottom: '16px', fontSize: '14px' }}>{error}</div>}
          
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: 500, color: 'var(--color-text-secondary)' }}>
              {isRtl ? 'البريد الإلكتروني' : 'Email Address'}
            </label>
            <input 
              type="email" required
              value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})}
              style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid var(--color-border)', boxSizing: 'border-box' }}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 160px), 1fr))', gap: '14px', marginBottom: '16px' }}>
            <div style={{ flex: 1 }}>
              <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: 500, color: 'var(--color-text-secondary)' }}>
                {isRtl ? 'الاسم الأول' : 'First Name'}
              </label>
              <input 
                type="text" required
                value={formData.firstName} onChange={e => setFormData({...formData, firstName: e.target.value})}
                style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid var(--color-border)', boxSizing: 'border-box' }}
              />
            </div>
            <div style={{ flex: 1 }}>
              <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: 500, color: 'var(--color-text-secondary)' }}>
                {isRtl ? 'اسم العائلة' : 'Last Name'}
              </label>
              <input 
                type="text" required
                value={formData.lastName} onChange={e => setFormData({...formData, lastName: e.target.value})}
                style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid var(--color-border)', boxSizing: 'border-box' }}
              />
            </div>
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: 500, color: 'var(--color-text-secondary)' }}>
              {isRtl ? 'الدور (الصلاحيات)' : 'Role'}
            </label>
            <select 
              value={formData.roleId} onChange={e => setFormData({...formData, roleId: e.target.value})}
              style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid var(--color-border)', boxSizing: 'border-box' }}
            >
              <option value="">{isRtl ? 'اختر دوراً' : 'Select a role'}</option>
              {roles.map(r => (
                <option key={r.id} value={r.id}>{r.name}</option>
              ))}
            </select>
          </div>

          <div style={{ marginBottom: '24px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '14px', fontWeight: 500, color: 'var(--color-text-secondary)' }}>
              <input 
                type="checkbox"
                checked={formData.active}
                onChange={e => setFormData({...formData, active: e.target.checked})}
                style={{ width: '16px', height: '16px', cursor: 'pointer' }}
              />
              {isRtl ? 'نشط' : 'Active'}
            </label>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
            <button type="button" onClick={onClose} style={{ padding: '10px 16px', backgroundColor: 'transparent', border: '1px solid var(--color-border)', borderRadius: '6px', cursor: 'pointer', fontWeight: 500 }}>
              {t('common.cancel')}
            </button>
            <button type="submit" disabled={loading} style={{ padding: '10px 16px', backgroundColor: 'var(--color-primary)', color: 'white', border: 'none', borderRadius: '6px', cursor: loading ? 'not-allowed' : 'pointer', fontWeight: 600 }}>
              {loading ? (isRtl ? 'جاري الحفظ...' : 'Saving...') : (isRtl ? 'حفظ المستخدم' : 'Save User')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default UserForm;
