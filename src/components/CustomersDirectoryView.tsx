import React, { useState, useEffect } from 'react';
import { 
  Building, ShieldCheck, Phone, Mail, MapPin, FileText, 
  DollarSign, ArrowUpRight, Search, Filter, CheckCircle2, 
  AlertCircle, RefreshCw, Layers, ExternalLink
} from 'lucide-react';
import { Customer, RoleName, WorkOrder, Facility } from '../types';
import { api } from '../services/api';

interface CustomersDirectoryViewProps {
  selectedCustomerId?: string | null;
  onSelectWorkOrder?: (orderId: string) => void;
  onRefreshData?: () => Promise<void>;
  currentRole?: RoleName;
}

export const CustomersDirectoryView: React.FC<CustomersDirectoryViewProps> = ({
  selectedCustomerId,
  onSelectWorkOrder,
  onRefreshData,
  currentRole
}) => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [tierFilter, setTierFilter] = useState<string>('ALL');

  // Detail Modal
  const [activeCustomerDetail, setActiveCustomerDetail] = useState<any | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  const fetchCustomers = async () => {
    setLoading(true);
    try {
      const data = await api.getCustomers();
      setCustomers(data);
    } catch (err) {
      console.error('Error loading customers:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomers();
  }, []);

  useEffect(() => {
    if (selectedCustomerId) {
      openCustomerDetail(selectedCustomerId);
    }
  }, [selectedCustomerId]);

  const openCustomerDetail = async (id: string) => {
    setLoadingDetail(true);
    try {
      const data = await api.getCustomerById(id);
      setActiveCustomerDetail(data);
    } catch (e) {
      const c = customers.find(item => item.id === id);
      if (c) {
        setActiveCustomerDetail(c);
      }
    } finally {
      setLoadingDetail(false);
    }
  };

  const filteredCustomers = customers.filter(c => {
    const q = searchQuery.toLowerCase();
    const matchesSearch = !q || 
      c.name.toLowerCase().includes(q) || 
      c.contactPerson.toLowerCase().includes(q) || 
      c.email.toLowerCase().includes(q) || 
      c.primaryFacilityName.toLowerCase().includes(q);
    
    const matchesTier = tierFilter === 'ALL' || c.tier === tierFilter;

    return matchesSearch && matchesTier;
  });

  const getTierBadge = (tier: string) => {
    switch (tier) {
      case 'ENTERPRISE':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-purple-950/80 text-purple-300 border border-purple-800/60 uppercase tracking-wider">
            Enterprise Tier
          </span>
        );
      case 'PREMIUM':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-cyan-950/80 text-cyan-300 border border-cyan-800/60 uppercase tracking-wider">
            Premium Tier
          </span>
        );
      default:
        return (
          <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-800 text-slate-300 border border-slate-700 uppercase tracking-wider">
            Standard Tier
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
            <Building className="w-6 h-6 text-purple-400" />
            Commercial Client Accounts
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Enterprise facility service agreements, client portfolio accounts, and dedicated SLA contracts.
          </p>
        </div>

        <button
          onClick={fetchCustomers}
          className="flex items-center gap-2 px-3.5 py-1.5 rounded-lg border border-slate-800 bg-slate-900 hover:bg-slate-800 text-slate-300 text-xs font-semibold transition self-start sm:self-auto"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Refresh Accounts
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-900/60 border border-slate-800/80 rounded-xl p-3">
        <div className="relative flex-1 min-w-[260px]">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search clients by name, contact, facility..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-4 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-purple-500"
          />
        </div>

        <select
          value={tierFilter}
          onChange={(e) => setTierFilter(e.target.value)}
          className="bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-purple-500"
        >
          <option value="ALL">All Service Tiers</option>
          <option value="ENTERPRISE">Enterprise</option>
          <option value="PREMIUM">Premium</option>
          <option value="STANDARD">Standard</option>
        </select>
      </div>

      {/* Client Cards */}
      {loading ? (
        <div className="text-center py-12 text-slate-400 text-xs flex items-center justify-center gap-2">
          <RefreshCw className="w-4 h-4 animate-spin text-purple-400" />
          Loading commercial customer accounts...
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredCustomers.map((cust) => (
            <div
              key={cust.id}
              id={`customer-card-${cust.id}`}
              onClick={() => openCustomerDetail(cust.id)}
              className="bg-slate-900 border border-slate-800 hover:border-purple-500/50 rounded-xl p-5 cursor-pointer transition-all duration-200 group flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div>
                    <h3 className="text-base font-bold text-white group-hover:text-purple-400 transition">
                      {cust.name}
                    </h3>
                    <span className="text-[11px] text-slate-400 font-mono">
                      Contract: {cust.activeContract}
                    </span>
                  </div>
                  {getTierBadge(cust.tier)}
                </div>

                <div className="space-y-1.5 text-xs text-slate-400 mb-4 bg-slate-950/60 border border-slate-800/60 rounded-lg p-3">
                  <div className="flex items-center gap-2">
                    <Building className="w-3.5 h-3.5 text-purple-400 flex-shrink-0" />
                    <span className="text-slate-200 font-medium truncate">{cust.primaryFacilityName}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <MapPin className="w-3.5 h-3.5 text-slate-500 flex-shrink-0" />
                    <span className="text-slate-400 truncate">{cust.address}, {cust.city}, {cust.state}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Mail className="w-3.5 h-3.5 text-slate-500 flex-shrink-0" />
                    <span className="text-slate-300 truncate">{cust.contactPerson} ({cust.email})</span>
                  </div>
                </div>

                <div className="text-[11px] text-slate-400 mb-4 bg-purple-950/20 border border-purple-900/30 rounded-lg p-2.5 flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-purple-400 flex-shrink-0" />
                  <span className="truncate">{cust.slaTier}</span>
                </div>
              </div>

              <div className="border-t border-slate-800 pt-3 flex items-center justify-between text-xs">
                <div>
                  <span className="text-[10px] text-slate-500 uppercase block">Active Tickets</span>
                  <span className="text-amber-400 font-bold">{cust.openTicketsCount} Pending Work</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 uppercase block text-right">YTD Services</span>
                  <span className="text-emerald-400 font-bold font-mono">${cust.totalSpentYtd.toLocaleString()}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* DETAIL MODAL */}
      {activeCustomerDetail && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6 space-y-5 shadow-2xl">
            <div className="flex items-start justify-between border-b border-slate-800 pb-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  {getTierBadge(activeCustomerDetail.tier)}
                  <span className="text-xs font-mono text-slate-400">{activeCustomerDetail.activeContract}</span>
                </div>
                <h2 className="text-lg font-bold text-white">{activeCustomerDetail.name}</h2>
                <p className="text-xs text-slate-400">{activeCustomerDetail.address}, {activeCustomerDetail.city}, {activeCustomerDetail.state}</p>
              </div>
              <button
                onClick={() => setActiveCustomerDetail(null)}
                className="text-slate-400 hover:text-white text-sm bg-slate-800 px-2.5 py-1 rounded-lg"
              >
                ✕ Close
              </button>
            </div>

            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="bg-slate-950 border border-slate-800 rounded-xl p-3">
                <span className="text-[10px] text-slate-500 uppercase font-semibold">Contact Representative</span>
                <div className="text-xs font-bold text-white mt-1">{activeCustomerDetail.contactPerson}</div>
                <div className="text-[11px] text-slate-400 font-mono mt-0.5">{activeCustomerDetail.phone}</div>
              </div>
              <div className="bg-slate-950 border border-slate-800 rounded-xl p-3">
                <span className="text-[10px] text-slate-500 uppercase font-semibold">Active Work Tickets</span>
                <div className="text-base font-bold text-amber-400 mt-1">{activeCustomerDetail.openTicketsCount}</div>
              </div>
              <div className="bg-slate-950 border border-slate-800 rounded-xl p-3">
                <span className="text-[10px] text-slate-500 uppercase font-semibold">YTD Billing</span>
                <div className="text-base font-bold text-emerald-400 mt-1 font-mono">${activeCustomerDetail.totalSpentYtd?.toLocaleString()}</div>
              </div>
            </div>

            {/* SLA Info */}
            <div className="bg-purple-950/30 border border-purple-800/40 rounded-xl p-3.5 flex items-center gap-3">
              <ShieldCheck className="w-5 h-5 text-purple-400 flex-shrink-0" />
              <div className="text-xs">
                <span className="text-slate-400 block font-medium">Bound SLA Policy:</span>
                <span className="text-purple-300 font-bold text-sm">{activeCustomerDetail.slaTier}</span>
              </div>
            </div>

            {/* Linked Work Orders */}
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2 flex items-center gap-2">
                <FileText className="w-3.5 h-3.5 text-purple-400" />
                Associated Work Orders
              </h4>
              {activeCustomerDetail.workOrders && activeCustomerDetail.workOrders.length > 0 ? (
                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {activeCustomerDetail.workOrders.map((wo: any) => (
                    <div 
                      key={wo.id}
                      onClick={() => {
                        setActiveCustomerDetail(null);
                        if (onSelectWorkOrder) onSelectWorkOrder(wo.id);
                      }}
                      className="p-2.5 bg-slate-950 border border-slate-800 hover:border-purple-500/40 rounded-lg text-xs flex items-center justify-between cursor-pointer"
                    >
                      <div>
                        <div className="font-bold text-white">{wo.workOrderNumber}: {wo.title}</div>
                        <div className="text-[11px] text-slate-400">{wo.status} &bull; Priority: {wo.priority}</div>
                      </div>
                      <span className="text-purple-400 text-xs font-semibold">Inspect &rarr;</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-4 bg-slate-950/60 border border-slate-800 rounded-lg text-center text-xs text-slate-500">
                  No active work orders under this account.
                </div>
              )}
            </div>

            <div className="flex justify-end pt-3 border-t border-slate-800">
              <button
                onClick={() => setActiveCustomerDetail(null)}
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
