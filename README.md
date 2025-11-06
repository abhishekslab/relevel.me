
# relevel.me

[![License: Elastic-2.0](https://img.shields.io/badge/License-Elastic--2.0-blue.svg)](LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue.svg)](https://www.typescriptlang.org/)
[![Next.js](https://img.shields.io/badge/Next.js-14-black.svg)](https://nextjs.org/)
[![Supabase](https://img.shields.io/badge/Supabase-Powered-green.svg)](https://supabase.com/)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](CONTRIBUTING.md)

A **source-available** voice-first second brain — an AI memory companion you can call. Think aloud, remember everything, and achieve clarity through conversation. Free for personal and internal business use.

### Features

- 🧠 **Voice-First Second Brain** - Call and speak your thoughts, your AI companion remembers everything
- 🎤 **AI Voice Calls** - Daily reflection conversations with your AI memory companion
- 🔗 **Memory Graph** - Your ideas become connected nodes, linked by meaning
- 🪞 **Reflective Intelligence** - AI surfaces forgotten goals and patterns
- 🔐 **Supabase Auth** - Magic link authentication, no passwords
- 🐳 **Docker Ready** - One-command self-hosted deployment
- 🔌 **Pluggable Providers** - Swap call providers (CallKaro, Vapi) via config
- 🎮 **Optional Gamification** - Visualize your memory as skill trees and experience points

## Quick Start

### For Development

#### Option 1: Local Development (npm)

```bash
# Clone repository
git clone https://github.com/abhishekslab/relevel.me.git
cd relevel.me

# Install all dependencies (uses npm workspaces)
npm install

# Set up environment variables for web app
cp .env.example .env
# Edit .env with your Supabase and CallKaro credentials

# Run database migrations (see docs/SELF_HOSTING.md for Supabase setup)

# Start web development server
npm run dev
# Open http://localhost:3000

# (Optional) In another terminal, start the worker
npm run worker:dev
```

**Note:** The `npm run dev` command automatically runs from the `web/` directory. All workspace dependencies (web, worker, shared) are installed from the root.

#### Option 2: Docker Development Environment (with hot reloading)

```bash
# Clone repository
git clone https://github.com/abhishekslab/relevel.me.git
cd relevel.me

# Set up environment variables
cp .env.example .env
# Edit .env with your Supabase and CallKaro credentials

# Start all services (web, worker, redis) with hot reloading
docker compose -f docker-compose.dev.yml up

# Access at http://localhost:3000
# Changes to code automatically reload!
```

**Benefits:**
- ✅ No Node.js installation required
- ✅ Automatic hot reloading for web and worker
- ✅ Redis included and configured
- ✅ Consistent environment across team
- ✅ Isolated from local machine setup

**Common commands:**
```bash
# Rebuild after dependency changes
docker compose -f docker-compose.dev.yml up --build

# View logs
docker compose -f docker-compose.dev.yml logs -f web

# Stop services
docker compose -f docker-compose.dev.yml down
```

### For Self-Hosting (Production)

**Want to run relevel.me on your own infrastructure?** Check out our comprehensive [Self-Hosting Guide](docs/SELF_HOSTING.md).

Quick Docker production setup:
```bash
# 1. Configure environment
cp .env.example .env
# Edit .env with your credentials

# 2. Start with Docker Compose (production build)
docker compose up -d

# 3. Access at http://localhost:3001
```

**Note:** For production deployment, use `docker-compose.yml` (optimized build). For development with hot reloading, use `docker-compose.dev.yml` (see Option 2 above).

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

This project follows a monorepo structure using npm workspaces:

```
relevel.me/                     # Monorepo root
├── web/                        # Next.js web application
│   ├── app/                   # App Router pages
│   │   ├── dashboard/         # Main dashboard
│   │   │   ├── page.tsx       # Server component (subscription check)
│   │   │   ├── _components/   # Dashboard client components
│   │   │   └── actions.ts     # Server actions
│   │   ├── onboarding/        # Profile completion flow
│   │   ├── pricing/           # Subscription plans
│   │   ├── auth/callback/     # Auth callback handler
│   │   └── api/               # API routes
│   │       ├── calls/         # Call webhooks
│   │       ├── queue/         # Queue management
│   │       └── admin/         # Admin endpoints
│   ├── components/            # React components
│   │   └── ui/               # UI primitives (shadcn-style)
│   ├── lib/                   # Utilities and services
│   │   ├── auth/             # Authentication helpers
│   │   ├── providers/        # Call/payment providers
│   │   ├── queue/            # Bull queue client
│   │   └── services/         # Business logic
│   ├── public/               # Static assets
│   ├── middleware.ts         # Auth middleware
│   ├── next.config.js        # Next.js configuration
│   └── package.json          # Web app dependencies
│
├── worker/                    # Background job processor
│   ├── src/
│   │   ├── queue/            # Bull queue setup
│   │   ├── jobs/             # Job processors
│   │   └── services/         # Worker services
│   ├── Dockerfile            # Worker container
│   └── package.json          # Worker dependencies
│
├── packages/
│   └── shared/               # Shared utilities
│       ├── src/              # Shared code
│       └── package.json      # Shared dependencies
│
├── supabase/
│   └── migrations/           # Database schema and RLS policies
│
├── docs/                      # Documentation
│   ├── SELF_HOSTING.md       # Self-hosting guide
│   ├── SETUP.md              # Setup instructions
│   ├── QUEUE_SYSTEM.md       # Queue architecture
│   └── ...                   # Additional docs
│
└── package.json              # Root workspace configuration
```

## Key Features

### Voice-First Memory Capture
- Call anytime to speak your thoughts freely
- Automatic transcription and intelligent tagging
- Phone number validation and profile management
- Call history and memory timeline

### Memory Graph & Recall
- Each idea becomes a node connected by topic, tone, and intent
- Context-aware retrieval through natural conversation
- AI surfaces forgotten goals, patterns, and contradictions
- Zero friction capture, high recall architecture

### Optional Gamification Layer
- Visualize your evolving mind as skill trees
- WRS (Weighted Reflection Score)
- Daily streak counter and experience points
- Quest log for memory milestones
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

**Elastic License 2.0** - see [LICENSE](LICENSE) for details.

**TL;DR:** Free for personal and internal business use. Cannot offer as a hosted service to third parties. Derivative works must be shared under the same license.

Copyright (c) 2025 relevel.me contributors

For commercial licensing inquiries: hello@abhishekslab.xyz

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
