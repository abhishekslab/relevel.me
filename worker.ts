#!/usr/bin/env node

/**
 * Queue worker entry point
 * This script starts the Bull queue worker for processing daily calls
 *
 * Usage:
 *   npm run worker        # Development
 *   node dist/worker.js   # Production (Docker)
 */

// Load environment variables
import 'dotenv/config';

console.log('='.repeat(60));
console.log('🔧 Relevel.me Queue Worker');
console.log('='.repeat(60));
console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
console.log(`Redis URL: ${process.env.REDIS_URL || 'redis://localhost:6379'}`);
console.log('='.repeat(60));

// Import and start the worker
import './lib/queue/worker';
