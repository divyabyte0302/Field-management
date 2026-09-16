import React, { useState, useEffect } from 'react';
import { 
  Users, HardHat, Phone, Mail, MapPin, Wrench, ShieldCheck, 
  CheckCircle2, Clock, AlertCircle, Search, Filter, ArrowUpRight,
  ExternalLink, Calendar, Star, RefreshCw
} from 'lucide-react';
import { Technician, RoleName, WorkOrder } from '../types';
import { api } from '../services/api';

interface TechniciansDirectoryViewProps {
  technicians: Technician[];
  workOrders: WorkOrder[];
  selectedTechId?: string | null;
  onSelectWorkOrder?: (orderId: string) => void;
  onRefreshData?: () => Promise<void>;
  currentRole?: RoleName;
}

export const TechniciansDirectoryView: React.FC<TechniciansDirectoryViewProps> = ({
  technicians: initialTechnicians,
  workOrders,
  selectedTechId,
  onSelectWorkOrder,
  onRefreshData,
  currentRole
}) => {
  const [technicians, setTechnicians] = useState<Technician[]>(initialTechnicians);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [skillFilter, setSkillFilter] = useState<string>('ALL');
  
  // Detail Modal
  const [activeTechDetail, setActiveTechDetail] = useState<any | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  useEffect(() => {
    setTechnicians(initialTechnicians);
  }, [initialTechnicians]);

  useEffect(() => {
    if (selectedTechId) {
      openTechDetail(selectedTechId);
    }
  }, [selectedTechId]);

  const openTechDetail = async (id: string) => {
    setLoadingDetail(true);
    try {
      const data = await api.getTechnicianById(id);
      setActiveTechDetail(data);
    } catch (e) {
      const t = technicians.find(item => item.id === id);
      if (t) {
        const assigned = workOrders.filter(w => w.assignedTechnicianId === t.id);
        setActiveTechDetail({
          ...t,
          assignedWorkOrders: assigned,
          activeWorkOrder: assigned.find(w => ['ASSIGNED', 'ACCEPTED', 'IN_PROGRESS', 'ON_HOLD'].includes(w.status)) || null,
          totalJobsAssigned: assigned.length,
          completedJobsCount: assigned.filter(w => ['COMPLETED', 'VERIFIED', 'CLOSED'].includes(w.status)).length,
        });
      }
    } finally {
      setLoadingDetail(false);
    }
  };

  // Collect all unique skills
  const allSkills = Array.from(new Set(technicians.flatMap(t => t.skills || [])));

  const filteredTechs = technicians.filter(t => {
    const q = searchQuery.toLowerCase();
    const matchesSearch = !q || 
      t.name.toLowerCase().includes(q) || 
      t.email.toLowerCase().includes(q) || 
      t.phone.toLowerCase().includes(q) ||
      (t.skills && t.skills.some(s => s.toLowerCase().includes(q)));
    
    const matchesStatus = statusFilter === 'ALL' || t.status === statusFilter;
    const matchesSkill = skillFilter === 'ALL' || (t.skills && t.skills.includes(skillFilter));

    return matchesSearch && matchesStatus && matchesSkill;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'AVAILABLE':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-950/80 text-emerald-300 border border-emerald-800/50">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
            Available
          </span>
        );
      case 'ON_SITE':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-cyan-950/80 text-cyan-300 border border-cyan-800/50">
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse"></span>
            On Site
          </span>
        );
      case 'IN_TRANSIT':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-950/80 text-blue-300 border border-blue-800/50">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-400"></span>
            In Transit
          </span>
        );
      case 'OFF_DUTY':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-900 text-slate-400 border border-slate-800">
            <span className="w-1.5 h-1.5 rounded-full bg-slate-500"></span>
            Off Duty
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-800 text-slate-300">
            {status}
          </span>
        );
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2.5">
            <HardHat className="w-6 h-6 text-amber-400" />
            Field Technicians Roster
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Certified technical workforce, dispatch status, trade specializations, and real-time operational load.
          </p>
        </div>

        {onRefreshData && (
          <button
            onClick={() => onRefreshData()}
            className="flex items-center gap-2 px-3.5 py-1.5 rounded-lg border border-slate-800 bg-slate-900 hover:bg-slate-800 text-slate-300 text-xs font-semibold transition"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Refresh Roster
          </button>
        )}
      </div>

      {/* Filters Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-900/60 border border-slate-800/80 rounded-xl p-3">
        <div className="relative flex-1 min-w-[260px]">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search technicians by name, skills, contact..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-4 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
          >
            <option value="ALL">All Statuses</option>
            <option value="AVAILABLE">Available</option>
            <option value="ON_SITE">On Site</option>
            <option value="IN_TRANSIT">In Transit</option>
            <option value="OFF_DUTY">Off Duty</option>
          </select>

          <select
            value={skillFilter}
            onChange={(e) => setSkillFilter(e.target.value)}
            className="bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
          >
            <option value="ALL">All Trade Skills</option>
            {allSkills.map(skill => (
              <option key={skill} value={skill}>{skill}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Technician Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filteredTechs.map((tech) => {
          const activeWO = workOrders.find(
            w => w.assignedTechnicianId === tech.id && ['ASSIGNED', 'ACCEPTED', 'IN_PROGRESS', 'ON_HOLD'].includes(w.status)
          );

          return (
            <div
              key={tech.id}
              id={`technician-card-${tech.id}`}
              onClick={() => openTechDetail(tech.id)}
              className="bg-slate-900 border border-slate-800 hover:border-amber-500/50 rounded-xl p-5 cursor-pointer transition-all duration-200 group flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center font-bold text-amber-400 text-sm">
                      {tech.name.split(' ').map(n => n[0]).join('')}
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-white group-hover:text-amber-400 transition">
                        {tech.name}
                      </h3>
                      <div className="text-[11px] text-slate-400 font-mono">
                        ID: {tech.id}
                      </div>
                    </div>
                  </div>
                  {getStatusBadge(tech.status)}
                </div>

                <div className="space-y-1 text-xs text-slate-400 mb-4 bg-slate-950/60 border border-slate-800/60 rounded-lg p-3">
                  <div className="flex items-center gap-2">
                    <Phone className="w-3.5 h-3.5 text-slate-500" />
                    <span className="font-mono text-slate-300">{tech.phone}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Mail className="w-3.5 h-3.5 text-slate-500" />
                    <span className="text-slate-300 truncate">{tech.email}</span>
                  </div>
                </div>

                {/* Skills tags */}
                <div className="mb-4">
                  <div className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold mb-1.5">Trade Skills</div>
                  <div className="flex flex-wrap gap-1.5">
                    {tech.skills?.map(skill => (
                      <span key={skill} className="px-2 py-0.5 rounded text-[11px] bg-slate-950 text-slate-300 border border-slate-800 font-medium">
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              <div className="border-t border-slate-800 pt-3 flex items-center justify-between text-xs">
                {activeWO ? (
                  <div className="truncate pr-2">
                    <span className="text-[10px] text-amber-400 font-semibold block">CURRENT ACTIVE JOB</span>
                    <span className="text-slate-200 truncate block font-medium">{activeWO.workOrderNumber}: {activeWO.title}</span>
                  </div>
                ) : (
                  <span className="text-slate-500 text-xs italic">
                    Ready for assignment
                  </span>
                )}
                <span className="text-amber-400 font-semibold text-xs group-hover:underline flex-shrink-0">
                  Profile &rarr;
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* TECHNICIAN DETAIL MODAL */}
      {activeTechDetail && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6 space-y-5 shadow-2xl">
            <div className="flex items-start justify-between border-b border-slate-800 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center font-bold text-amber-400 text-lg">
                  {activeTechDetail.name.split(' ').map((n: string) => n[0]).join('')}
                </div>
                <div>
                  <h2 className="text-lg font-bold text-white">{activeTechDetail.name}</h2>
                  <div className="flex items-center gap-2 text-xs text-slate-400 mt-0.5">
                    <span>{activeTechDetail.email}</span>
                    <span>&bull;</span>
                    <span className="font-mono">{activeTechDetail.phone}</span>
                  </div>
                </div>
              </div>
              <button
                onClick={() => setActiveTechDetail(null)}
                className="text-slate-400 hover:text-white text-sm bg-slate-800 px-2.5 py-1 rounded-lg"
              >
                ✕ Close
              </button>
            </div>

            <div className="grid grid-cols-4 gap-3 text-center">
              <div className="bg-slate-950 border border-slate-800 rounded-xl p-3">
                <span className="text-[10px] text-slate-500 uppercase font-semibold">Live Status</span>
                <div className="mt-1">{getStatusBadge(activeTechDetail.status)}</div>
              </div>
              <div className="bg-slate-950 border border-slate-800 rounded-xl p-3">
                <span className="text-[10px] text-slate-500 uppercase font-semibold">Total Assigned</span>
                <div className="text-base font-bold text-white mt-1">{activeTechDetail.totalJobsAssigned ?? 12}</div>
              </div>
              <div className="bg-slate-950 border border-slate-800 rounded-xl p-3">
                <span className="text-[10px] text-slate-500 uppercase font-semibold">Completed</span>
                <div className="text-base font-bold text-emerald-400 mt-1">{activeTechDetail.completedJobsCount ?? 10}</div>
              </div>
              <div className="bg-slate-950 border border-slate-800 rounded-xl p-3">
                <span className="text-[10px] text-slate-500 uppercase font-semibold">Rating</span>
                <div className="text-base font-bold text-amber-400 mt-1 flex items-center justify-center gap-1">
                  <Star className="w-3.5 h-3.5 fill-amber-400" />
                  4.95
                </div>
              </div>
            </div>

            {/* Certifications & Skills */}
            <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-3">
              <div>
                <h4 className="text-[10px] text-slate-400 uppercase font-semibold tracking-wider mb-1.5">Trade Qualifications & Skills</h4>
                <div className="flex flex-wrap gap-1.5">
                  {activeTechDetail.skills?.map((s: string) => (
                    <span key={s} className="px-2.5 py-1 rounded-md text-xs bg-slate-900 border border-slate-800 text-slate-200 font-medium">
                      {s}
                    </span>
                  ))}
                </div>
              </div>
              <div>
                <h4 className="text-[10px] text-slate-400 uppercase font-semibold tracking-wider mb-1.5">Active Certifications</h4>
                <div className="flex flex-wrap gap-1.5">
                  {activeTechDetail.certifications?.map((c: string) => (
                    <span key={c} className="px-2.5 py-1 rounded-md text-xs bg-cyan-950/60 border border-cyan-800/40 text-cyan-300 font-medium flex items-center gap-1.5">
                      <ShieldCheck className="w-3 h-3 text-cyan-400" />
                      {c}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* Assigned Work Orders History */}
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2 flex items-center gap-2">
                <Wrench className="w-3.5 h-3.5 text-amber-400" />
                Assigned Work Orders
              </h4>
              {activeTechDetail.assignedWorkOrders && activeTechDetail.assignedWorkOrders.length > 0 ? (
                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {activeTechDetail.assignedWorkOrders.map((wo: any) => (
                    <div 
                      key={wo.id}
                      onClick={() => {
                        setActiveTechDetail(null);
                        if (onSelectWorkOrder) onSelectWorkOrder(wo.id);
                      }}
                      className="p-2.5 bg-slate-950 border border-slate-800 hover:border-amber-500/40 rounded-lg text-xs flex items-center justify-between cursor-pointer"
                    >
                      <div>
                        <div className="font-bold text-white">{wo.workOrderNumber}: {wo.title}</div>
                        <div className="text-[11px] text-slate-400">{wo.status} &bull; Priority: {wo.priority} &bull; {wo.facilityName}</div>
                      </div>
                      <span className="text-amber-400 text-xs font-semibold">Inspect &rarr;</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-4 bg-slate-950/60 border border-slate-800 rounded-lg text-center text-xs text-slate-500">
                  No previous or current work orders assigned to this technician.
                </div>
              )}
            </div>

            <div className="flex justify-end pt-3 border-t border-slate-800">
              <button
                onClick={() => setActiveTechDetail(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold rounded-lg"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
