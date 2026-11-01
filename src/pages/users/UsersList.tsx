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
      // Fetch users with email using our secure RPC
      const { data: usersData, error: usersError } = await supabase.rpc('get_users_with_email');
      if (usersError) throw usersError;
      
      const { data: rolesData, error: rolesError } = await supabase.from('roles').select('id, name');
      if (rolesError) throw rolesError;

      setUsers(usersData || []);
      setRoles(rolesData || []);
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
    if (!roleId) return 'No Role';
    return roles.find(r => r.id === roleId)?.name || 'Unknown';
  };

  const filteredUsers = users.filter(user => {
    const matchesSearch = 
      (user.first_name?.toLowerCase().includes(debouncedSearch.toLowerCase()) || false) ||
      (user.last_name?.toLowerCase().includes(debouncedSearch.toLowerCase()) || false) ||
      (user.email.toLowerCase().includes(debouncedSearch.toLowerCase()));
    
    const matchesRole = roleFilter ? user.role_id === roleFilter : true;
    const matchesStatus = statusFilter ? user.active.toString() === statusFilter : true;

    return matchesSearch && matchesRole && matchesStatus;
  });

  return (
    <div style={{ padding: '24px', direction: isRtl ? 'rtl' : 'ltr' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <Users size={28} color="var(--color-primary)" />
          <div>
            <h1 style={{ fontSize: '24px', fontWeight: 700, color: 'var(--color-text-primary)', margin: '0 0 8px 0' }}>
              {t('users.title')}
            </h1>
            <p style={{ color: 'var(--color-text-secondary)', margin: 0, fontSize: '14px' }}>
              {t('users.subtitle')}
            </p>
          </div>
        </div>
        
        {hasPermission('users.create') && (
          <button onClick={handleCreate} style={{
            backgroundColor: 'var(--color-primary)', color: 'white', border: 'none', padding: '10px 16px',
            borderRadius: '6px', display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer',
            fontWeight: 600, fontSize: '14px'
          }}>
            <Plus size={18} />
            {t('users.newUser')}
          </button>
        )}
      </div>

      <div style={{ backgroundColor: 'var(--color-surface)', borderRadius: '8px', padding: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', marginBottom: '24px' }}>
        <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
          <div style={{ flex: '1 1 300px', position: 'relative' }}>
            <Search size={18} style={{ position: 'absolute', top: '50%', transform: 'translateY(-50%)', left: isRtl ? 'auto' : '12px', right: isRtl ? '12px' : 'auto', color: 'var(--color-text-muted)' }} />
            <input 
              type="text" 
              placeholder={t('users.search')}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{
                width: '100%', padding: '10px 12px', paddingLeft: isRtl ? '12px' : '40px', paddingRight: isRtl ? '40px' : '12px',
                border: '1px solid var(--color-border)', borderRadius: '6px', fontSize: '14px', boxSizing: 'border-box'
              }}
            />
          </div>
          
          <select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)} style={{ padding: '10px 12px', border: '1px solid var(--color-border)', borderRadius: '6px', minWidth: '150px' }}>
            <option value="">{t('users.allRoles')}</option>
            {roles.map(role => (
              <option key={role.id} value={role.id}>{role.name}</option>
            ))}
          </select>

          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} style={{ padding: '10px 12px', border: '1px solid var(--color-border)', borderRadius: '6px', minWidth: '150px' }}>
            <option value="">{t('users.allStatuses')}</option>
            <option value="true">{t('common.active')}</option>
            <option value="false">{t('common.inactive')}</option>
          </select>
        </div>
      </div>

      <div style={{ backgroundColor: 'var(--color-surface)', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', overflow: 'hidden' }}>
        <div className="table-responsive">
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: isRtl ? 'right' : 'left' }}>
            <thead style={{ backgroundColor: 'var(--color-background)', borderBottom: '1px solid var(--color-border)' }}>
              <tr>
                <th style={{ padding: '12px 16px', color: 'var(--color-text-secondary)', fontWeight: 600, fontSize: '13px' }}>{isRtl ? 'الاسم' : 'Name'}</th>
                <th style={{ padding: '12px 16px', color: 'var(--color-text-secondary)', fontWeight: 600, fontSize: '13px' }}>{t('users.email')}</th>
                <th style={{ padding: '12px 16px', color: 'var(--color-text-secondary)', fontWeight: 600, fontSize: '13px' }}>{t('users.role')}</th>
                <th style={{ padding: '12px 16px', color: 'var(--color-text-secondary)', fontWeight: 600, fontSize: '13px' }}>{t('common.status')}</th>
                <th style={{ padding: '12px 16px', color: 'var(--color-text-secondary)', fontWeight: 600, fontSize: '13px' }}>{t('common.actions')}</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={5} style={{ padding: '24px', textAlign: 'center' }}>Loading...</td></tr>
              ) : filteredUsers.length === 0 ? (
                <tr><td colSpan={5} style={{ padding: '24px', textAlign: 'center', color: 'var(--color-text-secondary)' }}>No users found</td></tr>
              ) : (
                filteredUsers.map(user => (
                  <tr key={user.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                    <td style={{ padding: '16px', fontSize: '14px', color: 'var(--color-text-primary)', fontWeight: 500 }}>
                      {user.first_name} {user.last_name}
                    </td>
                    <td style={{ padding: '16px', fontSize: '14px', color: 'var(--color-text-secondary)' }}>
                      {user.email}
                    </td>
                    <td style={{ padding: '16px', fontSize: '14px' }}>
                      <span style={{ backgroundColor: 'var(--color-background)', color: 'var(--color-text-secondary)', padding: '4px 8px', borderRadius: '4px', fontSize: '12px', fontWeight: 600 }}>
                        {getRoleName(user.role_id)}
                      </span>
                    </td>
                    <td style={{ padding: '16px' }}>
                      {user.active ? (
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: 'var(--color-success)', fontSize: '13px', fontWeight: 600 }}>
                          <CheckCircle size={14} /> {t('common.active')}
                        </span>
                      ) : (
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: 'var(--color-danger)', fontSize: '13px', fontWeight: 600 }}>
                          <XCircle size={14} /> {t('common.inactive')}
                        </span>
                      )}
                    </td>
                    <td style={{ padding: '16px' }}>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        {hasPermission('users.update') && (
                          <button onClick={() => handleEdit(user)} style={{ background: 'none', border: 'none', color: 'var(--color-primary)', cursor: 'pointer', padding: '4px' }}>
                            <Edit2 size={16} />
                          </button>
                        )}
                        {hasPermission('users.activate') && (
                          <button onClick={() => handleToggleStatus(user)} style={{ background: 'none', border: 'none', color: user.active ? 'var(--color-danger)' : 'var(--color-success)', cursor: 'pointer', padding: '4px' }}>
                            <ShieldAlert size={16} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
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
