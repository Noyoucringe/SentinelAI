import { AlertTriangle, ShieldCheck, Users, Activity, TrendingUp, Zap } from 'lucide-react';
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis, Bar, BarChart } from 'recharts';
import { useDetection } from '@/context/DetectionContext';
import { useTheme } from '@/context/ThemeContext';
import ThemeToggle from '@/components/ThemeToggle';
import { motion } from 'framer-motion';

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({ opacity: 1, y: 0, transition: { delay: i * 0.08, duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] } }),
};

function MetricCard({
  title,
  value,
  subtitle,
  accent,
  icon: Icon,
  index,
}: {
  title: string;
  value: string;
  subtitle: string;
  accent: string;
  icon: React.ElementType;
  index: number;
}) {
  return (
    <motion.div className="metric-card p-5" custom={index} initial="hidden" animate="visible" variants={fadeUp}>
      <div className="flex items-start justify-between mb-4">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center"
          style={{ background: accent + '12', color: accent }}
        >
          <Icon className="w-5 h-5" />
        </div>
        <span className="text-[13px] font-mono font-semibold uppercase tracking-widest text-text-muted">{title}</span>
      </div>
      <p className="text-4xl font-extrabold text-text-primary tracking-tight">{value}</p>
      <p className="text-[18px] text-text-muted mt-2">{subtitle}</p>
    </motion.div>
  );
}

export default function Dashboard() {
  const { liveResult } = useDetection();
  const { theme } = useTheme();

  const summary = liveResult?.summary;
  const hourly = liveResult?.hourlyRiskTrend ?? [];
  const daily = liveResult?.dailyAlertTrend ?? [];
  const topUsers = liveResult?.topRiskUsers ?? [];

  const isDark = theme === 'dark';
  const gridStroke = isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.06)';
  const axisStroke = isDark ? '#5c5c72' : '#8a8aa0';
  const chartDotFill = isDark ? '#0c0c10' : '#ffffff';

  return (
    <div className="page-container space-y-8">
      {/* Page Header */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
        <div className="flex items-center gap-3 mb-1">
          <h1 className="text-3xl font-extrabold text-text-primary tracking-tight">Command Center</h1>
          {liveResult ? (
            <span className="px-2.5 py-1 rounded-full text-[13px] font-mono font-bold uppercase tracking-widest bg-accent/10 text-accent border border-accent/20">
              Active
            </span>
          ) : (
            <span className="px-2.5 py-1 rounded-full text-[13px] font-mono font-bold uppercase tracking-widest bg-bg-elevated text-text-muted border border-border">
              No Data
            </span>
          )}

          {/* Theme Toggle */}
          <div className="ml-auto">
            <ThemeToggle />
          </div>
        </div>
        <p className="text-sm text-text-secondary">Anomaly detection insights, risk scoring, and case monitoring.</p>
      </motion.div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5">
        <MetricCard icon={Activity} title="Login Events" value={(summary?.totalEvents ?? 0).toLocaleString()} subtitle="From uploaded dataset" accent="#7c5cfc" index={0} />
        <MetricCard icon={Zap} title="Anomalies" value={(summary?.anomalyCount ?? 0).toLocaleString()} subtitle="Medium + high risk events" accent="#ffb347" index={1} />
        <MetricCard icon={AlertTriangle} title="High Risk" value={(summary?.highRiskCount ?? 0).toLocaleString()} subtitle="Critical alerts generated" accent="#ff4d6a" index={2} />
        <MetricCard icon={TrendingUp} title="Avg Score" value={`${summary?.averageRiskScore ?? 0}`} subtitle="Composite model output" accent="#06d6a0" index={3} />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <motion.section
          className="xl:col-span-2 glow-card p-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.5 }}
        >
          <div className="section-header">
            <div className="section-icon"><Activity className="w-4 h-4" /></div>
            <h3>Behavior Trend</h3>
          </div>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={hourly}>
                <defs>
                  <linearGradient id="riskGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#7c5cfc" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="#7c5cfc" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} vertical={false} />
                <XAxis dataKey="label" stroke={axisStroke} fontSize={15} fontWeight={700} tickLine={false} axisLine={false} fontFamily="JetBrains Mono" tickFormatter={(v: string) => String(parseInt(v))} />
                <YAxis stroke={axisStroke} fontSize={15} fontWeight={700} tickLine={false} axisLine={false} domain={[0, 100]} fontFamily="JetBrains Mono" />
                <Tooltip />
                <Area type="monotone" dataKey="value" stroke="#7c5cfc" fill="url(#riskGrad)" strokeWidth={2.5} dot={false} activeDot={{ r: 5, stroke: '#7c5cfc', strokeWidth: 2, fill: chartDotFill }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </motion.section>

        <motion.section
          className="glow-card p-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.5 }}
        >
          <div className="section-header">
            <div className="section-icon"><AlertTriangle className="w-4 h-4" /></div>
            <h3>Top Risk Users</h3>
          </div>
          <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
            {topUsers.length ? (
              topUsers.map((item, i) => (
                <div key={item.userId} className="group flex items-center justify-between p-4 rounded-xl bg-bg-dark/40 border border-border hover:border-border-hover transition-all">
                  <div className="flex items-center gap-4">
                    <span className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center text-[18px] font-mono font-extrabold text-primary">
                      {i + 1}
                    </span>
                    <div>
                      <p className="text-xl font-bold text-text-primary">{item.userId}</p>
                      <p className="text-base font-semibold text-text-muted">{item.alertCount} alert{item.alertCount !== 1 ? 's' : ''}</p>
                    </div>
                  </div>
                  <span className={`text-xl font-mono font-extrabold px-3 py-1.5 rounded-lg ${item.maxScore >= 80 ? 'badge-high' : item.maxScore >= 55 ? 'badge-medium' : 'badge-low'}`}>
                    {item.maxScore}
                  </span>
                </div>
              ))
            ) : (
              <div className="text-sm text-text-muted flex items-center gap-2 py-8 justify-center">
                <Users className="w-4 h-4" />
                Run detection to populate
              </div>
            )}
          </div>
        </motion.section>
      </div>

      {/* Daily Bar Chart */}
      <motion.section
        className="glow-card p-6"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5, duration: 0.5 }}
      >
        <div className="section-header">
          <div className="section-icon"><ShieldCheck className="w-4 h-4" /></div>
          <h3>Risk Alerts by Day</h3>
        </div>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={daily}>
              <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} vertical={false} />
              <XAxis dataKey="label" stroke={axisStroke} fontSize={15} fontWeight={700} tickLine={false} axisLine={false} fontFamily="JetBrains Mono" />
              <YAxis stroke={axisStroke} fontSize={15} fontWeight={700} tickLine={false} axisLine={false} fontFamily="JetBrains Mono" />
              <Tooltip />
              <Bar dataKey="value" fill="#7c5cfc" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </motion.section>

      {/* Empty state prompt */}
      {!liveResult && (
        <motion.div
          className="glow-card p-5 flex items-center gap-4 text-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
        >
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
            <Users className="w-5 h-5 text-primary" />
          </div>
          <div>
            <p className="text-text-primary font-semibold">No data loaded</p>
            <p className="text-text-muted text-sm mt-0.5">Upload a login CSV in Identity Signals and run the model to generate insights.</p>
          </div>
        </motion.div>
      )}
    </div>
  );
}
