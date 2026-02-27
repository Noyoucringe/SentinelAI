import { ShieldAlert, User, Clock, AlertTriangle, ChevronRight, TrendingUp, Zap } from 'lucide-react';
import { useDetection } from '@/context/DetectionContext';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { useState, useMemo, useEffect } from 'react';
import { useLocation } from 'react-router-dom';

export default function EntityProfile() {
  const { liveResult } = useDetection();
  const topUsers = liveResult?.topRiskUsers ?? [];
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const location = useLocation();

  // Auto-select user when navigated from search
  useEffect(() => {
    const navUserId = (location.state as any)?.userId;
    if (navUserId && topUsers.some((u) => u.userId === navUserId)) {
      setSelectedUserId(navUserId);
      // Clear the state so refreshing doesn't re-trigger
      window.history.replaceState({}, '');
    }
  }, [location.state, topUsers]);

  // Determine which user to show: selected or first
  const activeUser = useMemo(() => {
    if (selectedUserId) return topUsers.find((u) => u.userId === selectedUserId) ?? topUsers[0] ?? null;
    return topUsers[0] ?? null;
  }, [selectedUserId, topUsers]);

  const alertsForUser = useMemo(
    () => (activeUser ? liveResult?.alerts.filter((a) => a.userId === activeUser.userId) ?? [] : []),
    [activeUser, liveResult]
  );

  // Map timestamp → all risk reasons from eventRisk for richer timeline entries
  const reasonsByTimestamp = useMemo(() => {
    if (!activeUser || !liveResult) return new Map<string, string[]>();
    const map = new Map<string, string[]>();
    for (const ev of liveResult.eventRisk) {
      if (ev.userId === activeUser.userId) {
        map.set(ev.timestamp, ev.reasons);
      }
    }
    return map;
  }, [activeUser, liveResult]);

  // Compute extra profile stats for the active user
  const profileStats = useMemo(() => {
    if (!activeUser || !alertsForUser.length) return null;
    const highCount = alertsForUser.filter((a) => a.severity === 'high').length;
    const medCount = alertsForUser.filter((a) => a.severity === 'medium').length;
    const lowCount = alertsForUser.filter((a) => a.severity === 'low').length;
    const avgScore = Math.round(alertsForUser.reduce((s, a) => s + a.score, 0) / alertsForUser.length);

    // Gather unique risk reasons from eventRisk
    const userEvents = liveResult?.eventRisk.filter((e) => e.userId === activeUser.userId) ?? [];
    const reasonCounts = new Map<string, number>();
    for (const ev of userEvents) {
      for (const r of ev.reasons) {
        const key = r.length > 60 ? r.slice(0, 57) + '...' : r;
        reasonCounts.set(key, (reasonCounts.get(key) ?? 0) + 1);
      }
    }
    const topReasons = [...reasonCounts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 4)
      .map(([reason, count]) => ({ reason, count }));

    return { highCount, medCount, lowCount, avgScore, topReasons };
  }, [activeUser, alertsForUser, liveResult]);

  return (
    <div className="page-container space-y-8">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
        <h1 className="text-4xl font-extrabold text-text-primary tracking-tight">Identity Profiles</h1>
        <p className="text-lg text-text-secondary mt-1">Entity-centric view for suspected identity theft behavior and response context.</p>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* User Selector */}
        <motion.section
          className="glow-card p-4 overflow-hidden flex flex-col"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.05, duration: 0.5 }}
        >
          <span className="text-[17px] font-bold uppercase tracking-widest text-text-muted mb-4">Risk Users ({topUsers.length})</span>
          <div className="flex-1 overflow-y-auto space-y-1.5 max-h-[590px]">
            {topUsers.length ? (
              topUsers.map((user, i) => (
                <button
                  key={user.userId}
                  onClick={() => setSelectedUserId(user.userId)}
                  className={cn(
                    'w-full flex items-center gap-3 p-3 rounded-xl text-left transition-all',
                    activeUser?.userId === user.userId
                      ? 'bg-primary/8 border border-primary/20'
                      : 'bg-bg-dark/30 border border-transparent hover:border-border-hover'
                  )}
                >
                  <span className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center text-[18px] font-mono font-bold text-primary shrink-0">
                    {i + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-lg font-semibold text-text-primary truncate">{user.userId}</p>
                    <p className="text-[17px] text-text-muted">{user.alertCount} alert{user.alertCount !== 1 ? 's' : ''}</p>
                  </div>
                  <span className={cn(
                    'text-lg font-mono font-bold px-2 py-0.5 rounded-lg shrink-0',
                    user.maxScore >= 80 ? 'badge-high' : user.maxScore >= 55 ? 'badge-medium' : 'badge-low'
                  )}>
                    {user.maxScore}
                  </span>
                  {activeUser?.userId === user.userId && <ChevronRight className="w-3.5 h-3.5 text-primary shrink-0" />}
                </button>
              ))
            ) : (
              <div className="py-12 text-center text-lg text-text-muted">
                <User className="w-8 h-8 text-text-muted mx-auto mb-3 opacity-30" />
                Run detection first
              </div>
            )}
          </div>
        </motion.section>

        {/* Profile Card */}
        <motion.section
          className="glow-card p-6"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1, duration: 0.5 }}
        >
          <div className="flex items-center justify-between mb-6">
            <span className="text-[17px] font-bold uppercase tracking-widest text-text-muted">Selected Profile</span>
            <ShieldAlert className="w-4 h-4 text-primary" />
          </div>

          <AnimatePresence mode="wait">
            {activeUser ? (
              <motion.div key={activeUser.userId} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary/20 to-critical/20 flex items-center justify-center border border-primary/10">
                    <User className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <p className="text-2xl font-extrabold text-text-primary">{activeUser.userId}</p>
                    <p className="text-lg text-text-muted mt-0.5">
                      {activeUser === topUsers[0] ? 'Highest risk identity' : 'Risk identity'}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 mb-4">
                  <div className="rounded-xl bg-bg-dark/40 border border-border p-3 text-center">
                    <p className="text-3xl font-extrabold text-critical">{activeUser.maxScore}</p>
                    <p className="text-[17px] font-mono text-text-muted uppercase mt-1">Max Score</p>
                  </div>
                  <div className="rounded-xl bg-bg-dark/40 border border-border p-3 text-center">
                    <p className="text-3xl font-extrabold text-warning">{activeUser.alertCount}</p>
                    <p className="text-[17px] font-mono text-text-muted uppercase mt-1">Alerts</p>
                  </div>
                </div>

                {profileStats && (
                  <>
                    {/* Severity Breakdown */}
                    <div className="rounded-xl bg-bg-dark/40 border border-border p-3 mb-4">
                      <span className="text-[17px] font-mono font-bold uppercase tracking-widest text-text-muted flex items-center gap-1.5 mb-3">
                        <TrendingUp className="w-3.5 h-3.5" /> Severity Split
                      </span>
                      <div className="space-y-2">
                        {[
                          { label: 'High', count: profileStats.highCount, color: '#ff4d6a', pct: Math.round((profileStats.highCount / activeUser.alertCount) * 100) },
                          { label: 'Medium', count: profileStats.medCount, color: '#ffb347', pct: Math.round((profileStats.medCount / activeUser.alertCount) * 100) },
                          { label: 'Low', count: profileStats.lowCount, color: '#06d6a0', pct: Math.round((profileStats.lowCount / activeUser.alertCount) * 100) },
                        ].filter((r) => r.count > 0).map((row) => (
                          <div key={row.label} className="flex items-center gap-2">
                            <span className="text-[16px] font-mono font-bold w-12" style={{ color: row.color }}>{row.label}</span>
                            <div className="flex-1 h-1.5 rounded-full bg-bg-dark overflow-hidden">
                              <motion.div
                                className="h-full rounded-full"
                                initial={{ width: 0 }}
                                animate={{ width: `${row.pct}%` }}
                                transition={{ duration: 0.6 }}
                                style={{ background: row.color }}
                              />
                            </div>
                            <span className="text-[16px] font-mono font-bold text-text-muted w-8 text-right">{row.count}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Top Risk Reasons */}
                    {profileStats.topReasons.length > 0 && (
                      <div className="rounded-xl bg-bg-dark/40 border border-border p-3">
                        <span className="text-[17px] font-mono font-bold uppercase tracking-widest text-text-muted flex items-center gap-1.5 mb-3">
                          <Zap className="w-3.5 h-3.5" /> Top Risk Factors
                        </span>
                        <div className="space-y-2">
                          {profileStats.topReasons.map((r, i) => (
                            <motion.div
                              key={i}
                              initial={{ opacity: 0, x: -6 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: i * 0.06 }}
                              className="flex items-start gap-2"
                            >
                              <span className="w-5 h-5 rounded bg-primary/10 flex items-center justify-center text-[15px] font-mono font-bold text-primary shrink-0 mt-0.5">
                                {r.count}
                              </span>
                              <p className="text-[17px] text-text-secondary leading-snug">{r.reason}</p>
                            </motion.div>
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                )}

              </motion.div>
            ) : (
              <div className="py-12 text-center text-lg text-text-muted">
                <User className="w-8 h-8 text-text-muted mx-auto mb-3 opacity-30" />
                No profile yet
              </div>
            )}
          </AnimatePresence>
        </motion.section>

        {/* Behavior Timeline */}
        <motion.section
          className="lg:col-span-2 glow-card overflow-hidden flex flex-col"
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2, duration: 0.5 }}
        >
          <div className="px-6 py-4 border-b border-border flex items-center justify-between">
            <div className="section-header mb-0">
              <div className="section-icon"><Clock className="w-4 h-4" /></div>
              <h3>Behavior Timeline</h3>
            </div>
            <span className="text-[17px] font-mono text-text-muted">
              {alertsForUser.length} event{alertsForUser.length !== 1 ? 's' : ''}
              {activeUser && <span className="text-primary ml-1.5">· {activeUser.userId}</span>}
            </span>
          </div>

          <div className="flex-1 overflow-y-auto max-h-[600px]">
            <AnimatePresence mode="wait">
              {alertsForUser.length ? (
                <motion.div key={activeUser?.userId} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  {alertsForUser.map((alert, i) => {
                    const allReasons = reasonsByTimestamp.get(alert.timestamp) ?? [];
                    return (
                    <motion.div
                      key={alert.id}
                      initial={{ opacity: 0, x: 10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.05 }}
                      className="px-6 py-5 border-b border-border hover:bg-[rgba(255,255,255,0.015)] transition-colors"
                    >
                      <div className="flex items-start gap-4">
                        <div className={cn(
                          'w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5',
                          alert.severity === 'high' ? 'bg-critical/10' : alert.severity === 'medium' ? 'bg-warning/10' : 'bg-accent/10'
                        )}>
                          <AlertTriangle className={cn('w-4 h-4', alert.severity === 'high' ? 'text-critical' : alert.severity === 'medium' ? 'text-warning' : 'text-accent')} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <p className="text-lg font-bold text-text-primary">{alert.title}</p>
                            <span className={cn('text-lg font-mono font-bold px-2 py-0.5 rounded-lg', alert.severity === 'high' ? 'badge-high' : alert.severity === 'medium' ? 'badge-medium' : 'badge-low')}>
                              {alert.score}
                            </span>
                          </div>
                          <p className="text-lg text-text-secondary mt-1">{alert.description}</p>

                          {/* All risk reasons as pills */}
                          {allReasons.length > 1 && (
                            <div className="flex flex-wrap gap-1.5 mt-2.5">
                              {allReasons.map((reason, ri) => (
                                <span
                                  key={ri}
                                  className={cn(
                                    'inline-flex items-center text-[15px] font-mono font-semibold px-2 py-0.5 rounded-md border',
                                    alert.severity === 'high'
                                      ? 'bg-critical/5 border-critical/15 text-critical'
                                      : alert.severity === 'medium'
                                        ? 'bg-warning/5 border-warning/15 text-warning'
                                        : 'bg-accent/5 border-accent/15 text-accent'
                                  )}
                                >
                                  {reason.length > 50 ? reason.slice(0, 47) + '...' : reason}
                                </span>
                              ))}
                            </div>
                          )}

                          <p className="text-[18px] font-mono text-text-muted mt-2.5">{alert.timestamp}</p>
                        </div>
                      </div>
                    </motion.div>
                    );
                  })}
                </motion.div>
              ) : (
                <div className="px-6 py-16 text-center text-lg text-text-muted">
                  {topUsers.length
                    ? 'Select a user to view their behavior timeline.'
                    : 'No profile timeline available yet.'}
                </div>
              )}
            </AnimatePresence>
          </div>
        </motion.section>
      </div>
    </div>
  );
}
