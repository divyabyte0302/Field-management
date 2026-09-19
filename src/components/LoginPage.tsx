import React, { useState } from 'react';
import { useAuth, DEMO_CREDENTIALS } from '../context/AuthContext';
import { RoleName } from '../types';
import { api } from '../services/api';
import { 
  ShieldCheck, Lock, Mail, User, Building, 
  KeyRound, AlertCircle, CheckCircle2, 
  RefreshCw 
} from 'lucide-react';

export const LoginPage: React.FC = () => {
  const { login, register, sessionExpired, dismissSessionExpired } = useAuth();

  const [activeTab, setActiveTab] = useState<'login' | 'register' | 'forgot'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [orgCode, setOrgCode] = useState('APEX');
  const [registerRole, setRegisterRole] = useState<RoleName>('CUSTOMER');
  
  // Forgot password states
  const [forgotEmail, setForgotEmail] = useState('');
  const [resetToken, setResetToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [resetStep, setResetStep] = useState<'request' | 'reset'>('request');

  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      await login(email, password);
    } catch (err: any) {
      setError(err.message || 'Login failed. Please verify your credentials.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleQuickLogin = async (demoEmail: string) => {
    setEmail(demoEmail);
    setPassword('password123');
    setError(null);
    setIsSubmitting(true);
    try {
      await login(demoEmail, 'password123');
    } catch (err: any) {
      setError(err.message || 'Login failed. Please verify credentials.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      await register({
        email,
        password,
        firstName,
        lastName,
        organizationCode: orgCode,
        role: registerRole,
      });
    } catch (err: any) {
      setError(err.message || 'Registration failed.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      const res = await api.forgotPassword(forgotEmail);
      if (res.demoResetToken) {
        setResetToken(res.demoResetToken);
        setResetStep('reset');
        setSuccess('Reset token issued. Please set your new password.');
      } else {
        setSuccess('Password reset link has been dispatched to your email.');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to process password reset.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      await api.resetPassword({ token: resetToken, newPassword });
      setSuccess('Password reset successful! You can now log in with your new password.');
      setActiveTab('login');
      setEmail(forgotEmail);
      setPassword(newPassword);
    } catch (err: any) {
      setError(err.message || 'Password reset failed.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div id="login-page-container" className="min-h-screen bg-slate-50 flex flex-col justify-center items-center p-4 sm:p-6 text-slate-800 selection:bg-blue-500/20 selection:text-blue-900">
      {/* Subtle Background Ambience */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(59,130,246,0.08),rgba(255,255,255,0))] pointer-events-none" />

      {/* Session Expired Alert */}
      {sessionExpired && (
        <div id="session-expired-banner" className="relative z-10 w-full max-w-md mb-4 bg-amber-50 border border-amber-200 rounded-xl p-3 text-amber-900 text-sm flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
            <span>Your session has expired. Please sign in again.</span>
          </div>
          <button 
            onClick={dismissSessionExpired} 
            className="text-amber-800 hover:text-amber-950 text-xs font-semibold px-2 py-1 rounded"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Main Auth Card */}
      <div id="login-card" className="relative z-10 w-full max-w-xl bg-white border border-slate-200/90 rounded-2xl shadow-xl overflow-hidden">
        {/* Card Header */}
        <div className="px-6 sm:px-8 pt-8 pb-6 border-b border-slate-100 bg-slate-50/50">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-xs">
              <ShieldCheck className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
                KEYSTONE <span className="text-[11px] font-mono font-semibold px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200">ENTERPRISE FSM</span>
              </h1>
              <p className="text-xs text-slate-500 font-medium">Field Service & Facilities Operations Gateway</p>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="flex items-center gap-1 mt-6 p-1 bg-slate-100 border border-slate-200/80 rounded-xl">
            <button
              id="tab-signin"
              type="button"
              onClick={() => { setActiveTab('login'); setError(null); }}
              className={`flex-1 py-2 px-3 text-xs font-semibold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                activeTab === 'login' 
                  ? 'bg-white text-slate-900 shadow-xs' 
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <KeyRound className="w-3.5 h-3.5" />
              Sign In
            </button>
            <button
              id="tab-register"
              type="button"
              onClick={() => { setActiveTab('register'); setError(null); }}
              className={`flex-1 py-2 px-3 text-xs font-semibold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                activeTab === 'register' 
                  ? 'bg-white text-slate-900 shadow-xs' 
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <User className="w-3.5 h-3.5" />
              Register
            </button>
          </div>
        </div>

        {/* Card Body */}
        <div className="p-6 sm:p-8">
          {error && (
            <div id="login-error-alert" className="mb-5 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div id="login-success-alert" className="mb-5 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{success}</span>
            </div>
          )}

          {/* SIGN IN FORM */}
          {activeTab === 'login' && (
            <form id="signin-form" onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">Email Address</label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    id="input-login-email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="user@keystone.io"
                    className="w-full bg-slate-50 border border-slate-200 hover:border-slate-300 rounded-lg pl-9 pr-3 py-2 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-600 focus:bg-white focus:ring-1 focus:ring-blue-600 transition"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-semibold text-slate-700">Password</label>
                  <button
                    id="btn-forgot-password-link"
                    type="button"
                    onClick={() => { setActiveTab('forgot'); setError(null); setSuccess(null); }}
                    className="text-xs text-blue-600 hover:text-blue-700 font-medium"
                  >
                    Forgot password?
                  </button>
                </div>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    id="input-login-password"
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full bg-slate-50 border border-slate-200 hover:border-slate-300 rounded-lg pl-9 pr-3 py-2 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-600 focus:bg-white focus:ring-1 focus:ring-blue-600 transition"
                  />
                </div>
              </div>

              <button
                id="btn-submit-login"
                type="submit"
                disabled={isSubmitting}
                className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-lg shadow-xs flex items-center justify-center gap-2 transition-all disabled:opacity-50"
              >
                {isSubmitting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Lock className="w-4 h-4" />}
                Sign In to KEYSTONE
              </button>

              {/* Demo Credentials Quick-Fill & 1-Click Login */}
              <div className="pt-4 border-t border-slate-100">
                <div className="flex items-center justify-between mb-2.5">
                  <span className="text-[11px] font-semibold text-slate-600">Demo Accounts (1-Click Instant Sign In):</span>
                  <span className="text-[10px] text-slate-500 font-mono bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                    PW: password123
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {(Object.keys(DEMO_CREDENTIALS) as RoleName[]).map((roleKey) => {
                    const creds = DEMO_CREDENTIALS[roleKey];
                    return (
                      <button
                        key={roleKey}
                        id={`demo-btn-${roleKey.toLowerCase()}`}
                        type="button"
                        disabled={isSubmitting}
                        onClick={() => handleQuickLogin(creds.email)}
                        className="text-left px-3 py-2 rounded-xl bg-slate-50 border border-slate-200/80 hover:border-blue-400 hover:bg-blue-50/40 transition-all flex items-center justify-between group disabled:opacity-50 cursor-pointer"
                      >
                        <div className="min-w-0 pr-1">
                          <div className="text-xs font-semibold text-slate-800 group-hover:text-blue-700 transition-colors truncate">
                            {creds.label}
                          </div>
                          <div className="text-[10px] text-slate-500 font-mono truncate">
                            {creds.email}
                          </div>
                        </div>
                        <span className="text-xs text-blue-600 font-medium group-hover:translate-x-0.5 transition-transform whitespace-nowrap pl-1">
                          &rarr;
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </form>
          )}

          {/* TAB 3: REGISTER NEW USER */}
          {activeTab === 'register' && (
            <form id="register-form" onSubmit={handleRegister} className="space-y-3.5">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">First Name</label>
                  <input
                    id="input-reg-firstname"
                    type="text"
                    required
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    placeholder="Jane"
                    className="w-full bg-slate-50 border border-slate-200 hover:border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-600 focus:bg-white transition"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Last Name</label>
                  <input
                    id="input-reg-lastname"
                    type="text"
                    required
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    placeholder="Doe"
                    className="w-full bg-slate-50 border border-slate-200 hover:border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-600 focus:bg-white transition"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Email Address</label>
                <input
                  id="input-reg-email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="jane.doe@keystone.io"
                  className="w-full bg-slate-50 border border-slate-200 hover:border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-600 focus:bg-white transition"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Password (min 8 characters)</label>
                <input
                  id="input-reg-password"
                  type="password"
                  required
                  minLength={8}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-slate-50 border border-slate-200 hover:border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-600 focus:bg-white transition"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Role</label>
                  <select
                    id="select-reg-role"
                    value={registerRole}
                    onChange={(e) => setRegisterRole(e.target.value as RoleName)}
                    className="w-full bg-slate-50 border border-slate-200 hover:border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-blue-600 focus:bg-white transition"
                  >
                    <option value="CUSTOMER">CUSTOMER</option>
                    <option value="TECHNICIAN">TECHNICIAN</option>
                    <option value="DISPATCHER">DISPATCHER</option>
                    <option value="ADMIN">ADMIN</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Org Code</label>
                  <input
                    id="input-reg-org"
                    type="text"
                    value={orgCode}
                    onChange={(e) => setOrgCode(e.target.value)}
                    placeholder="APEX"
                    className="w-full bg-slate-50 border border-slate-200 hover:border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-blue-600 focus:bg-white transition"
                  />
                </div>
              </div>

              <button
                id="btn-submit-register"
                type="submit"
                disabled={isSubmitting}
                className="w-full mt-2 py-2.5 px-4 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-lg shadow-xs flex items-center justify-center gap-2 transition-all disabled:opacity-50"
              >
                {isSubmitting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <User className="w-4 h-4" />}
                Create Account & Sign In
              </button>
            </form>
          )}

          {/* TAB 4: FORGOT / RESET PASSWORD */}
          {activeTab === 'forgot' && (
            <div id="forgot-password-section" className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-700">Password Reset Architecture</span>
                <button
                  type="button"
                  onClick={() => { setActiveTab('login'); setError(null); }}
                  className="text-xs text-blue-600 hover:text-blue-700 font-medium"
                >
                  Back to Sign In
                </button>
              </div>

              {resetStep === 'request' ? (
                <form onSubmit={handleForgotPassword} className="space-y-3">
                  <p className="text-xs text-slate-500">
                    Enter the email associated with your user account. A secure reset token will be generated.
                  </p>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Account Email</label>
                    <input
                      id="input-forgot-email"
                      type="email"
                      required
                      value={forgotEmail}
                      onChange={(e) => setForgotEmail(e.target.value)}
                      placeholder="admin@keystone.io"
                      className="w-full bg-slate-50 border border-slate-200 hover:border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-600 focus:bg-white transition"
                    />
                  </div>
                  <button
                    id="btn-request-reset-token"
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-lg flex items-center justify-center gap-2 transition shadow-xs"
                  >
                    Request Password Reset
                  </button>
                </form>
              ) : (
                <form onSubmit={handleResetPassword} className="space-y-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Reset Token</label>
                    <input
                      id="input-reset-token"
                      type="text"
                      required
                      value={resetToken}
                      onChange={(e) => setResetToken(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 hover:border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-900 font-mono focus:outline-none focus:border-blue-600 focus:bg-white transition"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">New Password (min 8 chars)</label>
                    <input
                      id="input-new-password"
                      type="password"
                      required
                      minLength={8}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full bg-slate-50 border border-slate-200 hover:border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-blue-600 focus:bg-white transition"
                    />
                  </div>
                  <button
                    id="btn-submit-new-password"
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-lg flex items-center justify-center gap-2 transition shadow-xs"
                  >
                    Update Password & Revoke Prior Sessions
                  </button>
                </form>
              )}
            </div>
          )}
        </div>

        {/* Security Specs Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-100 text-[11px] text-slate-500 flex items-center justify-between">
          <span>Enterprise HMAC-SHA256 • BCrypt Auth</span>
          <span className="font-mono text-slate-600">Stateless Session Security</span>
        </div>
      </div>
    </div>
  );
};
