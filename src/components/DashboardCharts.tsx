import React from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
  AreaChart,
  Area,
} from 'recharts';
import { DashboardStats } from '../types';

interface ChartsProps {
  charts: DashboardStats['charts'];
}

// Custom Tooltip for Charts
const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white border border-slate-200 p-2.5 rounded-lg shadow-lg text-xs text-slate-700">
        <p className="font-bold text-slate-900 mb-1">{label || payload[0]?.name}</p>
        {payload.map((p: any, idx: number) => (
          <div key={idx} className="flex items-center justify-between gap-3 text-[11px]">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: p.color || p.fill }} />
              <span className="text-slate-500">{p.name}:</span>
            </span>
            <span className="font-mono font-bold text-slate-900">{p.value}</span>
          </div>
        ))}
      </div>
    );
  }
  return null;
};

export const StatusDistributionChart: React.FC<{ data?: DashboardStats['charts']['statusDistribution'] }> = ({ data = [] }) => {
  const chartData = (data || []).filter(d => d.count > 0);
  if (chartData.length === 0) {
    return (
      <div className="h-64 w-full flex items-center justify-center text-xs text-slate-400">
        No status data available
      </div>
    );
  }
  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Tooltip content={<CustomTooltip />} />
          <Pie
            data={chartData}
            cx="50%"
            cy="50%"
            innerRadius={45}
            outerRadius={75}
            paddingAngle={3}
            dataKey="count"
            nameKey="label"
          >
            {chartData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} stroke="#ffffff" strokeWidth={2} />
            ))}
          </Pie>
          <Legend
            verticalAlign="bottom"
            height={36}
            formatter={(value) => <span className="text-[10px] text-slate-600">{value}</span>}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
};

export const PriorityDistributionChart: React.FC<{ data?: DashboardStats['charts']['priorityDistribution'] }> = ({ data = [] }) => {
  const chartData = data || [];
  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" opacity={0.6} />
          <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#64748b' }} interval={0} angle={-15} textAnchor="end" />
          <YAxis tick={{ fontSize: 10, fill: '#64748b' }} allowDecimals={false} />
          <Tooltip content={<CustomTooltip />} />
          <Bar dataKey="count" name="Work Orders" radius={[4, 4, 0, 0]}>
            {chartData.map((entry, index) => (
              <Cell key={`bar-${index}`} fill={entry.color} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

export const FacilityDistributionChart: React.FC<{ data?: DashboardStats['charts']['facilityDistribution'] }> = ({ data = [] }) => {
  const chartData = data || [];
  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData} layout="vertical" margin={{ top: 10, right: 20, left: 30, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" opacity={0.6} />
          <XAxis type="number" tick={{ fontSize: 10, fill: '#64748b' }} allowDecimals={false} />
          <YAxis dataKey="facilityName" type="category" tick={{ fontSize: 10, fill: '#64748b' }} width={80} />
          <Tooltip content={<CustomTooltip />} />
          <Legend
            verticalAlign="top"
            align="right"
            formatter={(val) => <span className="text-[10px] text-slate-600">{val}</span>}
          />
          <Bar dataKey="active" name="Active" fill="#3b82f6" stackId="a" radius={[0, 0, 0, 0]} />
          <Bar dataKey="completed" name="Completed" fill="#10b981" stackId="a" radius={[0, 4, 4, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

export const OrdersOverTimeChart: React.FC<{ data?: DashboardStats['charts']['ordersOverTime'] }> = ({ data = [] }) => {
  const chartData = data || [];
  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={chartData} margin={{ top: 10, right: 15, left: -20, bottom: 5 }}>
          <defs>
            <linearGradient id="createdGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#0284c7" stopOpacity={0.4} />
              <stop offset="95%" stopColor="#0284c7" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="completedGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
              <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" opacity={0.6} />
          <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#64748b' }} />
          <YAxis tick={{ fontSize: 10, fill: '#64748b' }} allowDecimals={false} />
          <Tooltip content={<CustomTooltip />} />
          <Legend
            verticalAlign="top"
            align="right"
            formatter={(val) => <span className="text-[10px] text-slate-600">{val}</span>}
          />
          <Area
            type="monotone"
            dataKey="created"
            name="Created"
            stroke="#0284c7"
            strokeWidth={2}
            fillOpacity={1}
            fill="url(#createdGrad)"
          />
          <Area
            type="monotone"
            dataKey="completed"
            name="Completed"
            stroke="#10b981"
            strokeWidth={2}
            fillOpacity={1}
            fill="url(#completedGrad)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
};

export const SlaPerformanceChart: React.FC<{ data?: DashboardStats['charts']['slaPerformance'] }> = ({ data = [] }) => {
  const chartData = data || [];
  if (chartData.length === 0) {
    return (
      <div className="h-64 w-full flex items-center justify-center text-xs text-slate-400">
        No SLA data available
      </div>
    );
  }
  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Tooltip content={<CustomTooltip />} />
          <Pie
            data={chartData}
            cx="50%"
            cy="50%"
            innerRadius={45}
            outerRadius={75}
            paddingAngle={4}
            dataKey="count"
            nameKey="name"
          >
            {chartData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} stroke="#ffffff" strokeWidth={2} />
            ))}
          </Pie>
          <Legend
            verticalAlign="bottom"
            height={36}
            formatter={(value) => <span className="text-[10px] text-slate-600">{value}</span>}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
};

export const TechnicianWorkloadChart: React.FC<{ data?: DashboardStats['charts']['technicianWorkload'] }> = ({ data = [] }) => {
  const chartData = data || [];
  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" opacity={0.6} />
          <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#64748b' }} />
          <YAxis tick={{ fontSize: 10, fill: '#64748b' }} allowDecimals={false} />
          <Tooltip content={<CustomTooltip />} />
          <Legend
            verticalAlign="top"
            align="right"
            formatter={(val) => <span className="text-[10px] text-slate-600">{val}</span>}
          />
          <Bar dataKey="activeJobs" name="Active Jobs" fill="#0284c7" radius={[4, 4, 0, 0]} />
          <Bar dataKey="completedJobs" name="Completed" fill="#10b981" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};
