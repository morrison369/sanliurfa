/**
 * Phase 286: Corporate Travel Intelligence
 * Travel spend analytics, policy compliance, carbon tracking, traveler safety
 */

import { logger } from './logger';

interface TravelBookingRecord {
  bookingId: string;
  travelerId: string;
  travelerName: string;
  department: string;
  tripType: 'domestic' | 'international' | 'regional';
  purposeType: 'client_meeting' | 'conference' | 'internal_meeting' | 'training' | 'sales' | 'other';
  originCity: string;
  destinationCity: string;
  departureDate: number;
  returnDate: number;
  durationDays: number;
  flightCost: number;
  hotelCost: number;
  groundTransportCost: number;
  mealsCost: number;
  otherCost: number;
  totalCost: number;
  withinPolicy: boolean;
  policyExceptionReason?: string;
  carbonKgCO2: number;
  status: 'booked' | 'in_progress' | 'completed' | 'cancelled';
  createdAt: number;
}

interface TravelPolicyRecord {
  policyId: string;
  policyName: string;
  maxFlightCostDomestic: number;
  maxFlightCostInternational: number;
  maxHotelCostPerNight: number;
  maxMealsPerDayUSD: number;
  bookingAdvanceDays: number;     // must book N days in advance
  approvalThresholdUSD: number;   // trips above this need approval
  preferredVendors: string[];
  effectiveDate: number;
  status: 'active' | 'draft' | 'superseded';
  createdAt: number;
}

interface TravelSpendRecord {
  recordId: string;
  period: string;
  totalSpend: number;
  flightSpend: number;
  hotelSpend: number;
  groundTransportSpend: number;
  mealsSpend: number;
  totalTrips: number;
  avgTripCost: number;
  policyComplianceRatePct: number;
  savingsFromNegotiatedRates: number;
  topSpendDepartments: string[];
  calculatedAt: number;
}

interface TravelerSafetyRecord {
  recordId: string;
  period: string;
  travelersAbroad: number;
  highRiskDestinations: number;
  safetyIncidents: number;
  emergencyContactsUpdated: number;
  travelerBriefingsCompleted: number;
  visaComplianceRatePct: number;
  travelInsuranceCoveragePct: number;
  riskScore: number;              // 0-100 (100 = highest risk)
  calculatedAt: number;
}

class TravelBookingManager {
  private bookings: Map<string, TravelBookingRecord> = new Map();
  private counter = 0;

  book(travelerId: string, travelerName: string, department: string, tripType: TravelBookingRecord['tripType'], purpose: TravelBookingRecord['purposeType'], origin: string, destination: string, departure: number, returnDate: number, flightCost: number, hotelCost: number, groundCost: number, mealsCost: number, otherCost: number, carbonKg: number, policy?: TravelPolicyRecord): TravelBookingRecord {
    const bookingId = `travel-${Date.now()}-${++this.counter}`;
    const totalCost = flightCost + hotelCost + groundCost + mealsCost + otherCost;
    const durationDays = Math.ceil((returnDate - departure) / 86400000);

    let withinPolicy = true;
    let policyException: string | undefined;
    if (policy) {
      const maxFlight = tripType === 'domestic' ? policy.maxFlightCostDomestic : policy.maxFlightCostInternational;
      if (flightCost > maxFlight) { withinPolicy = false; policyException = 'flight_cost_exceeded'; }
      const nightlyHotel = durationDays > 0 ? hotelCost / durationDays : 0;
      if (nightlyHotel > policy.maxHotelCostPerNight) { withinPolicy = false; policyException = 'hotel_rate_exceeded'; }
    }

    const record: TravelBookingRecord = {
      bookingId, travelerId, travelerName, department, tripType, purposeType: purpose,
      originCity: origin, destinationCity: destination, departureDate: departure, returnDate,
      durationDays, flightCost, hotelCost, groundTransportCost: groundCost, mealsCost,
      otherCost, totalCost, withinPolicy, policyExceptionReason: policyException,
      carbonKgCO2: carbonKg, status: 'booked', createdAt: Date.now()
    };
    this.bookings.set(bookingId, record);
    logger.debug('Travel booking created', { bookingId, travelerId, destination, totalCost });
    return record;
  }

  complete(bookingId: string): boolean {
    const booking = this.bookings.get(bookingId);
    if (!booking) return false;
    booking.status = 'completed';
    return true;
  }

  getPolicyViolations(): TravelBookingRecord[] {
    return Array.from(this.bookings.values()).filter(b => !b.withinPolicy);
  }

  getTotalCarbonKg(): number {
    return Array.from(this.bookings.values())
      .filter(b => b.status === 'completed')
      .reduce((s, b) => s + b.carbonKgCO2, 0);
  }

  getByDepartment(department: string): TravelBookingRecord[] {
    return Array.from(this.bookings.values()).filter(b => b.department === department);
  }

  getTopSpenders(limit = 5): { travelerId: string; travelerName: string; totalSpend: number }[] {
    const spendMap: Record<string, { name: string; spend: number }> = {};
    for (const b of this.bookings.values()) {
      if (!spendMap[b.travelerId]) spendMap[b.travelerId] = { name: b.travelerName, spend: 0 };
      spendMap[b.travelerId].spend += b.totalCost;
    }
    return Object.entries(spendMap)
      .map(([id, v]) => ({ travelerId: id, travelerName: v.name, totalSpend: v.spend }))
      .sort((a, b) => b.totalSpend - a.totalSpend)
      .slice(0, limit);
  }
}

class TravelPolicyManager {
  private policies: Map<string, TravelPolicyRecord> = new Map();
  private counter = 0;

  create(name: string, maxDomesticFlight: number, maxIntlFlight: number, maxHotelNight: number, maxMealsDay: number, bookingAdvance: number, approvalThreshold: number, preferredVendors: string[]): TravelPolicyRecord {
    const policyId = `travpol-${Date.now()}-${++this.counter}`;
    const policy: TravelPolicyRecord = {
      policyId, policyName: name, maxFlightCostDomestic: maxDomesticFlight,
      maxFlightCostInternational: maxIntlFlight, maxHotelCostPerNight: maxHotelNight,
      maxMealsPerDayUSD: maxMealsDay, bookingAdvanceDays: bookingAdvance,
      approvalThresholdUSD: approvalThreshold, preferredVendors,
      effectiveDate: Date.now(), status: 'active', createdAt: Date.now()
    };
    this.policies.set(policyId, policy);
    return policy;
  }

  getActive(): TravelPolicyRecord | undefined {
    return Array.from(this.policies.values()).find(p => p.status === 'active');
  }
}

class TravelSpendAnalyzer {
  private records: TravelSpendRecord[] = [];
  private counter = 0;

  analyze(period: string, bookings: TravelBookingRecord[]): TravelSpendRecord {
    const completed = bookings.filter(b => b.status === 'completed');
    const total = completed.reduce((s, b) => s + b.totalCost, 0);
    const compliantCount = completed.filter(b => b.withinPolicy).length;
    const deptSpend: Record<string, number> = {};
    for (const b of completed) deptSpend[b.department] = (deptSpend[b.department] || 0) + b.totalCost;
    const topDepts = Object.entries(deptSpend).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([k]) => k);

    const recordId = `travspend-${Date.now()}-${++this.counter}`;
    const record: TravelSpendRecord = {
      recordId, period, totalSpend: total,
      flightSpend: completed.reduce((s, b) => s + b.flightCost, 0),
      hotelSpend: completed.reduce((s, b) => s + b.hotelCost, 0),
      groundTransportSpend: completed.reduce((s, b) => s + b.groundTransportCost, 0),
      mealsSpend: completed.reduce((s, b) => s + b.mealsCost, 0),
      totalTrips: completed.length,
      avgTripCost: completed.length > 0 ? total / completed.length : 0,
      policyComplianceRatePct: completed.length > 0 ? (compliantCount / completed.length) * 100 : 100,
      savingsFromNegotiatedRates: total * 0.12, // assume 12% savings from preferred vendors
      topSpendDepartments: topDepts, calculatedAt: Date.now()
    };
    this.records.push(record);
    return record;
  }

  getLatest(): TravelSpendRecord | undefined {
    return this.records[this.records.length - 1];
  }

  getSpendTrend(): number[] {
    return this.records.map(r => r.totalSpend);
  }

  getComplianceTrend(): number[] {
    return this.records.map(r => r.policyComplianceRatePct);
  }
}

class TravelerSafetyMonitor {
  private records: TravelerSafetyRecord[] = [];
  private counter = 0;

  assess(period: string, travelersAbroad: number, highRiskDest: number, incidents: number, contactsUpdated: number, briefingsCompleted: number, visaCompliancePct: number, insurancePct: number): TravelerSafetyRecord {
    const riskScore =
      (highRiskDest / Math.max(1, travelersAbroad)) * 40 +
      (incidents / Math.max(1, travelersAbroad)) * 30 +
      Math.max(0, 100 - visaCompliancePct) * 0.2 +
      Math.max(0, 100 - insurancePct) * 0.1;

    const recordId = `travsafe-${Date.now()}-${++this.counter}`;
    const record: TravelerSafetyRecord = {
      recordId, period, travelersAbroad, highRiskDestinations: highRiskDest, safetyIncidents: incidents,
      emergencyContactsUpdated: contactsUpdated, travelerBriefingsCompleted: briefingsCompleted,
      visaComplianceRatePct: visaCompliancePct, travelInsuranceCoveragePct: insurancePct,
      riskScore: Math.max(0, Math.min(100, riskScore)), calculatedAt: Date.now()
    };
    this.records.push(record);
    return record;
  }

  getLatest(): TravelerSafetyRecord | undefined {
    return this.records[this.records.length - 1];
  }

  getRiskTrend(): number[] {
    return this.records.map(r => r.riskScore);
  }
}

export const travelBookingManager = new TravelBookingManager();
export const travelPolicyManager = new TravelPolicyManager();
export const travelSpendAnalyzer = new TravelSpendAnalyzer();
export const travelerSafetyMonitor = new TravelerSafetyMonitor();

export { TravelBookingRecord, TravelPolicyRecord, TravelSpendRecord, TravelerSafetyRecord };
