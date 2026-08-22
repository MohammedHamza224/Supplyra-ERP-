const fs = require('fs');

let content = fs.readFileSync('src/pages/settings/Settings.tsx', 'utf8');

// Add state for password change
const stateToAdd = `
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState('');
  const [passwordLoading, setPasswordLoading] = useState(false);

  const handlePasswordChange = async () => {
    setPasswordError('');
    setPasswordSuccess('');
    
    if (!currentPassword || !newPassword || !confirmPassword) {
      setPasswordError(isRtl ? 'يرجى تعبئة جميع الحقول' : 'Please fill all fields');
      return;
    }
    
    if (newPassword !== confirmPassword) {
      setPasswordError(isRtl ? 'كلمة المرور الجديدة غير متطابقة' : 'New passwords do not match');
      return;
    }
    
    if (newPassword.length < 6) {
      setPasswordError(isRtl ? 'كلمة المرور يجب أن تكون 6 أحرف على الأقل' : 'Password must be at least 6 characters');
      return;
    }

    setPasswordLoading(true);
    try {
      if (!user?.email) throw new Error('User email not found');
      
      // Verify current password first
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: currentPassword
      });
      
      if (signInError) {
        throw new Error(isRtl ? 'كلمة المرور الحالية غير صحيحة' : 'Current password is incorrect');
      }
      
      // Update to new password
      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword
      });
      
      if (updateError) throw updateError;
      
      setPasswordSuccess(isRtl ? 'تم تغيير كلمة المرور بنجاح!' : 'Password changed successfully!');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      
    } catch (err: any) {
      setPasswordError(err.message || 'Error changing password');
    } finally {
      setPasswordLoading(false);
    }
  };
`;

content = content.replace(
  "const [loading, setLoading] = useState(false);",
  "const [loading, setLoading] = useState(false);\n" + stateToAdd
);

const oldSecuritySection = `          {/* SECURITY SETTINGS */}
          {activeTab === 'security' && (
            <div style={{ maxWidth: '600px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
              <div style={{ padding: '24px', border: '1px solid var(--color-border)', borderRadius: '12px' }}>
                <h4 style={{ margin: '0 0 16px 0', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '1.1rem' }}>
                  <Shield size={20} />
                  {isRtl ? 'تغيير كلمة المرور' : 'Change Password'}
                </h4>
                <p style={{ color: 'var(--color-text-secondary)', marginBottom: '24px' }}>
                  {isRtl 
                    ? 'يمكنك تغيير كلمة المرور الخاصة بك هنا. (واجهة مبدئية، سيتم تفعيلها لاحقاً)' 
                    : 'You can change your password here. (UI Placeholder, to be implemented)'}
                </p>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div>
                    <input 
                      type="password" 
                      placeholder={isRtl ? 'كلمة المرور الحالية' : 'Current Password'}
                      className="form-input" 
                      style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--color-border)' }} 
                      disabled
                    />
                  </div>
                  <div>
                    <input 
                      type="password" 
                      placeholder={isRtl ? 'كلمة المرور الجديدة' : 'New Password'}
                      className="form-input" 
                      style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--color-border)' }} 
                      disabled
                    />
                  </div>
                  <div>
                    <input 
                      type="password" 
                      placeholder={isRtl ? 'تأكيد كلمة المرور' : 'Confirm New Password'}
                      className="form-input" 
                      style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--color-border)' }} 
                      disabled
                    />
                  </div>
                  <button className="btn btn-primary" disabled style={{ width: 'fit-content' }}>
                    {isRtl ? 'تحديث كلمة المرور' : 'Update Password'}
                  </button>
                </div>
              </div>
            </div>
          )}`;

const newSecuritySection = `          {/* SECURITY SETTINGS */}
          {activeTab === 'security' && (
            <div style={{ maxWidth: '600px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
              <div style={{ padding: '24px', border: '1px solid var(--color-border)', borderRadius: '12px' }}>
                <h4 style={{ margin: '0 0 16px 0', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '1.1rem' }}>
                  <Shield size={20} />
                  {isRtl ? 'تغيير كلمة المرور' : 'Change Password'}
                </h4>
                <p style={{ color: 'var(--color-text-secondary)', marginBottom: '24px' }}>
                  {isRtl 
                    ? 'يمكنك تغيير كلمة المرور الخاصة بك هنا لتأمين حسابك بشكل أفضل.' 
                    : 'You can change your password here to better secure your account.'}
                </p>
                
                {passwordError && (
                  <div style={{ padding: '12px', backgroundColor: '#fef2f2', color: '#ef4444', borderRadius: '8px', marginBottom: '16px', border: '1px solid #fca5a5' }}>
                    {passwordError}
                  </div>
                )}
                
                {passwordSuccess && (
                  <div style={{ padding: '12px', backgroundColor: '#ecfdf5', color: '#10b981', borderRadius: '8px', marginBottom: '16px', border: '1px solid #6ee7b7' }}>
                    {passwordSuccess}
                  </div>
                )}

                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div>
                    <input 
                      type="password" 
                      placeholder={isRtl ? 'كلمة المرور الحالية' : 'Current Password'}
                      className="form-input" 
                      style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--color-border)' }} 
                      value={currentPassword}
                      onChange={e => setCurrentPassword(e.target.value)}
                    />
                  </div>
                  <div>
                    <input 
                      type="password" 
                      placeholder={isRtl ? 'كلمة المرور الجديدة' : 'New Password'}
                      className="form-input" 
                      style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--color-border)' }} 
                      value={newPassword}
                      onChange={e => setNewPassword(e.target.value)}
                    />
                  </div>
                  <div>
                    <input 
                      type="password" 
                      placeholder={isRtl ? 'تأكيد كلمة المرور' : 'Confirm New Password'}
                      className="form-input" 
                      style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--color-border)' }} 
                      value={confirmPassword}
                      onChange={e => setConfirmPassword(e.target.value)}
                    />
                  </div>
                  <button 
                    className="btn btn-primary" 
                    onClick={handlePasswordChange}
                    disabled={passwordLoading} 
                    style={{ width: 'fit-content', opacity: passwordLoading ? 0.7 : 1 }}
                  >
                    {passwordLoading ? (isRtl ? 'جاري التحديث...' : 'Updating...') : (isRtl ? 'تغيير كلمة المرور' : 'Change Password')}
                  </button>
                </div>
              </div>
            </div>
          )}`;

content = content.replace(oldSecuritySection, newSecuritySection);

fs.writeFileSync('src/pages/settings/Settings.tsx', content);
