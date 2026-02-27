import { Save, Sliders, Zap, HelpCircle, RotateCcw, CheckCircle2, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useState, useEffect, useId } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useDetection } from '@/context/DetectionContext';
import { DEFAULT_SETTINGS, type DetectionSettings } from '@/lib/detection';

export default function SystemConfig() {
  const { settings, setSettings, events, detectionResult, datasetInfo, clearDataset } = useDetection();
  const [draft, setDraft] = useState<DetectionSettings>({ ...settings });
  const [saved, setSaved] = useState(false);

  // Persist toggle states in localStorage
  const readFlag = (key: string, fallback: boolean) => {
    const v = localStorage.getItem(key);
    return v === null ? fallback : v === 'true';
  };
  const [autoFreeze, _setAutoFreeze] = useState(() => readFlag('sentinel_autoFreeze', false));
  const [notifyOps, _setNotifyOps] = useState(() => readFlag('sentinel_notifyOps', true));
  const [stepUpVerify, _setStepUpVerify] = useState(() => readFlag('sentinel_stepUpVerify', true));

  const setAutoFreeze = (v: boolean) => { localStorage.setItem('sentinel_autoFreeze', String(v)); _setAutoFreeze(v); };
  const setNotifyOps = (v: boolean) => { localStorage.setItem('sentinel_notifyOps', String(v)); _setNotifyOps(v); };
  const setStepUpVerify = (v: boolean) => { localStorage.setItem('sentinel_stepUpVerify', String(v)); _setStepUpVerify(v); };

  // Sync draft when external settings change
  useEffect(() => {
    setDraft({ ...settings });
  }, [settings]);

  const hasChanges = JSON.stringify(draft) !== JSON.stringify(settings);

  const handleSave = () => {
    setSettings(draft);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  const handleDiscard = () => {
    setDraft({ ...settings });
  };

  const handleReset = () => {
    setDraft({ ...DEFAULT_SETTINGS });
  };

  const updateDraft = (key: keyof DetectionSettings, value: number) => {
    setDraft((prev) => ({ ...prev, [key]: value }));
  };

  const warnPct = Math.round((draft.warningThreshold / 100) * 100);
  const critPct = Math.round((draft.criticalThreshold / 100) * 100);

  return (
    <div className="page-container max-w-4xl pb-20 space-y-8">
      {/* Header */}
      <motion.div
        className="flex items-center justify-between"
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <div>
          <h1 className="text-5xl font-extrabold text-text-primary tracking-tight">Policy Controls</h1>
          <p className="text-xl text-text-secondary mt-1">
            Tune identity theft sensitivity — changes apply to the next detection run.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleDiscard}
            disabled={!hasChanges}
            className={cn('btn-ghost text-xs uppercase tracking-wider', !hasChanges && 'opacity-40 pointer-events-none')}
          >
            Discard
          </button>
          {/* Remove Dataset button moved to Identity Signals manual entry box */}
          <button
            onClick={handleSave}
            disabled={!hasChanges}
            className={cn('btn-primary text-xs uppercase tracking-wider', !hasChanges && 'opacity-40 pointer-events-none')}
          >
            <Save className="w-4 h-4" /> Apply Settings
          </button>
        </div>
      </motion.div>

      {/* Save confirmation */}
      <AnimatePresence>
        {saved && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="rounded-xl border border-[rgba(6,214,160,0.2)] bg-[rgba(6,214,160,0.04)] px-5 py-4 flex items-center gap-3"
          >
            <CheckCircle2 className="w-5 h-5 text-accent shrink-0" />
            <div>
              <p className="text-xl font-bold text-text-primary">Settings applied</p>
              <p className="text-base text-text-secondary mt-0.5">
                {events.length > 0
                  ? 'Run detection again on Identity Signals to see updated results.'
                  : 'Upload a dataset and run detection to use these settings.'}
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Unsaved changes warning */}
      <AnimatePresence>
        {hasChanges && !saved && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="rounded-xl border border-[rgba(255,179,71,0.2)] bg-[rgba(255,179,71,0.04)] px-5 py-3 flex items-center gap-3"
          >
            <AlertTriangle className="w-4 h-4 text-[#ffb347] shrink-0" />
            <p className="text-base text-text-secondary">
              You have unsaved changes. Click <strong className="text-text-primary">Apply Settings</strong> to save.
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Risk Thresholds */}
      <motion.section
        className="glow-card p-6"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1, duration: 0.5 }}
      >
        <div className="flex items-start gap-4 mb-8">
          <div className="w-11 h-11 rounded-xl bg-primary/8 flex items-center justify-center border border-primary/10 shrink-0">
            <Sliders className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h3 className="text-3xl font-extrabold text-text-primary">Risk Thresholds</h3>
            <p className="text-xl text-text-secondary">
              Control when events are classified as warning vs critical risk.
            </p>
          </div>
        </div>

        <div className="px-1 pb-2 space-y-8">
          {/* Visual bar showing current draft thresholds */}
          <div>
            <div className="flex justify-between text-[16px] font-mono font-bold uppercase tracking-widest mb-4">
              <span className="text-accent">Low (0–{draft.warningThreshold - 1})</span>
              <span className="text-[#ffb347]">Medium ({draft.warningThreshold}–{draft.criticalThreshold - 1})</span>
              <span className="text-critical">High ({draft.criticalThreshold}+)</span>
            </div>

            <div className="relative h-3 w-full rounded-full bg-bg-dark overflow-hidden mb-14">
              <div
                className="absolute inset-y-0 left-0 rounded-l-full"
                style={{ width: `${warnPct}%`, background: '#06d6a0' }}
              />
              <div
                className="absolute inset-y-0"
                style={{ left: `${warnPct}%`, width: `${critPct - warnPct}%`, background: '#ffb347' }}
              />
              <div
                className="absolute inset-y-0 rounded-r-full"
                style={{ left: `${critPct}%`, width: `${100 - critPct}%`, background: '#ff4d6a' }}
              />
              {/* Warning handle */}
              <div
                className="absolute top-0 bottom-0 w-0.5 bg-white shadow-[0_0_8px_rgba(255,255,255,0.5)] z-10 transition-all"
                style={{ left: `${warnPct}%` }}
              >
                <div className="absolute -bottom-9 left-1/2 -translate-x-1/2 bg-bg-card border border-border px-2 py-1 rounded-lg text-[16px] font-mono font-bold text-text-primary whitespace-nowrap">
                  {draft.warningThreshold}
                </div>
              </div>
              {/* Critical handle */}
              <div
                className="absolute top-0 bottom-0 w-0.5 bg-white shadow-[0_0_8px_rgba(255,255,255,0.5)] z-10 transition-all"
                style={{ left: `${critPct}%` }}
              >
                <div className="absolute -bottom-9 left-1/2 -translate-x-1/2 bg-bg-card border border-border px-2 py-1 rounded-lg text-[16px] font-mono font-bold text-text-primary whitespace-nowrap">
                  {draft.criticalThreshold}
                </div>
              </div>
            </div>
          </div>

          {/* Actual sliders */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <SettingSlider
              label="Warning Threshold"
              help="Score at which events become medium risk"
              value={draft.warningThreshold}
              min={10}
              max={90}
              step={5}
              unit=""
              color="#ffb347"
              onChange={(v) => {
                updateDraft('warningThreshold', v);
                if (v >= draft.criticalThreshold) updateDraft('criticalThreshold', Math.min(v + 10, 100));
              }}
            />
            <SettingSlider
              label="Critical Threshold"
              help="Score at which events become high risk"
              value={draft.criticalThreshold}
              min={20}
              max={100}
              step={5}
              unit=""
              color="#ff4d6a"
              onChange={(v) => {
                updateDraft('criticalThreshold', v);
                if (v <= draft.warningThreshold) updateDraft('warningThreshold', Math.max(v - 10, 0));
              }}
            />
          </div>
        </div>
      </motion.section>

      {/* Detection Parameters */}
      <motion.section
        className="glow-card p-6"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, duration: 0.5 }}
      >
        <div className="flex items-start justify-between mb-8">
          <div className="flex items-start gap-4">
            <div className="w-11 h-11 rounded-xl bg-primary/8 flex items-center justify-center border border-primary/10 shrink-0">
              <Sliders className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h3 className="text-3xl font-extrabold text-text-primary">Detection Parameters</h3>
              <p className="text-xl text-text-secondary">
                These values directly control the anomaly scoring engine.
              </p>
            </div>
          </div>
          <button onClick={handleReset} className="btn-ghost text-xs gap-1.5">
            <RotateCcw className="w-3.5 h-3.5" /> Reset Defaults
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <SettingSlider
            label="Impossible Travel Speed"
            help="Max plausible travel speed between logins — triggers alert if exceeded"
            value={draft.impossibleTravelSpeedKmh}
            min={100}
            max={2000}
            step={50}
            unit=" km/h"
            color="#7c5cfc"
            onChange={(v) => updateDraft('impossibleTravelSpeedKmh', v)}
          />
          <SettingSlider
            label="Rapid Device Switch Window"
            help="Minutes within which a device change is considered suspicious"
            value={draft.rapidDeviceSwitchMinutes}
            min={1}
            max={120}
            step={1}
            unit=" min"
            color="#a78bfa"
            onChange={(v) => updateDraft('rapidDeviceSwitchMinutes', v)}
          />
          <SettingSlider
            label="Login Burst Window"
            help="Time window to count rapid sequential logins as burst"
            value={draft.burstWindowMinutes}
            min={5}
            max={120}
            step={5}
            unit=" min"
            color="#06d6a0"
            onChange={(v) => updateDraft('burstWindowMinutes', v)}
          />
          <SettingSlider
            label="Burst Event Threshold"
            help="Number of logins within the burst window to flag as suspicious"
            value={draft.burstEventCount}
            min={2}
            max={20}
            step={1}
            unit=" events"
            color="#06d6a0"
            onChange={(v) => updateDraft('burstEventCount', v)}
          />
        </div>
      </motion.section>

      {/* Automated Response */}
      <motion.section
        className="glow-card p-6"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3, duration: 0.5 }}
      >
        <div className="flex items-start gap-4 mb-8">
          <div
            className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
            style={{ background: 'rgba(255,179,71,0.08)', border: '1px solid rgba(255,179,71,0.1)' }}
          >
            <Zap className="w-5 h-5 text-warning" />
          </div>
          <div>
            <h3 className="text-3xl font-extrabold text-text-primary">Automated Response</h3>
            <p className="text-xl text-text-secondary">Configure autonomous actions for theft-risk levels.</p>
          </div>
        </div>

        <div className="space-y-3">
          <ToggleItem
            title="Quarantine Transactions on High Risk"
            desc={`Hold pending transactions for review when anomaly score ≥ ${draft.criticalThreshold}.`}
            active={autoFreeze}
            activeColor="#ff4d6a"
            onToggle={setAutoFreeze}
          />
          <ToggleItem
            title="Notify fraud ops on alerts"
            desc="Sends alert digest to the configured fraud operations channel."
            active={notifyOps}
            activeColor="#7c5cfc"
            onToggle={setNotifyOps}
          />
          <ToggleItem
            title="Step-up verification for Medium Risk"
            desc={`Enforce additional identity checks for scores ≥ ${draft.warningThreshold}.`}
            active={stepUpVerify}
            activeColor="#7c5cfc"
            onToggle={setStepUpVerify}
          />
        </div>
      </motion.section>

      {/* Current detection status */}
      {detectionResult && (
        <motion.section
          className="glow-card p-5 flex items-start gap-4"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.5 }}
        >
          <CheckCircle2 className="w-5 h-5 text-accent mt-0.5 shrink-0" />
          <div>
            <p className="text-xl font-bold text-text-primary">Last Detection Run</p>
            <p className="text-base text-text-secondary mt-1">
              Processed {detectionResult.summary.totalEvents} events across{' '}
              {detectionResult.summary.totalUsers} users — generated{' '}
              {detectionResult.summary.highRiskCount} high-risk and{' '}
              {detectionResult.summary.mediumRiskCount} medium-risk alerts.
              {hasChanges && (
                <span className="text-[#ffb347]">
                  {' '}Settings have been modified — re-run detection to apply.
                </span>
              )}
            </p>
          </div>
        </motion.section>
      )}

      {/* Footer */}
      <footer className="mt-12 py-6 text-center">
        <p className="text-base text-text-secondary font-medium tracking-wide">
          website made by <span className="text-text-primary font-bold">ANIRUDH</span> &amp; <span className="text-text-primary font-bold">TANUSRI</span> for codestorm 2k26
        </p>
      </footer>
    </div>
  );
}

function SettingSlider({
  label,
  help,
  value,
  min,
  max,
  step,
  unit,
  color,
  onChange,
}: {
  label: string;
  help: string;
  value: number;
  min: number;
  max: number;
  step: number;
  unit: string;
  color: string;
  onChange: (v: number) => void;
}) {
  return (
    <div className="group">
      <div className="flex items-center justify-between mb-1.5">
        <label className="text-xl font-semibold text-text-primary flex items-center gap-2">
          {label}
          <span title={help}>
            <HelpCircle className="w-4 h-4 text-text-muted opacity-40 group-hover:opacity-100 transition-opacity cursor-help" />
          </span>
        </label>
        <span className="font-mono text-xl font-bold" style={{ color }}>
          {value}
          {unit}
        </span>
      </div>
      <p className="text-[16px] text-text-muted mb-3">{help}</p>
      <div className="flex items-center gap-4">
        <span className="text-[16px] font-mono font-bold text-text-muted w-14">
          {min}
          {unit}
        </span>
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="flex-1"
        />
        <span className="text-[16px] font-mono font-bold text-text-muted w-14 text-right">
          {max}
          {unit}
        </span>
      </div>
    </div>
  );
}

function ToggleItem({
  title,
  desc,
  active,
  activeColor,
  onToggle,
}: {
  title: string;
  desc: string;
  active: boolean;
  activeColor: string;
  onToggle: (v: boolean) => void;
}) {
  const id = useId();

  return (
    <div className="flex items-center justify-between rounded-xl border border-border bg-bg-dark/30 p-5 hover:border-border-hover transition-all">
      <div>
        <h4 className="text-xl font-semibold text-text-primary">{title}</h4>
        <p className="text-base text-text-muted mt-0.5">{desc}</p>
      </div>

      {/* Uiverse toggle switch */}
      <label className="switch shrink-0">
        <input
          id={id}
          type="checkbox"
          checked={active}
          onChange={() => onToggle(!active)}
        />
        <span className="slider" />
      </label>
    </div>
  );
}
