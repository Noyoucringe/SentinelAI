import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  FileInput,
  AlertTriangle,
  Users,
  BrainCircuit,
  Settings,
  Search,
  Bell,
  Shield,
  ChevronLeft,
  ChevronRight,
  X,
  CheckCheck,
  ShieldAlert,
  Zap,
  Info,
  Trash2,
  User,
} from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { useDetection } from '@/context/DetectionContext';

const NAV_ITEMS = [
  { icon: LayoutDashboard, label: 'Command Center', path: '/' },
  { icon: FileInput, label: 'Identity Signals', path: '/ingest' },
  { icon: AlertTriangle, label: 'Risk Alerts', path: '/alerts' },
  { icon: Users, label: 'Identity Profiles', path: '/profiles' },
  { icon: BrainCircuit, label: 'Model Logic', path: '/model' },
  { icon: Settings, label: 'Policy Controls', path: '/config' },
];

/* ---------- Notification types ---------- */
type Notification = {
  id: string;
  type: 'alert' | 'system' | 'info';
  title: string;
  body: string;
  timestamp: string;          // display label
  severity?: 'high' | 'medium';
  read: boolean;
  score?: number;
};

function timeAgo(date: Date): string {
  const diff = (Date.now() - date.getTime()) / 1000;
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

const ICON_MAP = {
  alert: ShieldAlert,
  system: Zap,
  info: Info,
} as const;

export default function Layout({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);

  /* --- Notification state --- */
  const { liveResult, datasetInfo, settings } = useDetection();
  const [notifications, setNotifications] = useState<Notification[]>(() => {
    try {
      const raw = localStorage.getItem('sentinel_notifications');
      if (raw) return JSON.parse(raw) as Notification[];
    } catch { /* ignore */ }
    return [];
  });

  // Persist notifications to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('sentinel_notifications', JSON.stringify(notifications));
    } catch { /* quota exceeded */ }
  }, [notifications]);
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const bellRef = useRef<HTMLButtonElement>(null);
  const prevAlertCountRef = useRef(0);

  // Derive notifications from detection results whenever they change
  useEffect(() => {
    if (!liveResult) return;

    const now = new Date();
    const newNotifs: Notification[] = [];

    // Summary notification
    const s = liveResult.summary;
    newNotifs.push({
      id: `summary-${now.getTime()}`,
      type: 'system',
      title: 'Detection Complete',
      body: `${s.anomalyCount} anomalies detected across ${s.totalUsers} users (${s.highRiskCount} high, ${s.mediumRiskCount} medium risk).`,
      timestamp: timeAgo(now),
      read: false,
    });

    // Top alerts (up to 8 most severe)
    const sorted = [...liveResult.alerts].sort((a, b) => b.score - a.score).slice(0, 8);
    sorted.forEach((alert) => {
      newNotifs.push({
        id: `alert-${alert.id}-${now.getTime()}`,
        type: 'alert',
        title: alert.title,
        body: `User ${alert.userId} — score ${alert.score}`,
        timestamp: timeAgo(now),
        severity: alert.severity,
        read: false,
        score: alert.score,
      });
    });

    if (datasetInfo) {
      newNotifs.push({
        id: `dataset-${now.getTime()}`,
        type: 'info',
        title: 'Dataset Loaded',
        body: `${datasetInfo.fileName} (${datasetInfo.fileSizeLabel})`,
        timestamp: timeAgo(now),
        read: false,
      });
    }

    setNotifications((prev) => [...newNotifs, ...prev].slice(0, 50));
    prevAlertCountRef.current = liveResult.alerts.length;
  }, [liveResult]);

  // Close panel on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (
        panelRef.current &&
        !panelRef.current.contains(e.target as Node) &&
        bellRef.current &&
        !bellRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const unreadCount = useMemo(() => notifications.filter((n) => !n.read).length, [notifications]);

  const markRead = useCallback((id: string) => {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
  }, []);

  const markAllRead = useCallback(() => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  }, []);

  const clearAll = useCallback(() => {
    setNotifications([]);
    setOpen(false);
  }, []);

  const dismissOne = useCallback((id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  }, []);

  /* --- Search state --- */
  const [searchQuery, setSearchQuery] = useState('');
  const [searchFocused, setSearchFocused] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  // Close search on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setSearchFocused(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  type SearchResult = { type: 'user' | 'alert' | 'page'; label: string; sublabel: string; path: string; score?: number; severity?: string; itemId?: string };

  const searchResults = useMemo<SearchResult[]>(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q || q.length < 1) return [];
    const results: SearchResult[] = [];

    // Search pages
    for (const item of NAV_ITEMS) {
      if (item.label.toLowerCase().includes(q) || item.path.toLowerCase().includes(q)) {
        results.push({ type: 'page', label: item.label, sublabel: `Navigate to ${item.label}`, path: item.path });
      }
    }

    if (!liveResult) return results.slice(0, 12);

    // Search users
    const seenUsers = new Set<string>();
    for (const u of liveResult.topRiskUsers) {
      if (u.userId.toLowerCase().includes(q) && !seenUsers.has(u.userId)) {
        seenUsers.add(u.userId);
        results.push({
          type: 'user',
          label: `User ${u.userId}`,
          sublabel: `${u.alertCount} alerts · max score ${u.maxScore}`,
          path: '/profiles',
          score: u.maxScore,
          severity: u.maxScore >= 80 ? 'high' : u.maxScore >= 55 ? 'medium' : 'low',
          itemId: u.userId,
        });
      }
    }

    // Search alerts (by title, description, userId, id)
    for (const a of liveResult.alerts) {
      if (
        a.title.toLowerCase().includes(q) ||
        a.description.toLowerCase().includes(q) ||
        a.userId.toLowerCase().includes(q) ||
        a.id.toLowerCase().includes(q)
      ) {
        const key = a.id;
        if (results.find((r) => r.label === key)) continue;
        results.push({
          type: 'alert',
          label: `${a.id} — ${a.title}`,
          sublabel: `User ${a.userId} · ${a.description.slice(0, 60)}`,
          path: '/alerts',
          score: a.score,
          severity: a.severity,
          itemId: a.id,
        });
      }
    }

    return results.slice(0, 12);
  }, [searchQuery, liveResult]);

  const handleSearchSelect = useCallback((result: SearchResult) => {
    setSearchQuery('');
    setSearchFocused(false);
    const state: Record<string, string> = {};
    if (result.type === 'user' && result.itemId) state.userId = result.itemId;
    if (result.type === 'alert' && result.itemId) state.alertId = result.itemId;
    navigate(result.path, { state });
  }, [navigate]);

  return (
    <div className="flex h-screen w-full bg-bg-dark text-text-primary overflow-hidden font-sans">
      {/* Sidebar */}
      <aside
        className={cn(
          'border-r border-border bg-bg-card flex flex-col transition-all duration-300 ease-in-out',
          collapsed ? 'w-[72px]' : 'w-[260px]'
        )}
      >
        {/* Logo */}
        <div className="h-[64px] border-b border-border px-4 flex items-center gap-3 shrink-0">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary to-[#6844e8] flex items-center justify-center shrink-0 shadow-[0_0_20px_rgba(124,92,252,0.25)]">
            <Shield className="w-[18px] h-[18px] text-[#ffffff]" />
          </div>
          {!collapsed && (
            <div className="overflow-hidden">
              <p className="text-[13px] font-mono font-bold uppercase tracking-[0.2em] text-primary">Sentinel</p>
              <p className="text-[17px] font-bold text-text-primary leading-tight truncate">Identity Shield</p>
            </div>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {!collapsed && (
            <p className="text-[13px] font-mono font-bold uppercase tracking-[0.15em] text-text-muted px-3 mb-3">
              Navigation
            </p>
          )}
          {NAV_ITEMS.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                title={collapsed ? item.label : undefined}
                className={cn('nav-link', isActive && 'active')}
              >
                <item.icon className={cn('w-[22px] h-[22px] nav-icon shrink-0', isActive && 'text-primary')} />
                {!collapsed && <span className="truncate">{item.label}</span>}
              </Link>
            );
          })}
        </nav>

        {/* Collapse toggle */}
        <div className="p-3 border-t border-border shrink-0">
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="w-full flex items-center justify-center gap-2 py-2 rounded-xl text-text-muted hover:text-text-secondary hover:bg-bg-elevated/30 transition-all text-sm"
          >
            {collapsed ? <ChevronRight className="w-4 h-4" /> : <><ChevronLeft className="w-4 h-4" /><span>Collapse</span></>}
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 min-w-0 flex flex-col bg-bg-dark">
        {/* Top bar */}
        <header className="h-[64px] border-b border-border px-6 bg-bg-card/60 backdrop-blur-xl flex items-center shrink-0 relative z-50">
          <div className="flex-1" />

          <div className="relative" ref={searchRef}>
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted pointer-events-none" />
            <input
              placeholder="Search users, alerts, devices..."
              className="uiverse-search pl-10 pr-4"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => setSearchFocused(true)}
              onKeyDown={(e) => {
                if (e.key === 'Escape') { setSearchFocused(false); setSearchQuery(''); }
                if (e.key === 'Enter' && searchResults.length > 0) handleSearchSelect(searchResults[0]);
              }}
            />

            {/* Search Results Dropdown */}
            <AnimatePresence>
              {searchFocused && searchQuery.trim().length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: -4, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -4, scale: 0.98 }}
                  transition={{ duration: 0.15 }}
                  className="absolute top-[calc(100%+8px)] left-1/2 -translate-x-1/2 w-[420px] max-h-[400px] rounded-2xl border border-border bg-bg-card shadow-2xl shadow-black/50 z-[100] flex flex-col overflow-hidden"
                >
                  <div className="px-4 py-2.5 border-b border-border flex items-center justify-between">
                    <span className="text-[13px] font-mono font-bold uppercase tracking-widest text-text-muted">
                      {searchResults.length} result{searchResults.length !== 1 ? 's' : ''}
                    </span>
                    <button onClick={() => { setSearchQuery(''); setSearchFocused(false); }} className="text-text-muted hover:text-text-primary transition-colors">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="flex-1 overflow-y-auto">
                    {searchResults.length > 0 ? (
                      searchResults.map((result, i) => (
                        <button
                          key={i}
                          onClick={() => handleSearchSelect(result)}
                          className="w-full flex items-start gap-3 px-4 py-3 text-left hover:bg-bg-elevated/40 transition-colors border-b border-border/50 last:border-0"
                        >
                          <div className={cn(
                            'w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5',
                            result.type === 'user' ? 'bg-primary/10' : result.type === 'alert' ? 'bg-critical/10' : 'bg-accent/10'
                          )}>
                            {result.type === 'user' ? <User className="w-3.5 h-3.5 text-primary" /> :
                             result.type === 'alert' ? <ShieldAlert className="w-3.5 h-3.5 text-critical" /> :
                             <LayoutDashboard className="w-3.5 h-3.5 text-accent" />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-[14px] font-semibold text-text-primary truncate">{result.label}</p>
                            <p className="text-[12px] text-text-muted truncate">{result.sublabel}</p>
                          </div>
                          {result.score != null && (
                            <span className={cn(
                              'text-[13px] font-mono font-bold px-1.5 py-0.5 rounded-md shrink-0',
                              result.severity === 'high' ? 'badge-high' : result.severity === 'medium' ? 'badge-medium' : 'badge-low'
                            )}>
                              {result.score}
                            </span>
                          )}
                        </button>
                      ))
                    ) : (
                      <div className="px-4 py-8 text-center text-[14px] text-text-muted">
                        No results for "{searchQuery}"
                      </div>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div className="flex-1 flex justify-end items-center gap-3">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-[rgba(6,214,160,0.08)] border border-[rgba(6,214,160,0.15)]">
              <span className="w-2 h-2 rounded-full bg-accent" />
              <span className="text-[14px] font-medium text-accent">System Active</span>
            </div>
            <button
              ref={bellRef}
              onClick={() => { setOpen((o) => !o); }}
              className="relative p-2.5 rounded-xl text-text-muted hover:text-text-primary hover:bg-bg-elevated/50 transition-all"
            >
              <Bell className="w-[18px] h-[18px]" />
              {unreadCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] flex items-center justify-center rounded-full bg-critical text-[13px] font-bold text-[#ffffff] px-1 shadow-[0_0_8px_rgba(255,71,87,0.4)]">
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              )}
              {unreadCount === 0 && notifications.length === 0 && (
                <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-text-muted/30" />
              )}
            </button>

            {/* Notification Panel */}
            <AnimatePresence>
              {open && (
                <motion.div
                  ref={panelRef}
                  initial={{ opacity: 0, y: -8, scale: 0.97 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -8, scale: 0.97 }}
                  transition={{ duration: 0.18 }}
                  className="absolute right-0 top-[56px] w-[400px] max-h-[520px] rounded-2xl border border-border bg-bg-card shadow-2xl shadow-black/50 z-50 flex flex-col overflow-hidden"
                >
                  {/* Header */}
                  <div className="flex items-center justify-between px-4 py-3 border-b border-border shrink-0">
                    <div className="flex items-center gap-2">
                      <Bell className="w-4 h-4 text-primary" />
                      <span className="text-sm font-bold text-text-primary">Notifications</span>
                      {unreadCount > 0 && (
                        <span className="ml-1 px-1.5 py-0.5 rounded-md bg-critical/10 text-critical text-[13px] font-mono font-bold">
                          {unreadCount} new
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1">
                      {unreadCount > 0 && (
                        <button
                          onClick={markAllRead}
                          className="p-1.5 rounded-lg text-text-muted hover:text-accent hover:bg-accent/5 transition-all"
                          title="Mark all read"
                        >
                          <CheckCheck className="w-3.5 h-3.5" />
                        </button>
                      )}
                      {notifications.length > 0 && (
                        <button
                          onClick={clearAll}
                          className="p-1.5 rounded-lg text-text-muted hover:text-critical hover:bg-critical/5 transition-all"
                          title="Clear all"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                      <button
                        onClick={() => setOpen(false)}
                        className="p-1.5 rounded-lg text-text-muted hover:text-text-primary hover:bg-bg-elevated/50 transition-all"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* List */}
                  <div className="flex-1 overflow-y-auto divide-y divide-border/50">
                    {notifications.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-16 gap-3 text-text-muted">
                        <Bell className="w-8 h-8 opacity-30" />
                        <p className="text-sm font-medium">No notifications yet</p>
                        <p className="text-[14px] opacity-60">Run anomaly detection to generate alerts</p>
                      </div>
                    ) : (
                      notifications.map((notif) => {
                        const Icon = ICON_MAP[notif.type];
                        return (
                          <motion.div
                            key={notif.id}
                            layout
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            className={cn(
                              'group flex gap-3 px-4 py-3 cursor-pointer transition-all hover:bg-bg-elevated/30',
                              !notif.read && 'bg-primary/[0.03]'
                            )}
                            onClick={() => {
                              markRead(notif.id);
                              if (notif.type === 'alert') {
                                navigate('/alerts');
                                setOpen(false);
                              }
                            }}
                          >
                            {/* Icon */}
                            <div
                              className={cn(
                                'w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5 border',
                                notif.severity === 'high'
                                  ? 'bg-critical/8 border-critical/15 text-critical'
                                  : notif.severity === 'medium'
                                    ? 'bg-[#ffb347]/8 border-[#ffb347]/15 text-[#ffb347]'
                                    : notif.type === 'system'
                                      ? 'bg-primary/8 border-primary/15 text-primary'
                                      : 'bg-accent/8 border-accent/15 text-accent'
                              )}
                            >
                              <Icon className="w-3.5 h-3.5" />
                            </div>

                            {/* Content */}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-start justify-between gap-2">
                                <p className={cn('text-sm font-semibold truncate', notif.read ? 'text-text-secondary' : 'text-text-primary')}>
                                  {notif.title}
                                </p>
                                <span className="text-[13px] text-text-muted font-mono whitespace-nowrap shrink-0">
                                  {notif.timestamp}
                                </span>
                              </div>
                              <p className="text-[14px] text-text-muted mt-0.5 line-clamp-2 leading-relaxed">
                                {notif.body}
                              </p>
                              {notif.score !== undefined && (
                                <span
                                  className={cn(
                                    'inline-block mt-1 px-1.5 py-0.5 rounded text-[9px] font-mono font-bold',
                                    notif.score >= settings.criticalThreshold
                                      ? 'bg-critical/10 text-critical'
                                      : 'bg-[#ffb347]/10 text-[#ffb347]'
                                  )}
                                >
                                  Score {notif.score}
                                </span>
                              )}
                            </div>

                            {/* Unread dot + dismiss */}
                            <div className="flex flex-col items-center gap-1 shrink-0">
                              {!notif.read && (
                                <span className="w-2 h-2 rounded-full bg-primary shadow-[0_0_6px_rgba(124,92,252,0.4)]" />
                              )}
                              <button
                                onClick={(e) => { e.stopPropagation(); dismissOne(notif.id); }}
                                className="opacity-0 group-hover:opacity-100 p-1 rounded-md text-text-muted hover:text-critical hover:bg-critical/5 transition-all"
                                title="Dismiss"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </div>
                          </motion.div>
                        );
                      })
                    )}
                  </div>

                  {/* Footer */}
                  {notifications.length > 0 && (
                    <div className="px-4 py-2.5 border-t border-border shrink-0 flex justify-center">
                      <button
                        onClick={() => { navigate('/alerts'); setOpen(false); }}
                        className="text-[14px] font-medium text-primary hover:text-primary/80 transition-colors"
                      >
                        View all in Risk Alerts →
                      </button>
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </header>

        {/* Page content */}
        <div className="flex-1 overflow-y-auto p-6 lg:p-8">{children}</div>
      </main>
    </div>
  );
}
