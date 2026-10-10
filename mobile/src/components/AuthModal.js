import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  TouchableWithoutFeedback
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  login,
  register,
  confirmRegistration,
  resendConfirmationCode,
  requestPasswordReset,
  confirmNewPassword,
  getAuthConfig
} from '../services/authService';

export default function AuthModal({
  visible,
  onClose,
  initialMode = 'signIn',
  onSuccess
}) {
  const [mode, setMode] = useState(initialMode); // 'signIn' | 'signUp' | 'confirm' | 'forgot' | 'confirmReset'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);

  const config = getAuthConfig();

  const resetForm = () => {
    setError(null);
    setSuccessMessage(null);
    setLoading(false);
  };

  const switchMode = (newMode) => {
    resetForm();
    setMode(newMode);
  };

  const handleSignIn = async () => {
    if (!email.trim() || !password) {
      setError('Please provide both email and password.');
      return;
    }
    setError(null);
    setLoading(true);

    try {
      const res = await login({ email, password });
      if (res.isSignedIn) {
        resetForm();
        onClose();
        if (onSuccess) onSuccess(res.user);
      }
    } catch (err) {
      if (err.name === 'UserNotConfirmedException') {
        switchMode('confirm');
        setSuccessMessage('Please verify your email with the verification code sent to your inbox.');
      } else {
        setError(err.message || 'Incorrect email or password. Please verify and try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSignUp = async () => {
    if (!email.trim() || !password) {
      setError('Please enter all required fields.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match. Please verify.');
      return;
    }
    if (password.length < 8) {
      setError('Password must contain at least 8 characters with upper, lower, and numbers.');
      return;
    }

    setError(null);
    setLoading(true);

    try {
      await register({ email, password });
      switchMode('confirm');
      setSuccessMessage('Account created! Please enter the 6-digit verification code sent to your email.');
    } catch (err) {
      setError(err.message || 'Registration failed. Please try a different email address.');
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmCode = async () => {
    if (!verificationCode.trim()) {
      setError('Please enter the 6-digit verification code.');
      return;
    }
    setError(null);
    setLoading(true);

    try {
      await confirmRegistration({ email, code: verificationCode });
      switchMode('signIn');
      setSuccessMessage('Email verified successfully! You may now sign in.');
    } catch (err) {
      setError(err.message || 'Invalid or expired confirmation code.');
    } finally {
      setLoading(false);
    }
  };

  const handleResendCode = async () => {
    if (!email.trim()) {
      setError('Please specify your email address.');
      return;
    }
    setLoading(true);
    try {
      await resendConfirmationCode({ email });
      setSuccessMessage('New verification code dispatched to your email.');
      setError(null);
    } catch (err) {
      setError(err.message || 'Failed to resend confirmation code.');
    } finally {
      setLoading(false);
    }
  };

  const handleRequestReset = async () => {
    if (!email.trim()) {
      setError('Please specify your registered email address.');
      return;
    }
    setError(null);
    setLoading(true);

    try {
      await requestPasswordReset({ email });
      switchMode('confirmReset');
      setSuccessMessage('Password reset code dispatched. Please check your inbox.');
    } catch (err) {
      setError(err.message || 'Unable to request password reset.');
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmReset = async () => {
    if (!verificationCode.trim() || !newPassword) {
      setError('Please provide the verification code and new password.');
      return;
    }
    setError(null);
    setLoading(true);

    try {
      await confirmNewPassword({ email, code: verificationCode, newPassword });
      switchMode('signIn');
      setSuccessMessage('Password updated successfully! You can now log in.');
    } catch (err) {
      setError(err.message || 'Failed to reset password. Please check your verification code.');
    } finally {
      setLoading(false);
    }
  };

  const getTitle = () => {
    switch (mode) {
      case 'signUp':
        return 'Create Citizen Account';
      case 'confirm':
        return 'Verify Email Address';
      case 'forgot':
        return 'Reset Password';
      case 'confirmReset':
        return 'Set New Password';
      default:
        return 'Citizen Sign In';
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.modalOverlay}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={styles.avoidingContainer}
          >
            <TouchableWithoutFeedback>
              <View style={styles.cardContainer}>
                {/* Close Button */}
                <TouchableOpacity
                  onPress={onClose}
                  style={styles.closeButton}
                  activeOpacity={0.7}
                  hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                >
                  <Ionicons name="close" size={20} color="#94a3b8" />
                </TouchableOpacity>

                {/* Header Badge */}
                <View style={styles.headerRow}>
                  <View style={styles.headerIconWrapper}>
                    <Ionicons name="shield-checkmark" size={22} color="#00f0ff" />
                  </View>
                  <View style={styles.headerTextCol}>
                    <Text style={styles.headerTitle}>{getTitle()}</Text>
                    <Text style={styles.headerSubtitle}>Amazon Cognito Secure Identity Gate</Text>
                  </View>
                </View>

                {/* Error Banner */}
                {error && (
                  <View style={styles.errorBanner}>
                    <Ionicons name="alert-circle" size={18} color="#f87171" style={{ marginTop: 2 }} />
                    <Text style={styles.errorText}>{error}</Text>
                  </View>
                )}

                {/* Success Banner */}
                {successMessage && (
                  <View style={styles.successBanner}>
                    <Ionicons name="checkmark-circle" size={18} color="#34d399" style={{ marginTop: 2 }} />
                    <Text style={styles.successText}>{successMessage}</Text>
                  </View>
                )}

                <ScrollView
                  showsVerticalScrollIndicator={false}
                  keyboardShouldPersistTaps="handled"
                >
                  {/* MODE: SIGN IN */}
                  {mode === 'signIn' && (
                    <View>
                      <Text style={styles.inputLabel}>Email Address</Text>
                      <View style={styles.inputWrapper}>
                        <Ionicons name="mail-outline" size={18} color="#64748b" style={styles.inputIcon} />
                        <TextInput
                          value={email}
                          onChangeText={setEmail}
                          placeholder="citizen@delhi.gov.in"
                          placeholderTextColor="#475569"
                          autoCapitalize="none"
                          keyboardType="email-address"
                          style={styles.textInput}
                        />
                      </View>

                      <View style={styles.passwordLabelRow}>
                        <Text style={styles.inputLabel}>Password</Text>
                        <TouchableOpacity onPress={() => switchMode('forgot')}>
                          <Text style={styles.forgotLink}>Forgot Password?</Text>
                        </TouchableOpacity>
                      </View>
                      <View style={styles.inputWrapper}>
                        <Ionicons name="lock-closed-outline" size={18} color="#64748b" style={styles.inputIcon} />
                        <TextInput
                          value={password}
                          onChangeText={setPassword}
                          placeholder="••••••••••••"
                          placeholderTextColor="#475569"
                          secureTextEntry={!showPassword}
                          autoCapitalize="none"
                          style={[styles.textInput, { paddingRight: 40 }]}
                        />
                        <TouchableOpacity
                          onPress={() => setShowPassword(!showPassword)}
                          style={styles.eyeButton}
                        >
                          <Ionicons
                            name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                            size={18}
                            color="#94a3b8"
                          />
                        </TouchableOpacity>
                      </View>

                      <TouchableOpacity
                        onPress={handleSignIn}
                        disabled={loading}
                        style={[styles.primaryButton, loading && styles.buttonDisabled]}
                        activeOpacity={0.8}
                      >
                        {loading ? (
                          <ActivityIndicator size="small" color="#030712" />
                        ) : (
                          <View style={styles.buttonContent}>
                            <Ionicons name="log-in-outline" size={18} color="#030712" style={{ marginRight: 6 }} />
                            <Text style={styles.primaryButtonText}>Sign In</Text>
                          </View>
                        )}
                      </TouchableOpacity>

                      <View style={styles.footerRow}>
                        <Text style={styles.footerText}>Don't have an account? </Text>
                        <TouchableOpacity onPress={() => switchMode('signUp')}>
                          <Text style={styles.footerLink}>Sign Up as Citizen</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  )}

                  {/* MODE: SIGN UP */}
                  {mode === 'signUp' && (
                    <View>
                      <Text style={styles.inputLabel}>Email Address</Text>
                      <View style={styles.inputWrapper}>
                        <Ionicons name="mail-outline" size={18} color="#64748b" style={styles.inputIcon} />
                        <TextInput
                          value={email}
                          onChangeText={setEmail}
                          placeholder="citizen@delhi.gov.in"
                          placeholderTextColor="#475569"
                          autoCapitalize="none"
                          keyboardType="email-address"
                          style={styles.textInput}
                        />
                      </View>

                      <Text style={styles.inputLabel}>Password</Text>
                      <View style={styles.inputWrapper}>
                        <Ionicons name="lock-closed-outline" size={18} color="#64748b" style={styles.inputIcon} />
                        <TextInput
                          value={password}
                          onChangeText={setPassword}
                          placeholder="At least 8 chars (upper, lower, num)"
                          placeholderTextColor="#475569"
                          secureTextEntry={!showPassword}
                          autoCapitalize="none"
                          style={[styles.textInput, { paddingRight: 40 }]}
                        />
                        <TouchableOpacity
                          onPress={() => setShowPassword(!showPassword)}
                          style={styles.eyeButton}
                        >
                          <Ionicons
                            name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                            size={18}
                            color="#94a3b8"
                          />
                        </TouchableOpacity>
                      </View>

                      <Text style={styles.inputLabel}>Confirm Password</Text>
                      <View style={styles.inputWrapper}>
                        <Ionicons name="lock-closed-outline" size={18} color="#64748b" style={styles.inputIcon} />
                        <TextInput
                          value={confirmPassword}
                          onChangeText={setConfirmPassword}
                          placeholder="Re-enter your password"
                          placeholderTextColor="#475569"
                          secureTextEntry={!showPassword}
                          autoCapitalize="none"
                          style={styles.textInput}
                        />
                      </View>

                      <TouchableOpacity
                        onPress={handleSignUp}
                        disabled={loading}
                        style={[styles.primaryButton, loading && styles.buttonDisabled]}
                        activeOpacity={0.8}
                      >
                        {loading ? (
                          <ActivityIndicator size="small" color="#030712" />
                        ) : (
                          <View style={styles.buttonContent}>
                            <Ionicons name="person-add-outline" size={18} color="#030712" style={{ marginRight: 6 }} />
                            <Text style={styles.primaryButtonText}>Sign Up as Citizen</Text>
                          </View>
                        )}
                      </TouchableOpacity>

                      <View style={styles.footerRow}>
                        <Text style={styles.footerText}>Already have an account? </Text>
                        <TouchableOpacity onPress={() => switchMode('signIn')}>
                          <Text style={styles.footerLink}>Sign In</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  )}

                  {/* MODE: CONFIRM REGISTRATION */}
                  {mode === 'confirm' && (
                    <View>
                      <Text style={styles.inputLabel}>Verification Code</Text>
                      <View style={styles.inputWrapper}>
                        <Ionicons name="key-outline" size={18} color="#64748b" style={styles.inputIcon} />
                        <TextInput
                          value={verificationCode}
                          onChangeText={setVerificationCode}
                          placeholder="6-digit code"
                          placeholderTextColor="#475569"
                          keyboardType="number-pad"
                          style={styles.textInput}
                        />
                      </View>

                      <TouchableOpacity
                        onPress={handleConfirmCode}
                        disabled={loading}
                        style={[styles.primaryButton, loading && styles.buttonDisabled]}
                        activeOpacity={0.8}
                      >
                        {loading ? (
                          <ActivityIndicator size="small" color="#030712" />
                        ) : (
                          <View style={styles.buttonContent}>
                            <Ionicons name="checkmark-done-outline" size={18} color="#030712" style={{ marginRight: 6 }} />
                            <Text style={styles.primaryButtonText}>Verify Email Address</Text>
                          </View>
                        )}
                      </TouchableOpacity>

                      <View style={[styles.footerRow, { justifyContent: 'space-between', marginTop: 16 }]}>
                        <TouchableOpacity onPress={handleResendCode}>
                          <Text style={styles.forgotLink}>Resend Code</Text>
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => switchMode('signIn')}>
                          <Text style={styles.footerLink}>Back to Sign In</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  )}

                  {/* MODE: FORGOT PASSWORD */}
                  {mode === 'forgot' && (
                    <View>
                      <Text style={styles.inputLabel}>Registered Email</Text>
                      <View style={styles.inputWrapper}>
                        <Ionicons name="mail-outline" size={18} color="#64748b" style={styles.inputIcon} />
                        <TextInput
                          value={email}
                          onChangeText={setEmail}
                          placeholder="citizen@delhi.gov.in"
                          placeholderTextColor="#475569"
                          autoCapitalize="none"
                          keyboardType="email-address"
                          style={styles.textInput}
                        />
                      </View>

                      <TouchableOpacity
                        onPress={handleRequestReset}
                        disabled={loading}
                        style={[styles.primaryButton, loading && styles.buttonDisabled]}
                        activeOpacity={0.8}
                      >
                        {loading ? (
                          <ActivityIndicator size="small" color="#030712" />
                        ) : (
                          <View style={styles.buttonContent}>
                            <Ionicons name="paper-plane-outline" size={18} color="#030712" style={{ marginRight: 6 }} />
                            <Text style={styles.primaryButtonText}>Send Reset Code</Text>
                          </View>
                        )}
                      </TouchableOpacity>

                      <View style={styles.footerRow}>
                        <TouchableOpacity onPress={() => switchMode('signIn')}>
                          <Text style={styles.footerLink}>Back to Sign In</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  )}

                  {/* MODE: CONFIRM NEW PASSWORD */}
                  {mode === 'confirmReset' && (
                    <View>
                      <Text style={styles.inputLabel}>Verification Code</Text>
                      <View style={styles.inputWrapper}>
                        <Ionicons name="key-outline" size={18} color="#64748b" style={styles.inputIcon} />
                        <TextInput
                          value={verificationCode}
                          onChangeText={setVerificationCode}
                          placeholder="6-digit code"
                          placeholderTextColor="#475569"
                          keyboardType="number-pad"
                          style={styles.textInput}
                        />
                      </View>

                      <Text style={styles.inputLabel}>New Password</Text>
                      <View style={styles.inputWrapper}>
                        <Ionicons name="lock-closed-outline" size={18} color="#64748b" style={styles.inputIcon} />
                        <TextInput
                          value={newPassword}
                          onChangeText={setNewPassword}
                          placeholder="At least 8 chars"
                          placeholderTextColor="#475569"
                          secureTextEntry={!showPassword}
                          autoCapitalize="none"
                          style={[styles.textInput, { paddingRight: 40 }]}
                        />
                        <TouchableOpacity
                          onPress={() => setShowPassword(!showPassword)}
                          style={styles.eyeButton}
                        >
                          <Ionicons
                            name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                            size={18}
                            color="#94a3b8"
                          />
                        </TouchableOpacity>
                      </View>

                      <TouchableOpacity
                        onPress={handleConfirmReset}
                        disabled={loading}
                        style={[styles.primaryButton, loading && styles.buttonDisabled]}
                        activeOpacity={0.8}
                      >
                        {loading ? (
                          <ActivityIndicator size="small" color="#030712" />
                        ) : (
                          <View style={styles.buttonContent}>
                            <Ionicons name="save-outline" size={18} color="#030712" style={{ marginRight: 6 }} />
                            <Text style={styles.primaryButtonText}>Set New Password</Text>
                          </View>
                        )}
                      </TouchableOpacity>

                      <View style={styles.footerRow}>
                        <TouchableOpacity onPress={() => switchMode('signIn')}>
                          <Text style={styles.footerLink}>Back to Sign In</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  )}
                </ScrollView>
              </View>
            </TouchableWithoutFeedback>
          </KeyboardAvoidingView>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(5, 8, 15, 0.88)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20
  },
  avoidingContainer: {
    width: '100%',
    maxWidth: 440
  },
  cardContainer: {
    backgroundColor: '#0c1222',
    borderRadius: 22,
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.28)',
    padding: 24,
    shadowColor: '#00f0ff',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 25,
    elevation: 12
  },
  closeButton: {
    position: 'absolute',
    top: 18,
    right: 18,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    paddingRight: 36
  },
  headerIconWrapper: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: 'rgba(2, 132, 199, 0.2)',
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.4)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12
  },
  headerTextCol: {
    flex: 1
  },
  headerTitle: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: -0.3
  },
  headerSubtitle: {
    color: '#94a3b8',
    fontSize: 11,
    marginTop: 2
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.35)',
    borderRadius: 10,
    padding: 10,
    marginBottom: 14,
    gap: 8
  },
  errorText: {
    flex: 1,
    color: '#f87171',
    fontSize: 12,
    lineHeight: 16
  },
  successBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.35)',
    borderRadius: 10,
    padding: 10,
    marginBottom: 14,
    gap: 8
  },
  successText: {
    flex: 1,
    color: '#34d399',
    fontSize: 12,
    lineHeight: 16
  },
  inputLabel: {
    color: '#cbd5e1',
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 6
  },
  passwordLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 6
  },
  forgotLink: {
    color: '#38bdf8',
    fontSize: 11,
    fontWeight: '600'
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(3, 7, 18, 0.75)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    borderRadius: 10,
    marginBottom: 14,
    paddingHorizontal: 12,
    height: 44
  },
  inputIcon: {
    marginRight: 8
  },
  textInput: {
    flex: 1,
    color: '#ffffff',
    fontSize: 13,
    height: '100%'
  },
  eyeButton: {
    padding: 6
  },
  primaryButton: {
    backgroundColor: '#00f0ff',
    borderRadius: 10,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 6,
    shadowColor: '#00f0ff',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 4
  },
  buttonDisabled: {
    opacity: 0.6
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  primaryButtonText: {
    color: '#030712',
    fontSize: 14,
    fontWeight: '800'
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 18
  },
  footerText: {
    color: '#94a3b8',
    fontSize: 12
  },
  footerLink: {
    color: '#00f0ff',
    fontSize: 12,
    fontWeight: '700'
  }
});
