import React, { useState } from 'react';
import { 
  FileText, PlusCircle, Search, Filter, CheckCircle2, 
  XCircle, Clock, ArrowRight, MessageSquare, Paperclip, 
  Building2, Box, MapPin, Calendar, Trash2, RefreshCw, 
  Send, AlertCircle, Eye, User, Image, ExternalLink
} from 'lucide-react';
import { 
  ServiceRequest, ServiceRequestStatus, Priority, 
  Facility, Asset, Technician, RoleName, WorkOrder 
} from '../types';
import { api } from '../services/api';

interface ServiceRequestsViewProps {
  serviceRequests: ServiceRequest[];
  facilities: Facility[];
  assets: Asset[];
  technicians: Technician[];
  onRefreshData: () => Promise<void>;
  onNavigateToWorkOrder?: (orderId: string) => void;
  currentRole: RoleName;
}

export const ServiceRequestsView: React.FC<ServiceRequestsViewProps> = ({
  serviceRequests,
  facilities,
  assets,
  technicians,
  onRefreshData,
  onNavigateToWorkOrder,
  currentRole,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [priorityFilter, setPriorityFilter] = useState('ALL');
  const [selectedRequest, setSelectedRequest] = useState<ServiceRequest | null>(null);

  // Create Request Modal State
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newFacilityId, setNewFacilityId] = useState(facilities[0]?.id || '');
  const [newAssetId, setNewAssetId] = useState('');
  const [newTitle, setNewTitle] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newPriority, setNewPriority] = useState<Priority>('MEDIUM');
  const [newLocationDetails, setNewLocationDetails] = useState('');
  const [newRequestedDate, setNewRequestedDate] = useState('');
  const [newAttachmentUrl, setNewAttachmentUrl] = useState('');
  const [isSubmittingNew, setIsSubmittingNew] = useState(false);

  // Convert to Work Order Modal State
  const [isConvertModalOpen, setIsConvertModalOpen] = useState(false);
  const [convertPriority, setConvertPriority] = useState<Priority>('MEDIUM');
  const [convertCategory, setConvertCategory] = useState('CORRECTIVE_MAINTENANCE');
  const [convertTechId, setConvertTechId] = useState('');
  const [convertDueDate, setConvertDueDate] = useState('');
  const [isConverting, setIsConverting] = useState(false);

  // Comment Form State
  const [commentText, setCommentText] = useState('');
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);

  // Attachment Form State
  const [showAttachmentModal, setShowAttachmentModal] = useState(false);
  const [attachmentUrl, setAttachmentUrl] = useState('');
  const [attachmentCaption, setAttachmentCaption] = useState('');
  const [isSubmittingAttachment, setIsSubmittingAttachment] = useState(false);

  // Delete Confirmation Modal State
  const [requestToDelete, setRequestToDelete] = useState<ServiceRequest | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Filter assets by selected facility in create modal
  const filteredAssetsForFacility = assets.filter(a => a.facilityId === newFacilityId);

  // Filter requests
  const filteredRequests = serviceRequests.filter((req) => {
    const matchesSearch = 
      req.requestNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      req.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      req.facilityName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (req.requesterName && req.requesterName.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesStatus = statusFilter === 'ALL' || req.status === statusFilter;
    const matchesPriority = priorityFilter === 'ALL' || req.priority === priorityFilter;

    return matchesSearch && matchesStatus && matchesPriority;
  });

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFacilityId || !newTitle || !newDescription) return;

    setIsSubmittingNew(true);
    try {
      const created = await api.createServiceRequest({
        facilityId: newFacilityId,
        assetId: newAssetId || undefined,
        title: newTitle,
        description: newDescription,
        priority: newPriority,
        locationDetails: newLocationDetails || undefined,
        requestedDate: newRequestedDate || undefined,
      });

      if (newAttachmentUrl && created.id) {
        await api.addServiceRequestAttachment(created.id, {
          fileName: 'service_request_photo.jpg',
          url: newAttachmentUrl,
          caption: 'Customer initial intake inspection photo',
        });
      }

      setIsCreateModalOpen(false);
      setNewTitle('');
      setNewDescription('');
      setNewAssetId('');
      setNewLocationDetails('');
      setNewRequestedDate('');
      setNewAttachmentUrl('');
      await onRefreshData();
    } catch (err: any) {
      alert(`Failed to create request: ${err.message}`);
    } finally {
      setIsSubmittingNew(false);
    }
  };

  const handleOpenConvertModal = (req: ServiceRequest) => {
    setSelectedRequest(req);
    setConvertPriority(req.priority);
    setConvertCategory('CORRECTIVE_MAINTENANCE');
    setConvertTechId('');
    setConvertDueDate(new Date(Date.now() + 1000 * 60 * 60 * 48).toISOString().slice(0, 16));
    setIsConvertModalOpen(true);
  };

  const handleExecuteConversion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRequest) return;

    setIsConverting(true);
    try {
      const newOrder = await api.convertServiceRequest(selectedRequest.id, {
        priority: convertPriority,
        category: convertCategory,
        assignedTechnicianId: convertTechId || undefined,
        dueDate: convertDueDate || undefined,
      });

      setIsConvertModalOpen(false);
      setSelectedRequest(null);
      await onRefreshData();

      if (onNavigateToWorkOrder && newOrder?.id) {
        onNavigateToWorkOrder(newOrder.id);
      }
    } catch (err: any) {
      alert(`Conversion failed: ${err.message}`);
    } finally {
      setIsConverting(false);
    }
  };

  const handleStatusUpdate = async (reqId: string, newStatus: ServiceRequestStatus) => {
    try {
      await api.updateServiceRequest(reqId, { status: newStatus });
      await onRefreshData();
      if (selectedRequest && selectedRequest.id === reqId) {
        setSelectedRequest(prev => prev ? { ...prev, status: newStatus } : null);
      }
    } catch (err: any) {
      alert(`Failed to update status: ${err.message}`);
    }
  };

  const handleConfirmDelete = async () => {
    if (!requestToDelete) return;
    setIsDeleting(true);
    try {
      await api.deleteServiceRequest(requestToDelete.id);
      setRequestToDelete(null);
      if (selectedRequest?.id === requestToDelete.id) {
        setSelectedRequest(null);
      }
      await onRefreshData();
    } catch (err: any) {
      alert(`Delete failed: ${err.message}`);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRequest || !commentText.trim()) return;

    setIsSubmittingComment(true);
    try {
      const comment = await api.addServiceRequestComment(selectedRequest.id, commentText);
      setSelectedRequest(prev => {
        if (!prev) return null;
        return {
          ...prev,
          comments: [...(prev.comments || []), comment],
        };
      });
      setCommentText('');
      await onRefreshData();
    } catch (err: any) {
      alert(`Failed to add comment: ${err.message}`);
    } finally {
      setIsSubmittingComment(false);
    }
  };

  const handleAddAttachment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRequest || !attachmentUrl.trim()) return;

    setIsSubmittingAttachment(true);
    try {
      const attachment = await api.addServiceRequestAttachment(selectedRequest.id, {
        fileName: 'site_photo.jpg',
        url: attachmentUrl,
        caption: attachmentCaption || 'Facility inspection snapshot',
      });

      setSelectedRequest(prev => {
        if (!prev) return null;
        return {
          ...prev,
          attachments: [...(prev.attachments || []), attachment],
        };
      });

      setShowAttachmentModal(false);
      setAttachmentUrl('');
      setAttachmentCaption('');
      await onRefreshData();
    } catch (err: any) {
      alert(`Failed to upload attachment: ${err.message}`);
    } finally {
      setIsSubmittingAttachment(false);
    }
  };

  const getStatusBadge = (status: ServiceRequestStatus) => {
    switch (status) {
      case 'PENDING_REVIEW':
        return 'bg-amber-500/10 text-amber-400 border-amber-500/30';
      case 'APPROVED':
        return 'bg-blue-500/10 text-blue-400 border-blue-500/30';
      case 'CONVERTED':
        return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30';
      case 'REJECTED':
        return 'bg-rose-500/10 text-rose-400 border-rose-500/30';
      default:
        return 'bg-slate-700 text-slate-300 border-slate-600';
    }
  };

  const canManageRequests = ['SUPER_ADMIN', 'ADMIN', 'DISPATCHER'].includes(currentRole);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
              <FileText className="w-5 h-5 text-emerald-400" />
              Service Requests & Customer Intake Hub
            </h1>
            <span className="px-2 py-0.5 text-[10px] font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 rounded uppercase font-semibold">
              Intake Pipeline
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Capture, triage, approve, and convert inbound service requests from facility managers into active work orders.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => onRefreshData()}
            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-lg border border-slate-700 flex items-center gap-1.5 transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5 text-cyan-400" />
            Refresh
          </button>
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 shadow-sm shadow-emerald-600/20"
          >
            <PlusCircle className="w-3.5 h-3.5" />
            Submit Service Request
          </button>
        </div>
      </div>

      {/* Filter & Search Toolbar */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-1 min-w-[240px]">
          <div className="relative w-full max-w-sm">
            <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by request #, title, facility, or requester..."
              className="w-full pl-9 pr-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-emerald-500"
            />
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 text-xs text-slate-400">
            <Filter className="w-3 h-3 text-slate-500" />
            <span>Status:</span>
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="py-1 px-2.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-300 focus:outline-none focus:border-emerald-500"
          >
            <option value="ALL">All Statuses</option>
            <option value="PENDING_REVIEW">PENDING_REVIEW</option>
            <option value="APPROVED">APPROVED</option>
            <option value="CONVERTED">CONVERTED</option>
            <option value="REJECTED">REJECTED</option>
          </select>

          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="py-1 px-2.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-300 focus:outline-none focus:border-emerald-500"
          >
            <option value="ALL">All Priorities</option>
            <option value="CRITICAL">CRITICAL</option>
            <option value="HIGH">HIGH</option>
            <option value="MEDIUM">MEDIUM</option>
            <option value="LOW">LOW</option>
          </select>
        </div>
      </div>

      {/* Requests Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950 text-slate-400 font-semibold border-b border-slate-800">
              <tr>
                <th className="py-3 px-4">Request #</th>
                <th className="py-3 px-4">Issue & Facility</th>
                <th className="py-3 px-4">Asset</th>
                <th className="py-3 px-4">Priority</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Customer</th>
                <th className="py-3 px-4">Requested Date</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80">
              {filteredRequests.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-500">
                    No service requests found matching criteria.
                  </td>
                </tr>
              ) : (
                filteredRequests.map((req) => (
                  <tr
                    key={req.id}
                    onClick={() => setSelectedRequest(req)}
                    className="hover:bg-slate-800/50 cursor-pointer transition-colors"
                  >
                    <td className="py-3 px-4 font-mono font-bold text-slate-100">
                      {req.requestNumber}
                    </td>
                    <td className="py-3 px-4 max-w-xs">
                      <div className="font-semibold text-slate-100 truncate">{req.title}</div>
                      <div className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5">
                        <Building2 className="w-3 h-3 text-slate-500" />
                        <span className="truncate">{req.facilityName}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-slate-400">
                      {req.assetName ? (
                        <div className="flex items-center gap-1 text-[11px] text-slate-300">
                          <Box className="w-3 h-3 text-cyan-400" />
                          <span className="truncate max-w-[120px]">{req.assetName}</span>
                        </div>
                      ) : (
                        <span className="text-slate-600 text-[11px] italic">N/A (General)</span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-0.5 text-[10px] font-bold uppercase rounded ${
                        req.priority === 'CRITICAL' ? 'bg-rose-500/20 text-rose-400' :
                        req.priority === 'HIGH' ? 'bg-amber-500/20 text-amber-400' :
                        'bg-blue-500/20 text-blue-400'
                      }`}>
                        {req.priority}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-0.5 text-[10px] font-bold uppercase rounded border ${getStatusBadge(req.status)}`}>
                        {req.status}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <div className="text-slate-200 font-medium">{req.requesterName}</div>
                      <div className="text-[10px] text-slate-500">{req.requesterEmail}</div>
                    </td>
                    <td className="py-3 px-4 text-slate-400 text-[11px]">
                      {req.requestedDate ? new Date(req.requestedDate).toLocaleDateString() : 'Immediate'}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
                        {/* Convert Button */}
                        {canManageRequests && req.status !== 'CONVERTED' && req.status !== 'REJECTED' && (
                          <button
                            onClick={() => handleOpenConvertModal(req)}
                            className="px-2.5 py-1 bg-emerald-600/90 hover:bg-emerald-500 text-white rounded text-[11px] font-semibold flex items-center gap-1 shadow-xs"
                          >
                            <span>Convert</span>
                            <ArrowRight className="w-3 h-3" />
                          </button>
                        )}

                        <button
                          onClick={() => setSelectedRequest(req)}
                          className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded text-[11px]"
                        >
                          Details
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Service Request Detail Drawer */}
      {selectedRequest && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-end">
          <div className="bg-slate-900 border-l border-slate-800 w-full max-w-2xl h-full shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-right duration-200">
            {/* Header */}
            <div className="p-5 border-b border-slate-800 flex items-start justify-between bg-slate-950">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-base font-extrabold text-white">
                    {selectedRequest.requestNumber}
                  </span>
                  <span className={`px-2 py-0.5 text-[10px] font-bold uppercase rounded border ${getStatusBadge(selectedRequest.status)}`}>
                    {selectedRequest.status}
                  </span>
                  <span className={`px-2 py-0.5 text-[10px] font-bold uppercase rounded ${
                    selectedRequest.priority === 'CRITICAL' ? 'bg-rose-500/20 text-rose-400' :
                    selectedRequest.priority === 'HIGH' ? 'bg-amber-500/20 text-amber-400' :
                    'bg-blue-500/20 text-blue-400'
                  }`}>
                    {selectedRequest.priority}
                  </span>
                </div>
                <h2 className="text-base font-bold text-white mt-1.5">{selectedRequest.title}</h2>
                <div className="text-xs text-slate-400 mt-0.5">
                  {selectedRequest.facilityName} &bull; Received {new Date(selectedRequest.createdAt).toLocaleString()}
                </div>
              </div>

              <div className="flex items-center gap-2">
                {/* Delete / Archive with confirmation dialog */}
                {(canManageRequests || selectedRequest.status === 'PENDING_REVIEW') && (
                  <button
                    onClick={() => setRequestToDelete(selectedRequest)}
                    title="Delete Request"
                    className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-950/30"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
                <button
                  onClick={() => setSelectedRequest(null)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6 text-xs">
              {/* Quick Actions (Approve, Reject, Convert) */}
              {canManageRequests && (
                <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-3">
                  <div className="text-xs font-bold text-slate-200 uppercase tracking-wider">
                    Intake Triage & Workflow Transitions
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    {selectedRequest.status !== 'CONVERTED' && selectedRequest.status !== 'REJECTED' && (
                      <button
                        onClick={() => handleOpenConvertModal(selectedRequest)}
                        className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-semibold flex items-center gap-1.5 shadow"
                      >
                        <ArrowRight className="w-3.5 h-3.5" />
                        Convert to Work Order
                      </button>
                    )}

                    {selectedRequest.status === 'PENDING_REVIEW' && (
                      <>
                        <button
                          onClick={() => handleStatusUpdate(selectedRequest.id, 'APPROVED')}
                          className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-semibold flex items-center gap-1.5"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Approve Request
                        </button>
                        <button
                          onClick={() => handleStatusUpdate(selectedRequest.id, 'REJECTED')}
                          className="px-3 py-1.5 bg-rose-600/80 hover:bg-rose-600 text-white rounded-lg font-semibold flex items-center gap-1.5"
                        >
                          <XCircle className="w-3.5 h-3.5" />
                          Reject Request
                        </button>
                      </>
                    )}

                    {selectedRequest.convertedWorkOrderId && (
                      <div className="text-emerald-400 font-medium flex items-center gap-1.5 bg-emerald-950/40 px-3 py-1.5 rounded-lg border border-emerald-800/40">
                        <CheckCircle2 className="w-4 h-4" />
                        Converted into Work Order #{selectedRequest.convertedWorkOrderId}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Customer & Facility Details Card */}
              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <span className="text-[11px] font-semibold text-slate-500 block">Customer / Requester</span>
                  <div className="text-slate-200 font-bold mt-0.5 flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-cyan-400" />
                    {selectedRequest.requesterName}
                  </div>
                  <div className="text-slate-400 text-[11px] mt-0.5">{selectedRequest.requesterEmail}</div>
                </div>

                <div>
                  <span className="text-[11px] font-semibold text-slate-500 block">Facility & Location</span>
                  <div className="text-slate-200 font-bold mt-0.5 flex items-center gap-1.5">
                    <Building2 className="w-3.5 h-3.5 text-cyan-400" />
                    {selectedRequest.facilityName}
                  </div>
                  <div className="text-slate-400 text-[11px] mt-0.5">{selectedRequest.locationDetails || 'Main Facility'}</div>
                </div>

                <div>
                  <span className="text-[11px] font-semibold text-slate-500 block">Associated Asset</span>
                  <div className="text-slate-200 font-medium mt-0.5 flex items-center gap-1.5">
                    <Box className="w-3.5 h-3.5 text-cyan-400" />
                    {selectedRequest.assetName || 'General Facility Maintenance'}
                  </div>
                </div>

                <div>
                  <span className="text-[11px] font-semibold text-slate-500 block">Requested Schedule Date</span>
                  <div className="text-slate-200 font-medium mt-0.5 flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-cyan-400" />
                    {selectedRequest.requestedDate ? new Date(selectedRequest.requestedDate).toLocaleDateString() : 'ASAP / Immediate'}
                  </div>
                </div>
              </div>

              {/* Problem Description */}
              <div className="space-y-2">
                <h3 className="text-xs font-bold text-white uppercase tracking-wider">Problem Description</h3>
                <p className="text-slate-300 bg-slate-950 p-3.5 rounded-xl border border-slate-800 leading-relaxed">
                  {selectedRequest.description}
                </p>
              </div>

              {/* Attachments Section */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                    <Paperclip className="w-3.5 h-3.5 text-cyan-400" />
                    Attachments & Photos ({selectedRequest.attachments?.length || 0})
                  </h3>
                  <button
                    onClick={() => setShowAttachmentModal(true)}
                    className="text-xs text-cyan-400 hover:text-cyan-300 font-semibold"
                  >
                    + Add Photo/File
                  </button>
                </div>

                {(!selectedRequest.attachments || selectedRequest.attachments.length === 0) ? (
                  <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl text-center text-slate-500 italic">
                    No attachments uploaded for this request yet.
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {selectedRequest.attachments.map((att) => (
                      <div key={att.id} className="bg-slate-950 border border-slate-800 rounded-lg p-2 space-y-1.5">
                        <div className="aspect-video bg-slate-900 rounded overflow-hidden relative">
                          <img
                            src={att.url}
                            alt={att.caption || att.fileName}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              (e.target as HTMLElement).style.display = 'none';
                            }}
                          />
                        </div>
                        <div className="text-[11px] font-semibold text-slate-200 truncate">{att.fileName}</div>
                        {att.caption && <div className="text-[10px] text-slate-400 truncate">{att.caption}</div>}
                        <div className="text-[9px] text-slate-500 flex justify-between">
                          <span>{att.uploadedBy}</span>
                          <a href={att.url} target="_blank" rel="noreferrer" className="text-cyan-400 hover:underline">
                            View
                          </a>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Comments & Collaboration Section */}
              <div className="space-y-3">
                <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                  <MessageSquare className="w-3.5 h-3.5 text-cyan-400" />
                  Intake Review Notes & Discussion ({selectedRequest.comments?.length || 0})
                </h3>

                <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                  {(!selectedRequest.comments || selectedRequest.comments.length === 0) ? (
                    <div className="p-3 bg-slate-950 border border-slate-800 rounded-lg text-center text-slate-500 italic">
                      No discussion notes yet. Leave an update below.
                    </div>
                  ) : (
                    selectedRequest.comments.map((c) => (
                      <div key={c.id} className="bg-slate-950 border border-slate-800 p-3 rounded-lg space-y-1">
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="font-bold text-slate-200">{c.authorName}</span>
                          <span className="text-[10px] text-slate-500">{new Date(c.createdAt).toLocaleTimeString()}</span>
                        </div>
                        <div className="text-slate-300 text-xs">{c.content}</div>
                      </div>
                    ))
                  )}
                </div>

                {/* Comment Input */}
                <form onSubmit={handleAddComment} className="flex gap-2">
                  <input
                    type="text"
                    required
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                    placeholder="Add an internal note or customer response..."
                    className="flex-1 bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                  />
                  <button
                    type="submit"
                    disabled={isSubmittingComment}
                    className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-semibold flex items-center gap-1 shadow-xs"
                  >
                    {isSubmittingComment ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                    <span>Post</span>
                  </button>
                </form>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Convert Request to Work Order Modal */}
      {isConvertModalOpen && selectedRequest && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <ArrowRight className="w-4 h-4 text-emerald-400" />
                  Convert Request to Active Work Order
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  {selectedRequest.requestNumber}: {selectedRequest.title}
                </p>
              </div>
              <button
                onClick={() => setIsConvertModalOpen(false)}
                className="text-slate-400 hover:text-white text-xs"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleExecuteConversion} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Execution Priority</label>
                  <select
                    value={convertPriority}
                    onChange={(e) => setConvertPriority(e.target.value as Priority)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-emerald-500"
                  >
                    <option value="CRITICAL">CRITICAL (1h SLA)</option>
                    <option value="HIGH">HIGH (4h SLA)</option>
                    <option value="MEDIUM">MEDIUM (24h SLA)</option>
                    <option value="LOW">LOW (72h SLA)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Maintenance Category</label>
                  <select
                    value={convertCategory}
                    onChange={(e) => setConvertCategory(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-emerald-500"
                  >
                    <option value="CORRECTIVE_MAINTENANCE">Corrective Maintenance</option>
                    <option value="PREVENTATIVE_MAINTENANCE">Preventative Maintenance</option>
                    <option value="EMERGENCY_REPAIR">Emergency Repair</option>
                    <option value="SAFETY_INSPECTION">Safety Inspection</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Assign Field Technician (Optional)
                </label>
                <select
                  value={convertTechId}
                  onChange={(e) => setConvertTechId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-emerald-500"
                >
                  <option value="">Leave Unassigned (Status will be TRIAGED)</option>
                  {technicians.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name} ({t.status}) &bull; {t.skills.join(', ')}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Due Date & Time</label>
                <input
                  type="datetime-local"
                  value={convertDueDate}
                  onChange={(e) => setConvertDueDate(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsConvertModalOpen(false)}
                  className="px-3 py-1.5 text-xs text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isConverting}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow"
                >
                  {isConverting ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <ArrowRight className="w-3.5 h-3.5" />}
                  Confirm Conversion to Work Order
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Create New Service Request Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <PlusCircle className="w-4 h-4 text-emerald-400" />
                Submit New Customer Service Request
              </h3>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="text-slate-400 hover:text-white text-xs"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Target Facility</label>
                  <select
                    required
                    value={newFacilityId}
                    onChange={(e) => {
                      setNewFacilityId(e.target.value);
                      setNewAssetId('');
                    }}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-emerald-500"
                  >
                    {facilities.map((f) => (
                      <option key={f.id} value={f.id}>{f.name} ({f.code})</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Impacted Asset (Optional)</label>
                  <select
                    value={newAssetId}
                    onChange={(e) => setNewAssetId(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-emerald-500"
                  >
                    <option value="">General Facility / Non-Asset Issue</option>
                    {filteredAssetsForFacility.map((a) => (
                      <option key={a.id} value={a.id}>{a.name} ({a.assetTag})</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Problem Title</label>
                <input
                  type="text"
                  required
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="e.g. Server Room Main CRAC Unit Temperature Warning"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Problem Description</label>
                <textarea
                  required
                  rows={3}
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  placeholder="Describe abnormal noises, symptoms, error codes, and immediate safety concerns..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Priority</label>
                  <select
                    value={newPriority}
                    onChange={(e) => setNewPriority(e.target.value as Priority)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-emerald-500"
                  >
                    <option value="CRITICAL">CRITICAL (System Halt)</option>
                    <option value="HIGH">HIGH (Major Disruption)</option>
                    <option value="MEDIUM">MEDIUM (Standard)</option>
                    <option value="LOW">LOW (Cosmetic / Routine)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Requested Service Date</label>
                  <input
                    type="date"
                    value={newRequestedDate}
                    onChange={(e) => setNewRequestedDate(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Location Details</label>
                <input
                  type="text"
                  value={newLocationDetails}
                  onChange={(e) => setNewLocationDetails(e.target.value)}
                  placeholder="e.g. Level 2, Room 204B, Northwest quadrant"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Initial Photo / Attachment URL</label>
                <input
                  type="url"
                  value={newAttachmentUrl}
                  onChange={(e) => setNewAttachmentUrl(e.target.value)}
                  placeholder="https://images.unsplash.com/... or photo URL"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-3 py-1.5 text-xs text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingNew}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow"
                >
                  {isSubmittingNew ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <PlusCircle className="w-3.5 h-3.5" />}
                  Submit Service Request
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Attachment Modal */}
      {showAttachmentModal && selectedRequest && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-sm w-full p-5 space-y-3 shadow-2xl">
            <h3 className="text-sm font-bold text-white">Add Inspection Photo / Document</h3>
            <form onSubmit={handleAddAttachment} className="space-y-3">
              <div>
                <label className="block text-xs text-slate-400 mb-1">Image / Document URL</label>
                <input
                  type="url"
                  required
                  value={attachmentUrl}
                  onChange={(e) => setAttachmentUrl(e.target.value)}
                  placeholder="https://images.unsplash.com/..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-100 focus:outline-none focus:border-emerald-500"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">Caption</label>
                <input
                  type="text"
                  value={attachmentCaption}
                  onChange={(e) => setAttachmentCaption(e.target.value)}
                  placeholder="e.g. Compressor valve leakage photo"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-100 focus:outline-none focus:border-emerald-500"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
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
                  className="px-3 py-1.5 bg-emerald-600 text-white rounded-lg text-xs font-semibold hover:bg-emerald-500"
                >
                  Upload
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete / Archive Confirmation Modal */}
      {requestToDelete && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-rose-900/50 rounded-2xl max-w-sm w-full p-5 space-y-3 shadow-2xl">
            <div className="flex items-center gap-2 text-rose-400">
              <AlertCircle className="w-5 h-5" />
              <h3 className="text-sm font-bold text-white">Delete Service Request?</h3>
            </div>
            <p className="text-xs text-slate-300">
              Are you sure you want to permanently delete service request{' '}
              <strong className="text-white font-mono">{requestToDelete.requestNumber}</strong>?
              This action cannot be undone.
            </p>
            <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setRequestToDelete(null)}
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
    </div>
  );
};
