import { BrainCircuit, CheckCircle2, ArrowRight } from 'lucide-react';
import { useDetection } from '@/context/DetectionContext';
import { motion } from 'framer-motion';

const DETECTION_STEPS = [
  {
    num: '01',
    title: 'Feature Extraction',
    detail: 'For every login event, the model extracts location, device continuity, login timing, IP shift, and event-frequency signals.',
    color: '#7c5cfc',
  },
  {
    num: '02',
    title: 'Anomaly Scoring',
    detail: 'A rule-based anomaly model calculates a composite risk score (0-100) using weighted suspicious behavior indicators.',
    color: '#a78bfa',
  },
  {
    num: '03',
    title: 'Classification',
    detail: 'Scores are classified into low, medium, and high risk levels using configurable thresholds.',
    color: '#ffb347',
  },
  {
    num: '04',
    title: 'Alert Generation',
    detail: 'Medium and high risk classifications are converted into analyst-ready alerts with explicit reasons.',
    color: '#ff4d6a',
  },
];

export default function ModelLogic() {
  const { settings, liveResult } = useDetection();

  return (
    <div className="page-container space-y-8">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
        <h1 className="text-4xl font-extrabold text-text-primary tracking-tight">Model Logic</h1>
        <p className="text-lg text-text-secondary mt-1">Clear explanation of detection methodology as required by project constraints.</p>
      </motion.div>

      {/* Detection Pipeline */}
      <motion.section
        className="glow-card p-6"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1, duration: 0.5 }}
      >
        <div className="section-header">
          <div className="section-icon"><BrainCircuit className="w-4 h-4" /></div>
          <h3>Detection Pipeline</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          {DETECTION_STEPS.map((step, i) => (
            <motion.div
              key={step.num}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 + i * 0.08, duration: 0.4 }}
              className="group relative rounded-xl border border-border bg-bg-dark/40 p-5 hover:border-border-hover transition-all"
            >
              <span
                className="text-4xl font-black opacity-10 absolute top-3 right-4 select-none"
                style={{ color: step.color }}
              >
                {step.num}
              </span>
              <div className="flex items-center gap-2 mb-3">
                <div
                  className="w-2 h-2 rounded-full"
                  style={{ background: step.color }}
                />
                <p className="text-lg font-bold text-text-primary">{step.title}</p>
              </div>
              <p className="text-lg text-text-secondary leading-relaxed">{step.detail}</p>
              {i < DETECTION_STEPS.length - 1 && (
                <ArrowRight className="hidden xl:block absolute -right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted/30 z-10" />
              )}
            </motion.div>
          ))}
        </div>
      </motion.section>

      {/* Active Configuration */}
      <motion.section
        className="glow-card p-6"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3, duration: 0.5 }}
      >
        <div className="section-header">
          <div className="section-icon" style={{ background: 'rgba(255,179,71,0.08)', color: '#ffb347' }}>
            <BrainCircuit className="w-4 h-4" />
          </div>
          <h3>Active Configuration</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <ConfigTile label="Warning Threshold" value={`${settings.warningThreshold}`} accent="#ffb347" />
          <ConfigTile label="Critical Threshold" value={`${settings.criticalThreshold}`} accent="#ff4d6a" />
          <ConfigTile label="Impossible Travel" value={`${settings.impossibleTravelSpeedKmh} km/h`} accent="#7c5cfc" />
          <ConfigTile label="Device Switch Window" value={`${settings.rapidDeviceSwitchMinutes} min`} accent="#a78bfa" />
          <ConfigTile label="Burst Window" value={`${settings.burstWindowMinutes} min`} accent="#06d6a0" />
          <ConfigTile label="Burst Event Count" value={`${settings.burstEventCount} events`} accent="#06d6a0" />
        </div>
      </motion.section>

      {/* Model Outcome */}
      <motion.section
        className="glow-card p-6"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4, duration: 0.5 }}
      >
        <div className="section-header">
          <div className="section-icon" style={{ background: 'rgba(6,214,160,0.08)', color: '#06d6a0' }}>
            <CheckCircle2 className="w-4 h-4" />
          </div>
          <h3>Model Outcome</h3>
        </div>

        <div className="rounded-xl border border-border bg-bg-dark/40 p-5 flex items-start gap-4">
          <CheckCircle2 className="w-5 h-5 text-accent mt-0.5 shrink-0" />
          <p className="text-lg text-text-secondary leading-relaxed">
            {liveResult
              ? `Latest run processed ${liveResult.summary.totalEvents} events and generated ${liveResult.summary.anomalyCount} actionable anomaly alerts across ${liveResult.summary.totalUsers} unique identities.`
              : 'No run executed yet. Upload a dataset and run detection to produce model outcomes.'}
          </p>
        </div>
      </motion.section>
    </div>
  );
}

function ConfigTile({ label, value, accent }: { label: string; value: string; accent: string }) {
  return (
    <div className="rounded-xl border border-border bg-bg-dark/40 p-4 hover:border-border-hover transition-all group">
      <p className="text-[17px] font-bold uppercase tracking-widest text-text-muted">{label}</p>
      <p className="text-2xl font-extrabold text-text-primary mt-2 group-hover:tracking-wide transition-all" style={{ color: accent }}>
        {value}
      </p>
    </div>
  );
}
