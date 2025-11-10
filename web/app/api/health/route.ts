import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createChildLogger } from '@relevel-me/shared';
import Redis from 'ioredis';

const logger = createChildLogger({ service: 'HealthCheck' });

interface HealthCheckResult {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  checks: {
    supabase: { status: 'up' | 'down'; latency?: number; error?: string };
    redis: { status: 'up' | 'down'; latency?: number; error?: string };
    callkaro: { status: 'up' | 'down'; latency?: number; error?: string };
  };
}

/**
 * Health check endpoint
 * GET /api/health
 *
 * Checks the health of critical dependencies:
 * - Supabase database connection
 * - Redis connection (for Bull queue)
 * - CallKaro API reachability
 */
export async function GET() {
  logger.info('Health check requested');
  const startTime = Date.now();

  const result: HealthCheckResult = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    checks: {
      supabase: { status: 'down' },
      redis: { status: 'down' },
      callkaro: { status: 'down' },
    },
  };

  // Check Supabase
  try {
    const supabaseStart = Date.now();
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { error } = await supabase.from('users').select('count').limit(1);

    const latency = Date.now() - supabaseStart;

    if (error) {
      result.checks.supabase = {
        status: 'down',
        latency,
        error: error.message,
      };
      result.status = 'degraded';
      logger.warn({ latency, error: error.message }, 'Supabase health check failed');
    } else {
      result.checks.supabase = { status: 'up', latency };
      logger.debug({ latency }, 'Supabase healthy');
    }
  } catch (error) {
    result.checks.supabase = {
      status: 'down',
      error: error instanceof Error ? error.message : 'Unknown error',
    };
    result.status = 'unhealthy';
    logger.error({ error }, 'Supabase health check exception');
  }

  // Check Redis
  try {
    const redisStart = Date.now();
    const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
      maxRetriesPerRequest: 1,
      connectTimeout: 2000,
    });

    await redis.ping();
    const latency = Date.now() - redisStart;

    result.checks.redis = { status: 'up', latency };
    logger.debug({ latency }, 'Redis healthy');

    redis.disconnect();
  } catch (error) {
    result.checks.redis = {
      status: 'down',
      error: error instanceof Error ? error.message : 'Unknown error',
    };
    result.status = result.status === 'healthy' ? 'degraded' : 'unhealthy';
    logger.warn({ error }, 'Redis health check failed');
  }

  // Check CallKaro API
  try {
    const callkaroStart = Date.now();
    const baseUrl = process.env.CALLKARO_BASE_URL || 'https://api.callkaro.ai';

    // Just check if the API is reachable (health endpoint or root)
    const response = await fetch(`${baseUrl}/health`, {
      method: 'GET',
      signal: AbortSignal.timeout(3000),
    });

    const latency = Date.now() - callkaroStart;

    // Even if status is not 200, as long as we get a response, API is reachable
    result.checks.callkaro = {
      status: response.status >= 200 && response.status < 500 ? 'up' : 'down',
      latency,
    };

    if (result.checks.callkaro.status === 'up') {
      logger.debug({ latency, status: response.status }, 'CallKaro API reachable');
    } else {
      result.status = 'degraded';
      logger.warn({ latency, status: response.status }, 'CallKaro API unhealthy');
    }
  } catch (error) {
    result.checks.callkaro = {
      status: 'down',
      error: error instanceof Error ? error.message : 'Unknown error',
    };
    // CallKaro being down doesn't make the whole system unhealthy
    result.status = result.status === 'healthy' ? 'degraded' : result.status;
    logger.warn({ error }, 'CallKaro API check failed');
  }

  const totalDuration = Date.now() - startTime;
  logger.info({ status: result.status, duration: totalDuration }, 'Health check completed');

  // Return appropriate HTTP status code based on health
  const httpStatus = result.status === 'healthy' ? 200 : result.status === 'degraded' ? 200 : 503;

  return NextResponse.json(result, { status: httpStatus });
}
