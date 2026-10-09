import React from 'react';
import { Shield, User, LogOut, LogIn, School } from 'lucide-react';
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
          borderRadius: '9999px',
          padding: '4px 6px 4px 12px',
          backdropFilter: 'blur(8px)',
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)'
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
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
      <button
        onClick={() => openAuthModal('signIn')}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          padding: '6px 14px',
          borderRadius: '9999px',
          background: 'rgba(15, 23, 42, 0.75)',
          border: '1px solid rgba(255, 255, 255, 0.15)',
          color: '#e2e8f0',
          fontSize: '0.78rem',
          fontWeight: 600,
          cursor: 'pointer',
          backdropFilter: 'blur(8px)',
          transition: 'all 0.2s'
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.borderColor = '#38bdf8';
          e.currentTarget.style.color = '#38bdf8';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.15)';
          e.currentTarget.style.color = '#e2e8f0';
        }}
      >
        <LogIn size={13} />
        <span>Sign In</span>
      </button>

      <button
        onClick={() => openAuthModal('signUp')}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          padding: '6px 14px',
          borderRadius: '9999px',
          background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
          border: 'none',
          color: '#ffffff',
          fontSize: '0.78rem',
          fontWeight: 700,
          cursor: 'pointer',
          boxShadow: '0 2px 10px rgba(2, 132, 199, 0.3)',
          transition: 'all 0.2s'
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = 'translateY(-1px)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'translateY(0)';
        }}
      >
        <Shield size={13} />
        <span>Sign Up</span>
      </button>
    </div>
  );
}
