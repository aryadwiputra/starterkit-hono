import { Hono } from 'hono'
import { getUptime } from '../lib/shutdown'
import { db } from '../db'
import { env } from '../lib/env'

const health = new Hono()

/**
 * Health check response types
 */
interface HealthStatus {
  status: 'ok' | 'degraded' | 'unhealthy'
  timestamp: string
  version: string
  uptime: number
  environment: string
}

interface ReadinessStatus extends HealthStatus {
  checks: {
    database: { status: 'ok' | 'error'; latency_ms?: number; error?: string }
  }
}

/**
 * Liveness probe
 * GET /health/live
 *
 * Returns OK jika app responding.
 * Untuk Kubernetes liveness check.
 */
health.get('/live', (c) => {
  return c.json<HealthStatus>({
    status: 'ok',
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version ?? '1.0.0',
    uptime: getUptime(),
    environment: env.NODE_ENV,
  })
})

/**
 * Readiness probe
 * GET /health/ready
 *
 * Returns OK jika semua dependencies ready.
 * Untuk Kubernetes readiness check.
 */
health.get('/ready', async (c) => {
  const checks: ReadinessStatus['checks'] = {
    database: { status: 'ok' },
  }

  // Check database connection
  const dbStart = Date.now()
  try {
    db.query('SELECT 1').all()
    checks.database.latency_ms = Date.now() - dbStart
  } catch (error) {
    checks.database.status = 'error'
    checks.database.error = error instanceof Error ? error.message : 'Database error'
  }

  // Determine overall status
  const allOk = Object.values(checks).every((check) => check.status === 'ok')

  const status: ReadinessStatus = {
    status: allOk ? 'ok' : 'degraded',
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version ?? '1.0.0',
    uptime: getUptime(),
    environment: env.NODE_ENV,
    checks,
  }

  return c.json(status, allOk ? 200 : 503)
})

/**
 * Combined health check
 * GET /health
 *
 * Returns full health status dengan semua checks.
 */
health.get('/', async (c) => {
  const response = await fetch('http://localhost:' + env.PORT + '/health/ready')
  const readiness = await response.json<ReadinessStatus>()

  return c.json(readiness)
})

export default health
