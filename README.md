
# relevel.me — Artha

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue.svg)](https://www.typescriptlang.org/)
[![Next.js](https://img.shields.io/badge/Next.js-14-black.svg)](https://nextjs.org/)
[![Supabase](https://img.shields.io/badge/Supabase-Powered-green.svg)](https://supabase.com/)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](CONTRIBUTING.md)

An **open-source** gamified skill-tracking dashboard with voice-first journaling and an immersive 3D worldboard interface.

### Features

- 🌌 **Three.js starfield background** via `@react-three/fiber` + `drei`
- 🗺️ **Interactive world map** - Pannable/zoomable with fog-of-war system
- 🏰 **Skill shrines** across different biomes (meadow, forest, desert, mist, tech, peaks)
- 📊 **HUD & Stats** - WRS score, streak tracking, experience points
- 🎤 **AI Voice Calls** - Daily reflection conversations with Artha
- 🔐 **Supabase Auth** - Magic link authentication, no passwords
- 🐳 **Docker Ready** - One-command self-hosted deployment
- 🔌 **Pluggable Providers** - Swap call providers (CallKaro, Vapi) via config

## Quick Start

### For Development

```bash
# Clone repository
git clone https://github.com/YOUR_USERNAME/relevel.me.git
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

We welcome contributions from the community! 🎉

- **Read** [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines
- **Report bugs** by opening an issue
- **Suggest features** in GitHub Discussions
- **Submit PRs** for bug fixes or new features
- **Add call providers** - See [docs/PROVIDERS.md](docs/PROVIDERS.md)
- **Improve docs** - Documentation PRs are highly valued

Please read our [Code of Conduct](CODE_OF_CONDUCT.md) before contributing.

## Security

Found a security vulnerability? Please report it responsibly:

- **DO NOT** open a public issue
- Read our [Security Policy](SECURITY.md) for reporting instructions
- Use GitHub Security Advisories for private reporting

## License

MIT License - see [LICENSE](LICENSE) for details.

Copyright (c) 2025 relevel.me contributors

## Support & Community

- 📖 **Documentation**: [docs/](docs/)
- 🐛 **Issues**: [GitHub Issues](../../issues) - Report bugs
- 💬 **Discussions**: [GitHub Discussions](../../discussions) - Ask questions, share ideas
- 🔐 **Security**: [Security Policy](SECURITY.md) - Report vulnerabilities
- 🏠 **Self-Hosting**: [Self-Hosting Guide](docs/SELF_HOSTING.md) - Run your own instance

### Quick Links

- [Setup Guide](SETUP.md) - Development setup
- [Provider Guide](docs/PROVIDERS.md) - Call provider configuration
- [Self-Hosting Guide](docs/SELF_HOSTING.md) - Production deployment
- [Architecture Docs](CLAUDE.md) - Codebase overview
