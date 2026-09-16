import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { WorkOrder, WorkOrderStatus, Part, Comment, Attachment } from '../types';
import { api } from '../services/api';
import { 
  Wrench, Play, CheckCircle2, PauseCircle, Clock, 
  Package, AlertTriangle, RefreshCw, Check, ArrowRight, 
  MapPin, ShieldAlert, Navigation, Camera, MessageSquare,
  FileCheck, User, Calendar, CheckSquare, Sparkles, Send
} from 'lucide-react';

export const TechnicianPortal: React.FC = () => {
  const { user } = useAuth();
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([]);
  const [parts, setParts] = useState<Part[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<WorkOrder | null>(null);
  const [loading, setLoading] = useState(true);

  // Workflow filter tabs for mobile
  const [workflowFilter, setWorkflowFilter] = useState<'ALL' | 'PENDING' | 'IN_PROGRESS' | 'COMPLETED'>('ALL');

  // Time logging modal / state
  const [logTimeMinutes, setLogTimeMinutes] = useState(60);
  const [timeType, setTimeType] = useState<'TRAVEL' | 'DIAGNOSIS' | 'LABOR' | 'WAIT_PARTS'>('LABOR');
  const [timeNotes, setTimeNotes] = useState('');
  const [submittingTime, setSubmittingTime] = useState(false);

  // Part allocation modal / state
  const [selectedPartId, setSelectedPartId] = useState('');
  const [partQuantity, setPartQuantity] = useState(1);
  const [submittingPart, setSubmittingPart] = useState(false);

  // Job photo / attachment state
  const [photoUrl, setPhotoUrl] = useState('');
  const [photoCaption, setPhotoCaption] = useState('');
  const [submittingPhoto, setSubmittingPhoto] = useState(false);

  // Field notes / comment state
  const [workNote, setWorkNote] = useState('');
  const [submittingNote, setSubmittingNote] = useState(false);

  // Customer sign-off capture modal
  const [showSignOffModal, setShowSignOffModal] = useState(false);
  const [signOffName, setSignOffName] = useState('');
  const [signOffNotes, setSignOffNotes] = useState('');
  const [submittingSignOff, setSubmittingSignOff] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [woData, partsData] = await Promise.all([
        api.getWorkOrders(),
        api.getParts(),
      ]);
      setWorkOrders(woData);
      setParts(partsData);
      if (partsData.length > 0 && !selectedPartId) {
        setSelectedPartId(partsData[0].id);
      }
      if (selectedOrder) {
        const fresh = woData.find(w => w.id === selectedOrder.id);
        if (fresh) setSelectedOrder(fresh);
      } else if (woData.length > 0) {
        setSelectedOrder(woData[0]);
      }
    } catch (err) {
      console.error('Failed to load technician data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleTransition = async (targetStatus: WorkOrderStatus, holdReason?: string, customNotes?: string) => {
    if (!selectedOrder) return;
    try {
      const updated = await api.transitionWorkOrder(selectedOrder.id, {
        targetStatus,
        notes: customNotes || `Technician action: ${targetStatus} by ${user?.firstName} ${user?.lastName}`,
        holdReason,
      });
      setSelectedOrder(updated);
      await fetchData();
    } catch (err: any) {
      alert(`Transition error: ${err.message}`);
    }
  };

  const handleStartTravel = async () => {
    if (!selectedOrder) return;
    try {
      // Add a comment/audit note that technician is en route
      await api.addWorkOrderComment(selectedOrder.id, `🚗 Field Specialist ${user?.firstName} ${user?.lastName} is en route to site (${selectedOrder.facilityName}). Estimated travel 25 mins.`);
      alert(`Travel started. Dispatch and customer notified that you are en route to ${selectedOrder.facilityName}.`);
      await fetchData();
    } catch (err: any) {
      alert(`Failed to log travel: ${err.message}`);
    }
  };

  const handleLogTime = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrder) return;
    setSubmittingTime(true);
    try {
      await api.logTimeEntry(selectedOrder.id, {
        durationMinutes: Number(logTimeMinutes),
        entryType: timeType,
        notes: timeNotes || 'Standard maintenance performed',
      });
      setTimeNotes('');
      await fetchData();
    } catch (err: any) {
      alert(`Time logging error: ${err.message}`);
    } finally {
      setSubmittingTime(false);
    }
  };

  const handleAddPart = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrder || !selectedPartId) return;
    setSubmittingPart(true);
    try {
      await api.allocatePart(selectedOrder.id, {
        partId: selectedPartId,
        quantity: Number(partQuantity),
      });
      await fetchData();
    } catch (err: any) {
      alert(`Part allocation error: ${err.message}`);
    } finally {
      setSubmittingPart(false);
    }
  };

  const handleAddPhoto = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrder || !photoUrl.trim()) return;
    setSubmittingPhoto(true);
    try {
      await api.addWorkOrderAttachment(selectedOrder.id, {
        fileName: 'Field-Work-Photo.jpg',
        url: photoUrl.trim(),
        caption: photoCaption.trim() || 'Work completion photo',
      });
      setPhotoUrl('');
      setPhotoCaption('');
      await fetchData();
    } catch (err: any) {
      alert(`Photo upload error: ${err.message}`);
    } finally {
      setSubmittingPhoto(false);
    }
  };

  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrder || !workNote.trim()) return;
    setSubmittingNote(true);
    try {
      await api.addWorkOrderComment(selectedOrder.id, workNote.trim());
      setWorkNote('');
      await fetchData();
    } catch (err: any) {
      alert(`Failed to add note: ${err.message}`);
    } finally {
      setSubmittingNote(false);
    }
  };

  const handleCaptureSignOff = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrder || !signOffName.trim()) return;
    setSubmittingSignOff(true);
    try {
      const signOffText = `Customer Sign-Off Captured: Accepted on-site by ${signOffName.trim()} (${signOffNotes || 'Signed via mobile'}). Field repair completed.`;
      await api.addWorkOrderComment(selectedOrder.id, `✍️ ${signOffText}`);
      
      // Complete the work order
      await api.transitionWorkOrder(selectedOrder.id, {
        targetStatus: 'COMPLETED',
        notes: signOffText,
      });

      setShowSignOffModal(false);
      setSignOffName('');
      setSignOffNotes('');
      await fetchData();
    } catch (err: any) {
      alert(`Sign-off capture failed: ${err.message}`);
    } finally {
      setSubmittingSignOff(false);
    }
  };

  // Metrics calculations for technician workflow
  const assignedJobs = workOrders;
  const pendingJobs = workOrders.filter(w => ['ASSIGNED', 'ACCEPTED'].includes(w.status));
  const inProgressJobs = workOrders.filter(w => w.status === 'IN_PROGRESS');
  const completedJobs = workOrders.filter(w => ['COMPLETED', 'VERIFIED', 'CLOSED'].includes(w.status));
  const upcomingJobs = workOrders.filter(w => ['ASSIGNED'].includes(w.status));

  // Calculate hours worked today and parts used today
  const hoursWorkedToday = Number(
    workOrders.reduce((acc, wo) => {
      const orderHours = (wo.timeEntries || []).reduce((tAcc, te) => tAcc + (te.durationMinutes || 0) / 60, 0);
      return acc + orderHours;
    }, 0).toFixed(1)
  );

  const partsUsedToday = workOrders.reduce((acc, wo) => {
    return acc + (wo.parts || []).reduce((pAcc, p) => pAcc + (p.quantity || 0), 0);
  }, 0);

  // Filter queue based on tab
  const filteredQueue = workOrders.filter(wo => {
    if (workflowFilter === 'PENDING') return ['ASSIGNED', 'ACCEPTED'].includes(wo.status);
    if (workflowFilter === 'IN_PROGRESS') return wo.status === 'IN_PROGRESS';
    if (workflowFilter === 'COMPLETED') return ['COMPLETED', 'VERIFIED', 'CLOSED'].includes(wo.status);
    return true;
  });

  return (
    <div id="technician-portal-view" className="space-y-6">
      {/* Mobile-Friendly Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-xl">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded text-[10px] font-mono bg-amber-500/10 text-amber-400 border border-amber-500/30 font-bold uppercase">
              FIELD TECHNICIAN WORKBENCH
            </span>
            <span className="text-xs text-slate-400 font-mono">• Specialist: {user?.firstName} {user?.lastName}</span>
          </div>
          <h1 className="text-xl font-bold text-white tracking-tight">Mobile Field Execution & Dispatch</h1>
          <p className="text-xs text-slate-400">Accept jobs, log travel, record labor hours, allocate parts, and capture customer sign-offs.</p>
        </div>

        <button
          onClick={fetchData}
          disabled={loading}
          className="p-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl transition-colors self-start sm:self-auto cursor-pointer"
          title="Refresh assignments"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* =========================================================================
          TECHNICIAN METRICS WORKFLOW TILES (Mobile-friendly summary)
         ========================================================================= */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
        {/* Today's Assigned Jobs */}
        <div className="bg-slate-900 border border-slate-800 p-3.5 rounded-xl">
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Assigned Jobs</div>
          <div className="text-xl font-bold text-white mt-1 font-mono">{assignedJobs.length}</div>
          <div className="text-[10px] text-slate-500 mt-0.5">Total in roster</div>
        </div>

        {/* Pending Jobs */}
        <div className="bg-slate-900 border border-slate-800 p-3.5 rounded-xl">
          <div className="text-[10px] font-bold text-blue-400 uppercase tracking-wider">Pending Jobs</div>
          <div className="text-xl font-bold text-blue-400 mt-1 font-mono">{pendingJobs.length}</div>
          <div className="text-[10px] text-slate-500 mt-0.5">Ready to start</div>
        </div>

        {/* In-Progress Jobs */}
        <div className="bg-slate-900 border border-slate-800 p-3.5 rounded-xl">
          <div className="text-[10px] font-bold text-amber-400 uppercase tracking-wider">In-Progress</div>
          <div className="text-xl font-bold text-amber-400 mt-1 font-mono">{inProgressJobs.length}</div>
          <div className="text-[10px] text-slate-500 mt-0.5">On site active</div>
        </div>

        {/* Completed Jobs */}
        <div className="bg-slate-900 border border-slate-800 p-3.5 rounded-xl">
          <div className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider">Completed</div>
          <div className="text-xl font-bold text-emerald-400 mt-1 font-mono">{completedJobs.length}</div>
          <div className="text-[10px] text-slate-500 mt-0.5">Signed & resolved</div>
        </div>

        {/* Hours Worked Today */}
        <div className="bg-slate-900 border border-slate-800 p-3.5 rounded-xl">
          <div className="text-[10px] font-bold text-cyan-400 uppercase tracking-wider">Hours Worked</div>
          <div className="text-xl font-bold text-cyan-400 mt-1 font-mono">{hoursWorkedToday}h</div>
          <div className="text-[10px] text-slate-500 mt-0.5">Logged today</div>
        </div>

        {/* Parts Used Today */}
        <div className="bg-slate-900 border border-slate-800 p-3.5 rounded-xl">
          <div className="text-[10px] font-bold text-purple-400 uppercase tracking-wider">Parts Used</div>
          <div className="text-xl font-bold text-purple-400 mt-1 font-mono">{partsUsedToday}</div>
          <div className="text-[10px] text-slate-500 mt-0.5">Units allocated</div>
        </div>

        {/* Upcoming Jobs */}
        <div className="bg-slate-900 border border-slate-800 p-3.5 rounded-xl col-span-2 sm:col-span-2 lg:col-span-1">
          <div className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider">Upcoming</div>
          <div className="text-xl font-bold text-indigo-400 mt-1 font-mono">{upcomingJobs.length}</div>
          <div className="text-[10px] text-slate-500 mt-0.5">Next in queue</div>
        </div>
      </div>

      {/* Main Grid: Queue on Left, Execution Workbench on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column: Assigned Dispatch Queue (4 cols) */}
        <div className="lg:col-span-4 bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl flex flex-col h-[750px]">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <Wrench className="w-4 h-4 text-amber-400" />
              <h2 className="text-xs font-bold text-white uppercase tracking-wider">Job Dispatch Queue</h2>
            </div>
            <span className="px-2 py-0.5 rounded bg-slate-800 text-[10px] font-mono text-slate-300">
              {filteredQueue.length} Orders
            </span>
          </div>

          {/* Quick Filter Tabs */}
          <div className="grid grid-cols-4 gap-1 py-3 border-b border-slate-800 text-[10px] font-bold">
            <button
              onClick={() => setWorkflowFilter('ALL')}
              className={`py-1 rounded text-center cursor-pointer transition-colors ${
                workflowFilter === 'ALL' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' : 'text-slate-400 hover:text-white'
              }`}
            >
              All ({workOrders.length})
            </button>
            <button
              onClick={() => setWorkflowFilter('PENDING')}
              className={`py-1 rounded text-center cursor-pointer transition-colors ${
                workflowFilter === 'PENDING' ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30' : 'text-slate-400 hover:text-white'
              }`}
            >
              Pending ({pendingJobs.length})
            </button>
            <button
              onClick={() => setWorkflowFilter('IN_PROGRESS')}
              className={`py-1 rounded text-center cursor-pointer transition-colors ${
                workflowFilter === 'IN_PROGRESS' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' : 'text-slate-400 hover:text-white'
              }`}
            >
              Active ({inProgressJobs.length})
            </button>
            <button
              onClick={() => setWorkflowFilter('COMPLETED')}
              className={`py-1 rounded text-center cursor-pointer transition-colors ${
                workflowFilter === 'COMPLETED' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : 'text-slate-400 hover:text-white'
              }`}
            >
              Done ({completedJobs.length})
            </button>
          </div>

          {/* Queue List */}
          <div className="space-y-2.5 overflow-y-auto flex-1 pt-3 pr-1">
            {filteredQueue.length === 0 ? (
              <div className="py-16 text-center text-slate-500 text-xs">
                No orders match this workflow filter.
              </div>
            ) : (
              filteredQueue.map((wo) => {
                const isSelected = selectedOrder?.id === wo.id;
                return (
                  <button
                    key={wo.id}
                    id={`tech-wo-item-${wo.id}`}
                    type="button"
                    onClick={() => setSelectedOrder(wo)}
                    className={`w-full text-left p-3.5 rounded-xl border transition-all cursor-pointer ${
                      isSelected 
                        ? 'bg-amber-500/10 border-amber-500/40 shadow-lg shadow-amber-500/5 ring-1 ring-amber-500/30' 
                        : 'bg-slate-950/70 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="font-mono font-bold text-slate-200">{wo.workOrderNumber}</span>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        wo.status === 'IN_PROGRESS' ? 'bg-amber-500/20 text-amber-300' :
                        wo.status === 'COMPLETED' ? 'bg-emerald-500/20 text-emerald-300' :
                        wo.status === 'ON_HOLD' ? 'bg-rose-500/20 text-rose-300' :
                        'bg-blue-500/20 text-blue-300'
                      }`}>
                        {wo.status}
                      </span>
                    </div>
                    <h4 className="text-xs font-semibold text-white truncate">{wo.title}</h4>
                    <div className="flex items-center justify-between text-[11px] text-slate-400 mt-2">
                      <span className="truncate">{wo.facilityName}</span>
                      <span className="text-amber-400/90 font-mono text-[10px] font-bold">{wo.priority}</span>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Right Column: Execution Workspace & Controls (8 cols) */}
        {selectedOrder ? (
          <div className="lg:col-span-8 space-y-6">
            {/* Active Order Control Card */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-5">
              {/* Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
                <div>
                  <div className="flex items-center gap-2 text-xs text-slate-400 mb-1">
                    <span className="font-mono text-cyan-400 font-bold">{selectedOrder.workOrderNumber}</span>
                    <span>•</span>
                    <span className="flex items-center gap-1"><MapPin className="w-3 h-3 text-slate-500" /> {selectedOrder.facilityName}</span>
                  </div>
                  <h2 className="text-base font-bold text-white">{selectedOrder.title}</h2>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-400">Current Status:</span>
                  <span className="px-3 py-1 rounded-lg text-xs font-bold font-mono bg-amber-500/10 border border-amber-500/30 text-amber-300">
                    {selectedOrder.status}
                  </span>
                </div>
              </div>

              {/* =========================================================================
                  TECHNICIAN JOB EXECUTION ACTIONS (Accept, Start Travel, Start Work, Pause, Complete)
                 ========================================================================= */}
              <div>
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-2.5">
                  Technician Action Controls
                </span>
                <div className="flex flex-wrap gap-2.5">
                  {/* Action 1: Accept Job */}
                  {selectedOrder.status === 'ASSIGNED' && (
                    <button
                      id="btn-tech-accept"
                      onClick={() => handleTransition('ACCEPTED')}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow cursor-pointer transition-colors"
                    >
                      <Check className="w-4 h-4" />
                      <span>Accept Job Assignment</span>
                    </button>
                  )}

                  {/* Action 2: Start Travel */}
                  {(selectedOrder.status === 'ASSIGNED' || selectedOrder.status === 'ACCEPTED') && (
                    <button
                      id="btn-tech-travel"
                      onClick={handleStartTravel}
                      className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow cursor-pointer transition-colors"
                    >
                      <Navigation className="w-4 h-4" />
                      <span>Start Travel (En Route)</span>
                    </button>
                  )}

                  {/* Action 3: Start Work */}
                  {(selectedOrder.status === 'ACCEPTED' || selectedOrder.status === 'ON_HOLD') && (
                    <button
                      id="btn-tech-start-work"
                      onClick={() => handleTransition('IN_PROGRESS')}
                      className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow cursor-pointer transition-colors"
                    >
                      <Play className="w-4 h-4" />
                      <span>Start On-Site Work</span>
                    </button>
                  )}

                  {/* Action 4: Pause Work (Requires Reason) */}
                  {selectedOrder.status === 'IN_PROGRESS' && (
                    <button
                      id="btn-tech-hold"
                      onClick={() => {
                        const reason = prompt('Please specify hold reason (e.g. Waiting on parts, Site inaccessible, Tenant escort required):');
                        if (reason) handleTransition('ON_HOLD', reason);
                      }}
                      className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-amber-400 border border-amber-500/30 rounded-xl text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-colors"
                    >
                      <PauseCircle className="w-4 h-4" />
                      <span>Pause Work (Hold)</span>
                    </button>
                  )}

                  {/* Action 5: Complete Work */}
                  {selectedOrder.status === 'IN_PROGRESS' && (
                    <button
                      id="btn-tech-complete"
                      onClick={() => {
                        const notes = prompt('Enter repair resolution summary:');
                        handleTransition('COMPLETED', undefined, notes || 'Work marked completed by technician.');
                      }}
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow cursor-pointer transition-colors"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Complete Work</span>
                    </button>
                  )}

                  {/* Action 6: Customer Sign-Off Capture */}
                  {['IN_PROGRESS', 'COMPLETED'].includes(selectedOrder.status) && (
                    <button
                      id="btn-tech-signoff"
                      onClick={() => setShowSignOffModal(true)}
                      className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow cursor-pointer transition-colors"
                    >
                      <FileCheck className="w-4 h-4" />
                      <span>Capture Customer Sign-Off</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Order Details & Location */}
              <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800/80 text-xs text-slate-300 leading-relaxed space-y-2">
                <div className="flex items-center justify-between text-slate-400">
                  <span className="font-bold text-white">Job Scope & Technical Instructions</span>
                  <span className="font-mono text-amber-400">SLA Due: {selectedOrder.dueDate ? new Date(selectedOrder.dueDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '24h window'}</span>
                </div>
                <p>{selectedOrder.description}</p>
                {selectedOrder.holdReason && (
                  <div className="p-2 rounded bg-amber-500/10 border border-amber-500/20 text-amber-300 font-medium">
                    ⚠️ Current Hold Reason: {selectedOrder.holdReason}
                  </div>
                )}
              </div>

              {/* Grid: Labor Hours & Parts Used */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                {/* 1. Log Labor Hours Form & List */}
                <div className="p-4 bg-slate-950/60 border border-slate-800/80 rounded-xl space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-white flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-cyan-400" />
                      Log Labor Hours
                    </span>
                    <span className="text-[11px] font-mono text-cyan-400">
                      Total: {selectedOrder.actualDurationHours}h
                    </span>
                  </div>

                  <form onSubmit={handleLogTime} className="space-y-2.5">
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        id="input-log-minutes"
                        type="number"
                        min={15}
                        step={15}
                        value={logTimeMinutes}
                        onChange={(e) => setLogTimeMinutes(Number(e.target.value))}
                        className="bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-200"
                        placeholder="Minutes"
                      />
                      <select
                        id="select-log-type"
                        value={timeType}
                        onChange={(e) => setTimeType(e.target.value as any)}
                        className="bg-slate-900 border border-slate-800 rounded-lg px-2 py-1.5 text-xs text-slate-200"
                      >
                        <option value="LABOR">LABOR</option>
                        <option value="DIAGNOSIS">DIAGNOSIS</option>
                        <option value="TRAVEL">TRAVEL</option>
                        <option value="WAIT_PARTS">WAIT_PARTS</option>
                      </select>
                    </div>

                    <input
                      id="input-log-notes"
                      type="text"
                      value={timeNotes}
                      onChange={(e) => setTimeNotes(e.target.value)}
                      placeholder="Notes (e.g. Capacitor testing)"
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-200"
                    />

                    <button
                      id="btn-submit-time"
                      type="submit"
                      disabled={submittingTime}
                      className="w-full py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg text-xs font-semibold flex items-center justify-center gap-1 transition-colors cursor-pointer disabled:opacity-50"
                    >
                      {submittingTime ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Clock className="w-3.5 h-3.5" />}
                      <span>Log Labor Entry</span>
                    </button>
                  </form>

                  {/* Existing Time Entries */}
                  {selectedOrder.timeEntries.length > 0 && (
                    <div className="space-y-1.5 pt-1 max-h-32 overflow-y-auto">
                      {selectedOrder.timeEntries.map(te => (
                        <div key={te.id} className="p-2 bg-slate-900 border border-slate-800 rounded-lg text-[11px] flex items-center justify-between">
                          <span>{te.entryType}: {te.durationMinutes}m</span>
                          <span className="text-slate-400 truncate max-w-[120px]">{te.notes}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* 2. Record Parts Used Form & List */}
                <div className="p-4 bg-slate-950/60 border border-slate-800/80 rounded-xl space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-white flex items-center gap-1.5">
                      <Package className="w-3.5 h-3.5 text-amber-400" />
                      Record Parts Used
                    </span>
                    <span className="text-[11px] font-mono text-amber-400">
                      {selectedOrder.parts.length} allocated
                    </span>
                  </div>

                  <form onSubmit={handleAddPart} className="space-y-2.5">
                    <select
                      id="select-part-id"
                      value={selectedPartId}
                      onChange={(e) => setSelectedPartId(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2 py-1.5 text-xs text-slate-200"
                    >
                      {parts.map(p => (
                        <option key={p.id} value={p.id}>{p.name} ({p.partNumber}) - In Stock: {p.stockOnHand}</option>
                      ))}
                    </select>

                    <div className="flex gap-2">
                      <input
                        id="input-part-qty"
                        type="number"
                        min={1}
                        value={partQuantity}
                        onChange={(e) => setPartQuantity(Number(e.target.value))}
                        className="w-20 bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-200"
                        placeholder="Qty"
                      />
                      <button
                        id="btn-allocate-part"
                        type="submit"
                        disabled={submittingPart}
                        className="flex-1 py-1.5 bg-amber-600 hover:bg-amber-500 text-white rounded-lg text-xs font-semibold flex items-center justify-center gap-1 transition-colors cursor-pointer disabled:opacity-50"
                      >
                        {submittingPart ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Package className="w-3 h-3" />}
                        <span>Allocate Part</span>
                      </button>
                    </div>
                  </form>

                  {/* Existing parts list */}
                  {selectedOrder.parts.length > 0 && (
                    <div className="space-y-1.5 pt-1 max-h-32 overflow-y-auto">
                      {selectedOrder.parts.map(p => (
                        <div key={p.id} className="p-2 bg-slate-900 border border-slate-800 rounded-lg text-[11px] flex items-center justify-between">
                          <span>{p.partName} &times; {p.quantity}</span>
                          <span className="text-emerald-400 font-mono">${(p.unitPrice * p.quantity).toFixed(2)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Grid: Upload Job Photos & Add Work Notes */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-slate-800">
                {/* 3. Upload Job Photos & Attachments */}
                <div className="p-4 bg-slate-950/60 border border-slate-800/80 rounded-xl space-y-3">
                  <span className="text-xs font-bold text-white flex items-center gap-1.5">
                    <Camera className="w-3.5 h-3.5 text-emerald-400" />
                    Upload Field Photos & Proof of Work
                  </span>

                  <form onSubmit={handleAddPhoto} className="space-y-2">
                    <input
                      type="url"
                      value={photoUrl}
                      onChange={(e) => setPhotoUrl(e.target.value)}
                      placeholder="Photo URL (e.g. https://images.unsplash.com/...)"
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-200"
                    />
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={photoCaption}
                        onChange={(e) => setPhotoCaption(e.target.value)}
                        placeholder="Caption (e.g. Replaced fan motor)"
                        className="flex-1 bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-200"
                      />
                      <button
                        type="submit"
                        disabled={submittingPhoto || !photoUrl.trim()}
                        className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold flex items-center gap-1 cursor-pointer disabled:opacity-50"
                      >
                        {submittingPhoto ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Camera className="w-3 h-3" />}
                        <span>Attach</span>
                      </button>
                    </div>
                  </form>

                  {/* Existing Attachments */}
                  {selectedOrder.attachments && selectedOrder.attachments.length > 0 && (
                    <div className="space-y-1.5 pt-1 max-h-32 overflow-y-auto">
                      {selectedOrder.attachments.map(att => (
                        <div key={att.id} className="p-2 bg-slate-900 border border-slate-800 rounded-lg text-[11px] flex items-center justify-between">
                          <span className="text-slate-300 font-medium truncate">{att.caption || att.fileName}</span>
                          <a href={att.url} target="_blank" rel="noreferrer" className="text-cyan-400 hover:underline text-[10px]">View</a>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* 4. Add Work Notes & Dispatch Communication */}
                <div className="p-4 bg-slate-950/60 border border-slate-800/80 rounded-xl space-y-3">
                  <span className="text-xs font-bold text-white flex items-center gap-1.5">
                    <MessageSquare className="w-3.5 h-3.5 text-indigo-400" />
                    Field Notes & Updates
                  </span>

                  <form onSubmit={handleAddNote} className="flex gap-2">
                    <input
                      type="text"
                      value={workNote}
                      onChange={(e) => setWorkNote(e.target.value)}
                      placeholder="Add diagnostic notes or update..."
                      className="flex-1 bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-200"
                    />
                    <button
                      type="submit"
                      disabled={submittingNote || !workNote.trim()}
                      className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold flex items-center gap-1 cursor-pointer disabled:opacity-50"
                    >
                      {submittingNote ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Send className="w-3 h-3" />}
                      <span>Save</span>
                    </button>
                  </form>

                  {/* Existing Notes/Comments */}
                  {selectedOrder.comments && selectedOrder.comments.length > 0 && (
                    <div className="space-y-1.5 pt-1 max-h-32 overflow-y-auto">
                      {selectedOrder.comments.map(c => (
                        <div key={c.id} className="p-2 bg-slate-900 border border-slate-800 rounded-lg text-[11px]">
                          <div className="flex items-center justify-between text-[10px] text-slate-400 mb-0.5">
                            <span className="font-bold text-slate-300">{c.authorName}</span>
                            <span>{new Date(c.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                          </div>
                          <p className="text-slate-300">{c.content}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="lg:col-span-8 p-16 bg-slate-900 border border-slate-800 rounded-2xl text-center text-slate-500 text-xs">
            Select an order from the queue to start execution.
          </div>
        )}
      </div>

      {/* Modal: Customer Sign-Off Capture */}
      {showSignOffModal && selectedOrder && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-6 space-y-4 text-white">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <FileCheck className="w-4 h-4 text-cyan-400" />
                Capture On-Site Customer Sign-Off
              </h3>
              <button
                onClick={() => setShowSignOffModal(false)}
                className="text-slate-400 hover:text-white text-xs cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-xs space-y-1">
              <div className="font-mono font-bold text-cyan-400">{selectedOrder.workOrderNumber}</div>
              <div className="font-semibold text-white">{selectedOrder.title}</div>
              <div className="text-slate-400">{selectedOrder.facilityName}</div>
            </div>

            <form onSubmit={handleCaptureSignOff} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Customer Signatory Name *
                </label>
                <input
                  type="text"
                  required
                  value={signOffName}
                  onChange={(e) => setSignOffName(e.target.value)}
                  placeholder="e.g. Sarah Jenkins (Building Manager)"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Confirmation Signature & Verification Note
                </label>
                <textarea
                  rows={3}
                  value={signOffNotes}
                  onChange={(e) => setSignOffNotes(e.target.value)}
                  placeholder="e.g. Work confirmed complete. Chiller operating at 44°F. Site left orderly."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowSignOffModal(false)}
                  className="px-3 py-1.5 text-xs text-slate-400 hover:text-white cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingSignOff || !signOffName.trim()}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow cursor-pointer disabled:opacity-50"
                >
                  {submittingSignOff ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                  <span>Confirm Sign-Off & Complete</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
