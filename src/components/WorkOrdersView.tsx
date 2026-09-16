import React, { useState, useEffect } from 'react';
import { 
  Search, Filter, Plus, CheckCircle2, Clock, 
  AlertCircle, ChevronRight, UserCheck, ShieldAlert,
  ArrowRight, X, Play, Pause, FileCheck, Layers, LayoutGrid, 
  List, MessageSquare, Paperclip, History, Edit3, Trash2,
  Calendar, User, Box, Shield, RefreshCw, Send, Image, ExternalLink,
  ChevronLeft, ArrowUpDown, Boxes, DollarSign, PackagePlus, AlertTriangle,
  Square, TrendingUp, CheckSquare
} from 'lucide-react';
import { 
  WorkOrder, WorkOrderStatus, Priority, Facility, Technician, 
  RoleName, Part, Comment, Attachment, AssignmentRecord, 
  FacilityInventory, TimeEntry 
} from '../types';
import { api } from '../services/api';

interface WorkOrdersViewProps {
  workOrders: WorkOrder[];
  facilities: Facility[];
  technicians: Technician[];
  parts: Part[];
  selectedStatusFilter: string;
  setSelectedStatusFilter: (status: string) => void;
  selectedOrder: WorkOrder | null;
  setSelectedOrder: (order: WorkOrder | null) => void;
  onTransition: (orderId: string, targetStatus: WorkOrderStatus, notes?: string, extra?: any) => Promise<void>;
  onAssignTechnician: (orderId: string, technicianId: string, notes?: string) => Promise<void>;
  onLogTime: (orderId: string, minutes: number, entryType: any, notes: string) => Promise<void>;
  onAllocatePart: (orderId: string, partId: string, quantity: number) => Promise<void>;
  onOpenCreateModal: () => void;
  onRefreshData?: () => Promise<void>;
  currentRole: RoleName;
}

export const WorkOrdersView: React.FC<WorkOrdersViewProps> = ({
  workOrders,
  facilities,
  technicians,
  parts,
  selectedStatusFilter,
  setSelectedStatusFilter,
  selectedOrder,
  setSelectedOrder,
  onTransition,
  onAssignTechnician,
  onLogTime,
  onAllocatePart,
  onOpenCreateModal,
  onRefreshData,
  currentRole,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('ALL');
  const [facilityFilter, setFacilityFilter] = useState('ALL');
  const [viewMode, setViewMode] = useState<'table' | 'kanban'>('table');

  // Sorting & Pagination
  const [sortBy, setSortBy] = useState<'number' | 'priority' | 'status' | 'sla' | 'created'>('created');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 8;

  // Drawer Active Tab
  const [drawerTab, setDrawerTab] = useState<'overview' | 'tasks' | 'parts' | 'time' | 'assignments' | 'comments' | 'attachments' | 'audit'>('overview');

  // Tasks / Checklist State
  interface ChecklistTaskItem {
    id: string;
    text: string;
    completed: boolean;
    completedAt?: string;
    completedBy?: string;
  }
  const defaultStandardProcedures = [
    'Safety Protocol & Lockout / Tagout (LOTO) Compliance Verification',
    'Visual Diagnostics & Error Code Assessment',
    'Component Replacement, Calibration, or Adjustment',
    'Operational Load & Pressure / Thermal Functional Testing',
    'Workspace Site Cleanup & Customer Sign-off Verification'
  ];
  const [orderChecklists, setOrderChecklists] = useState<Record<string, ChecklistTaskItem[]>>({});
  const [newTaskInputText, setNewTaskInputText] = useState('');

  // Operational Modules State (Parts, Live Timers & Inventory)
  const [facilityStock, setFacilityStock] = useState<FacilityInventory[]>([]);
  const [isLiveTimerRunning, setIsLiveTimerRunning] = useState(false);
  const [activeTimerEntry, setActiveTimerEntry] = useState<TimeEntry | null>(null);
  const [timerNotes, setTimerNotes] = useState('');
  const [isSubmittingTimer, setIsSubmittingTimer] = useState(false);
  const [timerActionError, setTimerActionError] = useState<string | null>(null);
  const [manualHourlyRate, setManualHourlyRate] = useState(85);
  const [manualIsBillable, setManualIsBillable] = useState(true);

  // Transition form state
  const [transitionNotes, setTransitionNotes] = useState('');
  const [holdReason, setHoldReason] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  // Time logging form state
  const [showTimeModal, setShowTimeModal] = useState(false);
  const [timeMinutes, setTimeMinutes] = useState(60);
  const [timeNotes, setTimeNotes] = useState('');
  const [timeType, setTimeType] = useState<'LABOR' | 'TRAVEL' | 'DIAGNOSIS'>('LABOR');

  // Part allocation form state
  const [showPartModal, setShowPartModal] = useState(false);
  const [selectedPartId, setSelectedPartId] = useState(parts[0]?.id || '');
  const [partQuantity, setPartQuantity] = useState(1);

  // Load facility inventory and timer status when work order is selected
  useEffect(() => {
    if (selectedOrder) {
      api.getFacilityInventory(selectedOrder.facilityId)
        .then(res => setFacilityStock(res))
        .catch(err => console.error('Failed to load facility inventory:', err));

      if (selectedOrder.timeEntries) {
        const running = selectedOrder.timeEntries.find(t => t.isRunning);
        setActiveTimerEntry(running || null);
        setIsLiveTimerRunning(!!running);
      }
    } else {
      setFacilityStock([]);
      setActiveTimerEntry(null);
      setIsLiveTimerRunning(false);
    }
  }, [selectedOrder?.id, selectedOrder?.facilityId]);

  // Comments form state
  const [commentContent, setCommentContent] = useState('');
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);

  // Attachment upload modal state
  const [showAttachmentModal, setShowAttachmentModal] = useState(false);
  const [attachmentUrl, setAttachmentUrl] = useState('');
  const [attachmentCaption, setAttachmentCaption] = useState('');
  const [isSubmittingAttachment, setIsSubmittingAttachment] = useState(false);

  // Edit Work Order modal state
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editPriority, setEditPriority] = useState<Priority>('MEDIUM');
  const [editCategory, setEditCategory] = useState('');
  const [editDueDate, setEditDueDate] = useState('');
  const [isSubmittingEdit, setIsSubmittingEdit] = useState(false);

  // Delete Confirmation Modal State
  const [orderToDelete, setOrderToDelete] = useState<WorkOrder | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Filtering & Sorting
  const filteredOrders = workOrders.filter((wo) => {
    const matchesSearch = 
      wo.workOrderNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      wo.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      wo.facilityName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (wo.customerName && wo.customerName.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (wo.assignedTechnicianName && wo.assignedTechnicianName.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesStatus = selectedStatusFilter === 'ALL' || wo.status === selectedStatusFilter;
    const matchesPriority = priorityFilter === 'ALL' || wo.priority === priorityFilter;
    const matchesFacility = facilityFilter === 'ALL' || wo.facilityId === facilityFilter;

    return matchesSearch && matchesStatus && matchesPriority && matchesFacility;
  }).sort((a, b) => {
    let comparison = 0;
    if (sortBy === 'number') {
      comparison = a.workOrderNumber.localeCompare(b.workOrderNumber);
    } else if (sortBy === 'priority') {
      const pWeights: Record<string, number> = { CRITICAL: 4, HIGH: 3, MEDIUM: 2, LOW: 1 };
      comparison = (pWeights[a.priority] || 0) - (pWeights[b.priority] || 0);
    } else if (sortBy === 'status') {
      comparison = a.status.localeCompare(b.status);
    } else if (sortBy === 'sla') {
      comparison = new Date(a.slaResolutionDeadline).getTime() - new Date(b.slaResolutionDeadline).getTime();
    } else {
      comparison = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    }
    return sortOrder === 'asc' ? comparison : -comparison;
  });

  const totalPages = Math.ceil(filteredOrders.length / pageSize) || 1;
  const paginatedOrders = filteredOrders.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const lifecycleSteps: WorkOrderStatus[] = [
    'NEW', 'TRIAGED', 'ASSIGNED', 'ACCEPTED', 
    'IN_PROGRESS', 'ON_HOLD', 'COMPLETED', 'VERIFIED', 'CLOSED'
  ];

  const handleExecuteTransition = async (target: WorkOrderStatus) => {
    if (!selectedOrder) return;
    setIsSubmitting(true);
    setActionError(null);
    try {
      await onTransition(selectedOrder.id, target, transitionNotes, { holdReason, rejectionReason });
      setTransitionNotes('');
      setHoldReason('');
      setRejectionReason('');
      if (onRefreshData) await onRefreshData();
    } catch (err: any) {
      setActionError(err.message || 'Transition rejected by state machine');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenEditModal = () => {
    if (!selectedOrder) return;
    setEditTitle(selectedOrder.title);
    setEditDescription(selectedOrder.description);
    setEditPriority(selectedOrder.priority);
    setEditCategory(selectedOrder.category);
    setEditDueDate(selectedOrder.dueDate ? new Date(selectedOrder.dueDate).toISOString().slice(0, 16) : '');
    setIsEditModalOpen(true);
  };

  const handleSaveEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrder) return;

    setIsSubmittingEdit(true);
    try {
      const updated = await api.updateWorkOrder(selectedOrder.id, {
        title: editTitle,
        description: editDescription,
        priority: editPriority,
        category: editCategory,
        dueDate: editDueDate || undefined,
      });

      setSelectedOrder(updated);
      setIsEditModalOpen(false);
      if (onRefreshData) await onRefreshData();
    } catch (err: any) {
      alert(`Failed to update work order: ${err.message}`);
    } finally {
      setIsSubmittingEdit(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!orderToDelete) return;

    setIsDeleting(true);
    try {
      await api.deleteWorkOrder(orderToDelete.id);
      if (selectedOrder?.id === orderToDelete.id) {
        setSelectedOrder(null);
      }
      setOrderToDelete(null);
      if (onRefreshData) await onRefreshData();
    } catch (err: any) {
      alert(`Failed to delete work order: ${err.message}`);
    } finally {
      setIsDeleting(false);
    }
  };

  const renderSlaBadge = (slaStatus?: string, remainingMinutes?: number, overdueMinutes?: number) => {
    if (slaStatus === 'BREACHED') {
      return (
        <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-rose-500/20 text-rose-400 border border-rose-500/30 inline-flex items-center gap-1">
          <AlertTriangle className="w-3 h-3 shrink-0" />
          BREACHED {overdueMinutes ? `(+${Math.round(overdueMinutes / 60)}h)` : ''}
        </span>
      );
    }
    if (slaStatus === 'AT_RISK') {
      return (
        <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-amber-500/20 text-amber-400 border border-amber-500/30 inline-flex items-center gap-1">
          <Clock className="w-3 h-3 shrink-0" />
          AT RISK {remainingMinutes ? `(${Math.round(remainingMinutes)}m left)` : ''}
        </span>
      );
    }
    if (slaStatus === 'COMPLETED') {
      return (
        <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-teal-500/20 text-teal-400 border border-teal-500/30 inline-flex items-center gap-1">
          <CheckCircle2 className="w-3 h-3 shrink-0" />
          SLA MET
        </span>
      );
    }
    return (
      <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 inline-flex items-center gap-1">
        <CheckCircle2 className="w-3 h-3 shrink-0" />
        ON TRACK {remainingMinutes ? `(${Math.round(remainingMinutes / 60)}h)` : ''}
      </span>
    );
  };

  const handleStartLiveTimer = async (technicianId: string, entryType = 'LABOR') => {
    if (!selectedOrder) return;
    setIsSubmittingTimer(true);
    setTimerActionError(null);
    try {
      const updated = await api.startTimer(selectedOrder.id, {
        technicianId,
        entryType,
        isBillable: true,
        description: `Live labor timer for WO #${selectedOrder.workOrderNumber}`,
      });
      setSelectedOrder(updated);
      const running = updated.timeEntries?.find(t => t.isRunning);
      setActiveTimerEntry(running || null);
      setIsLiveTimerRunning(!!running);
      if (onRefreshData) await onRefreshData();
    } catch (err: any) {
      setTimerActionError(err.message || 'Failed to start live timer');
    } finally {
      setIsSubmittingTimer(false);
    }
  };

  const handleStopLiveTimer = async (timeEntryId: string, notes: string) => {
    if (!selectedOrder) return;
    setIsSubmittingTimer(true);
    setTimerActionError(null);
    try {
      const updated = await api.stopTimer(selectedOrder.id, {
        timeEntryId,
        notes: notes.trim() || 'Completed live labor session',
      });
      setSelectedOrder(updated);
      setActiveTimerEntry(null);
      setIsLiveTimerRunning(false);
      setTimerNotes('');
      if (onRefreshData) await onRefreshData();
    } catch (err: any) {
      setTimerActionError(err.message || 'Failed to stop live timer');
    } finally {
      setIsSubmittingTimer(false);
    }
  };

  const handleRemoveAllocatedPart = async (partId: string) => {
    if (!selectedOrder) return;
    if (!window.confirm('Remove this part from the work order? Stock will be restored to facility inventory.')) return;
    setActionError(null);
    try {
      const updated = await api.removePart(selectedOrder.id, partId);
      setSelectedOrder(updated);
      const updatedStock = await api.getFacilityInventory(selectedOrder.facilityId);
      setFacilityStock(updatedStock);
      if (onRefreshData) await onRefreshData();
    } catch (err: any) {
      setActionError(err.message || 'Failed to remove allocated part');
    }
  };

  const handleDeleteWorkOrderTimeEntry = async (timeEntryId: string) => {
    if (!selectedOrder) return;
    if (!window.confirm('Delete this logged time entry? Labor costs will be recalculated.')) return;
    setActionError(null);
    try {
      const updated = await api.deleteTimeEntry(selectedOrder.id, timeEntryId);
      setSelectedOrder(updated);
      if (onRefreshData) await onRefreshData();
    } catch (err: any) {
      setActionError(err.message || 'Failed to delete time entry');
    }
  };

  const handleSaveTime = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrder) return;
    try {
      await onLogTime(selectedOrder.id, timeMinutes, timeType, timeNotes);
      setShowTimeModal(false);
      setTimeNotes('');
      const updated = await api.getWorkOrder(selectedOrder.id);
      setSelectedOrder(updated);
      if (onRefreshData) await onRefreshData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleSavePart = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrder || !selectedPartId) return;

    // Check facility inventory availability
    const stockRecord = facilityStock.find(i => i.partId === selectedPartId);
    if (stockRecord && stockRecord.stockOnHand < partQuantity) {
      alert(`Insufficient stock at this facility! Available: ${stockRecord.stockOnHand}, requested: ${partQuantity}.`);
      return;
    }

    try {
      await onAllocatePart(selectedOrder.id, selectedPartId, partQuantity);
      setShowPartModal(false);
      const updated = await api.getWorkOrder(selectedOrder.id);
      setSelectedOrder(updated);
      const updatedStock = await api.getFacilityInventory(selectedOrder.facilityId);
      setFacilityStock(updatedStock);
      if (onRefreshData) await onRefreshData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handlePostComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrder || !commentContent.trim()) return;

    setIsSubmittingComment(true);
    try {
      const comment = await api.addWorkOrderComment(selectedOrder.id, commentContent.trim());
      setSelectedOrder({
        ...selectedOrder,
        comments: [...(selectedOrder.comments || []), comment],
      });
      setCommentContent('');
      if (onRefreshData) await onRefreshData();
    } catch (err: any) {
      alert(`Failed to add comment: ${err.message}`);
    } finally {
      setIsSubmittingComment(false);
    }
  };

  const handleUploadAttachment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrder || !attachmentUrl.trim()) return;

    setIsSubmittingAttachment(true);
    try {
      const attachment = await api.addWorkOrderAttachment(selectedOrder.id, {
        fileName: 'job_attachment.jpg',
        url: attachmentUrl.trim(),
        caption: attachmentCaption || 'Field inspection verification',
      });

      setSelectedOrder({
        ...selectedOrder,
        attachments: [...(selectedOrder.attachments || []), attachment],
      });

      setShowAttachmentModal(false);
      setAttachmentUrl('');
      setAttachmentCaption('');
      if (onRefreshData) await onRefreshData();
    } catch (err: any) {
      alert(`Failed to upload attachment: ${err.message}`);
    } finally {
      setIsSubmittingAttachment(false);
    }
  };

  const canManageWorkOrders = ['SUPER_ADMIN', 'ADMIN', 'DISPATCHER'].includes(currentRole);

  return (
    <div className="space-y-6">
      {/* View Header & Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-xl font-bold text-white tracking-tight">Work Orders & Lifecycle Operations</h1>
            <span className="px-2 py-0.5 text-[10px] font-mono bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 rounded uppercase font-semibold">
              9-Stage FSM Core
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Deterministic lifecycle state machine from intake to verification and closure with immutable audit records.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          {/* View Mode Switcher */}
          <div className="flex items-center bg-slate-900 p-1 rounded-lg border border-slate-800">
            <button
              onClick={() => setViewMode('table')}
              className={`p-1.5 rounded text-xs font-semibold flex items-center space-x-1 transition-all ${
                viewMode === 'table' ? 'bg-slate-800 text-cyan-400 shadow-xs' : 'text-slate-400 hover:text-white'
              }`}
            >
              <List className="w-4 h-4" />
              <span className="hidden sm:inline">Table</span>
            </button>
            <button
              onClick={() => setViewMode('kanban')}
              className={`p-1.5 rounded text-xs font-semibold flex items-center space-x-1 transition-all ${
                viewMode === 'kanban' ? 'bg-slate-800 text-cyan-400 shadow-xs' : 'text-slate-400 hover:text-white'
              }`}
            >
              <LayoutGrid className="w-4 h-4" />
              <span className="hidden sm:inline">Kanban</span>
            </button>
          </div>

          {canManageWorkOrders && (
            <button
              onClick={onOpenCreateModal}
              className="px-3 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg text-xs font-semibold flex items-center space-x-1.5 shadow-sm shadow-cyan-600/30 transition-all"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>New Work Order</span>
            </button>
          )}
        </div>
      </div>

      {/* Filtering & Sorting Controls Bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-1 min-w-[260px]">
          <div className="relative w-full max-w-sm">
            <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              placeholder="Search by WO #, title, tech, customer..."
              className="w-full pl-9 pr-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500"
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Status Filter */}
          <select
            value={selectedStatusFilter}
            onChange={(e) => {
              setSelectedStatusFilter(e.target.value);
              setCurrentPage(1);
            }}
            className="py-1 px-2.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-300 focus:outline-none focus:border-cyan-500"
          >
            <option value="ALL">All Statuses</option>
            {lifecycleSteps.map(s => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>

          {/* Priority Filter */}
          <select
            value={priorityFilter}
            onChange={(e) => {
              setPriorityFilter(e.target.value);
              setCurrentPage(1);
            }}
            className="py-1 px-2.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-300 focus:outline-none focus:border-cyan-500"
          >
            <option value="ALL">All Priorities</option>
            <option value="CRITICAL">CRITICAL</option>
            <option value="HIGH">HIGH</option>
            <option value="MEDIUM">MEDIUM</option>
            <option value="LOW">LOW</option>
          </select>

          {/* Facility Filter */}
          <select
            value={facilityFilter}
            onChange={(e) => {
              setFacilityFilter(e.target.value);
              setCurrentPage(1);
            }}
            className="py-1 px-2.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-300 focus:outline-none focus:border-cyan-500"
          >
            <option value="ALL">All Facilities</option>
            {facilities.map(f => (
              <option key={f.id} value={f.id}>{f.name}</option>
            ))}
          </select>

          {/* Sort Column & Direction */}
          <div className="flex items-center bg-slate-950 border border-slate-800 rounded-lg overflow-hidden">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="py-1 px-2.5 bg-transparent text-xs text-slate-300 focus:outline-none"
            >
              <option value="created">Created Date</option>
              <option value="number">WO Number</option>
              <option value="priority">Priority</option>
              <option value="status">Status</option>
              <option value="sla">SLA Deadline</option>
            </select>
            <button
              onClick={() => setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')}
              title={`Sort ${sortOrder === 'asc' ? 'Descending' : 'Ascending'}`}
              className="px-2 py-1 bg-slate-900 text-slate-400 hover:text-white text-xs border-l border-slate-800"
            >
              {sortOrder === 'asc' ? '↑' : '↓'}
            </button>
          </div>
        </div>
      </div>

      {/* Main View: Table vs Kanban */}
      {viewMode === 'table' ? (
        <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden space-y-2">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-950 text-slate-400 font-semibold border-b border-slate-800">
                <tr>
                  <th className="py-3 px-4">WO Number</th>
                  <th className="py-3 px-4">Title & Facility</th>
                  <th className="py-3 px-4">Priority</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Assigned Tech</th>
                  <th className="py-3 px-4">SLA Resolution</th>
                  <th className="py-3 px-4">Due Date</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80">
                {paginatedOrders.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-slate-500">
                      No work orders matching current filter criteria.
                    </td>
                  </tr>
                ) : (
                  paginatedOrders.map((wo) => {
                    const isSlaBreached = wo.isSlaResolutionBreached || wo.isSlaResponseBreached;
                    return (
                      <tr
                        key={wo.id}
                        onClick={() => {
                          setSelectedOrder(wo);
                          setDrawerTab('overview');
                        }}
                        className="hover:bg-slate-800/50 cursor-pointer transition-colors"
                      >
                        <td className="py-3 px-4 font-mono font-bold text-slate-100">
                          {wo.workOrderNumber}
                        </td>
                        <td className="py-3 px-4 max-w-sm">
                          <div className="font-semibold text-slate-100 truncate">{wo.title}</div>
                          <div className="text-[11px] text-slate-400 truncate">{wo.facilityName}</div>
                        </td>
                        <td className="py-3 px-4">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                            wo.priority === 'CRITICAL' ? 'bg-rose-500/20 text-rose-400' :
                            wo.priority === 'HIGH' ? 'bg-amber-500/20 text-amber-400' :
                            wo.priority === 'MEDIUM' ? 'bg-blue-500/20 text-blue-400' : 
                            'bg-slate-700 text-slate-300'
                          }`}>
                            {wo.priority}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <span className={`px-2 py-0.5 text-[10px] font-bold uppercase rounded border ${
                            wo.status === 'IN_PROGRESS' ? 'bg-amber-500/10 text-amber-400 border-amber-500/30' :
                            wo.status === 'COMPLETED' ? 'bg-teal-500/10 text-teal-400 border-teal-500/30' :
                            wo.status === 'VERIFIED' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' :
                            wo.status === 'ASSIGNED' ? 'bg-blue-500/10 text-blue-400 border-blue-500/30' :
                            wo.status === 'ON_HOLD' ? 'bg-orange-500/10 text-orange-400 border-orange-500/30' :
                            wo.status === 'CLOSED' ? 'bg-slate-700/50 text-slate-400 border-slate-700' :
                            'bg-slate-800 text-slate-300 border-slate-700'
                          }`}>
                            {wo.status}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-slate-300">
                          {wo.assignedTechnicianName ? (
                            <span className="flex items-center gap-1">
                              <UserCheck className="w-3 h-3 text-cyan-400" />
                              {wo.assignedTechnicianName}
                            </span>
                          ) : (
                            <span className="text-slate-500 italic">Unassigned</span>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          {renderSlaBadge(wo.slaStatus, wo.slaResolutionRemainingMinutes, wo.slaResolutionOverdueMinutes)}
                        </td>
                        <td className="py-3 px-4 text-[11px] text-slate-400">
                          {wo.dueDate ? new Date(wo.dueDate).toLocaleDateString() : 'N/A'}
                        </td>
                        <td className="py-3 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => {
                                setSelectedOrder(wo);
                                setDrawerTab('overview');
                              }}
                              className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-cyan-400 font-semibold rounded inline-flex items-center text-[11px]"
                            >
                              Inspect <ChevronRight className="w-3 h-3 ml-0.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls */}
          {filteredOrders.length > 0 && (
            <div className="p-3 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
              <div>
                Showing {(currentPage - 1) * pageSize + 1} to {Math.min(currentPage * pageSize, filteredOrders.length)} of {filteredOrders.length} work orders
              </div>
              <div className="flex items-center gap-1">
                <button
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  className="p-1 rounded bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-200"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="px-2 py-1 font-mono text-slate-300">
                  Page {currentPage} of {totalPages}
                </span>
                <button
                  disabled={currentPage >= totalPages}
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  className="p-1 rounded bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-200"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      ) : (
        /* Kanban Board View */
        <div className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-5 gap-4 overflow-x-auto pb-4">
          {(['NEW', 'TRIAGED', 'ASSIGNED', 'IN_PROGRESS', 'COMPLETED'] as WorkOrderStatus[]).map((stage) => {
            const stageOrders = filteredOrders.filter(w => w.status === stage);
            return (
              <div key={stage} className="bg-slate-900 p-3 rounded-xl border border-slate-800 flex flex-col h-[650px]">
                <div className="flex items-center justify-between pb-2 border-b border-slate-800 mb-3">
                  <span className="font-bold text-xs text-slate-200 uppercase tracking-wider">{stage}</span>
                  <span className="bg-slate-800 text-slate-400 text-xs px-2 py-0.5 rounded-full font-bold">
                    {stageOrders.length}
                  </span>
                </div>
                <div className="space-y-2.5 overflow-y-auto flex-1 pr-1">
                  {stageOrders.map((wo) => (
                    <div
                      key={wo.id}
                      onClick={() => {
                        setSelectedOrder(wo);
                        setDrawerTab('overview');
                      }}
                      className="bg-slate-950 p-3 rounded-lg border border-slate-800 shadow-xs hover:border-cyan-500/60 cursor-pointer transition-all hover:shadow-md"
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="font-mono text-xs font-bold text-slate-200">{wo.workOrderNumber}</span>
                        <span className={`px-1.5 py-0.5 text-[9px] font-bold rounded uppercase ${
                          wo.priority === 'CRITICAL' ? 'bg-rose-500/20 text-rose-400' :
                          wo.priority === 'HIGH' ? 'bg-amber-500/20 text-amber-400' : 'bg-slate-800 text-slate-400'
                        }`}>
                          {wo.priority}
                        </span>
                      </div>
                      <h4 className="text-xs font-semibold text-slate-200 line-clamp-2">{wo.title}</h4>
                      <p className="text-[11px] text-slate-400 mt-1 truncate">{wo.facilityName}</p>
                      <div className="mt-2">
                        {renderSlaBadge(wo.slaStatus, wo.slaResolutionRemainingMinutes, wo.slaResolutionOverdueMinutes)}
                      </div>
                      <div className="mt-2 pt-2 border-t border-slate-800/80 flex items-center justify-between text-[10px] text-slate-400">
                        <span>{wo.assignedTechnicianName || 'Unassigned'}</span>
                        <span>{wo.estimatedDurationHours}h</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Work Order Lifecycle Inspector Drawer */}
      {selectedOrder && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-end">
          <div className="bg-slate-900 border-l border-slate-800 w-full max-w-2xl h-full shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-right duration-200">
            {/* Drawer Header */}
            <div className="p-5 border-b border-slate-800 flex items-start justify-between bg-slate-950">
              <div>
                <div className="flex items-center space-x-2">
                  <span className="font-mono text-base font-extrabold text-white">
                    {selectedOrder.workOrderNumber}
                  </span>
                  <span className={`px-2 py-0.5 text-xs font-bold rounded uppercase ${
                    selectedOrder.priority === 'CRITICAL' ? 'bg-rose-500/20 text-rose-400' :
                    selectedOrder.priority === 'HIGH' ? 'bg-amber-500/20 text-amber-400' :
                    selectedOrder.priority === 'MEDIUM' ? 'bg-blue-500/20 text-blue-400' : 'bg-slate-800 text-slate-300'
                  }`}>
                    {selectedOrder.priority}
                  </span>
                  <span className="px-2 py-0.5 text-xs font-semibold rounded bg-slate-800 text-slate-300">
                    {selectedOrder.category}
                  </span>
                </div>
                <h2 className="text-base font-bold text-white mt-1">{selectedOrder.title}</h2>
                <div className="text-xs text-slate-400 mt-0.5">
                  {selectedOrder.facilityName} &bull; Created {new Date(selectedOrder.createdAt).toLocaleDateString()}
                  {selectedOrder.customerName && ` &bull; Requested by ${selectedOrder.customerName}`}
                </div>
              </div>

              <div className="flex items-center gap-1.5">
                {/* Edit Button */}
                {canManageWorkOrders && selectedOrder.status !== 'CLOSED' && (
                  <button
                    onClick={handleOpenEditModal}
                    title="Edit Work Order"
                    className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
                  >
                    <Edit3 className="w-4 h-4" />
                  </button>
                )}

                {/* Delete Button */}
                {canManageWorkOrders && (
                  <button
                    onClick={() => setOrderToDelete(selectedOrder)}
                    title="Delete / Archive Work Order"
                    className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-950/40"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}

                <button
                  onClick={() => setSelectedOrder(null)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Navigation Tabs inside Drawer */}
            {(() => {
              const activeChecklistTasks = selectedOrder ? (orderChecklists[selectedOrder.id] || defaultStandardProcedures.map((desc, idx) => ({
                id: `task-${idx + 1}`,
                text: desc,
                completed: idx === 0 && selectedOrder.status !== 'NEW',
                completedAt: idx === 0 ? selectedOrder.createdAt : undefined,
                completedBy: idx === 0 ? (selectedOrder.assignedTechnicianName || 'Dispatcher') : undefined,
              }))) : [];
              const completedTasksCount = activeChecklistTasks.filter(t => t.completed).length;

              return (
                <div className="flex border-b border-slate-800 bg-slate-950 px-4 gap-2 text-xs font-semibold overflow-x-auto">
                  <button
                    onClick={() => setDrawerTab('overview')}
                    className={`py-2.5 px-3 border-b-2 transition-all flex items-center gap-1.5 whitespace-nowrap ${
                      drawerTab === 'overview'
                        ? 'border-cyan-400 text-cyan-400 font-bold'
                        : 'border-transparent text-slate-400 hover:text-white'
                    }`}
                  >
                    <span>Overview & SLA</span>
                  </button>

                  <button
                    onClick={() => setDrawerTab('tasks')}
                    className={`py-2.5 px-3 border-b-2 transition-all flex items-center gap-1.5 whitespace-nowrap ${
                      drawerTab === 'tasks'
                        ? 'border-cyan-400 text-cyan-400 font-bold'
                        : 'border-transparent text-slate-400 hover:text-white'
                    }`}
                  >
                    <CheckSquare className="w-3.5 h-3.5" />
                    <span>Tasks / Checklist ({completedTasksCount}/{activeChecklistTasks.length})</span>
                  </button>

                  <button
                    onClick={() => setDrawerTab('parts')}
                    className={`py-2.5 px-3 border-b-2 transition-all flex items-center gap-1.5 whitespace-nowrap ${
                      drawerTab === 'parts'
                        ? 'border-cyan-400 text-cyan-400 font-bold'
                        : 'border-transparent text-slate-400 hover:text-white'
                    }`}
                  >
                    <Boxes className="w-3.5 h-3.5" />
                    <span>Parts Used ({selectedOrder.parts?.length || 0})</span>
                  </button>

                  <button
                    onClick={() => setDrawerTab('time')}
                    className={`py-2.5 px-3 border-b-2 transition-all flex items-center gap-1.5 whitespace-nowrap ${
                      drawerTab === 'time'
                        ? 'border-cyan-400 text-cyan-400 font-bold'
                        : 'border-transparent text-slate-400 hover:text-white'
                    }`}
                  >
                    <Clock className="w-3.5 h-3.5" />
                    <span>Time Entries ({selectedOrder.timeEntries?.length || 0})</span>
                  </button>

                  <button
                    onClick={() => setDrawerTab('comments')}
                    className={`py-2.5 px-3 border-b-2 transition-all flex items-center gap-1.5 whitespace-nowrap ${
                      drawerTab === 'comments'
                        ? 'border-cyan-400 text-cyan-400 font-bold'
                        : 'border-transparent text-slate-400 hover:text-white'
                    }`}
                  >
                    <MessageSquare className="w-3.5 h-3.5" />
                    <span>Notes & Comments ({selectedOrder.comments?.length || 0})</span>
                  </button>

                  <button
                    onClick={() => setDrawerTab('attachments')}
                    className={`py-2.5 px-3 border-b-2 transition-all flex items-center gap-1.5 whitespace-nowrap ${
                      drawerTab === 'attachments'
                        ? 'border-cyan-400 text-cyan-400 font-bold'
                        : 'border-transparent text-slate-400 hover:text-white'
                    }`}
                  >
                    <Paperclip className="w-3.5 h-3.5" />
                    <span>Attachments & Photos ({selectedOrder.attachments?.length || 0})</span>
                  </button>

                  <button
                    onClick={() => setDrawerTab('audit')}
                    className={`py-2.5 px-3 border-b-2 transition-all flex items-center gap-1.5 whitespace-nowrap ${
                      drawerTab === 'audit'
                        ? 'border-cyan-400 text-cyan-400 font-bold'
                        : 'border-transparent text-slate-400 hover:text-white'
                    }`}
                  >
                    <ShieldAlert className="w-3.5 h-3.5" />
                    <span>Activity Timeline & Audit ({selectedOrder.auditLogs?.length || 0})</span>
                  </button>

                  <button
                    onClick={() => setDrawerTab('assignments')}
                    className={`py-2.5 px-3 border-b-2 transition-all flex items-center gap-1.5 whitespace-nowrap ${
                      drawerTab === 'assignments'
                        ? 'border-cyan-400 text-cyan-400 font-bold'
                        : 'border-transparent text-slate-400 hover:text-white'
                    }`}
                  >
                    <History className="w-3.5 h-3.5" />
                    <span>Assignments ({selectedOrder.assignmentHistory?.length || 0})</span>
                  </button>
                </div>
              );
            })()}

            {/* Drawer Body (Scrollable) */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6 text-xs">
              {/* Error Banner */}
              {actionError && (
                <div className="p-3 bg-rose-950/40 border border-rose-800 text-rose-300 text-xs rounded-lg flex items-start">
                  <AlertCircle className="w-4 h-4 mr-2 shrink-0 mt-0.5 text-rose-400" />
                  <span>{actionError}</span>
                </div>
              )}

              {/* OVERVIEW TAB */}
              {drawerTab === 'overview' && (
                <div className="space-y-6">
                  {/* Lifecycle Progress Stepper */}
                  <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xs font-bold text-white uppercase tracking-wider">
                        Work Order FSM Lifecycle Stage
                      </span>
                      <span className="px-2 py-0.5 text-xs font-bold bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 rounded">
                        Current: {selectedOrder.status}
                      </span>
                    </div>

                    {/* Visual Step Rail */}
                    <div className="grid grid-cols-9 gap-1 py-2">
                      {lifecycleSteps.map((step, idx) => {
                        const currentIdx = lifecycleSteps.indexOf(selectedOrder.status);
                        const isPassed = idx < currentIdx;
                        const isCurrent = idx === currentIdx;

                        return (
                          <div key={step} className="flex flex-col items-center">
                            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold ${
                              isCurrent ? 'bg-cyan-500 text-white ring-2 ring-cyan-400/50' :
                              isPassed ? 'bg-cyan-950 text-cyan-300 border border-cyan-700/50' : 'bg-slate-800 text-slate-500'
                            }`}>
                              {idx + 1}
                            </div>
                            <span className={`text-[8px] font-medium mt-1 truncate max-w-full ${
                              isCurrent ? 'text-cyan-400 font-bold' : 'text-slate-500'
                            }`}>
                              {step}
                            </span>
                          </div>
                        );
                      })}
                    </div>

                    {/* State Machine Transition Actions */}
                    <div className="mt-4 pt-3 border-t border-slate-800">
                      <div className="text-xs font-semibold text-slate-300 mb-2">
                        Permitted Next Transitions (Deterministic):
                      </div>

                      {selectedOrder.permittedNextStates && selectedOrder.permittedNextStates.length > 0 ? (
                        <div className="space-y-3">
                          <div className="flex flex-wrap gap-2">
                            {selectedOrder.permittedNextStates.map((target) => (
                              <button
                                key={target}
                                disabled={isSubmitting}
                                onClick={() => handleExecuteTransition(target)}
                                className="px-3 py-1.5 bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white text-xs font-semibold rounded-lg shadow-xs flex items-center space-x-1"
                              >
                                <span>Move to {target}</span>
                                <ArrowRight className="w-3.5 h-3.5" />
                              </button>
                            ))}
                          </div>

                          {/* Notes & Optional reasons */}
                          <div className="space-y-2">
                            <input
                              type="text"
                              placeholder="Audit log transition notes or sign-off remarks..."
                              value={transitionNotes}
                              onChange={(e) => setTransitionNotes(e.target.value)}
                              className="w-full text-xs px-3 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                            />
                            {selectedOrder.status === 'IN_PROGRESS' && (
                              <input
                                type="text"
                                placeholder="Hold Reason (Required if switching to ON_HOLD)..."
                                value={holdReason}
                                onChange={(e) => setHoldReason(e.target.value)}
                                className="w-full text-xs px-3 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                              />
                            )}
                          </div>
                        </div>
                      ) : (
                        <div className="text-xs text-slate-500 italic">
                          {selectedOrder.status === 'CLOSED' 
                            ? 'Work order is in terminal state CLOSED. Audit log permanently sealed.' 
                            : 'No valid transitions available from this state for current role.'}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* SLA Countdown & Policy Compliance Card */}
                  <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-3">
                    <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
                      <div className="flex items-center gap-2">
                        <Shield className="w-4 h-4 text-cyan-400" />
                        <span className="text-xs font-bold text-white uppercase tracking-wider">Service Level Agreement (SLA)</span>
                      </div>
                      <div>
                        {renderSlaBadge(selectedOrder.slaStatus, selectedOrder.slaResolutionRemainingMinutes, selectedOrder.slaResolutionOverdueMinutes)}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                      <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800/60">
                        <div className="text-[11px] text-slate-400">Response Target ({selectedOrder.slaResponseTargetMinutes || 60}m)</div>
                        <div className="font-semibold text-slate-200 mt-0.5 flex items-center justify-between">
                          <span>{new Date(selectedOrder.slaResponseDeadline).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                          {selectedOrder.isSlaResponseBreached ? (
                            <span className="text-[10px] text-rose-400 font-bold">BREACHED</span>
                          ) : selectedOrder.slaRespondedAt ? (
                            <span className="text-[10px] text-teal-400 font-bold">RESPONDED</span>
                          ) : (
                            <span className="text-[10px] text-emerald-400 font-bold">PENDING</span>
                          )}
                        </div>
                      </div>

                      <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800/60">
                        <div className="text-[11px] text-slate-400">Resolution Target ({selectedOrder.slaResolutionTargetMinutes || 240}m)</div>
                        <div className="font-semibold text-slate-200 mt-0.5 flex items-center justify-between">
                          <span>{new Date(selectedOrder.slaResolutionDeadline).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                          {selectedOrder.isSlaResolutionBreached ? (
                            <span className="text-[10px] text-rose-400 font-bold">+{Math.round(selectedOrder.slaResolutionOverdueMinutes || 0)}m OVER</span>
                          ) : (
                            <span className="text-[10px] text-cyan-400 font-bold">{Math.round(selectedOrder.slaResolutionRemainingMinutes || 0)}m REMAINING</span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="text-[11px] text-slate-400 flex items-center justify-between pt-1">
                      <span>Policy: <strong className="text-slate-300">{selectedOrder.slaPolicyName || 'Default Priority Policy'}</strong></span>
                      <span>Created: <strong className="text-slate-300">{new Date(selectedOrder.createdAt).toLocaleDateString()}</strong></span>
                    </div>
                  </div>

                  {/* Financial & Job Costing Summary Card */}
                  <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-3">
                    <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
                      <div className="flex items-center gap-2">
                        <DollarSign className="w-4 h-4 text-emerald-400" />
                        <span className="text-xs font-bold text-white uppercase tracking-wider">Job Costing & Financials</span>
                      </div>
                      <span className="text-[11px] text-slate-400 font-medium">Real-time cost accounting</span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
                      <div className="p-2 rounded-lg bg-slate-900 border border-slate-800/60">
                        <span className="text-[10px] text-slate-500 uppercase block font-semibold">Parts Cost</span>
                        <span className="text-sm font-bold text-slate-200">${(selectedOrder.partsCost || 0).toFixed(2)}</span>
                      </div>
                      <div className="p-2 rounded-lg bg-slate-900 border border-slate-800/60">
                        <span className="text-[10px] text-slate-500 uppercase block font-semibold">Labor Cost</span>
                        <span className="text-sm font-bold text-slate-200">${(selectedOrder.laborCost || 0).toFixed(2)}</span>
                      </div>
                      <div className="p-2 rounded-lg bg-slate-900 border border-slate-800/60">
                        <span className="text-[10px] text-slate-500 uppercase block font-semibold">Total Cost</span>
                        <span className="text-sm font-bold text-slate-200">${(selectedOrder.totalCost || 0).toFixed(2)}</span>
                      </div>
                      <div className="p-2 rounded-lg bg-emerald-950/30 border border-emerald-800/40">
                        <span className="text-[10px] text-emerald-400 uppercase block font-semibold">Billable Total</span>
                        <span className="text-sm font-bold text-emerald-300">${(selectedOrder.totalPrice || 0).toFixed(2)}</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-xs pt-1 px-1">
                      <div className="flex items-center gap-1.5 text-slate-400">
                        <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Gross Margin:</span>
                        <strong className="text-emerald-400">
                          ${((selectedOrder.totalPrice || 0) - (selectedOrder.totalCost || 0)).toFixed(2)}
                        </strong>
                      </div>
                      <span className="text-slate-400">
                        Margin %: <strong className="text-cyan-400">
                          {(selectedOrder.totalPrice || 0) > 0 
                            ? ((( (selectedOrder.totalPrice || 0) - (selectedOrder.totalCost || 0) ) / (selectedOrder.totalPrice || 1)) * 100).toFixed(1) + '%'
                            : '0.0%'}
                        </strong>
                      </span>
                    </div>
                  </div>

                  {/* Metadata & Equipment Info */}
                  <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 grid grid-cols-2 gap-3 text-xs">
                    <div>
                      <span className="text-slate-500 block text-[11px]">Due Date:</span>
                      <span className="text-slate-200 font-semibold flex items-center gap-1 mt-0.5">
                        <Calendar className="w-3.5 h-3.5 text-cyan-400" />
                        {selectedOrder.dueDate ? new Date(selectedOrder.dueDate).toLocaleString() : 'N/A'}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[11px]">Associated Asset:</span>
                      <span className="text-slate-200 font-semibold flex items-center gap-1 mt-0.5">
                        <Box className="w-3.5 h-3.5 text-cyan-400" />
                        {selectedOrder.assetName || 'General Facility'}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[11px]">SLA Resolution Deadline:</span>
                      <span className="text-slate-200 font-semibold flex items-center gap-1 mt-0.5">
                        <Clock className="w-3.5 h-3.5 text-amber-400" />
                        {new Date(selectedOrder.slaResolutionDeadline).toLocaleString()}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[11px]">Customer / Facility:</span>
                      <span className="text-slate-200 font-semibold flex items-center gap-1 mt-0.5">
                        <User className="w-3.5 h-3.5 text-cyan-400" />
                        {selectedOrder.customerName || selectedOrder.facilityName}
                      </span>
                    </div>
                  </div>

                  {/* Description & Equipment Details */}
                  <div className="space-y-2">
                    <h3 className="text-xs font-bold text-white uppercase tracking-wider">Problem Description</h3>
                    <p className="text-xs text-slate-300 bg-slate-950 p-3 rounded-lg border border-slate-800 leading-relaxed">
                      {selectedOrder.description}
                    </p>
                    {selectedOrder.holdReason && (
                      <div className="p-3 bg-amber-950/30 border border-amber-800/40 rounded-lg text-xs text-amber-300">
                        <span className="font-bold">Hold Reason:</span> {selectedOrder.holdReason}
                      </div>
                    )}
                  </div>

                  {/* Assignment & Technician Dispatch */}
                  <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-3">
                    <div className="flex items-center justify-between">
                      <h3 className="text-xs font-bold text-white uppercase tracking-wider">Assigned Field Technician</h3>
                      <div className="text-xs text-slate-400">
                        {selectedOrder.assignedTechnicianName ? 'Dispatched' : 'Pending Assignment'}
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 rounded-full bg-cyan-900/40 text-cyan-300 flex items-center justify-center font-bold text-xs border border-cyan-800">
                          {selectedOrder.assignedTechnicianName ? selectedOrder.assignedTechnicianName[0] : '?'}
                        </div>
                        <div>
                          <div className="text-xs font-bold text-slate-100">
                            {selectedOrder.assignedTechnicianName || 'No technician assigned yet'}
                          </div>
                          <div className="text-[11px] text-slate-400">
                            {selectedOrder.assignedTechnicianId 
                              ? technicians.find(t => t.id === selectedOrder.assignedTechnicianId)?.skills.join(', ')
                              : 'Requires dispatcher assignment'}
                          </div>
                        </div>
                      </div>

                      {/* Re-assign Selector */}
                      {canManageWorkOrders && selectedOrder.status !== 'CLOSED' && (
                        <select
                          value={selectedOrder.assignedTechnicianId || ''}
                          onChange={(e) => onAssignTechnician(selectedOrder.id, e.target.value)}
                          className="text-xs bg-slate-900 border border-slate-800 rounded-lg px-2 py-1 text-slate-200 font-medium focus:outline-none focus:border-cyan-500"
                        >
                          <option value="">Assign technician...</option>
                          {technicians.map(t => (
                            <option key={t.id} value={t.id}>{t.name} ({t.status})</option>
                          ))}
                        </select>
                      )}
                    </div>
                  </div>

                  {/* Labor Time Tracking & Consumed Parts */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Time Entries */}
                    <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-bold text-white uppercase tracking-wider">Labor Hours</span>
                        {selectedOrder.status !== 'CLOSED' && (
                          <button
                            onClick={() => setShowTimeModal(true)}
                            className="text-xs text-cyan-400 hover:text-cyan-300 font-semibold"
                          >
                            + Log Time
                          </button>
                        )}
                      </div>
                      <div className="text-2xl font-extrabold text-white">
                        {selectedOrder.actualDurationHours}h <span className="text-xs font-normal text-slate-400">of {selectedOrder.estimatedDurationHours}h est.</span>
                      </div>
                      <div className="mt-2 space-y-1.5 max-h-24 overflow-y-auto">
                        {selectedOrder.timeEntries && selectedOrder.timeEntries.length > 0 ? (
                          selectedOrder.timeEntries.map(te => (
                            <div key={te.id} className="text-[11px] text-slate-300 flex justify-between border-b border-slate-800 py-0.5">
                              <span>{te.entryType} ({te.durationMinutes}m)</span>
                              <span className="text-slate-500">{te.technicianName}</span>
                            </div>
                          ))
                        ) : (
                          <div className="text-[11px] text-slate-500 italic">No labor intervals logged yet.</div>
                        )}
                      </div>
                    </div>

                    {/* Parts Used */}
                    <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-bold text-white uppercase tracking-wider">Parts Used</span>
                        {selectedOrder.status !== 'CLOSED' && (
                          <button
                            onClick={() => setShowPartModal(true)}
                            className="text-xs text-cyan-400 hover:text-cyan-300 font-semibold"
                          >
                            + Add Part
                          </button>
                        )}
                      </div>
                      <div className="text-2xl font-extrabold text-white">
                        {selectedOrder.parts?.length || 0} <span className="text-xs font-normal text-slate-400">items</span>
                      </div>
                      <div className="mt-2 space-y-1.5 max-h-24 overflow-y-auto">
                        {selectedOrder.parts && selectedOrder.parts.length > 0 ? (
                          selectedOrder.parts.map(p => (
                            <div key={p.id} className="text-[11px] text-slate-300 flex justify-between border-b border-slate-800 py-0.5">
                              <span className="truncate max-w-[140px]">{p.partName}</span>
                              <span className="font-semibold text-emerald-400">${p.unitPrice * p.quantity} (x{p.quantity})</span>
                            </div>
                          ))
                        ) : (
                          <div className="text-[11px] text-slate-500 italic">No replacement parts billed.</div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* TASKS & CHECKLIST TAB */}
              {drawerTab === 'tasks' && (() => {
                const activeTasks = orderChecklists[selectedOrder.id] || defaultStandardProcedures.map((desc, idx) => ({
                  id: `task-${idx + 1}`,
                  text: desc,
                  completed: idx === 0 && selectedOrder.status !== 'NEW',
                  completedAt: idx === 0 ? selectedOrder.createdAt : undefined,
                  completedBy: idx === 0 ? (selectedOrder.assignedTechnicianName || 'Dispatcher') : undefined,
                }));

                const completedCount = activeTasks.filter(t => t.completed).length;
                const totalCount = activeTasks.length;
                const progress = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

                const toggleTask = (taskId: string) => {
                  const updated = activeTasks.map(t => {
                    if (t.id === taskId) {
                      const nextVal = !t.completed;
                      return {
                        ...t,
                        completed: nextVal,
                        completedAt: nextVal ? new Date().toISOString() : undefined,
                        completedBy: nextVal ? (selectedOrder.assignedTechnicianName || currentRole) : undefined,
                      };
                    }
                    return t;
                  });
                  setOrderChecklists(prev => ({
                    ...prev,
                    [selectedOrder.id]: updated,
                  }));
                };

                const addTask = (e: React.FormEvent) => {
                  e.preventDefault();
                  if (!newTaskInputText.trim()) return;
                  const newTask = {
                    id: `task-${Date.now()}`,
                    text: newTaskInputText.trim(),
                    completed: false,
                  };
                  setOrderChecklists(prev => ({
                    ...prev,
                    [selectedOrder.id]: [...activeTasks, newTask],
                  }));
                  setNewTaskInputText('');
                };

                const deleteTask = (taskId: string) => {
                  setOrderChecklists(prev => ({
                    ...prev,
                    [selectedOrder.id]: activeTasks.filter(t => t.id !== taskId),
                  }));
                };

                const markAllCompleted = () => {
                  const updated = activeTasks.map(t => ({
                    ...t,
                    completed: true,
                    completedAt: t.completedAt || new Date().toISOString(),
                    completedBy: t.completedBy || selectedOrder.assignedTechnicianName || currentRole,
                  }));
                  setOrderChecklists(prev => ({
                    ...prev,
                    [selectedOrder.id]: updated,
                  }));
                };

                return (
                  <div className="space-y-4">
                    {/* Header & Progress */}
                    <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl space-y-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                            <CheckSquare className="w-4 h-4 text-cyan-400" />
                            <span>Field Service Procedural Checklist</span>
                          </h3>
                          <p className="text-[11px] text-slate-400 mt-0.5">
                            Deterministic task execution required before field completion & sign-off.
                          </p>
                        </div>
                        <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold border ${
                          progress === 100 
                            ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' 
                            : 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30'
                        }`}>
                          {completedCount} / {totalCount} ({progress}%)
                        </span>
                      </div>

                      {/* Visual Progress Bar */}
                      <div className="w-full bg-slate-900 h-2 rounded-full overflow-hidden border border-slate-800">
                        <div 
                          className={`h-full transition-all duration-300 ${
                            progress === 100 ? 'bg-gradient-to-r from-emerald-500 to-teal-400' : 'bg-gradient-to-r from-cyan-500 to-blue-500'
                          }`}
                          style={{ width: `${progress}%` }}
                        />
                      </div>

                      {progress === 100 && (
                        <div className="flex items-center gap-2 text-emerald-400 bg-emerald-950/30 border border-emerald-800/40 px-3 py-1.5 rounded-lg text-[11px]">
                          <CheckCircle2 className="w-4 h-4 shrink-0" />
                          <span>All operational procedures and safety verifications have been fully completed.</span>
                        </div>
                      )}
                    </div>

                    {/* Task Checklist Items */}
                    <div className="space-y-2">
                      {activeTasks.map((task, idx) => (
                        <div 
                          key={task.id}
                          className={`p-3 rounded-xl border transition-all flex items-start justify-between gap-3 ${
                            task.completed 
                              ? 'bg-slate-900/40 border-slate-800/60 text-slate-300' 
                              : 'bg-slate-950 border-slate-800 text-white'
                          }`}
                        >
                          <div className="flex items-start gap-3">
                            <button
                              type="button"
                              onClick={() => toggleTask(task.id)}
                              className={`w-5 h-5 mt-0.5 rounded flex items-center justify-center border transition-all ${
                                task.completed
                                  ? 'bg-emerald-600 border-emerald-500 text-white'
                                  : 'bg-slate-900 border-slate-700 text-transparent hover:border-cyan-400'
                              }`}
                            >
                              <CheckCircle2 className="w-3.5 h-3.5 fill-current" />
                            </button>
                            <div>
                              <div className={`text-xs font-semibold ${task.completed ? 'line-through text-slate-400' : 'text-slate-100'}`}>
                                <span className="text-slate-500 font-mono mr-1.5">{idx + 1}.</span>
                                {task.text}
                              </div>
                              {task.completed && task.completedAt && (
                                <div className="text-[10px] text-slate-500 mt-1 flex items-center gap-2 font-mono">
                                  <span>Verified: {new Date(task.completedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                  {task.completedBy && <span>• Sign-off: {task.completedBy}</span>}
                                </div>
                              )}
                            </div>
                          </div>

                          {selectedOrder.status !== 'CLOSED' && (
                            <button
                              type="button"
                              onClick={() => deleteTask(task.id)}
                              className="text-slate-500 hover:text-rose-400 p-1 rounded transition-colors"
                              title="Delete task item"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      ))}
                    </div>

                    {/* Add Custom Task Form */}
                    {selectedOrder.status !== 'CLOSED' && (
                      <form onSubmit={addTask} className="flex gap-2 pt-1">
                        <input
                          type="text"
                          value={newTaskInputText}
                          onChange={(e) => setNewTaskInputText(e.target.value)}
                          placeholder="Add procedure task item (e.g. Inspect secondary valve gasket)..."
                          className="flex-1 bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                        />
                        <button
                          type="submit"
                          disabled={!newTaskInputText.trim()}
                          className="px-3 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 disabled:opacity-40 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>Add Task</span>
                        </button>
                        {progress < 100 && (
                          <button
                            type="button"
                            onClick={markAllCompleted}
                            className="px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold whitespace-nowrap transition-colors"
                          >
                            Mark All Complete
                          </button>
                        )}
                      </form>
                    )}
                  </div>
                );
              })()}

              {/* PARTS & INVENTORY ALLOCATION TAB */}
              {drawerTab === 'parts' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                        Allocated Replacement Parts & Stock
                      </h3>
                      <p className="text-[11px] text-slate-400">
                        Facility: <span className="text-cyan-400 font-semibold">{selectedOrder.facilityName}</span>
                      </p>
                    </div>
                    {selectedOrder.status !== 'CLOSED' && (
                      <button
                        onClick={() => setShowPartModal(true)}
                        className="px-2.5 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-xs"
                      >
                        <PackagePlus className="w-3.5 h-3.5" />
                        <span>Allocate Part</span>
                      </button>
                    )}
                  </div>

                  {/* Summary Metric Strip */}
                  <div className="grid grid-cols-3 gap-3">
                    <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl">
                      <span className="text-[10px] text-slate-400 uppercase block font-semibold">Total Parts</span>
                      <span className="text-xl font-bold text-white mt-1 block">
                        {selectedOrder.parts?.reduce((acc, p) => acc + p.quantity, 0) || 0} units
                      </span>
                    </div>
                    <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl">
                      <span className="text-[10px] text-slate-400 uppercase block font-semibold">Parts Cost (COGS)</span>
                      <span className="text-xl font-bold text-slate-200 mt-1 block">
                        ${(selectedOrder.partsCost || 0).toFixed(2)}
                      </span>
                    </div>
                    <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl">
                      <span className="text-[10px] text-slate-400 uppercase block font-semibold">Billed to Customer</span>
                      <span className="text-xl font-bold text-emerald-400 mt-1 block">
                        ${(selectedOrder.parts?.reduce((acc, p) => acc + (p.unitPrice * p.quantity), 0) || 0).toFixed(2)}
                      </span>
                    </div>
                  </div>

                  {/* Allocated Parts Table */}
                  <div className="bg-slate-950 border border-slate-800 rounded-xl overflow-hidden">
                    <div className="px-4 py-2.5 border-b border-slate-800/80 bg-slate-900/60 font-semibold text-xs text-slate-300">
                      Line Items Installed on Work Order
                    </div>
                    {(!selectedOrder.parts || selectedOrder.parts.length === 0) ? (
                      <div className="p-8 text-center text-slate-500 italic text-xs">
                        No replacement parts or consumables allocated to this job yet.
                      </div>
                    ) : (
                      <div className="divide-y divide-slate-800/60">
                        {selectedOrder.parts.map((p) => {
                          const stockItem = facilityStock.find(s => s.partId === p.id);
                          return (
                            <div key={p.id} className="p-3 flex items-center justify-between hover:bg-slate-900/40 transition-colors">
                              <div className="space-y-0.5">
                                <div className="text-xs font-bold text-slate-100">{p.partName}</div>
                                <div className="text-[11px] text-slate-400 font-mono">
                                  SKU: {p.partNumber} • Unit Cost: ${(p.unitCost || 0).toFixed(2)} • Unit Price: ${(p.unitPrice || 0).toFixed(2)}
                                </div>
                                <div className="text-[10px] text-cyan-400">
                                  Facility Stock remaining: {stockItem ? stockItem.stockOnHand : 'N/A'} units
                                </div>
                              </div>
                              <div className="flex items-center gap-4 text-right">
                                <div>
                                  <div className="text-xs font-bold text-emerald-400">
                                    ${(p.unitPrice * p.quantity).toFixed(2)}
                                  </div>
                                  <div className="text-[11px] text-slate-400">
                                    Qty: <strong className="text-white">{p.quantity}</strong>
                                  </div>
                                </div>
                                {selectedOrder.status !== 'CLOSED' && (
                                  <button
                                    onClick={() => handleRemoveAllocatedPart(p.id)}
                                    title="De-allocate part and return to inventory"
                                    className="p-1 text-slate-500 hover:text-rose-400 hover:bg-rose-950/40 rounded transition-colors"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Facility Stock Overview Card */}
                  <div className="bg-slate-950 border border-slate-800 rounded-xl p-3.5 space-y-2">
                    <div className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                      <Boxes className="w-3.5 h-3.5 text-cyan-400" />
                      <span>Stock Available at {selectedOrder.facilityName}</span>
                    </div>
                    {facilityStock.length === 0 ? (
                      <div className="text-[11px] text-slate-500 italic">No inventory tracked for this facility.</div>
                    ) : (
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-1">
                        {facilityStock.map(stock => (
                          <div key={stock.id} className="p-2 rounded bg-slate-900/80 border border-slate-800/80 text-[11px]">
                            <div className="font-semibold text-slate-200 truncate">{stock.partName}</div>
                            <div className="flex justify-between items-center mt-1">
                              <span className="text-slate-400">On Hand:</span>
                              <span className={`font-bold ${stock.stockOnHand <= stock.reorderPoint ? 'text-rose-400' : 'text-emerald-400'}`}>
                                {stock.stockOnHand} {stock.unitOfMeasure}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* TIME TRACKING & STOPWATCH TAB */}
              {drawerTab === 'time' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                        Technician Labor & Time Tracking
                      </h3>
                      <p className="text-[11px] text-slate-400">
                        Total Labor: <span className="text-cyan-400 font-semibold">{selectedOrder.actualDurationHours}h</span> • Cost: <span className="text-emerald-400 font-semibold">${(selectedOrder.laborCost || 0).toFixed(2)}</span>
                      </p>
                    </div>
                    {selectedOrder.status !== 'CLOSED' && (
                      <button
                        onClick={() => setShowTimeModal(true)}
                        className="px-2.5 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-xs"
                      >
                        <Clock className="w-3.5 h-3.5" />
                        <span>Manual Entry</span>
                      </button>
                    )}
                  </div>

                  {/* Live Stopwatch Timer Widget */}
                  <div className="p-4 bg-slate-950 border border-cyan-900/40 rounded-xl space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className={`w-3 h-3 rounded-full ${isLiveTimerRunning ? 'bg-amber-400 animate-pulse' : 'bg-slate-600'}`} />
                        <span className="text-xs font-bold text-white uppercase tracking-wider">
                          Live Active Stopwatch
                        </span>
                      </div>
                      <span className="text-[11px] font-mono text-cyan-400">
                        {isLiveTimerRunning ? 'TIMER RUNNING' : 'STOPPED'}
                      </span>
                    </div>

                    {isLiveTimerRunning && activeTimerEntry ? (
                      <div className="p-3 bg-amber-950/20 border border-amber-800/40 rounded-lg space-y-2">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-amber-300 font-semibold">Active Session: {activeTimerEntry.technicianName}</span>
                          <span className="text-slate-400 font-mono text-[11px]">Started: {new Date(activeTimerEntry.startTime).toLocaleTimeString()}</span>
                        </div>
                        <input
                          type="text"
                          value={timerNotes}
                          onChange={(e) => setTimerNotes(e.target.value)}
                          placeholder="Optional work notes before stopping timer..."
                          className="w-full text-xs bg-slate-900 border border-slate-800 rounded px-2.5 py-1.5 text-slate-200 placeholder-slate-500 focus:outline-none focus:border-amber-400"
                        />
                        <button
                          onClick={() => handleStopLiveTimer(activeTimerEntry.id, timerNotes)}
                          disabled={isSubmittingTimer}
                          className="w-full py-2 rounded bg-amber-600 hover:bg-amber-500 text-slate-950 font-bold text-xs flex items-center justify-center gap-2 transition-colors"
                        >
                          <Square className="w-3.5 h-3.5 fill-current" />
                          <span>Stop Timer & Finalize Labor Duration</span>
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => {
                            const techId = selectedOrder.assignedTechnicianId || technicians[0]?.id;
                            if (techId) handleStartLiveTimer(techId, 'LABOR');
                            else alert('Please assign a technician before starting live timer');
                          }}
                          disabled={isSubmittingTimer || selectedOrder.status === 'CLOSED'}
                          className="flex-1 py-2 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
                        >
                          <Play className="w-3.5 h-3.5 fill-current" />
                          <span>Start Live Timer ({selectedOrder.assignedTechnicianName || 'Assignee'})</span>
                        </button>
                      </div>
                    )}
                    {timerActionError && (
                      <div className="text-[11px] text-rose-400">{timerActionError}</div>
                    )}
                  </div>

                  {/* Audited Time Entries Table */}
                  <div className="bg-slate-950 border border-slate-800 rounded-xl overflow-hidden">
                    <div className="px-4 py-2.5 border-b border-slate-800/80 bg-slate-900/60 font-semibold text-xs text-slate-300">
                      Logged Intervals & Billable Records
                    </div>
                    {(!selectedOrder.timeEntries || selectedOrder.timeEntries.length === 0) ? (
                      <div className="p-8 text-center text-slate-500 italic text-xs">
                        No labor or diagnostic time recorded on this work order yet.
                      </div>
                    ) : (
                      <div className="divide-y divide-slate-800/60">
                        {selectedOrder.timeEntries.map((te) => (
                          <div key={te.id} className="p-3 flex items-center justify-between hover:bg-slate-900/40 transition-colors">
                            <div className="space-y-0.5">
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-bold text-slate-100">{te.technicianName}</span>
                                <span className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase bg-slate-800 text-cyan-400 border border-slate-700">
                                  {te.entryType}
                                </span>
                                {te.isBillable && (
                                  <span className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase bg-emerald-950 text-emerald-400 border border-emerald-800">
                                    BILLABLE
                                  </span>
                                )}
                              </div>
                              <div className="text-[11px] text-slate-400">
                                {te.notes || 'Routine maintenance and diagnostics'}
                              </div>
                              <div className="text-[10px] text-slate-500">
                                Rate: ${te.hourlyRate || 85}/hr • Cost: ${(te.cost || 0).toFixed(2)}
                              </div>
                            </div>
                            <div className="flex items-center gap-4 text-right">
                              <div>
                                <div className="text-xs font-bold text-white">
                                  {te.durationMinutes} min ({((te.durationMinutes || 0) / 60).toFixed(1)}h)
                                </div>
                                <div className="text-[11px] text-emerald-400 font-semibold">
                                  ${(te.cost || 0).toFixed(2)}
                                </div>
                              </div>
                              {selectedOrder.status !== 'CLOSED' && (
                                <button
                                  onClick={() => handleDeleteWorkOrderTimeEntry(te.id)}
                                  title="Delete logged time record"
                                  className="p-1 text-slate-500 hover:text-rose-400 hover:bg-rose-950/40 rounded transition-colors"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* ASSIGNMENTS TAB */}
              {drawerTab === 'assignments' && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                      Assignment & Dispatch History
                    </h3>
                  </div>

                  {(!selectedOrder.assignmentHistory || selectedOrder.assignmentHistory.length === 0) ? (
                    <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl text-center text-slate-500 italic">
                      No assignment history recorded yet.
                    </div>
                  ) : (
                    <div className="space-y-2.5">
                      {selectedOrder.assignmentHistory.map((rec) => (
                        <div
                          key={rec.id}
                          className={`p-3.5 rounded-xl border ${
                            rec.status === 'ACTIVE'
                              ? 'bg-cyan-950/20 border-cyan-800/40 text-cyan-100'
                              : 'bg-slate-950 border-slate-800 text-slate-400'
                          }`}
                        >
                          <div className="flex items-center justify-between font-semibold">
                            <span className="text-slate-100 flex items-center gap-1.5 text-xs">
                              <UserCheck className="w-4 h-4 text-cyan-400" />
                              Technician: {rec.technicianName}
                            </span>
                            <span className={`px-2 py-0.5 text-[10px] font-bold uppercase rounded ${
                              rec.status === 'ACTIVE'
                                ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30'
                                : 'bg-slate-800 text-slate-500'
                            }`}>
                              {rec.status}
                            </span>
                          </div>

                          <div className="mt-1.5 text-[11px] text-slate-400 flex items-center justify-between">
                            <span>Dispatched By: {rec.assignedBy} ({rec.assignedByRole})</span>
                            <span>{new Date(rec.assignedAt).toLocaleString()}</span>
                          </div>

                          {rec.notes && (
                            <div className="mt-2 text-[11px] text-slate-300 italic bg-slate-900/60 p-2.5 rounded-lg border border-slate-800">
                              "{rec.notes}"
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* COMMENTS TAB */}
              {drawerTab === 'comments' && (
                <div className="space-y-4">
                  <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                    Work Order Activity & Collaboration Feed
                  </h3>

                  <div className="space-y-2.5 max-h-80 overflow-y-auto pr-1">
                    {(!selectedOrder.comments || selectedOrder.comments.length === 0) ? (
                      <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl text-center text-slate-500 italic">
                        No comments recorded. Add an operational note or status update below.
                      </div>
                    ) : (
                      selectedOrder.comments.map((c) => (
                        <div key={c.id} className="bg-slate-950 border border-slate-800 p-3.5 rounded-xl space-y-1">
                          <div className="flex items-center justify-between text-[11px]">
                            <div className="flex items-center gap-1.5">
                              <span className="font-bold text-slate-200">{c.authorName}</span>
                              <span className="px-1.5 py-0.2 rounded text-[9px] bg-slate-800 text-cyan-400 font-mono">
                                {c.authorRole}
                              </span>
                            </div>
                            <span className="text-[10px] text-slate-500">
                              {new Date(c.createdAt).toLocaleString()}
                            </span>
                          </div>
                          <p className="text-slate-300 text-xs leading-relaxed pt-0.5">{c.content}</p>
                        </div>
                      ))
                    )}
                  </div>

                  {/* Add Comment Form */}
                  <form onSubmit={handlePostComment} className="flex gap-2">
                    <input
                      type="text"
                      required
                      value={commentContent}
                      onChange={(e) => setCommentContent(e.target.value)}
                      placeholder="Add diagnostic finding, access note, or resolution remark..."
                      className="flex-1 bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                    />
                    <button
                      type="submit"
                      disabled={isSubmittingComment}
                      className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg text-xs font-semibold flex items-center gap-1 shadow-xs"
                    >
                      {isSubmittingComment ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                      <span>Send</span>
                    </button>
                  </form>
                </div>
              )}

              {/* ATTACHMENTS TAB */}
              {drawerTab === 'attachments' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                      Work Order Attachments & Photos
                    </h3>
                    <button
                      onClick={() => setShowAttachmentModal(true)}
                      className="text-xs text-cyan-400 hover:text-cyan-300 font-semibold"
                    >
                      + Add Photo / Asset
                    </button>
                  </div>

                  {(!selectedOrder.attachments || selectedOrder.attachments.length === 0) ? (
                    <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl text-center text-slate-500 italic">
                      No attachments found. Upload job-site photos, nameplate diagrams, or completion sign-offs.
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      {selectedOrder.attachments.map((att) => (
                        <div key={att.id} className="bg-slate-950 border border-slate-800 rounded-xl p-2.5 space-y-2">
                          <div className="aspect-video bg-slate-900 rounded-lg overflow-hidden relative">
                            <img
                              src={att.url}
                              alt={att.caption || att.fileName}
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                (e.target as HTMLElement).style.display = 'none';
                              }}
                            />
                          </div>
                          <div>
                            <div className="text-[11px] font-semibold text-slate-200 truncate">{att.fileName}</div>
                            {att.caption && <div className="text-[10px] text-slate-400 truncate">{att.caption}</div>}
                          </div>
                          <div className="text-[9px] text-slate-500 flex justify-between pt-1 border-t border-slate-800">
                            <span>{att.uploadedBy}</span>
                            <a href={att.url} target="_blank" rel="noreferrer" className="text-cyan-400 hover:underline">
                              Full Size
                            </a>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* AUDIT LOG TAB */}
              {drawerTab === 'audit' && (
                <div className="space-y-3">
                  <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center">
                    <ShieldAlert className="w-3.5 h-3.5 mr-1.5 text-cyan-400" />
                    Immutable Audit Trail ({selectedOrder.auditLogs?.length || 0})
                  </h3>
                  <div className="bg-slate-950 rounded-xl border border-slate-800 p-3.5 max-h-96 overflow-y-auto divide-y divide-slate-800">
                    {selectedOrder.auditLogs && selectedOrder.auditLogs.length > 0 ? (
                      selectedOrder.auditLogs.map((log) => (
                        <div key={log.id} className="py-2.5 first:pt-0 last:pb-0 text-xs">
                          <div className="flex items-center justify-between">
                            <span className="font-semibold text-slate-100">{log.action}</span>
                            <span className="text-[10px] text-slate-500">{new Date(log.timestamp).toLocaleString()}</span>
                          </div>
                          <div className="text-[11px] text-slate-400 mt-0.5">
                            By: <span className="font-medium text-slate-200">{log.performedBy}</span> ({log.performedByRole})
                          </div>
                          {log.notes && (
                            <div className="text-[11px] text-slate-300 italic mt-0.5">"{log.notes}"</div>
                          )}
                        </div>
                      ))
                    ) : (
                      <div className="text-xs text-slate-500 italic">No audit records recorded yet.</div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Edit Work Order Modal */}
      {isEditModalOpen && selectedOrder && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Edit3 className="w-4 h-4 text-cyan-400" />
                Edit Work Order: {selectedOrder.workOrderNumber}
              </h3>
              <button
                onClick={() => setIsEditModalOpen(false)}
                className="text-slate-400 hover:text-white text-xs"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveEditSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Title</label>
                <input
                  type="text"
                  required
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Description</label>
                <textarea
                  rows={3}
                  required
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Priority</label>
                  <select
                    value={editPriority}
                    onChange={(e) => setEditPriority(e.target.value as Priority)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-cyan-500"
                  >
                    <option value="CRITICAL">CRITICAL</option>
                    <option value="HIGH">HIGH</option>
                    <option value="MEDIUM">MEDIUM</option>
                    <option value="LOW">LOW</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Category</label>
                  <input
                    type="text"
                    value={editCategory}
                    onChange={(e) => setEditCategory(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-cyan-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Due Date & Time</label>
                <input
                  type="datetime-local"
                  value={editDueDate}
                  onChange={(e) => setEditDueDate(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-3 py-1.5 text-xs text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingEdit}
                  className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow"
                >
                  {isSubmittingEdit ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Edit3 className="w-3.5 h-3.5" />}
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete / Archive Confirmation Dialog */}
      {orderToDelete && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-rose-900/50 rounded-2xl max-w-sm w-full p-5 space-y-3 shadow-2xl">
            <div className="flex items-center gap-2 text-rose-400">
              <AlertCircle className="w-5 h-5" />
              <h3 className="text-sm font-bold text-white">Delete / Archive Work Order?</h3>
            </div>
            <p className="text-xs text-slate-300">
              Are you sure you want to delete work order{' '}
              <strong className="text-white font-mono">{orderToDelete.workOrderNumber}</strong>?
              This removes the record from active operations and flags it as archived.
            </p>
            <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setOrderToDelete(null)}
                className="px-3 py-1.5 text-xs text-slate-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={handleConfirmDelete}
                className="px-3 py-1.5 bg-rose-600 hover:bg-rose-500 text-white rounded-lg text-xs font-semibold flex items-center gap-1"
              >
                {isDeleting ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                Confirm Deletion
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Time Log Modal */}
      {showTimeModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-sm w-full p-5 shadow-xl">
            <h3 className="text-sm font-bold text-white mb-3">Log Field Labor Time</h3>
            <form onSubmit={handleSaveTime} className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">Duration (Minutes)</label>
                <input
                  type="number"
                  min="15"
                  step="15"
                  value={timeMinutes}
                  onChange={(e) => setTimeMinutes(parseInt(e.target.value, 10))}
                  className="w-full text-xs px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-slate-100"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">Activity Type</label>
                <select
                  value={timeType}
                  onChange={(e) => setTimeType(e.target.value as any)}
                  className="w-full text-xs px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-slate-100"
                >
                  <option value="LABOR">Hands-On Labor</option>
                  <option value="DIAGNOSIS">Diagnostic Testing</option>
                  <option value="TRAVEL">En-Route Travel</option>
                  <option value="WAIT_PARTS">Waiting for Parts</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">Notes</label>
                <input
                  type="text"
                  placeholder="e.g. Calibrated pressure switches..."
                  value={timeNotes}
                  onChange={(e) => setTimeNotes(e.target.value)}
                  className="w-full text-xs px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-slate-100"
                />
              </div>
              <div className="flex justify-end space-x-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowTimeModal(false)}
                  className="px-3 py-1.5 text-xs text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-3 py-1.5 text-xs font-semibold bg-cyan-600 text-white rounded-lg hover:bg-cyan-500"
                >
                  Record Labor
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Part Allocation Modal */}
      {showPartModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-sm w-full p-5 shadow-xl">
            <h3 className="text-sm font-bold text-white mb-3">Allocate Replacement Part</h3>
            <form onSubmit={handleSavePart} className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">Select Part from Catalogue</label>
                <select
                  value={selectedPartId}
                  onChange={(e) => setSelectedPartId(e.target.value)}
                  className="w-full text-xs px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-slate-100"
                >
                  {parts.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.name} (${p.unitPrice} - Stock: {p.stockOnHand})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">Quantity</label>
                <input
                  type="number"
                  min="1"
                  max="10"
                  value={partQuantity}
                  onChange={(e) => setPartQuantity(parseInt(e.target.value, 10))}
                  className="w-full text-xs px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-slate-100"
                />
              </div>
              <div className="flex justify-end space-x-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowPartModal(false)}
                  className="px-3 py-1.5 text-xs text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-3 py-1.5 text-xs font-semibold bg-cyan-600 text-white rounded-lg hover:bg-cyan-500"
                >
                  Allocate Part
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Upload Attachment Modal */}
      {showAttachmentModal && selectedOrder && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-sm w-full p-5 space-y-3 shadow-2xl">
            <h3 className="text-sm font-bold text-white">Upload Job Attachment / Photo</h3>
            <form onSubmit={handleUploadAttachment} className="space-y-3">
              <div>
                <label className="block text-xs text-slate-400 mb-1">Image / File URL</label>
                <input
                  type="url"
                  required
                  value={attachmentUrl}
                  onChange={(e) => setAttachmentUrl(e.target.value)}
                  placeholder="https://images.unsplash.com/..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-100 focus:outline-none focus:border-cyan-500"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">Caption / Notes</label>
                <input
                  type="text"
                  value={attachmentCaption}
                  onChange={(e) => setAttachmentCaption(e.target.value)}
                  placeholder="e.g. Repaired motor winding photos"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-100 focus:outline-none focus:border-cyan-500"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAttachmentModal(false)}
                  className="px-3 py-1.5 text-xs text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingAttachment}
                  className="px-3 py-1.5 bg-cyan-600 text-white rounded-lg text-xs font-semibold hover:bg-cyan-500"
                >
                  Upload Attachment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
