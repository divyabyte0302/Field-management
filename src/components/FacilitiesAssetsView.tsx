import React, { useState, useEffect } from 'react';
import { 
  Building2, Box, MapPin, Wrench, ShieldAlert, CheckCircle2, 
  AlertTriangle, Search, Filter, ArrowUpRight, Plus, ExternalLink,
  Layers, HardHat, RefreshCw
} from 'lucide-react';
import { Facility, Asset, Priority, RoleName } from '../types';
import { api } from '../services/api';

interface FacilitiesAssetsViewProps {
  facilities: Facility[];
  assets: Asset[];
  initialTab?: 'facilities' | 'assets';
  selectedFacilityId?: string | null;
  selectedAssetId?: string | null;
  onSelectWorkOrder?: (orderId: string) => void;
  onRefreshData?: () => Promise<void>;
  currentRole?: RoleName;
}

export const FacilitiesAssetsView: React.FC<FacilitiesAssetsViewProps> = ({
  facilities: initialFacilities,
  assets: initialAssets,
  initialTab = 'facilities',
  selectedFacilityId,
  selectedAssetId,
  onSelectWorkOrder,
  onRefreshData,
  currentRole
}) => {
  const [subTab, setSubTab] = useState<'facilities' | 'assets'>(initialTab);
  const [facilities, setFacilities] = useState<Facility[]>(initialFacilities);
  const [assets, setAssets] = useState<Asset[]>(initialAssets);
  const [searchQuery, setSearchQuery] = useState('');
  const [facilityFilter, setFacilityFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [criticalityFilter, setCriticalityFilter] = useState<string>('ALL');
  
  // Detail modal state
  const [activeFacilityDetail, setActiveFacilityDetail] = useState<any | null>(null);
  const [activeAssetDetail, setActiveAssetDetail] = useState<any | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  useEffect(() => {
    setFacilities(initialFacilities);
  }, [initialFacilities]);

  useEffect(() => {
    setAssets(initialAssets);
  }, [initialAssets]);

  // Open detail if requested by prop
  useEffect(() => {
    if (selectedFacilityId) {
      openFacilityDetail(selectedFacilityId);
      setSubTab('facilities');
    }
  }, [selectedFacilityId]);

  useEffect(() => {
    if (selectedAssetId) {
      openAssetDetail(selectedAssetId);
      setSubTab('assets');
    }
  }, [selectedAssetId]);

  const openFacilityDetail = async (id: string) => {
    setLoadingDetail(true);
    try {
      const data = await api.getFacilityById(id);
      setActiveFacilityDetail(data);
    } catch (e) {
      // Fallback to local
      const f = facilities.find(item => item.id === id);
      if (f) {
        setActiveFacilityDetail({
          ...f,
          assets: assets.filter(a => a.facilityId === f.id),
          workOrders: [],
        });
      }
    } finally {
      setLoadingDetail(false);
    }
  };

  const openAssetDetail = async (id: string) => {
    setLoadingDetail(true);
    try {
      const data = await api.getAssetById(id);
      setActiveAssetDetail(data);
    } catch (e) {
      const a = assets.find(item => item.id === id);
      if (a) {
        const fac = facilities.find(f => f.id === a.facilityId);
        setActiveAssetDetail({
          ...a,
          facilityName: fac?.name || 'Main Campus',
          workOrders: [],
        });
      }
    } finally {
      setLoadingDetail(false);
    }
  };

  const filteredFacilities = facilities.filter(f => {
    const q = searchQuery.toLowerCase();
    const matchesSearch = !q || 
      f.name.toLowerCase().includes(q) || 
      f.code.toLowerCase().includes(q) || 
      f.city.toLowerCase().includes(q) || 
      f.address.toLowerCase().includes(q);
    return matchesSearch;
  });

  const filteredAssets = assets.filter(a => {
    const q = searchQuery.toLowerCase();
    const matchesSearch = !q || 
      a.name.toLowerCase().includes(q) || 
      a.tagNumber.toLowerCase().includes(q) || 
      a.manufacturer.toLowerCase().includes(q) || 
      a.model.toLowerCase().includes(q) || 
      a.category.toLowerCase().includes(q);
    
    const matchesFacility = facilityFilter === 'ALL' || a.facilityId === facilityFilter;
    const matchesStatus = statusFilter === 'ALL' || a.status === statusFilter;
    const matchesCriticality = criticalityFilter === 'ALL' || a.criticality === criticalityFilter;

    return matchesSearch && matchesFacility && matchesStatus && matchesCriticality;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'OPERATIONAL':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-950/80 text-emerald-300 border border-emerald-800/50">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
            Operational
          </span>
        );
      case 'DEGRADED':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-950/80 text-amber-300 border border-amber-800/50">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse"></span>
            Degraded
          </span>
        );
      case 'OFFLINE':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-950/80 text-rose-300 border border-rose-800/50">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-400"></span>
            Offline
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-800 text-slate-300 border border-slate-700">
            {status}
          </span>
        );
    }
  };

  const getCriticalityBadge = (crit: Priority) => {
    switch (crit) {
      case 'CRITICAL':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-950 text-rose-300 border border-rose-800/60 uppercase tracking-wider">Critical</span>;
      case 'HIGH':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-orange-950 text-orange-300 border border-orange-800/60 uppercase tracking-wider">High</span>;
      case 'MEDIUM':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-950 text-blue-300 border border-blue-800/60 uppercase tracking-wider">Medium</span>;
      default:
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-800 text-slate-300 border border-slate-700 uppercase tracking-wider">Low</span>;
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2.5">
            <Building2 className="w-6 h-6 text-cyan-400" />
            Facilities & Asset Registry
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Enterprise multi-site commercial facility portfolio, equipment hierarchy, and maintenance registry.
          </p>
        </div>

        {/* Tab switch */}
        <div className="flex items-center bg-slate-900 border border-slate-800 rounded-xl p-1 gap-1">
          <button
            id="tab-facilities-btn"
            onClick={() => setSubTab('facilities')}
            className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-2 ${
              subTab === 'facilities'
                ? 'bg-cyan-500 text-slate-950 font-bold shadow-md'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
            }`}
          >
            <Building2 className="w-3.5 h-3.5" />
            Facilities ({facilities.length})
          </button>
          <button
            id="tab-assets-btn"
            onClick={() => setSubTab('assets')}
            className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-2 ${
              subTab === 'assets'
                ? 'bg-cyan-500 text-slate-950 font-bold shadow-md'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
            }`}
          >
            <Box className="w-3.5 h-3.5" />
            Asset Catalog ({assets.length})
          </button>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-900/60 border border-slate-800/80 rounded-xl p-3">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder={subTab === 'facilities' ? "Search facilities by name, code, city..." : "Search assets by name, tag, model, manufacturer..."}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-4 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500"
          />
        </div>

        {subTab === 'assets' && (
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={facilityFilter}
              onChange={(e) => setFacilityFilter(e.target.value)}
              className="bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
            >
              <option value="ALL">All Facilities</option>
              {facilities.map(f => (
                <option key={f.id} value={f.id}>{f.name}</option>
              ))}
            </select>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
            >
              <option value="ALL">All Statuses</option>
              <option value="OPERATIONAL">Operational</option>
              <option value="DEGRADED">Degraded</option>
              <option value="OFFLINE">Offline</option>
            </select>

            <select
              value={criticalityFilter}
              onChange={(e) => setCriticalityFilter(e.target.value)}
              className="bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
            >
              <option value="ALL">All Criticalities</option>
              <option value="CRITICAL">Critical</option>
              <option value="HIGH">High</option>
              <option value="MEDIUM">Medium</option>
              <option value="LOW">Low</option>
            </select>
          </div>
        )}

        {onRefreshData && (
          <button
            onClick={() => onRefreshData()}
            className="p-1.5 rounded-lg border border-slate-800 bg-slate-950 text-slate-400 hover:text-white hover:bg-slate-800 transition"
            title="Refresh registry"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* FACILITIES TAB CONTENT */}
      {subTab === 'facilities' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredFacilities.map((fac) => {
            const facAssets = assets.filter(a => a.facilityId === fac.id);
            const degradedCount = facAssets.filter(a => a.status === 'DEGRADED' || a.status === 'OFFLINE').length;

            return (
              <div
                key={fac.id}
                id={`facility-card-${fac.id}`}
                onClick={() => openFacilityDetail(fac.id)}
                className="bg-slate-900 border border-slate-800 hover:border-cyan-500/50 rounded-xl p-5 cursor-pointer transition-all duration-200 group relative flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div>
                      <span className="text-[10px] font-mono uppercase tracking-wider text-cyan-400 bg-cyan-950/60 border border-cyan-800/40 px-2 py-0.5 rounded">
                        {fac.code}
                      </span>
                      <h3 className="text-base font-bold text-white group-hover:text-cyan-400 transition mt-1.5">
                        {fac.name}
                      </h3>
                    </div>
                    <ArrowUpRight className="w-4 h-4 text-slate-600 group-hover:text-cyan-400 transition" />
                  </div>

                  <p className="text-xs text-slate-400 flex items-center gap-1.5 mb-4">
                    <MapPin className="w-3.5 h-3.5 text-slate-500 flex-shrink-0" />
                    <span className="truncate">{fac.address}, {fac.city}, {fac.state}</span>
                  </p>

                  <div className="grid grid-cols-2 gap-2 bg-slate-950/60 border border-slate-800/60 rounded-lg p-3 text-xs mb-4">
                    <div>
                      <span className="text-[10px] text-slate-500 uppercase">Facility Type</span>
                      <div className="font-medium text-slate-200 truncate mt-0.5">{fac.facilityType.replace(/_/g, ' ')}</div>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 uppercase">Monitored Assets</span>
                      <div className="font-medium text-slate-200 mt-0.5">{facAssets.length || fac.totalAssetsCount} Equipment Units</div>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between border-t border-slate-800/80 pt-3 text-xs">
                  <div className="flex items-center gap-1.5">
                    {degradedCount > 0 ? (
                      <span className="text-amber-400 flex items-center gap-1 font-semibold text-[11px]">
                        <AlertTriangle className="w-3.5 h-3.5" />
                        {degradedCount} Attention Required
                      </span>
                    ) : (
                      <span className="text-emerald-400 flex items-center gap-1 font-semibold text-[11px]">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        All Assets Nominal
                      </span>
                    )}
                  </div>
                  <span className="text-cyan-400 text-xs font-semibold group-hover:underline">
                    View Dossier &rarr;
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ASSETS TAB CONTENT */}
      {subTab === 'assets' && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950/90 text-slate-400 uppercase text-[10px] font-semibold tracking-wider border-b border-slate-800">
                <tr>
                  <th className="px-4 py-3">Tag & Name</th>
                  <th className="px-4 py-3">Facility & Location</th>
                  <th className="px-4 py-3">Manufacturer & Model</th>
                  <th className="px-4 py-3">Criticality</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 text-slate-300">
                {filteredAssets.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-10 text-slate-500">
                      No assets found matching current criteria.
                    </td>
                  </tr>
                ) : (
                  filteredAssets.map((asset) => {
                    const fac = facilities.find(f => f.id === asset.facilityId);
                    return (
                      <tr 
                        key={asset.id} 
                        id={`asset-row-${asset.id}`}
                        onClick={() => openAssetDetail(asset.id)}
                        className="hover:bg-slate-800/40 cursor-pointer transition"
                      >
                        <td className="px-4 py-3 font-medium">
                          <div className="font-bold text-white flex items-center gap-2">
                            <Box className="w-3.5 h-3.5 text-cyan-400" />
                            {asset.name}
                          </div>
                          <span className="text-[10px] font-mono text-cyan-400 bg-slate-950 px-1.5 py-0.5 rounded border border-slate-800 mt-1 inline-block">
                            {asset.tagNumber}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="font-semibold text-slate-200">{fac?.name || 'Main Facility'}</div>
                          <div className="text-[11px] text-slate-400">{asset.locationDetails}</div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="text-slate-200 font-medium">{asset.manufacturer}</div>
                          <div className="text-[11px] text-slate-400 font-mono">Mod: {asset.model} | S/N: {asset.serialNumber}</div>
                        </td>
                        <td className="px-4 py-3">
                          {getCriticalityBadge(asset.criticality)}
                        </td>
                        <td className="px-4 py-3">
                          {getStatusBadge(asset.status)}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              openAssetDetail(asset.id);
                            }}
                            className="text-xs text-cyan-400 hover:text-cyan-300 font-semibold px-2.5 py-1 bg-slate-950 border border-slate-800 rounded-md hover:border-cyan-500/50"
                          >
                            Details
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* FACILITY DETAIL MODAL */}
      {activeFacilityDetail && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6 space-y-5 shadow-2xl">
            <div className="flex items-start justify-between border-b border-slate-800 pb-4">
              <div>
                <span className="text-[10px] font-mono uppercase tracking-wider text-cyan-400 bg-cyan-950 px-2 py-0.5 rounded border border-cyan-800/40">
                  {activeFacilityDetail.code}
                </span>
                <h2 className="text-lg font-bold text-white mt-1">{activeFacilityDetail.name}</h2>
                <p className="text-xs text-slate-400 flex items-center gap-1.5 mt-0.5">
                  <MapPin className="w-3.5 h-3.5 text-slate-500" />
                  {activeFacilityDetail.address}, {activeFacilityDetail.city}, {activeFacilityDetail.state} {activeFacilityDetail.postalCode}
                </p>
              </div>
              <button
                onClick={() => setActiveFacilityDetail(null)}
                className="text-slate-400 hover:text-white text-sm bg-slate-800 px-2.5 py-1 rounded-lg"
              >
                ✕ Close
              </button>
            </div>

            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="bg-slate-950 border border-slate-800 rounded-xl p-3">
                <span className="text-[10px] text-slate-500 uppercase font-semibold">Classification</span>
                <div className="text-xs font-bold text-slate-200 mt-1">{activeFacilityDetail.facilityType?.replace(/_/g, ' ')}</div>
              </div>
              <div className="bg-slate-950 border border-slate-800 rounded-xl p-3">
                <span className="text-[10px] text-slate-500 uppercase font-semibold">Registered Assets</span>
                <div className="text-base font-bold text-cyan-400 mt-0.5">{activeFacilityDetail.assets?.length || 0}</div>
              </div>
              <div className="bg-slate-950 border border-slate-800 rounded-xl p-3">
                <span className="text-[10px] text-slate-500 uppercase font-semibold">Active Work Orders</span>
                <div className="text-base font-bold text-amber-400 mt-0.5">{activeFacilityDetail.activeOrdersCount || 0}</div>
              </div>
            </div>

            {/* Assets List */}
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2.5 flex items-center gap-2">
                <Box className="w-3.5 h-3.5 text-cyan-400" />
                Stationed Equipment & Critical Infrastructure
              </h4>
              <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                {activeFacilityDetail.assets?.map((ast: Asset) => (
                  <div 
                    key={ast.id}
                    onClick={() => {
                      setActiveFacilityDetail(null);
                      openAssetDetail(ast.id);
                    }}
                    className="flex items-center justify-between bg-slate-950 border border-slate-800 hover:border-slate-700 p-2.5 rounded-lg text-xs cursor-pointer"
                  >
                    <div>
                      <div className="font-semibold text-white">{ast.name}</div>
                      <div className="text-[11px] text-slate-400">{ast.tagNumber} &bull; {ast.locationDetails}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      {getStatusBadge(ast.status)}
                      <ArrowUpRight className="w-3.5 h-3.5 text-slate-500" />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-end pt-3 border-t border-slate-800">
              <button
                onClick={() => setActiveFacilityDetail(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold rounded-lg"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ASSET DETAIL MODAL */}
      {activeAssetDetail && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto p-6 space-y-4 shadow-2xl">
            <div className="flex items-start justify-between border-b border-slate-800 pb-3">
              <div>
                <span className="text-[10px] font-mono uppercase tracking-wider text-cyan-400 bg-cyan-950 px-2 py-0.5 rounded border border-cyan-800/40">
                  {activeAssetDetail.tagNumber}
                </span>
                <h2 className="text-lg font-bold text-white mt-1">{activeAssetDetail.name}</h2>
                <p className="text-xs text-slate-400">{activeAssetDetail.manufacturer} &bull; Model {activeAssetDetail.model}</p>
              </div>
              <button
                onClick={() => setActiveAssetDetail(null)}
                className="text-slate-400 hover:text-white text-sm bg-slate-800 px-2.5 py-1 rounded-lg"
              >
                ✕ Close
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 bg-slate-950 border border-slate-800 rounded-xl p-4 text-xs">
              <div>
                <span className="text-[10px] text-slate-500 uppercase font-semibold">Location In Facility</span>
                <div className="font-semibold text-slate-200 mt-0.5">{activeAssetDetail.locationDetails || 'Main Room'}</div>
              </div>
              <div>
                <span className="text-[10px] text-slate-500 uppercase font-semibold">Serial Number</span>
                <div className="font-mono text-cyan-400 mt-0.5">{activeAssetDetail.serialNumber}</div>
              </div>
              <div>
                <span className="text-[10px] text-slate-500 uppercase font-semibold">Criticality Tier</span>
                <div className="mt-1">{getCriticalityBadge(activeAssetDetail.criticality)}</div>
              </div>
              <div>
                <span className="text-[10px] text-slate-500 uppercase font-semibold">Operational Status</span>
                <div className="mt-1">{getStatusBadge(activeAssetDetail.status)}</div>
              </div>
            </div>

            {/* Work Orders Linked to Asset */}
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2 flex items-center gap-2">
                <Wrench className="w-3.5 h-3.5 text-cyan-400" />
                Service & Maintenance History
              </h4>
              {activeAssetDetail.workOrders && activeAssetDetail.workOrders.length > 0 ? (
                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {activeAssetDetail.workOrders.map((wo: any) => (
                    <div 
                      key={wo.id}
                      onClick={() => {
                        setActiveAssetDetail(null);
                        if (onSelectWorkOrder) onSelectWorkOrder(wo.id);
                      }}
                      className="p-2.5 bg-slate-950 border border-slate-800 hover:border-cyan-500/40 rounded-lg text-xs flex items-center justify-between cursor-pointer"
                    >
                      <div>
                        <div className="font-bold text-white">{wo.workOrderNumber}: {wo.title}</div>
                        <div className="text-[11px] text-slate-400">{wo.status} &bull; Assigned: {wo.assignedTechnicianName || 'Unassigned'}</div>
                      </div>
                      <span className="text-cyan-400 text-xs font-semibold">Inspect &rarr;</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-4 bg-slate-950/60 border border-slate-800 rounded-lg text-center text-xs text-slate-500">
                  No previous maintenance tickets recorded for this asset.
                </div>
              )}
            </div>

            <div className="flex justify-end pt-3 border-t border-slate-800">
              <button
                onClick={() => setActiveAssetDetail(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold rounded-lg"
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
