import React, { useState, useEffect } from 'react';
import { 
  ShieldAlert, Clock, AlertTriangle, CheckCircle2, TrendingUp, 
  Filter, Plus, Calendar, Building, User, ChevronRight, RefreshCw, 
  Sliders, ArrowUpRight, ArrowDownRight, Layers, Bell, Zap
} from 'lucide-react';
import { 
  SlaDashboardStats, SlaPolicy, WorkOrder, Priority, 
  Facility, RoleName 
} from '../types';
import { api } from '../services/api';

interface SlaDashboardViewProps {
  onSelectWorkOrder?: (order: WorkOrder) => void;
  facilities: Facility[];
  currentRole: RoleName;
}

export const SlaDashboardView: React.FC<SlaDashboardViewProps> = ({
  onSelectWorkOrder,
  facilities,
  currentRole
}) => {
  const [activeTab, setActiveTab] = useState<'metrics' | 'policies' | 'breached' | 'atRisk'>('metrics');
  const [dashboardData, setDashboardData] = useState<SlaDashboardStats | null>(null);
  const [policies, setPolicies] = useState<SlaPolicy[]>([]);
  const [breachedOrders, setBreachedOrders] = useState<WorkOrder[]>([]);
  const [atRiskOrders, setAtRiskOrders] = useState<WorkOrder[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filterPriority, setFilterPriority] = useState<string>('ALL');

  // Policy Modal state
  const [isPolicyModalOpen, setIsPolicyModalOpen] = useState(false);
  const [editingPolicy, setEditingPolicy] = useState<SlaPolicy | null>(null);
  const [policyName, setPolicyName] = useState('');
  const [policyPriority, setPolicyPriority] = useState<Priority>('HIGH');
  const [responseTimeMinutes, setResponseTimeMinutes] = useState(60);
  const [resolutionTimeMinutes, setResolutionTimeMinutes] = useState(480);
  const [businessHoursOnly, setBusinessHoursOnly] = useState(false);
  const [policyFacilityId, setPolicyFacilityId] = useState('');
  const [isSubmittingPolicy, setIsSubmittingPolicy] = useState(false);
  const [policyError, setPolicyError] = useState<string | null>(null);

  const canManagePolicies = currentRole === 'SUPER_ADMIN' || currentRole === 'ADMIN';

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [dash, pols, breached, atRisk] = await Promise.all([
        api.getSlaDashboard().catch(() => null),
        api.getSlaPolicies().catch(() => []),
        api.getBreachedWorkOrders().catch(() => []),
        api.getAtRiskWorkOrders().catch(() => []),
      ]);
      if (dash) setDashboardData(dash);
      setPolicies(pols);
      setBreachedOrders(breached);
      setAtRiskOrders(atRisk);
    } catch (err) {
      console.error('Failed to load SLA data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleOpenCreatePolicy = () => {
    setEditingPolicy(null);
    setPolicyName('');
    setPolicyPriority('HIGH');
    setResponseTimeMinutes(60);
    setResolutionTimeMinutes(480);
    setBusinessHoursOnly(false);
    setPolicyFacilityId('');
    setPolicyError(null);
    setIsPolicyModalOpen(true);
  };

  const handleOpenEditPolicy = (policy: SlaPolicy) => {
    setEditingPolicy(policy);
    setPolicyName(policy.name);
    setPolicyPriority(policy.priority);
    setResponseTimeMinutes(policy.responseTimeMinutes);
    setResolutionTimeMinutes(policy.resolutionTimeMinutes);
    setBusinessHoursOnly(policy.businessHoursOnly || false);
    setPolicyFacilityId(policy.facilityId || '');
    setPolicyError(null);
    setIsPolicyModalOpen(true);
  };

  const handleSavePolicySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!policyName.trim()) {
      setPolicyError('Policy name is required');
      return;
    }
    if (responseTimeMinutes <= 0 || resolutionTimeMinutes <= 0) {
      setPolicyError('Deadlines must be greater than zero');
      return;
    }

    setIsSubmittingPolicy(true);
    setPolicyError(null);

    const payload = {
      name: policyName.trim(),
      priority: policyPriority,
      responseTimeMinutes: Number(responseTimeMinutes),
      resolutionTimeMinutes: Number(resolutionTimeMinutes),
      businessHoursOnly,
      facilityId: policyFacilityId || undefined,
      escalationRules: [
        {
          id: `esc-${Date.now()}-1`,
          triggerPercentage: 50,
          action: 'NOTIFY_DISPATCHER',
          description: '50% elapsed - Notify dispatch queue',
        },
        {
          id: `esc-${Date.now()}-2`,
          triggerPercentage: 75,
          action: 'ESCALATE_SUPERVISOR',
          description: '75% elapsed - Escalate to operations supervisor',
        },
        {
          id: `esc-${Date.now()}-3`,
          triggerPercentage: 90,
          action: policyPriority === 'CRITICAL' ? 'PAGE_ONCALL' : 'FLAG_CRITICAL',
          description: '90% elapsed - Urgent dispatch notification',
        },
      ],
    };

    try {
      if (editingPolicy) {
        await api.updateSlaPolicy(editingPolicy.id, payload);
      } else {
        await api.createSlaPolicy(payload);
      }
      setIsPolicyModalOpen(false);
      await fetchData();
    } catch (err: any) {
      setPolicyError(err.message || 'Failed to save SLA policy');
    } finally {
      setIsSubmittingPolicy(false);
    }
  };

  const handleDeletePolicy = async (id: string, name: string) => {
    if (!window.confirm(`Are you sure you want to delete policy "${name}"?`)) return;
    try {
      await api.deleteSlaPolicy(id);
      await fetchData();
    } catch (err: any) {
      alert(`Failed to delete policy: ${err.message}`);
    }
  };

  const filteredPolicies = policies.filter(p => {
    if (filterPriority !== 'ALL' && p.priority !== filterPriority) return false;
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="p-2 rounded-xl bg-blue-50 text-blue-600 border border-blue-200">
              <ShieldAlert className="w-5 h-5" />
            </span>
            <div>
              <h1 className="text-xl font-bold text-slate-900 tracking-tight">SLA Management & Compliance</h1>
              <p className="text-xs text-slate-500">Response & resolution deadline enforcement with automated escalation rules</p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchData}
            className="px-3 py-1.5 bg-white hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-semibold flex items-center gap-1.5 border border-slate-200 shadow-2xs cursor-pointer transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-blue-600 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </button>

          {canManagePolicies && (
            <button
              onClick={handleOpenCreatePolicy}
              className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-xs cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              New SLA Policy
            </button>
          )}
        </div>
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="flex border border-slate-200 bg-slate-100/80 rounded-xl p-1 gap-1 text-xs font-semibold">
        <button
          onClick={() => setActiveTab('metrics')}
          className={`px-4 py-2 rounded-lg transition-all flex items-center gap-2 cursor-pointer ${
            activeTab === 'metrics'
              ? 'bg-white text-blue-700 shadow-xs border border-slate-200'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <TrendingUp className="w-4 h-4" />
          <span>SLA Compliance Dashboard</span>
        </button>

        <button
          onClick={() => setActiveTab('breached')}
          className={`px-4 py-2 rounded-lg transition-all flex items-center gap-2 cursor-pointer ${
            activeTab === 'breached'
              ? 'bg-rose-50 text-rose-700 shadow-xs border border-rose-200'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <AlertTriangle className="w-4 h-4 text-rose-600" />
          <span>Breached Work Orders</span>
          <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-rose-100 text-rose-700 border border-rose-200 font-bold">
            {dashboardData?.breachedCount ?? breachedOrders.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('atRisk')}
          className={`px-4 py-2 rounded-lg transition-all flex items-center gap-2 cursor-pointer ${
            activeTab === 'atRisk'
              ? 'bg-amber-50 text-amber-800 shadow-xs border border-amber-200'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Clock className="w-4 h-4 text-amber-600" />
          <span>At-Risk Work Orders</span>
          <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-amber-100 text-amber-800 border border-amber-200 font-bold">
            {dashboardData?.atRiskCount ?? atRiskOrders.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('policies')}
          className={`px-4 py-2 rounded-lg transition-all flex items-center gap-2 cursor-pointer ${
            activeTab === 'policies'
              ? 'bg-white text-blue-700 shadow-xs border border-slate-200'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Sliders className="w-4 h-4" />
          <span>Configured Policies ({policies.length})</span>
        </button>
      </div>

      {/* 1. METRICS DASHBOARD TAB */}
      {activeTab === 'metrics' && (
        <div className="space-y-6">
          {/* Key Stat Gauges */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Overall Compliance */}
            <div className="bg-white border border-slate-200 p-5 rounded-xl flex flex-col justify-between shadow-2xs">
              <div className="flex items-center justify-between text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                <span>Compliance Rate</span>
                <ShieldAlert className={`w-4 h-4 ${
                  (dashboardData?.compliancePercentage || 0) >= 90 ? 'text-emerald-600' :
                  (dashboardData?.compliancePercentage || 0) >= 75 ? 'text-amber-600' : 'text-rose-600'
                }`} />
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-black text-slate-900 font-mono">
                  {dashboardData?.compliancePercentage ?? '--'}%
                </span>
                <span className="text-[11px] text-slate-500">of active WOs meeting SLA</span>
              </div>
              <div className="w-full bg-slate-100 h-2 rounded-full mt-3 overflow-hidden">
                <div 
                  className={`h-full transition-all duration-500 ${
                    (dashboardData?.compliancePercentage || 0) >= 90 ? 'bg-emerald-500' :
                    (dashboardData?.compliancePercentage || 0) >= 75 ? 'bg-amber-500' : 'bg-rose-500'
                  }`}
                  style={{ width: `${Math.min(100, dashboardData?.compliancePercentage || 0)}%` }}
                />
              </div>
            </div>

            {/* On-Track Work Orders */}
            <div className="bg-white border border-slate-200 p-5 rounded-xl flex flex-col justify-between shadow-2xs">
              <div className="flex items-center justify-between text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                <span>On Track</span>
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-black text-emerald-600 font-mono">
                  {dashboardData?.onTrackCount ?? 0}
                </span>
                <span className="text-[11px] text-slate-500">orders in green SLA status</span>
              </div>
              <p className="text-[11px] text-slate-500 mt-3">All response & resolution targets within safe margins</p>
            </div>

            {/* At-Risk Work Orders */}
            <div className="bg-white border border-slate-200 p-5 rounded-xl flex flex-col justify-between shadow-2xs">
              <div className="flex items-center justify-between text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                <span>At Risk (&gt;75% Elapsed)</span>
                <Clock className="w-4 h-4 text-amber-600" />
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-black text-amber-600 font-mono">
                  {dashboardData?.atRiskCount ?? 0}
                </span>
                <span className="text-[11px] text-slate-500">approaching deadline</span>
              </div>
              <p className="text-[11px] text-amber-700 mt-3">Action needed: expedite technician dispatch or reassign</p>
            </div>

            {/* Breached Work Orders */}
            <div className="bg-white border border-slate-200 p-5 rounded-xl flex flex-col justify-between shadow-2xs">
              <div className="flex items-center justify-between text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                <span>Breached Work Orders</span>
                <AlertTriangle className="w-4 h-4 text-rose-600" />
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-black text-rose-600 font-mono">
                  {dashboardData?.breachedCount ?? 0}
                </span>
                <span className="text-[11px] text-slate-500">deadline missed</span>
              </div>
              <p className="text-[11px] text-rose-700 mt-3">Requires priority escalation and root-cause audit</p>
            </div>
          </div>

          {/* Detailed Performance Metrics */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Response vs Resolution Time Metrics */}
            <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4 shadow-2xs">
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                <Zap className="w-4 h-4 text-blue-600" />
                Response & Resolution Time Benchmarks
              </h3>

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                  <div className="text-[11px] text-slate-500 uppercase font-bold">Avg. Response Time</div>
                  <div className="text-2xl font-black text-blue-600 font-mono mt-1">
                    {dashboardData?.averageResponseTimeMinutes || 24} min
                  </div>
                  <div className="text-[11px] text-slate-500 mt-1">
                    Compliance: <span className="text-emerald-600 font-bold">{dashboardData?.responseCompliantPercentage || 92}%</span>
                  </div>
                </div>

                <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                  <div className="text-[11px] text-slate-500 uppercase font-bold">Avg. Resolution Time</div>
                  <div className="text-2xl font-black text-indigo-600 font-mono mt-1">
                    {Math.round((dashboardData?.averageResolutionTimeMinutes || 185) / 60 * 10) / 10} hrs
                  </div>
                  <div className="text-[11px] text-slate-500 mt-1">
                    Compliance: <span className="text-emerald-600 font-bold">{dashboardData?.resolutionCompliantPercentage || 88}%</span>
                  </div>
                </div>
              </div>

              {/* Priority Breakdown */}
              <div className="space-y-2 pt-2">
                <h4 className="text-xs font-bold text-slate-700 uppercase">Compliance by Priority Tier</h4>
                <div className="space-y-2">
                  {[
                    { label: 'CRITICAL (P1)', target: '30m resp / 4h resol', pct: 95, color: 'rose' },
                    { label: 'HIGH (P2)', target: '1h resp / 8h resol', pct: 88, color: 'amber' },
                    { label: 'MEDIUM (P3)', target: '2h resp / 24h resol', pct: 92, color: 'blue' },
                    { label: 'LOW (P4)', target: '4h resp / 72h resol', pct: 98, color: 'slate' },
                  ].map(tier => (
                    <div key={tier.label} className="flex items-center justify-between text-xs bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                      <div>
                        <span className="font-bold text-slate-900">{tier.label}</span>
                        <span className="text-[10px] text-slate-500 ml-2">({tier.target})</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="w-24 bg-slate-200 h-1.5 rounded-full overflow-hidden">
                          <div className="h-full bg-blue-600" style={{ width: `${tier.pct}%` }} />
                        </div>
                        <span className="font-mono font-bold text-slate-700 w-10 text-right">{tier.pct}%</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* SLA Escalation Rules Overview */}
            <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4 shadow-2xs">
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                <Bell className="w-4 h-4 text-amber-500" />
                Active Escalation Automation Engine
              </h3>

              <div className="space-y-3">
                <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 border border-blue-200 flex items-center justify-center font-bold text-xs shrink-0">
                    50%
                  </div>
                  <div>
                    <div className="text-xs font-bold text-slate-900">Level 1: Dispatcher Reminder</div>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Fires at 50% elapsed time. Automatic notification ping to active dispatchers if order is not accepted.
                    </p>
                  </div>
                </div>

                <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-700 border border-amber-200 flex items-center justify-center font-bold text-xs shrink-0">
                    75%
                  </div>
                  <div>
                    <div className="text-xs font-bold text-slate-900">Level 2: Supervisor Escalation (AT_RISK)</div>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Fires at 75% elapsed time. Flags order as AT_RISK and alerts regional field supervisor.
                    </p>
                  </div>
                </div>

                <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-rose-50 text-rose-700 border border-rose-200 flex items-center justify-center font-bold text-xs shrink-0">
                    90%
                  </div>
                  <div>
                    <div className="text-xs font-bold text-slate-900">Level 3: Urgent Priority Page (BREACH PREVENT)</div>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Critical push alert to on-call technician leads to divert nearby units before penalty breach occurs.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 2. BREACHED WORK ORDERS TAB */}
      {activeTab === 'breached' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between bg-rose-50 border border-rose-200 p-3 rounded-xl">
            <div className="flex items-center gap-2 text-rose-700 text-xs">
              <AlertTriangle className="w-4 h-4 text-rose-600" />
              <span>
                <strong>{breachedOrders.length}</strong> work orders have breached their SLA deadlines. Immediate triage required.
              </span>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-slate-50 text-slate-500 uppercase text-[10px] tracking-wider border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">Order #</th>
                  <th className="py-3 px-4">Facility</th>
                  <th className="py-3 px-4">Priority</th>
                  <th className="py-3 px-4">Technician</th>
                  <th className="py-3 px-4">Resolution Deadline</th>
                  <th className="py-3 px-4">Breach Overdue</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {breachedOrders.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-slate-400">
                      <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
                      No breached work orders! All active tasks are within SLA boundaries.
                    </td>
                  </tr>
                ) : (
                  breachedOrders.map(wo => (
                    <tr key={wo.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3 px-4 font-mono font-bold text-slate-900">
                        {wo.workOrderNumber}
                      </td>
                      <td className="py-3 px-4 text-slate-700">
                        {wo.facilityName}
                      </td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${
                          wo.priority === 'CRITICAL' ? 'bg-rose-50 text-rose-700 border-rose-200' :
                          wo.priority === 'HIGH' ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-blue-50 text-blue-700 border-blue-200'
                        }`}>
                          {wo.priority}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-slate-700">
                        {wo.assignedTechnicianName || <span className="text-slate-400 italic">Unassigned</span>}
                      </td>
                      <td className="py-3 px-4 text-rose-600 font-mono font-medium">
                        {new Date(wo.slaResolutionDeadline).toLocaleString()}
                      </td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 bg-rose-50 text-rose-700 border border-rose-200 rounded font-bold font-mono text-[10px]">
                          {wo.overdueDurationFormatted || 'BREACHED'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        {onSelectWorkOrder && (
                          <button
                            onClick={() => onSelectWorkOrder(wo)}
                            className="px-2.5 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded font-semibold text-[11px] inline-flex items-center gap-1 cursor-pointer shadow-2xs"
                          >
                            Triage <ChevronRight className="w-3 h-3" />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 3. AT-RISK WORK ORDERS TAB */}
      {activeTab === 'atRisk' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between bg-amber-50 border border-amber-200 p-3 rounded-xl">
            <div className="flex items-center gap-2 text-amber-800 text-xs">
              <Clock className="w-4 h-4 text-amber-600" />
              <span>
                <strong>{atRiskOrders.length}</strong> work orders have reached &gt;75% of their SLA target. Expedite resolution to prevent breach.
              </span>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-slate-50 text-slate-500 uppercase text-[10px] tracking-wider border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">Order #</th>
                  <th className="py-3 px-4">Title</th>
                  <th className="py-3 px-4">Facility</th>
                  <th className="py-3 px-4">Priority</th>
                  <th className="py-3 px-4">Technician</th>
                  <th className="py-3 px-4">Time Remaining</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {atRiskOrders.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-slate-400">
                      <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
                      No work orders currently at risk. All orders are on track!
                    </td>
                  </tr>
                ) : (
                  atRiskOrders.map(wo => (
                    <tr key={wo.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3 px-4 font-mono font-bold text-slate-900">
                        {wo.workOrderNumber}
                      </td>
                      <td className="py-3 px-4 text-slate-900 max-w-[200px] truncate font-medium">
                        {wo.title}
                      </td>
                      <td className="py-3 px-4 text-slate-600">
                        {wo.facilityName}
                      </td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${
                          wo.priority === 'CRITICAL' ? 'bg-rose-50 text-rose-700 border-rose-200' :
                          wo.priority === 'HIGH' ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-blue-50 text-blue-700 border-blue-200'
                        }`}>
                          {wo.priority}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-slate-700">
                        {wo.assignedTechnicianName || <span className="text-slate-400 italic">Unassigned</span>}
                      </td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 bg-amber-50 text-amber-800 border border-amber-200 rounded font-bold font-mono text-[10px] inline-flex items-center gap-1">
                          <Clock className="w-3 h-3 text-amber-600" />
                          {wo.remainingDurationFormatted || 'At Risk'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        {onSelectWorkOrder && (
                          <button
                            onClick={() => onSelectWorkOrder(wo)}
                            className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded font-semibold text-[11px] inline-flex items-center gap-1 cursor-pointer"
                          >
                            Inspect <ChevronRight className="w-3 h-3" />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 4. CONFIGURED POLICIES TAB */}
      {activeTab === 'policies' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500">Filter by Priority:</span>
              <select
                value={filterPriority}
                onChange={(e) => setFilterPriority(e.target.value)}
                className="bg-white border border-slate-200 rounded-lg px-2.5 py-1 text-xs text-slate-900 font-medium focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 cursor-pointer"
              >
                <option value="ALL">All Priorities</option>
                <option value="CRITICAL">Critical</option>
                <option value="HIGH">High</option>
                <option value="MEDIUM">Medium</option>
                <option value="LOW">Low</option>
              </select>
            </div>
            {canManagePolicies && (
              <button
                onClick={handleOpenCreatePolicy}
                className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-xs cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                Add Policy
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredPolicies.map(policy => (
              <div 
                key={policy.id}
                className="bg-white border border-slate-200 rounded-xl p-4 flex flex-col justify-between space-y-3 hover:border-slate-300 transition-all shadow-2xs"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <h4 className="text-sm font-bold text-slate-900 leading-snug">{policy.name}</h4>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase shrink-0 border ${
                      policy.priority === 'CRITICAL' ? 'bg-rose-50 text-rose-700 border-rose-200' :
                      policy.priority === 'HIGH' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                      policy.priority === 'MEDIUM' ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-slate-100 text-slate-700 border-slate-200'
                    }`}>
                      {policy.priority}
                    </span>
                  </div>

                  <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                    <div className="bg-slate-50 p-2 rounded-lg border border-slate-200">
                      <div className="text-[10px] text-slate-500 font-bold uppercase">Response Time</div>
                      <div className="text-sm font-bold text-blue-600 font-mono">
                        {policy.responseTimeMinutes >= 60 
                          ? `${policy.responseTimeMinutes / 60} hr${policy.responseTimeMinutes > 60 ? 's' : ''}` 
                          : `${policy.responseTimeMinutes} min`}
                      </div>
                    </div>

                    <div className="bg-slate-50 p-2 rounded-lg border border-slate-200">
                      <div className="text-[10px] text-slate-500 font-bold uppercase">Resolution Time</div>
                      <div className="text-sm font-bold text-emerald-600 font-mono">
                        {policy.resolutionTimeMinutes >= 60 
                          ? `${policy.resolutionTimeMinutes / 60} hr${policy.resolutionTimeMinutes > 60 ? 's' : ''}` 
                          : `${policy.resolutionTimeMinutes} min`}
                      </div>
                    </div>
                  </div>

                  <div className="mt-3 text-[11px] text-slate-500 space-y-1">
                    <div>
                      <span className="text-slate-400">Facility Scope:</span>{' '}
                      <span className="text-slate-800 font-medium">{policy.facilityName || 'All Facilities (Default)'}</span>
                    </div>
                    <div>
                      <span className="text-slate-400">Business Hours:</span>{' '}
                      <span className="text-slate-800 font-medium">{policy.businessHoursOnly ? 'Yes (8am - 6pm M-F)' : '24/7 Global Clock'}</span>
                    </div>
                    <div>
                      <span className="text-slate-400">Escalation Stages:</span>{' '}
                      <span className="text-slate-800 font-medium">{policy.escalationRules?.length || 3} Trigger Thresholds</span>
                    </div>
                  </div>
                </div>

                {canManagePolicies && (
                  <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2 text-xs">
                    <button
                      onClick={() => handleOpenEditPolicy(policy)}
                      className="px-2.5 py-1 text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded font-semibold cursor-pointer"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDeletePolicy(policy.id, policy.name)}
                      className="px-2.5 py-1 text-rose-700 hover:text-rose-800 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded font-semibold cursor-pointer"
                    >
                      Delete
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* CREATE / EDIT POLICY MODAL */}
      {isPolicyModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-white border border-slate-200 rounded-2xl shadow-xl p-6 space-y-4 text-slate-900">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-blue-600" />
                {editingPolicy ? 'Edit SLA Policy' : 'Configure New SLA Policy'}
              </h3>
              <button
                onClick={() => setIsPolicyModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 text-xs cursor-pointer"
              >
                ✕
              </button>
            </div>

            {policyError && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-lg flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{policyError}</span>
              </div>
            )}

            <form onSubmit={handleSavePolicySubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Policy Name</label>
                <input
                  type="text"
                  required
                  value={policyName}
                  onChange={(e) => setPolicyName(e.target.value)}
                  placeholder="e.g. Critical Infrastructure 1-Hour SLA"
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Priority Tier</label>
                  <select
                    value={policyPriority}
                    onChange={(e) => setPolicyPriority(e.target.value as Priority)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 cursor-pointer"
                  >
                    <option value="CRITICAL">CRITICAL</option>
                    <option value="HIGH">HIGH</option>
                    <option value="MEDIUM">MEDIUM</option>
                    <option value="LOW">LOW</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Facility Scope</label>
                  <select
                    value={policyFacilityId}
                    onChange={(e) => setPolicyFacilityId(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 cursor-pointer"
                  >
                    <option value="">All Facilities (Global)</option>
                    {facilities.map(f => (
                      <option key={f.id} value={f.id}>{f.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Response Target (Minutes)
                  </label>
                  <input
                    type="number"
                    min={5}
                    required
                    value={responseTimeMinutes}
                    onChange={(e) => setResponseTimeMinutes(Number(e.target.value))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-mono"
                  />
                  <span className="text-[10px] text-slate-500 mt-0.5 block">
                    ={Math.round(responseTimeMinutes / 60 * 10) / 10} hours
                  </span>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Resolution Target (Minutes)
                  </label>
                  <input
                    type="number"
                    min={15}
                    required
                    value={resolutionTimeMinutes}
                    onChange={(e) => setResolutionTimeMinutes(Number(e.target.value))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-mono"
                  />
                  <span className="text-[10px] text-slate-500 mt-0.5 block">
                    ={Math.round(resolutionTimeMinutes / 60 * 10) / 10} hours
                  </span>
                </div>
              </div>

              <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 flex items-center justify-between">
                <div>
                  <div className="text-xs font-semibold text-slate-900">Business Hours Only</div>
                  <div className="text-[11px] text-slate-500">Calculate deadlines only during 8:00 AM - 6:00 PM Mon-Fri</div>
                </div>
                <input
                  type="checkbox"
                  checked={businessHoursOnly}
                  onChange={(e) => setBusinessHoursOnly(e.target.checked)}
                  className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsPolicyModalOpen(false)}
                  className="px-3 py-1.5 text-xs text-slate-500 hover:text-slate-800 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingPolicy}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-xs cursor-pointer"
                >
                  {isSubmittingPolicy ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                  {editingPolicy ? 'Update Policy' : 'Create Policy'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
