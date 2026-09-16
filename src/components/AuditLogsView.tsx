import React, { useState, useEffect, useCallback } from 'react';
import { 
  Shield, ShieldAlert, Search, Filter, Download, RefreshCw, 
  Clock, ArrowRight, User, ExternalLink, CheckCircle2, History,
  Activity, AlertCircle
} from 'lucide-react';
import { api } from '../services/api';

interface AuditLogsViewProps {
  onSelectWorkOrder?: (workOrderId: string) => void;
}

export const AuditLogsView: React.FC<AuditLogsViewProps> = ({ onSelectWorkOrder }) => {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedAction, setSelectedAction] = useState<string>('ALL');
  const [selectedRole, setSelectedRole] = useState<string>('ALL');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 15;

  const fetchLogs = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await api.getAuditLogs({
        query: searchQuery,
        action: selectedAction,
        role: selectedRole,
      });
      setLogs(data || []);
      setCurrentPage(1);
    } catch (err: any) {
      console.error('Failed to fetch audit logs:', err);
      setError(err.message || 'Failed to load enterprise audit logs.');
    } finally {
      setLoading(false);
    }
  }, [searchQuery, selectedAction, selectedRole]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  // Export CSV
  const handleExportCsv = () => {
    if (!logs.length) return;
    const headers = ['Timestamp', 'Work Order #', 'Title', 'Facility', 'Action', 'Actor Name', 'Role', 'Details', 'From Status', 'To Status'];
    const rows = logs.map(l => [
      `"${new Date(l.timestamp).toISOString()}"`,
      `"${l.workOrderNumber || ''}"`,
      `"${(l.workOrderTitle || '').replace(/"/g, '""')}"`,
      `"${(l.facilityName || '').replace(/"/g, '""')}"`,
      `"${l.action || ''}"`,
      `"${l.actorName || ''}"`,
      `"${l.actorRole || ''}"`,
      `"${(l.details || l.notes || '').replace(/"/g, '""')}"`,
      `"${l.fromStatus || ''}"`,
      `"${l.toStatus || ''}"`,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `keystone-audit-trail-${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // KPIs
  const totalEvents = logs.length;
  const transitionEvents = logs.filter(l => l.action === 'TRANSITION' || l.fromStatus).length;
  const assignmentEvents = logs.filter(l => l.action === 'ASSIGNMENT').length;
  const financialEvents = logs.filter(l => l.action === 'TIME_LOGGED' || l.action === 'PART_ALLOCATED').length;

  // Pagination
  const totalPages = Math.ceil(logs.length / pageSize) || 1;
  const paginatedLogs = logs.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const getActionBadgeClass = (action: string) => {
    switch (action) {
      case 'TRANSITION':
        return 'bg-cyan-950/80 text-cyan-400 border-cyan-800/60';
      case 'ASSIGNMENT':
        return 'bg-purple-950/80 text-purple-300 border-purple-800/60';
      case 'TIME_LOGGED':
        return 'bg-amber-950/80 text-amber-300 border-amber-800/60';
      case 'PART_ALLOCATED':
        return 'bg-emerald-950/80 text-emerald-300 border-emerald-800/60';
      case 'COMMENT_ADDED':
        return 'bg-blue-950/80 text-blue-300 border-blue-800/60';
      case 'ATTACHMENT_UPLOADED':
        return 'bg-indigo-950/80 text-indigo-300 border-indigo-800/60';
      default:
        return 'bg-slate-800 text-slate-300 border-slate-700';
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2.5">
            <Shield className="w-6 h-6 text-cyan-400" />
            <span>Centralized Audit Logs & Compliance Trail</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Immutable operational records across all work orders, lifecycle state transitions, assignments, and billing activities.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchLogs}
            disabled={loading}
            className="p-2 rounded-lg border border-slate-800 bg-slate-900 text-slate-400 hover:text-white hover:bg-slate-800 transition disabled:opacity-50"
            title="Refresh logs"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-cyan-400' : ''}`} />
          </button>
          <button
            onClick={handleExportCsv}
            disabled={logs.length === 0}
            className="flex items-center gap-2 px-3.5 py-1.5 rounded-lg border border-cyan-800/60 bg-cyan-950/60 text-cyan-300 hover:bg-cyan-900/60 text-xs font-semibold transition disabled:opacity-40"
          >
            <Download className="w-3.5 h-3.5 text-cyan-400" />
            <span>Export Audit CSV</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-xs font-medium uppercase tracking-wider">Total Audit Records</span>
            <History className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="text-2xl font-extrabold text-white font-mono">{totalEvents}</div>
          <div className="text-[11px] text-slate-400 mt-1">Fully indexed immutable events</div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-xs font-medium uppercase tracking-wider">State Transitions</span>
            <Activity className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-extrabold text-emerald-400 font-mono">{transitionEvents}</div>
          <div className="text-[11px] text-slate-400 mt-1">Lifecycle milestone changes</div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-xs font-medium uppercase tracking-wider">Field Assignments</span>
            <User className="w-4 h-4 text-purple-400" />
          </div>
          <div className="text-2xl font-extrabold text-purple-300 font-mono">{assignmentEvents}</div>
          <div className="text-[11px] text-slate-400 mt-1">Technician dispatch actions</div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-xs font-medium uppercase tracking-wider">Financial & Stock Logs</span>
            <CheckCircle2 className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-extrabold text-amber-400 font-mono">{financialEvents}</div>
          <div className="text-[11px] text-slate-400 mt-1">Time entries & part allocations</div>
        </div>
      </div>

      {/* Filters & Search */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by order #, actor, action, or notes..."
            className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-3 py-1.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-500"
          />
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          {/* Action Filter */}
          <div className="flex items-center gap-1.5 text-xs text-slate-400">
            <Filter className="w-3.5 h-3.5" />
            <select
              value={selectedAction}
              onChange={(e) => setSelectedAction(e.target.value)}
              className="bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
            >
              <option value="ALL">All Actions</option>
              <option value="TRANSITION">Transitions</option>
              <option value="ASSIGNMENT">Assignments</option>
              <option value="TIME_LOGGED">Time Logged</option>
              <option value="PART_ALLOCATED">Parts Allocated</option>
              <option value="COMMENT_ADDED">Comments</option>
              <option value="ATTACHMENT_UPLOADED">Attachments</option>
            </select>
          </div>

          {/* Role Filter */}
          <div className="flex items-center gap-1.5 text-xs text-slate-400">
            <select
              value={selectedRole}
              onChange={(e) => setSelectedRole(e.target.value)}
              className="bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
            >
              <option value="ALL">All Roles</option>
              <option value="SUPER_ADMIN">Super Admin</option>
              <option value="ADMIN">Admin</option>
              <option value="DISPATCHER">Dispatcher</option>
              <option value="TECHNICIAN">Technician</option>
              <option value="CUSTOMER">Customer</option>
            </select>
          </div>
        </div>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="p-4 bg-rose-950/40 border border-rose-800 text-rose-300 text-xs rounded-xl flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Audit Logs Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950 text-slate-400 uppercase text-[10px] font-semibold border-b border-slate-800">
              <tr>
                <th className="px-4 py-3">Timestamp</th>
                <th className="px-4 py-3">Work Order</th>
                <th className="px-4 py-3">Action</th>
                <th className="px-4 py-3">Actor & Role</th>
                <th className="px-4 py-3">Event Details & State Changes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80 text-slate-300">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-4 py-12 text-center text-slate-400">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <RefreshCw className="w-6 h-6 animate-spin text-cyan-400" />
                      <span className="text-xs font-mono uppercase tracking-wider">Loading Audit Trail...</span>
                    </div>
                  </td>
                </tr>
              ) : paginatedLogs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-12 text-center text-slate-500">
                    <ShieldAlert className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                    <p className="font-semibold text-slate-300">No audit records found matching your filters</p>
                    <p className="text-[11px] text-slate-500 mt-0.5">Try resetting search query or selecting All Actions.</p>
                  </td>
                </tr>
              ) : (
                paginatedLogs.map((log, idx) => (
                  <tr key={log.id || `audit-${idx}`} className="hover:bg-slate-800/40 transition">
                    {/* Timestamp */}
                    <td className="px-4 py-3 whitespace-nowrap text-[11px] font-mono text-slate-400">
                      <div className="text-slate-200">{new Date(log.timestamp).toLocaleDateString()}</div>
                      <div className="text-[10px] text-slate-500 flex items-center gap-1">
                        <Clock className="w-2.5 h-2.5" />
                        <span>{new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
                      </div>
                    </td>

                    {/* Work Order */}
                    <td className="px-4 py-3">
                      {log.workOrderId ? (
                        <button
                          type="button"
                          onClick={() => onSelectWorkOrder && onSelectWorkOrder(log.workOrderId)}
                          className="group flex flex-col text-left hover:opacity-80 transition"
                        >
                          <span className="font-mono font-bold text-cyan-400 text-xs flex items-center gap-1 group-hover:underline">
                            {log.workOrderNumber || 'WO-#'}
                            <ExternalLink className="w-2.5 h-2.5 opacity-0 group-hover:opacity-100 transition" />
                          </span>
                          <span className="text-[11px] text-slate-400 truncate max-w-[180px]">
                            {log.workOrderTitle}
                          </span>
                        </button>
                      ) : (
                        <span className="text-slate-500 font-mono">System</span>
                      )}
                    </td>

                    {/* Action */}
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${getActionBadgeClass(log.action)}`}>
                        {log.action}
                      </span>
                    </td>

                    {/* Actor */}
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="font-semibold text-white">{log.actorName || 'System Service'}</div>
                      <div className="text-[10px] text-slate-400 font-mono">{log.actorRole || 'SYSTEM'}</div>
                    </td>

                    {/* Details */}
                    <td className="px-4 py-3">
                      <div className="text-slate-300 text-xs">
                        {log.details || log.notes || 'System lifecycle record updated.'}
                      </div>
                      {(log.fromStatus || log.toStatus) && (
                        <div className="mt-1 flex items-center gap-1.5 text-[10px] font-mono">
                          <span className="px-1.5 py-0.5 rounded bg-slate-950 border border-slate-800 text-slate-400">
                            {log.fromStatus || 'INIT'}
                          </span>
                          <ArrowRight className="w-3 h-3 text-cyan-400" />
                          <span className="px-1.5 py-0.5 rounded bg-cyan-950/80 border border-cyan-800 text-cyan-300 font-bold">
                            {log.toStatus}
                          </span>
                        </div>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        {logs.length > pageSize && (
          <div className="px-4 py-3 bg-slate-950 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
            <span>
              Showing {(currentPage - 1) * pageSize + 1} to {Math.min(currentPage * pageSize, logs.length)} of {logs.length} records
            </span>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="px-2.5 py-1 rounded bg-slate-900 border border-slate-800 text-slate-300 disabled:opacity-40 hover:bg-slate-800"
              >
                Previous
              </button>
              <span className="px-2 font-mono text-slate-300">
                {currentPage} / {totalPages}
              </span>
              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="px-2.5 py-1 rounded bg-slate-900 border border-slate-800 text-slate-300 disabled:opacity-40 hover:bg-slate-800"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
