'use client';
import { useAuth } from '@/context/AuthContext';
import { useRouter, usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import api from '@/lib/api';

const NAV_ITEMS = [
    { href: '/admin/dashboard', icon: '⬡', label: 'Dashboard' },
    { href: '/admin/events', icon: '📅', label: 'My Events' },
    { href: '/admin/calendar', icon: '🗓', label: 'Common Calendar' },
    { href: '/admin/requests', icon: '📨', label: 'Requests', badge: true },
    { href: '/admin/halls', icon: '🏢', label: 'Halls' },
];

const SUPER_ADMIN_ITEMS = [
    { href: '/admin/users', icon: '👥', label: 'Admin Users' },
    { href: '/admin/audit', icon: '📋', label: 'Audit Logs' },
    { href: '/admin/settings', icon: '⚙️', label: 'Settings' },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
    const { user, logout, loading } = useAuth();
    const router = useRouter();
    const pathname = usePathname();
    const [pendingCount, setPendingCount] = useState(0);

    useEffect(() => {
        if (!loading && !user) {
            router.push('/auth/login');
        }
    }, [user, loading, router]);

    useEffect(() => {
        if (user) {
            api.get('/conflicts').then(res => {
                const pending = res.data.filter((r: any) => r.status === 'PENDING');
                setPendingCount(pending.length);
            }).catch(() => { });
            // Also check invite requests for this user's events
        }
    }, [user]);

    if (loading || !user) {
        return (
            <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--ink)' }}>
                <div className="spinner" style={{ width: 40, height: 40 }} />
            </div>
        );
    }

    return (
        <div className="admin-layout">
            {/* Sidebar */}
            <aside className="sidebar">
                <div className="sidebar-logo">
                    <div className="sidebar-logo-mark">CF</div>
                    <div>
                        <div className="sidebar-logo-text">CampusFlow</div>
                        <div style={{ fontSize: '0.65rem', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>Admin Portal</div>
                    </div>
                </div>

                <nav className="sidebar-nav">
                    <span className="sidebar-section-title">Navigation</span>
                    {NAV_ITEMS.map(item => (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={`sidebar-link ${pathname === item.href ? 'active' : ''}`}
                        >
                            <span>{item.icon}</span>
                            <span>{item.label}</span>
                            {item.badge && pendingCount > 0 && (
                                <span className="sidebar-link-badge">{pendingCount}</span>
                            )}
                        </Link>
                    ))}

                    {user.role === 'SUPER_ADMIN' && (
                        <>
                            <span className="sidebar-section-title" style={{ marginTop: '0.5rem' }}>Super Admin</span>
                            {SUPER_ADMIN_ITEMS.map(item => (
                                <Link
                                    key={item.href}
                                    href={item.href}
                                    className={`sidebar-link ${pathname === item.href ? 'active' : ''}`}
                                >
                                    <span>{item.icon}</span>
                                    <span>{item.label}</span>
                                </Link>
                            ))}
                        </>
                    )}

                    <div style={{ flex: 1 }} />
                    <Link href="/" className="sidebar-link" style={{ marginTop: '0.5rem' }}>
                        <span>🌐</span>
                        <span>Public Site</span>
                    </Link>
                </nav>

                <div className="sidebar-footer">
                    <div className="sidebar-user">
                        <div className="sidebar-avatar">
                            {user.name[0].toUpperCase()}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {user.name}
                            </div>
                            <div style={{ fontSize: '0.7rem', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
                                {user.role === 'SUPER_ADMIN' ? '🔑 Super Admin' : '🛡 Admin'}
                            </div>
                        </div>
                        <button
                            onClick={() => { logout(); router.push('/'); }}
                            className="btn btn-ghost btn-sm"
                            title="Logout"
                            style={{ padding: '0.3rem' }}
                        >
                            ↪
                        </button>
                    </div>
                </div>
            </aside>

            {/* Main content */}
            <main className="admin-main" style={{ marginLeft: 'var(--sidebar-w)' }}>
                {children}
            </main>
        </div>
    );
}
