# Self-Hosting relevel.me

Run relevel.me on your own infrastructure with complete control over your data and no subscription fees.

---

## Table of Contents

1. [Quick Start](#quick-start)
2. [Prerequisites](#prerequisites)
3. [Installation](#installation)
4. [Configuration](#configuration)
5. [Docker Deployment](#docker-deployment)
6. [Database Setup](#database-setup)
7. [Troubleshooting](#troubleshooting)
8. [Maintenance](#maintenance)

---

## Quick Start

```bash
# 1. Clone the repository
git clone https://github.com/your-org/relevel.me.git
cd relevel.me

# 2. Install dependencies
npm install

# 3. Configure environment
cp .env.example .env.local
# Edit .env.local and set NEXT_PUBLIC_SELF_HOSTED=true

# 4. Build and run
npm run build
npm start
```

---

## Prerequisites

### Required Services

1. **Supabase** (Database & Authentication)
   - Free tier works perfectly
   - Sign up at [supabase.com](https://supabase.com)
   - Create a new project

2. **CallKaro** (Voice Call Service)
   - Required for evening reflection calls
   - Sign up at CallKaro for API access
   - Configure your agent

### System Requirements

- **Node.js**: 18.x or higher
- **npm**: 9.x or higher
- **Memory**: 512MB minimum, 1GB recommended
- **Storage**: 1GB for application + database

---

## Installation

### Method 1: Standard Installation

```bash
# Clone repository
git clone https://github.com/your-org/relevel.me.git
cd relevel.me

# Install dependencies
npm install

# Copy environment template
cp .env.example .env.local
```

### Method 2: Docker (Recommended)

See [Docker Deployment](#docker-deployment) section below.

---

## Configuration

### Environment Variables

Create `.env.local` with the following variables:

```env
# === REQUIRED FOR SELF-HOSTING ===

# Enable self-hosted mode (IMPORTANT!)
NEXT_PUBLIC_SELF_HOSTED=true

# Application URL
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here

# CallKaro Configuration (for voice calls)
CALLKARO_API_KEY=your-callkaro-api-key
CALLKARO_BASE_URL=https://api.callkaro.com
CALLKARO_AGENT_ID=your-agent-id

# === OPTIONAL ===

# Avatar Defaults
NEXT_PUBLIC_DEFAULT_AVATAR_URL=https://models.readyplayer.me/66eab6aa7613fa126b7c5a45.glb
NEXT_PUBLIC_DEFAULT_AVATAR_GENDER=feminine

# === NOT REQUIRED FOR SELF-HOSTING ===
# (These are only needed for hosted/SaaS version)

# DodoPayments (skip these)
# DODOPAYMENTS_SECRET_KEY=
# DODOPAYMENTS_PRO_PRODUCT_ID=
# DODOPAYMENTS_WEBHOOK_SECRET=
```

### Important Notes

- **`NEXT_PUBLIC_SELF_HOSTED=true`** is the most important setting - this disables subscription checks
- Update `NEXT_PUBLIC_APP_URL` to your domain if deploying publicly
- Supabase keys can be found in your Supabase project settings under "API"
- CallKaro credentials are obtained from your CallKaro account

---

## Database Setup

### 1. Create Supabase Project

1. Go to [supabase.com](https://supabase.com) and create account
2. Click "New Project"
3. Choose organization, name, password, and region
4. Wait for project to provision (~2 minutes)

### 2. Get Supabase Credentials

1. In your project dashboard, go to **Settings** → **API**
2. Copy:
   - **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
   - **anon/public key** → `NEXT_PUBLIC_SUPABASE_ANON_KEY`

### 3. Run Database Migrations

Option A: Using Supabase CLI (Recommended)

```bash
# Install Supabase CLI
npm install -g supabase

# Link your project
supabase link --project-ref your-project-ref

# Push migrations
supabase db push
```

Option B: Manual SQL Execution

1. Go to your Supabase dashboard → **SQL Editor**
2. Run each migration file in order:
   - `supabase/migrations/0001_init.sql`
   - `supabase/migrations/20250102_add_subscriptions.sql`
   - `supabase/migrations/20251020_add_call_streak_function.sql`
   - `supabase/migrations/20251021_add_calls_insert_policy.sql`
   - `supabase/migrations/20251022_fix_user_profile_rls.sql`
   - `supabase/migrations/20251023_add_user_profile_fields.sql`

### 4. Verify Database

After running migrations, verify tables exist:

```sql
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public';
```

You should see: `users`, `calls`, `subscriptions`

---

## Docker Deployment

### Quick Start with Docker Compose

```bash
# 1. Create .env file
cat > .env <<EOF
NEXT_PUBLIC_SELF_HOSTED=true
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
CALLKARO_API_KEY=your-api-key
CALLKARO_BASE_URL=https://api.callkaro.com
CALLKARO_AGENT_ID=your-agent-id
EOF

# 2. Start services
docker-compose up -d

# 3. View logs
docker-compose logs -f relevel

# 4. Access application
open http://localhost:3000
```

### Docker Compose Configuration

See `docker-compose.yml` in the repository root.

### Custom Docker Build

```bash
# Build image
docker build -t relevel-me:latest .

# Run container
docker run -d \
  --name relevel \
  -p 3000:3000 \
  --env-file .env \
  relevel-me:latest
```

---

## CallKaro Setup

### 1. Create CallKaro Account

1. Sign up at CallKaro (or your preferred voice call provider)
2. Create a new agent for relevel.me
3. Configure agent personality and voice

### 2. Configure Agent

Example agent configuration:
- **Name**: Artha Daily Reflection
- **Purpose**: Evening journaling companion
- **Voice**: Choose preferred voice
- **Instructions**: Guide user through daily reflection

### 3. Get Credentials

- **API Key**: Found in CallKaro dashboard → Settings → API Keys
- **Agent ID**: Found in agent settings
- **Base URL**: Usually `https://api.callkaro.com`

---

## Running the Application

### Development Mode

```bash
npm run dev
```

Access at: http://localhost:3000

### Production Mode

```bash
# Build application
npm run build

# Start production server
npm start
```

### Process Manager (PM2)

For production deployments:

```bash
# Install PM2
npm install -g pm2

# Start application
pm2 start npm --name "relevel" -- start

# Save PM2 process list
pm2 save

# Setup PM2 to start on boot
pm2 startup
```

---

## Troubleshooting

### Issue: "Subscription required" error

**Solution**: Ensure `NEXT_PUBLIC_SELF_HOSTED=true` is set in `.env.local`

```bash
# Verify environment variable
grep NEXT_PUBLIC_SELF_HOSTED .env.local

# Should output:
# NEXT_PUBLIC_SELF_HOSTED=true
```

### Issue: Database connection failed

**Solutions**:
1. Verify Supabase URL and keys are correct
2. Check if Supabase project is active (not paused)
3. Ensure migrations have been run
4. Check network connectivity to Supabase

```bash
# Test Supabase connection
curl "https://your-project.supabase.co/rest/v1/?apikey=your-anon-key"
```

### Issue: Calls not working

**Solutions**:
1. Verify CallKaro API key is valid
2. Check CallKaro agent ID is correct
3. Ensure phone number is in international format (+country code)
4. Check CallKaro dashboard for error logs

### Issue: Build fails

**Solutions**:
1. Clear Next.js cache: `rm -rf .next`
2. Clear node_modules: `rm -rf node_modules && npm install`
3. Check Node.js version: `node -v` (should be 18+)
4. Review build logs for specific errors

### Issue: Avatar not loading

**Solutions**:
1. Check avatar URL is valid GLB file
2. Verify Ready Player Me link is accessible
3. Try using default avatar URL
4. Check browser console for CORS errors

---

## Maintenance

### Updating relevel.me

```bash
# 1. Pull latest changes
git pull origin main

# 2. Install any new dependencies
npm install

# 3. Run new migrations (if any)
supabase db push

# 4. Rebuild application
npm run build

# 5. Restart server
pm2 restart relevel
# OR
docker-compose restart
```

### Backup Database

Using Supabase:
1. Go to Supabase Dashboard → **Database** → **Backups**
2. Enable daily backups (free tier includes 7-day retention)
3. Manual backup: **Download Backup**

Using CLI:

```bash
# Backup database
supabase db dump -f backup.sql

# Restore database
supabase db reset --db-url "postgresql://..."
```

### Monitoring

#### Check Application Status

```bash
# PM2
pm2 status

# Docker
docker-compose ps

# Check logs
pm2 logs relevel
# OR
docker-compose logs -f relevel
```

#### Monitor Database Usage

1. Go to Supabase Dashboard → **Database**
2. Check:
   - Storage usage
   - Database size
   - Active connections

### Security Updates

1. **Regular Updates**: Run `npm audit` monthly
2. **Dependency Updates**: Use `npm update` for minor updates
3. **Security Patches**: Monitor GitHub security advisories
4. **Supabase**: Automatic security updates handled by Supabase

---

## Advanced Configuration

### Custom Domain

1. **Update env**:
   ```env
   NEXT_PUBLIC_APP_URL=https://yourdomain.com
   ```

2. **Configure Supabase redirect**:
   - Go to Supabase Dashboard → **Authentication** → **URL Configuration**
   - Add redirect URL: `https://yourdomain.com/auth/callback`

3. **Setup reverse proxy** (Nginx example):
   ```nginx
   server {
       listen 80;
       server_name yourdomain.com;

       location / {
           proxy_pass http://localhost:3000;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection 'upgrade';
           proxy_set_header Host $host;
           proxy_cache_bypass $http_upgrade;
       }
   }
   ```

### SSL/HTTPS

Using Certbot (Let's Encrypt):

```bash
# Install Certbot
sudo apt install certbot python3-certbot-nginx

# Get certificate
sudo certbot --nginx -d yourdomain.com

# Auto-renewal is configured automatically
```

### Performance Tuning

1. **Enable caching**:
   ```env
   # Add to .env.local
   NEXT_TELEMETRY_DISABLED=1
   ```

2. **Increase memory** (if needed):
   ```json
   // package.json
   {
     "scripts": {
       "start": "NODE_OPTIONS='--max-old-space-size=2048' next start"
     }
   }
   ```

3. **Database connection pooling**: Handled automatically by Supabase

---

## Cost Breakdown (Self-Hosted)

### Free Tier (Recommended for personal use)

- **Supabase**: Free (500MB database, 50MB file storage, 2GB bandwidth)
- **CallKaro**: Varies by provider (~$0.01-0.05 per minute)
- **Hosting**: $0 (if self-hosting on own hardware)

### Estimated Monthly Costs

| Item | Cost | Notes |
|------|------|-------|
| Supabase | $0 | Free tier sufficient for 1-10 users |
| Call | ~$5-10 | Depends on call frequency/duration |
| Server | $5-20 | If using cloud VPS (DigitalOcean, AWS, etc.) |
| **Total** | **$5-30/month** | vs $29/month for hosted Pro plan |

### Scaling

- **10-100 users**: Upgrade to Supabase Pro ($25/month)
- **100+ users**: Consider load balancer + multiple instances

---

## Getting Help

### Documentation

- [Main README](../README.md)
- [Onboarding Flow](./ONBOARDING_FLOW.md)
- [Database Schema](../supabase/migrations/)

### Community

- GitHub Issues: [github.com/your-org/relevel.me/issues](https://github.com/your-org/relevel.me/issues)
- Discussions: [github.com/your-org/relevel.me/discussions](https://github.com/your-org/relevel.me/discussions)

### Commercial Support

For enterprise deployments or custom support, contact: support@relevel.me

---

## Comparison: Self-Hosted vs Hosted

| Feature | Self-Hosted | Hosted (Pro) |
|---------|-------------|--------------|
| Cost | $5-30/month | $29/month |
| Setup Time | 30-60 minutes | < 5 minutes |
| Maintenance | You manage | Fully managed |
| Data Control | 100% yours | Hosted securely |
| Customization | Full access to code | Limited to UI settings |
| Scalability | Manual | Automatic |
| Support | Community | Priority support |
| Updates | Manual pull & deploy | Automatic |

---

## License

relevel.me is open source under the MIT License. See [LICENSE](../LICENSE) for details.

---

**Last Updated:** 2025-10-22
**Version:** 1.0
**Maintainer:** relevel.me team
