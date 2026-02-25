'use client';
import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Building2, CalendarCheck, BarChart3, ShieldCheck } from 'lucide-react';

export default function LoginPage() {
    const { login } = useAuth();
    const router = useRouter();
    const [form, setForm] = useState({ email: '', password: '' });
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            await login(form.email, form.password);
            router.push('/admin/dashboard');
        } catch (err: any) {
            const data = err.response?.data;
            const msg = typeof data?.error === 'string'
                ? data.error
                : typeof data?.message === 'string'
                    ? data.message
                    : 'Login failed. Please try again.';
            setError(msg);
        }
        setLoading(false);
    };

    return (
        <div style={{
            minHeight: '100vh',
            display: 'flex',
            background:
                'radial-gradient(ellipse 80% 60% at 50% 0%, rgba(190,242,100,0.06) 0%, transparent 70%), var(--ink)',
        }}>
            {/* Left Panel */}
            <div style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                padding: '3rem',
                maxWidth: '460px',
                margin: '0 auto',
            }}>
                <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '3rem', textDecoration: 'none' }}>
                    <div className="sidebar-logo-mark">CF</div>
                    <span style={{ fontFamily: 'var(--font-display)', fontSize: '1.15rem', color: 'var(--text-primary)' }}>CampusFlow</span>
                </Link>

                <div className="anim-slide-up">
                    <h2 style={{ marginBottom: '0.4rem' }}>Welcome back.</h2>
                    <p style={{ color: 'var(--text-secondary)', marginBottom: '2.5rem' }}>Sign in to your admin dashboard.</p>

                    {error && <div className="alert alert-error mb-2">{error}</div>}

                    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.1rem' }}>
                        <div className="form-group">
                            <label className="form-label">Email Address</label>
                            <input
                                type="email"
                                className="form-input"
                                placeholder="admin@campus.edu"
                                value={form.email}
                                onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
                                required
                            />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Password</label>
                            <input
                                type="password"
                                className="form-input"
                                placeholder="••••••••"
                                value={form.password}
                                onChange={e => setForm(p => ({ ...p, password: e.target.value }))}
                                required
                            />
                        </div>
                        <button type="submit" className="btn btn-primary btn-lg btn-full" disabled={loading} style={{ marginTop: '0.5rem' }}>
                            {loading ? (
                                <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', justifyContent: 'center' }}>
                                    <span className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }} />
                                    Signing in...
                                </span>
                            ) : 'Sign In →'}
                        </button>
                    </form>

                    <p style={{ marginTop: '1.5rem', color: 'var(--text-muted)', fontSize: '0.85rem', textAlign: 'center' }}>
                        No account?{' '}
                        <Link href="/auth/register" style={{ color: 'var(--lime)', textDecoration: 'none' }}>
                            Request admin access
                        </Link>
                    </p>
                </div>
            </div>

            {/* Right decorative panel (hidden on small screens) */}
            <div style={{
                flex: 1,
                background: 'linear-gradient(135deg, var(--ink-2) 0%, var(--ink-3) 100%)',
                borderLeft: '1px solid var(--border)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '3rem',
                position: 'relative',
                overflow: 'hidden',
            } as React.CSSProperties} className="hero">
                <div style={{
                    position: 'relative',
                    zIndex: 1,
                    textAlign: 'center',
                    maxWidth: '380px',
                }}>
                    <Building2 size={60} strokeWidth={1} style={{ color: 'var(--lime)', marginBottom: '1rem', opacity: 0.8 }} />
                    <h3 style={{ marginBottom: '1rem', fontFamily: 'var(--font-display)', fontSize: '1.8rem' }}>
                        Manage Your Campus.<br />Effortlessly.
                    </h3>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.93rem', lineHeight: 1.7 }}>
                        Book halls, schedule events, handle conflicts — all in one secure, role-based platform.
                    </p>
                    <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', marginTop: '2rem', flexWrap: 'wrap' }}>
                        {[
                            { icon: CalendarCheck, label: 'Events' },
                            { icon: Building2, label: 'Halls' },
                            { icon: BarChart3, label: 'Analytics' },
                            { icon: ShieldCheck, label: 'Secure' },
                        ].map(({ icon: Icon, label }) => (
                            <span key={label} className="badge badge-confirmed" style={{ gap: '0.3rem' }}><Icon size={11} />{label}</span>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
