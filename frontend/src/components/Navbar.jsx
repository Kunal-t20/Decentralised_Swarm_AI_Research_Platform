import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { LogOut, User } from 'lucide-react';
import BrandMark from './BrandMark';

export default function Navbar({ userEmail, onLogout }) {
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogoutClick = () => {
    if (onLogout) onLogout();
    localStorage.removeItem('token');
    navigate('/login');
  };

  const navItems = [
    { label: 'Dashboard', href: '/dashboard' },
  ];

  return (
    <header
      style={{ backgroundColor: 'var(--color-surface-secondary)', borderBottom: '1px solid var(--color-border)' }}
      className="sticky top-0 z-50 px-6"
    >
      <div className="max-w-7xl mx-auto h-12 flex items-center justify-between">
        {/* Left — Wordmark */}
        <Link to="/dashboard" id="nav-brand-link" className="flex items-center gap-2.5 group no-underline">
          <BrandMark size={26} />
          <div className="leading-none">
            <span
              style={{ color: 'var(--color-text-primary)', fontWeight: '600', fontSize: '14px', letterSpacing: '-0.01em' }}
            >
              SwarmAI
            </span>
            <span
              className="mono-label block"
              style={{ marginTop: '1px', color: 'var(--color-text-muted)', letterSpacing: '0.1em' }}
            >
              DECENTRALIZED RESEARCH ENGINE
            </span>
          </div>
        </Link>

        {/* Center — Navigation */}
        {userEmail && (
          <nav className="flex items-center gap-7" style={{ borderBottom: 'none' }}>
            {navItems.map(item => (
              <Link
                key={item.href}
                to={item.href}
                className={`nav-tab ${location.pathname === item.href ? 'active' : ''}`}
                style={{ paddingBottom: '0px', borderBottom: 'none', marginBottom: '0', lineHeight: '48px' }}
              >
                <span
                  style={{
                    display: 'inline-block',
                    paddingBottom: '4px',
                    borderBottom: location.pathname === item.href ? '1px solid var(--color-accent-teal)' : '1px solid transparent',
                    color: location.pathname === item.href ? 'var(--color-text-primary)' : 'var(--color-text-secondary)',
                    fontSize: '13px',
                    fontWeight: '500',
                    transition: 'color 150ms ease, border-color 150ms ease',
                  }}
                >
                  {item.label}
                </span>
              </Link>
            ))}
          </nav>
        )}

        {/* Right — system status + user */}
        <div className="flex items-center gap-4">
          {/* System status */}
          <div className="flex items-center gap-2" style={{ fontSize: '11px', color: 'var(--color-text-secondary)', fontFamily: 'var(--font-mono)' }}>
            <span className="status-dot success" style={{ width: '5px', height: '5px' }}></span>
            <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '10px', color: 'var(--color-text-muted)' }}>
              All Systems Operational
            </span>
          </div>

          {userEmail && (
            <>
              {/* Divider */}
              <div style={{ width: '1px', height: '16px', backgroundColor: 'var(--color-border)' }}></div>

              {/* User */}
              <div className="flex items-center gap-2">
                <div
                  style={{
                    width: '26px',
                    height: '26px',
                    borderRadius: '6px',
                    backgroundColor: 'var(--color-surface-elevated)',
                    border: '1px solid var(--color-border)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <User size={12} style={{ color: 'var(--color-text-muted)' }} />
                </div>
                <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '11px', color: 'var(--color-text-secondary)' }}>
                  {userEmail.split('@')[0]}
                </span>
              </div>

              {/* Logout */}
              <button
                id="nav-logout-btn"
                onClick={handleLogoutClick}
                style={{ color: 'var(--color-text-muted)', padding: '4px 6px', borderRadius: '6px', background: 'transparent', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', transition: 'color 150ms ease' }}
                title="Sign out"
                onMouseEnter={e => { e.currentTarget.style.color = 'var(--color-error)'; }}
                onMouseLeave={e => { e.currentTarget.style.color = 'var(--color-text-muted)'; }}
              >
                <LogOut size={13} />
              </button>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
