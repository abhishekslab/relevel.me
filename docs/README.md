# relevel.me Documentation

> Comprehensive documentation for the relevel.me voice-first second brain

## 📚 Table of Contents

### Getting Started

- **[SETUP.md](./SETUP.md)** - Initial setup and installation guide
- **[SELF_HOSTING.md](./SELF_HOSTING.md)** - Self-hosting deployment guide
- **[DOCKER_DEV_VS_PROD.md](./DOCKER_DEV_VS_PROD.md)** - Docker configurations for dev vs production

### Architecture & Design

- **[ARCHITECTURE.md](./ARCHITECTURE.md)** - High-level system architecture overview
- **[VISION.md](./VISION.md)** - Product vision and philosophy
- **[QUEUE_SYSTEM.md](./QUEUE_SYSTEM.md)** - Background job processing with Bull + Redis
- **[PROVIDERS.md](./PROVIDERS.md)** - Call and LLM provider abstractions
- **[EMBEDDINGS.md](./EMBEDDINGS.md)** - Embedding providers and semantic search

### Features & Integration

- **[WEBHOOKS.md](./WEBHOOKS.md)** ⭐ **NEW** - Webhook system for external integrations
  - LLM-powered webhook processing
  - Integration with YouTube, email, n8n, RSS, etc.
  - Flexible action system (create memory, summarize, etc.)
- **[WEBHOOK_USAGE.md](./WEBHOOK_USAGE.md)** - Quick start guide and examples
- **[WEBHOOK_IMPLEMENTATION_SUMMARY.md](./WEBHOOK_IMPLEMENTATION_SUMMARY.md)** - Technical implementation details
- **[CHAT_AVATAR.md](./CHAT_AVATAR.md)** - Chat and avatar interaction system
- **[ONBOARDING_FLOW.md](./ONBOARDING_FLOW.md)** - User onboarding experience

### Development

- **[LOGGING.md](./LOGGING.md)** - Structured logging with Pino
- **[NOTES_MIGRATION.md](./NOTES_MIGRATION.md)** - Notes system migration guide
- **[GAPS_AND_FIXES.md](./GAPS_AND_FIXES.md)** - Known issues and solutions

### 3D Avatar & Animation

- **[VISAGE_INTEGRATION.md](./VISAGE_INTEGRATION.md)** - Ready Player Me avatar integration
- **[LIPSYNC_ROADMAP.md](./LIPSYNC_ROADMAP.md)** - Lip-sync implementation roadmap

### Security & Launch

- **[SECURITY.md](./SECURITY.md)** - Security best practices
- **[SECURITY_CLEANUP.md](./SECURITY_CLEANUP.md)** - Security cleanup checklist
- **[LAUNCH_CHECKLIST.md](./LAUNCH_CHECKLIST.md)** - Pre-launch checklist

### Design Documents

- **[design/XP_SYSTEM.md](./design/XP_SYSTEM.md)** - Gamification and XP system design

### Provider-Specific

- **[callkaro/docs.md](./callkaro/docs.md)** - CallKaro provider documentation
- **[dodopayments/](./dodopayments/)** - DodoPayments integration docs
  - SUBSCRIPTION_SETUP.md
  - INTEGRATION_FIXES.md
  - DEPLOYMENT_CHECKLIST.md

### Internal Notes

- **[NOTES.md](./NOTES.md)** - Internal development notes
- **[QUICK_FIX_ONNX.md](./QUICK_FIX_ONNX.md)** - ONNX embedding fixes
- **[supabase/](./supabase/)** - Supabase-specific documentation

---

## 🚀 Quick Navigation

### For New Users
1. Start with [VISION.md](./VISION.md) to understand the product
2. Follow [SETUP.md](./SETUP.md) to get running locally
3. Review [ARCHITECTURE.md](./ARCHITECTURE.md) for system overview

### For Self-Hosters
1. Read [SELF_HOSTING.md](./SELF_HOSTING.md) for deployment
2. Check [SECURITY.md](./SECURITY.md) for hardening
3. Review [DOCKER_DEV_VS_PROD.md](./DOCKER_DEV_VS_PROD.md) for configuration

### For Integrators
1. Check [WEBHOOKS.md](./WEBHOOKS.md) for webhook integration ⭐ **NEW**
2. Review [PROVIDERS.md](./PROVIDERS.md) for extensibility
3. See [WEBHOOK_USAGE.md](./WEBHOOK_USAGE.md) for quick start examples

### For Developers
1. Understand [ARCHITECTURE.md](./ARCHITECTURE.md)
2. Review [LOGGING.md](./LOGGING.md) for debugging
3. Check [QUEUE_SYSTEM.md](./QUEUE_SYSTEM.md) for background jobs
4. Read [EMBEDDINGS.md](./EMBEDDINGS.md) for AI/ML stack

---

## 📝 Documentation Standards

When contributing documentation:
- Use clear, concise headings
- Include code examples where relevant
- Add diagrams for complex flows (ASCII or Mermaid)
- Link to related documents
- Keep security-sensitive info out of docs (use .env.example instead)

## 🆕 What's New

### Webhook System (January 2025)
- **[WEBHOOKS.md](./WEBHOOKS.md)** - Complete webhook integration system
- LLM-powered analysis of incoming webhooks
- Flexible action system (create memories, summaries, etc.)
- Support for YouTube, email, n8n, RSS, and custom sources
- See [WEBHOOK_USAGE.md](./WEBHOOK_USAGE.md) for quick start

---

**Need help?** Check the relevant documentation above or open an issue on GitHub.
