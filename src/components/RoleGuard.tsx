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
    <div id="role-guard-forbidden" className="p-8 max-w-2xl mx-auto my-12 bg-white border border-rose-200 rounded-2xl text-center shadow-xs">
      <div className="w-12 h-12 mx-auto rounded-full bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-600 mb-4">
        <ShieldAlert className="w-6 h-6" />
      </div>
      <h3 className="text-lg font-bold text-slate-900 mb-2">403 Forbidden: Access Restricted</h3>
      <p className="text-sm text-slate-600 mb-6 leading-relaxed">
        Your current role (<span className="text-amber-700 font-semibold">{activeRole}</span>) does not possess authorization to view this section.
        This feature requires one of the following permissions:
      </p>
      <div className="flex flex-wrap justify-center gap-2 mb-6">
        {allowedRoles.map((role) => (
          <span key={role} className="px-3 py-1 bg-slate-100 border border-slate-200 rounded-lg text-xs font-mono text-blue-700 font-medium">
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
