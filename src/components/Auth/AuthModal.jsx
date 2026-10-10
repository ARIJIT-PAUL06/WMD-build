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
  EyeOff,
  Sparkles
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

  const inputStyle = {
    width: '100%',
    padding: '11px 14px 11px 40px',
    background: 'rgba(3, 7, 18, 0.72)',
    border: '1px solid rgba(255, 255, 255, 0.12)',
    borderRadius: '10px',
    color: '#ffffff',
    fontFamily: "'Outfit', sans-serif",
    fontSize: '0.88rem',
    outline: 'none',
    boxSizing: 'border-box',
    transition: 'border-color 0.2s, box-shadow 0.2s',
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        background: 'rgba(4, 7, 15, 0.88)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        zIndex: 99999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
        boxSizing: 'border-box'
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) closeAuthModal();
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '460px',
          background: 'linear-gradient(180deg, rgba(13, 20, 38, 0.98) 0%, rgba(7, 11, 24, 0.99) 100%)',
          border: '1px solid rgba(56, 189, 248, 0.25)',
          boxShadow: '0 25px 60px -10px rgba(0, 0, 0, 0.85), 0 0 35px rgba(14, 165, 233, 0.15), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
          borderRadius: '20px',
          padding: '28px 30px',
          color: '#ffffff',
          position: 'relative',
          overflow: 'hidden'
        }}
      >
        {/* Ambient Top Glow */}
        <div
          style={{
            position: 'absolute',
            top: '-60px',
            right: '-60px',
            width: '180px',
            height: '180px',
            background: 'radial-gradient(circle, rgba(56, 189, 248, 0.25) 0%, transparent 70%)',
            pointerEvents: 'none',
          }}
        />

        {/* Close Button */}
        <button
          onClick={closeAuthModal}
          style={{
            position: 'absolute',
            top: '18px',
            right: '18px',
            background: 'rgba(255, 255, 255, 0.06)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: '50%',
            width: '32px',
            height: '32px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#94a3b8',
            cursor: 'pointer',
            transition: 'all 0.18s ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.color = '#ffffff';
            e.currentTarget.style.background = 'rgba(239, 68, 68, 0.2)';
            e.currentTarget.style.borderColor = 'rgba(239, 68, 68, 0.4)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.color = '#94a3b8';
            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.06)';
            e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.1)';
          }}
        >
          <X size={16} />
        </button>

        {/* Header Block */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
          <div
            style={{
              width: '42px',
              height: '42px',
              borderRadius: '10px',
              background: authModalMode === 'signUp'
                ? 'linear-gradient(135deg, rgba(5, 150, 105, 0.9) 0%, rgba(16, 185, 129, 1) 100%)'
                : 'linear-gradient(135deg, rgba(2, 132, 199, 0.9) 0%, rgba(14, 165, 233, 1) 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: authModalMode === 'signUp'
                ? '0 0 16px rgba(16, 185, 129, 0.4)'
                : '0 0 16px rgba(14, 165, 233, 0.4)',
              border: '1px solid rgba(255, 255, 255, 0.2)',
            }}
          >
            <Shield size={20} color="#ffffff" />
          </div>
          <div>
            <div
              style={{
                fontFamily: '"Share Tech Mono", "JetBrains Mono", monospace',
                fontSize: '0.66rem',
                letterSpacing: '0.12em',
                color: '#38bdf8',
                marginBottom: '2px',
                textTransform: 'uppercase',
              }}
            >
              AUTHENTICATION // CITIZEN GATE
            </div>
            <h2
              style={{
                margin: 0,
                fontSize: '1.22rem',
                fontWeight: 800,
                fontFamily: "'Outfit', sans-serif",
                letterSpacing: '-0.01em',
                color: '#ffffff',
              }}
            >
              {authModalMode === 'signIn' && 'Citizen Sign In'}
              {authModalMode === 'signUp' && 'Create Citizen Account'}
              {authModalMode === 'confirm' && 'Verify Email Address'}
              {authModalMode === 'forgot' && 'Reset Password'}
              {authModalMode === 'confirmReset' && 'Set New Password'}
            </h2>
            <p style={{ margin: '2px 0 0 0', fontSize: '0.76rem', color: '#94a3b8' }}>
              Amazon Cognito Secure Identity Gate
            </p>
          </div>
        </div>

        {/* Segmented Mode Selector Tabs (Sign In vs Sign Up) */}
        {(authModalMode === 'signIn' || authModalMode === 'signUp') && (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '6px',
              background: 'rgba(3, 7, 18, 0.6)',
              padding: '4px',
              borderRadius: '9px',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              marginBottom: '18px',
            }}
          >
            <button
              type="button"
              onClick={() => { setAuthModalMode('signIn'); setError(null); }}
              style={{
                padding: '8px 12px',
                borderRadius: '7px',
                border: authModalMode === 'signIn' ? '1px solid rgba(56, 189, 248, 0.4)' : '1px solid transparent',
                background: authModalMode === 'signIn' ? 'rgba(56, 189, 248, 0.16)' : 'transparent',
                color: authModalMode === 'signIn' ? '#38bdf8' : '#94a3b8',
                fontFamily: "'Outfit', sans-serif",
                fontWeight: authModalMode === 'signIn' ? 700 : 500,
                fontSize: '0.8rem',
                letterSpacing: '0.04em',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              SIGN IN
            </button>
            <button
              type="button"
              onClick={() => { setAuthModalMode('signUp'); setError(null); }}
              style={{
                padding: '8px 12px',
                borderRadius: '7px',
                border: authModalMode === 'signUp' ? '1px solid rgba(52, 211, 153, 0.4)' : '1px solid transparent',
                background: authModalMode === 'signUp' ? 'rgba(16, 185, 129, 0.16)' : 'transparent',
                color: authModalMode === 'signUp' ? '#34d399' : '#94a3b8',
                fontFamily: "'Outfit', sans-serif",
                fontWeight: authModalMode === 'signUp' ? 700 : 500,
                fontSize: '0.8rem',
                letterSpacing: '0.04em',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              REGISTER
            </button>
          </div>
        )}

        {/* Unconfigured Notice */}
        {!isConfigured && (
          <div
            style={{
              background: 'rgba(245, 158, 11, 0.1)',
              border: '1px solid rgba(245, 158, 11, 0.35)',
              borderRadius: '10px',
              padding: '10px 14px',
              marginBottom: '16px',
              display: 'flex',
              gap: '10px',
              alignItems: 'flex-start',
            }}
          >
            <AlertCircle size={16} color="#f59e0b" style={{ flexShrink: 0, marginTop: '2px' }} />
            <div style={{ fontSize: '0.76rem', color: '#fbbf24', lineHeight: 1.4 }}>
              <strong>Cognito Pending Live Deployment</strong>
              <br />
              User Pool credentials are not configured in environment variables.
            </div>
          </div>
        )}

        {/* Success Alert */}
        {successMessage && (
          <div
            style={{
              background: 'rgba(16, 185, 129, 0.12)',
              border: '1px solid rgba(16, 185, 129, 0.4)',
              borderRadius: '10px',
              padding: '10px 14px',
              marginBottom: '16px',
              display: 'flex',
              gap: '10px',
              alignItems: 'center',
              color: '#34d399',
              fontSize: '0.78rem',
            }}
          >
            <CheckCircle2 size={16} style={{ flexShrink: 0 }} />
            <span>{successMessage}</span>
          </div>
        )}

        {/* Error Alert */}
        {error && (
          <div
            style={{
              background: 'rgba(239, 68, 68, 0.12)',
              border: '1px solid rgba(239, 68, 68, 0.4)',
              borderRadius: '10px',
              padding: '10px 14px',
              marginBottom: '16px',
              display: 'flex',
              gap: '10px',
              alignItems: 'center',
              color: '#f87171',
              fontSize: '0.78rem',
            }}
          >
            <AlertCircle size={16} style={{ flexShrink: 0 }} />
            <span>{error}</span>
          </div>
        )}

        {/* SIGN IN FORM */}
        {authModalMode === 'signIn' && (
          <form onSubmit={handleSignIn} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: '#94a3b8', marginBottom: '6px' }}>
                Email Address
              </label>
              <div style={{ position: 'relative' }}>
                <Mail size={15} color="#64748b" style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)' }} />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="citizen@delhi.gov.in"
                  style={inputStyle}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = '#38bdf8';
                    e.currentTarget.style.boxShadow = '0 0 12px rgba(56, 189, 248, 0.25)';
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.12)';
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                />
              </div>
            </div>

            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                <label style={{ fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: '#94a3b8' }}>
                  Password
                </label>
                <button
                  type="button"
                  onClick={() => setAuthModalMode('forgot')}
                  style={{ background: 'none', border: 'none', color: '#38bdf8', fontSize: '0.72rem', fontWeight: 600, cursor: 'pointer', padding: 0 }}
                >
                  Forgot Password?
                </button>
              </div>
              <div style={{ position: 'relative' }}>
                <Lock size={15} color="#64748b" style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)' }} />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  style={{ ...inputStyle, paddingRight: '40px' }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = '#38bdf8';
                    e.currentTarget.style.boxShadow = '0 0 12px rgba(56, 189, 248, 0.25)';
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.12)';
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    position: 'absolute',
                    right: '12px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    color: '#64748b',
                    cursor: 'pointer',
                    padding: 0,
                    display: 'flex',
                    alignItems: 'center',
                  }}
                >
                  {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || !isConfigured}
              style={{
                marginTop: '6px',
                padding: '13px',
                background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
                color: '#ffffff',
                border: '1px solid rgba(56, 189, 248, 0.4)',
                borderRadius: '10px',
                fontFamily: "'Outfit', sans-serif",
                fontWeight: 700,
                fontSize: '0.86rem',
                letterSpacing: '0.04em',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                cursor: loading || !isConfigured ? 'not-allowed' : 'pointer',
                opacity: loading || !isConfigured ? 0.6 : 1,
                boxShadow: '0 4px 16px rgba(2, 132, 199, 0.4)',
                transition: 'all 0.18s ease',
              }}
            >
              {loading ? <Loader2 size={16} className="animate-spin" /> : <ArrowRight size={16} />}
              <span>{loading ? 'AUTHENTICATING...' : 'SIGN IN'}</span>
            </button>
          </form>
        )}

        {/* SIGN UP FORM */}
        {authModalMode === 'signUp' && (
          <form onSubmit={handleSignUp} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: '#94a3b8', marginBottom: '6px' }}>
                Official / Citizen Email
              </label>
              <div style={{ position: 'relative' }}>
                <Mail size={15} color="#64748b" style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)' }} />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="citizen@delhi.gov.in"
                  style={inputStyle}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = '#34d399';
                    e.currentTarget.style.boxShadow = '0 0 12px rgba(52, 211, 153, 0.25)';
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.12)';
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                />
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: '#94a3b8', marginBottom: '6px' }}>
                Password (min 8 chars, uppercase, lowercase, number)
              </label>
              <div style={{ position: 'relative' }}>
                <Lock size={15} color="#64748b" style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)' }} />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  style={{ ...inputStyle, paddingRight: '40px' }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = '#34d399';
                    e.currentTarget.style.boxShadow = '0 0 12px rgba(52, 211, 153, 0.25)';
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.12)';
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    position: 'absolute',
                    right: '12px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    color: '#64748b',
                    cursor: 'pointer',
                    padding: 0,
                    display: 'flex',
                    alignItems: 'center',
                  }}
                >
                  {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: '#94a3b8', marginBottom: '6px' }}>
                Confirm Password
              </label>
              <div style={{ position: 'relative' }}>
                <Lock size={15} color="#64748b" style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)' }} />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••••••"
                  style={inputStyle}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = '#34d399';
                    e.currentTarget.style.boxShadow = '0 0 12px rgba(52, 211, 153, 0.25)';
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.12)';
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || !isConfigured}
              style={{
                marginTop: '6px',
                padding: '13px',
                background: 'linear-gradient(135deg, #059669 0%, #10b981 100%)',
                color: '#ffffff',
                border: '1px solid rgba(52, 211, 153, 0.5)',
                borderRadius: '10px',
                fontFamily: "'Outfit', sans-serif",
                fontWeight: 800,
                fontSize: '0.86rem',
                letterSpacing: '0.04em',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                cursor: loading || !isConfigured ? 'not-allowed' : 'pointer',
                opacity: loading || !isConfigured ? 0.6 : 1,
                boxShadow: '0 4px 16px rgba(16, 185, 129, 0.4)',
                transition: 'all 0.18s ease',
              }}
            >
              {loading ? <Loader2 size={16} className="animate-spin" /> : <ArrowRight size={16} />}
              <span>{loading ? 'CREATING CITIZEN ACCOUNT...' : 'REGISTER ACCOUNT'}</span>
            </button>
          </form>
        )}

        {/* CONFIRM CODE FORM */}
        {authModalMode === 'confirm' && (
          <form onSubmit={handleConfirmCode} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <p style={{ margin: 0, fontSize: '0.82rem', color: '#cbd5e1', lineHeight: 1.5 }}>
              Security verification dispatched to <strong>{email}</strong>. Enter the 6-digit confirmation code below:
            </p>

            <div>
              <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: '#94a3b8', marginBottom: '6px' }}>
                6-Digit Security Code
              </label>
              <div style={{ position: 'relative' }}>
                <Key size={15} color="#64748b" style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)' }} />
                <input
                  type="text"
                  required
                  maxLength={6}
                  value={verificationCode}
                  onChange={(e) => setVerificationCode(e.target.value)}
                  placeholder="123456"
                  style={{
                    ...inputStyle,
                    fontSize: '1.2rem',
                    letterSpacing: '0.35em',
                    fontFamily: '"Share Tech Mono", monospace',
                    textAlign: 'center',
                    paddingLeft: '14px',
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = '#38bdf8';
                    e.currentTarget.style.boxShadow = '0 0 16px rgba(56, 189, 248, 0.3)';
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.12)';
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              style={{
                marginTop: '6px',
                padding: '13px',
                background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
                color: '#ffffff',
                border: '1px solid rgba(56, 189, 248, 0.4)',
                borderRadius: '10px',
                fontFamily: "'Outfit', sans-serif",
                fontWeight: 700,
                fontSize: '0.86rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                cursor: loading ? 'not-allowed' : 'pointer',
                boxShadow: '0 4px 16px rgba(2, 132, 199, 0.4)',
              }}
            >
              {loading ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
              <span>{loading ? 'VERIFYING CODE...' : 'CONFIRM REGISTRATION'}</span>
            </button>

            <button
              type="button"
              onClick={() => setAuthModalMode('signIn')}
              style={{ background: 'none', border: 'none', color: '#94a3b8', fontSize: '0.78rem', cursor: 'pointer', textAlign: 'center' }}
            >
              Back to Sign In
            </button>
          </form>
        )}

        {/* FORGOT PASSWORD FORM */}
        {authModalMode === 'forgot' && (
          <form onSubmit={handleRequestReset} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <p style={{ margin: 0, fontSize: '0.82rem', color: '#cbd5e1', lineHeight: 1.5 }}>
              Enter the verified email address linked to your account to dispatch a one-time password reset code:
            </p>

            <div>
              <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: '#94a3b8', marginBottom: '6px' }}>
                Email Address
              </label>
              <div style={{ position: 'relative' }}>
                <Mail size={15} color="#64748b" style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)' }} />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="citizen@delhi.gov.in"
                  style={inputStyle}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = '#38bdf8';
                    e.currentTarget.style.boxShadow = '0 0 12px rgba(56, 189, 248, 0.25)';
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.12)';
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              style={{
                marginTop: '6px',
                padding: '13px',
                background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
                color: '#ffffff',
                border: '1px solid rgba(56, 189, 248, 0.4)',
                borderRadius: '10px',
                fontFamily: "'Outfit', sans-serif",
                fontWeight: 700,
                fontSize: '0.86rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                cursor: loading ? 'not-allowed' : 'pointer',
                boxShadow: '0 4px 16px rgba(2, 132, 199, 0.4)',
              }}
            >
              {loading ? <Loader2 size={16} className="animate-spin" /> : <ArrowRight size={16} />}
              <span>{loading ? 'DISPATCHING RESET CODE...' : 'SEND RESET CODE'}</span>
            </button>

            <button
              type="button"
              onClick={() => setAuthModalMode('signIn')}
              style={{ background: 'none', border: 'none', color: '#94a3b8', fontSize: '0.78rem', cursor: 'pointer', textAlign: 'center' }}
            >
              Back to Sign In
            </button>
          </form>
        )}

        {/* CONFIRM RESET PASSWORD FORM */}
        {authModalMode === 'confirmReset' && (
          <form onSubmit={handleConfirmReset} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: '#94a3b8', marginBottom: '6px' }}>
                Reset Code
              </label>
              <div style={{ position: 'relative' }}>
                <Key size={15} color="#64748b" style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)' }} />
                <input
                  type="text"
                  required
                  value={verificationCode}
                  onChange={(e) => setVerificationCode(e.target.value)}
                  placeholder="Enter 6-digit code"
                  style={{ ...inputStyle, fontFamily: '"Share Tech Mono", monospace', letterSpacing: '0.15em' }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = '#38bdf8';
                    e.currentTarget.style.boxShadow = '0 0 12px rgba(56, 189, 248, 0.25)';
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.12)';
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                />
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: '#94a3b8', marginBottom: '6px' }}>
                New Password
              </label>
              <div style={{ position: 'relative' }}>
                <Lock size={15} color="#64748b" style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)' }} />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="••••••••••••"
                  style={{ ...inputStyle, paddingRight: '40px' }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = '#38bdf8';
                    e.currentTarget.style.boxShadow = '0 0 12px rgba(56, 189, 248, 0.25)';
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.12)';
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    position: 'absolute',
                    right: '12px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    color: '#64748b',
                    cursor: 'pointer',
                    padding: 0,
                    display: 'flex',
                    alignItems: 'center',
                  }}
                >
                  {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              style={{
                marginTop: '6px',
                padding: '13px',
                background: 'linear-gradient(135deg, #059669 0%, #10b981 100%)',
                color: '#ffffff',
                border: '1px solid rgba(52, 211, 153, 0.5)',
                borderRadius: '10px',
                fontFamily: "'Outfit', sans-serif",
                fontWeight: 700,
                fontSize: '0.86rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                cursor: loading ? 'not-allowed' : 'pointer',
                boxShadow: '0 4px 16px rgba(16, 185, 129, 0.4)',
              }}
            >
              {loading ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
              <span>{loading ? 'UPDATING CREDENTIALS...' : 'SAVE NEW PASSWORD'}</span>
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
