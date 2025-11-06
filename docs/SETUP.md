# relevel.me - Calling Setup Guide

## Setup Instructions

### 1. Configure Environment Variables

Edit `.env.local` and replace the placeholder values with your actual credentials:

```bash
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# CallKaro Configuration
CALLKARO_API_KEY=your-callkaro-api-key-here
CALLKARO_BASE_URL=https://api.callkaro.ai
CALLKARO_AGENT_ID=artha-daily-journal-v1

# Webhook Configuration (for future use)
WEBHOOK_SECRET=whsec_XXXXXXXXXXXXXXXX
PUBLIC_URL=http://localhost:3000
```

**Where to find these values:**

- **Supabase URL & Keys**: Supabase Dashboard → Project Settings → API
- **CallKaro API Key**: CallKaro Dashboard → Settings → API Keys
- **CallKaro Agent ID**: The ID of your configured agent in CallKaro

### 2. Run Database Migration

You need to apply the SQL migration to your Supabase database.

**Option A: Using Supabase CLI (Recommended)**

```bash
# Install Supabase CLI if you haven't
npm install -g supabase

# Link to your project
supabase link --project-ref your-project-ref

# Apply migration
supabase db push
```

**Option B: Manual SQL Execution**

1. Open Supabase Dashboard → SQL Editor
2. Copy the contents of `supabase/migrations/0001_init.sql`
3. Paste and execute

### 3. Add Your Phone Number

Update the seed data in the migration file or insert manually:

```sql
-- Replace with your actual phone number in E.164 format (+919876543210)
insert into users (phone, name) values ('+919876543210', 'Your Name');
```

Or use the Supabase Dashboard → Table Editor → users table.

### 4. Start Development Server

**Option A: Local Development (npm)**

```bash
npm run dev
```

Open http://localhost:3000 and click "Enter World"

**Option B: Docker Development (with hot reloading)**

```bash
# Start all services (web, worker, redis) with hot reloading
docker compose -f docker-compose.dev.yml up

# Or run in detached mode
docker compose -f docker-compose.dev.yml up -d
```

Open http://localhost:3000 and click "Enter World"

**Docker Benefits:**
- No Node.js installation required
- Automatic hot reloading
- Redis included and configured
- Consistent environment

**Docker Common Commands:**
```bash
# View logs
docker compose -f docker-compose.dev.yml logs -f web

# Rebuild after dependency changes
docker compose -f docker-compose.dev.yml up --build

# Stop services
docker compose -f docker-compose.dev.yml down
```

### 5. Test the Call Now Button

1. Click the Sparkles button in the top right to open the dock
2. Find the "Evening Call" card
3. Click "Call now" button
4. You should see "Calling..." and then a success/error message
5. Your phone should ring shortly!

## Troubleshooting

### "No user found" Error

- Make sure you've run the migration and added a user to the `users` table
- Check the phone number format (must be E.164: +[country][number])

### "Failed to initiate call" Error

- Verify your CallKaro API key is correct in `.env.local`
- Check that `CALLKARO_BASE_URL` and `CALLKARO_AGENT_ID` are set correctly
- Restart the dev server after changing `.env.local`

### Network Error

- Ensure the dev server is running
- Check browser console for detailed error messages
- Verify API route is accessible at http://localhost:3000/api/calls/initiate

## File Structure

```
relevel.me/
├── .env                               # Environment variables (DO NOT COMMIT)
├── supabase/
│   └── migrations/
│       └── 0001_init.sql              # Database schema
├── web/                               # Next.js web application
│   ├── lib/
│   │   ├── auth/
│   │   │   ├── client.ts             # Browser Supabase client
│   │   │   └── server.ts             # Server Supabase client
│   │   └── providers/                # Call providers
│   ├── app/
│   │   ├── api/
│   │   │   └── calls/
│   │   │       └── initiate/
│   │   │           └── route.ts      # API endpoint for call initiation
│   │   └── dashboard/
│   │       └── page.tsx              # UI with "Call now" button
│   └── package.json                   # Web app dependencies
├── worker/                            # Background job processor
│   └── src/                          # Worker source code
├── packages/shared/                   # Shared utilities
└── package.json                       # Root workspace config
```

## Database Schema

### users
- `id` (uuid): Primary key
- `phone` (text): Phone number in E.164 format
- `name` (text): User's name
- `local_tz` (text): Timezone (default: Asia/Kolkata)
- `evening_window` (tstzrange): Preferred call time window

### calls
- `id` (uuid): Primary key
- `user_id` (uuid): Foreign key to users
- `to_number` (text): Recipient phone number
- `agent_id` (text): CallKaro agent ID
- `scheduled_at` (timestamp): When call was scheduled
- `status` (text): queued, ringing, in_progress, completed, failed
- `vendor_call_id` (text): CallKaro's call ID
- `transcript_text` (text): Call transcript (filled by webhook)
- `audio_path` (text): Path to audio recording in storage

## Next Steps

- [ ] Implement webhook handler to receive call status updates
- [ ] Add transcript display in UI after call completes
- [ ] Implement audio playback functionality
- [ ] Add scheduled daily calls with cron job

## Support

If you encounter issues:
1. Check the browser console for errors
2. Check the server logs in terminal
3. Verify all environment variables are set correctly
4. Ensure database migration was applied successfully
