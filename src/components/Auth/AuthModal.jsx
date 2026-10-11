import React, { useState } from 'react';
import {
  Shield,
  Lock,
  Mail,
  Key,
  User,
  ArrowRight,
  X,
  CheckCircle2,
  AlertCircle,
  Loader2,
  School,
  Eye,
  EyeOff
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export default function AuthModal() {
  const {
    isAuthModalOpen,
    closeAuthModal,
    authModalMode,
    setAuthModalMode,
    login,
    register,
    confirmRegistration,
    requestPasswordReset,
    confirmNewPassword,
    isConfigured
  } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);

  if (!isAuthModalOpen) return null;

  const handleSignIn = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await login({ email, password });
      closeAuthModal();
    } catch (err) {
      if (err.name === 'UserNotConfirmedException') {
        setAuthModalMode('confirm');
        setError('Please verify your email address with the verification code sent to you.');
      } else {
        setError(err.message || 'Incorrect email or password. Please verify and try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSignUp = async (e) => {
    e.preventDefault();
    setError(null);
    if (password !== confirmPassword) {
      setError('Passwords do not match. Please verify.');
      return;
    }
    if (password.length < 8) {
      setError('Password must contain at least 8 characters with upper, lower, and numbers.');
      return;
    }

    setLoading(true);
    try {
      await register({ email, password });
      setAuthModalMode('confirm');
      setSuccessMessage('Account created! Please enter the 6-digit verification code sent to your email.');
    } catch (err) {
      setError(err.message || 'Registration failed. Please try a different email address.');
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmCode = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await confirmRegistration({ email, code: verificationCode });
      setSuccessMessage('Email verified successfully! You may now sign in.');
      setAuthModalMode('signIn');
    } catch (err) {
      setError(err.message || 'Invalid or expired confirmation code.');
    } finally {
      setLoading(false);
    }
  };

  const handleRequestReset = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await requestPasswordReset({ email });
      setAuthModalMode('confirmReset');
      setSuccessMessage('Password reset code dispatched. Please check your inbox.');
    } catch (err) {
      setError(err.message || 'Unable to request password reset.');
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmReset = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await confirmNewPassword({ email, code: verificationCode, newPassword });
      setSuccessMessage('Password updated successfully! You can now log in.');
      setAuthModalMode('signIn');
    } catch (err) {
      setError(err.message || 'Failed to reset password. Please check your verification code.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        background: 'rgba(5, 8, 15, 0.85)',
        backdropFilter: 'blur(12px)',
        zIndex: 99999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px'
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) closeAuthModal();
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '430px',
          background: '#0d0f12',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          boxShadow: '0 25px 70px rgba(0, 0, 0, 0.85), 0 0 1px 1px rgba(255, 255, 255, 0.05)',
          borderRadius: '26px',
          padding: '38px 32px 34px 32px',
          color: '#ffffff',
          position: 'relative',
          overflow: 'hidden'
        }}
      >
        {/* Close Button */}
        <button
          onClick={closeAuthModal}
          style={{
            position: 'absolute',
            top: '20px',
            right: '20px',
            background: 'rgba(255, 255, 255, 0.06)',
            border: 'none',
            borderRadius: '50%',
            width: '36px',
            height: '36px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#94a3b8',
            cursor: 'pointer',
            transition: 'all 0.2s'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.color = '#ffffff';
            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.12)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.color = '#94a3b8';
            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.06)';
          }}
        >
          <X size={18} />
        </button>

        {/* Clean Header matching reference mockup */}
        <div style={{ marginBottom: '28px' }}>
          <h1
            style={{
              margin: 0,
              fontSize: '2rem',
              fontWeight: 700,
              letterSpacing: '-0.03em',
              color: '#ffffff',
              fontFamily: "var(--font-heading, 'Outfit', sans-serif)",
              lineHeight: 1.15
            }}
          >
            {authModalMode === 'signIn' && 'Citizen Sign In'}
            {authModalMode === 'signUp' && 'Citizen Sign Up'}
            {authModalMode === 'confirm' && 'Verify Email Address'}
            {authModalMode === 'forgot' && 'Reset Password'}
            {authModalMode === 'confirmReset' && 'Set New Password'}
          </h1>
          <p
            style={{
              margin: '6px 0 0 0',
              fontSize: '0.92rem',
              color: '#94a3b8',
              fontFamily: "var(--font-main, sans-serif)",
              letterSpacing: '-0.01em'
            }}
          >
            Amazon Cognito Secure Identity Gate
          </p>
        </div>

        {/* Unconfigured Notice */}
        {!isConfigured && (
          <div
            style={{
              background: 'rgba(245, 158, 11, 0.1)',
              border: '1px solid rgba(245, 158, 11, 0.3)',
              borderRadius: '12px',
              padding: '12px 16px',
              marginBottom: '20px',
              display: 'flex',
              gap: '10px',
              alignItems: 'flex-start'
            }}
          >
            <AlertCircle size={18} color="#f59e0b" style={{ flexShrink: 0, marginTop: '2px' }} />
            <div style={{ fontSize: '0.78rem', color: '#fbbf24', lineHeight: 1.4 }}>
              <strong>Cognito Pending Live Deployment</strong>
              <br />
              User Pool credentials are not configured in Vercel environment variables.
            </div>
          </div>
        )}

        {/* Success Alert */}
        {successMessage && (
          <div
            style={{
              background: 'rgba(16, 185, 129, 0.1)',
              border: '1px solid rgba(16, 185, 129, 0.3)',
              borderRadius: '12px',
              padding: '12px 16px',
              marginBottom: '20px',
              display: 'flex',
              gap: '10px',
              alignItems: 'center',
              color: '#34d399',
              fontSize: '0.8rem'
            }}
          >
            <CheckCircle2 size={18} style={{ flexShrink: 0 }} />
            <span>{successMessage}</span>
          </div>
        )}

        {/* Error Alert */}
        {error && (
          <div
            style={{
              background: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              borderRadius: '12px',
              padding: '12px 16px',
              marginBottom: '20px',
              display: 'flex',
              gap: '10px',
              alignItems: 'center',
              color: '#f87171',
              fontSize: '0.8rem'
            }}
          >
            <AlertCircle size={18} style={{ flexShrink: 0 }} />
            <span>{error}</span>
          </div>
        )}

        {/* SIGN IN FORM (Matches reference design) */}
        {authModalMode === 'signIn' && (
          <form onSubmit={handleSignIn} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: 500, color: '#f1f5f9', marginBottom: '8px' }}>
                Email Address
              </label>
              <div style={{ position: 'relative' }}>
                <Mail
                  size={18}
                  color="#94a3b8"
                  style={{
                    position: 'absolute',
                    left: '16px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    pointerEvents: 'none'
                  }}
                />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="citizen@delhi.gov.in"
                  style={{
                    width: '100%',
                    height: '52px',
                    padding: '0 16px 0 46px',
                    background: 'rgba(255, 255, 255, 0.03)',
                    border: '1px solid rgba(255, 255, 255, 0.12)',
                    borderRadius: '14px',
                    color: '#ffffff',
                    fontSize: '0.95rem',
                    outline: 'none',
                    boxSizing: 'border-box',
                    transition: 'border-color 0.2s, background 0.2s'
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.35)';
                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.12)';
                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.03)';
                  }}
                />
              </div>
            </div>

            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <label style={{ fontSize: '0.9rem', fontWeight: 500, color: '#f1f5f9' }}>
                  Password
                </label>
                <button
                  type="button"
                  onClick={() => setAuthModalMode('forgot')}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#94a3b8',
                    fontSize: '0.86rem',
                    cursor: 'pointer',
                    padding: 0,
                    transition: 'color 0.2s'
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = '#ffffff')}
                  onMouseLeave={(e) => (e.currentTarget.style.color = '#94a3b8')}
                >
                  Forgot Password?
                </button>
              </div>
              <div style={{ position: 'relative' }}>
                <Lock
                  size={18}
                  color="#94a3b8"
                  style={{
                    position: 'absolute',
                    left: '16px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    pointerEvents: 'none'
                  }}
                />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  style={{
                    width: '100%',
                    height: '52px',
                    padding: '0 46px 0 46px',
                    background: 'rgba(255, 255, 255, 0.03)',
                    border: '1px solid rgba(255, 255, 255, 0.12)',
                    borderRadius: '14px',
                    color: '#ffffff',
                    fontSize: '0.95rem',
                    outline: 'none',
                    boxSizing: 'border-box',
                    transition: 'border-color 0.2s, background 0.2s'
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.35)';
                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.12)';
                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.03)';
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  style={{
                    position: 'absolute',
                    right: '14px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    color: '#94a3b8',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '4px',
                    transition: 'color 0.2s'
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = '#ffffff')}
                  onMouseLeave={(e) => (e.currentTarget.style.color = '#94a3b8')}
                >
                  {showPassword ? <Eye size={18} /> : <EyeOff size={18} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || !isConfigured}
              style={{
                marginTop: '10px',
                height: '52px',
                background: '#ffffff',
                color: '#000000',
                border: 'none',
                borderRadius: '18px',
                fontWeight: 700,
                fontSize: '1rem',
                letterSpacing: '-0.01em',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '10px',
                cursor: loading || !isConfigured ? 'not-allowed' : 'pointer',
                opacity: loading || !isConfigured ? 0.6 : 1,
                boxShadow: '0 4px 18px rgba(255, 255, 255, 0.12)',
                transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)'
              }}
              onMouseEnter={(e) => {
                if (!loading && isConfigured) {
                  e.currentTarget.style.background = '#f1f5f9';
                  e.currentTarget.style.transform = 'translateY(-1px)';
                  e.currentTarget.style.boxShadow = '0 6px 22px rgba(255, 255, 255, 0.2)';
                }
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = '#ffffff';
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 4px 18px rgba(255, 255, 255, 0.12)';
              }}
            >
              {loading ? (
                <Loader2 size={18} className="animate-spin" />
              ) : (
                <ArrowRight size={18} strokeWidth={2.4} />
              )}
              <span>{loading ? 'Authenticating...' : 'Sign In'}</span>
            </button>

            {/* Divider */}
            <div style={{ display: 'flex', alignItems: 'center', margin: '14px 0 6px 0' }}>
              <div style={{ flex: 1, height: '1px', background: 'rgba(255, 255, 255, 0.12)' }} />
              <span style={{ padding: '0 14px', fontSize: '0.82rem', color: '#64748b' }}>or</span>
              <div style={{ flex: 1, height: '1px', background: 'rgba(255, 255, 255, 0.12)' }} />
            </div>

            <div style={{ textAlign: 'center', fontSize: '0.9rem', color: '#94a3b8' }}>
              Don't have an account?{' '}
              <button
                type="button"
                onClick={() => setAuthModalMode('signUp')}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#ffffff',
                  fontWeight: 700,
                  cursor: 'pointer',
                  padding: 0,
                  fontSize: '0.9rem',
                  transition: 'opacity 0.2s'
                }}
                onMouseEnter={(e) => (e.currentTarget.style.opacity = '0.8')}
                onMouseLeave={(e) => (e.currentTarget.style.opacity = '1')}
              >
                Sign Up as Citizen
              </button>
            </div>
          </form>
        )}

        {/* SIGN UP FORM */}
        {authModalMode === 'signUp' && (
          <form onSubmit={handleSignUp} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: 500, color: '#f1f5f9', marginBottom: '8px' }}>
                Email Address
              </label>
              <div style={{ position: 'relative' }}>
                <Mail
                  size={18}
                  color="#94a3b8"
                  style={{
                    position: 'absolute',
                    left: '16px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    pointerEvents: 'none'
                  }}
                />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="citizen@delhi.gov.in"
                  style={{
                    width: '100%',
                    height: '52px',
                    padding: '0 16px 0 46px',
                    background: 'rgba(255, 255, 255, 0.03)',
                    border: '1px solid rgba(255, 255, 255, 0.12)',
                    borderRadius: '14px',
                    color: '#ffffff',
                    fontSize: '0.95rem',
                    outline: 'none',
                    boxSizing: 'border-box',
                    transition: 'border-color 0.2s, background 0.2s'
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.35)';
                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.12)';
                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.03)';
                  }}
                />
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: 500, color: '#f1f5f9', marginBottom: '8px' }}>
                Password (min 8 chars)
              </label>
              <div style={{ position: 'relative' }}>
                <Lock
                  size={18}
                  color="#94a3b8"
                  style={{
                    position: 'absolute',
                    left: '16px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    pointerEvents: 'none'
                  }}
                />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  style={{
                    width: '100%',
                    height: '52px',
                    padding: '0 46px 0 46px',
                    background: 'rgba(255, 255, 255, 0.03)',
                    border: '1px solid rgba(255, 255, 255, 0.12)',
                    borderRadius: '14px',
                    color: '#ffffff',
                    fontSize: '0.95rem',
                    outline: 'none',
                    boxSizing: 'border-box',
                    transition: 'border-color 0.2s, background 0.2s'
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.35)';
                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.12)';
                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.03)';
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  style={{
                    position: 'absolute',
                    right: '14px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    color: '#94a3b8',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '4px',
                    transition: 'color 0.2s'
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = '#ffffff')}
                  onMouseLeave={(e) => (e.currentTarget.style.color = '#94a3b8')}
                >
                  {showPassword ? <Eye size={18} /> : <EyeOff size={18} />}
                </button>
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: 500, color: '#f1f5f9', marginBottom: '8px' }}>
                Confirm Password
              </label>
              <div style={{ position: 'relative' }}>
                <Lock
                  size={18}
                  color="#94a3b8"
                  style={{
                    position: 'absolute',
                    left: '16px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    pointerEvents: 'none'
                  }}
                />
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••••••"
                  style={{
                    width: '100%',
                    height: '52px',
                    padding: '0 46px 0 46px',
                    background: 'rgba(255, 255, 255, 0.03)',
                    border: '1px solid rgba(255, 255, 255, 0.12)',
                    borderRadius: '14px',
                    color: '#ffffff',
                    fontSize: '0.95rem',
                    outline: 'none',
                    boxSizing: 'border-box',
                    transition: 'border-color 0.2s, background 0.2s'
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.35)';
                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.12)';
                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.03)';
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                  style={{
                    position: 'absolute',
                    right: '14px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    color: '#94a3b8',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '4px',
                    transition: 'color 0.2s'
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = '#ffffff')}
                  onMouseLeave={(e) => (e.currentTarget.style.color = '#94a3b8')}
                >
                  {showConfirmPassword ? <Eye size={18} /> : <EyeOff size={18} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || !isConfigured}
              style={{
                marginTop: '10px',
                height: '52px',
                background: '#ffffff',
                color: '#000000',
                border: 'none',
                borderRadius: '18px',
                fontWeight: 700,
                fontSize: '1rem',
                letterSpacing: '-0.01em',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '10px',
                cursor: loading || !isConfigured ? 'not-allowed' : 'pointer',
                opacity: loading || !isConfigured ? 0.6 : 1,
                boxShadow: '0 4px 18px rgba(255, 255, 255, 0.12)',
                transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)'
              }}
              onMouseEnter={(e) => {
                if (!loading && isConfigured) {
                  e.currentTarget.style.background = '#f1f5f9';
                  e.currentTarget.style.transform = 'translateY(-1px)';
                  e.currentTarget.style.boxShadow = '0 6px 22px rgba(255, 255, 255, 0.2)';
                }
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = '#ffffff';
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 4px 18px rgba(255, 255, 255, 0.12)';
              }}
            >
              {loading ? (
                <Loader2 size={18} className="animate-spin" />
              ) : (
                <ArrowRight size={18} strokeWidth={2.4} />
              )}
              <span>{loading ? 'Creating Account...' : 'Create Citizen Account'}</span>
            </button>

            {/* Divider */}
            <div style={{ display: 'flex', alignItems: 'center', margin: '14px 0 6px 0' }}>
              <div style={{ flex: 1, height: '1px', background: 'rgba(255, 255, 255, 0.12)' }} />
              <span style={{ padding: '0 14px', fontSize: '0.82rem', color: '#64748b' }}>or</span>
              <div style={{ flex: 1, height: '1px', background: 'rgba(255, 255, 255, 0.12)' }} />
            </div>

            <div style={{ textAlign: 'center', fontSize: '0.9rem', color: '#94a3b8' }}>
              Already have an account?{' '}
              <button
                type="button"
                onClick={() => setAuthModalMode('signIn')}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#ffffff',
                  fontWeight: 700,
                  cursor: 'pointer',
                  padding: 0,
                  fontSize: '0.9rem',
                  transition: 'opacity 0.2s'
                }}
                onMouseEnter={(e) => (e.currentTarget.style.opacity = '0.8')}
                onMouseLeave={(e) => (e.currentTarget.style.opacity = '1')}
              >
                Sign In
              </button>
            </div>
          </form>
        )}

        {/* CONFIRM CODE FORM */}
        {authModalMode === 'confirm' && (
          <form onSubmit={handleConfirmCode} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <p style={{ margin: 0, fontSize: '0.88rem', color: '#cbd5e1', lineHeight: 1.5 }}>
              We dispatched a 6-digit verification code to <strong>{email}</strong>. Please enter it below to confirm your account.
            </p>

            <div>
              <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: 500, color: '#f1f5f9', marginBottom: '8px' }}>
                Verification Code
              </label>
              <div style={{ position: 'relative' }}>
                <Key
                  size={18}
                  color="#94a3b8"
                  style={{
                    position: 'absolute',
                    left: '16px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    pointerEvents: 'none'
                  }}
                />
                <input
                  type="text"
                  required
                  maxLength={6}
                  value={verificationCode}
                  onChange={(e) => setVerificationCode(e.target.value)}
                  placeholder="123456"
                  style={{
                    width: '100%',
                    height: '52px',
                    padding: '0 16px 0 46px',
                    background: 'rgba(255, 255, 255, 0.03)',
                    border: '1px solid rgba(255, 255, 255, 0.12)',
                    borderRadius: '14px',
                    color: '#ffffff',
                    fontSize: '1.05rem',
                    letterSpacing: '0.25em',
                    fontFamily: 'monospace',
                    outline: 'none',
                    boxSizing: 'border-box'
                  }}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              style={{
                marginTop: '10px',
                height: '52px',
                background: '#ffffff',
                color: '#000000',
                border: 'none',
                borderRadius: '18px',
                fontWeight: 700,
                fontSize: '1rem',
                letterSpacing: '-0.01em',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '10px',
                cursor: loading ? 'not-allowed' : 'pointer',
                boxShadow: '0 4px 18px rgba(255, 255, 255, 0.12)',
                transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)'
              }}
              onMouseEnter={(e) => {
                if (!loading) {
                  e.currentTarget.style.background = '#f1f5f9';
                  e.currentTarget.style.transform = 'translateY(-1px)';
                }
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = '#ffffff';
                e.currentTarget.style.transform = 'translateY(0)';
              }}
            >
              {loading ? <Loader2 size={18} className="animate-spin" /> : <CheckCircle2 size={18} />}
              <span>{loading ? 'Verifying...' : 'Confirm Account'}</span>
            </button>

            <button
              type="button"
              onClick={() => setAuthModalMode('signIn')}
              style={{
                background: 'none',
                border: 'none',
                color: '#94a3b8',
                fontSize: '0.88rem',
                cursor: 'pointer',
                textAlign: 'center',
                padding: '6px'
              }}
            >
              Back to Sign In
            </button>
          </form>
        )}

        {/* FORGOT PASSWORD FORM */}
        {authModalMode === 'forgot' && (
          <form onSubmit={handleRequestReset} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <p style={{ margin: 0, fontSize: '0.88rem', color: '#cbd5e1', lineHeight: 1.5 }}>
              Enter the email address tied to your account to receive a secure password reset code.
            </p>

            <div>
              <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: 500, color: '#f1f5f9', marginBottom: '8px' }}>
                Email Address
              </label>
              <div style={{ position: 'relative' }}>
                <Mail
                  size={18}
                  color="#94a3b8"
                  style={{
                    position: 'absolute',
                    left: '16px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    pointerEvents: 'none'
                  }}
                />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="citizen@delhi.gov.in"
                  style={{
                    width: '100%',
                    height: '52px',
                    padding: '0 16px 0 46px',
                    background: 'rgba(255, 255, 255, 0.03)',
                    border: '1px solid rgba(255, 255, 255, 0.12)',
                    borderRadius: '14px',
                    color: '#ffffff',
                    fontSize: '0.95rem',
                    outline: 'none',
                    boxSizing: 'border-box'
                  }}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              style={{
                marginTop: '10px',
                height: '52px',
                background: '#ffffff',
                color: '#000000',
                border: 'none',
                borderRadius: '18px',
                fontWeight: 700,
                fontSize: '1rem',
                letterSpacing: '-0.01em',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '10px',
                cursor: loading ? 'not-allowed' : 'pointer',
                boxShadow: '0 4px 18px rgba(255, 255, 255, 0.12)',
                transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)'
              }}
              onMouseEnter={(e) => {
                if (!loading) {
                  e.currentTarget.style.background = '#f1f5f9';
                  e.currentTarget.style.transform = 'translateY(-1px)';
                }
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = '#ffffff';
                e.currentTarget.style.transform = 'translateY(0)';
              }}
            >
              {loading ? <Loader2 size={18} className="animate-spin" /> : <ArrowRight size={18} />}
              <span>{loading ? 'Dispatching Code...' : 'Send Reset Code'}</span>
            </button>

            <button
              type="button"
              onClick={() => setAuthModalMode('signIn')}
              style={{
                background: 'none',
                border: 'none',
                color: '#94a3b8',
                fontSize: '0.88rem',
                cursor: 'pointer',
                textAlign: 'center',
                padding: '6px'
              }}
            >
              Back to Sign In
            </button>
          </form>
        )}

        {/* CONFIRM RESET PASSWORD FORM */}
        {authModalMode === 'confirmReset' && (
          <form onSubmit={handleConfirmReset} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: 500, color: '#f1f5f9', marginBottom: '8px' }}>
                Reset Code
              </label>
              <div style={{ position: 'relative' }}>
                <Key
                  size={18}
                  color="#94a3b8"
                  style={{
                    position: 'absolute',
                    left: '16px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    pointerEvents: 'none'
                  }}
                />
                <input
                  type="text"
                  required
                  value={verificationCode}
                  onChange={(e) => setVerificationCode(e.target.value)}
                  placeholder="Enter 6-digit code"
                  style={{
                    width: '100%',
                    height: '52px',
                    padding: '0 16px 0 46px',
                    background: 'rgba(255, 255, 255, 0.03)',
                    border: '1px solid rgba(255, 255, 255, 0.12)',
                    borderRadius: '14px',
                    color: '#ffffff',
                    fontSize: '0.95rem',
                    outline: 'none',
                    boxSizing: 'border-box'
                  }}
                />
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: 500, color: '#f1f5f9', marginBottom: '8px' }}>
                New Password
              </label>
              <div style={{ position: 'relative' }}>
                <Lock
                  size={18}
                  color="#94a3b8"
                  style={{
                    position: 'absolute',
                    left: '16px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    pointerEvents: 'none'
                  }}
                />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="••••••••••••"
                  style={{
                    width: '100%',
                    height: '52px',
                    padding: '0 46px 0 46px',
                    background: 'rgba(255, 255, 255, 0.03)',
                    border: '1px solid rgba(255, 255, 255, 0.12)',
                    borderRadius: '14px',
                    color: '#ffffff',
                    fontSize: '0.95rem',
                    outline: 'none',
                    boxSizing: 'border-box'
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  style={{
                    position: 'absolute',
                    right: '14px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    color: '#94a3b8',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '4px'
                  }}
                >
                  {showPassword ? <Eye size={18} /> : <EyeOff size={18} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              style={{
                marginTop: '10px',
                height: '52px',
                background: '#ffffff',
                color: '#000000',
                border: 'none',
                borderRadius: '18px',
                fontWeight: 700,
                fontSize: '1rem',
                letterSpacing: '-0.01em',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '10px',
                cursor: loading ? 'not-allowed' : 'pointer',
                boxShadow: '0 4px 18px rgba(255, 255, 255, 0.12)',
                transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)'
              }}
              onMouseEnter={(e) => {
                if (!loading) {
                  e.currentTarget.style.background = '#f1f5f9';
                  e.currentTarget.style.transform = 'translateY(-1px)';
                }
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = '#ffffff';
                e.currentTarget.style.transform = 'translateY(0)';
              }}
            >
              {loading ? <Loader2 size={18} className="animate-spin" /> : <CheckCircle2 size={18} />}
              <span>{loading ? 'Updating Password...' : 'Save New Password'}</span>
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
