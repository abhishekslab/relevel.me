import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/auth/server';
import { dailyCallsQueue, checkQueueHealth } from '@/lib/queue/client';

/**
 * Queue status endpoint
 * GET /api/queue/status
 *
 * Returns current queue health and statistics
 */
export async function GET(req: NextRequest) {
  try {
    const supabase = createServerClient();

    // Get authenticated user
    const {
      data: { user: authUser },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !authUser) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // Get queue health
    const health = await checkQueueHealth();

    // Get additional queue metrics
    const [completed, delayed, paused, repeatableJobs] = await Promise.all([
      dailyCallsQueue.getCompletedCount(),
      dailyCallsQueue.getDelayedCount(),
      dailyCallsQueue.getPausedCount(),
      dailyCallsQueue.getRepeatableJobs(),
    ]);

    return NextResponse.json({
      success: true,
      queue: {
        name: dailyCallsQueue.name,
        health: health.isHealthy ? 'healthy' : 'unhealthy',
        active: health.activeJobs,
        waiting: health.waitingJobs,
        failed: health.failedJobs,
        completed,
        delayed,
        paused,
        crons: repeatableJobs.map((job) => ({
          key: job.key,
          name: job.name,
          pattern: job.pattern,
          next: job.next,
        })),
      },
    });
  } catch (error) {
    console.error('[API] Error getting queue status:', error);
    return NextResponse.json(
      {
        error: 'Failed to get queue status',
        details: String(error),
      },
      { status: 500 }
    );
  }
}
