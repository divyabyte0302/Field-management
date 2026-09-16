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
      <div className="border-b border-slate-800 pb-5">
        <h1 className="text-xl font-bold text-white flex items-center gap-2.5">
          <User className="w-6 h-6 text-cyan-400" />
          Operator Profile & Security Center
        </h1>
        <p className="text-xs text-slate-400 mt-1">
          Identity management, cryptographic session telemetry, and role persona switcher.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* User Card */}
        <div className="md:col-span-1 bg-slate-900 border border-slate-800 rounded-2xl p-6 flex flex-col items-center text-center">
          <div className="w-20 h-20 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-2xl font-bold text-cyan-400 mb-4 shadow-lg">
            {user?.firstName?.[0]}{user?.lastName?.[0]}
          </div>

          <h2 className="text-lg font-bold text-white">
            {user?.firstName} {user?.lastName}
          </h2>
          <p className="text-xs text-slate-400 flex items-center gap-1.5 mt-1">
            <Mail className="w-3.5 h-3.5 text-slate-500" />
            {user?.email}
          </p>

          <div className="mt-4 w-full border-t border-slate-800 pt-4 space-y-2 text-left text-xs">
            <div className="flex justify-between">
              <span className="text-slate-500">Tenant ID:</span>
              <span className="font-mono text-slate-300">{user?.organizationId || 'org-apex-1'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Active Persona:</span>
              <span className="font-bold text-cyan-400">{activeRole}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Account State:</span>
              <span className="text-emerald-400 font-semibold flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" /> Active / Verified
              </span>
            </div>
          </div>

          <button
            onClick={() => logout()}
            className="mt-6 w-full py-2 px-3 rounded-xl border border-rose-900/60 bg-rose-950/40 text-rose-300 hover:bg-rose-900/60 text-xs font-semibold flex items-center justify-center gap-2 transition"
          >
            <LogOut className="w-3.5 h-3.5" />
            End Authenticated Session
          </button>
        </div>

        {/* Security & Persona Switcher */}
        <div className="md:col-span-2 space-y-6">
          {/* Quick Persona Switcher for evaluation */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
            <h3 className="text-sm font-bold text-white mb-2 flex items-center gap-2">
              <Shield className="w-4 h-4 text-cyan-400" />
              Evaluation Persona Switcher (Instant Impersonation)
            </h3>
            <p className="text-xs text-slate-400 mb-4">
              Seamlessly switch between any of the 5 Keystone security roles to test permissions, navigation, and tenant policies.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {roleOptions.map((opt) => (
                <button
                  key={opt.role}
                  onClick={() => loginAs(opt.role)}
                  className={`p-3 rounded-xl border text-left transition flex flex-col justify-between ${
                    activeRole === opt.role
                      ? 'bg-cyan-950/60 border-cyan-500/80 shadow-md ring-1 ring-cyan-500/30'
                      : 'bg-slate-950 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-white">{opt.label}</span>
                    {activeRole === opt.role && (
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-cyan-500 text-slate-950">
                        Active
                      </span>
                    )}
                  </div>
                  <span className="text-[11px] text-slate-400 mt-1 leading-snug">{opt.desc}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Change Password */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
            <h3 className="text-sm font-bold text-white mb-2 flex items-center gap-2">
              <KeyRound className="w-4 h-4 text-cyan-400" />
              Update Account Password
            </h3>
            <p className="text-xs text-slate-400 mb-4">
              Passwords require minimum 8 characters and trigger session rotation upon update.
            </p>

            {errorMsg && (
              <div className="p-3 mb-4 rounded-xl bg-rose-950/60 border border-rose-800/60 text-xs text-rose-300 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0 text-rose-400" />
                <span>{errorMsg}</span>
              </div>
            )}

            {successMsg && (
              <div className="p-3 mb-4 rounded-xl bg-emerald-950/60 border border-emerald-800/60 text-xs text-emerald-300 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 flex-shrink-0 text-emerald-400" />
                <span>{successMsg}</span>
              </div>
            )}

            <form onSubmit={handlePasswordSubmit} className="space-y-3">
              <div>
                <label className="block text-xs text-slate-400 mb-1">Current Password</label>
                <input
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="Enter current password..."
                  required
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-slate-400 mb-1">New Password</label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Min 8 characters..."
                    required
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Confirm New Password</label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Re-type new password..."
                    required
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
                  />
                </div>
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs flex items-center gap-2 transition disabled:opacity-50"
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
