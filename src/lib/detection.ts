export type LoginEvent = {
  rowId: number;
  user_id: string;
  timestamp: string;
  lat: number;
  long: number;
  device_id: string;
  ip_address?: string;
  login_result?: string;
  /** All original columns preserved as key-value pairs for behavioral analysis */
  extra: Record<string, string>;
};

export type DetectionSettings = {
  warningThreshold: number;
  criticalThreshold: number;
  impossibleTravelSpeedKmh: number;
  rapidDeviceSwitchMinutes: number;
  burstWindowMinutes: number;
  burstEventCount: number;
};

export type EventRisk = {
  rowId: number;
  userId: string;
  timestamp: string;
  score: number;
  level: 'low' | 'medium' | 'high';
  reasons: string[];
};

export type FraudAlert = {
  id: string;
  severity: 'low' | 'medium' | 'high';
  userId: string;
  title: string;
  description: string;
  timestamp: string;
  score: number;
};

export type DetectionSummary = {
  totalEvents: number;
  totalUsers: number;
  anomalyCount: number;
  highRiskCount: number;
  mediumRiskCount: number;
  lowRiskCount: number;
  averageRiskScore: number;
};

export type TrendPoint = {
  label: string;
  value: number;
};

export type DetectionResult = {
  eventRisk: EventRisk[];
  alerts: FraudAlert[];
  summary: DetectionSummary;
  hourlyRiskTrend: TrendPoint[];
  dailyAlertTrend: TrendPoint[];
  topRiskUsers: Array<{ userId: string; maxScore: number; alertCount: number }>;
};

export const DEFAULT_SETTINGS: DetectionSettings = {
  warningThreshold: 55,
  criticalThreshold: 80,
  impossibleTravelSpeedKmh: 850,
  rapidDeviceSwitchMinutes: 20,
  burstWindowMinutes: 30,
  burstEventCount: 4,
};

const REQUIRED_HEADERS = ['user_id', 'timestamp', 'lat', 'long', 'device_id'] as const;

/* ── Smart column auto-mapper ─────────────────────────────────── */

/**
 * Alias dictionary: maps each of our canonical field names to an array of
 * common alternative column names found in real-world login / auth datasets.
 * Order matters — earlier aliases are preferred.
 */
const COLUMN_ALIASES: Record<string, string[]> = {
  user_id: [
    'user_id', 'userid', 'user', 'username', 'user_name', 'uid',
    'account_id', 'accountid', 'account', 'email', 'email_address',
    'login', 'login_id', 'loginid', 'subject', 'sub', 'identity',
    'member_id', 'memberid', 'emp_id', 'empid', 'employee_id',
    'client_id', 'clientid', 'name', 'id',
  ],
  timestamp: [
    'timestamp', 'time', 'datetime', 'date_time', 'date', 'login_time',
    'login_timestamp', 'event_time', 'event_timestamp', 'created_at',
    'createdat', 'logged_at', 'loggedat', 'ts', 'event_date',
    'login_date', 'access_time', 'auth_time', 'session_start',
    'start_time', 'logon_time', 'sign_in_time',
  ],
  lat: [
    'lat', 'latitude', 'geo_lat', 'geolat', 'location_lat',
    'loc_lat', 'y', 'start_lat', 'src_lat', 'origin_lat', 'gps_lat',
  ],
  long: [
    'long', 'longitude', 'lng', 'lon', 'geo_long', 'geolong',
    'location_long', 'loc_long', 'location_lng', 'loc_lng',
    'x', 'start_long', 'src_long', 'origin_long', 'gps_long',
    'start_lng', 'src_lng', 'origin_lng', 'gps_lng',
  ],
  device_id: [
    'device_id', 'deviceid', 'device', 'device_name', 'devicename',
    'device_fingerprint', 'fingerprint', 'browser', 'user_agent',
    'useragent', 'ua', 'client', 'device_type', 'devicetype',
    'machine', 'machine_id', 'machineid', 'hardware_id', 'hardwareid',
    'terminal', 'terminal_id', 'agent',
  ],
  ip_address: [
    'ip_address', 'ip', 'ipaddress', 'ip_addr', 'ipaddr',
    'source_ip', 'sourceip', 'src_ip', 'srcip', 'client_ip',
    'clientip', 'remote_ip', 'remoteip', 'origin_ip', 'originip',
    'host', 'address', 'network_address',
  ],
  login_result: [
    'login_result', 'result', 'status', 'outcome', 'success',
    'auth_result', 'authresult', 'login_status', 'loginstatus',
    'authentication_result', 'auth_status', 'response', 'action',
    'event_type', 'eventtype', 'login_outcome', 'pass_fail',
  ],
};

/**
 * Behavioural / statistical column aliases.
 * These aren't mapped to canonical LoginEvent fields — they're looked up
 * from event.extra at detection time.  Keys here are the normalised lookup
 * names used in the detection engine.
 */
const BEHAVIORAL_ALIASES: Record<string, string[]> = {
  failed_logins: [
    'failedloginattempts', 'failed_login_attempts', 'failedlogins',
    'failed_logins', 'login_failures', 'loginfailures', 'num_failed_logins',
  ],
  anomalous_activity: [
    'anomalousactivity', 'anomalous_activity', 'is_anomalous', 'isanomalous',
    'anomaly', 'anomaly_flag', 'anomalyflag',
  ],
  incident_reports: [
    'incidentreports', 'incident_reports', 'incidents', 'num_incidents',
    'security_incidents', 'securityincidents',
  ],
  password_resets: [
    'passwordresets', 'password_resets', 'pwd_resets', 'pwdresets',
    'num_password_resets', 'reset_count',
  ],
  access_sensitive: [
    'accesstosensitivedata', 'access_to_sensitive_data', 'sensitive_data',
    'sensitivedata', 'sensitive_access', 'sensitiveaccess',
  ],
  login_consistency: [
    'loginconsistency', 'login_consistency', 'login_regularity',
    'loginregularity',
  ],
  device_consistency: [
    'deviceconsistency', 'device_consistency', 'device_regularity',
    'deviceregularity',
  ],
  location_consistency: [
    'accesslocationconsistency', 'access_location_consistency',
    'locationconsistency', 'location_consistency', 'geo_consistency',
    'geoconsistency',
  ],
  failed_transactions: [
    'failedtransactions', 'failed_transactions', 'transaction_failures',
    'transactionfailures', 'num_failed_transactions',
  ],
  session_duration: [
    'sessionduration', 'session_duration', 'duration', 'session_length',
    'sessionlength', 'time_spent', 'timespent',
  ],
  mfa_enabled: [
    'mfaenabled', 'mfa_enabled', 'mfa', 'two_factor', 'twofactor',
    '2fa', 'multi_factor', 'multifactor',
  ],
  access_frequency: [
    'accessfrequency', 'access_frequency', 'login_frequency',
    'loginfrequency', 'frequency', 'num_accesses',
  ],
};

/** Fields that MUST be present for detection to work. */
const CRITICAL_FIELDS = ['user_id', 'timestamp'] as const;

/** Fields that are optional — if missing we fill sensible defaults. */
const OPTIONAL_DEFAULTS: Record<string, string> = {
  lat: '0',
  long: '0',
  device_id: 'unknown',
  ip_address: '',
  login_result: '',
};

export type ColumnMapping = {
  /** Maps our canonical field → the original column name that was matched. */
  mapped: Record<string, string>;
  /** Our fields that had no match and received default values. */
  defaults: string[];
  /** Original headers that weren't mapped to any of our fields. */
  ignored: string[];
  /** Human-readable summary lines for the UI. */
  notes: string[];
};

/**
 * Given a list of raw column headers from any dataset, produce a mapping to our
 * canonical schema.  Uses exact match → alias match → substring/fuzzy match.
 */
export function autoMapColumns(rawHeaders: string[]): ColumnMapping {
  const lowerHeaders = rawHeaders.map((h) => h.trim().toLowerCase().replace(/[^a-z0-9_]/g, '_'));
  const used = new Set<number>(); // indices in rawHeaders already claimed
  const mapped: Record<string, string> = {};
  const defaults: string[] = [];
  const notes: string[] = [];

  const allFields = Object.keys(COLUMN_ALIASES);

  for (const field of allFields) {
    const aliases = COLUMN_ALIASES[field];
    let matchIdx = -1;

    // Pass 1 — exact match against alias list
    for (const alias of aliases) {
      const idx = lowerHeaders.findIndex((h, i) => !used.has(i) && h === alias);
      if (idx !== -1) { matchIdx = idx; break; }
    }

    // Pass 2 — substring: header contains alias or alias contains header
    if (matchIdx === -1) {
      for (const alias of aliases) {
        const idx = lowerHeaders.findIndex(
          (h, i) => !used.has(i) && (h.includes(alias) || alias.includes(h)) && h.length > 1,
        );
        if (idx !== -1) { matchIdx = idx; break; }
      }
    }

    // Pass 3 — token overlap (for multi-word headers like "User Name")
    if (matchIdx === -1) {
      for (const alias of aliases) {
        const aliasTokens = alias.split('_');
        const idx = lowerHeaders.findIndex((h, i) => {
          if (used.has(i)) return false;
          const headerTokens = h.split('_');
          const overlap = aliasTokens.filter((t) => headerTokens.includes(t));
          return overlap.length > 0 && overlap.length >= aliasTokens.length * 0.5;
        });
        if (idx !== -1) { matchIdx = idx; break; }
      }
    }

    if (matchIdx !== -1) {
      used.add(matchIdx);
      mapped[field] = rawHeaders[matchIdx];
      if (lowerHeaders[matchIdx] !== field) {
        notes.push(`"${rawHeaders[matchIdx]}" → ${field}`);
      }
    } else if (field in OPTIONAL_DEFAULTS) {
      defaults.push(field);
      notes.push(`${field}: not found — using default`);
    } else {
      // critical field missing — we'll note it; callers throw
      notes.push(`⚠ ${field}: could not be identified in the dataset`);
    }
  }

  const ignored = rawHeaders.filter((_, i) => !used.has(i));
  if (ignored.length > 0) {
    notes.push(`Extra columns ignored: ${ignored.join(', ')}`);
  }

  return { mapped, defaults, ignored, notes };
}

/** Apply the column mapping to a key-value row returning a LoginEvent */
function applyMapping(
  row: Record<string, string>,
  mapping: ColumnMapping,
  rowId: number,
): LoginEvent {
  const get = (field: string): string => {
    const originalCol = mapping.mapped[field];
    if (originalCol !== undefined) {
      // Try exact original, then lowercased key
      return row[originalCol] ?? row[originalCol.toLowerCase()] ?? OPTIONAL_DEFAULTS[field] ?? '';
    }
    return OPTIONAL_DEFAULTS[field] ?? '';
  };

  // Preserve ALL original columns as extras for behavioural analysis
  const extra: Record<string, string> = {};
  for (const [k, v] of Object.entries(row)) {
    extra[k.toLowerCase().replace(/[^a-z0-9]/g, '')] = v;
  }

  return {
    rowId,
    user_id: get('user_id'),
    timestamp: get('timestamp'),
    lat: Number(get('lat')) || 0,
    long: Number(get('long')) || 0,
    device_id: get('device_id') || 'unknown',
    ip_address: get('ip_address') || undefined,
    login_result: get('login_result') || undefined,
    extra,
  };
}

/** Throws if critical fields (user_id, timestamp) could not be mapped. */
function validateMapping(mapping: ColumnMapping): void {
  const missingCritical = CRITICAL_FIELDS.filter((f) => !(f in mapping.mapped));
  if (missingCritical.length > 0) {
    const hint = missingCritical
      .map((f) => `"${f}" (looked for: ${COLUMN_ALIASES[f].slice(0, 6).join(', ')}, …)`)
      .join('; ');
    throw new Error(
      `Could not identify critical columns: ${missingCritical.join(', ')}. ` +
      `Please ensure your dataset contains columns like: ${hint}`,
    );
  }
}

function parseCsvLine(line: string): string[] {
  const result: string[] = [];
  let token = '';
  let inQuotes = false;

  for (let index = 0; index < line.length; index++) {
    const char = line[index];
    const next = line[index + 1];

    if (char === '"') {
      if (inQuotes && next === '"') {
        token += '"';
        index++;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === ',' && !inQuotes) {
      result.push(token.trim());
      token = '';
      continue;
    }

    token += char;
  }

  result.push(token.trim());
  return result;
}

export function parseLoginCsv(
  csvText: string,
): { events: LoginEvent[]; headers: string[]; mapping: ColumnMapping } {
  const lines = csvText
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  if (lines.length < 2) {
    throw new Error('CSV must contain header and at least one data row.');
  }

  const rawHeaders = parseCsvLine(lines[0]);
  const mapping = autoMapColumns(rawHeaders);
  validateMapping(mapping);

  const events = lines.slice(1).map((line, idx) => {
    const values = parseCsvLine(line);
    const row: Record<string, string> = {};
    rawHeaders.forEach((header, i) => {
      row[header] = values[i] ?? '';
    });
    return applyMapping(row, mapping, idx + 1);
  });

  return { events, headers: rawHeaders, mapping };
}

/* ── JSON parser ──────────────────────────────────────────────── */
export function parseLoginJson(
  jsonText: string,
): { events: LoginEvent[]; headers: string[]; mapping: ColumnMapping } {
  let data: unknown;
  try {
    data = JSON.parse(jsonText);
  } catch {
    throw new Error('Invalid JSON — file could not be parsed.');
  }

  // Accept both a top-level array or { events: [...] } / { data: [...] } / { records: [...] }
  let rows: unknown[];
  if (Array.isArray(data)) {
    rows = data;
  } else if (data && typeof data === 'object') {
    const obj = data as Record<string, unknown>;
    const candidate = obj.events ?? obj.data ?? obj.records ?? obj.rows;
    if (Array.isArray(candidate)) {
      rows = candidate;
    } else {
      throw new Error('JSON must be an array or contain an "events", "data", "records", or "rows" array.');
    }
  } else {
    throw new Error('JSON must be an array of login event objects.');
  }

  if (rows.length === 0) {
    throw new Error('JSON array is empty — at least one event is required.');
  }

  const firstRow = rows[0] as Record<string, unknown>;
  const rawHeaders = Object.keys(firstRow);
  const mapping = autoMapColumns(rawHeaders);
  validateMapping(mapping);

  const events: LoginEvent[] = rows.map((raw, idx) => {
    const row = raw as Record<string, unknown>;
    const stringRow: Record<string, string> = {};
    for (const [k, v] of Object.entries(row)) {
      stringRow[k] = String(v ?? '');
    }
    return applyMapping(stringRow, mapping, idx + 1);
  });

  return { events, headers: rawHeaders, mapping };
}

/* ── PDF text parser (extracts tabular/structured text) ───────── */
export function parseLoginFromText(
  rawText: string,
): { events: LoginEvent[]; headers: string[]; mapping: ColumnMapping } {
  // Try to detect CSV-like content in the extracted text
  const lines = rawText
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  // Try CSV parse first — check if first line looks like a comma-separated header
  if (lines[0]?.includes(',')) {
    try {
      return parseLoginCsv(lines.join('\n'));
    } catch { /* fall through to other strategies */ }
  }

  // Try JSON embedded in PDF text
  const jsonMatch = rawText.match(/\[[\s\S]*\]/);
  if (jsonMatch) {
    try {
      return parseLoginJson(jsonMatch[0]);
    } catch { /* fall through */ }
  }

  // Try to parse whitespace/tab separated content
  // Find best candidate header line — the line with the most column alias matches
  let bestHeaderIdx = -1;
  let bestScore = 0;
  const allAliasValues = Object.values(COLUMN_ALIASES).flat();

  for (let i = 0; i < Math.min(lines.length, 20); i++) {
    const tokens = lines[i].toLowerCase().split(/[\t|]+|\s{2,}/).map((t) => t.trim().replace(/[^a-z0-9_]/g, '_')).filter(Boolean);
    const score = tokens.filter((t) => allAliasValues.includes(t)).length;
    if (score > bestScore) {
      bestScore = score;
      bestHeaderIdx = i;
    }
  }

  if (bestHeaderIdx === -1 || bestScore < 2) {
    throw new Error(
      'Could not detect login event data in PDF. The file must contain a table or structured data ' +
      'with recognisable column headers (e.g. user, timestamp, latitude, longitude, device, ip, etc.).',
    );
  }

  const rawHeaders = lines[bestHeaderIdx].split(/[\t|]+|\s{2,}/).map((h) => h.trim()).filter(Boolean);
  const mapping = autoMapColumns(rawHeaders);
  validateMapping(mapping);

  const events: LoginEvent[] = [];
  for (let i = bestHeaderIdx + 1; i < lines.length; i++) {
    const tokens = lines[i].split(/[\t|]+|\s{2,}/).map((t) => t.trim()).filter(Boolean);
    if (tokens.length < rawHeaders.length * 0.5) continue; // skip malformed

    const row: Record<string, string> = {};
    rawHeaders.forEach((h, idx) => {
      row[h] = tokens[idx] ?? '';
    });

    // Skip header repeats
    const firstMappedCol = mapping.mapped.user_id;
    if (firstMappedCol && row[firstMappedCol]?.toLowerCase() === firstMappedCol.toLowerCase()) continue;

    events.push(applyMapping(row, mapping, events.length + 1));
  }

  if (events.length === 0) {
    throw new Error('PDF contained a header row but no parseable data rows.');
  }

  return { events, headers: rawHeaders, mapping };
}

function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const r = 6371;
  const toRad = (v: number) => (v * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * r * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function riskLevel(score: number, settings: DetectionSettings): 'low' | 'medium' | 'high' {
  if (score >= settings.criticalThreshold) return 'high';
  if (score >= settings.warningThreshold) return 'medium';
  return 'low';
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function toHourLabel(timestamp: string): string {
  const date = new Date(timestamp);
  const hour = Number.isNaN(date.getTime()) ? 0 : date.getHours();
  return `${hour.toString().padStart(2, '0')}:00`;
}

function toDateLabel(timestamp: string): string {
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) return 'Unknown';
  return date.toISOString().slice(0, 10);
}

export function detectIdentityTheft(events: LoginEvent[], settings: DetectionSettings): DetectionResult {
  const sorted = [...events].sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );

  const perUser = new Map<string, LoginEvent[]>();
  for (const event of sorted) {
    const arr = perUser.get(event.user_id) ?? [];
    arr.push(event);
    perUser.set(event.user_id, arr);
  }

  // Detect if the dataset has real geo/timestamp data or is purely behavioural
  const hasRealGeo = events.some((e) => e.lat !== 0 || e.long !== 0);
  const hasRealTimestamps = events.some((e) => !Number.isNaN(new Date(e.timestamp).getTime()));
  const hasRealDevices = events.some((e) => e.device_id !== 'unknown' && e.device_id !== '');

  // Check if behavioural signals exist by probing the first event's extras
  const firstEvent = events[0];
  const hasBehavioralData = firstEvent && Object.keys(firstEvent.extra).length > 0;

  /** Resolve a behavioural field value from event extras */
  function getBehavioral(event: LoginEvent, field: string): number {
    const aliases = BEHAVIORAL_ALIASES[field];
    if (!aliases) return 0;
    for (const alias of aliases) {
      const normalized = alias.replace(/[^a-z0-9]/g, '');
      if (normalized in event.extra) {
        const val = Number(event.extra[normalized]);
        return Number.isNaN(val) ? 0 : val;
      }
    }
    return 0;
  }

  /** Compute population statistics for a behavioural field to detect outliers */
  function computeStats(field: string): { mean: number; std: number } {
    const values = events.map((e) => getBehavioral(e, field)).filter((v) => v !== 0 || events.some((e) => getBehavioral(e, field) !== 0));
    if (values.length === 0) return { mean: 0, std: 0 };
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const variance = values.reduce((a, b) => a + (b - mean) ** 2, 0) / values.length;
    return { mean, std: Math.sqrt(variance) };
  }

  // Pre-compute stats for outlier detection in behavioural mode
  const behavioralStats = hasBehavioralData ? {
    failed_logins: computeStats('failed_logins'),
    incident_reports: computeStats('incident_reports'),
    password_resets: computeStats('password_resets'),
    failed_transactions: computeStats('failed_transactions'),
    access_frequency: computeStats('access_frequency'),
  } : null;

  const eventRisk: EventRisk[] = [];

  for (const [userId, userEvents] of perUser.entries()) {
    for (let i = 0; i < userEvents.length; i++) {
      const current = userEvents[i];
      const previous = i > 0 ? userEvents[i - 1] : undefined;

      let score = 5;
      const reasons: string[] = [];

      const ts = new Date(current.timestamp).getTime();
      const hour = Number.isNaN(ts) ? 12 : new Date(ts).getHours();

      // ── Traditional geo/device/time-based checks ──────────────
      if (hasRealTimestamps && hour <= 4) {
        score += 10;
        reasons.push('Off-hours login activity');
      }

      if (hasRealDevices && !current.device_id.trim()) {
        score += 20;
        reasons.push('Missing device fingerprint');
      }

      if (hasRealGeo) {
        const latInvalid = Number.isNaN(current.lat) || current.lat < -90 || current.lat > 90;
        const lonInvalid = Number.isNaN(current.long) || current.long < -180 || current.long > 180;
        if (latInvalid || lonInvalid) {
          score += 35;
          reasons.push('Invalid or spoofed geolocation coordinates');
        }
      }

      if ((current.login_result ?? '').toLowerCase() === 'failed') {
        score += 18;
        reasons.push('Failed authentication attempt');
      }

      if (previous && hasRealTimestamps) {
        const prevTime = new Date(previous.timestamp).getTime();
        const minutesApart = Number.isNaN(ts) || Number.isNaN(prevTime) ? Infinity : (ts - prevTime) / 60000;

        if (
          hasRealDevices &&
          previous.device_id &&
          current.device_id &&
          previous.device_id !== current.device_id &&
          minutesApart <= settings.rapidDeviceSwitchMinutes
        ) {
          score += 22;
          reasons.push('Rapid device switching detected');
        }

        if (
          hasRealGeo &&
          !Number.isNaN(previous.lat) &&
          !Number.isNaN(previous.long) &&
          !Number.isNaN(current.lat) &&
          !Number.isNaN(current.long) &&
          minutesApart > 0
        ) {
          const distance = haversineKm(previous.lat, previous.long, current.lat, current.long);
          const speed = distance / (minutesApart / 60);
          if (distance > 350 && speed > settings.impossibleTravelSpeedKmh) {
            score += 30;
            reasons.push(`Impossible travel pattern (${Math.round(speed)} km/h)`);
          }
        }

        if (
          previous.ip_address &&
          current.ip_address &&
          previous.ip_address !== current.ip_address &&
          minutesApart <= 15
        ) {
          score += 12;
          reasons.push('Fast IP reputation shift detected');
        }
      }

      if (hasRealTimestamps) {
        const burstWindowStart = ts - settings.burstWindowMinutes * 60000;
        const recentCount = userEvents.filter((e) => {
          const t = new Date(e.timestamp).getTime();
          return !Number.isNaN(t) && t >= burstWindowStart && t <= ts;
        }).length;

        if (recentCount >= settings.burstEventCount) {
          score += 18;
          reasons.push('Unusual login burst frequency');
        }
      }

      // ── Behavioural / statistical checks ─────────────────────
      if (hasBehavioralData) {
        // Anomalous activity flag (direct boolean flag in dataset)
        const anomalousFlag = getBehavioral(current, 'anomalous_activity');
        if (anomalousFlag === 1) {
          score += 15;
          reasons.push('Flagged as anomalous activity in dataset');
        }

        // Sensitive data access
        const sensitiveAccess = getBehavioral(current, 'access_sensitive');
        if (sensitiveAccess === 1) {
          score += 10;
          reasons.push('Accessed sensitive/restricted data');
        }

        // MFA not enabled
        const mfaEnabled = getBehavioral(current, 'mfa_enabled');
        // Only flag if the dataset actually has MFA data
        if (BEHAVIORAL_ALIASES.mfa_enabled.some((a) => a.replace(/[^a-z0-9]/g, '') in current.extra)) {
          if (mfaEnabled === 0) {
            score += 12;
            reasons.push('Multi-factor authentication disabled');
          }
        }

        // Failed login attempts (high count)
        const failedLogins = getBehavioral(current, 'failed_logins');
        if (failedLogins >= 5) {
          score += 18;
          reasons.push(`High failed login attempts (${failedLogins})`);
        } else if (failedLogins >= 3) {
          score += 10;
          reasons.push(`Elevated failed login attempts (${failedLogins})`);
        }

        // Incident reports
        const incidents = getBehavioral(current, 'incident_reports');
        if (behavioralStats && behavioralStats.incident_reports.std > 0) {
          const zScore = (incidents - behavioralStats.incident_reports.mean) / behavioralStats.incident_reports.std;
          if (zScore > 1.5) {
            score += 14;
            reasons.push(`Abnormal incident report count (${incidents})`);
          }
        } else if (incidents >= 4) {
          score += 14;
          reasons.push(`High incident reports (${incidents})`);
        }

        // Password resets
        const pwdResets = getBehavioral(current, 'password_resets');
        if (behavioralStats && behavioralStats.password_resets.std > 0) {
          const zScore = (pwdResets - behavioralStats.password_resets.mean) / behavioralStats.password_resets.std;
          if (zScore > 1.5) {
            score += 12;
            reasons.push(`Frequent password resets (${pwdResets})`);
          }
        } else if (pwdResets >= 4) {
          score += 12;
          reasons.push(`Frequent password resets (${pwdResets})`);
        }

        // Failed transactions
        const failedTx = getBehavioral(current, 'failed_transactions');
        if (behavioralStats && behavioralStats.failed_transactions.std > 0) {
          const zScore = (failedTx - behavioralStats.failed_transactions.mean) / behavioralStats.failed_transactions.std;
          if (zScore > 1.5) {
            score += 12;
            reasons.push(`Abnormal failed transactions (${failedTx})`);
          }
        } else if (failedTx >= 5) {
          score += 12;
          reasons.push(`High failed transactions (${failedTx})`);
        }

        // Low device consistency (0 = inconsistent)
        const deviceConsistency = getBehavioral(current, 'device_consistency');
        if (BEHAVIORAL_ALIASES.device_consistency.some((a) => a.replace(/[^a-z0-9]/g, '') in current.extra)) {
          if (deviceConsistency === 0) {
            score += 10;
            reasons.push('Inconsistent device usage pattern');
          }
        }

        // Low location consistency
        const locationConsistency = getBehavioral(current, 'location_consistency');
        if (BEHAVIORAL_ALIASES.location_consistency.some((a) => a.replace(/[^a-z0-9]/g, '') in current.extra)) {
          if (locationConsistency === 0) {
            score += 10;
            reasons.push('Inconsistent access location pattern');
          }
        }

        // Low login consistency (< 3 on a 0-10 scale → very inconsistent)
        const loginConsistency = getBehavioral(current, 'login_consistency');
        if (BEHAVIORAL_ALIASES.login_consistency.some((a) => a.replace(/[^a-z0-9]/g, '') in current.extra)) {
          if (loginConsistency <= 2) {
            score += 8;
            reasons.push(`Low login time consistency (${loginConsistency}/10)`);
          }
        }
      }

      const normalizedScore = clamp(score, 0, 100);
      const level = riskLevel(normalizedScore, settings);
      eventRisk.push({
        rowId: current.rowId,
        userId,
        timestamp: current.timestamp,
        score: normalizedScore,
        level,
        reasons,
      });
    }
  }

  const alerts = eventRisk
    .sort((a, b) => b.score - a.score)
    .map((item, index) => ({
      id: `ALT-${(index + 1).toString().padStart(4, '0')}`,
      severity: item.level as 'low' | 'medium' | 'high',
      userId: item.userId,
      title: item.level === 'high' ? 'Potential Identity Theft Attempt' : item.level === 'medium' ? 'Suspicious Login Behavior' : 'Low Risk Activity',
      description: item.reasons[0] ?? 'Composite anomaly score exceeded threshold',
      timestamp: item.timestamp,
      score: item.score,
    } satisfies FraudAlert));

  const totalScore = eventRisk.reduce((sum, item) => sum + item.score, 0);
  const users = new Set(events.map((e) => e.user_id));

  const summary: DetectionSummary = {
    totalEvents: events.length,
    totalUsers: users.size,
    anomalyCount: alerts.length,
    highRiskCount: alerts.filter((a) => a.severity === 'high').length,
    mediumRiskCount: alerts.filter((a) => a.severity === 'medium').length,
    lowRiskCount: alerts.filter((a) => a.severity === 'low').length,
    averageRiskScore: eventRisk.length ? Number((totalScore / eventRisk.length).toFixed(1)) : 0,
  };

  const hourBuckets = new Map<string, number[]>();
  for (const item of eventRisk) {
    const key = toHourLabel(item.timestamp);
    const bucket = hourBuckets.get(key) ?? [];
    bucket.push(item.score);
    hourBuckets.set(key, bucket);
  }

  const hourlyRiskTrend = Array.from({ length: 24 }).map((_, hour) => {
    const label = `${hour.toString().padStart(2, '0')}:00`;
    const values = hourBuckets.get(label) ?? [];
    const average = values.length
      ? Number((values.reduce((sum, v) => sum + v, 0) / values.length).toFixed(1))
      : 0;
    return { label, value: average };
  });

  const dayBuckets = new Map<string, number>();
  for (const alert of alerts) {
    const key = toDateLabel(alert.timestamp);
    dayBuckets.set(key, (dayBuckets.get(key) ?? 0) + 1);
  }

  const dailyAlertTrend = Array.from(dayBuckets.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-7)
    .map(([label, value]) => ({ label, value }));

  const topRiskUsers = Array.from(users).map((userId) => {
    const userEvents = eventRisk.filter((e) => e.userId === userId);
    const maxScore = userEvents.reduce((max, event) => Math.max(max, event.score), 0);
    const alertCount = alerts.filter((a) => a.userId === userId).length;
    return { userId, maxScore, alertCount };
  })
  .sort((a, b) => b.maxScore - a.maxScore)
  .slice(0, 8);

  return {
    eventRisk,
    alerts,
    summary,
    hourlyRiskTrend,
    dailyAlertTrend,
    topRiskUsers,
  };
}
