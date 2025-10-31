import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/auth/server';
import { createBullBoard } from '@bull-board/api';
import { BullAdapter } from '@bull-board/api/bullAdapter';
import { dailyCallsQueue } from '@/lib/queue/client';

/**
 * Bull Board dashboard endpoint
 * GET /api/admin/queues
 *
 * Provides UI for monitoring queue jobs
 * Protected by authentication
 */

// Create Bull Board instance
const serverAdapter = createBullBoard({
  queues: [new BullAdapter(dailyCallsQueue)],
  serverAdapter: undefined, // We'll handle rendering manually
});

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

    // For now, all authenticated users can access the dashboard
    // In production, you might want to add role-based access control

    // Return information about accessing the dashboard
    return NextResponse.json({
      message: 'Bull Board is available',
      note: 'Full UI dashboard requires running the worker with Bull Board server',
      queues: [
        {
          name: dailyCallsQueue.name,
          stats: {
            active: await dailyCallsQueue.getActiveCount(),
            waiting: await dailyCallsQueue.getWaitingCount(),
            completed: await dailyCallsQueue.getCompletedCount(),
            failed: await dailyCallsQueue.getFailedCount(),
          },
        },
      ],
      apiEndpoints: {
        trigger: '/api/queue/trigger',
        status: '/api/queue/status',
      },
    });
  } catch (error) {
    console.error('[API] Error in Bull Board endpoint:', error);
    return NextResponse.json(
      {
        error: 'Failed to load queue dashboard',
        details: String(error),
      },
      { status: 500 }
    );
  }
}
