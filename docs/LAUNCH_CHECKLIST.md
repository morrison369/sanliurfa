# 🚀 Launch Checklist

> ⚠️ **Bu checklist eski deployment senaryosuna göre yazılmış.** "Rollback
> Plan" altındaki `kubectl rollout undo` komutu **GEÇERSİZ** — proje
> Kubernetes ile deploy edilmiyor. Gerçek production deployment **CWP
> (CentOS Web Panel) shared hosting + PM2** ile yapılır. Rollback için
> proje kökündeki `DEPLOYMENT.md` ve `CWP-DEPLOYMENT-GUIDE.md` belgelerine
> bakın (PM2 reload + git revert + migration rollback senaryosu).
>
> Geri kalan hazırlık başlıkları (SSL, DNS, monitoring, smoke test) çoğunlukla
> hala geçerli, sadece kullanılan altyapı farklı.

## Pre-Launch (1 week before)

### Technical
- [x] All 150 tasks completed
- [x] Build successful (npm run build)
- [x] All tests passing
- [x] Code coverage > 80%
- [x] Security audit passed
- [x] Performance benchmarks met
- [x] Database migrations ready
- [x] Environment variables configured

### Infrastructure
- [x] Production servers provisioned
- [x] SSL certificates installed
- [x] DNS configured
- [x] CDN configured
- [x] Monitoring setup (health checks, alerts)
- [x] Log aggregation configured
- [x] Backup strategy implemented
- [x] Disaster recovery tested

### Security
- [x] CSP headers configured
- [x] Rate limiting enabled
- [x] DDoS protection active
- [x] Secrets rotated
- [x] Penetration testing completed
- [x] KVKK compliance verified

### Content
- [x] Sample data seeded
- [x] Initial businesses onboarded
- [x] Content reviewed
- [x] SEO metadata configured
- [x] Sitemap generated

## Launch Day

### Morning (08:00)
- [ ] Final database backup
- [ ] Deploy to production
- [ ] Run smoke tests
- [ ] Verify health checks
- [ ] Check error logs

### Launch (10:00)
- [ ] Update DNS (if needed)
- [ ] Enable monitoring alerts
- [ ] Announce on social media
- [ ] Send email to early access users

### Post-Launch (All day)
- [ ] Monitor error rates
- [ ] Check response times
- [ ] Watch queue processing
- [ ] Monitor resource usage
- [ ] Respond to user feedback

## Post-Launch (1 week)

### Analytics
- [ ] Review user engagement metrics
- [ ] Analyze conversion funnels
- [ ] Check page load times
- [ ] Monitor SEO rankings

### Feedback
- [ ] Collect user feedback
- [ ] Review support tickets
- [ ] Prioritize bug fixes
- [ ] Plan feature improvements

### Optimization
- [ ] Optimize slow queries
- [ ] Tune cache hit rates
- [ ] Scale resources if needed
- [ ] Review cost optimization

## Success Metrics

### Technical
- Uptime: > 99.9%
- API Response Time: < 200ms (p95)
- Page Load Time: < 3s
- Error Rate: < 0.1%

### Business
- Daily Active Users: 1000+
- New Registrations: 100+/day
- Conversion Rate: > 5%
- NPS Score: > 50

## Rollback Plan

If critical issues arise:

1. **Immediate** (0-15 min): Enable maintenance mode
2. **Short-term** (15-60 min): Deploy hotfix
3. **Last resort** (> 60 min): Rollback to previous version

```bash
# Emergency rollback
kubectl rollout undo deployment/app -n sanliurfa
```

## Contacts

| Role | Name | Contact |
|------|------|---------|
| Tech Lead | | |
| DevOps | | |
| Product | | |
| Support | | |

---

**Launch Date:** ___________

**Approved by:** ___________
