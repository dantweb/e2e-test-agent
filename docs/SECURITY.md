# Security Policy

## 🔒 Secret Management

This project implements multiple layers of protection against accidental secret commits:

### Protection Layers

1. **Git Hooks (Pre-commit)**
   - Automatically scans staged files for secrets before commit
   - Detects common patterns: API keys, tokens, passwords
   - Located in `.husky/pre-commit`

2. **GitHub Actions (Secret Scanning)**
   - Runs on every push and pull request
   - Uses TruffleHog and Gitleaks for comprehensive scanning
   - Custom pattern matching for project-specific secrets

3. **Enhanced .gitignore**
   - Comprehensive patterns to exclude sensitive files
   - All `.env` files except examples are ignored

### Best Practices

#### ✅ DO

- Store secrets in `.env` files (already in .gitignore)
- Use environment variables for all sensitive data
- Use GitHub Secrets for CI/CD workflows
- Use `.env.example` files to document required variables
- Rotate secrets immediately if accidentally committed

#### ❌ DON'T

- Commit API keys, tokens, or passwords directly in code
- Commit `.env` files to the repository
- Share secrets in chat, email, or documentation
- Use `--no-verify` to bypass pre-commit hooks (unless you know what you're doing)

### Required Secrets

For local development, create a `.env` file with:

```bash
# LLM Provider Configuration
LLM_PROVIDER=openai  # or anthropic
OPENAI_API_KEY=your-key-here
OPENAI_API_URL=https://api.openai.com/v1  # optional, default shown
ANTHROPIC_API_KEY=your-key-here  # if using Anthropic

# Optional
LOG_LEVEL=info
HEADLESS=true
```

For GitHub Actions, configure these secrets in repository settings:
- `OPEN_AI_KEY` - OpenAI API key
- `OPEN_AI_URL` - OpenAI API URL (optional)
- `ANTHROPIC_API_KEY` - Anthropic API key (if using)

### If You Accidentally Commit a Secret

1. **Immediately rotate/revoke the secret** at the provider (OpenAI, Anthropic, etc.)
2. Remove the secret from the file
3. Update `.gitignore` if needed
4. Commit the fix
5. Consider using `git filter-branch` or `BFG Repo-Cleaner` to remove from history
6. Force push the cleaned history (coordinate with team first)

### Bypassing Pre-Commit Hooks

Only use `git commit --no-verify` when:
- You're committing example/mock keys for testing
- You've verified there are no real secrets
- You understand the security implications

### Reporting Security Issues

If you discover a security vulnerability:
1. **DO NOT** create a public issue
2. Email the maintainers directly
3. Include details about the vulnerability
4. Allow time for a fix before public disclosure

## 🛡️ Additional Security Measures

### Code Security
- All dependencies are scanned with `npm audit`
- Regular dependency updates
- TypeScript for type safety
- Comprehensive test coverage

### CI/CD Security
- Secrets stored in GitHub Secrets (encrypted)
- Minimal permissions for workflows
- No secrets logged in CI output
- Artifacts retention limited to 30 days

### Docker Security
- Non-root user in containers
- Minimal base images
- No secrets baked into images
- Environment variables passed at runtime
