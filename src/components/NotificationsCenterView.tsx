import React, { useState, useEffect } from 'react';
import { 
  Bell, CheckCircle2, ShieldAlert, FileText, Users, 
  Boxes, CheckCheck, Filter, Search, ArrowRight, RefreshCw,
  AlertTriangle, Clock
} from 'lucide-react';
import { api } from '../services/api';
import { AppNotification, RoleName } from '../types';

interface NotificationsCenterViewProps {
  onNavigateToTab?: (tab: string, entityId?: string) => void;
  currentRole?: RoleName;
}

export const NotificationsCenterView: React.FC<NotificationsCenterViewProps> = ({
  onNavigateToTab,
  currentRole
}) => {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'ALL' | 'UNREAD' | 'SLA' | 'WORK_ORDER'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  const fetchNotifications = async () => {
    setLoading(true);
    try {
      const data = await api.getNotifications();
      setNotifications(data);
    } catch (err) {
      console.error('Failed to load notifications:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, []);

  const handleMarkAsRead = async (id: string) => {
    try {
      await api.markNotificationRead(id);
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
    } catch (err) {
      console.error('Failed to mark read:', err);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await api.markAllNotificationsRead();
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    } catch (err) {
      console.error('Failed to mark all read:', err);
    }
  };

  const filtered = notifications.filter(n => {
    const q = searchQuery.toLowerCase();
    const matchesSearch = !q || n.title.toLowerCase().includes(q) || n.message.toLowerCase().includes(q);
    if (!matchesSearch) return false;

    if (filter === 'UNREAD') return !n.read;
    if (filter === 'SLA') return n.type.includes('SLA');
    if (filter === 'WORK_ORDER') return n.entityType === 'WORK_ORDER';
    return true;
  });

  const getNotifIcon = (type: string) => {
    switch (type) {
      case 'NEW_SERVICE_REQUEST':
        return <FileText className="w-5 h-5 text-emerald-400" />;
      case 'WORK_ORDER_ASSIGNED':
      case 'ASSIGNMENT_CHANGED':
        return <Users className="w-5 h-5 text-cyan-400" />;
      case 'WORK_COMPLETED':
        return <CheckCircle2 className="w-5 h-5 text-teal-400" />;
      case 'SLA_AT_RISK':
        return <AlertTriangle className="w-5 h-5 text-amber-400" />;
      case 'SLA_BREACHED':
        return <ShieldAlert className="w-5 h-5 text-rose-400" />;
      case 'LOW_INVENTORY':
        return <Boxes className="w-5 h-5 text-purple-400" />;
      default:
        return <Bell className="w-5 h-5 text-blue-400" />;
    }
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <div className="space-y-6 animate-in fade-in duration-300 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white border border-slate-200 p-6 rounded-2xl shadow-xs">
        <div>
          <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2.5">
            <Bell className="w-6 h-6 text-blue-600" />
            Operations Notification Center
            {unreadCount > 0 && (
              <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-blue-100 text-blue-800 border border-blue-200">
                {unreadCount} Unread
              </span>
            )}
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Real-time event broadcasts, SLA alerts, dispatch changes, and customer verification requests.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {unreadCount > 0 && (
            <button
              onClick={handleMarkAllRead}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-slate-100 hover:bg-slate-200 text-xs font-semibold text-slate-700 transition"
            >
              <CheckCheck className="w-4 h-4 text-blue-600" />
              Mark All Read
            </button>
          )}
          <button
            onClick={fetchNotifications}
            className="p-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 transition shadow-xs"
            title="Refresh notifications"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Filter Tabs & Search */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white border border-slate-200 rounded-xl p-3 shadow-xs">
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setFilter('ALL')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
              filter === 'ALL' ? 'bg-blue-600 text-white font-bold shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            All ({notifications.length})
          </button>
          <button
            onClick={() => setFilter('UNREAD')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
              filter === 'UNREAD' ? 'bg-blue-600 text-white font-bold shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Unread ({unreadCount})
          </button>
          <button
            onClick={() => setFilter('SLA')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
              filter === 'SLA' ? 'bg-blue-600 text-white font-bold shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            SLA Alerts
          </button>
          <button
            onClick={() => setFilter('WORK_ORDER')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
              filter === 'WORK_ORDER' ? 'bg-blue-600 text-white font-bold shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Work Orders
          </button>
        </div>

        <div className="relative min-w-[200px]">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search alerts..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-white border border-slate-200 rounded-lg pl-8 pr-3 py-1 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-500 shadow-xs"
          />
        </div>
      </div>

      {/* Notification List */}
      {loading ? (
        <div className="py-12 flex justify-center text-xs text-slate-400">
          <RefreshCw className="w-5 h-5 animate-spin text-blue-600" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-2xl p-10 text-center space-y-2 shadow-xs">
          <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto" />
          <h3 className="text-sm font-bold text-slate-900">All Caught Up!</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            There are no pending operational alerts matching your current filter.
          </p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {filtered.map((notif) => (
            <div
              key={notif.id}
              className={`p-4 rounded-xl border transition-all flex items-start gap-3.5 ${
                notif.read 
                  ? 'bg-white border-slate-200 text-slate-700 shadow-xs' 
                  : 'bg-blue-50/40 border-blue-200 shadow-xs text-slate-900'
              }`}
            >
              <div className="p-2.5 rounded-xl bg-white border border-slate-200 flex-shrink-0 mt-0.5 shadow-xs">
                {getNotifIcon(notif.type)}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <h4 className="text-xs font-bold text-slate-900 flex items-center gap-2">
                    {notif.title}
                    {!notif.read && (
                      <span className="w-2 h-2 rounded-full bg-blue-600"></span>
                    )}
                  </h4>
                  <span className="text-[10px] text-slate-400 font-mono flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {new Date(notif.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>

                <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                  {notif.message}
                </p>

                <div className="mt-3 flex items-center justify-between pt-2 border-t border-slate-100 text-xs">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-slate-100 border border-slate-200 text-slate-600">
                      {notif.type}
                    </span>
                    {notif.entityId && (
                      <span className="text-[10px] font-mono text-blue-600 font-semibold">
                        REF: {notif.entityId}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-3">
                    {!notif.read && (
                      <button
                        onClick={() => handleMarkAsRead(notif.id)}
                        className="text-xs text-slate-500 hover:text-slate-800"
                      >
                        Mark as read
                      </button>
                    )}
                    {onNavigateToTab && notif.link && (
                      <button
                        onClick={() => onNavigateToTab(notif.link!, notif.entityId)}
                        className="text-xs text-blue-600 hover:text-blue-800 font-semibold flex items-center gap-1"
                      >
                        Open Target View <ArrowRight className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
