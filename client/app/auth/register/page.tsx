'use client';
import { useState } from 'react';
import api from '@/lib/api';
import Link from 'next/link';
import { CheckCircle2 } from 'lucide-react';

export default function RegisterPage() {
    const [form, setForm] = useState({ name: '', email: '', password: '', confirm: '' });
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        if (form.password !== form.confirm) return setError('Passwords do not match.');
        if (form.password.length < 8) return setError('Password must be at least 8 characters.');
        setLoading(true);
        try {
            const res = await api.post('/auth/register', { name: form.name, email: form.email, password: form.password });
            setSuccess(res.data.message);
        } catch (err: any) {
            setError(err.response?.data?.error || 'Registration failed.');
        }
        setLoading(false);
    };

    if (success) {
        return (
            <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--ink)' }}>
                <div style={{ textAlign: 'center', maxWidth: '440px', padding: '2rem' }}>
                    <CheckCircle2 size={56} strokeWidth={1.25} style={{ color: 'var(--lime)', marginBottom: '1rem' }} />
                    <h2 style={{ marginBottom: '1rem' }}>Registration Submitted!</h2>
                    <div className="alert alert-success" style={{ marginBottom: '1.5rem' }}>{success}</div>
                    <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>Your account is pending Super Admin approval. You'll be notified once approved.</p>
                    <Link href="/auth/login" className="btn btn-primary">Back to Login</Link>
                </div>
            </div>
        );
    }

    return (
        <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--ink)', padding: '2rem' }}>
            <div style={{ width: '100%', maxWidth: '440px' }}>
                <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '2.5rem', textDecoration: 'none' }}>
                    <div className="sidebar-logo-mark">CF</div>
                    <span style={{ fontFamily: 'var(--font-display)', fontSize: '1.15rem', color: 'var(--text-primary)' }}>CampusFlow</span>
                </Link>

                <div className="anim-slide-up">
                    <h2 style={{ marginBottom: '0.4rem' }}>Request Admin Access</h2>
                    <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem' }}>Register your account. Approval required from Super Admin.</p>

                    {error && <div className="alert alert-error mb-2">{error}</div>}

                    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        <div className="form-group">
                            <label className="form-label">Full Name</label>
                            <input className="form-input" placeholder="Prof. Jane Smith" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} required />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Email Address</label>
                            <input className="form-input" type="email" placeholder="you@campus.edu" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} required />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Password</label>
                            <input className="form-input" type="password" placeholder="Min. 8 characters" value={form.password} onChange={e => setForm(p => ({ ...p, password: e.target.value }))} required />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Confirm Password</label>
                            <input className="form-input" type="password" placeholder="Repeat password" value={form.confirm} onChange={e => setForm(p => ({ ...p, confirm: e.target.value }))} required />
                        </div>
                        <button type="submit" className="btn btn-primary btn-lg btn-full" disabled={loading} style={{ marginTop: '0.5rem' }}>
                            {loading ? 'Submitting...' : 'Request Access →'}
                        </button>
                    </form>

                    <p style={{ marginTop: '1.5rem', color: 'var(--text-muted)', fontSize: '0.85rem', textAlign: 'center' }}>
                        Already have access?{' '}
                        <Link href="/auth/login" style={{ color: 'var(--lime)', textDecoration: 'none' }}>Sign in</Link>
                    </p>
                </div>
            </div>
        </div>
    );
}
