# Logging Setup

## Stack

```
App (JSON logs) → Promtail → Loki → Grafana
                                   ↓
                                   S3 (archive)
```

## Quick Start

```bash
# Start all services
docker compose up -d

# Check logs
docker compose logs -f
```

## Access

| Service | URL | Credentials |
|---------|-----|-------------|
| App | http://localhost:3000 | - |
| Grafana | http://localhost:3001 | admin / admin123 |
| Loki | http://localhost:3100 | - |

## Grafana Setup

1. Open http://localhost:3001
2. Login: `admin` / `admin123`
3. Add Loki data source:
   - Settings → Connections → Data Sources → Add
   - Select "Loki"
   - URL: `http://loki:3100`
   - Save & Test

## LogQL Examples

### Search all logs
```logql
{service="starterkit-hono"}
```

### Search errors only
```logql
{service="starterkit-hono"} |= "error"
```

### Search by level
```logql
{service="starterkit-hono", level="error"}
```

### Search by type
```logql
{service="starterkit-hono", type="request"}
```

### Search by time range
```logql
{service="starterkit-hono"} | json | level="error" | duration > 1000
```

## S3 Archive

Logs older than 30 days are automatically archived to S3.

Required env vars:
```env
S3_BUCKET=loki-logs
S3_REGION=us-east-1
AWS_ACCESS_KEY_ID=xxx
AWS_SECRET_ACCESS_KEY=xxx
```

## Log Retention

| Storage | Retention |
|---------|-----------|
| Loki | 30 days |
| S3 | Unlimited |

## Monitoring

### Alert on errors

In Grafana:
1. Explore → Loki
2. Run query: `{service="starterkit-hono"} |= "error"`
3. Click "Create alert"
