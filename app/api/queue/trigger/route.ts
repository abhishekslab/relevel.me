import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/auth/server';
import { dailyCallsQueue } from '@/lib/queue/client';
import { JOB_NAMES, ScheduleCallsJobData } from '@/lib/queue/types';

/**
 * Manual trigger endpoint for daily calls queue
 * POST /api/queue/trigger
 *
 * Allows manual triggering of the daily calls scheduler
 * Useful for testing and admin operations
 */
export async function POST(req: NextRequest) {
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

    // Add the schedule-calls job to the queue
    const job = await dailyCallsQueue.add(
      JOB_NAMES.SCHEDULE_CALLS,
      {
        triggeredAt: new Date().toISOString(),
        manual: true, // Flag as manual trigger
      } as ScheduleCallsJobData,
      {
        attempts: 1, // Don't retry manual triggers
        removeOnComplete: 10,
        removeOnFail: 50,
      }
    );

    console.log(`[API] Manual trigger: Added schedule-calls job ${job.id}`);

    return NextResponse.json({
      success: true,
      jobId: job.id,
      message: 'Daily calls scheduler triggered successfully',
    });
  } catch (error) {
    console.error('[API] Error triggering queue:', error);
    return NextResponse.json(
      {
        error: 'Failed to trigger queue',
        details: String(error),
      },
      { status: 500 }
    );
  }
}
