# Security Policy

## Supported Versions

We release patches for security vulnerabilities. The following versions are currently supported:

| Version | Supported          |
| ------- | ------------------ |
| main    | :white_check_mark: |
| < 1.0   | :x:                |

## Reporting a Vulnerability

We take security vulnerabilities seriously. If you discover a security issue, please follow responsible disclosure practices:

### Please DO:

1. **Report privately**: Do NOT open a public GitHub issue for security vulnerabilities
2. **Use GitHub Security Advisories**: Go to the repository's Security tab and click "Report a vulnerability"
3. **Provide details**:
   - Description of the vulnerability
   - Steps to reproduce
   - Potential impact
   - Suggested fix (if you have one)
4. **Allow time for response**: We aim to respond within 48 hours
5. **Coordinate disclosure**: Work with us on a timeline for public disclosure

### Please DON'T:

- Open public issues about security vulnerabilities
- Share vulnerabilities publicly before coordinating with maintainers
- Exploit vulnerabilities beyond what's necessary to demonstrate the issue

## What to Report

Examples of security vulnerabilities include:

- **Authentication/Authorization issues**: Bypass of login, privilege escalation
- **Injection vulnerabilities**: SQL injection, XSS, command injection
- **Data exposure**: Unintended access to user data or secrets
- **Denial of Service**: Ways to make the service unavailable
- **Cryptographic issues**: Weak encryption, insecure random generation
- **Third-party dependency vulnerabilities**: Known CVEs in dependencies

## What NOT to Report

The following are generally NOT considered security vulnerabilities:

- Outdated software versions (unless exploitable)
- Issues requiring physical access to a user's device
- Social engineering attacks
- Denial of service requiring massive resources
- Missing security headers on non-sensitive pages
- Reports from automated scanners without verification

## Response Timeline

1. **Acknowledgment**: Within 48 hours of report
2. **Initial assessment**: Within 5 business days
3. **Fix development**: Depends on severity and complexity
4. **Disclosure**: Coordinated with reporter after fix is deployed

## Severity Levels

We assess vulnerabilities using the CVSS framework:

- **Critical** (9.0-10.0): Immediate action, emergency patch
- **High** (7.0-8.9): Priority fix, patch within days
- **Medium** (4.0-6.9): Fix in next regular release
- **Low** (0.1-3.9): Fix when convenient

## Security Updates

- Security patches are released as soon as possible
- Critical vulnerabilities may result in immediate releases
- Users are notified via GitHub Security Advisories
- We recommend enabling "Watch" notifications for security updates

## Self-Hosted Security Considerations

If you're running a self-hosted instance of relevel.me:

### Required Steps:

1. **Keep software updated**: Regularly pull latest changes from main branch
2. **Secure environment variables**: Never commit .env files
3. **Use strong secrets**: Generate cryptographically secure webhook secrets and API keys
4. **Enable HTTPS**: Use TLS certificates (Let's Encrypt is free)
5. **Database security**: Enable RLS policies in Supabase, use strong passwords
6. **Network security**: Use firewalls, restrict access to internal services
7. **Regular backups**: Backup database and configuration regularly

### Best Practices:

- Run services with minimal required permissions
- Use Docker or containers for isolation
- Monitor logs for suspicious activity
- Keep Node.js and npm dependencies updated
- Enable two-factor authentication for all services
- Use a Web Application Firewall (WAF) if possible

## Security Headers

We recommend the following security headers for production deployments:

```
Strict-Transport-Security: max-age=31536000; includeSubDomains
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
X-XSS-Protection: 1; mode=block
Referrer-Policy: strict-origin-when-cross-origin
Content-Security-Policy: default-src 'self'
```

Add these to your Next.js config or reverse proxy (nginx, Caddy, etc.).

## Dependency Security

- We use Dependabot to monitor for vulnerable dependencies
- Security patches for dependencies are applied promptly
- Run `npm audit` regularly to check for known vulnerabilities
- Consider using `npm audit fix` to auto-update minor security issues

## Bug Bounty Program

We currently do NOT have a bug bounty program, but we deeply appreciate security researchers who follow responsible disclosure. Public acknowledgment will be given for valid reports (with your permission).

## Contact

- **GitHub Security Advisories**: [Report a vulnerability](../../security/advisories/new) (preferred)
- **Email**: If GitHub isn't available, open an issue requesting a secure communication channel

## Hall of Fame

We would like to thank the following researchers for responsibly disclosing vulnerabilities:

- *Your name could be here!*

## Additional Resources

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [CWE Top 25](https://cwe.mitre.org/top25/)
- [Supabase Security Best Practices](https://supabase.com/docs/guides/auth/row-level-security)
- [Next.js Security](https://nextjs.org/docs/advanced-features/security-headers)

---

Thank you for helping keep relevel.me and its users safe!
