import React from 'react';
import { 
  CheckCircle2, Clock, 
  Users, ArrowRight, ShieldAlert, Wrench,
  Boxes, AlertCircle, AlertTriangle
} from 'lucide-react';
import { DashboardStats, WorkOrderStatus, WorkOrder } from '../types';
import {
  StatusDistributionChart,
  PriorityDistributionChart,
  OrdersOverTimeChart,
  SlaPerformanceChart,
} from './DashboardCharts';

interface DashboardViewProps {
  stats: DashboardStats | null;
  workOrders: WorkOrder[];
  onSelectStage: (status: WorkOrderStatus) => void;
  onSelectWorkOrder: (order: WorkOrder) => void;
  onNavigateToTab: (tab: string) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  stats,
  workOrders,
  onSelectStage,
  onSelectWorkOrder,
  onNavigateToTab,
}) => {

  if (!stats) {
    return (
      <div className="flex items-center justify-center py-24 text-slate-400">
        <Clock className="w-6 h-6 animate-spin mr-2 text-blue-600" />
        <span>Loading KEYSTONE Operational Telemetry...</span>
      </div>
    );
  }

  const stages: { key: WorkOrderStatus; label: string; desc: string; color: string }[] = [
    { key: 'NEW', label: '1. New', desc: 'Inbound intake', color: 'bg-slate-50 text-slate-700 border-slate-200' },
    { key: 'TRIAGED', label: '2. Triaged', desc: 'SLA assessed', color: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
    { key: 'ASSIGNED', label: '3. Assigned', desc: 'Dispatched to tech', color: 'bg-blue-50 text-blue-700 border-blue-200' },
    { key: 'ACCEPTED', label: '4. Accepted', desc: 'Tech confirmed', color: 'bg-sky-50 text-sky-700 border-sky-200' },
    { key: 'IN_PROGRESS', label: '5. In Progress', desc: 'Active on site', color: 'bg-amber-50 text-amber-800 border-amber-300' },
    { key: 'ON_HOLD', label: '6. On Hold', desc: 'Parts or access', color: 'bg-orange-50 text-orange-800 border-orange-300' },
    { key: 'COMPLETED', label: '7. Completed', desc: 'Field repair done', color: 'bg-teal-50 text-teal-800 border-teal-300' },
    { key: 'VERIFIED', label: '8. Verified', desc: 'Client sign-off', color: 'bg-emerald-50 text-emerald-800 border-emerald-300' },
    { key: 'CLOSED', label: '9. Closed', desc: 'Invoiced & archived', color: 'bg-slate-200 text-slate-800 border-slate-400' },
  ];

  const criticalOrders = workOrders.filter(w => w.priority === 'CRITICAL' && w.status !== 'CLOSED');

  return (
    <div id="admin-dashboard-container" className="space-y-6">
      {/* Top Header & Operational Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-200 gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-blue-50 text-blue-700 border border-blue-200 font-bold uppercase">
              OPERATIONAL COMMAND
            </span>
            <span className="text-xs text-slate-400 font-mono">• Production Real-Time Telemetry</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Facility Maintenance & Dispatch Operations</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Real-time commercial real estate telemetry, SLA response monitoring, technician utilization, and costing metrics.
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
            <span className="w-2 h-2 rounded-full bg-emerald-500 mr-1.5 animate-pulse"></span>
            PostgreSQL & FSM Engine Live
          </span>
        </div>
      </div>

      {/* Critical SLA Radar Alert */}
      {criticalOrders.length > 0 && (
        <div id="alert-critical-incidents" className="bg-rose-50 border-l-4 border-rose-600 p-4 rounded-r-xl shadow-xs">
          <div className="flex items-start">
            <ShieldAlert className="w-5 h-5 text-rose-600 mt-0.5 mr-3 shrink-0" />
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-rose-900">
                  Active High-Severity Incidents ({criticalOrders.length})
                </h3>
                <span className="text-[11px] font-mono font-bold text-rose-700">Immediate Triage Required</span>
              </div>
              <div className="mt-2 space-y-1.5">
                {criticalOrders.map((co) => (
                  <div 
                    key={co.id}
                    onClick={() => onSelectWorkOrder(co)}
                    className="flex items-center justify-between text-xs bg-white/90 p-2.5 rounded-lg border border-rose-200 cursor-pointer hover:bg-white hover:border-rose-400 transition-all shadow-xs"
                  >
                    <div className="flex items-center space-x-2">
                      <span className="font-mono font-bold text-rose-700">{co.workOrderNumber}</span>
                      <span className="text-slate-800 font-semibold">{co.title}</span>
                      <span className="text-slate-500 hidden sm:inline">at {co.facilityName}</span>
                    </div>
                    <div className="flex items-center space-x-2 text-rose-600 font-medium">
                      <span className="px-2 py-0.5 rounded bg-rose-100 text-[10px] font-bold uppercase">{co.status}</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          CORE OPERATIONAL KPIS (9 METRICS)
         ========================================================================= */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
            Operational Health & Key Performance Indicators
          </h2>
          <span className="text-[11px] font-mono text-slate-400">Real-time backend metrics</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-3 xl:grid-cols-3 gap-4">
          {/* 1. Open Work Orders */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between text-slate-500">
              <span className="text-[11px] font-semibold uppercase tracking-wider">Open Work Orders</span>
              <Clock className="w-4 h-4 text-sky-500" />
            </div>
            <div className="mt-2">
              <span className="text-2xl font-bold text-sky-600 font-mono">{stats.openOrders}</span>
              <span className="text-[11px] text-slate-400 block mt-0.5">Active execution queue</span>
            </div>
          </div>

          {/* 2. In Progress */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between text-slate-500">
              <span className="text-[11px] font-semibold uppercase tracking-wider">In Progress</span>
              <Wrench className="w-4 h-4 text-amber-500" />
            </div>
            <div className="mt-2">
              <span className="text-2xl font-bold text-amber-600 font-mono">{stats.inProgressOrders}</span>
              <span className="text-[11px] text-slate-400 block mt-0.5">Technicians on-site</span>
            </div>
          </div>

          {/* 3. Completed */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between text-slate-500">
              <span className="text-[11px] font-semibold uppercase tracking-wider">Completed</span>
              <CheckCircle2 className="w-4 h-4 text-teal-500" />
            </div>
            <div className="mt-2">
              <span className="text-2xl font-bold text-teal-600 font-mono">{stats.completedOrders}</span>
              <span className="text-[11px] text-slate-400 block mt-0.5">Resolved or closed</span>
            </div>
          </div>

          {/* 4. Overdue */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between text-slate-500">
              <span className="text-[11px] font-semibold uppercase tracking-wider">Overdue</span>
              <AlertCircle className="w-4 h-4 text-rose-500" />
            </div>
            <div className="mt-2">
              <span className="text-2xl font-bold text-rose-600 font-mono">{stats.overdueOrders}</span>
              <span className="text-[11px] text-slate-400 block mt-0.5">Past due / breached deadline</span>
            </div>
          </div>

          {/* 5. SLA At Risk */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between text-slate-500">
              <span className="text-[11px] font-semibold uppercase tracking-wider">SLA At Risk</span>
              <AlertTriangle className="w-4 h-4 text-amber-500" />
            </div>
            <div className="mt-2">
              <span className="text-2xl font-bold text-amber-600 font-mono">
                {stats.slaAtRiskCount ?? stats.charts.slaPerformance?.find(s => s.name.includes('Risk'))?.count ?? 0}
              </span>
              <span className="text-[11px] text-slate-400 block mt-0.5">&lt;60m to resolution SLA</span>
            </div>
          </div>

          {/* 6. SLA Breached */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between text-slate-500">
              <span className="text-[11px] font-semibold uppercase tracking-wider">SLA Breached</span>
              <ShieldAlert className="w-4 h-4 text-red-500" />
            </div>
            <div className="mt-2">
              <span className="text-2xl font-bold text-red-600 font-mono">
                {stats.slaBreachedCount ?? stats.charts.slaPerformance?.find(s => s.name.includes('Breached'))?.count ?? 0}
              </span>
              <span className="text-[11px] text-slate-400 block mt-0.5">Response or resolution breached</span>
            </div>
          </div>

          {/* 7. Unassigned Jobs */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between text-slate-500">
              <span className="text-[11px] font-semibold uppercase tracking-wider">Unassigned Jobs</span>
              <Clock className="w-4 h-4 text-indigo-500" />
            </div>
            <div className="mt-2">
              <span className="text-2xl font-bold text-indigo-600 font-mono">{stats.unassignedOrders ?? 0}</span>
              <span className="text-[11px] text-slate-400 block mt-0.5">Awaiting technician assignment</span>
            </div>
          </div>

          {/* 8. Available Technicians */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between text-slate-500">
              <span className="text-[11px] font-semibold uppercase tracking-wider">Available Technicians</span>
              <Users className="w-4 h-4 text-emerald-500" />
            </div>
            <div className="mt-2">
              <span className="text-2xl font-bold text-emerald-600 font-mono">
                {stats.availableTechnicians ?? stats.techStats?.available ?? 0}
              </span>
              <span className="text-[11px] text-slate-400 block mt-0.5">Ready for dispatch</span>
            </div>
          </div>

          {/* 9. Low Stock Items */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between text-slate-500">
              <span className="text-[11px] font-semibold uppercase tracking-wider">Low Stock Items</span>
              <Boxes className="w-4 h-4 text-purple-500" />
            </div>
            <div className="mt-2">
              <span className="text-2xl font-bold text-purple-600 font-mono">{stats.lowInventoryCount}</span>
              <span className="text-[11px] text-slate-400 block mt-0.5">At or below reorder level</span>
            </div>
          </div>
        </div>
      </div>

      {/* =========================================================================
          OPERATIONAL CHARTS (4 CORE VISUALIZATIONS)
         ========================================================================= */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-100 gap-3">
          <div>
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Wrench className="w-5 h-5 text-blue-600" />
              Operational Analytics & Insights
            </h2>
            <p className="text-xs text-slate-500">
              Status distribution, priority breakdown, throughput velocity over time, and SLA performance.
            </p>
          </div>
        </div>

        {/* Charts Grid: 4 Core Charts */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Chart 1: Work Orders by Status */}
          <div className="p-4 rounded-xl border border-slate-100 bg-slate-50/50 flex flex-col justify-between">
            <div className="mb-2">
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                Work Orders by Status
              </h3>
              <p className="text-[11px] text-slate-500">Breakdown across FSM lifecycle stages</p>
            </div>
            <StatusDistributionChart data={stats.charts.statusDistribution} />
          </div>

          {/* Chart 2: Work Orders by Priority */}
          <div className="p-4 rounded-xl border border-slate-100 bg-slate-50/50 flex flex-col justify-between">
            <div className="mb-2">
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                Work Orders by Priority
              </h3>
              <p className="text-[11px] text-slate-500">Critical vs High vs Medium vs Low severity</p>
            </div>
            <PriorityDistributionChart data={stats.charts.priorityDistribution} />
          </div>

          {/* Chart 3: Work Orders Over Time */}
          <div className="p-4 rounded-xl border border-slate-100 bg-slate-50/50 flex flex-col justify-between">
            <div className="mb-2">
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                Work Orders Over Time
              </h3>
              <p className="text-[11px] text-slate-500">Daily creation vs completion velocity</p>
            </div>
            <OrdersOverTimeChart data={stats.charts.ordersOverTime} />
          </div>

          {/* Chart 4: SLA Performance */}
          <div className="p-4 rounded-xl border border-slate-100 bg-slate-50/50 flex flex-col justify-between">
            <div className="mb-2">
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                SLA Performance
              </h3>
              <p className="text-[11px] text-slate-500">Compliant vs At Risk (&lt;60m) vs Breached</p>
            </div>
            <SlaPerformanceChart data={stats.charts.slaPerformance} />
          </div>
        </div>
      </div>

      {/* 9-Stage Work Order Lifecycle Pipeline */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-sm font-bold text-slate-900">Work Order Lifecycle Pipeline (Deterministic FSM)</h2>
            <p className="text-xs text-slate-500">
              Strict deterministic state machine flow. Click any stage to filter work orders.
            </p>
          </div>
          <button 
            onClick={() => onNavigateToTab('work-orders')}
            className="text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center"
          >
            <span>View All Work Orders</span>
            <ArrowRight className="w-3.5 h-3.5 ml-1" />
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-9 gap-2.5">
          {stages.map((st) => {
            const count = stats.statusCounts[st.key] || 0;
            return (
              <button
                key={st.key}
                onClick={() => onSelectStage(st.key)}
                className={`p-3 rounded-xl border text-left transition-all hover:scale-[1.02] hover:shadow-xs flex flex-col justify-between cursor-pointer ${st.color}`}
              >
                <div>
                  <div className="text-[11px] font-bold uppercase tracking-wider">{st.label}</div>
                  <div className="text-[10px] opacity-80 truncate">{st.desc}</div>
                </div>
                <div className="mt-3 text-2xl font-extrabold">{count}</div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Live Dispatches & Recent Operations Table */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Active Work Orders Roster */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 shadow-xs p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-slate-900 flex items-center">
              <Wrench className="w-4 h-4 mr-2 text-slate-600" />
              Active Commercial Work Orders
            </h3>
            <button
              onClick={() => onNavigateToTab('work-orders')}
              className="text-xs font-semibold text-blue-600 hover:underline flex items-center gap-1"
            >
              <span>View All ({stats.totalOrders})</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="divide-y divide-slate-100 overflow-hidden">
            {workOrders.slice(0, 5).map((wo) => (
              <div
                key={wo.id}
                onClick={() => onSelectWorkOrder(wo)}
                className="py-3 flex items-center justify-between hover:bg-slate-50 px-2 rounded-lg cursor-pointer transition-colors"
              >
                <div className="space-y-1">
                  <div className="flex items-center space-x-2">
                    <span className="font-mono text-xs font-bold text-slate-900">{wo.workOrderNumber}</span>
                    <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full uppercase ${
                      wo.priority === 'CRITICAL' ? 'bg-rose-100 text-rose-800' :
                      wo.priority === 'HIGH' ? 'bg-amber-100 text-amber-800' :
                      wo.priority === 'MEDIUM' ? 'bg-blue-100 text-blue-800' : 'bg-slate-100 text-slate-700'
                    }`}>
                      {wo.priority}
                    </span>
                    <span className="text-xs font-medium text-slate-800 truncate max-w-md">{wo.title}</span>
                  </div>
                  <div className="flex items-center space-x-3 text-xs text-slate-500">
                    <span>{wo.facilityName}</span>
                    <span>&bull;</span>
                    <span>Tech: {wo.assignedTechnicianName || 'Unassigned'}</span>
                    <span>&bull;</span>
                    <span>Est: {wo.estimatedDurationHours}h</span>
                  </div>
                </div>

                <div className="flex items-center space-x-3">
                  <span className={`px-2.5 py-1 text-xs font-semibold rounded-lg border ${
                    wo.status === 'IN_PROGRESS' ? 'bg-amber-50 text-amber-800 border-amber-300' :
                    wo.status === 'COMPLETED' ? 'bg-teal-50 text-teal-800 border-teal-300' :
                    wo.status === 'ASSIGNED' ? 'bg-blue-50 text-blue-800 border-blue-300' :
                    'bg-slate-50 text-slate-700 border-slate-300'
                  }`}>
                    {wo.status}
                  </span>
                  <ArrowRight className="w-4 h-4 text-slate-400" />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Priority & Quick Actions Panel */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 space-y-4">
          <h3 className="text-sm font-bold text-slate-900">Priority Distribution Summary</h3>
          
          <div className="space-y-2">
            {[
              { label: 'Critical (Immediate Dispatch)', count: stats.priorityCounts.CRITICAL, color: 'bg-rose-500' },
              { label: 'High Priority (8h Resolution)', count: stats.priorityCounts.HIGH, color: 'bg-amber-500' },
              { label: 'Medium (Commercial Standard)', count: stats.priorityCounts.MEDIUM, color: 'bg-blue-500' },
              { label: 'Low (Scheduled Routine)', count: stats.priorityCounts.LOW, color: 'bg-slate-400' },
            ].map((p) => (
              <div key={p.label} className="flex items-center justify-between text-xs py-1">
                <div className="flex items-center space-x-2">
                  <div className={`w-3 h-3 rounded-sm ${p.color}`} />
                  <span className="text-slate-700 font-medium">{p.label}</span>
                </div>
                <span className="font-mono font-bold text-slate-900">{p.count}</span>
              </div>
            ))}
          </div>

          <div className="border-t border-slate-100 pt-4">
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-2">Fleet Readiness</h4>
            <div className="space-y-2 text-xs">
              <div className="flex justify-between py-1.5 border-b border-slate-50">
                <span className="text-slate-600">Available Technicians</span>
                <span className="text-emerald-700 font-bold font-mono">{stats.techStats.available} ready</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-50">
                <span className="text-slate-600">Active On Site</span>
                <span className="text-amber-700 font-bold font-mono">{stats.techStats.onSite} on site</span>
              </div>
              <div className="flex justify-between py-1.5">
                <span className="text-slate-600">In Transit (Mobile)</span>
                <span className="text-blue-700 font-bold font-mono">{stats.techStats.inTransit} en route</span>
              </div>
            </div>

            <div className="mt-4 pt-2">
              <button
                onClick={() => onNavigateToTab('dispatch-board')}
                className="w-full py-2 px-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 shadow-sm transition-colors cursor-pointer"
              >
                <span>Launch Interactive Dispatch Board</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
