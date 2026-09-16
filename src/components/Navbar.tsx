import React, { useState, useEffect, useRef } from 'react';
import { 
  Building2, ShieldCheck, Activity, Users, 
  FileText, Layers, PlusCircle, Wrench, LogOut, 
  KeyRound, User, Lock, CheckCircle2, AlertCircle, 
  RefreshCw, ChevronDown, CheckSquare, Shield,
  ShieldAlert, Boxes, Clock, Bell, CheckCheck,
  AlertTriangle, ArrowRight, ExternalLink, Menu, X,
  BarChart3, Building, HardHat, Code2, BookOpen
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { RoleName, AppNotification } from '../types';
import { api } from '../services/api';

interface NavbarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onOpenCreateModal: () => void;
  onOpenLoginModal?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  onOpenCreateModal,
  onOpenLoginModal
}) => {
  const { user, activeRole, logout, changePassword, hasRole } = useAuth();

  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showNotificationMenu, setShowNotificationMenu] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [showOperationsMenu, setShowOperationsMenu] = useState(false);
  const [showSystemMenu, setShowSystemMenu] = useState(false);
  const operationsRef = useRef<HTMLDivElement>(null);
  const systemRef = useRef<HTMLDivElement>(null);

  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [loadingNotifs, setLoadingNotifs] = useState(false);
  const [notifFilter, setNotifFilter] = useState<'all' | 'unread'>('all');

  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null);
  const [changingPassword, setChangingPassword] = useState(false);

  // Click outside listener for dropdowns
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (operationsRef.current && !operationsRef.current.contains(event.target as Node)) {
        setShowOperationsMenu(false);
      }
      if (systemRef.current && !systemRef.current.contains(event.target as Node)) {
        setShowSystemMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Poll or fetch notifications
  const fetchNotifications = async () => {
    try {
      const [list, countRes] = await Promise.all([
        api.getNotifications().catch(() => []),
        api.getUnreadNotificationCount().catch(() => ({ count: 0 })),
      ]);
      setNotifications(list);
      setUnreadCount(countRes?.count ?? list.filter((n: any) => !n.read).length);
    } catch (e) {
      // silent catch for unauthenticated/offline states
    }
  };

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 20000);
    return () => clearInterval(interval);
  }, [activeRole]);

  const handleMarkAsRead = async (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    try {
      await api.markNotificationRead(id);
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (err) {
      console.error('Failed to mark read:', err);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await api.markAllNotificationsRead();
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
      setUnreadCount(0);
    } catch (err) {
      console.error('Failed to mark all read:', err);
    }
  };

  const handleNotificationClick = async (notif: AppNotification) => {
    if (!notif.read) {
      handleMarkAsRead(notif.id);
    }
    setShowNotificationMenu(false);

    if (notif.link) {
      setActiveTab(notif.link);
    } else if (notif.entityType === 'SERVICE_REQUEST') {
      setActiveTab('service-requests');
    } else if (notif.entityType === 'WORK_ORDER') {
      if (activeRole === 'CUSTOMER') {
        setActiveTab('customer-portal');
      } else if (activeRole === 'TECHNICIAN') {
        setActiveTab('technician-portal');
      } else {
        setActiveTab('work-orders');
      }
    } else if (notif.entityType === 'INVENTORY') {
      setActiveTab('inventory');
    } else if (notif.entityType === 'SLA') {
      setActiveTab('sla-dashboard');
    }
  };

  const getNotifIcon = (type: string) => {
    switch (type) {
      case 'NEW_SERVICE_REQUEST':
        return <FileText className="w-4 h-4 text-emerald-400" />;
      case 'WORK_ORDER_ASSIGNED':
      case 'ASSIGNMENT_CHANGED':
        return <Users className="w-4 h-4 text-cyan-400" />;
      case 'WORK_COMPLETED':
        return <CheckCircle2 className="w-4 h-4 text-teal-400" />;
      case 'CUSTOMER_VERIFIED':
        return <ShieldCheck className="w-4 h-4 text-emerald-400" />;
      case 'SLA_AT_RISK':
        return <AlertTriangle className="w-4 h-4 text-amber-400" />;
      case 'SLA_BREACHED':
        return <ShieldAlert className="w-4 h-4 text-rose-400" />;
      case 'LOW_INVENTORY':
        return <Boxes className="w-4 h-4 text-purple-400" />;
      default:
        return <Activity className="w-4 h-4 text-blue-400" />;
    }
  };

  const handleChangePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError(null);
    setPasswordSuccess(null);
    setChangingPassword(true);

    try {
      await changePassword(currentPassword, newPassword);
      setPasswordSuccess('Password successfully updated! Prior active sessions have been invalidated.');
      setCurrentPassword('');
      setNewPassword('');
      setTimeout(() => {
        setShowPasswordModal(false);
        setPasswordSuccess(null);
      }, 2000);
    } catch (err: any) {
      setPasswordError(err.message || 'Failed to update password');
    } finally {
      setChangingPassword(false);
    }
  };

  return (
    <>
      <header className="bg-slate-900 border-b border-slate-800 sticky top-0 z-30 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Brand Identity */}
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-600 to-blue-600 flex items-center justify-center text-white shadow-lg shadow-cyan-500/20">
                <Building2 className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <span className="font-bold text-base tracking-wider text-slate-100 font-mono">KEYSTONE</span>
                  <span className="px-1.5 py-0.5 text-[10px] uppercase font-semibold tracking-wider rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                    FSM ENTERPRISE
                  </span>
                </div>
                <p className="text-[11px] text-slate-400">Field Service & Facilities Management</p>
              </div>
            </div>

            {/* Navigation Tabs (Role-Aware) */}
            <nav className="hidden lg:flex items-center space-x-1">
              {/* TECHNICIAN ROLE NAVIGATION */}
              {activeRole === 'TECHNICIAN' && (
                <>
                  <button
                    id="nav-tab-technician-portal"
                    onClick={() => setActiveTab('technician-portal')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center space-x-1.5 ${
                      activeTab === 'technician-portal'
                        ? 'bg-slate-800 text-amber-400 border border-slate-700 font-bold'
                        : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
                    }`}
                  >
                    <CheckSquare className="w-3.5 h-3.5" />
                    <span>My Workbench</span>
                  </button>

                  <button
                    id="nav-tab-work-orders"
                    onClick={() => setActiveTab('work-orders')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center space-x-1.5 ${
                      activeTab === 'work-orders'
                        ? 'bg-slate-800 text-cyan-400 border border-slate-700 font-bold'
                        : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
                    }`}
                  >
                    <Wrench className="w-3.5 h-3.5" />
                    <span>Service History</span>
                  </button>

                  <button
                    id="nav-tab-profile"
                    onClick={() => setActiveTab('profile')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center space-x-1.5 ${
                      activeTab === 'profile'
                        ? 'bg-slate-800 text-cyan-400 border border-slate-700 font-bold'
                        : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
                    }`}
                  >
                    <User className="w-3.5 h-3.5" />
                    <span>Profile / Availability</span>
                  </button>
                </>
              )}

              {/* CUSTOMER ROLE NAVIGATION */}
              {activeRole === 'CUSTOMER' && (
                <>
                  <button
                    id="nav-tab-customer-portal"
                    onClick={() => setActiveTab('customer-portal')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center space-x-1.5 ${
                      activeTab === 'customer-portal'
                        ? 'bg-slate-800 text-emerald-400 border border-slate-700 font-bold'
                        : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
                    }`}
                  >
                    <FileText className="w-3.5 h-3.5" />
                    <span>My Requests</span>
                  </button>

                  <button
                    id="nav-tab-work-orders"
                    onClick={() => setActiveTab('work-orders')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center space-x-1.5 ${
                      activeTab === 'work-orders'
                        ? 'bg-slate-800 text-cyan-400 border border-slate-700 font-bold'
                        : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
                    }`}
                  >
                    <Wrench className="w-3.5 h-3.5" />
                    <span>Active Work Orders</span>
                  </button>

                  <button
                    id="nav-tab-service-history"
                    onClick={() => setActiveTab('work-orders')}
                    className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center space-x-1.5 text-slate-300 hover:text-white hover:bg-slate-800/60"
                  >
                    <History className="w-3.5 h-3.5" />
                    <span>Service History</span>
                  </button>

                  <button
                    id="nav-tab-facilities"
                    onClick={() => setActiveTab('facilities')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center space-x-1.5 ${
                      activeTab === 'facilities'
                        ? 'bg-slate-800 text-cyan-400 border border-slate-700 font-bold'
                        : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
                    }`}
                  >
                    <Building className="w-3.5 h-3.5" />
                    <span>Profile / Facilities</span>
                  </button>
                </>
              )}

              {/* DISPATCHER / ADMIN / SUPER_ADMIN NAVIGATION */}
              {['SUPER_ADMIN', 'ADMIN', 'DISPATCHER'].includes(activeRole || '') && (
                <>
                  {/* MAIN */}
                  <button
                    id="nav-tab-dashboard"
                    onClick={() => setActiveTab('dashboard')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center space-x-1.5 ${
                      activeTab === 'dashboard'
                        ? 'bg-slate-800 text-cyan-400 border border-slate-700 font-bold'
                        : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
                    }`}
                  >
                    <Activity className="w-3.5 h-3.5" />
                    <span>Dashboard</span>
                  </button>

                  <button
                    id="nav-tab-work-orders"
                    onClick={() => setActiveTab('work-orders')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center space-x-1.5 ${
                      activeTab === 'work-orders'
                        ? 'bg-slate-800 text-cyan-400 border border-slate-700 font-bold'
                        : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
                    }`}
                  >
                    <Wrench className="w-3.5 h-3.5" />
                    <span>Work Orders</span>
                  </button>

                  <button
                    id="nav-tab-dispatch-board"
                    onClick={() => setActiveTab('dispatch-board')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center space-x-1.5 ${
                      activeTab === 'dispatch-board'
                        ? 'bg-slate-800 text-cyan-400 border border-slate-700 font-bold'
                        : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
                    }`}
                  >
                    <Users className="w-3.5 h-3.5" />
                    <span>Dispatch Board</span>
                  </button>

                  <button
                    id="nav-tab-service-requests"
                    onClick={() => setActiveTab('service-requests')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center space-x-1.5 ${
                      activeTab === 'service-requests'
                        ? 'bg-slate-800 text-emerald-400 border border-slate-700 font-bold'
                        : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
                    }`}
                  >
                    <FileText className="w-3.5 h-3.5" />
                    <span>Service Requests</span>
                  </button>

                  {/* OPERATIONS DROPDOWN */}
                  <div className="relative" ref={operationsRef}>
                    <button
                      id="nav-tab-operations"
                      onClick={() => { setShowOperationsMenu(!showOperationsMenu); setShowSystemMenu(false); }}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center space-x-1.5 ${
                        ['facilities', 'assets', 'inventory', 'technicians'].includes(activeTab)
                          ? 'bg-slate-800 text-cyan-400 border border-slate-700 font-bold'
                          : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
                      }`}
                    >
                      <Building className="w-3.5 h-3.5" />
                      <span>Operations</span>
                      <ChevronDown className={`w-3 h-3 transition-transform ${showOperationsMenu ? 'rotate-180 text-cyan-400' : ''}`} />
                    </button>

                    {showOperationsMenu && (
                      <div className="absolute left-0 mt-1.5 w-48 bg-slate-900 border border-slate-800 rounded-xl shadow-2xl py-1.5 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                        <div className="px-3 py-1 text-[10px] uppercase font-bold text-slate-500 tracking-wider">
                          Operations
                        </div>
                        <button
                          onClick={() => { setActiveTab('facilities'); setShowOperationsMenu(false); }}
                          className={`w-full px-3 py-2 text-left text-xs flex items-center gap-2 transition ${
                            activeTab === 'facilities' ? 'text-cyan-400 bg-slate-800/60 font-semibold' : 'text-slate-300 hover:text-white hover:bg-slate-800/40'
                          }`}
                        >
                          <Building className="w-3.5 h-3.5 text-cyan-400" />
                          <span>Facilities</span>
                        </button>
                        <button
                          onClick={() => { setActiveTab('assets'); setShowOperationsMenu(false); }}
                          className={`w-full px-3 py-2 text-left text-xs flex items-center gap-2 transition ${
                            activeTab === 'assets' ? 'text-cyan-400 bg-slate-800/60 font-semibold' : 'text-slate-300 hover:text-white hover:bg-slate-800/40'
                          }`}
                        >
                          <Layers className="w-3.5 h-3.5 text-cyan-400" />
                          <span>Assets</span>
                        </button>
                        <button
                          onClick={() => { setActiveTab('inventory'); setShowOperationsMenu(false); }}
                          className={`w-full px-3 py-2 text-left text-xs flex items-center gap-2 transition ${
                            activeTab === 'inventory' ? 'text-cyan-400 bg-slate-800/60 font-semibold' : 'text-slate-300 hover:text-white hover:bg-slate-800/40'
                          }`}
                        >
                          <Boxes className="w-3.5 h-3.5 text-cyan-400" />
                          <span>Inventory / Parts</span>
                        </button>
                        <button
                          onClick={() => { setActiveTab('technicians'); setShowOperationsMenu(false); }}
                          className={`w-full px-3 py-2 text-left text-xs flex items-center gap-2 transition ${
                            activeTab === 'technicians' ? 'text-cyan-400 bg-slate-800/60 font-semibold' : 'text-slate-300 hover:text-white hover:bg-slate-800/40'
                          }`}
                        >
                          <HardHat className="w-3.5 h-3.5 text-cyan-400" />
                          <span>Technicians</span>
                        </button>
                      </div>
                    )}
                  </div>

                  {/* SYSTEM DROPDOWN */}
                  <div className="relative" ref={systemRef}>
                    <button
                      id="nav-tab-system"
                      onClick={() => { setShowSystemMenu(!showSystemMenu); setShowOperationsMenu(false); }}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center space-x-1.5 ${
                        ['sla-dashboard', 'audit-logs', 'users'].includes(activeTab)
                          ? 'bg-slate-800 text-cyan-400 border border-slate-700 font-bold'
                          : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
                      }`}
                    >
                      <Shield className="w-3.5 h-3.5" />
                      <span>System</span>
                      <ChevronDown className={`w-3 h-3 transition-transform ${showSystemMenu ? 'rotate-180 text-cyan-400' : ''}`} />
                    </button>

                    {showSystemMenu && (
                      <div className="absolute left-0 mt-1.5 w-52 bg-slate-900 border border-slate-800 rounded-xl shadow-2xl py-1.5 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                        <div className="px-3 py-1 text-[10px] uppercase font-bold text-slate-500 tracking-wider">
                          System & Governance
                        </div>
                        <button
                          onClick={() => { setActiveTab('sla-dashboard'); setShowSystemMenu(false); }}
                          className={`w-full px-3 py-2 text-left text-xs flex items-center gap-2 transition ${
                            activeTab === 'sla-dashboard' ? 'text-cyan-400 bg-slate-800/60 font-semibold' : 'text-slate-300 hover:text-white hover:bg-slate-800/40'
                          }`}
                        >
                          <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />
                          <span>SLA Engine</span>
                        </button>
                        <button
                          onClick={() => { setActiveTab('audit-logs'); setShowSystemMenu(false); }}
                          className={`w-full px-3 py-2 text-left text-xs flex items-center gap-2 transition ${
                            activeTab === 'audit-logs' ? 'text-cyan-400 bg-slate-800/60 font-semibold' : 'text-slate-300 hover:text-white hover:bg-slate-800/40'
                          }`}
                        >
                          <History className="w-3.5 h-3.5 text-cyan-400" />
                          <span>Audit Logs</span>
                        </button>
                        {hasRole(['SUPER_ADMIN', 'ADMIN']) && (
                          <button
                            onClick={() => { setActiveTab('users'); setShowSystemMenu(false); }}
                            className={`w-full px-3 py-2 text-left text-xs flex items-center gap-2 transition ${
                              activeTab === 'users' ? 'text-cyan-400 bg-slate-800/60 font-semibold' : 'text-slate-300 hover:text-white hover:bg-slate-800/40'
                            }`}
                          >
                            <KeyRound className="w-3.5 h-3.5 text-blue-400" />
                            <span>Settings / Users</span>
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </>
              )}
            </nav>

            {/* Right Controls: User Profile Menu, Notifications & Actions */}
            <div className="flex items-center space-x-3">
              {/* Create Work Order Button (If permitted) */}
              {hasRole(['SUPER_ADMIN', 'ADMIN', 'DISPATCHER']) && (
                <button
                  id="btn-nav-create-work-order"
                  onClick={onOpenCreateModal}
                  className="hidden sm:inline-flex items-center space-x-1.5 px-3 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg text-xs font-semibold shadow-sm transition-all"
                >
                  <PlusCircle className="w-3.5 h-3.5" />
                  <span>New Work Order</span>
                </button>
              )}

              {/* Notifications Center Bell */}
              <div className="relative">
                <button
                  id="btn-notifications-bell"
                  onClick={() => {
                    setShowNotificationMenu(!showNotificationMenu);
                    if (showProfileMenu) setShowProfileMenu(false);
                  }}
                  className="relative p-2 rounded-xl hover:bg-slate-800 transition-colors border border-slate-700/60 text-slate-300 hover:text-white"
                  title="Notifications"
                >
                  <Bell className="w-4 h-4" />
                  {unreadCount > 0 && (
                    <span
                      id="badge-unread-notifications-count"
                      className="absolute -top-1 -right-1 min-w-4 h-4 px-1 rounded-full bg-rose-500 text-white text-[10px] font-bold flex items-center justify-center border-2 border-slate-900 animate-pulse"
                    >
                      {unreadCount > 99 ? '99+' : unreadCount}
                    </span>
                  )}
                </button>

                {/* Notifications Tray Popover */}
                {showNotificationMenu && (
                  <div
                    id="notifications-tray-menu"
                    className="absolute right-0 mt-2 w-80 sm:w-96 bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl z-50 overflow-hidden flex flex-col text-xs"
                    style={{ maxHeight: '85vh' }}
                  >
                    {/* Header */}
                    <div className="p-3.5 border-b border-slate-800/80 bg-slate-950/40 flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <Bell className="w-4 h-4 text-cyan-400" />
                        <span className="font-bold text-white text-sm">Notifications</span>
                        {unreadCount > 0 && (
                          <span className="px-1.5 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 text-[10px] font-mono font-bold">
                            {unreadCount} unread
                          </span>
                        )}
                      </div>
                      {unreadCount > 0 && (
                        <button
                          id="btn-mark-all-notifications-read"
                          onClick={handleMarkAllRead}
                          className="text-[11px] text-slate-400 hover:text-cyan-400 flex items-center space-x-1 font-medium transition-colors"
                        >
                          <CheckCheck className="w-3.5 h-3.5" />
                          <span>Mark all read</span>
                        </button>
                      )}
                    </div>

                    {/* Filter tabs */}
                    <div className="flex border-b border-slate-800 bg-slate-950/20 text-[11px]">
                      <button
                        onClick={() => setNotifFilter('all')}
                        className={`flex-1 py-1.5 font-medium transition-colors ${
                          notifFilter === 'all'
                            ? 'text-cyan-400 border-b-2 border-cyan-400 font-semibold'
                            : 'text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        All ({notifications.length})
                      </button>
                      <button
                        onClick={() => setNotifFilter('unread')}
                        className={`flex-1 py-1.5 font-medium transition-colors ${
                          notifFilter === 'unread'
                            ? 'text-cyan-400 border-b-2 border-cyan-400 font-semibold'
                            : 'text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        Unread ({unreadCount})
                      </button>
                    </div>

                    {/* Notification list */}
                    <div className="overflow-y-auto divide-y divide-slate-800/60 max-h-96">
                      {(notifFilter === 'unread' ? notifications.filter(n => !n.read) : notifications).length === 0 ? (
                        <div className="p-8 text-center text-slate-500">
                          <CheckCircle2 className="w-8 h-8 mx-auto mb-2 opacity-30 text-emerald-400" />
                          <p className="font-medium text-xs">All caught up!</p>
                          <p className="text-[11px] text-slate-500 mt-0.5">No {notifFilter === 'unread' ? 'unread' : ''} notifications at this time.</p>
                        </div>
                      ) : (
                        (notifFilter === 'unread' ? notifications.filter(n => !n.read) : notifications).map(notif => (
                          <div
                            key={notif.id}
                            id={`notification-item-${notif.id}`}
                            onClick={() => handleNotificationClick(notif)}
                            className={`p-3.5 transition-colors cursor-pointer flex items-start space-x-3 hover:bg-slate-800/50 ${
                              !notif.read ? 'bg-cyan-950/20' : 'bg-transparent'
                            }`}
                          >
                            <div className="mt-0.5 shrink-0 p-1.5 rounded-lg bg-slate-800 border border-slate-700/60">
                              {getNotifIcon(notif.type)}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between mb-0.5">
                                <h4 className={`text-xs truncate ${!notif.read ? 'font-bold text-white' : 'font-medium text-slate-300'}`}>
                                  {notif.title}
                                </h4>
                                <span className="text-[10px] text-slate-500 shrink-0 ml-2 font-mono">
                                  {new Date(notif.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </span>
                              </div>
                              <p className="text-[11px] text-slate-400 line-clamp-2 leading-relaxed">
                                {notif.message}
                              </p>
                              <div className="mt-2 flex items-center justify-between">
                                <span className="text-[10px] font-mono text-cyan-400 flex items-center space-x-1 group-hover:underline">
                                  <span>View record</span>
                                  <ArrowRight className="w-2.5 h-2.5" />
                                </span>
                                {!notif.read && (
                                  <button
                                    onClick={(e) => handleMarkAsRead(notif.id, e)}
                                    className="text-[10px] text-slate-400 hover:text-white"
                                  >
                                    Mark read
                                  </button>
                                )}
                              </div>
                            </div>
                            {!notif.read && (
                              <span className="w-2 h-2 rounded-full bg-cyan-400 shrink-0 mt-1.5" />
                            )}
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* User Avatar & Dropdown */}
              <div className="relative">
                <button
                  id="btn-user-profile-menu"
                  onClick={() => setShowProfileMenu(!showProfileMenu)}
                  className="flex items-center gap-2 p-1.5 rounded-xl hover:bg-slate-800 transition-colors border border-slate-700/60"
                >
                  <div className="w-7 h-7 rounded-lg bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center font-bold text-xs text-cyan-300">
                    {user?.firstName?.[0] || 'U'}
                  </div>
                  <ChevronDown className="w-3 h-3 text-slate-400" />
                </button>

                {/* Profile Popover */}
                {showProfileMenu && (
                  <div 
                    id="profile-dropdown-menu"
                    className="absolute right-0 mt-2 w-72 bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-4 space-y-3 z-50 text-xs"
                  >
                    {/* User Info */}
                    <div className="border-b border-slate-800 pb-3">
                      <div className="font-bold text-white text-sm">
                        {user?.firstName} {user?.lastName}
                      </div>
                      <div className="text-slate-400 text-[11px] truncate">
                        {user?.email}
                      </div>
                      <div className="flex items-center gap-2 mt-2">
                        <span className="px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 text-[10px] font-mono font-bold">
                          {activeRole}
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono">
                          {user?.organizationId}
                        </span>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="space-y-1">
                      <button
                        id="btn-menu-user-profile"
                        onClick={() => {
                          setShowProfileMenu(false);
                          setActiveTab('profile');
                        }}
                        className="w-full text-left px-2.5 py-2 rounded-lg text-slate-300 hover:bg-slate-800 hover:text-white flex items-center gap-2 transition-colors"
                      >
                        <User className="w-3.5 h-3.5 text-cyan-400" />
                        <span>Profile & Security</span>
                      </button>

                      <button
                        id="btn-menu-notifications-view"
                        onClick={() => {
                          setShowProfileMenu(false);
                          setActiveTab('notifications');
                        }}
                        className="w-full text-left px-2.5 py-2 rounded-lg text-slate-300 hover:bg-slate-800 hover:text-white flex items-center gap-2 transition-colors"
                      >
                        <Bell className="w-3.5 h-3.5 text-amber-400" />
                        <span>Notification Center</span>
                      </button>

                      <a
                        id="btn-menu-swagger-docs"
                        href="/swagger-ui.html"
                        target="_blank"
                        rel="noreferrer"
                        onClick={() => setShowProfileMenu(false)}
                        className="w-full text-left px-2.5 py-2 rounded-lg text-slate-300 hover:bg-slate-800 hover:text-white flex items-center justify-between transition-colors"
                      >
                        <div className="flex items-center gap-2">
                          <BookOpen className="w-3.5 h-3.5 text-emerald-400" />
                          <span>Swagger API Docs</span>
                        </div>
                        <ExternalLink className="w-3 h-3 text-slate-500" />
                      </a>

                      <button
                        id="btn-menu-change-password"
                        onClick={() => {
                          setShowProfileMenu(false);
                          setShowPasswordModal(true);
                        }}
                        className="w-full text-left px-2.5 py-2 rounded-lg text-slate-300 hover:bg-slate-800 hover:text-white flex items-center gap-2 transition-colors"
                      >
                        <KeyRound className="w-3.5 h-3.5 text-purple-400" />
                        <span>Change Password</span>
                      </button>

                      {onOpenLoginModal && (
                        <button
                          id="btn-menu-switch-account"
                          onClick={() => {
                            setShowProfileMenu(false);
                            onOpenLoginModal();
                          }}
                          className="w-full text-left px-2.5 py-2 rounded-lg text-slate-300 hover:bg-slate-800 hover:text-white flex items-center gap-2 transition-colors"
                        >
                          <User className="w-3.5 h-3.5 text-slate-400" />
                          <span>Switch Account / Sign In</span>
                        </button>
                      )}

                      <button
                        id="btn-menu-logout"
                        onClick={() => {
                          setShowProfileMenu(false);
                          logout();
                        }}
                        className="w-full text-left px-2.5 py-2 rounded-lg text-rose-400 hover:bg-rose-500/10 flex items-center gap-2 transition-colors"
                      >
                        <LogOut className="w-3.5 h-3.5" />
                        <span>Sign Out (Revoke JWT)</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Mobile Menu Hamburger Button */}
              <div className="lg:hidden">
                <button
                  id="btn-mobile-menu-toggle"
                  onClick={() => setShowMobileMenu(!showMobileMenu)}
                  className="p-2 rounded-xl border border-slate-700/60 bg-slate-800 text-slate-300 hover:text-white"
                  title="Toggle Mobile Menu"
                >
                  {showMobileMenu ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Mobile Navigation Drawer */}
        {showMobileMenu && (
          <div id="mobile-nav-drawer" className="lg:hidden border-t border-slate-800 bg-slate-900/95 backdrop-blur-md px-4 py-3 space-y-3 shadow-2xl animate-in slide-in-from-top-2 duration-200 max-h-[80vh] overflow-y-auto">
            {/* TECHNICIAN MOBILE MENU */}
            {activeRole === 'TECHNICIAN' && (
              <div className="space-y-1">
                <div className="text-[10px] uppercase font-bold text-slate-500 tracking-wider px-3 py-1">
                  Technician
                </div>
                <button
                  onClick={() => { setActiveTab('technician-portal'); setShowMobileMenu(false); }}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold ${
                    activeTab === 'technician-portal' ? 'bg-amber-500/10 text-amber-300 border border-amber-500/30' : 'text-slate-300'
                  }`}
                >
                  <CheckSquare className="w-4 h-4 text-amber-400" />
                  <span>My Workbench</span>
                </button>
                <button
                  onClick={() => { setActiveTab('work-orders'); setShowMobileMenu(false); }}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold ${
                    activeTab === 'work-orders' ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/30' : 'text-slate-300'
                  }`}
                >
                  <Wrench className="w-4 h-4 text-cyan-400" />
                  <span>Service History</span>
                </button>
                <button
                  onClick={() => { setActiveTab('profile'); setShowMobileMenu(false); }}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold ${
                    activeTab === 'profile' ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/30' : 'text-slate-300'
                  }`}
                >
                  <User className="w-4 h-4 text-slate-400" />
                  <span>Profile / Availability</span>
                </button>
              </div>
            )}

            {/* CUSTOMER MOBILE MENU */}
            {activeRole === 'CUSTOMER' && (
              <div className="space-y-1">
                <div className="text-[10px] uppercase font-bold text-slate-500 tracking-wider px-3 py-1">
                  Customer Portal
                </div>
                <button
                  onClick={() => { setActiveTab('customer-portal'); setShowMobileMenu(false); }}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold ${
                    activeTab === 'customer-portal' ? 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/30' : 'text-slate-300'
                  }`}
                >
                  <FileText className="w-4 h-4 text-emerald-400" />
                  <span>My Requests</span>
                </button>
                <button
                  onClick={() => { setActiveTab('work-orders'); setShowMobileMenu(false); }}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold ${
                    activeTab === 'work-orders' ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/30' : 'text-slate-300'
                  }`}
                >
                  <Wrench className="w-4 h-4 text-cyan-400" />
                  <span>Active Work Orders</span>
                </button>
                <button
                  onClick={() => { setActiveTab('facilities'); setShowMobileMenu(false); }}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold ${
                    activeTab === 'facilities' ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/30' : 'text-slate-300'
                  }`}
                >
                  <Building className="w-4 h-4 text-cyan-400" />
                  <span>Profile / Facilities</span>
                </button>
              </div>
            )}

            {/* DISPATCHER / ADMIN MOBILE MENU */}
            {['SUPER_ADMIN', 'ADMIN', 'DISPATCHER'].includes(activeRole || '') && (
              <>
                {/* MAIN */}
                <div className="space-y-1">
                  <div className="text-[10px] uppercase font-bold text-slate-500 tracking-wider px-3 py-1">
                    Main Operations
                  </div>
                  <button
                    onClick={() => { setActiveTab('dashboard'); setShowMobileMenu(false); }}
                    className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold ${
                      activeTab === 'dashboard' ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/30' : 'text-slate-300'
                    }`}
                  >
                    <Activity className="w-4 h-4 text-cyan-400" />
                    <span>Dashboard</span>
                  </button>
                  <button
                    onClick={() => { setActiveTab('work-orders'); setShowMobileMenu(false); }}
                    className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold ${
                      activeTab === 'work-orders' ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/30' : 'text-slate-300'
                    }`}
                  >
                    <Wrench className="w-4 h-4 text-cyan-400" />
                    <span>Work Orders</span>
                  </button>
                  <button
                    onClick={() => { setActiveTab('dispatch-board'); setShowMobileMenu(false); }}
                    className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold ${
                      activeTab === 'dispatch-board' ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/30' : 'text-slate-300'
                    }`}
                  >
                    <Users className="w-4 h-4 text-cyan-400" />
                    <span>Dispatch Board</span>
                  </button>
                  <button
                    onClick={() => { setActiveTab('service-requests'); setShowMobileMenu(false); }}
                    className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold ${
                      activeTab === 'service-requests' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30' : 'text-slate-300'
                    }`}
                  >
                    <FileText className="w-4 h-4 text-emerald-400" />
                    <span>Service Requests</span>
                  </button>
                </div>

                {/* OPERATIONS */}
                <div className="space-y-1 pt-2 border-t border-slate-800/80">
                  <div className="text-[10px] uppercase font-bold text-slate-500 tracking-wider px-3 py-1">
                    Operations
                  </div>
                  <button
                    onClick={() => { setActiveTab('facilities'); setShowMobileMenu(false); }}
                    className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold ${
                      activeTab === 'facilities' ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/30' : 'text-slate-300'
                    }`}
                  >
                    <Building className="w-4 h-4 text-cyan-400" />
                    <span>Facilities</span>
                  </button>
                  <button
                    onClick={() => { setActiveTab('assets'); setShowMobileMenu(false); }}
                    className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold ${
                      activeTab === 'assets' ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/30' : 'text-slate-300'
                    }`}
                  >
                    <Layers className="w-4 h-4 text-cyan-400" />
                    <span>Assets</span>
                  </button>
                  <button
                    onClick={() => { setActiveTab('inventory'); setShowMobileMenu(false); }}
                    className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold ${
                      activeTab === 'inventory' ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/30' : 'text-slate-300'
                    }`}
                  >
                    <Boxes className="w-4 h-4 text-cyan-400" />
                    <span>Inventory / Parts</span>
                  </button>
                  <button
                    onClick={() => { setActiveTab('technicians'); setShowMobileMenu(false); }}
                    className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold ${
                      activeTab === 'technicians' ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/30' : 'text-slate-300'
                    }`}
                  >
                    <HardHat className="w-4 h-4 text-cyan-400" />
                    <span>Technicians</span>
                  </button>
                </div>

                {/* SYSTEM */}
                <div className="space-y-1 pt-2 border-t border-slate-800/80">
                  <div className="text-[10px] uppercase font-bold text-slate-500 tracking-wider px-3 py-1">
                    System & Governance
                  </div>
                  <button
                    onClick={() => { setActiveTab('sla-dashboard'); setShowMobileMenu(false); }}
                    className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold ${
                      activeTab === 'sla-dashboard' ? 'bg-amber-500/10 text-amber-300 border border-amber-500/30' : 'text-slate-300'
                    }`}
                  >
                    <ShieldAlert className="w-4 h-4 text-amber-400" />
                    <span>SLA Engine</span>
                  </button>
                  <button
                    onClick={() => { setActiveTab('audit-logs'); setShowMobileMenu(false); }}
                    className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold ${
                      activeTab === 'audit-logs' ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/30' : 'text-slate-300'
                    }`}
                  >
                    <History className="w-4 h-4 text-cyan-400" />
                    <span>Audit Logs</span>
                  </button>
                  {hasRole(['SUPER_ADMIN', 'ADMIN']) && (
                    <button
                      onClick={() => { setActiveTab('users'); setShowMobileMenu(false); }}
                      className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold ${
                        activeTab === 'users' ? 'bg-blue-500/10 text-blue-300 border border-blue-500/30' : 'text-slate-300'
                      }`}
                    >
                      <KeyRound className="w-4 h-4 text-blue-400" />
                      <span>Settings / Users</span>
                    </button>
                  )}
                </div>
              </>
            )}

            <div className="pt-2 border-t border-slate-800">
              <button
                onClick={() => { setActiveTab('profile'); setShowMobileMenu(false); }}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold ${
                  activeTab === 'profile' ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/30' : 'text-slate-300'
                }`}
              >
                <User className="w-4 h-4" />
                <span>Profile Settings</span>
              </button>
            </div>
          </div>
        )}
      </header>

      {/* Change Password Modal */}
      {showPasswordModal && (
        <div id="change-password-modal" className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <KeyRound className="w-4 h-4 text-cyan-400" />
                Change Account Password
              </h3>
              <button
                onClick={() => {
                  setShowPasswordModal(false);
                  setPasswordError(null);
                  setPasswordSuccess(null);
                }}
                className="text-slate-400 hover:text-white text-xs"
              >
                ✕
              </button>
            </div>

            {passwordError && (
              <div className="p-3 bg-rose-500/10 border border-rose-500/30 text-rose-300 rounded-lg text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{passwordError}</span>
              </div>
            )}

            {passwordSuccess && (
              <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 rounded-lg text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{passwordSuccess}</span>
              </div>
            )}

            <form onSubmit={handleChangePasswordSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Current Password</label>
                <input
                  id="input-change-current-password"
                  type="password"
                  required
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">New Password (min 8 characters)</label>
                <input
                  id="input-change-new-password"
                  type="password"
                  required
                  minLength={8}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800/80 text-[11px] text-slate-400 leading-relaxed">
                Security note: Changing your password triggers immediate session invalidation across all devices and updates your token version.
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowPasswordModal(false)}
                  className="px-3 py-1.5 text-xs text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  id="btn-submit-change-password"
                  type="submit"
                  disabled={changingPassword}
                  className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow"
                >
                  {changingPassword ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Lock className="w-3.5 h-3.5" />}
                  Update & Invalidate Sessions
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
};
