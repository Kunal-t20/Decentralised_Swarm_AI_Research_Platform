import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { authAPI } from '../services/api';
import { AlertCircle, ArrowRight, Mail, Lock } from 'lucide-react';
import BrandMark from '../components/BrandMark';

export default function Login({ onLoginSuccess }) {
  const navigate = useNavigate();
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (isRegister) {
        await authAPI.register(email, password);
      }
      const loginRes = await authAPI.login(email, password);
      const { access_token } = loginRes.data;
      localStorage.setItem('token', access_token);
      if (onLoginSuccess) onLoginSuccess(email);
      navigate('/dashboard');
    } catch (err) {
      const detail = err.response?.data?.detail || 'Authentication failed. Please check your credentials.';
      setError(detail);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{ minHeight: 'calc(100vh - 48px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '32px 16px' }}
    >
      <div style={{ width: '100%', maxWidth: '400px' }}>
        {/* Wordmark + title */}
        <div style={{ textAlign: 'center', marginBottom: '40px' }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '16px' }}>
            <BrandMark size={42} />
          </div>
          <h1
            style={{
              fontFamily: "'Space Grotesk', system-ui, sans-serif",
              fontSize: '26px',
              fontWeight: '600',
              color: 'var(--color-text-primary)',
              margin: 0,
              letterSpacing: '-0.01em',
              lineHeight: 1.2,
            }}
          >
            {isRegister ? 'Create your account' : 'Research Platform Access'}
          </h1>
          <p style={{ marginTop: '8px', fontSize: '13px', color: 'var(--color-text-secondary)', margin: '8px 0 0' }}>
            {isRegister
              ? 'Register credentials to operate the research swarm'
              : 'Sign in to access your autonomous research environment'}
          </p>
        </div>

        {/* Card */}
        <div
          className="panel"
          style={{ padding: '32px' }}
        >
          {/* Error */}
          {error && (
            <div
              style={{
                marginBottom: '20px',
                padding: '12px 14px',
                borderRadius: '8px',
                backgroundColor: '#1A0606',
                border: '1px solid #3D1515',
                display: 'flex',
                alignItems: 'flex-start',
                gap: '10px',
              }}
            >
              <AlertCircle size={14} style={{ color: 'var(--color-error)', flexShrink: 0, marginTop: '1px' }} />
              <span style={{ fontSize: '12px', color: '#F87171' }}>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
            {/* Email */}
            <div>
              <label
                className="mono-label"
                style={{ display: 'block', marginBottom: '7px' }}
                htmlFor="login-email-input"
              >
                Email Address
              </label>
              <div style={{ position: 'relative' }}>
                <Mail size={14} style={{ position: 'absolute', left: '13px', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-muted)' }} />
                <input
                  id="login-email-input"
                  type="email"
                  required
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="researcher@swarm.ai"
                  className="field"
                  autoComplete="email"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label
                className="mono-label"
                style={{ display: 'block', marginBottom: '7px' }}
                htmlFor="login-password-input"
              >
                Password
              </label>
              <div style={{ position: 'relative' }}>
                <Lock size={14} style={{ position: 'absolute', left: '13px', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-muted)' }} />
                <input
                  id="login-password-input"
                  type="password"
                  required
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="field"
                  autoComplete="current-password"
                />
              </div>
            </div>

            {/* Submit */}
            <button
              id="login-submit-btn"
              type="submit"
              disabled={loading}
              className="btn-primary"
              style={{ width: '100%', justifyContent: 'center', marginTop: '4px' }}
            >
              <span>{loading ? 'Authenticating…' : isRegister ? 'Register & Access' : 'Sign In'}</span>
              {!loading && <ArrowRight size={14} />}
            </button>
          </form>

          {/* Toggle */}
          <div style={{ marginTop: '20px', textAlign: 'center', fontSize: '12px', color: 'var(--color-text-muted)' }}>
            {isRegister ? 'Already have an account? ' : 'No account yet? '}
            <button
              id="toggle-auth-mode-btn"
              type="button"
              onClick={() => { setIsRegister(!isRegister); setError(''); }}
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                color: 'var(--color-accent-teal)', fontSize: '12px', fontWeight: '500', padding: '0',
                textDecoration: 'underline',
              }}
            >
              {isRegister ? 'Sign in' : 'Register now'}
            </button>
          </div>
        </div>

        {/* Footer note */}
        <p style={{ textAlign: 'center', marginTop: '20px', fontSize: '11px', color: 'var(--color-text-muted)', fontFamily: "'JetBrains Mono', monospace" }}>
          SWARM ENGINE v2 · AUTONOMOUS RESEARCH SYSTEM
        </p>
      </div>
    </div>
  );
}
