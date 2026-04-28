# Architecture Guide

Comprehensive system design for Şanlıurfa.com.

## System Overview

Enterprisefeatures: Real-time analytics (SSE), social feed, loyalty system, subscriptions, moderation.

Tech: Astro 6.1 + React 19, Node.js/TypeScript, PostgreSQL, Redis, Stripe, SSE.

## Layers

- Presentation: Astro SSR + React components
- API: TypeScript routes, validation, metrics
- Business Logic: Auth, loyalty, social, subscriptions
- Data Access: PostgreSQL + Redis

## Real-time (SSE)

Two streams:
1. Social Feed: 15s polling, activity stream
2. Analytics: 5s metrics, 30s KPIs

Client manager handles reconnection with exponential backoff.

## Loyalty System

Points → Tiers → Achievements → Rewards

Gamification hooks auto-unlock achievements on user actions.

Admin panel: manage rewards, manual awards, view statistics.

## Social Features

Activity feed, hashtags, mentions, leaderboards.

All cached with Redis (sanliurfa: namespace).

## Auth & Caching

JWT + bcrypt + Redis sessions (24h sliding window).

Redis keys: sanliurfa:places, loyalty:balance, etc.

Cache invalidation on mutations.

## Rate Limiting

100 req/15min default, 5 attempts/15min for auth.

Redis-backed with in-memory fallback.

## Feature Gating

Tiers: Free, Premium, Business.

Stripe integration with webhook HMAC verification.

## Monitoring

Structured logging, slow query detection (>1000ms),
metrics aggregation (error rate, P95 latency).

## Security

Parameterized SQL, input sanitization,
httpOnly cookies, HMAC webhook verification.

## Deployment

Docker for dev, PM2 + Nginx for prod on CentOS Web Panel.

Last Updated: 2026-04-08
