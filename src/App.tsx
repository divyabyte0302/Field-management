import React, { useState, useEffect, useCallback } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { LoginPage } from './components/LoginPage';
import { Navbar } from './components/Navbar';
import { DashboardView } from './components/DashboardView';
import { WorkOrdersView } from './components/WorkOrdersView';
import { DispatchBoardView } from './components/DispatchBoardView';
import { ServiceRequestsView } from './components/ServiceRequestsView';
import { TechnicianPortal } from './components/TechnicianPortal';
import { CustomerPortal } from './components/CustomerPortal';
import { UserManagementView } from './components/UserManagementView';
import { SecurityArchitectureView } from './components/SecurityArchitectureView';
import { SlaDashboardView } from './components/SlaDashboardView';
import { InventoryManagementView } from './components/InventoryManagementView';
import { TimeTrackingView } from './components/TimeTrackingView';
import { FacilitiesAssetsView } from './components/FacilitiesAssetsView';
import { TechniciansDirectoryView } from './components/TechniciansDirectoryView';
import { CustomersDirectoryView } from './components/CustomersDirectoryView';
import { ReportsAnalyticsView } from './components/ReportsAnalyticsView';
import { NotificationsCenterView } from './components/NotificationsCenterView';
import { UserProfileView } from './components/UserProfileView';
import { RoleGuard } from './components/RoleGuard';
import { api } from './services/api';
import { 
  WorkOrder, WorkOrderStatus, DashboardStats, 
  Facility, Technician, Part, RoleName, 
  ServiceRequest, Asset 
} from './types';
import { PlusCircle, RefreshCw, X } from 'lucide-react';

const MainApplication: React.FC = () => {
  const { user, isAuthenticated, isLoading, activeRole } = useAuth();

  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([]);
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [technicians, setTechnicians] = useState<Technician[]>([]);
  const [parts, setParts] = useState<Part[]>([]);
  const [serviceRequests, setServiceRequests] = useState<ServiceRequest[]>([]);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<WorkOrder | null>(null);
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string>('ALL');
  const [dataLoading, setDataLoading] = useState<boolean>(true);

  // Deep linking entities
  const [selectedFacilityId, setSelectedFacilityId] = useState<string | null>(null);
  const [selectedAssetId, setSelectedAssetId] = useState<string | null>(null);
  const [selectedTechnicianId, setSelectedTechnicianId] = useState<string | null>(null);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const [selectedServiceRequestId, setSelectedServiceRequestId] = useState<string | null>(null);
  
  // Modals
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);

  // New Work Order Form State
  const [newTitle, setNewTitle] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newFacilityId, setNewFacilityId] = useState('');
  const [newPriority, setNewPriority] = useState('MEDIUM');
  const [newCategory, setNewCategory] = useState('CORRECTIVE_MAINTENANCE');
  const [newTechId, setNewTechId] = useState('');
  const [isSubmittingOrder, setIsSubmittingOrder] = useState(false);

  // URL Route Synchronization
  const syncPathToTab = useCallback(() => {
    const path = window.location.pathname;
    if (path === '/' || path === '/dashboard') {
      setActiveTab('dashboard');
    } else if (path.startsWith('/work-orders') || path.startsWith('/wo')) {
      setActiveTab('work-orders');
      const parts = path.split('/');
      if (parts[2]) {
        const wo = workOrders.find(o => o.id === parts[2] || o.workOrderNumber === parts[2]);
        if (wo) setSelectedOrder(wo);
      }
    } else if (path.startsWith('/dispatch')) {
      setActiveTab('dispatch-board');
    } else if (path.startsWith('/sla')) {
      setActiveTab('sla-dashboard');
    } else if (path.startsWith('/inventory') || path.startsWith('/parts')) {
      setActiveTab('inventory');
    } else if (path.startsWith('/time-tracking')) {
      setActiveTab('time-tracking');
    } else if (path.startsWith('/facilities')) {
      setActiveTab('facilities');
      const parts = path.split('/');
      if (parts[2]) setSelectedFacilityId(parts[2]);
    } else if (path.startsWith('/assets')) {
      setActiveTab('facilities');
      const parts = path.split('/');
      if (parts[2]) setSelectedAssetId(parts[2]);
    } else if (path.startsWith('/technicians')) {
      setActiveTab('technicians');
      const parts = path.split('/');
      if (parts[2]) setSelectedTechnicianId(parts[2]);
    } else if (path.startsWith('/customers')) {
      setActiveTab('customers');
      const parts = path.split('/');
      if (parts[2]) setSelectedCustomerId(parts[2]);
    } else if (path.startsWith('/service-requests')) {
      setActiveTab('service-requests');
      const parts = path.split('/');
      if (parts[2]) setSelectedServiceRequestId(parts[2]);
    } else if (path.startsWith('/technician-portal')) {
      setActiveTab('technician-portal');
    } else if (path.startsWith('/customer-portal')) {
      setActiveTab('customer-portal');
    } else if (path.startsWith('/reports')) {
      setActiveTab('reports');
    } else if (path.startsWith('/notifications')) {
      setActiveTab('notifications');
    } else if (path.startsWith('/profile')) {
      setActiveTab('profile');
    } else if (path.startsWith('/users')) {
      setActiveTab('users');
    } else if (path.startsWith('/architecture') || path.startsWith('/security')) {
      setActiveTab('architecture');
    } else if (path === '/login') {
      setShowLoginModal(true);
    }
  }, [workOrders]);

  useEffect(() => {
    syncPathToTab();
    window.addEventListener('popstate', syncPathToTab);
    return () => window.removeEventListener('popstate', syncPathToTab);
  }, [syncPathToTab]);

  const handleTabChange = (tab: string, entityId?: string) => {
    setActiveTab(tab);
    let targetPath = `/${tab}`;
    if (tab === 'work-orders') {
      targetPath = entityId ? `/work-orders/${entityId}` : '/work-orders';
    } else if (tab === 'facilities') {
      targetPath = entityId ? `/facilities/${entityId}` : '/facilities';
      if (entityId) setSelectedFacilityId(entityId);
    } else if (tab === 'technicians') {
      targetPath = entityId ? `/technicians/${entityId}` : '/technicians';
      if (entityId) setSelectedTechnicianId(entityId);
    } else if (tab === 'customers') {
      targetPath = entityId ? `/customers/${entityId}` : '/customers';
      if (entityId) setSelectedCustomerId(entityId);
    } else if (tab === 'dispatch-board') {
      targetPath = '/dispatch';
    } else if (tab === 'sla-dashboard') {
      targetPath = '/sla';
    } else if (tab === 'service-requests') {
      targetPath = entityId ? `/service-requests/${entityId}` : '/service-requests';
      if (entityId) setSelectedServiceRequestId(entityId);
    }

    if (window.location.pathname !== targetPath) {
      window.history.pushState(null, '', targetPath);
    }
  };

  // Auto-switch default tab based on logged-in role if on root
  useEffect(() => {
    if (window.location.pathname === '/' || window.location.pathname === '') {
      if (activeRole === 'TECHNICIAN') {
        handleTabChange('technician-portal');
      } else if (activeRole === 'CUSTOMER') {
        handleTabChange('customer-portal');
      }
    }
  }, [activeRole]);

  const loadData = async () => {
    if (!isAuthenticated) return;
    setDataLoading(true);
    try {
      const [statsData, ordersData, facsData, techsData, partsData, requestsData, assetsData] = await Promise.all([
        api.getDashboardStats().catch(() => null),
        api.getWorkOrders().catch(() => []),
        api.getFacilities().catch(() => []),
        api.getTechnicians().catch(() => []),
        api.getParts().catch(() => []),
        api.getServiceRequests().catch(() => []),
        api.getAssets().catch(() => []),
      ]);

      if (statsData) setStats(statsData);
      setWorkOrders(ordersData);
      setFacilities(facsData);
      setTechnicians(techsData);
      setParts(partsData);
      setServiceRequests(requestsData);
      setAssets(assetsData);

      if (facsData.length > 0 && !newFacilityId) {
        setNewFacilityId(facsData[0].id);
      }

      if (selectedOrder) {
        const updated = ordersData.find((o: WorkOrder) => o.id === selectedOrder.id);
        if (updated) setSelectedOrder(updated);
      }
    } catch (err) {
      console.error('Error fetching application data:', err);
    } finally {
      setDataLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      loadData();
    }
  }, [isAuthenticated, activeRole]);

  const handleTransition = async (orderId: string, targetStatus: WorkOrderStatus, notes?: string, extra?: any) => {
    try {
      const updated = await api.transitionWorkOrder(orderId, {
        targetStatus,
        notes,
        holdReason: extra?.holdReason,
        rejectionReason: extra?.rejectionReason,
      });
      setSelectedOrder(updated);
      await loadData();
    } catch (err: any) {
      alert(`Transition failed: ${err.message}`);
    }
  };

  const handleAssignTechnician = async (orderId: string, technicianId: string, notes?: string) => {
    try {
      const updated = await api.assignWorkOrder(orderId, technicianId, notes);
      setSelectedOrder(updated);
      await loadData();
    } catch (err: any) {
      alert(`Assignment failed: ${err.message}`);
    }
  };

  const handleLogTime = async (orderId: string, minutes: number, entryType: any, notes: string) => {
    try {
      await api.logTimeEntry(orderId, {
        durationMinutes: minutes,
        entryType,
        notes,
      });
      await loadData();
    } catch (err: any) {
      alert(`Time logging failed: ${err.message}`);
    }
  };

  const handleAllocatePart = async (orderId: string, partId: string, quantity: number) => {
    try {
      await api.allocatePart(orderId, {
        partId,
        quantity,
      });
      await loadData();
    } catch (err: any) {
      alert(`Part allocation failed: ${err.message}`);
    }
  };

  const handleCreateOrderSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle || !newDescription || !newFacilityId) return;

    setIsSubmittingOrder(true);
    try {
      await api.createWorkOrder({
        facilityId: newFacilityId,
        title: newTitle,
        description: newDescription,
        priority: newPriority,
        category: newCategory,
        assignedTechnicianId: newTechId || undefined,
      });

      setNewTitle('');
      setNewDescription('');
      setNewTechId('');
      setIsCreateModalOpen(false);
      await loadData();
      setActiveTab('work-orders');
    } catch (err: any) {
      alert(`Order creation failed: ${err.message}`);
    } finally {
      setIsSubmittingOrder(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-slate-400">
        <RefreshCw className="w-8 h-8 animate-spin text-cyan-500 mb-3" />
        <span className="text-xs font-mono tracking-wider uppercase text-slate-300">
          Initializing KEYSTONE Security Layer...
        </span>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <LoginPage />;
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      <Navbar
        activeTab={activeTab}
        setActiveTab={handleTabChange}
        onOpenCreateModal={() => setIsCreateModalOpen(true)}
        onOpenLoginModal={() => setShowLoginModal(true)}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {activeTab === 'dashboard' && (
          <RoleGuard allowedRoles={['SUPER_ADMIN', 'ADMIN', 'DISPATCHER']}>
            <DashboardView
              stats={stats}
              workOrders={workOrders}
              onSelectStage={(stage) => {
                setSelectedStatusFilter(stage);
                setActiveTab('work-orders');
              }}
              onSelectWorkOrder={(order) => {
                setSelectedOrder(order);
                setActiveTab('work-orders');
              }}
              onNavigateToTab={(tab) => setActiveTab(tab)}
            />
          </RoleGuard>
        )}

        {activeTab === 'work-orders' && (
          <RoleGuard allowedRoles={['SUPER_ADMIN', 'ADMIN', 'DISPATCHER', 'TECHNICIAN']}>
            <WorkOrdersView
              workOrders={workOrders}
              facilities={facilities}
              technicians={technicians}
              parts={parts}
              selectedStatusFilter={selectedStatusFilter}
              setSelectedStatusFilter={setSelectedStatusFilter}
              selectedOrder={selectedOrder}
              setSelectedOrder={setSelectedOrder}
              onTransition={handleTransition}
              onAssignTechnician={handleAssignTechnician}
              onLogTime={handleLogTime}
              onAllocatePart={handleAllocatePart}
              onOpenCreateModal={() => setIsCreateModalOpen(true)}
              onRefreshData={loadData}
              currentRole={activeRole || 'DISPATCHER'}
            />
          </RoleGuard>
        )}

        {activeTab === 'dispatch-board' && (
          <RoleGuard allowedRoles={['SUPER_ADMIN', 'ADMIN', 'DISPATCHER']}>
            <DispatchBoardView
              workOrders={workOrders}
              technicians={technicians}
              facilities={facilities}
              serviceRequests={serviceRequests}
              onAssignTechnician={handleAssignTechnician}
              onRefreshData={loadData}
              currentRole={activeRole || 'DISPATCHER'}
              onConvertServiceRequest={async (id) => {
                await api.convertServiceRequestToWorkOrder(id);
                await loadData();
              }}
            />
          </RoleGuard>
        )}

        {activeTab === 'sla-dashboard' && (
          <RoleGuard allowedRoles={['SUPER_ADMIN', 'ADMIN', 'DISPATCHER']}>
            <SlaDashboardView
              facilities={facilities}
              onSelectWorkOrder={(order) => {
                setSelectedOrder(order);
                setActiveTab('work-orders');
              }}
            />
          </RoleGuard>
        )}

        {activeTab === 'inventory' && (
          <RoleGuard allowedRoles={['SUPER_ADMIN', 'ADMIN', 'DISPATCHER', 'TECHNICIAN']}>
            <InventoryManagementView
              facilities={facilities}
              currentRole={activeRole || 'DISPATCHER'}
            />
          </RoleGuard>
        )}

        {activeTab === 'time-tracking' && (
          <RoleGuard allowedRoles={['SUPER_ADMIN', 'ADMIN', 'DISPATCHER', 'TECHNICIAN']}>
            <TimeTrackingView
              technicians={technicians}
              workOrders={workOrders}
              currentRole={activeRole || 'DISPATCHER'}
              onSelectWorkOrder={(order) => {
                setSelectedOrder(order);
                setActiveTab('work-orders');
              }}
            />
          </RoleGuard>
        )}

        {activeTab === 'service-requests' && (
          <ServiceRequestsView
            serviceRequests={serviceRequests}
            facilities={facilities}
            assets={assets}
            technicians={technicians}
            onRefreshData={loadData}
            onNavigateToWorkOrder={(orderId) => {
              const target = workOrders.find(w => w.id === orderId);
              if (target) setSelectedOrder(target);
              setActiveTab('work-orders');
            }}
            currentRole={activeRole || 'DISPATCHER'}
          />
        )}

        {activeTab === 'technician-portal' && (
          <RoleGuard allowedRoles={['SUPER_ADMIN', 'ADMIN', 'TECHNICIAN']}>
            <TechnicianPortal />
          </RoleGuard>
        )}

        {activeTab === 'facilities' && (
          <RoleGuard allowedRoles={['SUPER_ADMIN', 'ADMIN', 'DISPATCHER']}>
            <FacilitiesAssetsView
              selectedFacilityId={selectedFacilityId}
              selectedAssetId={selectedAssetId}
              onSelectWorkOrder={(orderId) => {
                const target = workOrders.find(w => w.id === orderId);
                if (target) setSelectedOrder(target);
                handleTabChange('work-orders', orderId);
              }}
              onRefreshData={loadData}
              currentRole={activeRole || 'DISPATCHER'}
            />
          </RoleGuard>
        )}

        {activeTab === 'technicians' && (
          <RoleGuard allowedRoles={['SUPER_ADMIN', 'ADMIN', 'DISPATCHER']}>
            <TechniciansDirectoryView
              selectedTechnicianId={selectedTechnicianId}
              onSelectWorkOrder={(orderId) => {
                const target = workOrders.find(w => w.id === orderId);
                if (target) setSelectedOrder(target);
                handleTabChange('work-orders', orderId);
              }}
              onRefreshData={loadData}
              currentRole={activeRole || 'DISPATCHER'}
            />
          </RoleGuard>
        )}

        {activeTab === 'customers' && (
          <RoleGuard allowedRoles={['SUPER_ADMIN', 'ADMIN', 'DISPATCHER']}>
            <CustomersDirectoryView
              selectedCustomerId={selectedCustomerId}
              onSelectWorkOrder={(orderId) => {
                const target = workOrders.find(w => w.id === orderId);
                if (target) setSelectedOrder(target);
                handleTabChange('work-orders', orderId);
              }}
              onRefreshData={loadData}
              currentRole={activeRole || 'DISPATCHER'}
            />
          </RoleGuard>
        )}

        {activeTab === 'reports' && (
          <RoleGuard allowedRoles={['SUPER_ADMIN', 'ADMIN', 'DISPATCHER']}>
            <ReportsAnalyticsView currentRole={activeRole || 'DISPATCHER'} />
          </RoleGuard>
        )}

        {activeTab === 'notifications' && (
          <NotificationsCenterView
            onNavigateToTab={(tab, entityId) => handleTabChange(tab, entityId)}
            currentRole={activeRole || 'DISPATCHER'}
          />
        )}

        {activeTab === 'profile' && (
          <UserProfileView />
        )}

        {activeTab === 'customer-portal' && (
          <RoleGuard allowedRoles={['SUPER_ADMIN', 'ADMIN', 'CUSTOMER']}>
            <CustomerPortal />
          </RoleGuard>
        )}

        {activeTab === 'users' && (
          <RoleGuard allowedRoles={['SUPER_ADMIN', 'ADMIN']}>
            <UserManagementView />
          </RoleGuard>
        )}

        {activeTab === 'architecture' && (
          <SecurityArchitectureView />
        )}
      </main>

      {/* Switch Account / Auth Modal */}
      {showLoginModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="relative w-full max-w-xl">
            <button
              onClick={() => setShowLoginModal(false)}
              className="absolute -top-10 right-0 text-slate-400 hover:text-white text-xs font-semibold px-2 py-1"
            >
              ✕ Close
            </button>
            <LoginPage />
          </div>
        </div>
      )}

      {/* Create Work Order Modal */}
      {isCreateModalOpen && (
        <div id="create-work-order-modal" className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <PlusCircle className="w-4 h-4 text-cyan-400" />
                Originate New Work Order
              </h3>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="text-slate-400 hover:text-white text-xs"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateOrderSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Target Facility</label>
                <select
                  id="select-wo-facility"
                  value={newFacilityId}
                  onChange={(e) => setNewFacilityId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-cyan-500"
                >
                  {facilities.map(f => (
                    <option key={f.id} value={f.id}>{f.name} ({f.code})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Title / Issue Summary</label>
                <input
                  id="input-wo-title"
                  type="text"
                  required
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="e.g. Critical Chiller 1 Water Pressure Fault"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Work Description</label>
                <textarea
                  id="input-wo-description"
                  required
                  rows={3}
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  placeholder="Provide detailed diagnostic info and safety requirements..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Priority</label>
                  <select
                    id="select-wo-priority"
                    value={newPriority}
                    onChange={(e) => setNewPriority(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-cyan-500"
                  >
                    <option value="CRITICAL">CRITICAL (1h SLA)</option>
                    <option value="HIGH">HIGH (4h SLA)</option>
                    <option value="MEDIUM">MEDIUM (24h SLA)</option>
                    <option value="LOW">LOW (72h SLA)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Initial Technician</label>
                  <select
                    id="select-wo-tech"
                    value={newTechId}
                    onChange={(e) => setNewTechId(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-cyan-500"
                  >
                    <option value="">Unassigned (Status: NEW)</option>
                    {technicians.map(t => (
                      <option key={t.id} value={t.id}>{t.name} ({t.status})</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-3 py-1.5 text-xs text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  id="btn-submit-create-wo"
                  type="submit"
                  disabled={isSubmittingOrder}
                  className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow"
                >
                  {isSubmittingOrder ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <PlusCircle className="w-3.5 h-3.5" />}
                  Create & Issue Order
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <MainApplication />
    </AuthProvider>
  );
}
