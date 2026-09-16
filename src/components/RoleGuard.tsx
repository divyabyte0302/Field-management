import React from 'react';
import { useAuth } from '../context/AuthContext';
import { RoleName } from '../types';
import { ShieldAlert, ArrowLeft } from 'lucide-react';

interface RoleGuardProps {
  allowedRoles: RoleName[];
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export const RoleGuard: React.FC<RoleGuardProps> = ({ allowedRoles, children, fallback }) => {
  const { user, hasRole, activeRole } = useAuth();

  if (!user) {
    return null;
  }

  const isAllowed = hasRole(allowedRoles);

  if (isAllowed) {
    return <>{children}</>;
  }

  if (fallback) {
    return <>{fallback}</>;
  }

  return (
    <div id="role-guard-forbidden" className="p-8 max-w-2xl mx-auto my-12 bg-slate-900 border border-rose-500/30 rounded-2xl text-center shadow-xl">
      <div className="w-12 h-12 mx-auto rounded-full bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400 mb-4">
        <ShieldAlert className="w-6 h-6" />
      </div>
      <h3 className="text-lg font-bold text-white mb-2">403 Forbidden: Access Restricted</h3>
      <p className="text-sm text-slate-400 mb-6 leading-relaxed">
        Your current role (<span className="text-amber-400 font-semibold">{activeRole}</span>) does not possess authorization to view this section.
        This feature requires one of the following permissions:
      </p>
      <div className="flex flex-wrap justify-center gap-2 mb-6">
        {allowedRoles.map((role) => (
          <span key={role} className="px-3 py-1 bg-slate-800 border border-slate-700 rounded-lg text-xs font-mono text-cyan-400 font-medium">
            {role}
          </span>
        ))}
      </div>
      <p className="text-xs text-slate-500">
        You can switch to an authorized role from the top navigation bar to test this module.
      </p>
    </div>
  );
};
