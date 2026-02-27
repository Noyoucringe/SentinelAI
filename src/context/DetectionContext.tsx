import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import {
  DEFAULT_SETTINGS,
  detectIdentityTheft,
  parseLoginCsv,
  parseLoginJson,
  parseLoginFromText,
  type ColumnMapping,
  type DetectionResult,
  type DetectionSettings,
  type FraudAlert,
  type LoginEvent,
} from '@/lib/detection';

/* ---------- localStorage helpers ---------- */
const STORAGE_PREFIX = 'sentinel_';

function persist<T>(key: string, data: T): void {
  try {
    localStorage.setItem(STORAGE_PREFIX + key, JSON.stringify(data));
  } catch { /* quota exceeded — silently skip */ }
}

function restore<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(STORAGE_PREFIX + key);
    if (raw) return JSON.parse(raw) as T;
  } catch { /* corrupted — use fallback */ }
  return fallback;
}

type DatasetInfo = {
  fileName: string;
  fileSizeLabel: string;
  uploadedAtLabel: string;
  headers: string[];
  columnMapping?: ColumnMapping;
};

type DetectionContextValue = {
  settings: DetectionSettings;
  setSettings: (next: DetectionSettings) => void;
  datasetInfo: DatasetInfo | null;
  events: LoginEvent[];
  detectionResult: DetectionResult | null;
  /** Remove dataset and all derived results/events */
  clearDataset: () => void;
  /** Detection result with severities re-derived from current settings thresholds */
  liveResult: DetectionResult | null;
  parseError: string | null;
  uploadFile: (file: File) => Promise<void>;
  loadEvents: (events: LoginEvent[], label: string) => void;
  addEvent: (event: LoginEvent) => void;
  runDetection: () => void;
};

const DetectionContext = createContext<DetectionContextValue | null>(null);

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function DetectionProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettingsRaw] = useState<DetectionSettings>(() => restore('settings', DEFAULT_SETTINGS));
  const [datasetInfo, setDatasetInfo] = useState<DatasetInfo | null>(() => restore('datasetInfo', null));
  const [events, setEvents] = useState<LoginEvent[]>(() => restore('events', []));
  const [detectionResult, setDetectionResult] = useState<DetectionResult | null>(() => restore('detectionResult', null));
  const [parseError, setParseError] = useState<string | null>(null);

  /* Wrap setSettings to also persist */
  const setSettings = (next: DetectionSettings) => {
    setSettingsRaw(next);
    persist('settings', next);
  };

  /* Persist state whenever it changes */
  useEffect(() => { persist('events', events); }, [events]);
  useEffect(() => { persist('datasetInfo', datasetInfo); }, [datasetInfo]);
  useEffect(() => { persist('detectionResult', detectionResult); }, [detectionResult]);

  /**
   * liveResult: re-derives severity, alerts, and summary from raw eventRisk scores
   * using the CURRENT settings thresholds. This ensures that when the user changes
   * warningThreshold or criticalThreshold, all UI consumers update in real time.
   */
  const liveResult = useMemo<DetectionResult | null>(() => {
    if (!detectionResult) return null;

    const { warningThreshold, criticalThreshold } = settings;

    // Re-derive levels on every eventRisk entry
    const liveEventRisk = detectionResult.eventRisk.map((item) => {
      const level: 'low' | 'medium' | 'high' =
        item.score >= criticalThreshold ? 'high'
          : item.score >= warningThreshold ? 'medium'
            : 'low';
      return { ...item, level };
    });

    // Re-derive alerts from all events (including low risk)
    const liveAlerts: FraudAlert[] = liveEventRisk
      .sort((a, b) => b.score - a.score)
      .map((item, index) => ({
        id: `ALT-${(index + 1).toString().padStart(4, '0')}`,
        severity: item.level as 'low' | 'medium' | 'high',
        userId: item.userId,
        title: item.level === 'high' ? 'Potential Identity Theft Attempt' : item.level === 'medium' ? 'Suspicious Login Behavior' : 'Low Risk Activity',
        description: item.reasons[0] ?? 'Composite anomaly score exceeded threshold',
        timestamp: item.timestamp,
        score: item.score,
      }));

    const totalScore = liveEventRisk.reduce((sum, item) => sum + item.score, 0);
    const users = new Set(liveEventRisk.map((e) => e.userId));

    const liveSummary = {
      totalEvents: detectionResult.summary.totalEvents,
      totalUsers: users.size,
      anomalyCount: liveAlerts.length,
      highRiskCount: liveAlerts.filter((a) => a.severity === 'high').length,
      mediumRiskCount: liveAlerts.filter((a) => a.severity === 'medium').length,
      lowRiskCount: liveAlerts.filter((a) => a.severity === 'low').length,
      averageRiskScore: liveEventRisk.length
        ? Number((totalScore / liveEventRisk.length).toFixed(1))
        : 0,
    };

    // Re-derive top risk users
    const userMap = new Map<string, { maxScore: number; alertCount: number }>();
    for (const a of liveAlerts) {
      const entry = userMap.get(a.userId) ?? { maxScore: 0, alertCount: 0 };
      entry.maxScore = Math.max(entry.maxScore, a.score);
      entry.alertCount += 1;
      userMap.set(a.userId, entry);
    }
    const liveTopRiskUsers = Array.from(userMap.entries())
      .map(([userId, data]) => ({ userId, ...data }))
      .sort((a, b) => b.maxScore - a.maxScore)
      .slice(0, 20);

    return {
      eventRisk: liveEventRisk,
      alerts: liveAlerts,
      summary: liveSummary,
      hourlyRiskTrend: detectionResult.hourlyRiskTrend,
      dailyAlertTrend: detectionResult.dailyAlertTrend,
      topRiskUsers: liveTopRiskUsers,
    };
  }, [detectionResult, settings]);

  const uploadFile = async (file: File) => {
    setParseError(null);
    setDetectionResult(null);

    const name = file.name.toLowerCase();
    const supported = name.endsWith('.csv') || name.endsWith('.json') || name.endsWith('.pdf');
    if (!supported) {
      setParseError('Unsupported file type. Please upload a CSV, JSON, or PDF file.');
      return;
    }

    try {
      let parsed: { events: LoginEvent[]; headers: string[]; mapping: ColumnMapping };

      if (name.endsWith('.csv')) {
        const text = await file.text();
        parsed = parseLoginCsv(text);
      } else if (name.endsWith('.json')) {
        const text = await file.text();
        parsed = parseLoginJson(text);
      } else {
        // PDF — lazily load pdfjs-dist to keep the initial bundle small
        const arrayBuffer = await file.arrayBuffer();
        const pdfjsLib = await import('pdfjs-dist');
        pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
          'pdfjs-dist/build/pdf.worker.mjs',
          import.meta.url,
        ).toString();
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        const pageTexts: string[] = [];
        for (let i = 1; i <= pdf.numPages; i++) {
          const page = await pdf.getPage(i);
          const content = await page.getTextContent();
          const text = content.items
            .map((item: { str?: string }) => ('str' in item ? item.str : ''))
            .join(' ');
          pageTexts.push(text);
        }
        const fullText = pageTexts.join('\n');
        parsed = parseLoginFromText(fullText);
      }

      setEvents(parsed.events);
      setDatasetInfo({
        fileName: file.name,
        fileSizeLabel: formatSize(file.size),
        uploadedAtLabel: 'Uploaded just now',
        headers: parsed.headers,
        columnMapping: parsed.mapping,
      });
    } catch (error) {
      setParseError(error instanceof Error ? error.message : 'Unable to parse file.');
    }
  };

  const loadEvents = (newEvents: LoginEvent[], label: string) => {
    setParseError(null);
    setDetectionResult(null);
    setEvents(newEvents);
    setDatasetInfo({
      fileName: label,
      fileSizeLabel: `${newEvents.length} records`,
      uploadedAtLabel: 'Loaded just now',
      headers: ['user_id', 'timestamp', 'lat', 'long', 'device_id', 'ip_address', 'login_result'],
    });
  };

  const addEvent = (event: LoginEvent) => {
    setParseError(null);
    setDetectionResult(null);
    setEvents((prev) => {
      const next = [...prev, { ...event, rowId: prev.length + 1 }];
      setDatasetInfo({
        fileName: datasetInfo?.fileName ?? 'Manual entries',
        fileSizeLabel: `${next.length} records`,
        uploadedAtLabel: 'Updated just now',
        headers: ['user_id', 'timestamp', 'lat', 'long', 'device_id', 'ip_address', 'login_result'],
      });
      return next;
    });
  };

  const runDetection = () => {
    if (!events.length) {
      setParseError('Upload a valid login dataset before running detection.');
      return;
    }

    const result = detectIdentityTheft(events, settings);
    setDetectionResult(result);
    setParseError(null);
  };

  const clearDataset = () => {
    setDatasetInfo(null);
    setEvents([]);
    setDetectionResult(null);
    setParseError(null);
  };

  const value = useMemo(
    () => ({
      settings,
      setSettings,
      datasetInfo,
      events,
      detectionResult,
      clearDataset,
      liveResult,
      parseError,
      uploadFile,
      loadEvents,
      addEvent,
      runDetection,
    }),
    [settings, datasetInfo, events, detectionResult, liveResult, parseError]
  );

  return <DetectionContext.Provider value={value}>{children}</DetectionContext.Provider>;
}

export function useDetection() {
  const context = useContext(DetectionContext);
  if (!context) {
    throw new Error('useDetection must be used within DetectionProvider');
  }
  return context;
}
