import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { ServiceRequest, WorkOrder, Facility, Comment } from '../types';
import { api } from '../services/api';
import { 
  Building, PlusCircle, CheckCircle2, Clock, AlertTriangle, 
  RefreshCw, FileText, Send, CheckSquare, MessageSquare,
  Star, Paperclip, ChevronRight, User, MapPin, Check,
  ArrowRight, ShieldCheck, Eye, ThumbsUp
} from 'lucide-react';

export const CustomerPortal: React.FC = () => {
  const { user } = useAuth();
  const [serviceRequests, setServiceRequests] = useState<ServiceRequest[]>([]);
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([]);
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showModal, setShowModal] = useState(false);

  // Active tab inside customer portal
  const [activeTab, setActiveTab] = useState<'requests' | 'orders' | 'history'>('orders');
  const [facilityFilter, setFacilityFilter] = useState('ALL');

  // Request form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [facilityId, setFacilityId] = useState('');
  const [priority, setPriority] = useState('MEDIUM');
  const [locationDetails, setLocationDetails] = useState('');
  const [attachmentUrl, setAttachmentUrl] = useState('');
  const [attachmentName, setAttachmentName] = useState('');

  // Sign-off verification modal
  const [verifyingOrder, setVerifyingOrder] = useState<WorkOrder | null>(null);
  const [satisfactionRating, setSatisfactionRating] = useState(5);
  const [verificationFeedback, setVerificationFeedback] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);

  // Comments state for selected item
  const [activeDetailOrder, setActiveDetailOrder] = useState<WorkOrder | null>(null);
  const [newComment, setNewComment] = useState('');
  const [isPostingComment, setIsPostingComment] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [srData, woData, facData] = await Promise.all([
        api.getServiceRequests(),
        api.getWorkOrders(),
        api.getFacilities(),
      ]);
      setServiceRequests(srData);
      setWorkOrders(woData);
      setFacilities(facData);
      if (facData.length > 0 && !facilityId) {
        setFacilityId(facData[0].id);
      }
      if (activeDetailOrder) {
        const fresh = woData.find(w => w.id === activeDetailOrder.id);
        if (fresh) setActiveDetailOrder(fresh);
      }
    } catch (err) {
      console.error('Failed to load customer portal data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCreateRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !description || !facilityId) return;

    setIsSubmitting(true);
    try {
      const created = await api.createServiceRequest({
        facilityId,
        title,
        description,
        priority,
        locationDetails,
      });

      if (attachmentUrl.trim()) {
        await api.addServiceRequestAttachment(created.id, {
          fileName: attachmentName.trim() || 'Site-Photo.jpg',
          url: attachmentUrl.trim(),
          caption: 'Customer uploaded site photo',
        }).catch(() => {});
      }

      setTitle('');
      setDescription('');
      setLocationDetails('');
      setAttachmentUrl('');
      setAttachmentName('');
      setShowModal(false);
      await fetchData();
    } catch (err: any) {
      alert(`Error submitting request: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSignOffSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!verifyingOrder) return;

    setIsVerifying(true);
    try {
      const signOffNote = `Customer sign-off: Rated ${satisfactionRating}/5 stars. Feedback: ${verificationFeedback || 'Work verified satisfactory.'} (${user?.firstName} ${user?.lastName})`;
      await api.transitionWorkOrder(verifyingOrder.id, {
        targetStatus: 'CLOSED',
        notes: signOffNote,
      });

      // Also post as a comment
      await api.addWorkOrderComment(verifyingOrder.id, `⭐ Customer Satisfaction: ${satisfactionRating}/5 Stars - ${verificationFeedback || 'Approved'}`).catch(() => {});

      setVerifyingOrder(null);
      setVerificationFeedback('');
      setSatisfactionRating(5);
      await fetchData();
    } catch (err: any) {
      alert(`Verification failed: ${err.message}`);
    } finally {
      setIsVerifying(false);
    }
  };

  const handlePostComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeDetailOrder || !newComment.trim()) return;

    setIsPostingComment(true);
    try {
      await api.addWorkOrderComment(activeDetailOrder.id, newComment.trim());
      setNewComment('');
      await fetchData();
    } catch (err: any) {
      alert(`Failed to add comment: ${err.message}`);
    } finally {
      setIsPostingComment(false);
    }
  };

  // Filter lists based on facility
  const filteredRequests = serviceRequests.filter(r => 
    facilityFilter === 'ALL' || r.facilityId === facilityFilter
  );

  const filteredWorkOrders = workOrders.filter(w => 
    facilityFilter === 'ALL' || w.facilityId === facilityFilter
  );

  const activeOrders = filteredWorkOrders.filter(w => !['CLOSED', 'CANCELLED'].includes(w.status));
  const completedHistory = filteredWorkOrders.filter(w => w.status === 'CLOSED');
  const pendingVerificationOrders = filteredWorkOrders.filter(w => w.status === 'COMPLETED');

  // Tracking stages helper
  const getProgressStageIndex = (status: string) => {
    switch (status) {
      case 'NEW': return 0;
      case 'ASSIGNED': return 1;
      case 'IN_PROGRESS': return 2;
      case 'ON_HOLD': return 2;
      case 'COMPLETED': return 3;
      case 'CLOSED': return 4;
      default: return 0;
    }
  };

  const trackingSteps = [
    { label: 'Intake', desc: 'Work Order Created' },
    { label: 'Assigned', desc: 'Technician Dispatched' },
    { label: 'In Progress', desc: 'On-Site Work' },
    { label: 'Completed', desc: 'Pending Sign-Off' },
    { label: 'Closed', desc: 'Verified & Closed' },
  ];

  return (
    <div id="customer-portal-container" className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white border border-slate-200 p-6 rounded-2xl shadow-xs text-slate-900">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="px-2.5 py-0.5 rounded text-[10px] font-mono bg-blue-50 text-blue-700 border border-blue-200 font-bold uppercase">
              CLIENT PORTAL
            </span>
            <span className="text-xs text-slate-500 font-mono">• {user?.organizationId || 'Commercial Real Estate Tenant'}</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Facility Maintenance & Service Hub</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Report maintenance needs, track live contractor progress, communicate with dispatch, and approve completions.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            id="btn-customer-submit-request"
            onClick={() => setShowModal(true)}
            className="py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl flex items-center gap-2 shadow-xs transition-all cursor-pointer"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Submit Service Request</span>
          </button>
          <button
            onClick={fetchData}
            disabled={loading}
            className="p-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-slate-900 rounded-xl transition-colors cursor-pointer"
            title="Refresh portal"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Verification Notice Banner */}
      {pendingVerificationOrders.length > 0 && (
        <div id="verification-banner" className="bg-blue-50/70 border border-blue-200 rounded-2xl p-5 shadow-xs">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="p-2.5 bg-blue-100 border border-blue-200 rounded-xl text-blue-700 mt-0.5">
                <CheckSquare className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-blue-900">
                  {pendingVerificationOrders.length} Completed Work Order(s) Awaiting Your Customer Sign-Off
                </h3>
                <p className="text-xs text-slate-600 mt-0.5">
                  Contractor technicians have marked these items complete. Please review the resolution notes and verify completion.
                </p>
              </div>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {pendingVerificationOrders.map(order => (
              <div key={order.id} className="bg-white border border-blue-200 rounded-xl p-4 flex flex-col justify-between space-y-3 shadow-2xs">
                <div>
                  <div className="flex items-center justify-between text-xs mb-1.5">
                    <span className="font-mono text-blue-700 font-bold">{order.workOrderNumber}</span>
                    <span className="px-2 py-0.5 rounded bg-teal-50 text-teal-700 text-[10px] font-bold border border-teal-200">
                      READY FOR SIGN-OFF
                    </span>
                  </div>
                  <h4 className="text-xs font-bold text-slate-900">{order.title}</h4>
                  <p className="text-[11px] text-slate-500 mt-0.5">{order.facilityName} • Tech: {order.assignedTechnicianName || 'Field Tech'}</p>
                  {order.resolutionNotes && (
                    <div className="mt-2 p-2.5 rounded-lg bg-slate-50 border border-slate-200 text-[11px] text-slate-600">
                      <span className="font-bold text-slate-700">Resolution:</span> {order.resolutionNotes}
                    </div>
                  )}
                </div>
                <button
                  id={`btn-verify-signoff-${order.id}`}
                  onClick={() => setVerifyingOrder(order)}
                  className="w-full py-2 px-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-xs"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Review & Sign Off Work</span>
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Facility Filter Bar & Navigation Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-slate-200 shadow-xs">
        <div className="flex items-center gap-1">
          <button
            id="tab-customer-orders"
            onClick={() => setActiveTab('orders')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-colors cursor-pointer ${
              activeTab === 'orders' 
                ? 'bg-slate-900 text-white shadow-xs' 
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            Active Work Orders ({activeOrders.length})
          </button>
          <button
            id="tab-customer-requests"
            onClick={() => setActiveTab('requests')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-colors cursor-pointer ${
              activeTab === 'requests' 
                ? 'bg-slate-900 text-white shadow-xs' 
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            Submitted Requests ({filteredRequests.length})
          </button>
          <button
            id="tab-customer-history"
            onClick={() => setActiveTab('history')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-colors cursor-pointer ${
              activeTab === 'history' 
                ? 'bg-slate-900 text-white shadow-xs' 
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            Service History ({completedHistory.length})
          </button>
        </div>

        {/* Facility Selector */}
        <div className="flex items-center gap-2">
          <Building className="w-3.5 h-3.5 text-slate-400" />
          <span className="text-xs text-slate-500 font-medium">Facility:</span>
          <select
            value={facilityFilter}
            onChange={(e) => setFacilityFilter(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1 text-xs text-slate-700 font-medium focus:outline-none focus:ring-1 focus:ring-cyan-500 cursor-pointer"
          >
            <option value="ALL">All Facilities</option>
            {facilities.map(f => (
              <option key={f.id} value={f.id}>{f.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Main Content Area: Tab Views */}
      {activeTab === 'orders' && (
        <div className="space-y-4">
          {activeOrders.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-slate-500">
              <CheckCircle2 className="w-8 h-8 mx-auto mb-2 text-emerald-500 opacity-60" />
              <h3 className="text-sm font-bold text-slate-800">No active maintenance work orders</h3>
              <p className="text-xs text-slate-500 mt-1">All facilities in your portfolio are operating smoothly.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* List of active work orders (Left 1 col) */}
              <div className="space-y-3">
                {activeOrders.map(wo => {
                  const isSelected = activeDetailOrder?.id === wo.id;
                  return (
                    <div
                      key={wo.id}
                      onClick={() => setActiveDetailOrder(wo)}
                      className={`p-4 rounded-xl border transition-all cursor-pointer ${
                        isSelected 
                          ? 'bg-cyan-50/50 border-cyan-400 shadow-sm ring-1 ring-cyan-400' 
                          : 'bg-white border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className="font-mono font-bold text-slate-900">{wo.workOrderNumber}</span>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          wo.priority === 'CRITICAL' ? 'bg-rose-100 text-rose-800' :
                          wo.priority === 'HIGH' ? 'bg-amber-100 text-amber-800' :
                          'bg-blue-100 text-blue-800'
                        }`}>
                          {wo.priority}
                        </span>
                      </div>
                      <h4 className="text-xs font-bold text-slate-800 line-clamp-1">{wo.title}</h4>
                      <p className="text-[11px] text-slate-500 mt-0.5">{wo.facilityName}</p>
                      
                      <div className="flex items-center justify-between text-[11px] mt-3 pt-2 border-t border-slate-100">
                        <span className="font-medium text-slate-600">Status: <span className="font-bold text-cyan-700">{wo.status}</span></span>
                        <span className="text-slate-400 text-[10px]">{wo.assignedTechnicianName ? `Tech: ${wo.assignedTechnicianName.split(' ')[0]}` : 'Assigning...'}</span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Work Order Live Progress & Details (Right 2 cols) */}
              <div className="lg:col-span-2">
                {activeDetailOrder ? (
                  <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 space-y-6">
                    {/* Header */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-slate-100">
                      <div>
                        <div className="flex items-center gap-2 text-xs font-mono text-cyan-600 mb-1">
                          <span className="font-bold">{activeDetailOrder.workOrderNumber}</span>
                          <span>•</span>
                          <span>{activeDetailOrder.facilityName}</span>
                        </div>
                        <h2 className="text-lg font-bold text-slate-900">{activeDetailOrder.title}</h2>
                      </div>
                      <span className="px-3 py-1 rounded-lg text-xs font-bold font-mono bg-cyan-50 text-cyan-700 border border-cyan-200 self-start sm:self-auto">
                        {activeDetailOrder.status}
                      </span>
                    </div>

                    {/* Progress Step Indicator */}
                    <div className="space-y-2">
                      <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                        Real-Time Fulfillment Timeline
                      </h4>
                      <div className="grid grid-cols-7 gap-1 pt-1">
                        {trackingSteps.map((step, idx) => {
                          const currentStageIdx = getProgressStageIndex(activeDetailOrder.status);
                          const isDone = idx < currentStageIdx;
                          const isCurrent = idx === currentStageIdx;

                          return (
                            <div key={step.label} className="text-center">
                              <div className={`h-2 rounded-full mb-1.5 transition-all ${
                                isDone ? 'bg-emerald-500' :
                                isCurrent ? 'bg-cyan-500 animate-pulse' :
                                'bg-slate-200'
                              }`} />
                              <span className={`text-[10px] block font-bold truncate ${
                                isCurrent ? 'text-cyan-700' : isDone ? 'text-emerald-700' : 'text-slate-400'
                              }`}>
                                {step.label}
                              </span>
                              <span className="text-[9px] text-slate-400 hidden sm:block truncate">
                                {step.desc}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Assigned Technician & ETA info */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-4 bg-slate-50 rounded-xl border border-slate-200">
                      <div>
                        <span className="text-[10px] uppercase font-bold text-slate-500 block mb-0.5">Assigned Field Technician</span>
                        <div className="flex items-center gap-2 text-xs font-bold text-slate-800">
                          <User className="w-3.5 h-3.5 text-cyan-600" />
                          <span>{activeDetailOrder.assignedTechnicianName || 'Dispatching Field Technician...'}</span>
                        </div>
                      </div>
                      <div>
                        <span className="text-[10px] uppercase font-bold text-slate-500 block mb-0.5">SLA Expected Completion</span>
                        <div className="flex items-center gap-2 text-xs font-bold text-slate-800">
                          <Clock className="w-3.5 h-3.5 text-cyan-600" />
                          <span>{activeDetailOrder.dueDate ? new Date(activeDetailOrder.dueDate).toLocaleString() : 'Within SLA Window (24h)'}</span>
                        </div>
                      </div>
                    </div>

                    {/* Description */}
                    <div className="space-y-1">
                      <span className="text-xs font-bold text-slate-700">Problem Description</span>
                      <p className="text-xs text-slate-600 leading-relaxed bg-slate-50/50 p-3 rounded-xl border border-slate-100">
                        {activeDetailOrder.description}
                      </p>
                    </div>

                    {/* Interactive Comments Stream */}
                    <div className="space-y-3 pt-2 border-t border-slate-100">
                      <div className="flex items-center justify-between">
                        <h4 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                          <MessageSquare className="w-3.5 h-3.5 text-cyan-600" />
                          <span>Communication & Job Notes</span>
                        </h4>
                        <span className="text-[10px] text-slate-400">Direct link to dispatch & contractor</span>
                      </div>

                      <div className="space-y-2 max-h-48 overflow-y-auto">
                        {(!activeDetailOrder.comments || activeDetailOrder.comments.length === 0) ? (
                          <div className="text-center py-4 text-xs text-slate-400">
                            No comments posted yet. Ask a question or share site access details below.
                          </div>
                        ) : (
                          activeDetailOrder.comments.map(c => (
                            <div key={c.id} className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-xs">
                              <div className="flex items-center justify-between mb-1">
                                <span className="font-bold text-slate-800">{c.authorName} ({c.authorRole})</span>
                                <span className="text-[10px] text-slate-400">{new Date(c.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                              </div>
                              <p className="text-slate-600 text-[11px]">{c.content}</p>
                            </div>
                          ))
                        )}
                      </div>

                      <form onSubmit={handlePostComment} className="flex gap-2">
                        <input
                          type="text"
                          value={newComment}
                          onChange={(e) => setNewComment(e.target.value)}
                          placeholder="Type a note or question for the dispatch team..."
                          className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-cyan-500"
                        />
                        <button
                          type="submit"
                          disabled={isPostingComment || !newComment.trim()}
                          className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
                        >
                          {isPostingComment ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Send className="w-3 h-3" />}
                          <span>Post</span>
                        </button>
                      </form>
                    </div>
                  </div>
                ) : (
                  <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-slate-400 text-xs">
                    Select a work order on the left to view the real-time fulfillment timeline and communication thread.
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tab 2: Submitted Service Requests */}
      {activeTab === 'requests' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Your Submitted Service Requests</h3>
              <p className="text-xs text-slate-500">Inbound requests undergoing triage by operations dispatch</p>
            </div>
            <span className="text-xs font-bold text-slate-500">{filteredRequests.length} total</span>
          </div>

          {filteredRequests.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-xs">
              No service requests found for this facility. Click "Submit Service Request" above to report an issue.
            </div>
          ) : (
            <div className="space-y-3">
              {filteredRequests.map(req => (
                <div key={req.id} className="p-4 bg-slate-50 rounded-xl border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-emerald-700">{req.requestNumber}</span>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        req.status === 'CONVERTED' ? 'bg-blue-100 text-blue-800' :
                        req.status === 'APPROVED' ? 'bg-emerald-100 text-emerald-800' :
                        'bg-amber-100 text-amber-800'
                      }`}>
                        {req.status}
                      </span>
                      <span className="text-[10px] font-semibold text-slate-500">• Priority: {req.priority}</span>
                    </div>
                    <h4 className="text-xs font-bold text-slate-900">{req.title}</h4>
                    <p className="text-[11px] text-slate-600 line-clamp-2">{req.description}</p>
                    <div className="flex items-center gap-3 text-[10px] text-slate-400 pt-1">
                      <span className="flex items-center gap-1"><Building className="w-3 h-3" /> {req.facilityName}</span>
                      <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {new Date(req.createdAt).toLocaleDateString()}</span>
                    </div>
                  </div>

                  {req.convertedWorkOrderId && (
                    <div className="text-right shrink-0">
                      <span className="px-3 py-1.5 rounded-lg bg-cyan-100 text-cyan-800 text-xs font-mono font-bold border border-cyan-200 inline-flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Converted to Work Order
                      </span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab 3: Completed Service History */}
      {activeTab === 'history' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Historical Facility Maintenance Archive</h3>
              <p className="text-xs text-slate-500">Verified and closed work orders across your buildings</p>
            </div>
            <span className="text-xs font-bold text-slate-500">{completedHistory.length} completed records</span>
          </div>

          {completedHistory.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-xs">
              No historical completed work orders yet.
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {completedHistory.map(wo => (
                <div key={wo.id} className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-slate-900">{wo.workOrderNumber}</span>
                      <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                        {wo.status}
                      </span>
                      <span className="text-xs font-semibold text-slate-800">{wo.title}</span>
                    </div>
                    <p className="text-[11px] text-slate-500">
                      {wo.facilityName} • Serviced by {wo.assignedTechnicianName || 'Contractor'} • Verified: {wo.verifiedAt ? new Date(wo.verifiedAt).toLocaleDateString() : 'Yes'}
                    </p>
                    {wo.resolutionNotes && (
                      <p className="text-[11px] text-slate-600 italic mt-1">"{wo.resolutionNotes}"</p>
                    )}
                  </div>
                  <span className="text-xs font-mono font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200 self-start sm:self-auto">
                    Approved
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Modal 1: Submit Request Modal */}
      {showModal && (
        <div id="service-request-modal" className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-white border border-slate-200 rounded-2xl shadow-xl p-6 space-y-4 text-slate-900">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <PlusCircle className="w-4 h-4 text-blue-600" />
                New Facility Service Request
              </h3>
              <button
                onClick={() => setShowModal(false)}
                className="text-slate-400 hover:text-slate-700 text-xs p-1 rounded-lg hover:bg-slate-100 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateRequest} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Facility Location</label>
                <select
                  id="select-sr-facility"
                  value={facilityId}
                  onChange={(e) => setFacilityId(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 cursor-pointer"
                >
                  {facilities.map(f => (
                    <option key={f.id} value={f.id}>{f.name} ({f.code})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Issue Title</label>
                <input
                  id="input-sr-title"
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Server Room CRAC unit blowing ambient air"
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Detailed Description</label>
                <textarea
                  id="input-sr-description"
                  required
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe the issue, symptoms, affected areas, and urgency..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Priority Level</label>
                  <select
                    id="select-sr-priority"
                    value={priority}
                    onChange={(e) => setPriority(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 cursor-pointer"
                  >
                    <option value="CRITICAL">CRITICAL (1h SLA Response)</option>
                    <option value="HIGH">HIGH (4h SLA Response)</option>
                    <option value="MEDIUM">MEDIUM (24h Standard)</option>
                    <option value="LOW">LOW (Scheduled Routine)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Location Details</label>
                  <input
                    id="input-sr-location"
                    type="text"
                    value={locationDetails}
                    onChange={(e) => setLocationDetails(e.target.value)}
                    placeholder="Floor 3, Tech Room B"
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                </div>
              </div>

              {/* Photo / Document URL attachment */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Photo / Document Attachment URL (Optional)</label>
                <div className="flex gap-2">
                  <input
                    type="url"
                    value={attachmentUrl}
                    onChange={(e) => setAttachmentUrl(e.target.value)}
                    placeholder="https://images.unsplash.com/... or site photo link"
                    className="flex-1 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                  <input
                    type="text"
                    value={attachmentName}
                    onChange={(e) => setAttachmentName(e.target.value)}
                    placeholder="File Name"
                    className="w-32 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-3.5 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  id="btn-submit-sr"
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-xs cursor-pointer disabled:opacity-50 transition-colors"
                >
                  {isSubmitting ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                  <span>Submit Service Request</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 2: Customer Sign-Off & Verification */}
      {verifyingOrder && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white border border-slate-200 rounded-2xl shadow-xl p-6 space-y-4 text-slate-900">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-blue-600" />
                Work Order Sign-Off & Approval
              </h3>
              <button
                onClick={() => setVerifyingOrder(null)}
                className="text-slate-400 hover:text-slate-700 text-xs p-1 rounded-lg hover:bg-slate-100 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-1">
              <div className="font-mono font-bold text-blue-700">{verifyingOrder.workOrderNumber}</div>
              <div className="font-bold text-slate-900">{verifyingOrder.title}</div>
              <div className="text-slate-500">{verifyingOrder.facilityName}</div>
              {verifyingOrder.resolutionNotes && (
                <div className="mt-2 text-slate-600 text-[11px] p-2 bg-white rounded-lg border border-slate-200">
                  <span className="text-slate-500 font-bold">Resolution:</span> {verifyingOrder.resolutionNotes}
                </div>
              )}
            </div>

            <form onSubmit={handleSignOffSubmit} className="space-y-4">
              {/* Star Rating */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Satisfaction Rating
                </label>
                <div className="flex items-center gap-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setSatisfactionRating(star)}
                      className="p-1 text-slate-300 hover:text-amber-500 cursor-pointer transition-colors"
                    >
                      <Star
                        className={`w-6 h-6 ${
                          star <= satisfactionRating 
                            ? 'text-amber-500 fill-amber-500' 
                            : 'text-slate-200'
                        }`}
                      />
                    </button>
                  ))}
                  <span className="text-xs font-bold text-amber-700 ml-2">
                    {satisfactionRating} of 5 Stars
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Customer Sign-Off Feedback / Comments
                </label>
                <textarea
                  rows={3}
                  value={verificationFeedback}
                  onChange={(e) => setVerificationFeedback(e.target.value)}
                  placeholder="e.g. Work inspected, HVAC cooling restored at setpoint. Clean work site."
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setVerifyingOrder(null)}
                  className="px-3.5 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isVerifying}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-xs cursor-pointer disabled:opacity-50 transition-colors"
                >
                  {isVerifying ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                  <span>Sign Off & Approve Completion</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
