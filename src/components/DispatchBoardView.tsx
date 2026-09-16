import React, { useState } from 'react';
import { 
  Users, Calendar, Clock, MapPin, CheckCircle2, 
  AlertCircle, ArrowRight, UserCheck, Shield, 
  RefreshCw, Filter, Search, Phone, Mail, Award,
  CheckSquare, ChevronRight, History, Send, AlertTriangle,
  Zap, Sparkles, Navigation, Layers, Flame
} from 'lucide-react';
import { WorkOrder, Technician, Facility, AssignmentRecord, RoleName, ServiceRequest } from '../types';
import { api } from '../services/api';

interface DispatchBoardViewProps {
  workOrders: WorkOrder[];
  technicians: Technician[];
  facilities: Facility[];
  serviceRequests?: ServiceRequest[];
  onAssignTechnician: (orderId: string, technicianId: string, notes?: string) => Promise<void>;
  onRefreshData: () => Promise<void>;
  currentRole: RoleName;
  onConvertServiceRequest?: (requestId: string) => Promise<void>;
}

export const DispatchBoardView: React.FC<DispatchBoardViewProps> = ({
  workOrders,
  technicians,
  facilities,
  serviceRequests = [],
  onAssignTechnician,
  onRefreshData,
  currentRole,
  onConvertServiceRequest,
}) => {
  const [techSearch, setTechSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [skillFilter, setSkillFilter] = useState('ALL');
  const [queueTab, setQueueTab] = useState<'UNASSIGNED_ORDERS' | 'UNASSIGNED_REQUESTS' | 'ALL_DISPATCHABLE'>('UNASSIGNED_ORDERS');

  // Currently selected order for dispatching
  const [selectedOrderForDispatch, setSelectedOrderForDispatch] = useState<WorkOrder | null>(null);

  // Assignment Modal
  const [assigningOrder, setAssigningOrder] = useState<WorkOrder | null>(null);
  const [targetTechId, setTargetTechId] = useState<string>('');
  const [dispatchNotes, setDispatchNotes] = useState<string>('');
  const [isAssigning, setIsAssigning] = useState(false);

  // History inspection modal
  const [historyOrder, setHistoryOrder] = useState<WorkOrder | null>(null);

  // Technician status update
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

  // Extract all distinct skills across technicians
  const allSkills = Array.from(new Set(technicians.flatMap(t => t.skills || [])));

  // Calculate Dispatcher KPI Metrics
  const unassignedRequests = serviceRequests.filter(s => s.status === 'PENDING_REVIEW' || !s.convertedWorkOrderId);
  
  const unassignedOrders = workOrders.filter(
    wo => !wo.assignedTechnicianId && !['COMPLETED', 'VERIFIED', 'CLOSED'].includes(wo.status)
  );

  const availableTechs = technicians.filter(t => t.status === 'AVAILABLE');

  const todayStr = new Date().toISOString().split('T')[0];
  const todaysJobs = workOrders.filter(
    wo => (wo.createdAt && wo.createdAt.startsWith(todayStr)) || (wo.dueDate && wo.dueDate.startsWith(todayStr))
  );

  const overdueJobs = workOrders.filter(
    wo => wo.slaStatus === 'BREACHED' || (wo.dueDate && new Date(wo.dueDate).getTime() < Date.now() && !['COMPLETED', 'VERIFIED', 'CLOSED'].includes(wo.status))
  );

  const atRiskJobs = workOrders.filter(
    wo => wo.slaStatus === 'AT_RISK' && !['COMPLETED', 'VERIFIED', 'CLOSED'].includes(wo.status)
  );

  const dispatchWorkload = workOrders.filter(
    wo => !['COMPLETED', 'VERIFIED', 'CLOSED'].includes(wo.status)
  );

  // Filter dispatchable orders
  const dispatchableOrders = workOrders.filter(
    wo => ['NEW', 'TRIAGED', 'ASSIGNED', 'ON_HOLD', 'ACCEPTED'].includes(wo.status)
  );

  // Filter technicians
  const filteredTechnicians = technicians.filter(t => {
    const matchesSearch = 
      t.name.toLowerCase().includes(techSearch.toLowerCase()) ||
      t.email.toLowerCase().includes(techSearch.toLowerCase()) ||
      t.skills.some(s => s.toLowerCase().includes(techSearch.toLowerCase()));

    const matchesStatus = statusFilter === 'ALL' || t.status === statusFilter;
    const matchesSkill = skillFilter === 'ALL' || t.skills.includes(skillFilter);

    return matchesSearch && matchesStatus && matchesSkill;
  });

  // Skills match helper
  const calculateSkillMatch = (tech: Technician, order: WorkOrder | null) => {
    if (!order) return false;
    const orderText = `${order.title} ${order.description} ${order.category || ''}`.toLowerCase();
    return tech.skills.some(skill => orderText.includes(skill.toLowerCase()));
  };

  // Facility proximity helper
  const getProximityInfo = (tech: Technician, order: WorkOrder | null) => {
    // Determine where technician is currently on-site
    const activeOrder = workOrders.find(
      w => w.assignedTechnicianId === tech.id && w.status === 'IN_PROGRESS'
    );
    if (activeOrder) {
      const isSameFacility = order && order.facilityId === activeOrder.facilityId;
      return {
        location: activeOrder.facilityName,
        isSameFacility,
        label: isSameFacility ? 'On-Site at this Facility' : `At ${activeOrder.facilityName}`,
      };
    }
    if (tech.status === 'AVAILABLE') {
      return {
        location: 'Standby / Fleet Depot',
        isSameFacility: false,
        label: 'Ready for Immediate Mobilization',
      };
    }
    return {
      location: tech.status,
      isSameFacility: false,
      label: tech.status,
    };
  };

  const handleOpenAssignModal = (order: WorkOrder, defaultTechId?: string) => {
    setAssigningOrder(order);
    setTargetTechId(defaultTechId || order.assignedTechnicianId || (technicians[0]?.id || ''));
    setDispatchNotes('');
  };

  const handleFastAssign = async (order: WorkOrder, technician: Technician) => {
    try {
      await onAssignTechnician(order.id, technician.id, `Fast-dispatched via Dispatch Board to ${technician.name}`);
      setSelectedOrderForDispatch(null);
      await onRefreshData();
    } catch (err: any) {
      alert(`Assignment failed: ${err.message}`);
    }
  };

  const handleExecuteAssignment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assigningOrder || !targetTechId) return;

    setIsAssigning(true);
    try {
      await onAssignTechnician(assigningOrder.id, targetTechId, dispatchNotes);
      setAssigningOrder(null);
      setDispatchNotes('');
      await onRefreshData();
    } catch (err: any) {
      alert(`Assignment failed: ${err.message}`);
    } finally {
      setIsAssigning(false);
    }
  };

  const handleUpdateTechStatus = async (techId: string, newStatus: string) => {
    setIsUpdatingStatus(true);
    try {
      await api.updateTechnicianStatus(techId, { status: newStatus });
      await onRefreshData();
    } catch (err: any) {
      alert(`Failed to update status: ${err.message}`);
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const handleConvertRequest = async (sr: ServiceRequest) => {
    try {
      if (onConvertServiceRequest) {
        await onConvertServiceRequest(sr.id);
      } else {
        await api.convertServiceRequestToWorkOrder(sr.id);
      }
      await onRefreshData();
    } catch (err: any) {
      alert(`Conversion failed: ${err.message}`);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'AVAILABLE':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'ON_SITE':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'EN_ROUTE':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'BREAK':
        return 'bg-purple-50 text-purple-700 border-purple-200';
      default:
        return 'bg-slate-100 text-slate-600 border-slate-200';
    }
  };

  // Urgent orders that need fast attention
  const urgentOrders = workOrders.filter(
    wo => (wo.priority === 'CRITICAL' || wo.slaStatus === 'BREACHED' || wo.slaStatus === 'AT_RISK') &&
          !['COMPLETED', 'VERIFIED', 'CLOSED'].includes(wo.status)
  );

  return (
    <div id="dispatcher-dashboard-view" className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
              <Users className="w-5 h-5 text-blue-600" />
              Real-Time Dispatch & Field Operations Board
            </h1>
            <span className="px-2.5 py-0.5 text-[10px] font-mono bg-blue-50 text-blue-700 border border-blue-200 rounded-lg uppercase font-bold">
              Live Fleet Control
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Real-time technician availability, skills matching, live queue allocation, and assignment history tracking.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => onRefreshData()}
            className="px-3.5 py-2 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-xl border border-slate-200 shadow-xs flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5 text-blue-600" />
            <span>Refresh Telemetry</span>
          </button>
        </div>
      </div>

      {/* =========================================================================
          DISPATCHER KPI SUMMARY TILES (All 7 metrics)
         ========================================================================= */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
        {/* 1. Unassigned Requests */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
          <div className="text-[10px] font-bold text-amber-700 uppercase tracking-wider">Unassigned Requests</div>
          <div className="text-2xl font-bold text-slate-900 mt-1 font-mono">{unassignedRequests.length}</div>
          <div className="text-[11px] text-slate-500 mt-0.5">Pending triage</div>
        </div>

        {/* 2. Unassigned Work Orders */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
          <div className="text-[10px] font-bold text-rose-700 uppercase tracking-wider">Unassigned Orders</div>
          <div className="text-2xl font-bold text-slate-900 mt-1 font-mono">{unassignedOrders.length}</div>
          <div className="text-[11px] text-slate-500 mt-0.5">Needs dispatch</div>
        </div>

        {/* 3. Technician Availability */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
          <div className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider">Available Techs</div>
          <div className="text-2xl font-bold text-slate-900 mt-1 font-mono">
            {availableTechs.length}/{technicians.length}
          </div>
          <div className="text-[11px] text-slate-500 mt-0.5">Ready to mobilize</div>
        </div>

        {/* 4. Today's Jobs */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
          <div className="text-[10px] font-bold text-blue-700 uppercase tracking-wider">Today's Jobs</div>
          <div className="text-2xl font-bold text-slate-900 mt-1 font-mono">{todaysJobs.length}</div>
          <div className="text-[11px] text-slate-500 mt-0.5">Active today</div>
        </div>

        {/* 5. Overdue Jobs */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
          <div className="text-[10px] font-bold text-rose-700 uppercase tracking-wider">Overdue Jobs</div>
          <div className="text-2xl font-bold text-rose-700 mt-1 font-mono">{overdueJobs.length}</div>
          <div className="text-[11px] text-slate-500 mt-0.5">Breached deadline</div>
        </div>

        {/* 6. SLA At-Risk Jobs */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
          <div className="text-[10px] font-bold text-amber-700 uppercase tracking-wider">SLA At-Risk</div>
          <div className="text-2xl font-bold text-amber-700 mt-1 font-mono">{atRiskJobs.length}</div>
          <div className="text-[11px] text-slate-500 mt-0.5">&lt;60m remaining</div>
        </div>

        {/* 7. Dispatch Workload */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs col-span-2 sm:col-span-2 lg:col-span-1">
          <div className="text-[10px] font-bold text-indigo-700 uppercase tracking-wider">Dispatch Workload</div>
          <div className="text-2xl font-bold text-slate-900 mt-1 font-mono">{dispatchWorkload.length}</div>
          <div className="text-[11px] text-slate-500 mt-0.5">Total in flight</div>
        </div>
      </div>

      {/* =========================================================================
          URGENT DISPATCH ALERT BANNER
         ========================================================================= */}
      {urgentOrders.length > 0 && (
        <div id="urgent-dispatch-alert" className="bg-rose-50 border border-rose-200 rounded-2xl p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-rose-900 font-bold text-xs uppercase tracking-wider">
              <Flame className="w-4 h-4 text-rose-600 animate-pulse" />
              <span>Urgent Dispatch Alert: {urgentOrders.length} High-Severity / SLA-Critical Job(s)</span>
            </div>
            <span className="text-[11px] font-mono font-semibold text-rose-700">Requires Rapid Field Assignment</span>
          </div>

          <div className="mt-3 flex gap-2.5 overflow-x-auto pb-1">
            {urgentOrders.map(order => (
              <div 
                key={order.id} 
                className="shrink-0 w-72 bg-white border border-rose-200 rounded-xl p-3 flex flex-col justify-between space-y-2 shadow-2xs"
              >
                <div>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="font-mono font-bold text-rose-700">{order.workOrderNumber}</span>
                    <span className="px-1.5 py-0.5 rounded bg-rose-50 border border-rose-200 text-rose-700 text-[10px] font-bold">
                      {order.priority}
                    </span>
                  </div>
                  <h4 className="text-xs font-bold text-slate-900 line-clamp-1">{order.title}</h4>
                  <p className="text-[11px] text-slate-500 truncate">{order.facilityName}</p>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-[11px]">
                  <span className="text-slate-500">
                    {order.assignedTechnicianName ? `Tech: ${order.assignedTechnicianName.split(' ')[0]}` : 'Unassigned'}
                  </span>
                  <button
                    onClick={() => handleOpenAssignModal(order)}
                    className="px-2.5 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1 cursor-pointer transition-colors shadow-xs"
                  >
                    <Zap className="w-3 h-3" />
                    <span>Assign Now</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Selected Order Context Pill for Fast Click Assignment */}
      {selectedOrderForDispatch && (
        <div className="bg-blue-50 border border-blue-200 rounded-2xl p-3.5 flex items-center justify-between text-xs shadow-xs">
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded-md bg-blue-100 text-blue-800 font-mono font-bold">
              TARGET ORDER: {selectedOrderForDispatch.workOrderNumber}
            </span>
            <span className="text-slate-900 font-bold">{selectedOrderForDispatch.title}</span>
            <span className="text-slate-500 hidden sm:inline">({selectedOrderForDispatch.facilityName})</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-blue-700 text-[11px] font-medium hidden md:inline">Click "Fast Assign" on any specialist card &rarr;</span>
            <button
              onClick={() => setSelectedOrderForDispatch(null)}
              className="px-2.5 py-1 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-lg text-[11px] font-semibold cursor-pointer shadow-2xs"
            >
              Cancel Target
            </button>
          </div>
        </div>
      )}

      {/* Main Grid: Left Queue (4 cols) & Right Technicians Board (8 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column: Intake & Dispatch Queue (4 cols) */}
        <div className="lg:col-span-4 bg-white border border-slate-200 rounded-2xl p-4 flex flex-col h-[750px] shadow-xs">
          {/* Tab Selector */}
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-amber-600" />
              <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                Intake & Dispatch Queue
              </h2>
            </div>
            <span className="px-2.5 py-0.5 text-[10px] font-bold bg-amber-50 text-amber-700 rounded-full border border-amber-200">
              {queueTab === 'UNASSIGNED_ORDERS' ? unassignedOrders.length :
               queueTab === 'UNASSIGNED_REQUESTS' ? unassignedRequests.length :
               dispatchableOrders.length}
            </span>
          </div>

          <div className="grid grid-cols-3 gap-1 py-2.5 border-b border-slate-100 text-[10px] font-bold">
            <button
              onClick={() => setQueueTab('UNASSIGNED_ORDERS')}
              className={`py-1.5 rounded-lg text-center cursor-pointer transition-colors ${
                queueTab === 'UNASSIGNED_ORDERS' ? 'bg-rose-50 text-rose-700 border border-rose-200 font-bold' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Unassigned ({unassignedOrders.length})
            </button>
            <button
              onClick={() => setQueueTab('UNASSIGNED_REQUESTS')}
              className={`py-1.5 rounded-lg text-center cursor-pointer transition-colors ${
                queueTab === 'UNASSIGNED_REQUESTS' ? 'bg-amber-50 text-amber-700 border border-amber-200 font-bold' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Requests ({unassignedRequests.length})
            </button>
            <button
              onClick={() => setQueueTab('ALL_DISPATCHABLE')}
              className={`py-1.5 rounded-lg text-center cursor-pointer transition-colors ${
                queueTab === 'ALL_DISPATCHABLE' ? 'bg-blue-50 text-blue-700 border border-blue-200 font-bold' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              All Active ({dispatchableOrders.length})
            </button>
          </div>

          {/* Queue Content List */}
          <div className="space-y-2.5 overflow-y-auto flex-1 pt-3 pr-1">
            {/* View: Unassigned Requests */}
            {queueTab === 'UNASSIGNED_REQUESTS' && (
              unassignedRequests.length === 0 ? (
                <div className="text-center py-16 text-slate-400 text-xs italic">
                  No unassigned service requests pending.
                </div>
              ) : (
                unassignedRequests.map(req => (
                  <div key={req.id} className="p-3.5 rounded-xl border border-amber-200 bg-amber-50/50 space-y-2 shadow-2xs">
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-xs font-bold text-amber-800">{req.requestNumber}</span>
                      <span className="px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 text-[10px] font-bold">
                        {req.priority}
                      </span>
                    </div>
                    <h3 className="text-xs font-bold text-slate-900 line-clamp-2">{req.title}</h3>
                    <p className="text-[11px] text-slate-500 truncate">{req.facilityName}</p>
                    <div className="flex justify-end pt-1">
                      <button
                        onClick={() => handleConvertRequest(req)}
                        className="px-3 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1 cursor-pointer transition-colors shadow-xs"
                      >
                        <Zap className="w-3 h-3" />
                        <span>Triage & Convert</span>
                      </button>
                    </div>
                  </div>
                ))
              )
            )}

            {/* View: Work Orders (Unassigned or All Active) */}
            {queueTab !== 'UNASSIGNED_REQUESTS' && (
              (queueTab === 'UNASSIGNED_ORDERS' ? unassignedOrders : dispatchableOrders).length === 0 ? (
                <div className="text-center py-16 text-slate-400 text-xs italic">
                  No orders in this queue.
                </div>
              ) : (
                (queueTab === 'UNASSIGNED_ORDERS' ? unassignedOrders : dispatchableOrders).map((wo) => {
                  const isUnassigned = !wo.assignedTechnicianId;
                  const isTarget = selectedOrderForDispatch?.id === wo.id;

                  return (
                    <div
                      key={wo.id}
                      onClick={() => setSelectedOrderForDispatch(wo)}
                      className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
                        isTarget 
                          ? 'bg-blue-50 border-blue-500 ring-2 ring-blue-500/20 shadow-xs'
                          : isUnassigned
                          ? 'bg-rose-50/40 border-rose-200 hover:border-rose-300 shadow-2xs'
                          : 'bg-slate-50 border-slate-200 hover:border-slate-300 shadow-2xs'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-xs font-bold text-slate-800">
                          {wo.workOrderNumber}
                        </span>
                        <span className={`px-1.5 py-0.5 text-[9px] font-bold uppercase rounded ${
                          wo.priority === 'CRITICAL' ? 'bg-rose-50 text-rose-700 border border-rose-200' :
                          wo.priority === 'HIGH' ? 'bg-amber-50 text-amber-700 border border-amber-200' :
                          'bg-blue-50 text-blue-700 border border-blue-200'
                        }`}>
                          {wo.priority}
                        </span>
                      </div>

                      <h3 className="text-xs font-bold text-slate-900 mt-1.5 line-clamp-2">
                        {wo.title}
                      </h3>

                      <div className="flex items-center gap-1.5 text-[11px] text-slate-500 mt-1 truncate">
                        <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                        <span>{wo.facilityName}</span>
                      </div>

                      <div className="mt-2.5 pt-2 border-t border-slate-200/70 flex items-center justify-between">
                        <div className="text-[10px]">
                          {wo.assignedTechnicianName ? (
                            <span className="text-blue-700 flex items-center gap-1 font-semibold">
                              <UserCheck className="w-3 h-3" />
                              {wo.assignedTechnicianName}
                            </span>
                          ) : (
                            <span className="text-rose-600 font-bold tracking-wide uppercase">
                              Unassigned
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-1.5">
                          {wo.assignmentHistory && wo.assignmentHistory.length > 0 && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setHistoryOrder(wo);
                              }}
                              title="View Assignment History"
                              className="p-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-slate-900 text-[10px] cursor-pointer"
                            >
                              <History className="w-3 h-3" />
                            </button>
                          )}

                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenAssignModal(wo);
                            }}
                            className={`px-2.5 py-1 text-[11px] font-semibold rounded-lg flex items-center gap-1 cursor-pointer transition-colors shadow-2xs ${
                              isUnassigned
                                ? 'bg-rose-600 hover:bg-rose-700 text-white'
                                : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                            }`}
                          >
                            <span>{isUnassigned ? 'Assign' : 'Reassign'}</span>
                            <ArrowRight className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })
              )
            )}
          </div>
        </div>

        {/* Right Column: Technicians Roster & Availability (8 cols) */}
        <div className="lg:col-span-8 space-y-4">
          <div className="bg-white border border-slate-200 rounded-2xl p-4 flex flex-col h-[750px] shadow-xs">
            {/* Roster Controls */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <UserCheck className="w-4 h-4 text-blue-600" />
                <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  Technician Fleet & Availability ({filteredTechnicians.length})
                </h2>
              </div>

              {/* Filters */}
              <div className="flex flex-wrap items-center gap-2">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 absolute left-2.5 top-2 text-slate-400" />
                  <input
                    type="text"
                    value={techSearch}
                    onChange={(e) => setTechSearch(e.target.value)}
                    placeholder="Search tech or skill..."
                    className="pl-8 pr-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                </div>

                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="py-1.5 px-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-medium cursor-pointer"
                >
                  <option value="ALL">All Statuses</option>
                  <option value="AVAILABLE">AVAILABLE</option>
                  <option value="ON_SITE">ON_SITE</option>
                  <option value="EN_ROUTE">EN_ROUTE</option>
                  <option value="BREAK">BREAK</option>
                  <option value="OFFLINE">OFFLINE</option>
                </select>

                <select
                  value={skillFilter}
                  onChange={(e) => setSkillFilter(e.target.value)}
                  className="py-1.5 px-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-medium cursor-pointer"
                >
                  <option value="ALL">All Certifications</option>
                  {allSkills.map(s => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Technicians List Grid */}
            <div className="space-y-3 overflow-y-auto flex-1 pt-3 pr-1">
              {filteredTechnicians.length === 0 ? (
                <div className="text-center py-16 text-slate-400 text-xs italic">
                  No technicians match the selected filters.
                </div>
              ) : (
                filteredTechnicians.map((tech) => {
                  const techOrders = workOrders.filter(
                    wo => wo.assignedTechnicianId === tech.id && !['COMPLETED', 'VERIFIED', 'CLOSED'].includes(wo.status)
                  );

                  // Calculate skills match with selected order
                  const isSkillsMatch = calculateSkillMatch(tech, selectedOrderForDispatch);
                  const proximity = getProximityInfo(tech, selectedOrderForDispatch);

                  return (
                    <div
                      key={tech.id}
                      className={`bg-white border rounded-2xl p-4 transition-all space-y-3 shadow-xs ${
                        isSkillsMatch 
                          ? 'border-emerald-300 ring-2 ring-emerald-500/10' 
                          : 'border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center font-bold text-white text-sm shadow-xs shrink-0">
                            {tech.name.split(' ').map(n => n[0]).join('')}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <h3 className="text-sm font-bold text-slate-900">{tech.name}</h3>
                              <span className={`px-2 py-0.5 text-[10px] font-bold uppercase rounded-md border ${getStatusBadge(tech.status)}`}>
                                {tech.status}
                              </span>

                              {/* Skills Match Badge */}
                              {isSkillsMatch && (
                                <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                                  <Sparkles className="w-3 h-3 text-emerald-600" />
                                  <span>SKILLS MATCH</span>
                                </span>
                              )}
                            </div>

                            <div className="flex items-center gap-3 text-xs text-slate-500 mt-0.5">
                              <span className="flex items-center gap-1">
                                <Mail className="w-3 h-3 text-slate-400" />
                                {tech.email}
                              </span>
                              <span className="flex items-center gap-1">
                                <Phone className="w-3 h-3 text-slate-400" />
                                {tech.phone}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Dispatch Actions & Status Changer */}
                        <div className="flex items-center gap-2 self-end sm:self-auto">
                          {/* Fast Assign Target Order */}
                          {selectedOrderForDispatch && (
                            <button
                              onClick={() => handleFastAssign(selectedOrderForDispatch, tech)}
                              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1 shadow-xs cursor-pointer transition-colors"
                            >
                              <Zap className="w-3.5 h-3.5" />
                              <span>Fast Assign</span>
                            </button>
                          )}

                          {/* Dispatch Next Unassigned Order */}
                          {!selectedOrderForDispatch && unassignedOrders.length > 0 && (
                            <button
                              onClick={() => handleOpenAssignModal(unassignedOrders[0], tech.id)}
                              className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1 shadow-xs cursor-pointer transition-colors"
                            >
                              <Send className="w-3 h-3" />
                              <span>Dispatch Next</span>
                            </button>
                          )}

                          {/* Set Status Dropdown */}
                          <div className="flex items-center gap-1.5 text-xs text-slate-500">
                            <select
                              disabled={isUpdatingStatus}
                              value={tech.status}
                              onChange={(e) => handleUpdateTechStatus(tech.id, e.target.value)}
                              className="bg-slate-50 border border-slate-200 text-slate-700 text-xs rounded-lg px-2 py-1.5 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-semibold cursor-pointer"
                            >
                              <option value="AVAILABLE">AVAILABLE</option>
                              <option value="ON_SITE">ON_SITE</option>
                              <option value="EN_ROUTE">EN_ROUTE</option>
                              <option value="BREAK">BREAK</option>
                              <option value="OFFLINE">OFFLINE</option>
                            </select>
                          </div>
                        </div>
                      </div>

                      {/* Location Proximity & Skills Bar */}
                      <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-xs">
                        {/* Skills */}
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="text-[11px] text-slate-400 flex items-center gap-1 mr-1 font-semibold">
                            <Award className="w-3.5 h-3.5 text-blue-600" /> Skills:
                          </span>
                          {tech.skills.map((skill) => (
                            <span
                              key={skill}
                              className="px-2 py-0.5 text-[10px] font-semibold bg-slate-100 border border-slate-200 text-slate-700 rounded-md"
                            >
                              {skill}
                            </span>
                          ))}
                        </div>

                        {/* Location / Facility Proximity */}
                        <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
                          <Navigation className="w-3.5 h-3.5 text-blue-600" />
                          <span className={proximity.isSameFacility ? 'text-emerald-700 font-bold' : ''}>
                            {proximity.label}
                          </span>
                        </div>
                      </div>

                      {/* Current Active Workload */}
                      <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-slate-500 font-medium">Active Workload:</span>
                          <span className={`text-xs font-bold px-2 py-0.5 rounded-md ${
                            techOrders.length > 2 
                              ? 'bg-amber-100 text-amber-800' 
                              : techOrders.length === 0
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-slate-200 text-slate-800'
                          }`}>
                            {techOrders.length} active orders
                          </span>
                        </div>

                        <div className="flex items-center gap-2 text-xs text-slate-500">
                          {techOrders.length > 0 ? (
                            <div className="flex items-center gap-1.5 truncate max-w-xs">
                              {techOrders.map(o => (
                                <span key={o.id} className="font-mono text-[10px] bg-white border border-slate-200 text-blue-700 px-2 py-0.5 rounded-md font-bold">
                                  {o.workOrderNumber} ({o.status})
                                </span>
                              ))}
                            </div>
                          ) : (
                            <span className="text-slate-400 text-[11px] italic">No active assignments (Capacity Ready)</span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Assignment Modal */}
      {assigningOrder && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <UserCheck className="w-4 h-4 text-blue-600" />
                  Dispatch Work Order: {assigningOrder.workOrderNumber}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">{assigningOrder.title}</p>
              </div>
              <button
                onClick={() => setAssigningOrder(null)}
                className="text-slate-400 hover:text-slate-700 text-xs p-1 rounded-lg hover:bg-slate-100 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleExecuteAssignment} className="space-y-4">
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-1 text-xs text-slate-700">
                <div><span className="font-bold text-slate-500">Facility:</span> {assigningOrder.facilityName}</div>
                <div><span className="font-bold text-slate-500">Priority:</span> {assigningOrder.priority}</div>
                <div>
                  <span className="font-bold text-slate-500">Current Assignee:</span>{' '}
                  {assigningOrder.assignedTechnicianName || 'Unassigned'}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Select Field Specialist to Assign
                </label>
                <select
                  required
                  value={targetTechId}
                  onChange={(e) => setTargetTechId(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 cursor-pointer"
                >
                  <option value="">-- Choose Field Specialist --</option>
                  {technicians.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name} &bull; {t.status} &bull; Skills: {t.skills.join(', ')}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Dispatch Notes / Work Instructions
                </label>
                <textarea
                  rows={3}
                  value={dispatchNotes}
                  onChange={(e) => setDispatchNotes(e.target.value)}
                  placeholder="Provide access codes, safety instructions, or reason for reassignment..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setAssigningOrder(null)}
                  className="px-3.5 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isAssigning || !targetTechId}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-xs cursor-pointer transition-colors"
                >
                  {isAssigning ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                  <span>Confirm Dispatch Assignment</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Assignment History Inspection Modal */}
      {historyOrder && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <History className="w-4 h-4 text-blue-600" />
                  Assignment History: {historyOrder.workOrderNumber}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">{historyOrder.title}</p>
              </div>
              <button
                onClick={() => setHistoryOrder(null)}
                className="text-slate-400 hover:text-slate-700 text-xs p-1 rounded-lg hover:bg-slate-100 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-2.5 max-h-96 overflow-y-auto pr-1">
              {(!historyOrder.assignmentHistory || historyOrder.assignmentHistory.length === 0) ? (
                <div className="text-xs text-slate-400 italic text-center py-8">
                  No previous assignment records.
                </div>
              ) : (
                historyOrder.assignmentHistory.map((rec) => (
                  <div
                    key={rec.id}
                    className={`p-3.5 rounded-xl border text-xs ${
                      rec.status === 'ACTIVE'
                        ? 'bg-blue-50/50 border-blue-200 text-slate-900 shadow-2xs'
                        : 'bg-white border-slate-200 text-slate-600'
                    }`}
                  >
                    <div className="flex items-center justify-between font-semibold">
                      <span className="text-slate-900 font-bold flex items-center gap-1.5">
                        <UserCheck className="w-3.5 h-3.5 text-blue-600" />
                        Assigned To: {rec.technicianName}
                      </span>
                      <span className={`px-2 py-0.5 text-[9px] font-bold uppercase rounded-md ${
                        rec.status === 'ACTIVE'
                          ? 'bg-blue-100 text-blue-800 border border-blue-200'
                          : 'bg-slate-100 text-slate-600'
                      }`}>
                        {rec.status}
                      </span>
                    </div>

                    <div className="mt-1 text-[11px] text-slate-500 flex items-center justify-between">
                      <span>By: <strong className="text-slate-700">{rec.assignedBy}</strong> ({rec.assignedByRole})</span>
                      <span className="font-mono">{new Date(rec.assignedAt).toLocaleString()}</span>
                    </div>

                    {rec.notes && (
                      <div className="mt-2 text-[11px] text-slate-600 italic bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                        "{rec.notes}"
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>

            <div className="flex justify-end pt-3 border-t border-slate-100">
              <button
                onClick={() => setHistoryOrder(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold cursor-pointer transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
