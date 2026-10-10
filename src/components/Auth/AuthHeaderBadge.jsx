import React from 'react';
import { User, LogOut, LogIn, School } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export default function AuthHeaderBadge() {
  const { user, isAuthenticated, isLoading, openAuthModal, logout } = useAuth();

  if (isLoading) {
    return (
      <div
        style={{
          padding: '6px 12px',
          borderRadius: '9999px',
          background: 'rgba(255, 255, 255, 0.05)',
          fontSize: '0.75rem',
          color: '#94a3b8'
        }}
      >
        Authenticating...
      </div>
    );
  }

  if (isAuthenticated && user) {
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          background: 'rgba(15, 23, 42, 0.8)',
          border: '1px solid rgba(255, 255, 255, 0.12)',
          borderRadius: '12px',
          padding: '6px 8px 6px 14px',
          backdropFilter: 'blur(14px)',
          WebkitBackdropFilter: 'blur(14px)',
          boxShadow: '0 4px 18px rgba(0, 0, 0, 0.28)'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          {user.isSchoolAdmin ? (
            <School size={14} color="#38bdf8" />
          ) : (
            <User size={14} color="#34d399" />
          )}
          <span style={{ fontSize: '0.78rem', fontWeight: 600, color: '#f1f5f9' }}>
            {user.email ? user.email.split('@')[0] : 'Citizen'}
          </span>
          <span
            style={{
              fontSize: '0.65rem',
              fontWeight: 700,
              padding: '2px 6px',
              borderRadius: '9999px',
              background: user.isSchoolAdmin ? 'rgba(56, 189, 248, 0.2)' : 'rgba(16, 185, 129, 0.2)',
              color: user.isSchoolAdmin ? '#38bdf8' : '#34d399',
              textTransform: 'uppercase'
            }}
          >
            {user.isSchoolAdmin ? 'Admin' : 'Citizen'}
          </span>
        </div>

        <button
          onClick={logout}
          title="Sign Out"
          style={{
            background: 'rgba(255, 255, 255, 0.08)',
            border: 'none',
            borderRadius: '50%',
            width: '28px',
            height: '28px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#94a3b8',
            cursor: 'pointer',
            transition: 'all 0.2s'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.color = '#f87171';
            e.currentTarget.style.background = 'rgba(239, 68, 68, 0.15)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.color = '#94a3b8';
            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)';
          }}
        >
          <LogOut size={13} />
        </button>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
      <button
        type="button"
        onClick={() => openAuthModal('signIn')}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: '9px 16px',
          borderRadius: '12px',
          background: 'rgba(255, 255, 255, 0.08)',
          border: '1px solid rgba(255, 255, 255, 0.16)',
          color: '#cbd5e1',
          fontFamily: "var(--font-heading, 'Outfit', -apple-system, BlinkMacSystemFont, sans-serif)",
          fontSize: '0.86rem',
          fontWeight: 500,
          letterSpacing: '-0.01em',
          cursor: 'pointer',
          backdropFilter: 'blur(14px)',
          WebkitBackdropFilter: 'blur(14px)',
          boxShadow: '0 4px 16px rgba(0, 0, 0, 0.25)',
          transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
          userSelect: 'none',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = 'rgba(255, 255, 255, 0.14)';
          e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.28)';
          e.currentTarget.style.color = '#ffffff';
          e.currentTarget.style.transform = 'translateY(-1px)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)';
          e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.16)';
          e.currentTarget.style.color = '#cbd5e1';
          e.currentTarget.style.transform = 'translateY(0)';
        }}
      >
        <LogIn size={15} style={{ opacity: 0.85 }} />
        <span>Sign In</span>
      </button>
    </div>
  );
}
