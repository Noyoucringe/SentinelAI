import {
  AlertCircle,
  AlertTriangle,
  BrainCircuit,
  CheckCircle,
  ChevronDown,
  ChevronUp,
  Columns3,
  Database,
  FileText,
  Flame,
  Lock,
  MapPin,
  Plus,
  Shield,
  Smartphone,
  Trash2,
  Upload,
  ArrowRight,
  Sparkles,
  Timer,
  TrendingUp,
  Users,
  Wifi,
  X,
  Zap,
  Clock,
  Fingerprint,
} from 'lucide-react';
import React, { useRef, useState, type DragEventHandler } from 'react';
import { cn } from '@/lib/utils';
import { useDetection } from '@/context/DetectionContext';
import { generateSampleDataset } from '@/lib/sampleData';
import { motion, AnimatePresence } from 'framer-motion';

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
function HighlightRisk({ text, level }: { text: string; level: 'high' | 'medium' }) {
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
  const highlight = level === 'high' ? 'bg-critical/15 text-critical' : 'bg-[#ffb347]/15 text-[#ffb347]';

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

const EMPTY_FORM = {
  user_id: '',
  timestamp: '',
  lat: '',
  long: '',
  device_id: '',
  ip_address: '',
  login_result: 'success',
};

export default function DataIngest() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [showManualForm, setShowManualForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [alertLimit, setAlertLimit] = useState(10);
  const [riskFilter, setRiskFilter] = useState<'all' | 'high' | 'medium'>('all');
  const [alertSort, setAlertSort] = useState<'default' | 'score-desc' | 'score-asc'>('default');
  const [expandedRow, setExpandedRow] = useState<number | null>(null);
  const [showLowRisk, setShowLowRisk] = useState(false);

  const {
    uploadFile,
    loadEvents,
    addEvent,
    parseError,
    datasetInfo,
    events,
    runDetection,
    liveResult: detectionResult,
    settings,
    clearDataset,
  } = useDetection();

  const onDrop: DragEventHandler<HTMLDivElement> = async (event) => {
    event.preventDefault();
    setDragging(false);
    const droppedFile = event.dataTransfer.files?.[0];
    if (droppedFile) {
      await uploadFile(droppedFile);
    }
  };

  const handleLoadSample = () => {
    const sample = generateSampleDataset(80);
    loadEvents(sample, 'sample-login-activity.csv');
  };

  const handleAddManualEntry = () => {
    if (!form.user_id.trim() || !form.timestamp.trim()) return;
    addEvent({
      rowId: 0, // will be overridden by context
      user_id: form.user_id.trim(),
      timestamp: form.timestamp.trim(),
      lat: parseFloat(form.lat) || 0,
      long: parseFloat(form.long) || 0,
      device_id: form.device_id.trim(),
      ip_address: form.ip_address.trim() || undefined,
      login_result: form.login_result || undefined,
      extra: {},
    });
    setForm(EMPTY_FORM);
  };

  const previewRows = events.slice(0, 8);

  return (
    <div className="page-container space-y-8">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
        <h1 className="text-3xl font-extrabold text-text-primary tracking-tight">Identity Signals</h1>
        <p className="text-sm text-text-secondary mt-1">
          Upload login activity data, load a sample dataset, or manually add entries — then run anomaly detection.
        </p>
      </motion.div>

      {/* === Input Methods === */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Upload Zone */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.5 }}
          onClick={() => inputRef.current?.click()}
          onDragOver={(event) => {
            event.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
          className={cn('upload-zone p-8 cursor-pointer', dragging && 'dragging')}
        >
          <div className="flex flex-col items-center text-center gap-3">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center border border-primary/10">
              <Upload className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h2 className="text-base font-bold text-text-primary">Upload Dataset</h2>
              <p className="text-sm text-text-muted mt-1">Drop file or click to browse</p>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-2 mt-1">
              {['.csv', '.json', '.pdf'].map((fmt) => (
                <span
                  key={fmt}
                  className="px-2.5 py-1 rounded-lg bg-primary/8 border border-primary/15 text-[13px] font-mono font-bold text-primary uppercase"
                >
                  {fmt}
                </span>
              ))}
            </div>
            <div className="flex flex-wrap items-center justify-center gap-1.5 mt-1">
              {['user_id', 'timestamp', 'lat', 'long', 'device_id'].map((col) => (
                <span
                  key={col}
                  className="px-2 py-0.5 rounded-md bg-bg-dark/60 border border-border text-[13px] font-mono text-text-muted"
                >
                  {col}
                </span>
              ))}
            </div>
            <input
              ref={inputRef}
              type="file"
              accept=".csv,.json,.pdf,text/csv,application/json,application/pdf"
              className="hidden"
              onChange={async (event) => {
                const selected = event.target.files?.[0];
                if (selected) await uploadFile(selected);
                event.currentTarget.value = '';
              }}
            />
          </div>
        </motion.div>

        {/* Sample Dataset Loader */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15, duration: 0.5 }}
          className="glow-card p-8 flex flex-col items-center text-center gap-4"
        >
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#ffb347]/20 to-[#ffb347]/5 flex items-center justify-center border border-[#ffb347]/15">
            <Database className="w-6 h-6 text-[#ffb347]" />
          </div>
          <div>
            <h2 className="text-base font-bold text-text-primary">Sample Dataset</h2>
            <p className="text-sm text-text-muted mt-1">
              Load 80 realistic login events with pre-built suspicious patterns
            </p>
          </div>
          <button onClick={handleLoadSample} className="btn-primary w-full py-3 mt-auto">
            <Sparkles className="w-4 h-4" />
            Load Sample Data
          </button>
        </motion.div>

        {/* Manual Entry Toggle */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.5 }}
          className="glow-card p-8 flex flex-col items-center text-center gap-4"
        >
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-accent/20 to-accent/5 flex items-center justify-center border border-accent/15">
            <Plus className="w-6 h-6 text-accent" />
          </div>
          <div>
            <h2 className="text-base font-bold text-text-primary">Manual Entry</h2>
            <p className="text-sm text-text-muted mt-1">
              Add individual login events with custom fields
            </p>
          </div>
          <button
            onClick={() => setShowManualForm(!showManualForm)}
            className="btn-ghost w-full py-3 mt-auto"
          >
            {showManualForm ? 'Hide Form' : 'Add Entry'}
          </button>
        </motion.div>
      </div>

      {/* === Remove Dataset Button === */}
      <AnimatePresence>
        {datasetInfo && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="glow-card px-5 py-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-critical/10 flex items-center justify-center border border-critical/15">
                  <Database className="w-4 h-4 text-critical" />
                </div>
                <div>
                  <p className="text-sm font-bold text-text-primary">{datasetInfo.fileName}</p>
                  <p className="text-[13px] text-text-muted">
                    {events.length.toLocaleString()} rows · {datasetInfo.fileSizeLabel}
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  if (!window.confirm('Remove uploaded dataset and all detection results? This cannot be undone.')) return;
                  clearDataset();
                }}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold text-red-400 bg-red-500/8 border border-red-500/20 hover:bg-red-500/15 hover:text-red-300 hover:border-red-500/30 transition-all"
              >
                <Trash2 className="w-4 h-4" />
                Remove Dataset
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* === Manual Entry Form === */}
      <AnimatePresence>
        {showManualForm && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="glow-card p-6">
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-accent/10 flex items-center justify-center border border-accent/15">
                    <Plus className="w-4 h-4 text-accent" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-text-primary">Add Login Event</h3>
                    <p className="text-[14px] text-text-muted">Fill in the fields below and click Add</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowManualForm(false)}
                  className="p-2 rounded-lg text-text-muted hover:text-text-primary hover:bg-bg-elevated/30 transition-all"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <label className="block text-[14px] font-mono font-semibold uppercase tracking-widest text-text-muted mb-1.5">
                    User ID *
                  </label>
                  <input
                    value={form.user_id}
                    onChange={(e) => setForm({ ...form, user_id: e.target.value })}
                    placeholder="e.g. alice_j"
                    className="w-full rounded-xl border border-border bg-bg-dark/50 px-3.5 py-2.5 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20 transition-all font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[14px] font-mono font-semibold uppercase tracking-widest text-text-muted mb-1.5">
                    Timestamp *
                  </label>
                  <input
                    value={form.timestamp}
                    onChange={(e) => setForm({ ...form, timestamp: e.target.value })}
                    placeholder="2026-02-26 14:30:00"
                    className="w-full rounded-xl border border-border bg-bg-dark/50 px-3.5 py-2.5 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20 transition-all font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[14px] font-mono font-semibold uppercase tracking-widest text-text-muted mb-1.5">
                    Latitude
                  </label>
                  <input
                    value={form.lat}
                    onChange={(e) => setForm({ ...form, lat: e.target.value })}
                    placeholder="40.7128"
                    className="w-full rounded-xl border border-border bg-bg-dark/50 px-3.5 py-2.5 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20 transition-all font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[14px] font-mono font-semibold uppercase tracking-widest text-text-muted mb-1.5">
                    Longitude
                  </label>
                  <input
                    value={form.long}
                    onChange={(e) => setForm({ ...form, long: e.target.value })}
                    placeholder="-74.0060"
                    className="w-full rounded-xl border border-border bg-bg-dark/50 px-3.5 py-2.5 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20 transition-all font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[14px] font-mono font-semibold uppercase tracking-widest text-text-muted mb-1.5">
                    Device ID
                  </label>
                  <input
                    value={form.device_id}
                    onChange={(e) => setForm({ ...form, device_id: e.target.value })}
                    placeholder="Chrome-Win11"
                    className="w-full rounded-xl border border-border bg-bg-dark/50 px-3.5 py-2.5 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20 transition-all font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[14px] font-mono font-semibold uppercase tracking-widest text-text-muted mb-1.5">
                    IP Address
                  </label>
                  <input
                    value={form.ip_address}
                    onChange={(e) => setForm({ ...form, ip_address: e.target.value })}
                    placeholder="192.168.1.10"
                    className="w-full rounded-xl border border-border bg-bg-dark/50 px-3.5 py-2.5 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20 transition-all font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[14px] font-mono font-semibold uppercase tracking-widest text-text-muted mb-1.5">
                    Login Result
                  </label>
                  <select
                    value={form.login_result}
                    onChange={(e) => setForm({ ...form, login_result: e.target.value })}
                    className="w-full rounded-xl border border-border bg-bg-dark/50 px-3.5 py-2.5 text-sm text-text-primary focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20 transition-all font-mono appearance-none"
                  >
                    <option value="success">Success</option>
                    <option value="failed">Failed</option>
                  </select>
                </div>
                <div className="flex items-end">
                  <button
                    onClick={handleAddManualEntry}
                    disabled={!form.user_id.trim() || !form.timestamp.trim()}
                    className="btn-primary w-full py-2.5"
                  >
                    <Plus className="w-4 h-4" />
                    Add Event
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Error */}
      <AnimatePresence>
        {parseError && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="glow-card px-5 py-4 flex items-center gap-3 text-sm"
            style={{ borderColor: 'rgba(255,77,106,0.2)' }}
          >
            <AlertCircle className="w-4 h-4 text-critical shrink-0" />
            <span className="text-text-secondary">{parseError}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Column auto-mapping feedback */}
      <AnimatePresence>
        {datasetInfo?.columnMapping && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="glow-card overflow-hidden"
            style={{ borderColor: datasetInfo.columnMapping.defaults.length > 0 ? 'rgba(255,179,71,0.25)' : 'rgba(56,189,248,0.2)' }}
          >
            <div className="px-5 py-3.5 border-b border-border flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-primary/8 flex items-center justify-center border border-primary/10">
                <Columns3 className="w-4 h-4 text-primary" />
              </div>
              <div>
                <p className="text-sm font-bold text-text-primary">Column Auto-Mapping</p>
                <p className="text-[14px] text-text-muted">
                  {Object.keys(datasetInfo.columnMapping.mapped).length} columns mapped
                  {datasetInfo.columnMapping.defaults.length > 0 && ` · ${datasetInfo.columnMapping.defaults.length} using defaults`}
                  {datasetInfo.columnMapping.ignored.length > 0 && ` · ${datasetInfo.columnMapping.ignored.length} ignored`}
                </p>
              </div>
            </div>

            <div className="px-5 py-4 space-y-3">
              {/* Mapped columns */}
              <div className="flex flex-wrap gap-2">
                {Object.entries(datasetInfo.columnMapping.mapped).map(([field, original]) => {
                  const wasRenamed = original.toLowerCase().replace(/[^a-z0-9_]/g, '_') !== field;
                  return (
                    <div
                      key={field}
                      className={cn(
                        'inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-sm font-mono border',
                        wasRenamed
                          ? 'bg-sky-500/8 border-sky-500/20 text-sky-300'
                          : 'bg-emerald-500/8 border-emerald-500/20 text-emerald-300'
                      )}
                    >
                      {wasRenamed ? (
                        <>
                          <span className="opacity-60">{original}</span>
                          <ArrowRight className="w-3 h-3 opacity-40" />
                          <span className="font-semibold">{field}</span>
                        </>
                      ) : (
                        <>
                          <CheckCircle className="w-3 h-3 opacity-60" />
                          <span>{field}</span>
                        </>
                      )}
                    </div>
                  );
                })}

                {/* Defaults */}
                {datasetInfo.columnMapping.defaults.map((field) => (
                  <div
                    key={field}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-sm font-mono bg-amber-500/8 border border-amber-500/20 text-amber-300"
                  >
                    <AlertTriangle className="w-3 h-3 opacity-60" />
                    <span>{field}</span>
                    <span className="opacity-50 text-[13px]">default</span>
                  </div>
                ))}
              </div>

              {/* Ignored columns */}
              {datasetInfo.columnMapping.ignored.length > 0 && (
                <p className="text-[14px] text-text-muted">
                  <span className="opacity-60">Extra columns not used:</span>{' '}
                  {datasetInfo.columnMapping.ignored.join(', ')}
                </p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Data Preview + Detection Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Table */}
        <motion.section
          className="lg:col-span-2 glow-card overflow-hidden"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25, duration: 0.5 }}
        >
          <div className="px-5 py-4 border-b border-border flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/8 flex items-center justify-center border border-primary/10">
                <FileText className="w-4 h-4 text-primary" />
              </div>
              <div>
                <p className="text-sm font-bold text-text-primary">{datasetInfo?.fileName ?? 'No dataset loaded'}</p>
                <p className="text-[14px] text-text-muted">
                  {datasetInfo
                    ? `${datasetInfo.fileSizeLabel} · ${datasetInfo.uploadedAtLabel}`
                    : 'Upload CSV, load sample, or add entries manually'}
                </p>
              </div>
            </div>
            <span className="text-[14px] font-mono font-bold text-text-muted bg-bg-dark/50 px-3 py-1.5 rounded-lg border border-border">
              {events.length.toLocaleString()} rows
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>USER_ID</th>
                  <th>TIMESTAMP</th>
                  <th>LAT</th>
                  <th>LONG</th>
                  <th>DEVICE_ID</th>
                  <th>IP</th>
                  <th>RESULT</th>
                </tr>
              </thead>
              <tbody>
                {previewRows.length ? (
                  previewRows.map((row) => (
                    <tr key={row.rowId}>
                      <td className="text-text-muted">{row.rowId}</td>
                      <td className="text-text-primary font-medium">{row.user_id}</td>
                      <td>{row.timestamp}</td>
                      <td>{Number.isFinite(row.lat) && Math.abs(row.lat) <= 90 ? row.lat : '—'}</td>
                      <td>{Number.isFinite(row.long) && Math.abs(row.long) <= 180 ? row.long : '—'}</td>
                      <td>{row.device_id || '—'}</td>
                      <td>{row.ip_address || '—'}</td>
                      <td>
                        <span
                          className={cn(
                            'px-2 py-0.5 rounded-md text-[13px] font-mono font-bold uppercase',
                            row.login_result === 'failed'
                              ? 'bg-critical/10 text-critical'
                              : 'bg-accent/10 text-accent'
                          )}
                        >
                          {row.login_result || 'success'}
                        </span>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={8} className="text-center text-text-muted py-10">
                      No data loaded. Upload a CSV, load sample data, or add entries manually.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <div className="px-5 py-3 border-t border-border text-[14px] text-text-muted text-center font-mono">
            Showing {previewRows.length} of {events.length.toLocaleString()} records
          </div>
        </motion.section>

        {/* Detection Panel */}
        <motion.section
          className="glow-card p-6 space-y-5 flex flex-col"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.5 }}
        >
          <div>
            <h3 className="text-sm font-bold text-text-primary uppercase tracking-wide">Detection Run</h3>
            <p className="text-[14px] text-text-muted mt-1">Execute anomaly model on loaded data</p>
          </div>

          <button onClick={runDetection} disabled={!events.length} className="btn-primary w-full py-3.5">
            <BrainCircuit className="w-4 h-4" />
            Run Anomaly Detection
            <ArrowRight className="w-4 h-4" />
          </button>

          <div className="rounded-xl border border-border bg-bg-dark/40 p-4 space-y-3">
            <p className="text-sm font-bold text-text-primary uppercase tracking-wide">Expected Output</p>
            <ul className="space-y-2 text-sm text-text-secondary">
              {[
                'Anomaly detection across login behavior',
                'Risk alert generation with severity levels',
                'Behavior trend visualizations',
              ].map((item) => (
                <li key={item} className="flex items-start gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 shrink-0" />
                  {item}
                </li>
              ))}
            </ul>
          </div>

          <AnimatePresence>
            {detectionResult && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="rounded-xl border border-[rgba(6,214,160,0.2)] bg-[rgba(6,214,160,0.04)] p-4"
              >
                <div className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-accent mt-0.5 shrink-0" />
                  <div>
                    <p className="text-sm font-bold text-text-primary">Detection Complete</p>
                    <p className="text-sm text-text-secondary mt-1">
                      {detectionResult.summary.anomalyCount} anomalies from{' '}
                      {detectionResult.summary.totalEvents} events
                    </p>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.section>
      </div>

      {/* ============================================================= */}
      {/* ANOMALY RESULTS — shown after detection completes              */}
      {/* ============================================================= */}
      <AnimatePresence>
        {detectionResult && (
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 30 }}
            transition={{ duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] }}
            className="space-y-8"
          >
            {/* Divider */}
            <div className="flex items-center gap-4">
              <div className="h-px flex-1 bg-gradient-to-r from-transparent via-primary/30 to-transparent" />
              <span className="text-[14px] font-mono font-bold uppercase tracking-[0.2em] text-primary">
                Anomaly Results
              </span>
              <div className="h-px flex-1 bg-gradient-to-r from-transparent via-primary/30 to-transparent" />
            </div>

            {/* Summary Stats */}
            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
              {[
                {
                  label: 'Total Events',
                  value: detectionResult.summary.totalEvents.toLocaleString(),
                  icon: Zap,
                  color: '#7c5cfc',
                },
                {
                  label: 'Unique Users',
                  value: detectionResult.summary.totalUsers.toLocaleString(),
                  icon: Users,
                  color: '#7c5cfc',
                },
                {
                  label: 'Anomalies',
                  value: detectionResult.summary.anomalyCount.toLocaleString(),
                  icon: AlertTriangle,
                  color: '#ffb347',
                },
                {
                  label: 'High Risk',
                  value: detectionResult.summary.highRiskCount.toLocaleString(),
                  icon: Shield,
                  color: '#ff4d6a',
                },
                {
                  label: 'Medium Risk',
                  value: detectionResult.summary.mediumRiskCount.toLocaleString(),
                  icon: TrendingUp,
                  color: '#ffb347',
                },
                {
                  label: 'Avg Score',
                  value: `${detectionResult.summary.averageRiskScore}`,
                  icon: BrainCircuit,
                  color: '#06d6a0',
                },
              ].map((stat, i) => (
                <motion.div
                  key={stat.label}
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.05 * i, duration: 0.4 }}
                  className="glow-card p-4 text-center"
                >
                  <stat.icon className="w-5 h-5 mx-auto mb-2" style={{ color: stat.color }} />
                  <p className="text-2xl font-extrabold text-text-primary">{stat.value}</p>
                  <p className="text-[13px] font-mono uppercase tracking-widest text-text-muted mt-1">
                    {stat.label}
                  </p>
                </motion.div>
              ))}
            </div>

            {/* ── Risk Alert Generation ────────────────────────────────── */}
            <motion.section
              className="glow-card overflow-hidden"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1, duration: 0.5 }}
            >
              <div className="px-5 py-4 border-b border-border flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-critical/8 flex items-center justify-center border border-critical/10 shrink-0">
                  <Flame className="w-4 h-4 text-critical" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-bold text-text-primary">
                    Risk Alert Generation
                  </p>
                  <p className="text-[14px] text-text-muted">
                    {detectionResult.alerts.length} alert{detectionResult.alerts.length !== 1 ? 's' : ''} generated — risky patterns highlighted below
                  </p>
                </div>
                {detectionResult.summary.highRiskCount > 0 && (
                  <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-critical/8 border border-critical/15">
                    <span className="relative flex h-2.5 w-2.5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-critical opacity-50" />
                      <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-critical" />
                    </span>
                    <span className="text-[13px] font-mono font-bold text-critical uppercase tracking-wider">
                      {detectionResult.summary.highRiskCount} Critical
                    </span>
                  </div>
                )}
              </div>

              <div className="p-5 space-y-3 max-h-[600px] overflow-y-auto">
                {detectionResult.alerts.slice(0, 20).map((alert, i) => {
                  const matchedRisk = detectionResult.eventRisk.find(
                    (e) => e.userId === alert.userId && e.timestamp === alert.timestamp
                  );
                  const reasons = matchedRisk?.reasons ?? [alert.description];

                  return (
                    <motion.div
                      key={alert.id}
                      initial={{ opacity: 0, x: -12 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.03 * i, duration: 0.35 }}
                      className={cn(
                        'rounded-xl border p-4 transition-all',
                        alert.severity === 'high'
                          ? 'border-critical/20 bg-[rgba(255,77,106,0.03)]'
                          : 'border-[#ffb347]/20 bg-[rgba(255,179,71,0.03)]'
                      )}
                    >
                      {/* Alert header row */}
                      <div className="flex items-start gap-3 mb-3">
                        <div className={cn(
                          'w-9 h-9 rounded-lg flex items-center justify-center shrink-0',
                          alert.severity === 'high' ? 'bg-critical/10' : 'bg-[#ffb347]/10'
                        )}>
                          <AlertTriangle className={cn(
                            'w-4.5 h-4.5',
                            alert.severity === 'high' ? 'text-critical' : 'text-[#ffb347]'
                          )} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-[13px] font-mono font-bold text-primary">{alert.id}</span>
                            <span className={cn(
                              'px-1.5 py-0.5 rounded text-[9px] font-bold uppercase',
                              alert.severity === 'high' ? 'badge-high' : 'badge-medium'
                            )}>
                              {alert.severity}
                            </span>
                            <span className="text-[14px] font-mono text-text-muted">·</span>
                            <span className="text-[14px] font-semibold text-text-primary">{alert.userId}</span>
                          </div>
                          <p className="text-sm font-bold text-text-primary mt-1">{alert.title}</p>
                        </div>
                        <div className={cn(
                          'text-lg font-mono font-extrabold shrink-0',
                          alert.score >= settings.criticalThreshold ? 'text-critical' : 'text-[#ffb347]'
                        )}>
                          {alert.score}
                        </div>
                      </div>

                      {/* Risk factors with highlighted text */}
                      <div className="ml-12 space-y-2">
                        {reasons.map((reason, j) => {
                          const cat = categorize(reason);
                          const CatIcon = cat?.icon ?? AlertTriangle;
                          return (
                            <div
                              key={j}
                              className="flex items-start gap-2.5 rounded-lg px-3 py-2 transition-all"
                              style={{
                                background: cat?.bg ?? 'rgba(124,92,252,0.06)',
                                border: `1px solid ${cat?.color ?? '#7c5cfc'}18`,
                              }}
                            >
                              <CatIcon
                                className="w-3.5 h-3.5 mt-0.5 shrink-0"
                                style={{ color: cat?.color ?? '#7c5cfc' }}
                              />
                              <div className="flex-1 min-w-0">
                                {cat && (
                                  <span
                                    className="inline-block text-[8px] font-mono font-bold uppercase tracking-widest px-1.5 py-0.5 rounded mr-2 align-middle"
                                    style={{ background: cat.bg, color: cat.color }}
                                  >
                                    {cat.label}
                                  </span>
                                )}
                                <span className="text-sm text-text-secondary leading-relaxed">
                                  <HighlightRisk text={reason} level={alert.severity as 'high' | 'medium'} />
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      {/* Timestamp */}
                      <p className="ml-12 mt-2 text-[13px] font-mono text-text-muted">{alert.timestamp}</p>
                    </motion.div>
                  );
                })}

                {detectionResult.alerts.length > 20 && (
                  <p className="text-center text-[14px] text-text-muted py-2 font-mono">
                    +{detectionResult.alerts.length - 20} more alerts — see full list in the Risk Alerts page
                  </p>
                )}
              </div>
            </motion.section>

            {/* Fraud Alerts Table */}
            <motion.section
              className="glow-card overflow-hidden"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15, duration: 0.5 }}
            >
              <div className="px-5 py-4 border-b border-border flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-critical/8 flex items-center justify-center border border-critical/10">
                    <AlertTriangle className="w-4 h-4 text-critical" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-text-primary">
                      Fraud Alerts ({detectionResult.alerts.length})
                    </p>
                    <p className="text-[14px] text-text-muted">
                      Events that exceeded risk thresholds
                    </p>
                  </div>
                </div>
                {/* Severity filter & Sort */}
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    {(['all', 'high', 'medium'] as const).map((f) => (
                      <button
                        key={f}
                        onClick={() => { setRiskFilter(f); setAlertLimit(10); }}
                        className={cn(
                          'px-3 py-1.5 rounded-lg text-[14px] font-mono font-bold uppercase tracking-wider transition-all border',
                          riskFilter === f
                            ? f === 'high'
                              ? 'bg-critical/10 text-critical border-critical/20'
                              : f === 'medium'
                                ? 'bg-[#ffb347]/10 text-[#ffb347] border-[#ffb347]/20'
                                : 'bg-primary/10 text-primary border-primary/20'
                            : 'bg-transparent text-text-muted border-border hover:border-border-hover'
                        )}
                      >
                        {f}
                      </button>
                    ))}
                  </div>

                  {/* Sort by score */}
                  <div className="flex items-center gap-1 border-l border-border pl-4">
                    <span className="text-[13px] text-text-muted font-mono uppercase tracking-wider mr-1">Sort</span>
                    {(['default', 'score-desc', 'score-asc'] as const).map((s) => (
                      <button
                        key={s}
                        onClick={() => { setAlertSort(s); setAlertLimit(10); }}
                        className={cn(
                          'px-2.5 py-1.5 rounded-lg text-[14px] font-mono font-bold transition-all border flex items-center gap-1',
                          alertSort === s
                            ? 'bg-primary/10 text-primary border-primary/20'
                            : 'bg-transparent text-text-muted border-border hover:border-border-hover'
                        )}
                      >
                        {s === 'default' ? 'Default' : s === 'score-desc' ? 'Score ↓' : 'Score ↑'}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {(() => {
                const afterFilter =
                  riskFilter === 'all'
                    ? detectionResult.alerts
                    : detectionResult.alerts.filter((a) => a.severity === riskFilter);
                const filtered =
                  alertSort === 'score-desc'
                    ? [...afterFilter].sort((a, b) => b.score - a.score)
                    : alertSort === 'score-asc'
                      ? [...afterFilter].sort((a, b) => a.score - b.score)
                      : afterFilter;
                const visible = filtered.slice(0, alertLimit);

                return (
                  <>
                    <div className="overflow-x-auto">
                      <table className="data-table">
                        <thead>
                          <tr>
                            <th>ID</th>
                            <th>SEVERITY</th>
                            <th>USER</th>
                            <th>TITLE</th>
                            <th>DESCRIPTION</th>
                            <th>SCORE</th>
                            <th>TIMESTAMP</th>
                          </tr>
                        </thead>
                        <tbody>
                          {visible.length ? (
                            visible.map((alert) => (
                              <tr key={alert.id}>
                                <td className="text-text-muted font-mono">{alert.id}</td>
                                <td>
                                  <span
                                    className={cn(
                                      'px-2 py-0.5 rounded-md text-[13px] font-mono font-bold uppercase',
                                      alert.severity === 'high'
                                        ? 'badge-high'
                                        : 'badge-medium'
                                    )}
                                  >
                                    {alert.severity}
                                  </span>
                                </td>
                                <td className="text-text-primary font-medium">{alert.userId}</td>
                                <td className="text-text-primary">{alert.title}</td>
                                <td className="text-text-secondary max-w-[280px] truncate">
                                  {alert.description}
                                </td>
                                <td>
                                  <span
                                    className={cn(
                                      'font-mono font-bold',
                                      alert.score >= settings.criticalThreshold
                                        ? 'text-critical'
                                        : alert.score >= settings.warningThreshold
                                          ? 'text-[#ffb347]'
                                          : 'text-accent'
                                    )}
                                  >
                                    {alert.score}
                                  </span>
                                </td>
                                <td className="font-mono text-text-muted">{alert.timestamp}</td>
                              </tr>
                            ))
                          ) : (
                            <tr>
                              <td colSpan={7} className="text-center text-text-muted py-8">
                                No alerts matching this filter.
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>

                    {filtered.length > alertLimit && (
                      <div className="px-5 py-3 border-t border-border flex justify-center">
                        <button
                          onClick={() => setAlertLimit((prev) => prev + 20)}
                          className="btn-ghost py-2 px-6 text-sm"
                        >
                          Show more ({filtered.length - alertLimit} remaining)
                        </button>
                      </div>
                    )}

                    <div className="px-5 py-3 border-t border-border text-[14px] text-text-muted text-center font-mono">
                      Showing {visible.length} of {filtered.length} alerts
                    </div>
                  </>
                );
              })()}
            </motion.section>

            {/* Per-Event Risk Breakdown */}
            <motion.section
              className="glow-card overflow-hidden"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25, duration: 0.5 }}
            >
              <div className="px-5 py-4 border-b border-border flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#ffb347]/8 flex items-center justify-center border border-[#ffb347]/10">
                  <TrendingUp className="w-4 h-4 text-[#ffb347]" />
                </div>
                <div>
                  <p className="text-sm font-bold text-text-primary">
                    Event Risk Breakdown ({detectionResult.eventRisk.filter((e) => e.level !== 'low').length} flagged)
                  </p>
                  <p className="text-[14px] text-text-muted">
                    Per-event anomaly scores with risk factors — click a row to expand
                  </p>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>ROW</th>
                      <th>USER</th>
                      <th>TIMESTAMP</th>
                      <th>LEVEL</th>
                      <th>SCORE</th>
                      <th>REASONS</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {detectionResult.eventRisk
                      .filter((e) => showLowRisk || e.level !== 'low')
                      .slice(0, 30)
                      .map((risk) => (
                        <React.Fragment key={risk.rowId}>
                          <tr
                            onClick={() =>
                              setExpandedRow(expandedRow === risk.rowId ? null : risk.rowId)
                            }
                            className="cursor-pointer"
                          >
                            <td className="text-text-muted font-mono">{risk.rowId}</td>
                            <td className="text-text-primary font-medium">{risk.userId}</td>
                            <td className="font-mono text-text-muted">{risk.timestamp}</td>
                            <td>
                              <span
                                className={cn(
                                  'px-2 py-0.5 rounded-md text-[13px] font-mono font-bold uppercase',
                                  risk.level === 'high' ? 'badge-high' : risk.level === 'medium' ? 'badge-medium' : 'bg-accent/10 text-accent border border-accent/20'
                                )}
                              >
                                {risk.level}
                              </span>
                            </td>
                            <td>
                              <span
                                className={cn(
                                  'font-mono font-bold',
                                  risk.score >= settings.criticalThreshold
                                    ? 'text-critical'
                                    : risk.score >= settings.warningThreshold
                                      ? 'text-[#ffb347]'
                                      : 'text-accent'
                                )}
                              >
                                {risk.score}
                              </span>
                            </td>
                            <td className="text-text-secondary">
                              {risk.reasons.length} factor{risk.reasons.length !== 1 ? 's' : ''}
                            </td>
                            <td>
                              {expandedRow === risk.rowId ? (
                                <ChevronUp className="w-3.5 h-3.5 text-text-muted" />
                              ) : (
                                <ChevronDown className="w-3.5 h-3.5 text-text-muted" />
                              )}
                            </td>
                          </tr>
                          {expandedRow === risk.rowId && (
                            <tr>
                              <td colSpan={7} className="!p-0">
                                <motion.div
                                  initial={{ opacity: 0, height: 0 }}
                                  animate={{ opacity: 1, height: 'auto' }}
                                  className="px-6 py-4 bg-[rgba(124,92,252,0.03)] border-l-2 border-primary/30"
                                >
                                  <p className="text-[13px] font-mono font-bold uppercase tracking-widest text-text-muted mb-2">
                                    Risk Factors
                                  </p>
                                  <ul className="space-y-2">
                                    {risk.reasons.map((reason, i) => {
                                      const cat = categorize(reason);
                                      const CatIcon = cat?.icon ?? AlertTriangle;
                                      return (
                                        <li
                                          key={i}
                                          className="flex items-start gap-2.5 rounded-lg px-3 py-2"
                                          style={{
                                            background: cat?.bg ?? 'rgba(124,92,252,0.06)',
                                            border: `1px solid ${cat?.color ?? '#7c5cfc'}18`,
                                          }}
                                        >
                                          <CatIcon
                                            className="w-3.5 h-3.5 mt-0.5 shrink-0"
                                            style={{ color: cat?.color ?? '#7c5cfc' }}
                                          />
                                          <div className="flex-1 min-w-0">
                                            {cat && (
                                              <span
                                                className="inline-block text-[8px] font-mono font-bold uppercase tracking-widest px-1.5 py-0.5 rounded mr-2 align-middle"
                                                style={{ background: cat.bg, color: cat.color }}
                                              >
                                                {cat.label}
                                              </span>
                                            )}
                                            <span className="text-sm text-text-secondary">
                                              <HighlightRisk text={reason} level={risk.level as 'high' | 'medium'} />
                                            </span>
                                          </div>
                                        </li>
                                      );
                                    })}
                                  </ul>
                                </motion.div>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      ))}
                  </tbody>
                </table>
              </div>

              <div className="px-5 py-3 border-t border-border flex items-center justify-between">
                <span className="text-[14px] text-text-muted font-mono">
                  {showLowRisk
                    ? `Showing all ${detectionResult.eventRisk.length} events`
                    : `Showing flagged events (medium + high risk) · ${detectionResult.eventRisk.filter((e) => e.level === 'low').length} low-risk events hidden`}
                </span>
                {detectionResult.eventRisk.some((e) => e.level === 'low') && (
                  <button
                    onClick={() => setShowLowRisk((prev) => !prev)}
                    className={cn(
                      'px-3 py-1.5 rounded-lg text-[14px] font-mono font-bold transition-all border',
                      showLowRisk
                        ? 'bg-accent/10 text-accent border-accent/20'
                        : 'bg-transparent text-text-muted border-border hover:border-border-hover hover:text-text-secondary'
                    )}
                  >
                    {showLowRisk ? 'Hide Low Risk' : 'Show Low Risk'}
                  </button>
                )}
              </div>
            </motion.section>

            {/* Top Risk Users */}
            {detectionResult.topRiskUsers.length > 0 && (
              <motion.section
                className="glow-card p-6"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.35, duration: 0.5 }}
              >
                <div className="section-header mb-5">
                  <div className="section-icon">
                    <Users className="w-4 h-4" />
                  </div>
                  <h3>Top Risk Users</h3>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {detectionResult.topRiskUsers.map((user, i) => (
                    <motion.div
                      key={user.userId}
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: 0.04 * i }}
                      className="flex items-center gap-3 p-4 rounded-xl bg-bg-dark/50 border border-border hover:border-border-hover transition-all"
                    >
                      <span className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-sm font-mono font-bold text-primary shrink-0">
                        #{i + 1}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-text-primary truncate">{user.userId}</p>
                        <p className="text-[14px] text-text-muted">
                          {user.alertCount} alert{user.alertCount !== 1 ? 's' : ''}
                        </p>
                      </div>
                      <span
                        className={cn(
                          'text-sm font-mono font-bold px-2 py-1 rounded-lg shrink-0',
                          user.maxScore >= settings.criticalThreshold
                            ? 'badge-high'
                            : user.maxScore >= settings.warningThreshold
                              ? 'badge-medium'
                              : 'badge-low'
                        )}
                      >
                        {user.maxScore}
                      </span>
                    </motion.div>
                  ))}
                </div>
              </motion.section>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
