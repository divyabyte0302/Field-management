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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2.5">
            <BarChart3 className="w-6 h-6 text-blue-600" />
            Executive Operations & SLA Analytics
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Real-time operational KPIs, Mean-Time-To-Resolution (MTTR), labor/parts financial valuation, and workforce performance.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            onClick={fetchReports}
            className="p-2 rounded-lg border border-slate-200 bg-white text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition shadow-xs"
            title="Refresh analytics"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <button
            onClick={handleExportCsv}
            className="flex items-center gap-2 px-3.5 py-1.5 rounded-lg border border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100 text-xs font-semibold transition shadow-xs"
          >
            <Download className="w-3.5 h-3.5 text-blue-600" />
            Export Executive CSV
          </button>
        </div>
      </div>

      {/* Top Level Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1: SLA Compliance */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 flex flex-col justify-between shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">SLA Compliance Rate</span>
            <div className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600">
              <ShieldCheck className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-2xl font-bold text-slate-900">
              {kpis.slaComplianceRate}%
            </div>
            <div className="text-[11px] text-slate-500 mt-1">
              Target: 95.0% &bull; <span className="text-emerald-600 font-semibold">+0.8% above SLA</span>
            </div>
          </div>
        </div>

        {/* Metric 2: MTTR */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 flex flex-col justify-between shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Mean Time To Resolution</span>
            <div className="p-1.5 rounded-lg bg-blue-50 text-blue-600">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-2xl font-bold text-slate-900">
              {Math.floor(kpis.meanTimeToResolveMinutes / 60)}h {kpis.meanTimeToResolveMinutes % 60}m
            </div>
            <div className="text-[11px] text-slate-500 mt-1">
              MTTR avg: {kpis.meanTimeToRespondMinutes}m initial response
            </div>
          </div>
        </div>

        {/* Metric 3: First Time Fix Rate */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 flex flex-col justify-between shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">First-Time Fix Rate</span>
            <div className="p-1.5 rounded-lg bg-amber-50 text-amber-600">
              <Award className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-2xl font-bold text-slate-900">
              {kpis.firstTimeFixRate}%
            </div>
            <div className="text-[11px] text-slate-500 mt-1">
              Industry benchmark: 86.0%
            </div>
          </div>
        </div>

        {/* Metric 4: Total Valuation */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 flex flex-col justify-between shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Total Service Valuation</span>
            <div className="p-1.5 rounded-lg bg-purple-50 text-purple-600">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-2xl font-bold text-purple-700 font-mono">
              ${kpis.totalServiceValuation.toLocaleString()}
            </div>
            <div className="text-[11px] text-slate-500 mt-1">
              Labor: ${kpis.totalLaborCost.toLocaleString()} | Parts: ${kpis.totalPartsCost.toLocaleString()}
            </div>
          </div>
        </div>
      </div>

      {/* Priority Breakdown & Monthly Trends */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Priority SLA Matrix */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
          <h3 className="text-sm font-bold text-slate-900 mb-4 flex items-center justify-between">
            <span>SLA Performance by Priority Tier</span>
            <span className="text-xs text-slate-500 font-normal">Active Policies</span>
          </h3>

          <div className="space-y-4">
            {priorityBreakdown.map((item: any) => (
              <div key={item.priority} className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-700">
                    {item.priority} PRIORITY ({item.count} orders)
                  </span>
                  <span className="font-bold text-blue-600">{item.compliance}% Compliant</span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden border border-slate-200">
                  <div 
                    className={`h-full rounded-full ${
                      item.compliance >= 95 ? 'bg-emerald-500' : item.compliance >= 90 ? 'bg-blue-500' : 'bg-amber-500'
                    }`}
                    style={{ width: `${item.compliance}%` }}
                  />
                </div>
              </div>
            ))}
          </div>

          <div className="mt-6 pt-4 border-t border-slate-100 text-xs text-slate-500 flex items-center justify-between">
            <span>Technician Fleet Utilization:</span>
            <span className="text-slate-900 font-bold">{kpis.technicianUtilizationRate}%</span>
          </div>
        </div>

        {/* Monthly Trend Bars */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
          <h3 className="text-sm font-bold text-slate-900 mb-4 flex items-center justify-between">
            <span>Monthly Service Volume & Spend Trend</span>
            <span className="text-xs text-slate-500 font-normal">Last 6 Months</span>
          </h3>

          <div className="flex items-end justify-between h-48 pt-6 pb-2 px-2">
            {monthlyTrends.map((m: any) => {
              const maxCost = 30000;
              const heightPct = Math.min(100, Math.round((m.cost / maxCost) * 100));
              return (
                <div key={m.month} className="flex flex-col items-center gap-2 group flex-1">
                  <div className="text-[10px] font-mono text-slate-500 opacity-0 group-hover:opacity-100 transition">
                    ${(m.cost / 1000).toFixed(1)}k
                  </div>
                  <div className="w-8 sm:w-10 bg-slate-100 rounded-t-lg relative flex items-end justify-center border border-slate-200 overflow-hidden h-36">
                    <div 
                      className="w-full bg-gradient-to-t from-blue-600 to-cyan-500 transition-all duration-300 group-hover:brightness-105 rounded-t"
                      style={{ height: `${heightPct}%` }}
                    />
                  </div>
                  <span className="text-xs font-semibold text-slate-600">{m.month}</span>
                </div>
              );
            })}
          </div>

          <div className="mt-4 pt-4 border-t border-slate-100 text-xs text-slate-500 flex items-center justify-between">
            <span>Total Logged Labor Hours:</span>
            <span className="text-blue-600 font-bold font-mono">{kpis.totalLaborHours} Hours</span>
          </div>
        </div>
      </div>

      {/* Technician Leaderboard */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
        <h3 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-2">
          <Users className="w-4 h-4 text-blue-600" />
          Field Technician Productivity Leaderboard
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 uppercase text-[10px] font-semibold border-b border-slate-200">
              <tr>
                <th className="px-4 py-3">Technician</th>
                <th className="px-4 py-3">Jobs Completed</th>
                <th className="px-4 py-3">Logged Hours</th>
                <th className="px-4 py-3">Client Rating</th>
                <th className="px-4 py-3">Dispatch Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {technicianLeaderboard.map((tech: any, idx: number) => (
                <tr key={tech.id} className="hover:bg-slate-50/80 transition">
                  <td className="px-4 py-3 font-semibold text-slate-900 flex items-center gap-2">
                    <span className="w-5 text-slate-400 font-mono text-xs">{idx + 1}.</span>
                    {tech.name}
                  </td>
                  <td className="px-4 py-3 font-bold text-blue-600">{tech.jobsCompleted} work orders</td>
                  <td className="px-4 py-3 font-mono">{tech.hoursLogged} hrs</td>
                  <td className="px-4 py-3 font-semibold text-amber-600">★ {tech.rating} / 5.0</td>
                  <td className="px-4 py-3">
                    <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 border border-slate-200 text-slate-700">
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
