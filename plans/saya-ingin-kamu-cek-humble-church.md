# Production Logging Stack

## Stack Components

```
┌─────────┐     ┌─────────┐     ┌─────────┐
│  App    │────▶│ Promtail│────▶│  Loki   │
│ (JSON)  │     │ (agent) │     │ (store) │
└─────────┘     └─────────┘     └────┬────┘
                                    │
                         ┌──────────┴──────────┐
                         ▼                     ▼
                    ┌─────────┐          ┌─────────┐
                    │ Grafana │          │   S3    │
                    │ (search)│          │ (archive)│
                    └─────────┘          └─────────┘
```

## Files to Create

1. `docker-compose.yml` - Loki, Grafana, Promtail
2. `loki-config.yml` - Loki with S3 storage
3. `promtail-config.yml` - Tail log files
4. `README.md` - Setup instructions

## Implementation

- Loki: Store logs (30 days retention → S3)
- Promtail: Ship logs to Loki
- Grafana: UI for searching logs
