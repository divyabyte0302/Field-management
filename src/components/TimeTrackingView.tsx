import React, { useState, useEffect } from 'react';
import { 
  Clock, Play, Square, AlertCircle, CheckCircle2, User, 
  Calendar, DollarSign, Filter, Plus, Trash2, RefreshCw, 
  Tag, FileText, ChevronRight, Activity, Zap, Layers 
} from 'lucide-react';
import { 
  TimeEntry, Technician, WorkOrder, RoleName 
} from '../types';
import { api } from '../services/api';

interface TimeTrackingViewProps {
  technicians: Technician[];
  workOrders: WorkOrder[];
  currentRole: RoleName;
  onSelectWorkOrder?: (order: WorkOrder) => void;
}

export const TimeTrackingView: React.FC<TimeTrackingViewProps> = ({
  technicians,
  workOrders,
  currentRole,
  onSelectWorkOrder
}) => {
  const [timeEntries, setTimeEntries] = useState<TimeEntry[]>([]);
  const [activeTimers, setActiveTimers] = useState<TimeEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Filters
  const [selectedTechId, setSelectedTechId] = useState('ALL');
  const [selectedWorkOrderId, setSelectedWorkOrderId] = useState('');
  const [selectedBillable, setSelectedBillable] = useState('ALL');
  const [selectedEntryType, setSelectedEntryType] = useState('ALL');

  // Manual Time Entry Modal State
  const [showManualModal, setShowManualModal] = useState(false);
  const [manualOrderId, setManualOrderId] = useState(workOrders[0]?.id || '');
  const [manualTechId, setManualTechId] = useState(technicians[0]?.id || '');
  const [manualDurationMinutes, setManualDurationMinutes] = useState(60);
  const [manualEntryType, setManualEntryType] = useState<'LABOR' | 'TRAVEL' | 'DIAGNOSIS' | 'WAIT_PARTS'>('LABOR');
  const [manualIsBillable, setManualIsBillable] = useState(true);
  const [manualHourlyRate, setManualHourlyRate] = useState(85);
  const [manualNotes, setManualNotes] = useState('');
  const [isSubmittingManual, setIsSubmittingManual] = useState(false);
  const [manualError, setManualError] = useState<string | null>(null);

  // Quick Live Timer Launcher
  const [quickTimerOrderId, setQuickTimerOrderId] = useState(workOrders[0]?.id || '');
  const [quickTimerTechId, setQuickTimerTechId] = useState(technicians[0]?.id || '');
  const [quickTimerType, setQuickTimerType] = useState('LABOR');
  const [isStartingTimer, setIsStartingTimer] = useState(false);
  const [timerActionError, setTimerActionError] = useState<string | null>(null);

  // Stop Live Timer Modal State
  const [stoppingTimer, setStoppingTimer] = useState<TimeEntry | null>(null);
  const [stopNotes, setStopNotes] = useState('');
  const [isSubmittingStop, setIsSubmittingStop] = useState(false);

  const canManageAllTime = currentRole === 'SUPER_ADMIN' || currentRole === 'ADMIN' || currentRole === 'DISPATCHER';

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const entriesRes = await api.getTimeEntries({
        technicianId: selectedTechId !== 'ALL' ? selectedTechId : undefined,
        workOrderId: selectedWorkOrderId || undefined,
        isBillable: selectedBillable !== 'ALL' ? selectedBillable : undefined,
        entryType: selectedEntryType !== 'ALL' ? selectedEntryType : undefined,
      }).catch(() => ({ data: [] }));

      const allList: TimeEntry[] = entriesRes.data || entriesRes || [];
      setTimeEntries(allList);
      setActiveTimers(allList.filter(e => e.isRunning));
    } catch (err) {
      console.error('Failed to load time entries:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [selectedTechId, selectedWorkOrderId, selectedBillable, selectedEntryType]);

  // Handle Quick Start Timer
  const handleStartTimer = async () => {
    if (!quickTimerOrderId || !quickTimerTechId) {
      setTimerActionError('Please select both a work order and technician.');
      return;
    }

    // Check if technician already has a running timer (client pre-check)
    const existingActive = activeTimers.find(t => t.technicianId === quickTimerTechId && t.isRunning);
    if (existingActive) {
      setTimerActionError(`Collision Prevention: Technician already has an active timer running on WO #${existingActive.workOrderId}. Please stop it before starting another.`);
      return;
    }

    setIsStartingTimer(true);
    setTimerActionError(null);
    try {
      await api.startTimer(quickTimerOrderId, {
        technicianId: quickTimerTechId,
        entryType: quickTimerType,
        isBillable: true,
        description: `Live job session started for WO #${quickTimerOrderId}`,
      });
      await fetchData();
    } catch (err: any) {
      setTimerActionError(err.message || 'Failed to start live timer');
    } finally {
      setIsStartingTimer(false);
    }
  };

  // Open Stop Timer
  const handleOpenStopTimer = (entry: TimeEntry) => {
    setStoppingTimer(entry);
    setStopNotes('');
    setTimerActionError(null);
  };

  // Submit Stop Timer
  const handleStopTimerSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stoppingTimer) return;

    setIsSubmittingStop(true);
    try {
      await api.stopTimer(stoppingTimer.workOrderId, {
        timeEntryId: stoppingTimer.id,
        notes: stopNotes.trim() || 'Completed live labor session',
      });
      setStoppingTimer(null);
      await fetchData();
    } catch (err: any) {
      setTimerActionError(err.message || 'Failed to stop live timer');
    } finally {
      setIsSubmittingStop(false);
    }
  };

  // Submit Manual Entry
  const handleManualEntrySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualOrderId || !manualTechId) {
      setManualError('Work Order and Technician are required');
      return;
    }
    if (manualDurationMinutes <= 0) {
      setManualError('Duration must be greater than zero');
      return;
    }

    setIsSubmittingManual(true);
    setManualError(null);
    try {
      await api.logTimeEntry(manualOrderId, {
        durationMinutes: Number(manualDurationMinutes),
        entryType: manualEntryType,
        notes: manualNotes.trim() || 'Manual field service labor entry',
      });
      setShowManualModal(false);
      setManualNotes('');
      await fetchData();
    } catch (err: any) {
      setManualError(err.message || 'Failed to log manual time entry');
    } finally {
      setIsSubmittingManual(false);
    }
  };

  const handleDeleteEntry = async (workOrderId: string, entryId: string) => {
    if (!window.confirm('Delete this time entry and recalculate work order labor costs?')) return;
    try {
      await api.deleteTimeEntry(workOrderId, entryId);
      await fetchData();
    } catch (err: any) {
      alert(`Failed to delete time entry: ${err.message}`);
    }
  };

  // Rollup Metrics
  const completedEntries = timeEntries.filter(e => !e.isRunning);
  const totalMinutes = completedEntries.reduce((sum, e) => sum + (e.durationMinutes || 0), 0);
  const totalHours = Math.round(totalMinutes / 60 * 10) / 10;
  const billableMinutes = completedEntries.filter(e => e.isBillable !== false).reduce((sum, e) => sum + (e.durationMinutes || 0), 0);
  const billableHours = Math.round(billableMinutes / 60 * 10) / 10;
  const billablePercentage = totalMinutes > 0 ? Math.round((billableMinutes / totalMinutes) * 100) : 100;
  const totalLaborCost = completedEntries.reduce((sum, e) => sum + (e.laborCost || ((e.durationMinutes / 60) * (e.hourlyRate || 85))), 0);

  return (
    <div className="space-y-6">
      {/* View Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
              <Clock className="w-5 h-5" />
            </span>
            <div>
              <h1 className="text-xl font-bold text-white tracking-wide font-mono">TECHNICIAN TIME TRACKING & TIMERS</h1>
              <p className="text-xs text-slate-400">Live stopwatch timers, overlap collision prevention, billable rates & labor cost accounting</p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchData}
            className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-slate-300 rounded-lg text-xs font-semibold flex items-center gap-1.5 border border-slate-700"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-cyan-400' : ''}`} />
            Refresh
          </button>

          <button
            onClick={() => setShowManualModal(true)}
            className="px-3.5 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow"
          >
            <Plus className="w-3.5 h-3.5" />
            Log Manual Time
          </button>
        </div>
      </div>

      {/* Action Error Banner */}
      {timerActionError && (
        <div className="p-3.5 bg-rose-950/40 border border-rose-800 text-rose-300 text-xs rounded-xl flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{timerActionError}</span>
          </div>
          <button onClick={() => setTimerActionError(null)} className="text-rose-400 hover:text-white text-xs">✕</button>
        </div>
      )}

      {/* Active Running Timers Section (Live Fleet Monitor) */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
            </span>
            <h3 className="text-xs font-bold text-white uppercase tracking-wider">
              Fleet Active Live Timers ({activeTimers.length} running)
            </h3>
          </div>
          <span className="text-[11px] text-slate-400">Enforcing single-timer overlap policy</span>
        </div>

        {activeTimers.length === 0 ? (
          <div className="p-4 bg-slate-950 rounded-lg border border-slate-800/80 text-center text-slate-500 text-xs">
            No technicians currently have a live timer running. Start a timer below to record real-time labor.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {activeTimers.map(timer => {
              const startDt = new Date(timer.startTime);
              const minutesElapsed = Math.max(1, Math.round((Date.now() - startDt.getTime()) / 60000));

              return (
                <div key={timer.id} className="bg-slate-950 border border-emerald-500/30 rounded-xl p-3.5 flex flex-col justify-between space-y-2">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="font-bold text-white text-xs flex items-center gap-1.5">
                        <User className="w-3.5 h-3.5 text-cyan-400" />
                        {timer.technicianName}
                      </div>
                      <div className="text-[11px] text-slate-400 mt-0.5">
                        WO #{timer.workOrderId} &bull; <span className="text-cyan-300 font-medium">{timer.entryType}</span>
                      </div>
                    </div>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 animate-pulse">
                      ACTIVE
                    </span>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-slate-800/80">
                    <div>
                      <span className="text-[10px] text-slate-500 uppercase font-bold">Elapsed:</span>{' '}
                      <span className="text-sm font-mono font-bold text-emerald-400">~{minutesElapsed} min</span>
                    </div>

                    <button
                      onClick={() => handleOpenStopTimer(timer)}
                      className="px-3 py-1 bg-rose-600 hover:bg-rose-500 text-white rounded font-semibold text-xs inline-flex items-center gap-1 shadow"
                    >
                      <Square className="w-3 h-3 fill-current" /> Stop Timer
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Quick Start Timer Bar */}
        <div className="bg-slate-950 p-3 rounded-lg border border-slate-800/80 flex flex-wrap items-center justify-between gap-3 text-xs">
          <span className="font-bold text-slate-300 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
            <Play className="w-3.5 h-3.5 text-cyan-400" /> Quick Launch Live Timer:
          </span>

          <div className="flex flex-wrap items-center gap-2">
            <select
              value={quickTimerOrderId}
              onChange={(e) => setQuickTimerOrderId(e.target.value)}
              className="bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1 text-slate-200 font-medium max-w-[200px] truncate"
            >
              {workOrders.filter(w => w.status !== 'CLOSED').map(w => (
                <option key={w.id} value={w.id}>{w.workOrderNumber} - {w.title.slice(0, 25)}</option>
              ))}
            </select>

            <select
              value={quickTimerTechId}
              onChange={(e) => setQuickTimerTechId(e.target.value)}
              className="bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1 text-slate-200 font-medium"
            >
              {technicians.map(t => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>

            <select
              value={quickTimerType}
              onChange={(e) => setQuickTimerType(e.target.value)}
              className="bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1 text-slate-200 font-medium"
            >
              <option value="LABOR">Labor</option>
              <option value="DIAGNOSIS">Diagnosis</option>
              <option value="TRAVEL">Travel</option>
              <option value="WAIT_PARTS">Wait Parts</option>
            </select>

            <button
              onClick={handleStartTimer}
              disabled={isStartingTimer}
              className="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded font-semibold text-xs inline-flex items-center gap-1 shadow"
            >
              {isStartingTimer ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Play className="w-3 h-3" />}
              Start Live Timer
            </button>
          </div>
        </div>
      </div>

      {/* Rollup Performance Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl">
          <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Total Labor Logged</div>
          <div className="text-2xl font-black text-white font-mono mt-1">{totalHours} hrs</div>
          <div className="text-[11px] text-slate-400 mt-1">{totalMinutes} total cumulative minutes</div>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl">
          <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Billable Ratio</div>
          <div className="text-2xl font-black text-emerald-400 font-mono mt-1">{billablePercentage}%</div>
          <div className="text-[11px] text-slate-400 mt-1">{billableHours} hrs billable of {totalHours} total</div>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl">
          <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Labor Cost (COGS)</div>
          <div className="text-2xl font-black text-cyan-300 font-mono mt-1">${totalLaborCost.toFixed(2)}</div>
          <div className="text-[11px] text-slate-400 mt-1">Calculated using role standard rates</div>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl">
          <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Logged Entries Count</div>
          <div className="text-2xl font-black text-blue-300 font-mono mt-1">{completedEntries.length}</div>
          <div className="text-[11px] text-slate-400 mt-1">Verified work order time intervals</div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-slate-900 border border-slate-800 p-3.5 rounded-xl flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1.5">
            <User className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={selectedTechId}
              onChange={(e) => setSelectedTechId(e.target.value)}
              className="bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-slate-200 font-medium"
            >
              <option value="ALL">All Technicians</option>
              {technicians.map(t => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-1.5">
            <Tag className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={selectedEntryType}
              onChange={(e) => setSelectedEntryType(e.target.value)}
              className="bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-slate-200 font-medium"
            >
              <option value="ALL">All Activity Types</option>
              <option value="LABOR">Labor</option>
              <option value="DIAGNOSIS">Diagnosis</option>
              <option value="TRAVEL">Travel</option>
              <option value="WAIT_PARTS">Waiting on Parts</option>
            </select>
          </div>

          <div className="flex items-center gap-1.5">
            <DollarSign className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={selectedBillable}
              onChange={(e) => setSelectedBillable(e.target.value)}
              className="bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-slate-200 font-medium"
            >
              <option value="ALL">All Billing Classes</option>
              <option value="true">Billable Only</option>
              <option value="false">Non-Billable Only</option>
            </select>
          </div>
        </div>

        <div className="text-slate-400">
          Showing <span className="text-white font-bold">{timeEntries.length}</span> time records
        </div>
      </div>

      {/* Time Entries Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-950 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800">
            <tr>
              <th className="py-3 px-4">Technician</th>
              <th className="py-3 px-4">Work Order</th>
              <th className="py-3 px-4">Activity Type</th>
              <th className="py-3 px-4">Duration</th>
              <th className="py-3 px-4">Rate & Labor Cost</th>
              <th className="py-3 px-4">Billable</th>
              <th className="py-3 px-4">Description / Notes</th>
              <th className="py-3 px-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {timeEntries.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-8 text-center text-slate-500">
                  No time tracking records found matching criteria.
                </td>
              </tr>
            ) : (
              timeEntries.map(entry => {
                const wo = workOrders.find(w => w.id === entry.workOrderId);
                const cost = entry.laborCost || ((entry.durationMinutes / 60) * (entry.hourlyRate || 85));

                return (
                  <tr key={entry.id} className="hover:bg-slate-800/40 transition-all">
                    <td className="py-3 px-4 font-semibold text-slate-200">
                      <div className="flex items-center gap-1.5">
                        <User className="w-3.5 h-3.5 text-cyan-400" />
                        {entry.technicianName}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-mono font-bold text-cyan-400">
                        {wo?.workOrderNumber || entry.workOrderId}
                      </div>
                      <div className="text-[10px] text-slate-400 max-w-[160px] truncate">
                        {wo?.title || 'Field Service Job'}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                        entry.entryType === 'LABOR' ? 'bg-blue-500/20 text-blue-400' :
                        entry.entryType === 'DIAGNOSIS' ? 'bg-purple-500/20 text-purple-400' :
                        entry.entryType === 'TRAVEL' ? 'bg-amber-500/20 text-amber-400' :
                        'bg-slate-700 text-slate-300'
                      }`}>
                        {entry.entryType}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-mono font-bold text-white">
                      {entry.isRunning ? (
                        <span className="text-emerald-400 animate-pulse">Running...</span>
                      ) : (
                        <span>
                          {entry.durationMinutes}m{' '}
                          <span className="text-[10px] text-slate-400 font-normal">
                            ({(entry.durationMinutes / 60).toFixed(1)}h)
                          </span>
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 font-mono">
                      <div className="text-slate-200 font-bold">${cost.toFixed(2)}</div>
                      <div className="text-[10px] text-slate-500">@ ${entry.hourlyRate || 85}/hr</div>
                    </td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                        entry.isBillable !== false ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-slate-800 text-slate-400'
                      }`}>
                        {entry.isBillable !== false ? 'YES' : 'NO'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-300 max-w-[220px] truncate" title={entry.notes || entry.description}>
                      {entry.notes || entry.description || <span className="text-slate-500 italic">No notes</span>}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {entry.isRunning ? (
                          <button
                            onClick={() => handleOpenStopTimer(entry)}
                            className="px-2 py-1 bg-rose-600 hover:bg-rose-500 text-white rounded font-semibold text-[11px]"
                          >
                            Stop
                          </button>
                        ) : canManageAllTime ? (
                          <button
                            onClick={() => handleDeleteEntry(entry.workOrderId, entry.id)}
                            title="Delete time entry"
                            className="p-1 text-slate-400 hover:text-rose-400 rounded hover:bg-rose-950/30"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* STOP TIMER MODAL */}
      {stoppingTimer && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white border border-slate-200 rounded-2xl shadow-xl p-6 space-y-4 text-slate-900">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Square className="w-4 h-4 text-rose-600" />
                Stop Live Job Timer
              </h3>
              <button
                onClick={() => setStoppingTimer(null)}
                className="text-slate-400 hover:text-slate-700 text-xs cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 text-xs space-y-1">
              <div className="font-bold text-slate-900">Technician: {stoppingTimer.technicianName}</div>
              <div className="text-slate-500">Work Order: <span className="font-mono text-blue-600 font-semibold">{stoppingTimer.workOrderId}</span></div>
              <div className="text-slate-500">Started: <span className="text-slate-700 font-mono">{new Date(stoppingTimer.startTime).toLocaleTimeString()}</span></div>
            </div>

            <form onSubmit={handleStopTimerSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Session Completion Notes / Tasks Performed
                </label>
                <textarea
                  rows={3}
                  value={stopNotes}
                  onChange={(e) => setStopNotes(e.target.value)}
                  placeholder="Completed system calibration, replaced filter assembly..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setStoppingTimer(null)}
                  className="px-3 py-1.5 text-xs text-slate-500 hover:text-slate-800 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingStop}
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-xs cursor-pointer"
                >
                  {isSubmittingStop ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Square className="w-3.5 h-3.5 fill-current" />}
                  Stop & Record Labor
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MANUAL TIME ENTRY MODAL */}
      {showManualModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-white border border-slate-200 rounded-2xl shadow-xl p-6 space-y-4 text-slate-900">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Clock className="w-4 h-4 text-blue-600" />
                Record Manual Time Entry
              </h3>
              <button
                onClick={() => setShowManualModal(false)}
                className="text-slate-400 hover:text-slate-700 text-xs cursor-pointer"
              >
                ✕
              </button>
            </div>

            {manualError && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-lg flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{manualError}</span>
              </div>
            )}

            <form onSubmit={handleManualEntrySubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Target Work Order</label>
                <select
                  required
                  value={manualOrderId}
                  onChange={(e) => setManualOrderId(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 cursor-pointer"
                >
                  {workOrders.map(w => (
                    <option key={w.id} value={w.id}>
                      {w.workOrderNumber} - {w.title} ({w.facilityName})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Technician</label>
                  <select
                    required
                    value={manualTechId}
                    onChange={(e) => setManualTechId(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 cursor-pointer"
                  >
                    {technicians.map(t => (
                      <option key={t.id} value={t.id}>{t.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Activity Type</label>
                  <select
                    value={manualEntryType}
                    onChange={(e) => setManualEntryType(e.target.value as any)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 cursor-pointer"
                  >
                    <option value="LABOR">Direct Labor</option>
                    <option value="DIAGNOSIS">Diagnostics / Inspection</option>
                    <option value="TRAVEL">Transit / Travel Time</option>
                    <option value="WAIT_PARTS">Waiting for Parts</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Duration (Minutes)</label>
                  <input
                    type="number"
                    min={5}
                    step={5}
                    required
                    value={manualDurationMinutes}
                    onChange={(e) => setManualDurationMinutes(Number(e.target.value))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-mono"
                  />
                  <span className="text-[10px] text-slate-500 mt-0.5 block">
                    ={(manualDurationMinutes / 60).toFixed(2)} hours
                  </span>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Hourly Rate ($)</label>
                  <input
                    type="number"
                    min={0}
                    value={manualHourlyRate}
                    onChange={(e) => setManualHourlyRate(Number(e.target.value))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-mono"
                  />
                  <span className="text-[10px] text-slate-500 mt-0.5 block">
                    Calculated labor cost: ${((manualDurationMinutes / 60) * manualHourlyRate).toFixed(2)}
                  </span>
                </div>
              </div>

              <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 flex items-center justify-between">
                <div>
                  <div className="text-xs font-semibold text-slate-900">Billable to Customer</div>
                  <div className="text-[11px] text-slate-500">Include in final work order invoice rollup</div>
                </div>
                <input
                  type="checkbox"
                  checked={manualIsBillable}
                  onChange={(e) => setManualIsBillable(e.target.checked)}
                  className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Notes / Description</label>
                <textarea
                  rows={2}
                  required
                  value={manualNotes}
                  onChange={(e) => setManualNotes(e.target.value)}
                  placeholder="Describe maintenance actions taken..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowManualModal(false)}
                  className="px-3 py-1.5 text-xs text-slate-500 hover:text-slate-800 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingManual}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-xs cursor-pointer"
                >
                  {isSubmittingManual ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                  Record Time Entry
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
