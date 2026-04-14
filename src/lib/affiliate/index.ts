/**
 * Affiliate & Referral System
 * Task 124: Affiliate & Referral System
 */

import { db } from '../db';
import { sql } from 'drizzle-orm';

export interface Affiliate {
  id: string;
  userId: string;
  code: string;
  status: 'active' | 'inactive' | 'suspended';
  commissionRate: number;
  totalReferrals: number;
  totalEarnings: number;
  pendingEarnings: number;
  paidEarnings: number;
  createdAt: Date;
}

export interface Referral {
  id: string;
  affiliateId: string;
  referredUserId: string;
  status: 'pending' | 'qualified' | 'converted' | 'expired';
  commission: number;
  conversionValue: number;
  createdAt: Date;
  convertedAt?: Date;
}

export async function createAffiliate(userId: string): Promise<Affiliate> {
  const code = generateCode();
  const affiliate: Affiliate = {
    id: generateId(),
    userId,
    code,
    status: 'active',
    commissionRate: 0.1, // 10%
    totalReferrals: 0,
    totalEarnings: 0,
    pendingEarnings: 0,
    paidEarnings: 0,
    createdAt: new Date(),
  };

  await db.execute(sql`
    INSERT INTO affiliates (id, user_id, code, status, commission_rate, total_referrals, total_earnings, pending_earnings, paid_earnings, created_at)
    VALUES (${affiliate.id}, ${affiliate.userId}, ${affiliate.code}, ${affiliate.status}, ${affiliate.commissionRate}, ${affiliate.totalReferrals}, ${affiliate.totalEarnings}, ${affiliate.pendingEarnings}, ${affiliate.paidEarnings}, ${affiliate.createdAt})
  `);

  return affiliate;
}

export async function trackReferral(code: string, referredUserId: string): Promise<void> {
  const affiliate = await db.execute(sql`SELECT id FROM affiliates WHERE code = ${code}`);
  if (!affiliate.rows[0]) return;

  await db.execute(sql`
    INSERT INTO referrals (id, affiliate_id, referred_user_id, status, commission, conversion_value, created_at)
    VALUES (${generateId()}, ${affiliate.rows[0].id}, ${referredUserId}, 'pending', 0, 0, ${new Date()})
  `);

  await db.execute(sql`UPDATE affiliates SET total_referrals = total_referrals + 1 WHERE id = ${affiliate.rows[0].id}`);
}

export async function convertReferral(referredUserId: string, value: number): Promise<void> {
  const referral = await db.execute(sql`SELECT * FROM referrals WHERE referred_user_id = ${referredUserId} AND status = 'pending'`);
  if (!referral.rows[0]) return;

  const affiliate = await db.execute(sql`SELECT commission_rate FROM affiliates WHERE id = ${referral.rows[0].affiliate_id}`);
  const commissionRate = parseFloat(affiliate.rows[0]?.commission_rate || '0.1');
  const commission = value * commissionRate;

  await db.execute(sql`
    UPDATE referrals 
    SET status = 'converted', commission = ${commission}, conversion_value = ${value}, converted_at = ${new Date()}
    WHERE id = ${referral.rows[0].id}
  `);

  await db.execute(sql`
    UPDATE affiliates 
    SET total_earnings = total_earnings + ${commission}, pending_earnings = pending_earnings + ${commission}
    WHERE id = ${referral.rows[0].affiliate_id}
  `);
}

function generateCode(): string {
  return 'REF' + Math.random().toString(36).substr(2, 6).toUpperCase();
}

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}
