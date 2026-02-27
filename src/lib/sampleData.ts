import type { LoginEvent } from './detection';

/**
 * Generates a realistic sample login activity dataset with a mix of normal
 * behavior and suspicious patterns (impossible travel, device switching,
 * off-hours logins, burst activity, failed logins).
 */

const USERS = ['alice_j', 'bob_smith', 'carol_dev', 'dave_ops', 'eve_admin', 'frank_hr', 'grace_fin', 'henry_eng'];

const DEVICES = ['Chrome-Win11', 'Safari-MacOS', 'Firefox-Ubuntu', 'Edge-Win10', 'Mobile-iOS', 'Mobile-Android'];

const IPS = ['192.168.1.10', '10.0.0.42', '172.16.5.3', '203.0.113.7', '198.51.100.55', '45.33.12.88', '91.198.174.2'];

type Location = { lat: number; long: number; city: string };

const LOCATIONS: Location[] = [
  { lat: 40.7128, long: -74.006, city: 'New York' },
  { lat: 51.5074, long: -0.1278, city: 'London' },
  { lat: 35.6762, long: 139.6503, city: 'Tokyo' },
  { lat: 37.7749, long: -122.4194, city: 'San Francisco' },
  { lat: 48.8566, long: 2.3522, city: 'Paris' },
  { lat: -33.8688, long: 151.2093, city: 'Sydney' },
  { lat: 55.7558, long: 37.6173, city: 'Moscow' },
  { lat: 19.076, long: 72.8777, city: 'Mumbai' },
];

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function jitter(value: number, range: number): number {
  return +(value + (Math.random() - 0.5) * range).toFixed(4);
}

function toISO(date: Date): string {
  return date.toISOString().replace('T', ' ').slice(0, 19);
}

export function generateSampleDataset(size: number = 80): LoginEvent[] {
  const events: LoginEvent[] = [];
  const baseDate = new Date('2026-02-25T08:00:00Z');
  let rowId = 1;

  // Normal activity for each user — spread over 3 days
  for (const user of USERS) {
    const homeLocation = pick(LOCATIONS);
    const homeDevice = pick(DEVICES);
    const homeIp = pick(IPS);
    const loginsPerDay = 2 + Math.floor(Math.random() * 3);

    for (let day = 0; day < 3; day++) {
      for (let login = 0; login < loginsPerDay; login++) {
        const date = new Date(baseDate);
        date.setDate(date.getDate() + day);
        date.setHours(8 + Math.floor(Math.random() * 10), Math.floor(Math.random() * 60));

        events.push({
          rowId: rowId++,
          user_id: user,
          timestamp: toISO(date),
          lat: jitter(homeLocation.lat, 0.05),
          long: jitter(homeLocation.long, 0.05),
          device_id: homeDevice,
          ip_address: homeIp,
          login_result: 'success',
          extra: {},
        });
      }
    }
  }

  // === Suspicious patterns ===

  // 1. Impossible travel — alice logs in from NYC then Tokyo within 30 min
  const travelTime = new Date(baseDate);
  travelTime.setDate(travelTime.getDate() + 1);
  travelTime.setHours(14, 0);
  events.push({
    rowId: rowId++,
    user_id: 'alice_j',
    timestamp: toISO(travelTime),
    lat: 40.7128,
    long: -74.006,
    device_id: 'Chrome-Win11',
    ip_address: '192.168.1.10',
    login_result: 'success',
    extra: {},
  });
  const travel2 = new Date(travelTime);
  travel2.setMinutes(travel2.getMinutes() + 15);
  events.push({
    rowId: rowId++,
    user_id: 'alice_j',
    timestamp: toISO(travel2),
    lat: 35.6762,
    long: 139.6503,
    device_id: 'Mobile-Android',
    ip_address: '91.198.174.2',
    login_result: 'success',
    extra: {},
  });

  // 2. Burst login — eve_admin has 6 logins in 10 minutes
  const burstBase = new Date(baseDate);
  burstBase.setDate(burstBase.getDate() + 2);
  burstBase.setHours(3, 10); // off-hours
  for (let i = 0; i < 6; i++) {
    const bTime = new Date(burstBase);
    bTime.setMinutes(bTime.getMinutes() + i * 2);
    events.push({
      rowId: rowId++,
      user_id: 'eve_admin',
      timestamp: toISO(bTime),
      lat: jitter(55.7558, 0.01),
      long: jitter(37.6173, 0.01),
      device_id: i % 2 === 0 ? 'Firefox-Ubuntu' : 'Mobile-iOS',
      ip_address: i % 2 === 0 ? '10.0.0.42' : '45.33.12.88',
      login_result: i < 3 ? 'failed' : 'success',
      extra: {},
    });
  }

  // 3. Rapid device switching — bob switches 4 devices in 20 min
  const switchBase = new Date(baseDate);
  switchBase.setDate(switchBase.getDate() + 1);
  switchBase.setHours(11, 0);
  for (let i = 0; i < 4; i++) {
    const sTime = new Date(switchBase);
    sTime.setMinutes(sTime.getMinutes() + i * 5);
    events.push({
      rowId: rowId++,
      user_id: 'bob_smith',
      timestamp: toISO(sTime),
      lat: jitter(51.5074, 0.02),
      long: jitter(-0.1278, 0.02),
      device_id: DEVICES[i],
      ip_address: IPS[i],
      login_result: 'success',
      extra: {},
    });
  }

  // 4. Off-hours with bad geo — frank logs in at 2 AM with invalid coords
  const offHour = new Date(baseDate);
  offHour.setDate(offHour.getDate() + 2);
  offHour.setHours(2, 30);
  events.push({
    rowId: rowId++,
    user_id: 'frank_hr',
    timestamp: toISO(offHour),
    lat: 999,
    long: -999,
    device_id: '',
    ip_address: '203.0.113.7',
    login_result: 'failed',
    extra: {},
  });

  // 5. Failed login storm — carol gets brute-forced
  const bruteBase = new Date(baseDate);
  bruteBase.setDate(bruteBase.getDate() + 2);
  bruteBase.setHours(16, 45);
  for (let i = 0; i < 5; i++) {
    const bfTime = new Date(bruteBase);
    bfTime.setMinutes(bfTime.getMinutes() + i);
    events.push({
      rowId: rowId++,
      user_id: 'carol_dev',
      timestamp: toISO(bfTime),
      lat: jitter(37.7749, 0.01),
      long: jitter(-122.4194, 0.01),
      device_id: 'Tor-Browser',
      ip_address: `45.33.${10 + i}.${100 + i}`,
      login_result: i < 4 ? 'failed' : 'success',
      extra: {},
    });
  }

  // Sort all events by timestamp, trim to requested size
  events.sort((a, b) => a.timestamp.localeCompare(b.timestamp));
  const trimmed = events.slice(0, size);
  return trimmed.map((e, i) => ({ ...e, rowId: i + 1 }));
}
