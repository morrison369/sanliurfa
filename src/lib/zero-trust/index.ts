/**
 * Zero-Trust Security Architecture
 * Task 140: Advanced Security
 */

import { db } from '../db';
import { sql } from 'drizzle-orm';

export interface DeviceTrust {
  deviceId: string;
  userId: string;
  trustScore: number;
  fingerprint: string;
  lastVerified: Date;
  riskFactors: string[];
}

export interface AccessContext {
  userId: string;
  deviceId: string;
  ip: string;
  location: { country: string; city: string };
  time: Date;
  resource: string;
  action: string;
}

// Zero-trust policies
const POLICIES = {
  mfaRequired: (context: AccessContext) => context.resource.startsWith('/admin'),
  deviceTrusted: (device: DeviceTrust) => device.trustScore >= 0.7,
  locationAllowed: (context: AccessContext) => context.location.country === 'TR',
  timeAllowed: (context: AccessContext) => {
    const hour = context.time.getHours();
    return hour >= 6 && hour <= 23;
  },
};

/**
 * Verify device trust
 */
export async function verifyDeviceTrust(
  deviceId: string,
  userId: string,
  fingerprint: string
): Promise<DeviceTrust> {
  let device = await getDevice(deviceId);
  
  if (!device) {
    device = await registerDevice(deviceId, userId, fingerprint);
  }

  // Calculate trust score
  const score = calculateTrustScore(device);
  const riskFactors = identifyRisks(device);

  device.trustScore = score;
  device.riskFactors = riskFactors;
  device.lastVerified = new Date();

  await updateDevice(device);

  return device;
}

/**
 * Authorize access request
 */
export async function authorizeAccess(
  context: AccessContext,
  device: DeviceTrust
): Promise<{
  allowed: boolean;
  requiresMFA: boolean;
  reasons: string[];
}> {
  const reasons: string[] = [];
  let requiresMFA = false;

  // Check MFA requirement
  if (POLICIES.mfaRequired(context)) {
    requiresMFA = true;
    reasons.push('Hassas kaynak erişimi için MFA gerekli');
  }

  // Check device trust
  if (!POLICIES.deviceTrusted(device)) {
    reasons.push(`Cihaz güven skoru düşük: ${device.trustScore.toFixed(2)}`);
  }

  // Check location
  if (!POLICIES.locationAllowed(context)) {
    reasons.push('Yurtdışı erişim tespit edildi');
    requiresMFA = true;
  }

  // Check time
  if (!POLICIES.timeAllowed(context)) {
    reasons.push('Anormal saatte erişim');
    requiresMFA = true;
  }

  // Log access attempt
  await logAccessAttempt(context, reasons.length === 0, reasons);

  return {
    allowed: reasons.length === 0 || (requiresMFA && reasons.length < 3),
    requiresMFA,
    reasons,
  };
}

/**
 * Register device
 */
async function registerDevice(
  deviceId: string,
  userId: string,
  fingerprint: string
): Promise<DeviceTrust> {
  const device: DeviceTrust = {
    deviceId,
    userId,
    trustScore: 0.5,
    fingerprint,
    lastVerified: new Date(),
    riskFactors: ['new_device'],
  };

  await db.execute(sql`
    INSERT INTO device_trust (device_id, user_id, trust_score, fingerprint, last_verified, risk_factors, created_at)
    VALUES (${device.deviceId}, ${device.userId}, ${device.trustScore}, ${device.fingerprint}, ${device.lastVerified}, ${JSON.stringify(device.riskFactors)}, ${new Date()})
  `);

  return device;
}

async function getDevice(deviceId: string): Promise<DeviceTrust | null> {
  const result = await db.execute(sql`SELECT * FROM device_trust WHERE device_id = ${deviceId}`);
  if (!result.rows[0]) return null;

  return {
    deviceId: result.rows[0].device_id,
    userId: result.rows[0].user_id,
    trustScore: parseFloat(result.rows[0].trust_score),
    fingerprint: result.rows[0].fingerprint,
    lastVerified: new Date(result.rows[0].last_verified),
    riskFactors: JSON.parse(result.rows[0].risk_factors || '[]'),
  };
}

async function updateDevice(device: DeviceTrust): Promise<void> {
  await db.execute(sql`
    UPDATE device_trust 
    SET trust_score = ${device.trustScore}, risk_factors = ${JSON.stringify(device.riskFactors)}, last_verified = ${device.lastVerified}
    WHERE device_id = ${device.deviceId}
  `);
}

function calculateTrustScore(device: DeviceTrust): number {
  let score = 0.5;

  // Age factor
  const age = Date.now() - device.lastVerified.getTime();
  if (age > 30 * 24 * 60 * 60 * 1000) score += 0.2; // 30+ days

  // Risk factor penalty
  score -= device.riskFactors.length * 0.1;

  return Math.max(0, Math.min(1, score));
}

function identifyRisks(device: DeviceTrust): string[] {
  const risks: string[] = [];
  
  if (device.fingerprint.includes('emulator')) risks.push('emulator');
  if (device.fingerprint.includes('rooted')) risks.push('rooted_device');
  
  return risks;
}

async function logAccessAttempt(
  context: AccessContext,
  allowed: boolean,
  reasons: string[]
): Promise<void> {
  await db.execute(sql`
    INSERT INTO access_logs (id, user_id, device_id, ip, resource, action, allowed, reasons, created_at)
    VALUES (${generateId()}, ${context.userId}, ${context.deviceId}, ${context.ip}, ${context.resource}, ${context.action}, ${allowed}, ${JSON.stringify(reasons)}, ${new Date()})
  `);
}

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}
