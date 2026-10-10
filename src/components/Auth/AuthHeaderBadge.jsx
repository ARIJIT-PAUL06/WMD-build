import React, { useState } from 'react';
import { Shield, User, LogOut, LogIn, School, Radio } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export default function AuthHeaderBadge() {
  const { user, isAuthenticated, isLoading, openAuthModal, logout } = useAuth();
  const [hoverSignIn, setHoverSignIn] = useState(false);
  const [hoverSignUp, setHoverSignUp] = useState(false);
  const [hoverLogout, setHoverLogout] = useState(false);

  if (isLoading) {
    return (
      <div
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '8px',
          padding: '6px 14px',
          borderRadius: '8px',
          background: 'rgba(6, 11, 22, 0.78)',
          border: '1px solid rgba(56, 189, 248, 0.2)',
          backdropFilter: 'blur(14px)',
          fontFamily: '"Share Tech Mono", "JetBrains Mono", monospace',
          fontSize: '0.72rem',
          letterSpacing: '0.08em',
          color: '#38bdf8',
          boxShadow: '0 4px 16px rgba(0, 0, 0, 0.5)',
        }}
      >
        <span
          style={{
            width: '6px',
            height: '6px',
            borderRadius: '50%',
            background: '#38bdf8',
            boxShadow: '0 0 8px #38bdf8',
            animation: 'pulse 1.4s infinite ease-in-out',
          }}
        />
        <span>CONNECTING GATE...</span>
      </div>
    );
  }

  if (isAuthenticated && user) {
    return (
      <div
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '10px',
          background: 'rgba(6, 11, 22, 0.82)',
          border: '1px solid rgba(56, 189, 248, 0.28)',
          borderRadius: '8px',
          padding: '5px 8px 5px 12px',
          backdropFilter: 'blur(14px)',
          WebkitBackdropFilter: 'blur(14px)',
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.6), inset 0 0 12px rgba(56, 189, 248, 0.06)',
          transition: 'border-color 0.2s ease, box-shadow 0.2s ease',
        }}
      >
        {/* Active connection pulse */}
        <span
          style={{
            width: '6px',
            height: '6px',
            borderRadius: '50%',
            background: '#10b981',
            boxShadow: '0 0 8px #10b981',
            flexShrink: 0,
          }}
          title="Active Session"
        />

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {user.isSchoolAdmin ? (
            <School size={14} color="#38bdf8" />
          ) : (
            <User size={14} color="#34d399" />
          )}
          <span
            style={{
              fontFamily: "'Outfit', sans-serif",
              fontSize: '0.78rem',
              fontWeight: 700,
              letterSpacing: '0.04em',
              color: '#f1f5f9',
            }}
          >
            {user.email ? user.email.split('@')[0].toUpperCase() : 'CITIZEN'}
          </span>
          <span
            style={{
              fontFamily: '"Share Tech Mono", "JetBrains Mono", monospace',
              fontSize: '0.64rem',
              fontWeight: 700,
              letterSpacing: '0.08em',
              padding: '2px 6px',
              borderRadius: '4px',
              background: user.isSchoolAdmin ? 'rgba(56, 189, 248, 0.16)' : 'rgba(16, 185, 129, 0.16)',
              border: user.isSchoolAdmin ? '1px solid rgba(56, 189, 248, 0.4)' : '1px solid rgba(16, 185, 129, 0.4)',
              color: user.isSchoolAdmin ? '#38bdf8' : '#34d399',
              textTransform: 'uppercase',
            }}
          >
            {user.isSchoolAdmin ? 'ADMIN' : 'CITIZEN'}
          </span>
        </div>

        <button
          onClick={logout}
          title="Sign Out"
          onMouseEnter={() => setHoverLogout(true)}
          onMouseLeave={() => setHoverLogout(false)}
          style={{
            background: hoverLogout ? 'rgba(239, 68, 68, 0.2)' : 'rgba(255, 255, 255, 0.06)',
            border: hoverLogout ? '1px solid rgba(239, 68, 68, 0.5)' : '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: '6px',
            width: '26px',
            height: '26px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: hoverLogout ? '#f87171' : '#94a3b8',
            cursor: 'pointer',
            transition: 'all 0.18s ease',
            boxShadow: hoverLogout ? '0 0 10px rgba(239, 68, 68, 0.35)' : 'none',
          }}
        >
          <LogOut size={12} />
        </button>
      </div>
    );
  }

  return (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '8px',
        padding: '4px 6px',
        borderRadius: '10px',
        background: 'rgba(6, 11, 22, 0.74)',
        border: '1px solid rgba(255, 255, 255, 0.14)',
        backdropFilter: 'blur(14px)',
        WebkitBackdropFilter: 'blur(14px)',
        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.6), inset 0 0 10px rgba(56, 189, 248, 0.05)',
      }}
    >
      {/* Monospace Terminal Status Indicator */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          padding: '0 6px 0 6px',
        }}
      >
        <span
          style={{
            width: '6px',
            height: '6px',
            borderRadius: '50%',
            background: '#10b981',
            boxShadow: '0 0 8px rgba(16, 185, 129, 0.8)',
          }}
        />
        <span
          style={{
            fontFamily: '"Share Tech Mono", "JetBrains Mono", monospace',
            fontSize: '0.66rem',
            letterSpacing: '0.12em',
            color: '#94a3b8',
            textTransform: 'uppercase',
          }}
        >
          SYS // AUTH
        </span>
      </div>

      {/* Sign In Button */}
      <button
        onClick={() => openAuthModal('signIn')}
        onMouseEnter={() => setHoverSignIn(true)}
        onMouseLeave={() => setHoverSignIn(false)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          padding: '6px 13px',
          borderRadius: '7px',
          background: hoverSignIn ? 'rgba(15, 23, 42, 0.95)' : 'rgba(15, 23, 42, 0.72)',
          border: hoverSignIn ? '1px solid rgba(56, 189, 248, 0.75)' : '1px solid rgba(56, 189, 248, 0.28)',
          color: hoverSignIn ? '#ffffff' : '#cbd5e1',
          fontFamily: "'Outfit', sans-serif",
          fontSize: '0.78rem',
          fontWeight: 700,
          letterSpacing: '0.04em',
          cursor: 'pointer',
          transition: 'all 0.18s ease',
          boxShadow: hoverSignIn
            ? '0 0 16px rgba(56, 189, 248, 0.35), inset 0 0 8px rgba(56, 189, 248, 0.15)'
            : '0 2px 8px rgba(0, 0, 0, 0.3)',
          transform: hoverSignIn ? 'translateY(-1px)' : 'translateY(0)',
        }}
      >
        <LogIn size={12} color={hoverSignIn ? '#38bdf8' : '#94a3b8'} />
        <span>SIGN IN</span>
      </button>

      {/* Sign Up Button */}
      <button
        onClick={() => openAuthModal('signUp')}
        onMouseEnter={() => setHoverSignUp(true)}
        onMouseLeave={() => setHoverSignUp(false)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          padding: '6px 15px',
          borderRadius: '7px',
          background: hoverSignUp
            ? 'linear-gradient(135deg, rgba(16, 185, 129, 0.95) 0%, rgba(5, 150, 105, 1) 100%)'
            : 'linear-gradient(135deg, rgba(5, 150, 105, 0.9) 0%, rgba(16, 185, 129, 0.95) 100%)',
          border: hoverSignUp
            ? '1px solid rgba(52, 211, 153, 0.9)'
            : '1px solid rgba(52, 211, 153, 0.55)',
          color: '#ffffff',
          fontFamily: "'Outfit', sans-serif",
          fontSize: '0.78rem',
          fontWeight: 800,
          letterSpacing: '0.04em',
          cursor: 'pointer',
          transition: 'all 0.18s ease',
          boxShadow: hoverSignUp
            ? '0 0 22px rgba(16, 185, 129, 0.55), 0 4px 14px rgba(0, 0, 0, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.4)'
            : '0 0 14px rgba(16, 185, 129, 0.3), 0 2px 8px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.25)',
          transform: hoverSignUp ? 'translateY(-1px)' : 'translateY(0)',
        }}
      >
        <Shield size={12} color="#ffffff" />
        <span>SIGN UP</span>
      </button>
    </div>
  );
}
