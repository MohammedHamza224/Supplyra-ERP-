import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useTranslation } from '../../contexts/LanguageContext';
import { Search, Plus, Edit2, ShieldAlert, CheckCircle, XCircle, Users } from 'lucide-react';
import UserForm from './UserForm';
import { useAuth } from '../../contexts/AuthContext';
import { useDebounce } from '../../hooks/useDebounce';

interface UserData {
  id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  role_id: string | null;
  active: boolean;
  created_at: string;
}

interface Role {
  id: string;
  name: string;
}

const DEMO_ACCOUNTS = [
  {
    roleName: 'Cashier',
    email: 'cashier@supplyra.com',
    first_name: 'سارة',
    last_name: 'الشمري',
  },
  {
    roleName: 'Sales',
    email: 'sales@supplyra.com',
    first_name: 'أحمد',
    last_name: 'المنصور',
  },
  {
    roleName: 'Warehouse',
    email: 'warehouse@supplyra.com',
    first_name: 'فهد',
    last_name: 'الغامدي',
  },
  {
    roleName: 'Purchasing',
    email: 'purchasing@supplyra.com',
    first_name: 'عبدالله',
    last_name: 'الشهري',
  },
];

const UsersList = () => {
  const { t, language } = useTranslation();
  const { hasPermission } = useAuth();
  const isRtl = language === 'ar';
  
  const [users, setUsers] = useState<UserData[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 300);
  const [roleFilter, setRoleFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserData | null>(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      // 1. Fetch roles first to ensure we can map demo accounts
      const { data: rolesData, error: rolesError } = await supabase.from('roles').select('id, name');
      const loadedRoles = rolesData || [];
      setRoles(loadedRoles);

      // 2. Fetch users with email using secure RPC or fallback to profiles
      let fetchedUsers: UserData[] = [];
      try {
        const { data: usersData, error: usersError } = await supabase.rpc('get_users_with_email');
        if (!usersError && usersData) {
          fetchedUsers = usersData;
        } else {
          throw usersError || new Error('RPC returned empty');
        }
      } catch (rpcErr) {
        console.warn('RPC get_users_with_email failed, attempting profiles fallback:', rpcErr);
        const { data: profData } = await supabase.from('profiles').select('*');
        if (profData) {
          fetchedUsers = profData.map((p: any) => ({
            id: p.id,
            email: p.email || (p.first_name ? `${p.first_name.toLowerCase()}@supplyra.com` : 'user@supplyra.com'),
            first_name: p.first_name,
            last_name: p.last_name,
            role_id: p.role_id,
            active: p.active ?? true,
            created_at: p.created_at || new Date().toISOString()
          }));
        }
      }

      // 3. Complement with standard demo users for any role not yet present
      const existingEmails = new Set(fetchedUsers.map(u => (u.email || '').toLowerCase()));
      const combinedUsers: UserData[] = [...fetchedUsers];

      DEMO_ACCOUNTS.forEach((demo) => {
        if (!existingEmails.has(demo.email.toLowerCase())) {
          const matchedRole = loadedRoles.find(r => 
            r.name.toLowerCase() === demo.roleName.toLowerCase() ||
            r.name.toLowerCase().includes(demo.roleName.toLowerCase())
          );

          combinedUsers.push({
            id: `demo-${demo.roleName.toLowerCase()}`,
            email: demo.email,
            first_name: demo.first_name,
            last_name: demo.last_name,
            role_id: matchedRole ? matchedRole.id : `role-${demo.roleName.toLowerCase()}`,
            active: true,
            created_at: new Date().toISOString()
          });
        }
      });

      setUsers(combinedUsers);
    } catch (error) {
      console.error('Error fetching users:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleEdit = (user: UserData) => {
    setEditingUser(user);
    setIsFormOpen(true);
  };

  const handleCreate = () => {
    setEditingUser(null);
    setIsFormOpen(true);
  };

  const handleCloseForm = (refresh?: boolean) => {
    setIsFormOpen(false);
    setEditingUser(null);
    if (refresh) fetchData();
  };

  const handleToggleStatus = async (user: UserData) => {
    if (!hasPermission('users.activate')) return;
    if (user.id && user.id.startsWith('demo-')) {
      setUsers(prev => prev.map(u => u.id === user.id ? { ...u, active: !u.active } : u));
      return;
    }
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ active: !user.active })
        .eq('id', user.id);
      
      if (error) throw error;
      fetchData();
    } catch (error) {
      console.error('Error toggling status:', error);
    }
  };

  const getRoleName = (roleId: string | null) => {
    if (!roleId) return isRtl ? 'بدون دور' : 'No Role';
    const found = roles.find(r => r.id === roleId);
    if (found) return found.name;
    if (roleId.startsWith('role-')) {
      const rName = roleId.replace('role-', '');
      return rName.charAt(0).toUpperCase() + rName.slice(1);
    }
    return 'Manager';
  };

  const getRoleBadgeStyle = (roleName: string) => {
    const lower = roleName.toLowerCase();
    if (lower.includes('manager') || lower.includes('مدير')) {
      return { backgroundColor: 'rgba(99, 102, 241, 0.12)', color: 'rgb(79, 70, 229)', border: '1px solid rgba(99, 102, 241, 0.25)' };
    }
    if (lower.includes('cashier') || lower.includes('كاشير')) {
      return { backgroundColor: 'rgba(245, 158, 11, 0.12)', color: 'rgb(217, 119, 6)', border: '1px solid rgba(245, 158, 11, 0.25)' };
    }
    if (lower.includes('sales') || lower.includes('مبيعات')) {
      return { backgroundColor: 'rgba(16, 185, 129, 0.12)', color: 'rgb(5, 150, 105)', border: '1px solid rgba(16, 185, 129, 0.25)' };
    }
    if (lower.includes('warehouse') || lower.includes('مستودع')) {
      return { backgroundColor: 'rgba(14, 165, 233, 0.12)', color: 'rgb(2, 132, 199)', border: '1px solid rgba(14, 165, 233, 0.25)' };
    }
    if (lower.includes('purchas') || lower.includes('مشتريات')) {
      return { backgroundColor: 'rgba(168, 85, 247, 0.12)', color: 'rgb(147, 51, 234)', border: '1px solid rgba(168, 85, 247, 0.25)' };
    }
    return { backgroundColor: 'var(--color-background)', color: 'var(--color-text-secondary)', border: '1px solid var(--color-border)' };
  };

  const filteredUsers = users.filter(user => {
    const q = debouncedSearch.toLowerCase();
    const fullName = `${user.first_name || ''} ${user.last_name || ''}`.toLowerCase();
    const matchesSearch = 
      !q ||
      fullName.includes(q) ||
      (user.email && user.email.toLowerCase().includes(q));
    
    let matchesRole = true;
    if (roleFilter) {
      if (user.role_id === roleFilter) {
        matchesRole = true;
      } else {
        const selRole = roles.find(r => r.id === roleFilter);
        if (selRole) {
          const userRoleName = getRoleName(user.role_id).toLowerCase();
          const targetName = selRole.name.toLowerCase();
          matchesRole = userRoleName === targetName ||
                        userRoleName.includes(targetName) ||
                        user.role_id === `role-${targetName}`;
        } else {
          matchesRole = false;
        }
      }
    }

    const matchesStatus = statusFilter ? user.active.toString() === statusFilter : true;

    return matchesSearch && matchesRole && matchesStatus;
  });

  return (
    <div style={{ padding: '24px', direction: isRtl ? 'rtl' : 'ltr' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <Users size={28} color="var(--color-primary)" />
          <div>
            <h1 style={{ fontSize: '1.35rem', fontWeight: 700, color: 'var(--color-text-primary)', margin: '0 0 4px 0' }}>
              {t('users.title')}
            </h1>
            <p style={{ color: 'var(--color-text-secondary)', margin: 0, fontSize: '0.85rem' }}>
              {t('users.subtitle')}
            </p>
          </div>
        </div>
        
        {hasPermission('users.create') && (
          <button 
            type="button"
            onClick={handleCreate} 
            className="btn btn-primary"
            style={{
              padding: '8px 16px',
              display: 'flex', 
              alignItems: 'center', 
              gap: '8px', 
              fontSize: '0.875rem',
              minHeight: '38px'
            }}
          >
            <Plus size={16} />
            {t('users.newUser')}
          </button>
        )}
      </div>

      <div style={{ backgroundColor: 'var(--color-surface)', borderRadius: '8px', padding: '16px', boxShadow: '0 1px 3px rgba(0,0,0,0.06)', border: '1px solid var(--color-border)', marginBottom: '20px' }}>
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ flex: '1 1 240px', position: 'relative' }}>
            <Search 
              size={16} 
              style={{ 
                position: 'absolute', 
                top: '50%', 
                transform: 'translateY(-50%)', 
                left: isRtl ? 'auto' : '12px', 
                right: isRtl ? '12px' : 'auto', 
                color: 'var(--color-text-muted)',
                pointerEvents: 'none'
              }} 
            />
            <input 
              type="text" 
              placeholder={t('users.search') || (isRtl ? 'بحث بالاسم أو البريد الإلكتروني...' : 'Search users...')}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{
                width: '100%', 
                padding: '8px 12px', 
                paddingLeft: isRtl ? '12px' : '36px', 
                paddingRight: isRtl ? '36px' : '12px',
                border: '1px solid var(--color-border)', 
                borderRadius: '6px', 
                fontSize: '0.85rem', 
                boxSizing: 'border-box',
                backgroundColor: 'var(--color-background)',
                color: 'var(--color-text-primary)',
                outline: 'none',
                minHeight: '38px'
              }}
            />
          </div>
          
          <select 
            value={roleFilter} 
            onChange={(e) => setRoleFilter(e.target.value)} 
            style={{ 
              padding: '8px 12px', 
              border: '1px solid var(--color-border)', 
              borderRadius: '6px', 
              minWidth: '160px',
              fontSize: '0.85rem',
              backgroundColor: 'var(--color-background)',
              color: 'var(--color-text-primary)',
              outline: 'none',
              minHeight: '38px'
            }}
          >
            <option value="">{t('users.allRoles') || (isRtl ? 'جميع الأدوار' : 'All Roles')}</option>
            {roles.map(role => (
              <option key={role.id} value={role.id}>{role.name}</option>
            ))}
          </select>

          <select 
            value={statusFilter} 
            onChange={(e) => setStatusFilter(e.target.value)} 
            style={{ 
              padding: '8px 12px', 
              border: '1px solid var(--color-border)', 
              borderRadius: '6px', 
              minWidth: '140px',
              fontSize: '0.85rem',
              backgroundColor: 'var(--color-background)',
              color: 'var(--color-text-primary)',
              outline: 'none',
              minHeight: '38px'
            }}
          >
            <option value="">{t('users.allStatuses') || (isRtl ? 'جميع الحالات' : 'All Statuses')}</option>
            <option value="true">{t('common.active') || (isRtl ? 'نشط' : 'Active')}</option>
            <option value="false">{t('common.inactive') || (isRtl ? 'غير نشط' : 'Inactive')}</option>
          </select>
        </div>
      </div>

      <div style={{ backgroundColor: 'var(--color-surface)', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.06)', border: '1px solid var(--color-border)', overflow: 'hidden' }}>
        {/* Desktop Table View */}
        <div className="desktop-table-view table-responsive">
          <table style={{ width: '100%', minWidth: '700px', borderCollapse: 'collapse', textAlign: isRtl ? 'right' : 'left' }}>
            <thead style={{ backgroundColor: 'var(--color-background)', borderBottom: '2px solid var(--color-border)' }}>
              <tr>
                <th style={{ padding: '10px 14px', color: 'var(--color-text-secondary)', fontWeight: 600, fontSize: '0.8125rem', whiteSpace: 'nowrap' }}>{isRtl ? 'الاسم' : 'Name'}</th>
                <th style={{ padding: '10px 14px', color: 'var(--color-text-secondary)', fontWeight: 600, fontSize: '0.8125rem', whiteSpace: 'nowrap' }}>{t('users.email')}</th>
                <th style={{ padding: '10px 14px', color: 'var(--color-text-secondary)', fontWeight: 600, fontSize: '0.8125rem', whiteSpace: 'nowrap' }}>{t('users.role')}</th>
                <th style={{ padding: '10px 14px', color: 'var(--color-text-secondary)', fontWeight: 600, fontSize: '0.8125rem', whiteSpace: 'nowrap' }}>{t('common.status')}</th>
                <th style={{ padding: '10px 14px', color: 'var(--color-text-secondary)', fontWeight: 600, fontSize: '0.8125rem', whiteSpace: 'nowrap', textAlign: isRtl ? 'left' : 'right' }}>{t('common.actions')}</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={5} style={{ padding: '32px 16px', textAlign: 'center', color: 'var(--color-text-secondary)' }}>
                    {isRtl ? 'جاري تحميل المستخدمين...' : 'Loading users...'}
                  </td>
                </tr>
              ) : filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ padding: '40px 16px', textAlign: 'center', color: 'var(--color-text-secondary)' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                      <Users size={32} style={{ opacity: 0.3 }} />
                      <span style={{ fontSize: '0.9rem', fontWeight: 500 }}>
                        {isRtl ? 'لم يتم العثور على مستخدمين يطابقون خيارات البحث أو التصفية' : 'No users found matching current filters'}
                      </span>
                      {(roleFilter || statusFilter || search) && (
                        <button 
                          type="button"
                          onClick={() => { setRoleFilter(''); setStatusFilter(''); setSearch(''); }}
                          style={{ 
                            marginTop: '6px', 
                            padding: '6px 14px', 
                            borderRadius: '6px', 
                            border: '1px solid var(--color-border)', 
                            backgroundColor: 'var(--color-background)', 
                            color: 'var(--color-primary)', 
                            fontSize: '0.8125rem', 
                            fontWeight: 600, 
                            cursor: 'pointer' 
                          }}
                        >
                          {isRtl ? 'إعادة ضبط الفلاتر' : 'Reset Filters'}
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                filteredUsers.map(user => {
                  const roleName = getRoleName(user.role_id);
                  const badgeStyle = getRoleBadgeStyle(roleName);
                  return (
                    <tr key={user.id} style={{ borderBottom: '1px solid var(--color-border)', transition: 'background-color 0.15s ease' }}>
                      <td style={{ padding: '10px 14px', fontSize: '0.85rem', color: 'var(--color-text-primary)', fontWeight: 600 }}>
                        {user.first_name} {user.last_name}
                      </td>
                      <td style={{ padding: '10px 14px', fontSize: '0.85rem', color: 'var(--color-text-secondary)' }}>
                        <span style={{ fontFamily: 'monospace', fontSize: '0.8125rem' }}>{user.email}</span>
                      </td>
                      <td style={{ padding: '10px 14px', fontSize: '0.85rem' }}>
                        <span 
                          style={{ 
                            ...badgeStyle,
                            padding: '3px 9px', 
                            borderRadius: '6px', 
                            fontSize: '0.75rem', 
                            fontWeight: 600,
                            display: 'inline-block'
                          }}
                        >
                          {roleName}
                        </span>
                      </td>
                      <td style={{ padding: '10px 14px' }}>
                        {user.active ? (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', color: 'rgb(16, 185, 129)', backgroundColor: 'rgba(16, 185, 129, 0.1)', padding: '3px 9px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 600 }}>
                            <CheckCircle size={13} /> {t('common.active') || (isRtl ? 'نشط' : 'Active')}
                          </span>
                        ) : (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', color: 'rgb(239, 68, 68)', backgroundColor: 'rgba(239, 68, 68, 0.1)', padding: '3px 9px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 600 }}>
                            <XCircle size={13} /> {t('common.inactive') || (isRtl ? 'غير نشط' : 'Inactive')}
                          </span>
                        )}
                      </td>
                      <td style={{ padding: '8px 14px', textAlign: isRtl ? 'left' : 'right' }}>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', verticalAlign: 'middle' }}>
                          {hasPermission('users.update') && (
                            <button 
                              type="button"
                              onClick={() => handleEdit(user)} 
                              title={isRtl ? 'تعديل' : 'Edit'}
                              style={{ 
                                display: 'inline-flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                width: '32px',
                                height: '32px',
                                borderRadius: '6px',
                                border: '1px solid var(--color-border)',
                                backgroundColor: 'var(--color-surface)',
                                color: 'var(--color-primary)',
                                cursor: 'pointer',
                                transition: 'all 0.15s ease'
                              }}
                            >
                              <Edit2 size={15} />
                            </button>
                          )}
                          {hasPermission('users.activate') && (
                            <button 
                              type="button"
                              onClick={() => handleToggleStatus(user)} 
                              title={user.active ? (isRtl ? 'تعطيل الحساب' : 'Deactivate') : (isRtl ? 'تفعيل الحساب' : 'Activate')}
                              style={{ 
                                display: 'inline-flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                width: '32px',
                                height: '32px',
                                borderRadius: '6px',
                                border: user.active ? '1px solid rgba(239, 68, 68, 0.25)' : '1px solid rgba(16, 185, 129, 0.25)',
                                backgroundColor: user.active ? 'rgba(239, 68, 68, 0.08)' : 'rgba(16, 185, 129, 0.08)',
                                color: user.active ? 'rgb(239, 68, 68)' : 'rgb(16, 185, 129)',
                                cursor: 'pointer',
                                transition: 'all 0.15s ease'
                              }}
                            >
                              <ShieldAlert size={15} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile Cards View (< 768px) */}
        <div className="mobile-cards-view" style={{ flexDirection: 'column', gap: '10px', padding: '12px' }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '24px', color: 'var(--color-text-secondary)' }}>
              {isRtl ? 'جاري تحميل المستخدمين...' : 'Loading users...'}
            </div>
          ) : filteredUsers.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '24px 16px', color: 'var(--color-text-muted)' }}>
              <p style={{ fontWeight: 600, margin: 0 }}>
                {isRtl ? 'لم يتم العثور على مستخدمين يطابقون خيارات البحث أو التصفية' : 'No users found matching current filters'}
              </p>
            </div>
          ) : (
            filteredUsers.map(user => {
              const roleName = getRoleName(user.role_id);
              const badgeStyle = getRoleBadgeStyle(roleName);
              return (
                <div 
                  key={`user-card-${user.id}`}
                  style={{
                    backgroundColor: 'var(--color-surface)',
                    border: '1px solid var(--color-border)',
                    borderRadius: '10px',
                    padding: '12px 14px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '8px',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--color-text-primary)' }}>
                      {user.first_name} {user.last_name}
                    </div>
                    <span 
                      style={{ 
                        ...badgeStyle,
                        padding: '2px 8px', 
                        borderRadius: '6px', 
                        fontSize: '0.72rem', 
                        fontWeight: 600 
                      }}
                    >
                      {roleName}
                    </span>
                  </div>

                  <div style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)', fontFamily: 'monospace' }}>
                    {user.email}
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px dashed var(--color-border)', paddingTop: '8px', marginTop: '2px' }}>
                    <div>
                      {user.active ? (
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: 'rgb(16, 185, 129)', backgroundColor: 'rgba(16, 185, 129, 0.1)', padding: '2px 8px', borderRadius: '12px', fontSize: '0.72rem', fontWeight: 600 }}>
                          <CheckCircle size={12} /> {t('common.active') || (isRtl ? 'نشط' : 'Active')}
                        </span>
                      ) : (
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: 'rgb(239, 68, 68)', backgroundColor: 'rgba(239, 68, 68, 0.1)', padding: '2px 8px', borderRadius: '12px', fontSize: '0.72rem', fontWeight: 600 }}>
                          <XCircle size={12} /> {t('common.inactive') || (isRtl ? 'غير نشط' : 'Inactive')}
                        </span>
                      )}
                    </div>

                    <div style={{ display: 'flex', gap: '6px' }}>
                      {hasPermission('users.update') && (
                        <button 
                          type="button"
                          onClick={() => handleEdit(user)}
                          style={{
                            padding: '4px 10px',
                            borderRadius: '6px',
                            border: '1px solid var(--color-border)',
                            backgroundColor: 'var(--color-background)',
                            color: 'var(--color-primary)',
                            fontSize: '0.75rem',
                            fontWeight: 600,
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px'
                          }}
                        >
                          <Edit2 size={13} /> {isRtl ? 'تعديل' : 'Edit'}
                        </button>
                      )}
                      {hasPermission('users.activate') && (
                        <button 
                          type="button"
                          onClick={() => handleToggleStatus(user)}
                          style={{
                            padding: '4px 10px',
                            borderRadius: '6px',
                            border: user.active ? '1px solid rgba(239, 68, 68, 0.25)' : '1px solid rgba(16, 185, 129, 0.25)',
                            backgroundColor: user.active ? 'rgba(239, 68, 68, 0.08)' : 'rgba(16, 185, 129, 0.08)',
                            color: user.active ? 'rgb(239, 68, 68)' : 'rgb(16, 185, 129)',
                            fontSize: '0.75rem',
                            fontWeight: 600,
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px'
                          }}
                        >
                          <ShieldAlert size={13} /> {user.active ? (isRtl ? 'تعطيل' : 'Deactivate') : (isRtl ? 'تفعيل' : 'Activate')}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {isFormOpen && (
        <UserForm 
          user={editingUser} 
          roles={roles} 
          onClose={() => handleCloseForm(false)} 
          onSuccess={() => handleCloseForm(true)} 
        />
      )}
    </div>
  );
};

export default UsersList;
