'use client';
import { useAuth } from '@/context/AuthContext';
import { useRouter, usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import api from '@/lib/api';
import {
    LayoutDashboard, CalendarDays, Calendar, Inbox, Building2,
    Users, ClipboardList, Settings, Globe, LogOut, Sun, Moon,
    UserCircle, ChevronRight,
} from 'lucide-react';

const NAV_ITEMS = [
    { href: '/admin/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { href: '/admin/events', icon: CalendarDays, label: 'My Events' },
    { href: '/admin/calendar', icon: Calendar, label: 'Common Calendar' },
    { href: '/admin/requests', icon: Inbox, label: 'Requests', badge: true },
    { href: '/admin/halls', icon: Building2, label: 'Halls' },
    { href: '/admin/profile', icon: UserCircle, label: 'My Profile' },
];

const SUPER_ADMIN_ITEMS = [
    { href: '/admin/users', icon: Users, label: 'Admin Users' },
    { href: '/admin/audit', icon: ClipboardList, label: 'Audit Logs' },
    { href: '/admin/settings', icon: Settings, label: 'Settings' },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
    const { user, logout, loading } = useAuth();
    const router = useRouter();
    const pathname = usePathname();
    const [pendingCount, setPendingCount] = useState(0);
    const [theme, setTheme] = useState<'dark' | 'light'>('dark');

    // Load saved theme on mount
    useEffect(() => {
        const saved = localStorage.getItem('cf-theme') as 'dark' | 'light' | null;
        if (saved) setTheme(saved);
    }, []);

    // Apply theme to <html> element
    useEffect(() => {
        document.documentElement.setAttribute('data-theme', theme);
        localStorage.setItem('cf-theme', theme);
    }, [theme]);

    useEffect(() => {
        if (!loading && !user) router.push('/auth/login');
    }, [user, loading, router]);

    useEffect(() => {
        if (user) {
            api.get('/conflicts').then(res => {
                const pending = res.data.filter((r: any) => r.status === 'PENDING');
                setPendingCount(pending.length);
            }).catch(() => { });
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
                {/* Logo */}
                <div className="sidebar-logo">
                    <div className="sidebar-logo-mark">CF</div>
                    <div>
                        <div className="sidebar-logo-text">CampusFlow</div>
                        <div style={{ fontSize: '0.62rem', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)', letterSpacing: '0.06em' }}>ADMIN PORTAL</div>
                    </div>
                </div>

                {/* Navigation */}
                <nav className="sidebar-nav">
                    <span className="sidebar-section-title">Navigation</span>
                    {NAV_ITEMS.map(item => {
                        const Icon = item.icon;
                        const isActive = pathname === item.href || (item.href !== '/admin/dashboard' && pathname.startsWith(item.href));
                        return (
                            <Link key={item.href} href={item.href} className={`sidebar-link${isActive ? ' active' : ''}`}>
                                <Icon size={16} strokeWidth={1.75} />
                                <span>{item.label}</span>
                                {item.badge && pendingCount > 0 && (
                                    <span className="sidebar-link-badge">{pendingCount}</span>
                                )}
                                {isActive && <ChevronRight size={14} style={{ marginLeft: 'auto', opacity: 0.5 }} />}
                            </Link>
                        );
                    })}

                    {user.role === 'SUPER_ADMIN' && (
                        <>
                            <span className="sidebar-section-title" style={{ marginTop: '0.5rem' }}>Super Admin</span>
                            {SUPER_ADMIN_ITEMS.map(item => {
                                const Icon = item.icon;
                                const isActive = pathname === item.href;
                                return (
                                    <Link key={item.href} href={item.href} className={`sidebar-link${isActive ? ' active' : ''}`}>
                                        <Icon size={16} strokeWidth={1.75} />
                                        <span>{item.label}</span>
                                        {isActive && <ChevronRight size={14} style={{ marginLeft: 'auto', opacity: 0.5 }} />}
                                    </Link>
                                );
                            })}
                        </>
                    )}

                    <div style={{ flex: 1 }} />

                    {/* Public site link */}
                    <Link href="/" className="sidebar-link" style={{ marginTop: '0.5rem' }}>
                        <Globe size={16} strokeWidth={1.75} />
                        <span>Public Site</span>
                    </Link>
                </nav>

                {/* Footer: theme toggle + user */}
                <div className="sidebar-footer">
                    {/* Theme toggle */}
                    <button
                        onClick={() => setTheme(t => t === 'dark' ? 'light' : 'dark')}
                        className="sidebar-theme-toggle"
                        title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
                    >
                        {theme === 'dark'
                            ? <><Sun size={15} strokeWidth={1.75} /><span>Light Mode</span></>
                            : <><Moon size={15} strokeWidth={1.75} /><span>Dark Mode</span></>
                        }
                    </button>

                    {/* User info + logout */}
                    <div className="sidebar-user" style={{ marginTop: '0.5rem' }}>
                        <div className="sidebar-avatar">{user.name[0].toUpperCase()}</div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {user.name}
                            </div>
                            <div style={{ fontSize: '0.68rem', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
                                {user.role === 'SUPER_ADMIN' ? 'Super Admin' : 'Admin'}
                            </div>
                        </div>
                        <button
                            onClick={() => { logout(); router.push('/'); }}
                            className="btn btn-ghost btn-sm"
                            title="Logout"
                            style={{ padding: '0.35rem', color: 'var(--text-muted)' }}
                        >
                            <LogOut size={15} strokeWidth={1.75} />
                        </button>
                    </div>
                </div>
            </aside>

            {/* Main content */}
            <main className="admin-main">
                {children}
            </main>
        </div>
    );
}
