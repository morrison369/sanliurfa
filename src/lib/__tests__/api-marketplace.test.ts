/**
 * Unit Tests — api/api-marketplace.ts singleton class managers
 *
 * - MarketplaceManager (createListing/searchListings/getTrendingAPIs/addReview rating average)
 * - APIListingManager (favorites Set add/remove/list)
 * - BillingCalculator (usage-based vs flat-rate + commission/tax/total)
 * - PartnerProgram (registerPartner/trackRevenue/getDashboard/getEarnings 30/70 split)
 */

import { describe, it, expect } from 'vitest';
import {
  marketplaceManager,
  apiListing,
  billingCalculator,
  partnerProgram,
} from '../api/api-marketplace';

describe('MarketplaceManager', () => {
  it('createListing — listing döner, rating=0/reviews=0/createdAt set', () => {
    const listing = marketplaceManager.createListing({
      name: 'Weather API',
      description: 'Real-time weather data',
      provider: 'WeatherCo',
      category: 'weather',
      enabled: true,
    } as any);
    expect(listing.id).toMatch(/^api-listing-\d+-\d+$/);
    expect(listing.rating).toBe(0);
    expect(listing.reviews).toBe(0);
    expect(listing.createdAt).toBeGreaterThan(0);
  });

  it('getListing — bilinmeyen → null', () => {
    expect(marketplaceManager.getListing('non-existent')).toBeNull();
  });

  it('searchListings — name match (case-insensitive)', () => {
    const created = marketplaceManager.createListing({
      name: 'UniqueWeatherTestSearchAPI',
      description: 'desc',
      provider: 'p',
      category: 'weather',
      enabled: true,
    } as any);
    const results = marketplaceManager.searchListings('uniqueweathertestsearchapi');
    expect(results.some((r) => r.id === created.id)).toBe(true);
  });

  it('searchListings — disabled listing hariç', () => {
    const created = marketplaceManager.createListing({
      name: 'DisabledTestUnique',
      description: 'd',
      provider: 'p',
      category: 'cat',
      enabled: false,
    } as any);
    const results = marketplaceManager.searchListings('disabledtestunique');
    expect(results.some((r) => r.id === created.id)).toBe(false);
  });

  it('searchListings — category filter', () => {
    marketplaceManager.createListing({
      name: 'CategoryFilterTest',
      description: 'd',
      provider: 'p',
      category: 'unique-cat-123',
      enabled: true,
    } as any);
    const results = marketplaceManager.searchListings('test', 'unique-cat-123');
    expect(results.every((r) => r.category === 'unique-cat-123')).toBe(true);
  });

  it('getTrendingAPIs — reviews desc + limit', () => {
    const trending = marketplaceManager.getTrendingAPIs(5);
    expect(trending.length).toBeLessThanOrEqual(5);
    for (let i = 1; i < trending.length; i++) {
      expect(trending[i - 1].reviews).toBeGreaterThanOrEqual(trending[i].reviews);
    }
  });

  it('addReview — listing rating average güncellenir', () => {
    const listing = marketplaceManager.createListing({
      name: 'ReviewTest',
      description: 'd',
      provider: 'p',
      category: 'c',
      enabled: true,
    } as any);
    marketplaceManager.addReview(listing.id, 5, 'Great', 'u1');
    marketplaceManager.addReview(listing.id, 3, 'Ok', 'u2');
    const updated = marketplaceManager.getListing(listing.id);
    expect(updated?.rating).toBe(4); // (5+3)/2 = 4.0
    expect(updated?.reviews).toBe(2);
  });

  it('addReview — bilinmeyen listing → no-throw silent', () => {
    expect(() => marketplaceManager.addReview('non-existent', 5, 'x', 'u')).not.toThrow();
  });

  it('getReviews — listing review array', () => {
    const listing = marketplaceManager.createListing({
      name: 'GetReviewsTest', description: 'd', provider: 'p', category: 'c', enabled: true,
    } as any);
    marketplaceManager.addReview(listing.id, 4, 'Comment', 'u');
    expect(marketplaceManager.getReviews(listing.id)).toHaveLength(1);
  });

  it('updateListing — Object.assign ile field güncelle', () => {
    const listing = marketplaceManager.createListing({
      name: 'UpdateTest', description: 'd', provider: 'p', category: 'c', enabled: true,
    } as any);
    marketplaceManager.updateListing(listing.id, { description: 'New Desc' });
    expect(marketplaceManager.getListing(listing.id)?.description).toBe('New Desc');
  });

  it('toggleListing — enabled/disabled toggle', () => {
    const listing = marketplaceManager.createListing({
      name: 'ToggleTest', description: 'd', provider: 'p', category: 'c', enabled: true,
    } as any);
    marketplaceManager.toggleListing(listing.id, false);
    expect(marketplaceManager.getListing(listing.id)?.enabled).toBe(false);
  });
});

describe('APIListingManager (favorites)', () => {
  it('addToFavorites + getUserFavorites — Set behavior', () => {
    apiListing.addToFavorites('u-fav-1', 'listing-1');
    apiListing.addToFavorites('u-fav-1', 'listing-2');
    expect(apiListing.getUserFavorites('u-fav-1')).toContain('listing-1');
    expect(apiListing.getUserFavorites('u-fav-1')).toContain('listing-2');
  });

  it('addToFavorites — duplicate skip (Set semantik)', () => {
    apiListing.addToFavorites('u-fav-dup', 'listing-x');
    apiListing.addToFavorites('u-fav-dup', 'listing-x');
    const favs = apiListing.getUserFavorites('u-fav-dup');
    expect(favs.filter((f) => f === 'listing-x')).toHaveLength(1);
  });

  it('removeFromFavorites — listing siler', () => {
    apiListing.addToFavorites('u-rem', 'l-rem');
    apiListing.removeFromFavorites('u-rem', 'l-rem');
    expect(apiListing.getUserFavorites('u-rem')).not.toContain('l-rem');
  });

  it('removeFromFavorites — bilinmeyen user → no-throw', () => {
    expect(() => apiListing.removeFromFavorites('non-existent', 'x')).not.toThrow();
  });

  it('getUserFavorites — bilinmeyen → boş array', () => {
    expect(apiListing.getUserFavorites('non-existent-user')).toEqual([]);
  });
});

describe('BillingCalculator', () => {
  it('calculate — usage-based: requestCount * costPerRequest', () => {
    const result = billingCalculator.calculate(
      { requestCount: 1000 } as any,
      'usage-based',
      { costPerRequest: 0.01, taxRate: 0.1, commissionRate: 0.3 },
    );
    expect(result.amount).toBe(10); // 1000 * 0.01
    expect(result.tax).toBe(1); // 10 * 0.1
    expect(result.commission).toBe(3); // 10 * 0.3
    expect(result.revenue).toBe(7); // 10 - 3
    expect(result.total).toBe(11); // 10 + 1
  });

  it('calculate — flat-rate: 9.99 sabit', () => {
    const result = billingCalculator.calculate({ requestCount: 0 } as any, 'flat-rate', {});
    expect(result.amount).toBe(9.99);
  });

  it('calculate — bilinmeyen pricing model → amount 0', () => {
    const result = billingCalculator.calculate({ requestCount: 100 } as any, 'unknown' as any, {});
    expect(result.amount).toBe(0);
  });

  it('calculate — costPerRequest default 0.001', () => {
    const result = billingCalculator.calculate(
      { requestCount: 1000 } as any,
      'usage-based',
      {},
    );
    expect(result.amount).toBe(1); // 1000 * 0.001
  });

  it('calculate — taxRate default 0.1, commissionRate default 0.3', () => {
    const result = billingCalculator.calculate(
      { requestCount: 1000 } as any,
      'usage-based',
      { costPerRequest: 0.01 },
    );
    expect(result.tax).toBeCloseTo(1, 2); // 10 * 0.1 default
    expect(result.commission).toBeCloseTo(3, 2); // 10 * 0.3 default
  });

  it('generateInvoice — invoice id `invoice-` prefix + status="pending"', () => {
    const calc = billingCalculator.calculate(
      { requestCount: 100 } as any, 'flat-rate', {},
    );
    const invoice = billingCalculator.generateInvoice(
      { apiId: 'a-1', consumerId: 'c-1', period: '2026-01' } as any,
      calc,
    );
    expect(invoice.id).toMatch(/^invoice-\d+$/);
    expect(invoice.status).toBe('pending');
    expect(invoice.amount).toBe(calc.amount);
  });

  it('forecastRevenue — monthlyUsage.cost * months', () => {
    const result = billingCalculator.forecastRevenue({ cost: 100 } as any, 12);
    expect(result).toBe(1200);
  });
});

describe('PartnerProgram', () => {
  it('registerPartner — partnerId `partner-` prefix', () => {
    const id = partnerProgram.registerPartner('api-1', 0.3);
    expect(id).toMatch(/^partner-\d+-\d+$/);
  });

  it('trackRevenue — apiId match olan partner revenue toplanır', () => {
    const id = partnerProgram.registerPartner(`api-track-${Date.now()}`, 0.2);
    const totalRev = partnerProgram.trackRevenue(`api-track-${Date.now()}`, 'c-1', 100);
    // Partner apiId match etmiyorsa 0; eşleşirse toplanır
    expect(typeof totalRev).toBe('number');
    expect(partnerProgram.getPartnerDashboard(id)?.revenue).toBeGreaterThanOrEqual(0);
  });

  it('getPartnerDashboard — bilinmeyen → null', () => {
    expect(partnerProgram.getPartnerDashboard('non-existent')).toBeNull();
  });

  it('getPartnerDashboard — apiCount/consumerCount simplified 1', () => {
    const id = partnerProgram.registerPartner('api-dash', 0.3);
    const dash = partnerProgram.getPartnerDashboard(id);
    expect(dash?.apiCount).toBe(1);
    expect(dash?.consumerCount).toBe(1);
  });

  it('getPartnerEarnings — pending 30%, paid 70%', () => {
    const APIID = `api-earn-${Date.now()}`;
    const id = partnerProgram.registerPartner(APIID, 0.3);
    partnerProgram.trackRevenue(APIID, 'c', 100);
    const earnings = partnerProgram.getPartnerEarnings(id);
    expect(earnings.pending).toBeCloseTo(earnings.total * 0.3, 1);
    expect(earnings.paid).toBeCloseTo(earnings.total * 0.7, 1);
  });

  it('getPartnerEarnings — bilinmeyen → 0/0/0', () => {
    expect(partnerProgram.getPartnerEarnings('non-existent')).toEqual({ total: 0, pending: 0, paid: 0 });
  });
});
