
# relevel.me

[![License: Elastic-2.0](https://img.shields.io/badge/License-Elastic--2.0-blue.svg)](LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue.svg)](https://www.typescriptlang.org/)
[![Next.js](https://img.shields.io/badge/Next.js-14-black.svg)](https://nextjs.org/)
[![Supabase](https://img.shields.io/badge/Supabase-Powered-green.svg)](https://supabase.com/)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](CONTRIBUTING.md)

A **source-available** voice-first second brain — an AI memory companion you can call. Think aloud, remember everything, and achieve clarity through conversation. Free for personal and internal business use.

### Features

- 🔒 **100% Local-First** - llama3.2 + local embeddings (Xenova), zero external API calls by default
- 🧠 **Voice-First Second Brain** - Call and speak your thoughts, AI companion remembers everything
- 🔗 **Semantic Memory Graph** - pgvector search retrieves by meaning, not keywords
- 🏠 **Self-Hosted First** - Full data sovereignty, no subscription required
- 🔌 **Pluggable Architecture** - Swap LLM/embedding/call providers via config
- 🐳 **Docker Ready** - One-command deployment with Ollama baked in
- 🪞 **Reflective Intelligence** - AI surfaces forgotten goals and patterns

## Quick Start

### For Development

#### Prerequisites

Before you begin, ensure you have Docker and Docker Compose installed on your system:
- **Docker**: [Install Docker](https://docs.docker.com/get-docker/)
- **Docker Compose**: [Install Docker Compose](https://docs.docker.com/compose/install/)

#### Docker Development Environment

```bash
# Clone repository
git clone https://github.com/abhishekslab/relevel.me.git
cd relevel.me

# Set up environment variables
cp .env.example .env
# Edit .env with your Supabase and CallKaro credentials

# Start all services (web, worker, redis, ollama) with hot reloading
docker compose -f docker-compose.dev.yml -f docker-compose.ollama.yml up --build

# Access at http://localhost:3000
```

### For Self-Hosting (Production)

**Want to run relevel.me on your own infrastructure?** Check out our comprehensive [Self-Hosting Guide](docs/SELF_HOSTING.md) for complete setup instructions, including:
- Docker production deployment
- Supabase project setup and database migrations
- CallKaro voice call configuration
- Custom domain and SSL setup
- Troubleshooting and maintenance

## Key Features

### 100% Local-First Architecture
- **Local LLM**: llama3.2 runs on your infrastructure via Ollama (baked into Docker image)
- **Local Embeddings**: Xenova/all-MiniLM-L6-v2 runs in-process - zero external API calls
- **Privacy by Default**: All memory processing happens locally unless you opt into cloud providers
- **Offline Capable**: Works completely offline after initial model downloads

### Voice-First Second Brain
- Call anytime to speak your thoughts freely
- AI-powered voice conversations with automatic transcription
- Daily reflection calls scheduled by background worker
- Pluggable call providers (CallKaro, Vapi) - swap via config

### Memory Graph & Semantic Recall
- Your ideas become connected nodes in a knowledge graph
- pgvector semantic search retrieves memories by meaning, not keywords
- AI surfaces forgotten goals, patterns, and contradictions
- Context-aware recall through natural conversation

### Self-Hosted First
- Full data sovereignty - your thoughts stay on your infrastructure
- No subscription required for self-hosted deployment
- Pluggable architecture: swap LLM providers (local/OpenRouter), embedding models, call services

## Self-Hosting vs Hosted

**Hosted Version: Coming Soon**

Currently, relevel.me is available as a self-hosted solution. A fully managed hosted version is in the works.

**Self-Hosted (Available Now)**
- Full control over your data and infrastructure
- No subscription required
- Estimated cost: $5-30/month (for cloud hosting)
- Setup time: 30-60 minutes
- Full code access for customization

For detailed self-hosting instructions, see **[docs/SELF_HOSTING.md](docs/SELF_HOSTING.md)**

## Documentation

- **[Architecture Guide](docs/ARCHITECTURE.md)** - Tech stack, monorepo structure, and system architecture
- **[Self-Hosting Guide](docs/SELF_HOSTING.md)** - Complete guide to running relevel.me on your own infrastructure
- **[Onboarding Flow](docs/ONBOARDING_FLOW.md)** - User journey audit and flow analysis
- **[Gaps and Fixes](docs/GAPS_AND_FIXES.md)** - Implementation notes and fixes applied

## Environment Variables

Copy `.env.example` to `.env` and configure:

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
