'use client';
import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import api from '@/lib/api';
import { Shield, Building2 } from 'lucide-react';

interface OrgMembership {
  id: string; role: string; permissions: string;
  organization: { id: string; name: string; description: string };
}

export default function ProfilePage() {
  const { user } = useAuth();
  const [name, setName] = useState(user?.name || '');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [msg, setMsg] = useState('');
  const [loading, setLoading] = useState(false);
  const [memberships, setMemberships] = useState<OrgMembership[]>([]);

  useEffect(() => {
    api.get('/orgs/my/memberships')
      .then(res => setMemberships(res.data))
      .catch(() => {});
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password && password !== confirm) { setMsg('Passwords do not match.'); return; }
    setLoading(true);
    try {
      await api.put('/auth/profile', { name, ...(password ? { password } : {}) });
      setMsg('Profile updated successfully.');
      setPassword('');
      setConfirm('');
    } catch (err: any) {
      setMsg(err.response?.data?.error || 'Failed to update profile.');
    } finally { setLoading(false); }
  };

  return (
    <div>
      <div className="page-header"><div><h1 className="page-title">My Profile</h1><p className="page-subtitle">Update your name or password</p></div></div>
      <div className="card" style={{ maxWidth: 480 }}>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div className="form-group"><label className="form-label">Full Name</label><input className="form-input" value={name} onChange={e => setName(e.target.value)} required /></div>
          <div className="form-group"><label className="form-label">New Password (optional)</label><input type="password" className="form-input" value={password} onChange={e => setPassword(e.target.value)} placeholder="Leave blank to keep current" /></div>
          <div className="form-group"><label className="form-label">Confirm Password</label><input type="password" className="form-input" value={confirm} onChange={e => setConfirm(e.target.value)} /></div>
          {msg && <p style={{ fontSize: '0.85rem', color: msg.includes('success') ? 'var(--lime)' : 'var(--rose)' }}>{msg}</p>}
          <button type="submit" className="btn btn-primary" disabled={loading}>{loading ? 'Saving...' : 'Save Changes'}</button>
        </form>
      </div>

      <div className="card mt-4" style={{ maxWidth: 480, marginTop: '2rem' }}>
        <h3 style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '1.1rem' }}>
          <Building2 size={18} /> My Organizations
        </h3>
        {memberships.length === 0 ? (
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>You are not a member of any organizations yet.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {memberships.map(m => {
              const perms = JSON.parse(m.permissions || '[]');
              return (
                <div key={m.id} style={{ padding: '1rem', background: 'var(--surface)', borderRadius: 'var(--radius)', border: '1px solid var(--border)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                    <div style={{ fontWeight: 600 }}>{m.organization.name}</div>
                    <span className={`badge ${m.role === 'ORG_HEAD' ? 'badge-pending' : 'badge-confirmed'}`} style={{ fontSize: '0.7rem' }}>
                      {m.role === 'ORG_HEAD' ? '👑 Head' : 'Member'}
                    </span>
                  </div>
                  {m.organization.description && <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.75rem' }}>{m.organization.description}</p>}
                  
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                    {m.role === 'ORG_HEAD' ? (
                      <span style={{ fontSize: '0.7rem', color: 'var(--amber)', fontFamily: 'var(--font-mono)' }}><Shield size={12} style={{ display: 'inline', marginRight: 2 }}/> ALL PERMISSIONS</span>
                    ) : perms.length > 0 ? (
                      perms.map((p: string) => (
                        <span key={p} style={{ fontSize: '0.68rem', padding: '0.15rem 0.5rem', borderRadius: '99px', background: 'var(--lime-glow)', color: 'var(--lime)', fontFamily: 'var(--font-mono)' }}>{p}</span>
                      ))
                    ) : (
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>No special permissions</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
