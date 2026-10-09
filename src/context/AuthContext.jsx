import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { Amplify } from 'aws-amplify';
import {
  signIn as amplifySignIn,
  signUp as amplifySignUp,
  confirmSignUp as amplifyConfirmSignUp,
  signOut as amplifySignOut,
  resetPassword as amplifyResetPassword,
  confirmResetPassword as amplifyConfirmResetPassword,
  getCurrentUser,
  fetchAuthSession
} from 'aws-amplify/auth';

const AuthContext = createContext(null);

const userPoolId = typeof import.meta !== 'undefined' ? import.meta.env?.VITE_COGNITO_USER_POOL_ID : undefined;
const userPoolClientId = typeof import.meta !== 'undefined' ? import.meta.env?.VITE_COGNITO_WEB_CLIENT_ID : undefined;

const isConfigured = Boolean(userPoolId && userPoolClientId);

if (isConfigured) {
  try {
    Amplify.configure({
      Auth: {
        Cognito: {
          userPoolId,
          userPoolClientId
        }
      }
    });
  } catch (err) {
    console.warn('[Amplify] Configuration error:', err);
  }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authModalMode, setAuthModalMode] = useState('signIn'); // 'signIn' | 'signUp' | 'confirm' | 'forgot'
  const [unconfirmedEmail, setUnconfirmedEmail] = useState('');

  const checkAuthState = useCallback(async () => {
    if (!isConfigured) {
      setUser(null);
      setIsLoading(false);
      return;
    }

    try {
      const currentUser = await getCurrentUser();
      const session = await fetchAuthSession();
      const accessToken = session.tokens?.accessToken;
      const idToken = session.tokens?.idToken;

      const payload = accessToken?.payload || {};
      const idPayload = idToken?.payload || {};

      const groups = Array.isArray(payload['cognito:groups']) ? payload['cognito:groups'] : [];

      setUser({
        sub: currentUser.userId,
        username: currentUser.username,
        email: idPayload.email || payload.username || currentUser.username,
        groups,
        // School ID is read from the ID token for display purposes only
        schoolId: idPayload['custom:school_id'] || null,
        isSchoolAdmin: groups.includes('school_admin'),
        isCitizen: groups.includes('citizen')
      });
    } catch (err) {
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    checkAuthState();
  }, [checkAuthState]);

  // Open login modal when apiFetch detects an unauthenticated 401 response
  useEffect(() => {
    const handleUnauthorized = () => {
      setAuthModalMode('signIn');
      setIsAuthModalOpen(true);
    };
    if (typeof window !== 'undefined') {
      window.addEventListener('auth:unauthorized', handleUnauthorized);
      return () => window.removeEventListener('auth:unauthorized', handleUnauthorized);
    }
  }, []);

  const openAuthModal = (mode = 'signIn') => {
    setAuthModalMode(mode);
    setIsAuthModalOpen(true);
  };

  const closeAuthModal = () => {
    setIsAuthModalOpen(false);
  };

  const login = async ({ email, password }) => {
    if (!isConfigured) {
      throw new Error('Authentication is not configured. Missing VITE_COGNITO_USER_POOL_ID or VITE_COGNITO_WEB_CLIENT_ID.');
    }
    const cleanEmail = email.trim();
    try {
      const res = await amplifySignIn({
        username: cleanEmail,
        password
      });

      if (res.isSignedIn) {
        await checkAuthState();
        setIsAuthModalOpen(false);
      } else if (res.nextStep?.signInStep === 'CONFIRM_SIGN_UP') {
        // Account unconfirmed: guide user immediately to the confirmation code screen
        setUnconfirmedEmail(cleanEmail);
        setAuthModalMode('confirm');
        setIsAuthModalOpen(true);
      }
      return res;
    } catch (err) {
      if (err.name === 'UserNotConfirmedException') {
        setUnconfirmedEmail(cleanEmail);
        setAuthModalMode('confirm');
        setIsAuthModalOpen(true);
      }
      throw err;
    }
  };

  const register = async ({ email, password }) => {
    if (!isConfigured) {
      throw new Error('Authentication is not configured. Missing VITE_COGNITO_USER_POOL_ID or VITE_COGNITO_WEB_CLIENT_ID.');
    }
    const cleanEmail = email.trim();
    const res = await amplifySignUp({
      username: cleanEmail,
      password,
      options: {
        userAttributes: {
          email: cleanEmail
        }
      }
    });

    setUnconfirmedEmail(cleanEmail);
    if (!res.isSignUpComplete) {
      setAuthModalMode('confirm');
    }
    return res;
  };

  const confirmRegistration = async ({ email, code }) => {
    if (!isConfigured) {
      throw new Error('Authentication is not configured.');
    }
    const targetEmail = email ? email.trim() : unconfirmedEmail;
    const res = await amplifyConfirmSignUp({
      username: targetEmail,
      confirmationCode: code.trim()
    });
    return res;
  };

  const logout = async () => {
    if (!isConfigured) return;
    try {
      await amplifySignOut();
    } catch (e) {
      // Clear state even if network call fails
    }
    setUser(null);
  };

  const requestPasswordReset = async ({ email }) => {
    if (!isConfigured) {
      throw new Error('Authentication is not configured.');
    }
    return amplifyResetPassword({
      username: email.trim()
    });
  };

  const confirmNewPassword = async ({ email, code, newPassword }) => {
    if (!isConfigured) {
      throw new Error('Authentication is not configured.');
    }
    return amplifyConfirmResetPassword({
      username: email.trim(),
      confirmationCode: code.trim(),
      newPassword
    });
  };

  const value = {
    user,
    isAuthenticated: Boolean(user),
    isLoading,
    isConfigured,
    isAuthModalOpen,
    authModalMode,
    unconfirmedEmail,
    setAuthModalMode,
    openAuthModal,
    closeAuthModal,
    login,
    register,
    confirmRegistration,
    logout,
    requestPasswordReset,
    confirmNewPassword,
    refreshUser: checkAuthState
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    return {
      user: null,
      isAuthenticated: false,
      isLoading: false,
      isConfigured: false,
      isAuthModalOpen: false,
      authModalMode: 'signIn',
      unconfirmedEmail: '',
      setAuthModalMode: () => {},
      openAuthModal: () => {},
      closeAuthModal: () => {},
      login: async () => {},
      register: async () => {},
      confirmRegistration: async () => {},
      logout: async () => {},
      requestPasswordReset: async () => {},
      confirmNewPassword: async () => {},
      refreshUser: async () => {}
    };
  }
  return context;
}
