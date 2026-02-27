import { useState, useMemo, useCallback, useEffect } from 'react';
import { Clock, ShieldAlert, Filter, ChevronRight, AlertTriangle, Flame, MapPin, Smartphone, Wifi, Timer, Lock, Fingerprint, ShieldCheck, ShieldQuestion, CheckCircle2, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useDetection } from '@/context/DetectionContext';
import { motion, AnimatePresence } from 'framer-motion';
import { useLocation } from 'react-router-dom';

/* ── Risk keyword → visual category mapping ────────────────────── */
const RISK_CATEGORIES: { pattern: RegExp; label: string; color: string; bg: string; icon: React.ElementType }[] = [
  { pattern: /impossible travel/i, label: 'Impossible Travel', color: '#ff4d6a', bg: 'rgba(255,77,106,0.12)', icon: MapPin },
  { pattern: /geolocation|spoofed/i, label: 'Geo Spoofing', color: '#ff4d6a', bg: 'rgba(255,77,106,0.12)', icon: MapPin },
  { pattern: /device switching/i, label: 'Device Switch', color: '#ffb347', bg: 'rgba(255,179,71,0.12)', icon: Smartphone },
  { pattern: /missing device/i, label: 'No Device', color: '#ffb347', bg: 'rgba(255,179,71,0.12)', icon: Fingerprint },
  { pattern: /off-hours/i, label: 'Off-Hours', color: '#a78bfa', bg: 'rgba(167,139,250,0.12)', icon: Clock },
  { pattern: /failed auth/i, label: 'Auth Failure', color: '#ff4d6a', bg: 'rgba(255,77,106,0.12)', icon: Lock },
  { pattern: /IP reputation|IP shift/i, label: 'IP Anomaly', color: '#ffb347', bg: 'rgba(255,179,71,0.12)', icon: Wifi },
  { pattern: /login burst|burst freq/i, label: 'Login Burst', color: '#ffb347', bg: 'rgba(255,179,71,0.12)', icon: Timer },
];

function categorize(reason: string) {
  return RISK_CATEGORIES.find((c) => c.pattern.test(reason));
}

/** Highlight risky keywords inside a text string */
function HighlightedText({ text, severity }: { text: string; severity: 'high' | 'medium' | 'low' }) {
  const keywords = [
    'impossible travel', 'spoofed', 'geolocation', 'device switching', 'missing device',
    'off-hours', 'failed authentication', 'IP reputation', 'login burst', 'burst frequency',
    'rapid', 'invalid', 'unusual',
    'anomalous', 'sensitive', 'restricted', 'multi-factor', 'mfa disabled',
    'failed login', 'incident', 'password reset', 'failed transaction',
    'inconsistent device', 'inconsistent.*location', 'login.*consistency',
  ];

  const regex = new RegExp(`(${keywords.join('|')})`, 'gi');
  const parts = text.split(regex);
  const highlight = severity === 'high' ? 'bg-critical/15 text-critical' : severity === 'medium' ? 'bg-[#ffb347]/15 text-[#ffb347]' : 'bg-accent/15 text-accent';

  return (
    <span>
      {parts.map((part, i) =>
        regex.test(part) ? (
          <mark key={i} className={cn('px-1 py-0.5 rounded font-semibold', highlight)}>
            {part}
          </mark>
        ) : (
          <span key={i}>{part}</span>
        )
      )}
    </span>
  );
}

export default function AlertCenter() {
  const { liveResult, settings } = useDetection();
  const alerts = liveResult?.alerts ?? [];
  const eventRisk = liveResult?.eventRisk ?? [];
  const [selectedIdx, setSelectedIdx] = useState(0);
  const [filter, setFilter] = useState<'all' | 'high' | 'medium' | 'low'>('all');
  const location = useLocation();

  // Auto-select alert when navigated from search
  useEffect(() => {
    const navAlertId = (location.state as any)?.alertId;
    if (navAlertId && alerts.length > 0) {
      // Find the alert's severity so we can switch filter if needed
      const targetAlert = alerts.find((a) => a.id === navAlertId);
      if (targetAlert) {
        // Reset filter to 'all' so the alert is visible in the list
        setFilter('all');
        const idx = alerts.findIndex((a) => a.id === navAlertId);
        if (idx >= 0) setSelectedIdx(idx);
      }
      window.history.replaceState({}, '');
    }
  }, [location.state, alerts]);

  // Step-up verification state
  const stepUpVerify = localStorage.getItem('sentinel_stepUpVerify') !== 'false'; // default true
  const [verifiedAlerts, setVerifiedAlerts] = useState<Set<string>>(() => {
    try {
      const stored = localStorage.getItem('sentinel_verifiedAlerts');
      return stored ? new Set(JSON.parse(stored)) : new Set();
    } catch { return new Set(); }
  });
  const [verifyingAlert, setVerifyingAlert] = useState<string | null>(null);

  const markVerified = useCallback((alertId: string) => {
    setVerifyingAlert(alertId);
    // Simulate a verification process (MFA / identity check)
    setTimeout(() => {
      setVerifiedAlerts((prev) => {
        const next = new Set(prev);
        next.add(alertId);
        localStorage.setItem('sentinel_verifiedAlerts', JSON.stringify([...next]));
        return next;
      });
      setVerifyingAlert(null);
    }, 1800);
  }, []);

  const filtered = filter === 'all' ? alerts : alerts.filter((a) => a.severity === filter);
  const selected = filtered[selectedIdx] ?? null;

  // Get ALL risk reasons for the selected alert (cross-reference eventRisk)
  const selectedReasons = useMemo(() => {
    if (!selected) return [];
    const match = eventRisk.find(
      (e) => e.userId === selected.userId && e.timestamp === selected.timestamp
    );
    return match?.reasons ?? [selected.description];
  }, [selected, eventRisk]);

  return (
    <div className="page-container">
      {/* Header */}
      <motion.div className="mb-8" initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-extrabold text-text-primary tracking-tight">Risk Alerts</h1>
            <p className="text-lg text-text-secondary mt-1">Anomaly-driven identity theft alerts ranked by severity.</p>
          </div>
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-text-muted" />
            {(['all', 'high', 'medium', 'low'] as const).map((f) => (
              <button
                key={f}
                onClick={() => { setFilter(f); setSelectedIdx(0); }}
                className={cn(
                  'px-3 py-1.5 rounded-lg text-[18px] font-semibold uppercase tracking-wider transition-all',
                  filter === f
                    ? f === 'high' ? 'badge-high' : f === 'medium' ? 'badge-medium' : f === 'low' ? 'badge-low' : 'bg-primary/10 text-primary border border-primary/20'
                    : 'text-text-muted hover:text-text-secondary border border-transparent'
                )}
              >
                {f}
              </button>
            ))}
          </div>
        </div>
      </motion.div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 h-[calc(100vh-12rem)]">
        {/* Alert List */}
        <motion.section
          className="glow-card overflow-hidden flex flex-col"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1, duration: 0.5 }}
        >
          <div className="px-5 py-4 border-b border-border flex items-center justify-between">
            <span className="text-lg font-bold uppercase tracking-wider text-text-muted">
              {filtered.length} Alert{filtered.length !== 1 ? 's' : ''}
            </span>
            <span className="text-[17px] font-mono text-text-muted">SCORE</span>
          </div>

          <div className="flex-1 overflow-y-auto">
            {filtered.length ? (
              filtered.map((alert, index) => (
                <button
                  key={alert.id}
                  onClick={() => setSelectedIdx(index)}
                  className={cn(
                    'w-full text-left px-5 py-4 border-b border-border transition-all flex items-center gap-4',
                    index === selectedIdx
                      ? 'bg-primary/5 border-l-2 border-l-primary'
                      : 'border-l-2 border-l-transparent hover:bg-[rgba(255,255,255,0.02)]'
                  )}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-[17px] font-mono font-bold text-primary">{alert.id}</span>
                      <span className={cn('px-1.5 py-0.5 rounded text-[13px] font-bold uppercase', alert.severity === 'high' ? 'badge-high' : alert.severity === 'medium' ? 'badge-medium' : 'badge-low')}>
                        {alert.severity}
                      </span>
                      {stepUpVerify && alert.severity === 'medium' && (
                        verifiedAlerts.has(alert.id)
                          ? <ShieldCheck className="w-4 h-4 text-accent" title="Verified" />
                          : <ShieldQuestion className="w-4 h-4 text-[#ffb347] animate-pulse" title="Verification required" />
                      )}
                    </div>
                    <p className="text-lg font-semibold text-text-primary mt-1 truncate">{alert.userId}</p>
                    <p className="text-lg text-text-muted mt-0.5 truncate">{alert.title}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className={cn('text-lg font-mono font-bold', alert.score >= settings.criticalThreshold ? 'text-critical' : alert.score >= settings.warningThreshold ? 'text-warning' : 'text-accent')}>
                      {alert.score}
                    </span>
                    <ChevronRight className="w-3.5 h-3.5 text-text-muted" />
                  </div>
                </button>
              ))
            ) : (
              <div className="px-5 py-12 text-center text-lg text-text-muted">
                {alerts.length ? 'No alerts match this filter.' : 'No alerts yet. Run anomaly detection from Identity Signals.'}
              </div>
            )}
          </div>
        </motion.section>

        {/* Alert Detail */}
        <motion.section
          className="xl:col-span-2 glow-card overflow-hidden flex flex-col"
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2, duration: 0.5 }}
        >
          <div className="px-6 py-4 border-b border-border">
            <h3 className="text-lg font-bold uppercase tracking-wider text-text-muted">Alert Detail</h3>
          </div>

          <AnimatePresence mode="wait">
            {selected ? (
              <motion.div
                key={selected.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="p-6 space-y-6 overflow-y-auto flex-1"
              >
                {/* Title section */}
                <div className="flex items-start justify-between">
                  <div>
                    <span className="text-[18px] font-mono font-bold text-primary">{selected.id}</span>
                    <h4 className="text-3xl font-extrabold text-text-primary mt-1 tracking-tight">{selected.title}</h4>
                  </div>
                  <div className={cn('px-4 py-2 rounded-xl text-lg font-mono font-bold', selected.severity === 'high' ? 'badge-high' : selected.severity === 'medium' ? 'badge-medium' : 'badge-low')}>
                    Score {selected.score}
                  </div>
                </div>

                {/* Severity Meter */}
                <div className="rounded-xl border border-border bg-bg-dark/40 p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[17px] font-bold uppercase tracking-widest text-text-muted">Risk Level</span>
                    <span className={cn(
                      'text-lg font-mono font-bold',
                      selected.score >= settings.criticalThreshold ? 'text-critical' : selected.score >= settings.warningThreshold ? 'text-[#ffb347]' : 'text-accent'
                    )}>
                      {selected.score >= settings.criticalThreshold ? 'CRITICAL' : selected.score >= settings.warningThreshold ? 'WARNING' : 'LOW'}
                    </span>
                  </div>
                  <div className="relative h-2.5 w-full rounded-full bg-bg-dark overflow-hidden">
                    <motion.div
                      className="absolute inset-y-0 left-0 rounded-full"
                      initial={{ width: 0 }}
                      animate={{ width: `${selected.score}%` }}
                      transition={{ duration: 0.8, ease: 'easeOut' }}
                      style={{
                        background: selected.score >= settings.criticalThreshold
                          ? 'linear-gradient(90deg, #ff4d6a, #ff1a40)'
                          : selected.score >= settings.warningThreshold
                            ? 'linear-gradient(90deg, #ffb347, #ff8c00)'
                            : 'linear-gradient(90deg, #06d6a0, #04b890)',
                      }}
                    />
                    {/* Pulsing dot at the end */}
                    <motion.div
                      className="absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full shadow-lg"
                      animate={{ scale: [1, 1.3, 1], opacity: [1, 0.7, 1] }}
                      transition={{ duration: 1.5, repeat: Infinity }}
                      style={{
                        left: `calc(${selected.score}% - 6px)`,
                        background: selected.score >= settings.criticalThreshold ? '#ff4d6a' : selected.score >= settings.warningThreshold ? '#ffb347' : '#06d6a0',
                        boxShadow: `0 0 12px ${selected.score >= settings.criticalThreshold ? '#ff4d6a' : selected.score >= settings.warningThreshold ? '#ffb347' : '#06d6a0'}`,
                      }}
                    />
                  </div>
                </div>

                {/* Detail cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <DetailCard icon={<ShieldAlert className="w-4 h-4 text-primary" />} label="Identity" value={selected.userId} />
                  <DetailCard icon={<Clock className="w-4 h-4 text-primary" />} label="Timestamp" value={selected.timestamp} />
                  <DetailCard icon={<ShieldAlert className="w-4 h-4 text-primary" />} label="Severity" value={selected.severity.toUpperCase()} />
                </div>

                {/* Step-up Verification Banner (medium risk only, when enabled) */}
                {stepUpVerify && selected.severity === 'medium' && (
                  <motion.div
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={cn(
                      'rounded-xl border p-5 flex items-center gap-4',
                      verifiedAlerts.has(selected.id)
                        ? 'border-[rgba(6,214,160,0.25)] bg-[rgba(6,214,160,0.04)]'
                        : 'border-[rgba(255,179,71,0.25)] bg-[rgba(255,179,71,0.04)]'
                    )}
                  >
                    {verifiedAlerts.has(selected.id) ? (
                      <>
                        <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center shrink-0">
                          <ShieldCheck className="w-5 h-5 text-accent" />
                        </div>
                        <div className="flex-1">
                          <p className="text-lg font-bold text-accent">Identity Verified</p>
                          <p className="text-base text-text-muted mt-0.5">
                            Step-up verification completed. Additional identity checks passed for this medium-risk event.
                          </p>
                        </div>
                        <CheckCircle2 className="w-5 h-5 text-accent shrink-0" />
                      </>
                    ) : (
                      <>
                        <div className="w-10 h-10 rounded-xl bg-[#ffb347]/10 flex items-center justify-center shrink-0">
                          <ShieldQuestion className="w-5 h-5 text-[#ffb347]" />
                        </div>
                        <div className="flex-1">
                          <p className="text-lg font-bold text-[#ffb347]">Step-up Verification Required</p>
                          <p className="text-base text-text-muted mt-0.5">
                            This medium-risk alert requires additional identity verification (MFA / biometric check) before clearance.
                          </p>
                        </div>
                        <button
                          onClick={() => markVerified(selected.id)}
                          disabled={verifyingAlert === selected.id}
                          className={cn(
                            'shrink-0 px-4 py-2 rounded-xl text-base font-bold uppercase tracking-wider transition-all',
                            verifyingAlert === selected.id
                              ? 'bg-[#ffb347]/10 text-[#ffb347] cursor-wait'
                              : 'bg-[#ffb347]/15 text-[#ffb347] hover:bg-[#ffb347]/25 border border-[#ffb347]/20'
                          )}
                        >
                          {verifyingAlert === selected.id ? (
                            <span className="flex items-center gap-2">
                              <Loader2 className="w-4 h-4 animate-spin" /> Verifying...
                            </span>
                          ) : (
                            'Verify Identity'
                          )}
                        </button>
                      </>
                    )}
                  </motion.div>
                )}

                {/* ── Risk Factor Breakdown (highlighted) ── */}
                <div className="rounded-xl border border-border bg-bg-dark/40 overflow-hidden">
                  <div className="px-5 py-3 border-b border-border flex items-center gap-2">
                    <Flame className="w-4 h-4 text-critical" />
                    <span className="text-[17px] font-bold uppercase tracking-widest text-text-muted">
                      Risk Factors ({selectedReasons.length})
                    </span>
                  </div>
                  <div className="p-4 space-y-3">
                    {selectedReasons.map((reason, i) => {
                      const cat = categorize(reason);
                      const CatIcon = cat?.icon ?? AlertTriangle;
                      return (
                        <motion.div
                          key={i}
                          initial={{ opacity: 0, x: -8 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: i * 0.08 }}
                          className="flex items-start gap-3 rounded-xl p-3 transition-all"
                          style={{
                            background: cat?.bg ?? 'rgba(124,92,252,0.06)',
                            border: `1px solid ${cat?.color ?? '#7c5cfc'}22`,
                          }}
                        >
                          <div
                            className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5"
                            style={{ background: `${cat?.color ?? '#7c5cfc'}18` }}
                          >
                            <CatIcon className="w-4 h-4" style={{ color: cat?.color ?? '#7c5cfc' }} />
                          </div>
                          <div className="flex-1 min-w-0">
                            {cat && (
                              <span
                                className="inline-block text-[13px] font-mono font-bold uppercase tracking-widest px-1.5 py-0.5 rounded mb-1.5"
                                style={{ background: cat.bg, color: cat.color }}
                              >
                                {cat.label}
                              </span>
                            )}
                            <p className="text-lg text-text-secondary leading-relaxed">
                              <HighlightedText text={reason} severity={selected.severity as 'high' | 'medium' | 'low'} />
                            </p>
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                </div>

                {/* Detection Explanation */}
                <div className="rounded-xl border border-border bg-bg-dark/40 p-5">
                  <p className="text-[17px] font-bold uppercase tracking-widest text-text-muted mb-3">Detection Summary</p>
                  <p className="text-lg text-text-secondary leading-relaxed">
                    <HighlightedText
                      text={`${selected.description}. This alert triggered ${selectedReasons.length} risk factor${selectedReasons.length !== 1 ? 's' : ''} with a composite anomaly score of ${selected.score}/100, classified as ${selected.severity === 'high' ? 'CRITICAL' : selected.severity === 'medium' ? 'WARNING' : 'LOW'} severity.`}
                      severity={selected.severity as 'high' | 'medium' | 'low'}
                    />
                  </p>
                </div>

              </motion.div>
            ) : (
              <div className="p-6 flex-1 flex items-center justify-center text-lg text-text-muted">
                Select an alert to view details.
              </div>
            )}
          </AnimatePresence>
        </motion.section>
      </div>
    </div>
  );
}

function DetailCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border bg-bg-dark/40 p-4">
      <div className="flex items-center gap-2 text-[17px] font-bold uppercase tracking-widest text-text-muted mb-2">
        {icon} {label}
      </div>
      <p className="text-lg font-semibold text-text-primary">{value}</p>
    </div>
  );
}
