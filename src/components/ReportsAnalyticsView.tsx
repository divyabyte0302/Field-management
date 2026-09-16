import React, { useState, useEffect } from 'react';
import { 
  BarChart3, TrendingUp, DollarSign, Clock, ShieldCheck, 
  Award, Download, FileSpreadsheet, RefreshCw, AlertCircle,
  Users, CheckCircle2, ChevronRight, Layers
} from 'lucide-react';
import { api } from '../services/api';
import { RoleName } from '../types';

interface ReportsAnalyticsViewProps {
  currentRole?: RoleName;
}

export const ReportsAnalyticsView: React.FC<ReportsAnalyticsViewProps> = ({ currentRole }) => {
  const [report, setReport] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<'30d' | '90d' | 'ytd'>('30d');

  const fetchReports = async () => {
    setLoading(true);
    try {
      const data = await api.getReports();
      setReport(data);
    } catch (err) {
      console.error('Failed to load reports:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, []);

  const handleExportCsv = () => {
    if (!report) return;
    const csvRows = [
      ['Metric', 'Value'],
      ['Total Work Orders', report.kpis.totalOrders],
      ['Completed Work Orders', report.kpis.completedOrders],
      ['SLA Compliance Rate', `${report.kpis.slaComplianceRate}%`],
      ['First-Time Fix Rate', `${report.kpis.firstTimeFixRate}%`],
      ['Mean Time to Respond', `${report.kpis.meanTimeToRespondMinutes} mins`],
      ['Mean Time to Resolve', `${report.kpis.meanTimeToResolveMinutes} mins`],
      ['Total Labor Hours', report.kpis.totalLaborHours],
      ['Total Labor Cost ($)', report.kpis.totalLaborCost],
      ['Total Parts Cost ($)', report.kpis.totalPartsCost],
      ['Total Service Valuation ($)', report.kpis.totalServiceValuation],
      ['Technician Utilization Rate', `${report.kpis.technicianUtilizationRate}%`],
    ];

    const csvContent = 'data:text/csv;charset=utf-8,' + csvRows.map(e => e.join(',')).join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `keystone_operations_report_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (loading || !report) {
    return (
      <div className="min-h-[400px] flex flex-col items-center justify-center text-slate-400 gap-3">
        <RefreshCw className="w-8 h-8 animate-spin text-cyan-400" />
        <span className="text-xs font-mono tracking-wider uppercase text-slate-300">
          Aggregating Operational Telemetry & KPI Rollups...
        </span>
      </div>
    );
  }

  const { kpis, priorityBreakdown, monthlyTrends, technicianLeaderboard } = report;

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2.5">
            <BarChart3 className="w-6 h-6 text-cyan-400" />
            Executive Operations & SLA Analytics
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Real-time operational KPIs, Mean-Time-To-Resolution (MTTR), labor/parts financial valuation, and workforce performance.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            onClick={fetchReports}
            className="p-2 rounded-lg border border-slate-800 bg-slate-900 text-slate-400 hover:text-white hover:bg-slate-800 transition"
            title="Refresh analytics"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <button
            onClick={handleExportCsv}
            className="flex items-center gap-2 px-3.5 py-1.5 rounded-lg border border-cyan-800/60 bg-cyan-950/60 text-cyan-300 hover:bg-cyan-900/60 text-xs font-semibold transition shadow-sm"
          >
            <Download className="w-3.5 h-3.5 text-cyan-400" />
            Export Executive CSV
          </button>
        </div>
      </div>

      {/* Top Level Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1: SLA Compliance */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-medium uppercase tracking-wider">SLA Compliance Rate</span>
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
          </div>
          <div>
            <div className="text-2xl font-bold text-emerald-400">
              {kpis.slaComplianceRate}%
            </div>
            <div className="text-[11px] text-slate-400 mt-1">
              Target: 95.0% &bull; <span className="text-emerald-400 font-semibold">+0.8% above SLA</span>
            </div>
          </div>
        </div>

        {/* Metric 2: MTTR */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-medium uppercase tracking-wider">Mean Time To Resolution</span>
            <Clock className="w-4 h-4 text-cyan-400" />
          </div>
          <div>
            <div className="text-2xl font-bold text-white">
              {Math.floor(kpis.meanTimeToResolveMinutes / 60)}h {kpis.meanTimeToResolveMinutes % 60}m
            </div>
            <div className="text-[11px] text-slate-400 mt-1">
              MTTR avg: {kpis.meanTimeToRespondMinutes}m initial response
            </div>
          </div>
        </div>

        {/* Metric 3: First Time Fix Rate */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-medium uppercase tracking-wider">First-Time Fix Rate</span>
            <Award className="w-4 h-4 text-amber-400" />
          </div>
          <div>
            <div className="text-2xl font-bold text-amber-400">
              {kpis.firstTimeFixRate}%
            </div>
            <div className="text-[11px] text-slate-400 mt-1">
              Industry benchmark: 86.0%
            </div>
          </div>
        </div>

        {/* Metric 4: Total Valuation */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-medium uppercase tracking-wider">Total Service Valuation</span>
            <DollarSign className="w-4 h-4 text-purple-400" />
          </div>
          <div>
            <div className="text-2xl font-bold text-purple-300 font-mono">
              ${kpis.totalServiceValuation.toLocaleString()}
            </div>
            <div className="text-[11px] text-slate-400 mt-1">
              Labor: ${kpis.totalLaborCost.toLocaleString()} | Parts: ${kpis.totalPartsCost.toLocaleString()}
            </div>
          </div>
        </div>
      </div>

      {/* Priority Breakdown & Monthly Trends */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Priority SLA Matrix */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
          <h3 className="text-sm font-bold text-white mb-4 flex items-center justify-between">
            <span>SLA Performance by Priority Tier</span>
            <span className="text-xs text-slate-400 font-normal">Active Policies</span>
          </h3>

          <div className="space-y-4">
            {priorityBreakdown.map((item: any) => (
              <div key={item.priority} className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-300">
                    {item.priority} PRIORITY ({item.count} orders)
                  </span>
                  <span className="font-bold text-cyan-400">{item.compliance}% Compliant</span>
                </div>
                <div className="w-full bg-slate-950 rounded-full h-2.5 overflow-hidden border border-slate-800">
                  <div 
                    className={`h-full rounded-full ${
                      item.compliance >= 95 ? 'bg-emerald-500' : item.compliance >= 90 ? 'bg-cyan-500' : 'bg-amber-500'
                    }`}
                    style={{ width: `${item.compliance}%` }}
                  />
                </div>
              </div>
            ))}
          </div>

          <div className="mt-6 pt-4 border-t border-slate-800 text-xs text-slate-400 flex items-center justify-between">
            <span>Technician Fleet Utilization:</span>
            <span className="text-white font-bold">{kpis.technicianUtilizationRate}%</span>
          </div>
        </div>

        {/* Monthly Trend Bars */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
          <h3 className="text-sm font-bold text-white mb-4 flex items-center justify-between">
            <span>Monthly Service Volume & Spend Trend</span>
            <span className="text-xs text-slate-400 font-normal">Last 6 Months</span>
          </h3>

          <div className="flex items-end justify-between h-48 pt-6 pb-2 px-2">
            {monthlyTrends.map((m: any) => {
              const maxCost = 30000;
              const heightPct = Math.min(100, Math.round((m.cost / maxCost) * 100));
              return (
                <div key={m.month} className="flex flex-col items-center gap-2 group flex-1">
                  <div className="text-[10px] font-mono text-slate-400 opacity-0 group-hover:opacity-100 transition">
                    ${(m.cost / 1000).toFixed(1)}k
                  </div>
                  <div className="w-8 sm:w-10 bg-slate-950 rounded-t-lg relative flex items-end justify-center border border-slate-800 overflow-hidden h-36">
                    <div 
                      className="w-full bg-gradient-to-t from-cyan-600 to-cyan-400 transition-all duration-300 group-hover:brightness-110 rounded-t"
                      style={{ height: `${heightPct}%` }}
                    />
                  </div>
                  <span className="text-xs font-semibold text-slate-300">{m.month}</span>
                </div>
              );
            })}
          </div>

          <div className="mt-4 pt-4 border-t border-slate-800 text-xs text-slate-400 flex items-center justify-between">
            <span>Total Logged Labor Hours:</span>
            <span className="text-cyan-400 font-bold font-mono">{kpis.totalLaborHours} Hours</span>
          </div>
        </div>
      </div>

      {/* Technician Leaderboard */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-xl">
        <h3 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
          <Users className="w-4 h-4 text-cyan-400" />
          Field Technician Productivity Leaderboard
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950 text-slate-400 uppercase text-[10px] font-semibold border-b border-slate-800">
              <tr>
                <th className="px-4 py-3">Technician</th>
                <th className="px-4 py-3">Jobs Completed</th>
                <th className="px-4 py-3">Logged Hours</th>
                <th className="px-4 py-3">Client Rating</th>
                <th className="px-4 py-3">Dispatch Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800 text-slate-300">
              {technicianLeaderboard.map((tech: any, idx: number) => (
                <tr key={tech.id} className="hover:bg-slate-800/40 transition">
                  <td className="px-4 py-3 font-semibold text-white flex items-center gap-2">
                    <span className="w-5 text-slate-500 font-mono text-xs">{idx + 1}.</span>
                    {tech.name}
                  </td>
                  <td className="px-4 py-3 font-bold text-cyan-400">{tech.jobsCompleted} work orders</td>
                  <td className="px-4 py-3 font-mono">{tech.hoursLogged} hrs</td>
                  <td className="px-4 py-3 font-semibold text-amber-400">★ {tech.rating} / 5.0</td>
                  <td className="px-4 py-3">
                    <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-950 border border-slate-800 text-slate-300">
                      {tech.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
