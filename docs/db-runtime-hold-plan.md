# DB Runtime Hold Plan

- Generated at: 2026-05-15T12:06:51.104Z
- Status: runtime_hold
- Table: public.campaign_performance
- Runtime references: 2
- Live schema available: yes
- Automatic drop: no

## Source Contracts

| Area | File | Live Compatible | Missing Live Columns |
|---|---|---|---|
| business-marketing | src/lib/marketing/marketing-campaigns.ts | yes |  |
| email-analytics | src/lib/email/email-analytics.ts | no | sends, opens, bounces, unsubscribes, complaints, revenue_cents |

## Next Safe Steps

- Marketing ve email analytics için tek canonical performans tablosu seç.
- Diğer akışı yeni tabloya veya compatibility view katmanına taşı.
- Runtime referansları sıfırlanmadan db:retirement:observe sonucunu manuel aksiyona yükseltme.
- Migration ve rollback PR hazırlanırsa önce staging smoke, sonra 14 günlük gözlem tamamlanmalı.
