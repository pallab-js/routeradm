# Security Policy

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 0.1.0   | :white_check_mark: |

## Reporting a Vulnerability

If you discover a security vulnerability, please send an email to [SECURITY EMAIL].

Please include the following:
- Description of the vulnerability
- Steps to reproduce the issue
- Potential impact of the vulnerability
- Any suggested fixes (optional)

We will:
1. Acknowledge your report within 48 hours
2. Provide a timeline for the fix
3. Credit you in the security advisory (if desired)

## Security Best Practices

- Credentials are stored in macOS Keychain
- API tokens are never logged or exposed
- HTTPS is used for all router communication
- Input validation on all user inputs