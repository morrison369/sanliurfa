/**
 * Fraud Detection System
 * Task 128: Fraud Detection System
 */

import { db } from '../db';
import { sql } from 'drizzle-orm';

export interface FraudCheck {
  id: string;
  userId: string;
  type: string;
  riskScore: number;
  flags: FraudFlag[];
  status: 'pending' | 'approved' | 'rejected' | 'review';
  createdAt: Date;
}

export interface FraudFlag {
  rule: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
}

// Fraud detection rules
const FRAUD_RULES = {
  // Velocity checks
  multipleAccountsSameIP: { weight: 30, window: '1h' },
  rapidTransactions: { weight: 40, threshold: 5, window: '10m' },
  
  // Pattern checks
  suspiciousLocation: { weight: 25 },
  unusualSpending: { weight: 35, multiplier: 3 }, // 3x average
  
  // Identity checks
  disposableEmail: { weight: 20 },
  voipPhone: { weight: 15 },
  
  // Device checks
  emulatorDetected: { weight: 45 },
  proxyVPN: { weight: 30 },
};

export async function checkFraud(
  userId: string,
  type: 'registration' | 'payment' | 'withdrawal' | 'review',
  data: Record<string, any>
): Promise<FraudCheck> {
  const flags: FraudFlag[] = [];
  let riskScore = 0;

  // Check multiple accounts from same IP
  if (data.ip) {
    const ipCount = await db.execute(sql`
      SELECT COUNT(*) as count FROM user_sessions 
      WHERE ip_address = ${data.ip} AND created_at > NOW() - INTERVAL '1 hour'
    `);
    if (parseInt(ipCount.rows[0]?.count || '0') > 3) {
      flags.push({
        rule: 'multipleAccountsSameIP',
        severity: 'medium',
        description: 'Aynı IP den çoklu hesap',
      });
      riskScore += FRAUD_RULES.multipleAccountsSameIP.weight;
    }
  }

  // Check rapid transactions
  if (type === 'payment') {
    const recentCount = await db.execute(sql`
      SELECT COUNT(*) as count FROM payments 
      WHERE user_id = ${userId} AND created_at > NOW() - INTERVAL '10 minutes'
    `);
    if (parseInt(recentCount.rows[0]?.count || '0') > FRAUD_RULES.rapidTransactions.threshold) {
      flags.push({
        rule: 'rapidTransactions',
        severity: 'high',
        description: 'Çok hızlı işlem yapılıyor',
      });
      riskScore += FRAUD_RULES.rapidTransactions.weight;
    }
  }

  // Check disposable email
  if (data.email) {
    const disposableDomains = ['tempmail.com', '10minutemail.com', 'guerrillamail.com'];
    const domain = data.email.split('@')[1];
    if (disposableDomains.includes(domain)) {
      flags.push({
        rule: 'disposableEmail',
        severity: 'medium',
        description: 'Geçici e-posta kullanılıyor',
      });
      riskScore += FRAUD_RULES.disposableEmail.weight;
    }
  }

  const fraudCheck: FraudCheck = {
    id: generateId(),
    userId,
    type,
    riskScore: Math.min(riskScore, 100),
    flags,
    status: riskScore >= 70 ? 'rejected' : riskScore >= 40 ? 'review' : 'approved',
    createdAt: new Date(),
  };

  await db.execute(sql`
    INSERT INTO fraud_checks (id, user_id, type, risk_score, flags, status, created_at)
    VALUES (${fraudCheck.id}, ${fraudCheck.userId}, ${fraudCheck.type}, ${fraudCheck.riskScore}, ${JSON.stringify(flags)}, ${fraudCheck.status}, ${fraudCheck.createdAt})
  `);

  return fraudCheck;
}

export async function blockUser(userId: string, reason: string): Promise<void> {
  await db.execute(sql`UPDATE users SET status = 'blocked', blocked_reason = ${reason} WHERE id = ${userId}`);
  await db.execute(sql`INSERT INTO fraud_blocks (id, user_id, reason, created_at) VALUES (${generateId()}, ${userId}, ${reason}, ${new Date()})`);
}

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}
