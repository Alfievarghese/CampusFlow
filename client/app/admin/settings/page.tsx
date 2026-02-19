'use client';
import { useEffect, useState } from 'react';
import api from '@/lib/api';

export default function SettingsPage() {
    const [settings, setSettings] = useState({ registrationEnabled: true, maxAdmins: 20 });
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [msg, setMsg] = useState('');

    useEffect(() => {
        api.get('/admin/settings').then(r => { setSettings(r.data); setLoading(false); }).catch(() => setLoading(false));
    }, []);

    const save = async () => {
        setSaving(true);
        try {
            const r = await api.patch('/admin/settings', settings);
            setSettings(r.data);
            setMsg('Settings saved.');
        } catch (e: any) { setMsg(e.response?.data?.error || 'Error saving.'); }
        setSaving(false);
    };

    return (
        <div>
            <div className="page-header">
                <div>
                    <h1 className="page-title">System Settings</h1>
                    <p className="page-subtitle">Configure platform-wide behaviour</p>
                </div>
            </div>

            {msg && <div className="alert alert-success mb-2">{msg}</div>}

            {loading ? (
                <div style={{ display: 'flex', justifyContent: 'center', padding: '4rem' }}><div className="spinner" style={{ width: 36, height: 36 }} /></div>
            ) : (
                <div style={{ maxWidth: '540px', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                    <div className="card">
                        <div className="card-header"><span className="card-title">Registration & Access</span></div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1rem', background: 'var(--ink-3)', borderRadius: 'var(--radius)' }}>
                                <div>
                                    <div style={{ fontWeight: 600, marginBottom: '0.2rem' }}>Admin Registration</div>
                                    <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                                        {settings.registrationEnabled ? 'New admins can register and request access.' : 'Registration is currently closed.'}
                                    </div>
                                </div>
                                <button
                                    className={`btn btn-sm ${settings.registrationEnabled ? 'btn-danger' : 'btn-primary'}`}
                                    onClick={() => setSettings(p => ({ ...p, registrationEnabled: !p.registrationEnabled }))}
                                >
                                    {settings.registrationEnabled ? 'Disable' : 'Enable'}
                                </button>
                            </div>

                            <div className="form-group">
                                <label className="form-label">Maximum Admin Accounts</label>
                                <input
                                    className="form-input"
                                    type="number"
                                    min={1}
                                    max={100}
                                    value={settings.maxAdmins}
                                    onChange={e => setSettings(p => ({ ...p, maxAdmins: parseInt(e.target.value) }))}
                                />
                                <span className="form-hint">Maximum number of admin accounts allowed in the system</span>
                            </div>
                        </div>
                    </div>

                    <button className="btn btn-primary btn-lg" onClick={save} disabled={saving}>
                        {saving ? 'Saving...' : 'Save Settings'}
                    </button>

                    {/* System Info */}
                    <div className="card" style={{ background: 'var(--ink-3)' }}>
                        <div className="card-header"><span className="card-title">System Info</span></div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.85rem', fontFamily: 'var(--font-mono)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                <span style={{ color: 'var(--text-muted)' }}>Version</span>
                                <span>CampusFlow v1.0.0</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                <span style={{ color: 'var(--text-muted)' }}>Database</span>
                                <span>SQLite (Prisma ORM)</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                <span style={{ color: 'var(--text-muted)' }}>Auth</span>
                                <span>JWT + bcrypt</span>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
