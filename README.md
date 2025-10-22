
# relevel.me — Artha

An open‑world gamified skill-tracking dashboard with voice-first journaling:
- Three.js starfield background via `@react-three/fiber` + `drei`
- Pannable / zoomable world map, fog‑of‑war, biomes, skill shrines
- Quest dock, minimap, HUD with stats (WRS, streak, points)
- AI-powered voice calls for daily reflection with Artha
- Supabase authentication and database
- Magic link sign-up flow

## Quick Start

### For Development

```bash
# Clone repository
git clone https://github.com/your-org/relevel.me.git
cd relevel.me

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env.local
# Edit .env.local with your Supabase and CallKaro credentials

# Run database migrations (see docs/SELF_HOSTING.md for setup)
# Then start dev server
npm run dev
# Open http://localhost:3000
```

### For Self-Hosting

**Want to run relevel.me on your own infrastructure?** Check out our comprehensive [Self-Hosting Guide](docs/SELF_HOSTING.md).

Quick Docker setup:
```bash
# 1. Configure environment
cp .env.example .env
# Edit .env with your credentials

# 2. Start with Docker Compose
docker-compose up -d

# 3. Access at http://localhost:3001
```

See [docs/SELF_HOSTING.md](docs/SELF_HOSTING.md) for complete setup instructions, including:
- Supabase project setup and database migrations
- CallKaro voice call configuration
- Custom domain and SSL setup
- Troubleshooting and maintenance

## Tech Stack

- **Frontend**: Next.js 14 (App Router), React 18, TypeScript
- **Styling**: TailwindCSS, Framer Motion
- **3D Graphics**: Three.js, @react-three/fiber, @react-three/drei
- **Authentication**: Supabase Auth (Magic Links)
- **Database**: Supabase (PostgreSQL with RLS)
- **Voice Calls**: CallKaro API
- **Payments** (hosted only): DodoPayments
- **Icons**: Lucide React

## Project Structure

```
app/
├── dashboard/              # Main worldboard interface
│   ├── page.tsx           # Server component (subscription check)
│   ├── _components/       # Dashboard client components
│   └── actions.ts         # Server actions (sign out, etc.)
├── onboarding/            # Profile completion flow
├── pricing/               # Subscription plans / self-hosted info
├── auth/
│   ├── callback/          # Magic link callback handler
│   └── signup/            # Sign up page
└── api/
    └── calls/             # CallKaro webhook handlers

lib/
├── auth/
│   ├── client.ts          # Client-side Supabase client
│   └── server.ts          # Server-side auth helpers

docs/
├── SELF_HOSTING.md        # Self-hosting guide
├── ONBOARDING_FLOW.md     # User onboarding audit
└── GAPS_AND_FIXES.md      # Implementation fixes

supabase/
└── migrations/            # Database schema and RLS policies
```

## Key Features

### Worldboard
- Interactive 2800x1600 world map with biomes (meadow, forest, desert, mist, tech, peaks)
- Fog-of-war system revealing skills as you progress
- Shrine system with skill categories
- WASD/arrow key navigation + mouse drag panning
- Zoom controls (0.6x - 2.2x)

### Voice Journaling
- Evening reflection calls with Artha
- Phone number validation and profile management
- Call history and streak tracking

### Gamification
- WRS (Weighted Reflection Score)
- Daily streak counter
- Experience points and leveling system
- Quest log and checkpoint system
- Artifact power-ups

### Authentication & Profiles
- Magic link sign-up (passwordless)
- Onboarding flow for profile completion
- Avatar customization (Ready Player Me)
- Self-hosted mode bypass for subscription checks

## Self-Hosting vs Hosted

| Feature | Self-Hosted | Hosted (Pro) |
|---------|-------------|--------------|
| Cost | $5-30/month | $29/month |
| Setup Time | 30-60 minutes | < 5 minutes |
| Maintenance | You manage | Fully managed |
| Data Control | 100% yours | Hosted securely |
| Customization | Full code access | UI settings only |
| Subscription Required | No | Yes |

For detailed self-hosting instructions, see **[docs/SELF_HOSTING.md](docs/SELF_HOSTING.md)**

## Documentation

- **[Self-Hosting Guide](docs/SELF_HOSTING.md)** - Complete guide to running relevel.me on your own infrastructure
- **[Onboarding Flow](docs/ONBOARDING_FLOW.md)** - User journey audit and flow analysis
- **[Gaps and Fixes](docs/GAPS_AND_FIXES.md)** - Implementation notes and fixes applied

## Environment Variables

Copy `.env.example` to `.env.local` and configure:

```bash
# Self-hosting mode (bypasses subscription checks)
NEXT_PUBLIC_SELF_HOSTED=true

# Supabase (required)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key

# CallKaro (required for voice calls)
CALLKARO_API_KEY=your-api-key
CALLKARO_BASE_URL=https://api.callkaro.ai
CALLKARO_AGENT_ID=your-agent-id

# DodoPayments (hosted mode only - not needed for self-hosting)
DODOPAYMENTS_SECRET_KEY=your-secret-key
DODOPAYMENTS_PRO_PRODUCT_ID=your-product-id
```

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

MIT License - see [LICENSE](LICENSE) for details

## Support

- **Issues**: [GitHub Issues](https://github.com/your-org/relevel.me/issues)
- **Discussions**: [GitHub Discussions](https://github.com/your-org/relevel.me/discussions)
- **Self-Hosting Help**: See [docs/SELF_HOSTING.md](docs/SELF_HOSTING.md)
