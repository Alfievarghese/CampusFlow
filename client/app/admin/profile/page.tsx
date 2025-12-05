'use client';
import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import api from '@/lib/api';

export default function ProfilePage() {
  const { user } = useAuth();
  const [name, setName] = useState(user?.name || '');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [msg, setMsg] = useState('');
  const [loading, setLoading] = useState(false);

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
    </div>
  );
}
