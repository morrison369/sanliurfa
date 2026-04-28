# Disaster Recovery Plan (DRP)

## Overview

This document outlines the disaster recovery procedures for Şanlıurfa.com to ensure business continuity in case of system failures, data loss, or other catastrophic events.

**Recovery Time Objective (RTO):** 30 minutes  
**Recovery Point Objective (RPO):** 5 minutes

---

## Disaster Scenarios & Response

### Scenario 1: Database Corruption or Loss

#### Detection
- Automated health checks fail
- Database connection errors spike
- Data integrity alerts

#### Response Steps

```bash
#!/bin/bash
# scripts/dr-database-restore.sh

echo "🚨 DATABASE DISASTER RECOVERY INITIATED"

# 1. Stop application to prevent further damage
docker-compose -f docker-compose.prod.yml stop app

# 2. Identify latest backup
LATEST_BACKUP=$(ls -t /backups/db_backup_*.sql.gz | head -1)
echo "Using backup: $LATEST_BACKUP"

# 3. Stop database
docker-compose -f docker-compose.prod.yml stop postgres

# 4. Backup corrupted data (for forensics)
mv /var/lib/postgresql/data /var/lib/postgresql/data-corrupted-$(date +%Y%m%d-%H%M%S)

# 5. Start fresh database
docker-compose -f docker-compose.prod.yml up -d postgres
sleep 10

# 6. Restore from backup
gunzip < "$LATEST_BACKUP" | docker exec -i sanliurfa_postgres_prod psql -U postgres sanliurfa

# 7. Verify restoration
if docker exec sanliurfa_postgres_prod pg_isready -U postgres; then
    echo "✅ Database restored successfully"
    docker-compose -f docker-compose.prod.yml up -d app
else
    echo "❌ Database restoration failed"
    exit 1
fi
```

---

### Scenario 2: Complete Server Failure

#### Preparation (Pre-disaster)

```bash
#!/bin/bash
# scripts/dr-backup-server.sh

# Daily server snapshot
echo "Creating server snapshot..."

# Backup all configuration
mkdir -p /dr-configs/$(date +%Y%m%d)

cp -r /opt/sanliurfa/docker-compose.prod.yml /dr-configs/$(date +%Y%m%d)/
cp -r /opt/sanliurfa/.env /dr-configs/$(date +%Y%m%d)/
cp -r /opt/sanliurfa/nginx /dr-configs/$(date +%Y%m%d)/
cp -r /opt/sanliurfa/monitoring /dr-configs/$(date +%Y%m%d)/

# Sync to S3
aws s3 sync /dr-configs/ s3://sanliurfa-dr/configs/
aws s3 sync /backups/ s3://sanliurfa-dr/backups/

echo "✅ Server backup completed"
```

#### Recovery on New Server

```bash
#!/bin/bash
# scripts/dr-server-restore.sh

NEW_SERVER=$1

if [ -z "$NEW_SERVER" ]; then
    echo "Usage: $0 <new-server-ip>"
    exit 1
fi

echo "🚨 SERVER DISASTER RECOVERY TO: $NEW_SERVER"

# 1. SSH to new server and setup
ssh root@$NEW_SERVER << 'REMOTE'
    # Install Docker
    curl -fsSL https://get.docker.com | sh
    systemctl enable docker
    
    # Install Docker Compose
    curl -L "https://github.com/docker/compose/releases/download/v2.24.0/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
    chmod +x /usr/local/bin/docker-compose
    
    # Create directory structure
    mkdir -p /opt/sanliurfa
    cd /opt/sanliurfa
    
    # Download from S3
    aws s3 sync s3://sanliurfa-dr/configs/$(date +%Y%m%d)/ .
    
    # Pull latest images
    docker-compose -f docker-compose.prod.yml pull
    
    # Start infrastructure
    docker-compose -f docker-compose.prod.yml up -d postgres redis
    sleep 20
    
    # Download and restore latest backup
    LATEST_BACKUP=$(aws s3 ls s3://sanliurfa-dr/backups/ | sort | tail -1 | awk '{print $4}')
    aws s3 cp s3://sanliurfa-dr/backups/$LATEST_BACKUP /tmp/backup.sql.gz
    gunzip < /tmp/backup.sql.gz | docker exec -i sanliurfa_postgres_prod psql -U postgres sanliurfa
    
    # Start application
    docker-compose -f docker-compose.prod.yml up -d
    
    echo "✅ Server recovery completed"
REMOTE

# 2. Update DNS to point to new server
echo "⚠️  Update DNS A record for sanliurfa.com to point to $NEW_SERVER"
```

---

### Scenario 3: Application Corruption

```bash
#!/bin/bash
# scripts/dr-app-restore.sh

echo "🚨 APPLICATION RECOVERY"

# 1. Stop application
docker-compose -f docker-compose.prod.yml stop app

# 2. Pull known good image (tagged with git commit)
GIT_COMMIT=$(cat /opt/sanliurfa/.git-commit)
docker pull ghcr.io/sanliurfa/sanliurfa:$GIT_COMMIT

# 3. Update docker-compose to use specific version
sed -i "s/ghcr.io\/sanliurfa\/sanliurfa:latest/ghcr.io\/sanliurfa\/sanliurfa:$GIT_COMMIT/" docker-compose.prod.yml

# 4. Start with known good version
docker-compose -f docker-compose.prod.yml up -d app

# 5. Verify
sleep 10
if curl -sf http://localhost:3000/api/health > /dev/null; then
    echo "✅ Application restored to version $GIT_COMMIT"
else
    echo "❌ Application recovery failed"
    exit 1
fi
```

---

### Scenario 4: DDoS Attack

```bash
#!/bin/bash
# scripts/dr-mitigate-ddos.sh

echo "🚨 DDoS MITIGATION ACTIVATED"

# 1. Enable Cloudflare "Under Attack" mode
curl -X PATCH "https://api.cloudflare.com/client/v4/zones/$ZONE_ID/settings/security_level" \
    -H "Authorization: Bearer $API_TOKEN" \
    -H "Content-Type: application/json" \
    --data '{"value":"under_attack"}'

# 2. Enable rate limiting at edge
# Already configured in Cloudflare WAF

# 3. Scale up application servers
docker-compose -f docker-compose.prod.yml up -d --scale app=4 app

# 4. Enable additional caching
curl -X POST "https://api.cloudflare.com/client/v4/zones/$ZONE_ID/purge_cache" \
    -H "Authorization: Bearer $API_TOKEN" \
    --data '{"purge_everything":true}'

# 5. Monitor and alert
echo "DDoS mitigation active. Monitoring..."
watch -n 5 'docker stats --no-stream'

# 6. After attack subsides
echo "To return to normal mode:"
echo "  curl -X PATCH https://api.cloudflare.com/client/v4/zones/$ZONE_ID/settings/security_level \"
echo "    -H 'Authorization: Bearer $API_TOKEN' \"
echo "    --data '{\"value\":\"medium\"}'"
```

---

## Backup Strategy

### Automated Backup Schedule

```bash
# /etc/cron.d/sanliurfa-backup

# Database backup every 4 hours
0 */4 * * * root /opt/sanliurfa/scripts/backup.sh

# Config backup daily at 2 AM
0 2 * * * root /opt/sanliurfa/scripts/dr-backup-server.sh

# Test restore weekly (Sunday 3 AM)
0 3 * * 0 root /opt/sanliurfa/scripts/dr-test-restore.sh
```

### Backup Retention Policy

| Type | Frequency | Retention |
|------|-----------|-----------|
| Database | Every 4 hours | 7 days local, 30 days S3 |
| Configs | Daily | 30 days |
| Server Snapshots | Weekly | 4 weeks |

### Backup Verification

```bash
#!/bin/bash
# scripts/dr-test-restore.sh

echo "🧪 Testing backup integrity..."

# Download latest backup
LATEST=$(aws s3 ls s3://sanliurfa-dr/backups/ | sort | tail -1 | awk '{print $4}')
aws s3 cp s3://sanliurfa-dr/backups/$LATEST /tmp/test-backup.sql.gz

# Test decompression
if gunzip -t /tmp/test-backup.sql.gz 2>/dev/null; then
    echo "✅ Backup is valid"
    
    # Test restore to temporary database
    docker run --rm -e POSTGRES_PASSWORD=test -d --name test-restore postgres:15
    sleep 5
    
    if gunzip < /tmp/test-backup.sql.gz | docker exec -i test-restore psql -U postgres 2>/dev/null; then
        echo "✅ Backup restore test passed"
    else
        echo "❌ Backup restore test failed"
        echo "ALERT: Backups may be corrupted!" | mail -s "CRITICAL: Backup Test Failed" admin@sanliurfa.com
    fi
    
    docker stop test-restore && docker rm test-restore
else
    echo "❌ Backup is corrupted"
    echo "ALERT: Latest backup is corrupted!" | mail -s "CRITICAL: Backup Corrupted" admin@sanliurfa.com
fi

rm -f /tmp/test-backup.sql.gz
```

---

## Failover Procedures

### Database Failover (Master-Slave)

```bash
#!/bin/bash
# scripts/dr-db-failover.sh

NEW_MASTER=$1

# 1. Promote slave to master
ssh postgres@$NEW_MASTER "
    pg_ctl promote -D /var/lib/postgresql/data
"

# 2. Update application connection string
sed -i "s/DATABASE_URL=.*/DATABASE_URL=postgresql:\/\/postgres:password@$NEW_MASTER:5432\/sanliurfa/" /opt/sanliurfa/.env

# 3. Restart application
docker-compose -f docker-compose.prod.yml up -d app

# 4. Update monitoring alerts
curl -X POST "https://api.pagerduty.com/incidents" \
    -H "Authorization: Bearer $PD_TOKEN" \
    -H "Content-Type: application/json" \
    --data '{
        "incident": {
            "type": "incident",
            "title": "Database Failover Executed",
            "service": {"id": "SERVICE_ID", "type": "service_reference"},
            "urgency": "high"
        }
    }'
```

---

## Communication Plan

### Incident Response Team

| Role | Name | Contact |
|------|------|---------|
| Incident Commander | TBD | +90-XXX-XXX-XXXX |
| Technical Lead | TBD | +90-XXX-XXX-XXXX |
| Communications | TBD | +90-XXX-XXX-XXXX |

### Notification Escalation

```yaml
# PagerDuty escalation policy
escalation_policy:
  name: "Sanliurfa Critical"
  levels:
    - level: 1
      timeout: 5_minutes
      targets:
        - user: "primary_oncall"
    - level: 2
      timeout: 10_minutes
      targets:
        - user: "secondary_oncall"
        - user: "tech_lead"
    - level: 3
      timeout: 15_minutes
      targets:
        - user: "engineering_manager"
        - user: "cto"
```

### Status Page Updates

```bash
#!/bin/bash
# Update status page

STATUS=$1  # investigating, identified, monitoring, resolved
MESSAGE=$2

# Update Cachet status page
curl -X POST "https://status.sanliurfa.com/api/v1/incidents" \
    -H "Content-Type: application/json" \
    -H "X-Cachet-Token: $CACHET_TOKEN" \
    --data "{
        \"name\": \"Service Disruption\",
        \"message\": \"$MESSAGE\",
        \"status\": \"$STATUS\",
        \"visible\": 1
    }"
```

---

## Recovery Testing

### Monthly DR Drill

```bash
#!/bin/bash
# scripts/dr-drill.sh

echo "🎮 DISASTER RECOVERY DRILL"
echo "Scenario: Simulating database corruption"

# 1. Create test incident
curl -X POST "https://hooks.slack.com/services/..." \
    -H "Content-Type: application/json" \
    --data '{"text": "🎮 DR Drill starting in 5 minutes"}'

# 2. Document start time
START_TIME=$(date +%s)

# 3. Execute recovery
./dr-database-restore.sh

# 4. Verify
if curl -sf https://sanliurfa.com/api/health > /dev/null; then
    END_TIME=$(date +%s)
    DURATION=$((END_TIME - START_TIME))
    
    echo "✅ DR Drill completed in ${DURATION}s"
    
    curl -X POST "https://hooks.slack.com/services/..." \
        -H "Content-Type: application/json" \
        --data "{\"text\": \"✅ DR Drill completed in ${DURATION}s\"}"
    
    # Alert if RTO exceeded
    if [ $DURATION -gt 1800 ]; then
        echo "⚠️ RTO exceeded! Target: 30 minutes"
    fi
else
    echo "❌ DR Drill failed"
    
    curl -X POST "https://hooks.slack.com/services/..." \
        -H "Content-Type: application/json" \
        --data '{"text": "❌ DR Drill failed - immediate attention required"}'
fi
```

---

## Contact Information

### Cloud Providers
- **Hosting:** [Provider] - Support: +XXX-XXX-XXXX
- **Domain:** [Registrar] - Support: +XXX-XXX-XXXX
- **CDN:** Cloudflare - https://support.cloudflare.com

### Third-Party Services
- **Monitoring:** Datadog/Prometheus
- **Error Tracking:** Sentry
- **Status Page:** Cachet
- **Communication:** Slack, PagerDuty

---

## Document History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2024-01-01 | DevOps Team | Initial DRP |
| 1.1 | 2024-06-01 | DevOps Team | Added RTO/RPO targets |

---

## Approval

- [ ] CTO
- [ ] Engineering Manager
- [ ] Security Officer
