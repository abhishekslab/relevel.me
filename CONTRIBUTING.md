# Contributing to relevel.me

Thank you for your interest in contributing to **relevel.me**! We welcome contributions from the community.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [How to Contribute](#how-to-contribute)
- [Development Workflow](#development-workflow)
- [Pull Request Process](#pull-request-process)
- [Coding Standards](#coding-standards)
- [Community](#community)

## Code of Conduct

This project adheres to a [Code of Conduct](CODE_OF_CONDUCT.md). By participating, you are expected to uphold this code. Please report unacceptable behavior by opening an issue.

## Getting Started

1. **Fork the repository** on GitHub
2. **Clone your fork** locally:
   ```bash
   git clone https://github.com/YOUR_USERNAME/relevel.me.git
   cd relevel.me
   ```
3. **Install dependencies**:
   ```bash
   npm install
   ```
4. **Set up environment variables**:
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```
5. **Start the development server**:
   ```bash
   npm run dev
   ```

See [SETUP.md](SETUP.md) for detailed setup instructions.

## How to Contribute

### Reporting Bugs

- Check if the bug has already been reported in [Issues](../../issues)
- If not, create a new issue with:
  - Clear, descriptive title
  - Steps to reproduce
  - Expected vs actual behavior
  - Screenshots (if applicable)
  - Environment details (OS, Node version, etc.)

### Suggesting Features

- Check [Discussions](../../discussions) for similar ideas
- Open a new discussion in the "Ideas" category
- Describe the problem you're solving
- Explain your proposed solution
- Be open to feedback and alternatives

### Improving Documentation

Documentation improvements are always welcome! This includes:
- Fixing typos or clarifying instructions
- Adding examples
- Translating documentation
- Creating tutorials or guides

## Development Workflow

1. **Create a branch** from `main`:
   ```bash
   git checkout -b feature/your-feature-name
   # or
   git checkout -b fix/bug-description
   ```

2. **Make your changes**:
   - Write clear, focused commits
   - Follow our [coding standards](#coding-standards)
   - Add tests if applicable

3. **Test your changes**:
   ```bash
   npm run dev          # Manual testing
   npm run build        # Production build
   npm run typecheck    # TypeScript validation
   ```

4. **Commit your changes**:
   ```bash
   git add .
   git commit -m "feat: add new feature"
   ```

   Follow conventional commits format:
   - `feat:` New feature
   - `fix:` Bug fix
   - `docs:` Documentation changes
   - `refactor:` Code refactoring
   - `test:` Adding tests
   - `chore:` Maintenance tasks

5. **Push to your fork**:
   ```bash
   git push origin feature/your-feature-name
   ```

6. **Open a Pull Request** on GitHub

## Pull Request Process

1. **Update documentation** if you've changed APIs or added features
2. **Ensure tests pass** and the build succeeds
3. **Keep PRs focused** - one feature/fix per PR
4. **Write a clear description**:
   - What problem does this solve?
   - How does it solve it?
   - Any breaking changes?
   - Screenshots (for UI changes)

5. **Respond to feedback** from maintainers
6. **Squash commits** if requested before merging

### PR Checklist

- [ ] Code follows project style guidelines
- [ ] Self-review completed
- [ ] Comments added for complex logic
- [ ] Documentation updated
- [ ] No new warnings or errors
- [ ] Tested locally in self-hosted mode

## Coding Standards

### TypeScript

- Use TypeScript for all new code
- Prefer interfaces over types for object shapes
- Avoid `any` - use `unknown` or proper types
- Use strict mode

### Code Style

- **Formatting**: We use Prettier (if configured) or follow existing style
- **Naming**:
  - camelCase for variables and functions
  - PascalCase for components and classes
  - UPPER_SNAKE_CASE for constants
- **File organization**:
  - One component per file
  - Co-locate related files
  - Use index.ts for re-exports

### React/Next.js

- Use functional components with hooks
- Prefer Server Components when possible
- Use Client Components only when needed (interactivity)
- Keep components small and focused
- Extract reusable logic into custom hooks

### API Routes

- Validate inputs
- Use proper HTTP status codes
- Return consistent error formats
- Add error handling for all external calls

### Security

- Never commit secrets or API keys
- Validate all user input
- Use environment variables for configuration
- Follow OWASP best practices

## Project Structure

```
relevel.me/
├── app/                    # Next.js App Router
│   ├── api/               # API routes
│   ├── dashboard/         # Main dashboard
│   └── ...
├── components/            # React components
│   └── ui/               # UI primitives
├── lib/                   # Utilities and services
│   ├── providers/        # Call/payment providers
│   ├── services/         # Business logic
│   └── ...
├── worker/                # Background job workers
├── supabase/              # Database migrations
└── docs/                  # Documentation

```

## Adding New Call Providers

To add support for a new voice call provider:

1. Create `lib/providers/implementations/your-provider.ts`
2. Implement the `CallProvider` interface
3. Add to factory in `lib/providers/factory.ts`
4. Update `.env.example` with required variables
5. Document in `docs/PROVIDERS.md`

See [docs/PROVIDERS.md](docs/PROVIDERS.md) for detailed guide.

## Community

- **Discussions**: Ask questions, share ideas
- **Issues**: Report bugs, request features
- **Discord**: [Coming soon] Real-time chat
- **Twitter**: [@relevel_me] Updates and announcements

## Questions?

Feel free to:
- Open a [Discussion](../../discussions)
- Reach out in [Issues](../../issues)
- Check existing documentation

Thank you for contributing! 🎉
