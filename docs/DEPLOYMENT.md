# Deployment Guide

## Production Deployment

### Prerequisites

- Kubernetes cluster (v1.28+)
- kubectl configured
- Helm 3+
- Domain name with SSL certificate

### Step 1: Infrastructure Setup

```bash
# Create namespace
kubectl create namespace sanliurfa

# Create secrets
kubectl create secret generic app-secrets \
  --from-literal=DATABASE_URL='postgresql://...' \
  --from-literal=REDIS_URL='redis://...' \
  --from-literal=JWT_SECRET='...' \
  -n sanliurfa
```

### Step 2: Database Migration

```bash
# Run migrations
kubectl run migrate \
  --image=ghcr.io/sanliurfa/sanliurfa.com:latest \
  --rm -i --restart=Never \
  -- npm run migrate
```

### Step 3: Deploy Application

```bash
# Apply Kubernetes manifests
kubectl apply -f k8s/

# Verify deployment
kubectl get pods -n sanliurfa
kubectl get svc -n sanliurfa
```

### Step 4: Configure Ingress

```bash
# Apply ingress with SSL
kubectl apply -f k8s/ingress.yaml

# Verify SSL certificate
kubectl get certificate -n sanliurfa
```

### Rollback

```bash
# Rollback to previous version
kubectl rollout undo deployment/app -n sanliurfa

# Check rollout history
kubectl rollout history deployment/app -n sanliurfa
```

## Environment Configuration

### Production .env

```env
NODE_ENV=production
PORT=3000

# Database
DATABASE_URL=postgresql://user:pass@postgres:5432/sanliurfa
DATABASE_POOL_SIZE=20

# Redis
REDIS_URL=redis://redis:6379
REDIS_CLUSTER=true

# Security
JWT_SECRET=<random-256-bit-key>
CSP_NONCE_SECRET=<random-128-bit-key>
ENCRYPTION_KEY=<random-256-bit-key>

# External Services
NETGSM_USERNAME=xxx
NETGSM_PASSWORD=xxx
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
ELASTICSEARCH_URL=http://elasticsearch:9200

# Monitoring
SENTRY_DSN=https://xxx@sentry.io/xxx
DATADOG_API_KEY=xxx
```

## Scaling

### Horizontal Pod Autoscaler

```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: app-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: app
  minReplicas: 3
  maxReplicas: 20
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
  - type: Resource
    resource:
      name: memory
      target:
        type: Utilization
        averageUtilization: 80
```

## Backup Strategy

### Database Backup

```bash
# Automated daily backup
kubectl create cronjob db-backup \
  --image=postgres:16-alpine \
  --schedule="0 2 * * *" \
  -- pg_dump $DATABASE_URL | gzip > /backup/db-$(date +%Y%m%d).sql.gz
```

### Disaster Recovery

1. **Primary failure**: Automatic failover to replica
2. **Region failure**: Activate multi-region deployment
3. **Data corruption**: Restore from backup (RPO: 5 minutes)
