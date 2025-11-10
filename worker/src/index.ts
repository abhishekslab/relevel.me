#!/usr/bin/env node

/**
 * Queue worker entry point
 * This script starts the Bull queue worker for processing daily calls
 *
 * Usage:
 *   npm run dev          # Development
 *   npm start            # Production
 */

// Load environment variables
import 'dotenv/config';

// Initialize Sentry for error tracking
import { initSentry } from './sentry';
initSentry();

// Initialize logger
import { logger } from '@relevel-me/shared';

logger.info('='.repeat(60));
logger.info('🔧 Relevel.me Queue Worker');
logger.info('='.repeat(60));
logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
logger.info(`Redis URL: ${process.env.REDIS_URL || 'redis://localhost:6379'}`);
logger.info('='.repeat(60));

// Import and start the worker
import './queue/worker';
