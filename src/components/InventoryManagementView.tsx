import React, { useState, useEffect } from 'react';
import { 
  Boxes, PackagePlus, AlertTriangle, CheckCircle2, History, 
  Search, Filter, Plus, ArrowUpRight, ArrowDownRight, RefreshCw, 
  Building2, MapPin, DollarSign, Tag, Wrench, ChevronRight, FileText
} from 'lucide-react';
import { 
  FacilityInventory, InventoryHistory, Part, 
  Facility, RoleName 
} from '../types';
import { api } from '../services/api';

interface InventoryManagementViewProps {
  facilities: Facility[];
  currentRole: RoleName;
}

export const InventoryManagementView: React.FC<InventoryManagementViewProps> = ({
  facilities,
  currentRole
}) => {
  const [activeTab, setActiveTab] = useState<'inventory' | 'history' | 'catalog'>('inventory');
  const [inventoryList, setInventoryList] = useState<FacilityInventory[]>([]);
  const [historyList, setHistoryList] = useState<InventoryHistory[]>([]);
  const [partsCatalog, setPartsCatalog] = useState<Part[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Filters
  const [selectedFacilityId, setSelectedFacilityId] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [lowStockOnly, setLowStockOnly] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [historyChangeType, setHistoryChangeType] = useState('ALL');

  // Restock Modal State
  const [showRestockModal, setShowRestockModal] = useState(false);
  const [restockItem, setRestockItem] = useState<FacilityInventory | null>(null);
  const [restockQuantity, setRestockQuantity] = useState(10);
  const [restockSupplierRef, setRestockSupplierRef] = useState('');
  const [restockReason, setRestockReason] = useState('');
  const [isSubmittingRestock, setIsSubmittingRestock] = useState(false);
  const [restockError, setRestockError] = useState<string | null>(null);

  // Adjust Modal State
  const [showAdjustModal, setShowAdjustModal] = useState(false);
  const [adjustItem, setAdjustItem] = useState<FacilityInventory | null>(null);
  const [adjustDelta, setAdjustDelta] = useState<number>(0);
  const [adjustReason, setAdjustReason] = useState('');
  const [isSubmittingAdjust, setIsSubmittingAdjust] = useState(false);
  const [adjustError, setAdjustError] = useState<string | null>(null);

  // Create Catalog Part Modal State
  const [showCreatePartModal, setShowCreatePartModal] = useState(false);
  const [newPartNumber, setNewPartNumber] = useState('');
  const [newPartName, setNewPartName] = useState('');
  const [newPartCategory, setNewPartCategory] = useState('ELECTRICAL');
  const [newPartUnitCost, setNewPartUnitCost] = useState(50);
  const [newPartUnitPrice, setNewPartUnitPrice] = useState(85);
  const [newPartSupplier, setNewPartSupplier] = useState('Apex Industrial Direct');
  const [newPartMinStock, setNewPartMinStock] = useState(2);
  const [newPartReorderLevel, setNewPartReorderLevel] = useState(5);
  const [isSubmittingPart, setIsSubmittingPart] = useState(false);
  const [partModalError, setPartModalError] = useState<string | null>(null);

  const canManageInventory = currentRole === 'SUPER_ADMIN' || currentRole === 'ADMIN' || currentRole === 'DISPATCHER';

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [inv, hist, parts] = await Promise.all([
        api.getInventory({
          facilityId: selectedFacilityId,
          search: searchQuery || undefined,
          lowStock: lowStockOnly || undefined,
          category: selectedCategory !== 'ALL' ? selectedCategory : undefined,
        }).catch(() => []),
        api.getInventoryHistory({
          facilityId: selectedFacilityId !== 'ALL' ? selectedFacilityId : undefined,
          changeType: historyChangeType !== 'ALL' ? historyChangeType : undefined,
        }).catch(() => []),
        api.getParts().catch(() => []),
      ]);
      setInventoryList(inv);
      setHistoryList(hist);
      setPartsCatalog(parts);
    } catch (err) {
      console.error('Failed to load inventory data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [selectedFacilityId, selectedCategory, lowStockOnly, historyChangeType]);

  const handleOpenRestock = (item: FacilityInventory) => {
    setRestockItem(item);
    setRestockQuantity(Math.max(5, item.reorderLevel * 2));
    setRestockSupplierRef(`PO-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`);
    setRestockReason(`Inventory replenishment for ${item.facilityName}`);
    setRestockError(null);
    setShowRestockModal(true);
  };

  const handleRestockSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!restockItem) return;
    if (restockQuantity <= 0) {
      setRestockError('Restock quantity must be greater than zero');
      return;
    }

    setIsSubmittingRestock(true);
    setRestockError(null);
    try {
      await api.restockInventory({
        facilityId: restockItem.facilityId,
        partId: restockItem.partId,
        quantity: Number(restockQuantity),
        supplierRef: restockSupplierRef.trim(),
        reason: restockReason.trim(),
      });
      setShowRestockModal(false);
      await fetchData();
    } catch (err: any) {
      setRestockError(err.message || 'Restock operation failed');
    } finally {
      setIsSubmittingRestock(false);
    }
  };

  const handleOpenAdjust = (item: FacilityInventory) => {
    setAdjustItem(item);
    setAdjustDelta(0);
    setAdjustReason('');
    setAdjustError(null);
    setShowAdjustModal(true);
  };

  const handleAdjustSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adjustItem) return;
    if (adjustDelta === 0) {
      setAdjustError('Adjustment delta cannot be zero');
      return;
    }
    if (!adjustReason.trim()) {
      setAdjustError('Audited reason is required for manual stock adjustments');
      return;
    }

    // Client-side negative inventory validation
    if (adjustItem.stockOnHand + adjustDelta < 0) {
      setAdjustError(`Cannot reduce stock by ${Math.abs(adjustDelta)}. Maximum available reduction is ${adjustItem.stockOnHand} units.`);
      return;
    }

    setIsSubmittingAdjust(true);
    setAdjustError(null);
    try {
      await api.adjustInventory({
        facilityId: adjustItem.facilityId,
        partId: adjustItem.partId,
        quantityChanged: Number(adjustDelta),
        reason: adjustReason.trim(),
      });
      setShowAdjustModal(false);
      await fetchData();
    } catch (err: any) {
      setAdjustError(err.message || 'Stock adjustment failed');
    } finally {
      setIsSubmittingAdjust(false);
    }
  };

  const handleCreatePartSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPartNumber.trim() || !newPartName.trim()) {
      setPartModalError('Part number and name are required');
      return;
    }

    setIsSubmittingPart(true);
    setPartModalError(null);
    try {
      await api.createPart({
        partNumber: newPartNumber.trim().toUpperCase(),
        name: newPartName.trim(),
        category: newPartCategory,
        unitCost: Number(newPartUnitCost),
        unitPrice: Number(newPartUnitPrice),
        supplier: newPartSupplier.trim(),
        minStock: Number(newPartMinStock),
        reorderLevel: Number(newPartReorderLevel),
      });
      setShowCreatePartModal(false);
      setNewPartNumber('');
      setNewPartName('');
      await fetchData();
    } catch (err: any) {
      setPartModalError(err.message || 'Failed to add part to catalog');
    } finally {
      setIsSubmittingPart(false);
    }
  };

  const categories = Array.from(new Set(partsCatalog.map(p => p.category)));

  return (
    <div className="space-y-6">
      {/* View Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
              <Boxes className="w-5 h-5" />
            </span>
            <div>
              <h1 className="text-xl font-bold text-white tracking-wide font-mono">PARTS & INVENTORY MANAGEMENT</h1>
              <p className="text-xs text-slate-400">Facility-level stock control, reorder thresholds, replenishment POs & movement audit</p>
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

          {canManageInventory && (
            <button
              onClick={() => setShowCreatePartModal(true)}
              className="px-3.5 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow"
            >
              <Plus className="w-3.5 h-3.5" />
              Add Catalog Part
            </button>
          )}
        </div>
      </div>

      {/* Sub-Navigation Tabs */}
      <div className="flex border-b border-slate-800 bg-slate-900/60 rounded-xl p-1 gap-1 text-xs font-semibold">
        <button
          onClick={() => setActiveTab('inventory')}
          className={`px-4 py-2 rounded-lg transition-all flex items-center gap-2 ${
            activeTab === 'inventory'
              ? 'bg-slate-800 text-cyan-400 shadow-sm border border-slate-700'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Boxes className="w-4 h-4" />
          <span>Facility Stock on Hand ({inventoryList.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('history')}
          className={`px-4 py-2 rounded-lg transition-all flex items-center gap-2 ${
            activeTab === 'history'
              ? 'bg-slate-800 text-cyan-400 shadow-sm border border-slate-700'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <History className="w-4 h-4" />
          <span>Movement Audit Log ({historyList.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('catalog')}
          className={`px-4 py-2 rounded-lg transition-all flex items-center gap-2 ${
            activeTab === 'catalog'
              ? 'bg-slate-800 text-cyan-400 shadow-sm border border-slate-700'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Tag className="w-4 h-4" />
          <span>Parts Master Catalog ({partsCatalog.length})</span>
        </button>
      </div>

      {/* 1. FACILITY INVENTORY TAB */}
      {activeTab === 'inventory' && (
        <div className="space-y-4">
          {/* Filter Bar */}
          <div className="bg-slate-900 border border-slate-800 p-3.5 rounded-xl flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex flex-wrap items-center gap-3">
              {/* Facility Selector */}
              <div className="flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-slate-400" />
                <select
                  value={selectedFacilityId}
                  onChange={(e) => setSelectedFacilityId(e.target.value)}
                  className="bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-slate-200 font-medium"
                >
                  <option value="ALL">All Facilities</option>
                  {facilities.map(f => (
                    <option key={f.id} value={f.id}>{f.name}</option>
                  ))}
                </select>
              </div>

              {/* Category Filter */}
              <div className="flex items-center gap-1.5">
                <Tag className="w-3.5 h-3.5 text-slate-400" />
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-slate-200 font-medium"
                >
                  <option value="ALL">All Categories</option>
                  {categories.map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              {/* Low Stock Toggle */}
              <label className="flex items-center gap-2 cursor-pointer bg-slate-950 px-3 py-1.5 rounded-lg border border-slate-800">
                <input
                  type="checkbox"
                  checked={lowStockOnly}
                  onChange={(e) => setLowStockOnly(e.target.checked)}
                  className="w-3.5 h-3.5 rounded text-cyan-500 focus:ring-cyan-500 bg-slate-900 border-slate-700"
                />
                <span className={`text-xs ${lowStockOnly ? 'text-amber-400 font-bold' : 'text-slate-400'}`}>
                  Low Stock Alert Only
                </span>
              </label>
            </div>

            {/* Search Input */}
            <div className="relative min-w-[220px]">
              <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search part name, SKU, bin..."
                className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-100 focus:outline-none focus:border-cyan-500"
              />
            </div>
          </div>

          {/* Inventory Table */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800">
                <tr>
                  <th className="py-3 px-4">Part # / SKU</th>
                  <th className="py-3 px-4">Part Name</th>
                  <th className="py-3 px-4">Facility</th>
                  <th className="py-3 px-4">Bin Location</th>
                  <th className="py-3 px-4">Stock on Hand</th>
                  <th className="py-3 px-4">Reorder / Min</th>
                  <th className="py-3 px-4">Stock Health</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {inventoryList.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-slate-500">
                      No inventory records found matching criteria.
                    </td>
                  </tr>
                ) : (
                  inventoryList.map(item => {
                    const isLow = item.stockOnHand <= item.reorderLevel;
                    const isCritical = item.stockOnHand <= item.minStock;

                    return (
                      <tr key={item.id} className="hover:bg-slate-800/40 transition-all">
                        <td className="py-3 px-4 font-mono font-bold text-cyan-400">
                          {item.partNumber}
                        </td>
                        <td className="py-3 px-4">
                          <div className="font-semibold text-slate-200">{item.partName}</div>
                          <div className="text-[10px] text-slate-400">{item.category}</div>
                        </td>
                        <td className="py-3 px-4 text-slate-300">
                          {item.facilityName}
                        </td>
                        <td className="py-3 px-4 font-mono text-slate-400">
                          {item.binLocation || 'A-01'}
                        </td>
                        <td className="py-3 px-4">
                          <span className={`text-sm font-bold font-mono ${
                            isCritical ? 'text-rose-400' : isLow ? 'text-amber-400' : 'text-slate-100'
                          }`}>
                            {item.stockOnHand}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-slate-400 font-mono text-[11px]">
                          {item.reorderLevel} / {item.minStock}
                        </td>
                        <td className="py-3 px-4">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase inline-flex items-center gap-1 ${
                            isCritical ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30' :
                            isLow ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' :
                            'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                          }`}>
                            {isCritical ? <AlertTriangle className="w-3 h-3" /> : isLow ? <AlertTriangle className="w-3 h-3" /> : <CheckCircle2 className="w-3 h-3" />}
                            {isCritical ? 'CRITICAL' : isLow ? 'LOW STOCK' : 'OPTIMAL'}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {canManageInventory && (
                              <>
                                <button
                                  onClick={() => handleOpenRestock(item)}
                                  className="px-2 py-1 bg-emerald-600/80 hover:bg-emerald-600 text-white rounded font-semibold text-[11px] inline-flex items-center gap-1"
                                >
                                  <PackagePlus className="w-3 h-3" /> Restock
                                </button>
                                <button
                                  onClick={() => handleOpenAdjust(item)}
                                  className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded font-semibold text-[11px]"
                                >
                                  Adjust
                                </button>
                              </>
                            )}
                          </div>
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

      {/* 2. MOVEMENT AUDIT LOG TAB */}
      {activeTab === 'history' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between bg-slate-900 border border-slate-800 p-3 rounded-xl text-xs">
            <div className="flex items-center gap-3">
              <span className="text-slate-400 font-semibold">Filter Movement Type:</span>
              <select
                value={historyChangeType}
                onChange={(e) => setHistoryChangeType(e.target.value)}
                className="bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1 text-slate-200 font-medium"
              >
                <option value="ALL">All Transactions</option>
                <option value="RESTOCK">Restock (Delivery)</option>
                <option value="CONSUMPTION">Work Order Consumption</option>
                <option value="ADJUSTMENT">Manual Adjustment</option>
                <option value="RESTORATION">Work Order Restoration</option>
              </select>
            </div>
            <div className="text-slate-400">
              Showing <span className="text-white font-bold">{historyList.length}</span> audited inventory movements
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800">
                <tr>
                  <th className="py-3 px-4">Timestamp</th>
                  <th className="py-3 px-4">Facility</th>
                  <th className="py-3 px-4">Part / SKU</th>
                  <th className="py-3 px-4">Movement Type</th>
                  <th className="py-3 px-4">Quantity Delta</th>
                  <th className="py-3 px-4">Stock Transition</th>
                  <th className="py-3 px-4">Performed By</th>
                  <th className="py-3 px-4">Reason / Reference</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {historyList.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-slate-500">
                      No inventory transaction history found.
                    </td>
                  </tr>
                ) : (
                  historyList.map(h => (
                    <tr key={h.id} className="hover:bg-slate-800/40 transition-all">
                      <td className="py-3 px-4 text-slate-400 font-mono text-[11px]">
                        {new Date(h.timestamp).toLocaleString()}
                      </td>
                      <td className="py-3 px-4 text-slate-300">
                        {h.facilityName}
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-200">{h.partName}</div>
                        <div className="text-[10px] text-cyan-400 font-mono">{h.partNumber}</div>
                      </td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                          h.changeType === 'RESTOCK' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' :
                          h.changeType === 'CONSUMPTION' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' :
                          h.changeType === 'ADJUSTMENT' ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30' :
                          'bg-purple-500/20 text-purple-400 border border-purple-500/30'
                        }`}>
                          {h.changeType}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-mono font-bold">
                        <span className={h.quantityChanged > 0 ? 'text-emerald-400' : 'text-rose-400'}>
                          {h.quantityChanged > 0 ? `+${h.quantityChanged}` : h.quantityChanged}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-mono text-slate-400 text-[11px]">
                        {h.previousStock} &rarr; <span className="text-white font-bold">{h.newStock}</span>
                      </td>
                      <td className="py-3 px-4 text-slate-300">
                        <div>{h.performedBy}</div>
                        <div className="text-[10px] text-slate-500">{h.performedByRole}</div>
                      </td>
                      <td className="py-3 px-4 text-slate-300 max-w-[200px] truncate" title={h.reason}>
                        <div className="font-mono text-cyan-400 text-[11px]">{h.referenceId || 'N/A'}</div>
                        <div className="text-[10px] text-slate-400 truncate">{h.reason}</div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 3. PARTS MASTER CATALOG TAB */}
      {activeTab === 'catalog' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {partsCatalog.map(part => (
              <div 
                key={part.id}
                className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col justify-between space-y-3 hover:border-slate-700 transition-all"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <h4 className="text-sm font-bold text-white leading-snug">{part.name}</h4>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 font-mono">
                      {part.partNumber}
                    </span>
                  </div>

                  <p className="text-xs text-slate-400 mt-1 line-clamp-2">
                    {part.description || 'Standard replacement component for facilities maintenance.'}
                  </p>

                  <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                    <div className="bg-slate-950 p-2 rounded-lg border border-slate-800/80">
                      <div className="text-[10px] text-slate-500 font-bold uppercase">Unit Cost (COGS)</div>
                      <div className="text-sm font-bold text-slate-300 font-mono">
                        ${part.unitCost.toFixed(2)}
                      </div>
                    </div>

                    <div className="bg-slate-950 p-2 rounded-lg border border-slate-800/80">
                      <div className="text-[10px] text-slate-500 font-bold uppercase">Customer Price</div>
                      <div className="text-sm font-bold text-emerald-400 font-mono">
                        ${part.unitPrice.toFixed(2)}
                      </div>
                    </div>
                  </div>

                  <div className="mt-3 text-[11px] text-slate-400 space-y-1">
                    <div>
                      <span className="text-slate-500">Category:</span>{' '}
                      <span className="text-slate-300">{part.category}</span>
                    </div>
                    <div>
                      <span className="text-slate-500">Supplier:</span>{' '}
                      <span className="text-slate-300">{part.supplier}</span>
                    </div>
                    <div>
                      <span className="text-slate-500">Default Reorder / Min:</span>{' '}
                      <span className="text-slate-300">{part.reorderLevel} / {part.minStock}</span>
                    </div>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
                  <span>Stock across facilities:</span>
                  <span className="font-mono font-bold text-white">
                    {inventoryList.filter(i => i.partId === part.id).reduce((sum, curr) => sum + curr.stockOnHand, 0)} units
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* RESTOCK MODAL */}
      {showRestockModal && restockItem && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <PackagePlus className="w-4 h-4 text-emerald-400" />
                Restock Facility Inventory
              </h3>
              <button
                onClick={() => setShowRestockModal(false)}
                className="text-slate-400 hover:text-white text-xs"
              >
                ✕
              </button>
            </div>

            {restockError && (
              <div className="p-3 bg-rose-950/40 border border-rose-800 text-rose-300 text-xs rounded-lg flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                <span>{restockError}</span>
              </div>
            )}

            <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 text-xs space-y-1">
              <div className="font-bold text-white">{restockItem.partName} ({restockItem.partNumber})</div>
              <div className="text-slate-400">Facility: <span className="text-cyan-400">{restockItem.facilityName}</span></div>
              <div className="text-slate-400">Current Stock: <span className="font-mono font-bold text-white">{restockItem.stockOnHand}</span></div>
            </div>

            <form onSubmit={handleRestockSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Quantity to Receive</label>
                <input
                  type="number"
                  min={1}
                  required
                  value={restockQuantity}
                  onChange={(e) => setRestockQuantity(Number(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-cyan-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">PO / Supplier Reference</label>
                <input
                  type="text"
                  required
                  value={restockSupplierRef}
                  onChange={(e) => setRestockSupplierRef(e.target.value)}
                  placeholder="e.g. PO-2026-9081"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Receipt Notes / Reason</label>
                <textarea
                  rows={2}
                  value={restockReason}
                  onChange={(e) => setRestockReason(e.target.value)}
                  placeholder="Shipment condition verified, replenishment to standard level..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowRestockModal(false)}
                  className="px-3 py-1.5 text-xs text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingRestock}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow"
                >
                  {isSubmittingRestock ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <PackagePlus className="w-3.5 h-3.5" />}
                  Confirm Stock Receipt
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ADJUST MODAL */}
      {showAdjustModal && adjustItem && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Wrench className="w-4 h-4 text-cyan-400" />
                Manual Stock Adjustment (Audited)
              </h3>
              <button
                onClick={() => setShowAdjustModal(false)}
                className="text-slate-400 hover:text-white text-xs"
              >
                ✕
              </button>
            </div>

            {adjustError && (
              <div className="p-3 bg-rose-950/40 border border-rose-800 text-rose-300 text-xs rounded-lg flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                <span>{adjustError}</span>
              </div>
            )}

            <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 text-xs space-y-1">
              <div className="font-bold text-white">{adjustItem.partName} ({adjustItem.partNumber})</div>
              <div className="text-slate-400">Facility: <span className="text-cyan-400">{adjustItem.facilityName}</span></div>
              <div className="text-slate-400">Current Stock: <span className="font-mono font-bold text-white">{adjustItem.stockOnHand}</span></div>
              <div className="text-slate-400">
                New Stock After Adjustment:{' '}
                <span className={`font-mono font-bold ${
                  adjustItem.stockOnHand + adjustDelta < 0 ? 'text-rose-400' : 'text-emerald-400'
                }`}>
                  {adjustItem.stockOnHand + adjustDelta}
                </span>
              </div>
            </div>

            <form onSubmit={handleAdjustSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Quantity Delta (Positive to add, Negative to deduct)
                </label>
                <input
                  type="number"
                  required
                  value={adjustDelta}
                  onChange={(e) => setAdjustDelta(Number(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-cyan-500 font-mono"
                />
                <span className="text-[10px] text-slate-500 mt-0.5 block">
                  Example: -2 (damaged/scrapped), +5 (cycle count recount)
                </span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Audited Reason</label>
                <textarea
                  rows={2}
                  required
                  value={adjustReason}
                  onChange={(e) => setAdjustReason(e.target.value)}
                  placeholder="e.g. Physical cycle count variance, found damaged unit in bin..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAdjustModal(false)}
                  className="px-3 py-1.5 text-xs text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingAdjust || (adjustItem.stockOnHand + adjustDelta < 0)}
                  className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow disabled:opacity-50"
                >
                  {isSubmittingAdjust ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                  Apply Stock Adjustment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CREATE CATALOG PART MODAL */}
      {showCreatePartModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Tag className="w-4 h-4 text-cyan-400" />
                Add Part to Master Catalog
              </h3>
              <button
                onClick={() => setShowCreatePartModal(false)}
                className="text-slate-400 hover:text-white text-xs"
              >
                ✕
              </button>
            </div>

            {partModalError && (
              <div className="p-3 bg-rose-950/40 border border-rose-800 text-rose-300 text-xs rounded-lg flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                <span>{partModalError}</span>
              </div>
            )}

            <form onSubmit={handleCreatePartSubmit} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Part # (SKU)</label>
                  <input
                    type="text"
                    required
                    value={newPartNumber}
                    onChange={(e) => setNewPartNumber(e.target.value)}
                    placeholder="e.g. MOT-8890"
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-cyan-500 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Category</label>
                  <select
                    value={newPartCategory}
                    onChange={(e) => setNewPartCategory(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-cyan-500"
                  >
                    <option value="ELECTRICAL">ELECTRICAL</option>
                    <option value="HVAC">HVAC</option>
                    <option value="PLUMBING">PLUMBING</option>
                    <option value="MECHANICAL">MECHANICAL</option>
                    <option value="SAFETY">SAFETY</option>
                    <option value="CONSUMABLE">CONSUMABLE</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Part Description / Name</label>
                <input
                  type="text"
                  required
                  value={newPartName}
                  onChange={(e) => setNewPartName(e.target.value)}
                  placeholder="e.g. 3-Phase Contactor Relay 24V"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Unit Cost ($ COGS)</label>
                  <input
                    type="number"
                    min={0}
                    step="0.01"
                    required
                    value={newPartUnitCost}
                    onChange={(e) => setNewPartUnitCost(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-cyan-500 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Unit Price ($ Billable)</label>
                  <input
                    type="number"
                    min={0}
                    step="0.01"
                    required
                    value={newPartUnitPrice}
                    onChange={(e) => setNewPartUnitPrice(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-cyan-500 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Primary Supplier</label>
                  <input
                    type="text"
                    required
                    value={newPartSupplier}
                    onChange={(e) => setNewPartSupplier(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-cyan-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Reorder / Min Stock</label>
                  <div className="grid grid-cols-2 gap-1">
                    <input
                      type="number"
                      min={1}
                      value={newPartReorderLevel}
                      onChange={(e) => setNewPartReorderLevel(Number(e.target.value))}
                      placeholder="Reorder"
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2 py-2 text-xs text-slate-100 focus:outline-none font-mono"
                    />
                    <input
                      type="number"
                      min={0}
                      value={newPartMinStock}
                      onChange={(e) => setNewPartMinStock(Number(e.target.value))}
                      placeholder="Min"
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2 py-2 text-xs text-slate-100 focus:outline-none font-mono"
                    />
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreatePartModal(false)}
                  className="px-3 py-1.5 text-xs text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingPart}
                  className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow"
                >
                  {isSubmittingPart ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                  Add Part to Catalog
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
