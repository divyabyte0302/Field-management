import React, { useState } from 'react';
import { 
  User, Shield, KeyRound, Building, Mail, Clock, 
  CheckCircle2, AlertCircle, RefreshCw, LogOut, Lock
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { RoleName } from '../types';

export const UserProfileView: React.FC = () => {
  const { user, activeRole, logout, loginAs, changePassword } = useAuth();
  
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (newPassword.length < 8) {
      setErrorMsg('New password must contain at least 8 characters.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorMsg('New password and confirmation do not match.');
      return;
    }

    setIsSubmitting(true);
    try {
      await changePassword(currentPassword, newPassword);
      setSuccessMsg('Security credentials updated successfully.');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to update credentials.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const roleOptions: { role: RoleName; label: string; desc: string }[] = [
    { role: 'SUPER_ADMIN', label: 'Platform Super Admin', desc: 'Full root access across all organizations and tenants' },
    { role: 'ADMIN', label: 'Organization Admin', desc: 'Apex Facility Solutions tenant manager' },
    { role: 'DISPATCHER', label: 'Chief Dispatcher', desc: 'Work order routing, technician scheduling, triage' },
    { role: 'TECHNICIAN', label: 'Field Technician', desc: 'Mobile execution workbench, time & parts logging' },
    { role: 'CUSTOMER', label: 'Facility Customer', desc: 'Commercial tenant portal, request origination, sign-off' },
  ];

  return (
    <div className="space-y-6 max-w-4xl mx-auto animate-in fade-in duration-300">
      {/* Header */}
      <div className="border-b border-slate-200 pb-5">
        <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2.5">
          <User className="w-6 h-6 text-blue-600" />
          Operator Profile & Security Center
        </h1>
        <p className="text-xs text-slate-500 mt-1">
          Identity management, cryptographic session telemetry, and role persona switcher.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* User Card */}
        <div className="md:col-span-1 bg-white border border-slate-200 rounded-2xl p-6 flex flex-col items-center text-center shadow-2xs">
          <div className="w-20 h-20 rounded-2xl bg-blue-50 border border-blue-200 flex items-center justify-center text-2xl font-bold text-blue-700 mb-4 shadow-xs">
            {user?.firstName?.[0]}{user?.lastName?.[0]}
          </div>

          <h2 className="text-lg font-bold text-slate-900">
            {user?.firstName} {user?.lastName}
          </h2>
          <p className="text-xs text-slate-500 flex items-center gap-1.5 mt-1">
            <Mail className="w-3.5 h-3.5 text-slate-400" />
            {user?.email}
          </p>

          <div className="mt-4 w-full border-t border-slate-100 pt-4 space-y-2 text-left text-xs">
            <div className="flex justify-between">
              <span className="text-slate-500">Tenant ID:</span>
              <span className="font-mono text-slate-700 font-semibold">{user?.organizationId || 'org-apex-1'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Active Persona:</span>
              <span className="font-bold text-blue-600">{activeRole}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Account State:</span>
              <span className="text-emerald-600 font-semibold flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" /> Active / Verified
              </span>
            </div>
          </div>

          <button
            onClick={() => logout()}
            className="mt-6 w-full py-2 px-3 rounded-xl border border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100 text-xs font-semibold flex items-center justify-center gap-2 transition cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            End Authenticated Session
          </button>
        </div>

        {/* Security & Persona Switcher */}
        <div className="md:col-span-2 space-y-6">
          {/* Quick Persona Switcher for evaluation */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-2xs">
            <h3 className="text-sm font-bold text-slate-900 mb-2 flex items-center gap-2">
              <Shield className="w-4 h-4 text-blue-600" />
              Evaluation Persona Switcher (Instant Impersonation)
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              Seamlessly switch between any of the 5 Keystone security roles to test permissions, navigation, and tenant policies.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {roleOptions.map((opt) => (
                <button
                  key={opt.role}
                  onClick={() => loginAs(opt.role)}
                  className={`p-3 rounded-xl border text-left transition flex flex-col justify-between cursor-pointer ${
                    activeRole === opt.role
                      ? 'bg-blue-50 border-blue-500 shadow-xs ring-1 ring-blue-500/30'
                      : 'bg-slate-50 border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-900">{opt.label}</span>
                    {activeRole === opt.role && (
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-blue-600 text-white">
                        Active
                      </span>
                    )}
                  </div>
                  <span className="text-[11px] text-slate-500 mt-1 leading-snug">{opt.desc}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Change Password */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-2xs">
            <h3 className="text-sm font-bold text-slate-900 mb-2 flex items-center gap-2">
              <KeyRound className="w-4 h-4 text-blue-600" />
              Update Account Password
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              Passwords require minimum 8 characters and trigger session rotation upon update.
            </p>

            {errorMsg && (
              <div className="p-3 mb-4 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                <span>{errorMsg}</span>
              </div>
            )}

            {successMsg && (
              <div className="p-3 mb-4 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-700 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
                <span>{successMsg}</span>
              </div>
            )}

            <form onSubmit={handlePasswordSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Current Password</label>
                <input
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="Enter current password..."
                  required
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-900 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">New Password</label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Min 8 characters..."
                    required
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-900 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Confirm New Password</label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Re-type new password..."
                    required
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-900 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs flex items-center gap-2 transition disabled:opacity-50 cursor-pointer shadow-xs"
                >
                  {isSubmitting && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                  Save New Password
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};
