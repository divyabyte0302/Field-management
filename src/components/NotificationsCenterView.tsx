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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2.5">
            <Bell className="w-6 h-6 text-cyan-400" />
            Operations Notification Center
            {unreadCount > 0 && (
              <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-cyan-500 text-slate-950">
                {unreadCount} Unread
              </span>
            )}
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Real-time event broadcasts, SLA alerts, dispatch changes, and customer verification requests.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {unreadCount > 0 && (
            <button
              onClick={handleMarkAllRead}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-700 bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 transition"
            >
              <CheckCheck className="w-4 h-4 text-cyan-400" />
              Mark All Read
            </button>
          )}
          <button
            onClick={fetchNotifications}
            className="p-1.5 rounded-lg border border-slate-800 bg-slate-900 text-slate-400 hover:text-white transition"
            title="Refresh notifications"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Filter Tabs & Search */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-900/60 border border-slate-800 rounded-xl p-3">
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setFilter('ALL')}
            className={`px-3 py-1 rounded-lg text-xs font-semibold transition ${
              filter === 'ALL' ? 'bg-cyan-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-white'
            }`}
          >
            All ({notifications.length})
          </button>
          <button
            onClick={() => setFilter('UNREAD')}
            className={`px-3 py-1 rounded-lg text-xs font-semibold transition ${
              filter === 'UNREAD' ? 'bg-cyan-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-white'
            }`}
          >
            Unread ({unreadCount})
          </button>
          <button
            onClick={() => setFilter('SLA')}
            className={`px-3 py-1 rounded-lg text-xs font-semibold transition ${
              filter === 'SLA' ? 'bg-cyan-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-white'
            }`}
          >
            SLA Alerts
          </button>
          <button
            onClick={() => setFilter('WORK_ORDER')}
            className={`px-3 py-1 rounded-lg text-xs font-semibold transition ${
              filter === 'WORK_ORDER' ? 'bg-cyan-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-white'
            }`}
          >
            Work Orders
          </button>
        </div>

        <div className="relative min-w-[200px]">
          <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search alerts..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-8 pr-3 py-1 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500"
          />
        </div>
      </div>

      {/* Notification List */}
      {loading ? (
        <div className="py-12 flex justify-center text-xs text-slate-400">
          <RefreshCw className="w-5 h-5 animate-spin text-cyan-400" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-10 text-center space-y-2">
          <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto opacity-75" />
          <h3 className="text-sm font-bold text-white">All Caught Up!</h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
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
                  ? 'bg-slate-900/60 border-slate-800/80 text-slate-300' 
                  : 'bg-slate-900 border-cyan-500/40 shadow-lg text-white'
              }`}
            >
              <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 flex-shrink-0 mt-0.5">
                {getNotifIcon(notif.type)}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <h4 className="text-xs font-bold text-white flex items-center gap-2">
                    {notif.title}
                    {!notif.read && (
                      <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse"></span>
                    )}
                  </h4>
                  <span className="text-[10px] text-slate-500 font-mono flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {new Date(notif.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>

                <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                  {notif.message}
                </p>

                <div className="mt-3 flex items-center justify-between pt-2 border-t border-slate-800/60 text-xs">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-slate-950 border border-slate-800 text-slate-400">
                      {notif.type}
                    </span>
                    {notif.entityId && (
                      <span className="text-[10px] font-mono text-cyan-400">
                        REF: {notif.entityId}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-3">
                    {!notif.read && (
                      <button
                        onClick={() => handleMarkAsRead(notif.id)}
                        className="text-xs text-slate-400 hover:text-white"
                      >
                        Mark as read
                      </button>
                    )}
                    {onNavigateToTab && notif.link && (
                      <button
                        onClick={() => onNavigateToTab(notif.link!, notif.entityId)}
                        className="text-xs text-cyan-400 hover:text-cyan-300 font-semibold flex items-center gap-1"
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
