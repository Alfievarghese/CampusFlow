# Security Policy

## Reporting a Vulnerability
Please do NOT open a public GitHub issue for security vulnerabilities.
Email: security@campusflow.example.com

## Security Measures
- JWT authentication with configurable expiry
- bcrypt password hashing (cost factor 12)
- Rate limiting on all API routes
- RBAC (Role-Based Access Control)
- SQL injection prevention via Prisma ORM
