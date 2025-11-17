# Secret Management Guide

## 🔒 Overview

This project implements **multiple layers of protection** to prevent accidental commits of API keys, tokens, and other secrets.

## Protection Layers

### 1. Pre-Commit Git Hook ✅

Located in `.husky/pre-commit`, this hook automatically scans all staged files before allowing a commit.

**What it detects:**
- OpenAI API keys (`sk-...`)
- Anthropic API keys (`sk-ant-...`)
- GitHub tokens (`ghp_...`, `gho_...`)
- API key assignments in code
- Passwords in configuration
- JWT Bearer tokens

**How it works:**
```bash
# When you try to commit
git add myfile.ts
git commit -m "Update"

# The hook runs automatically
🔍 Checking for secrets in staged files...
❌ Potential secret found in: myfile.ts
   Pattern: sk-[a-zA-Z0-9]{20,}

🚨 SECRET DETECTION FAILED!
```

**To bypass (only if you're sure):**
```bash
git commit --no-verify  # NOT RECOMMENDED
```

### 2. GitHub Actions Secret Scanning ✅

Workflow: `.github/workflows/secret-scan.yml`

Runs automatically on:
- Every push to any branch
- Every pull request

Uses multiple tools:
- **TruffleHog** - Comprehensive secret detection
- **Gitleaks** - Git-focused secret scanning
- **Custom patterns** - Project-specific checks

### 3. Enhanced .gitignore ✅

Prevents sensitive files from being tracked:

```gitignore
# Environment variables - NEVER commit these!
.env
.env.local
.env.*.local
.env.production
.env.development
.env.staging
**/.env
**/tests/.env

# Keep only example files
!.env.example
!.env.test.example
```

## Setting Up Local Development

### 1. Copy Environment Template

```bash
# Copy the example file
cp .env.example .env

# Or for testing
cp .env.test.example .env.test
```

### 2. Add Your API Keys

Edit `.env` with your actual keys:

```bash
# LLM Provider Selection
LLM_PROVIDER=openai

# OpenAI Configuration
OPENAI_API_KEY=sk-your-actual-openai-key-here
OPENAI_API_URL=https://api.openai.com/v1

# Anthropic Configuration (if using)
ANTHROPIC_API_KEY=sk-ant-your-actual-anthropic-key-here
```

### 3. Verify .env is Ignored

```bash
# This should show .env
git status --ignored | grep .env

# This should NOT show .env
git status
```

## GitHub Actions Setup

### Required Secrets

Configure these in GitHub repository settings:
`https://github.com/your-org/e2e-test-agent/settings/secrets/actions`

1. **OPEN_AI_KEY** - Your OpenAI API key
2. **OPEN_AI_URL** - OpenAI API URL (optional)
3. **ANTHROPIC_API_KEY** - Your Anthropic API key (if using)

### How Secrets are Used

```yaml
# Example from .github/workflows/integration-tests.yml
- name: Run tests
  env:
    OPENAI_API_KEY: ${{ secrets.OPEN_AI_KEY }}
    OPENAI_API_URL: ${{ secrets.OPEN_AI_URL }}
  run: npm test
```

## Best Practices

### ✅ DO

1. **Use environment variables**
   ```typescript
   const apiKey = process.env.OPENAI_API_KEY;
   ```

2. **Use .env files (gitignored)**
   ```bash
   # .env
   OPENAI_API_KEY=sk-...
   ```

3. **Use GitHub Secrets for CI/CD**
   - Never hardcode secrets in workflows
   - Use `${{ secrets.SECRET_NAME }}`

4. **Rotate secrets immediately if exposed**
   - Revoke at the provider
   - Generate new ones
   - Update everywhere

### ❌ DON'T

1. **Don't hardcode secrets**
   ```typescript
   // BAD!
   const apiKey = "sk-1234567890";
   ```

2. **Don't commit .env files**
   ```bash
   # BAD!
   git add .env
   git commit -m "Add config"
   ```

3. **Don't share secrets**
   - Not in Slack
   - Not in email
   - Not in documentation
   - Not in screenshots

4. **Don't bypass security checks casually**
   ```bash
   # Only use if you're SURE there are no secrets
   git commit --no-verify
   ```

## What to Do If You Accidentally Commit a Secret

### Immediate Actions (Critical!)

1. **Revoke the secret IMMEDIATELY**
   - OpenAI: https://platform.openai.com/api-keys
   - Anthropic: https://console.anthropic.com/settings/keys
   - GitHub: https://github.com/settings/tokens

2. **Generate a new secret**

3. **Update your local .env file**

### Clean Git History

The secret is now in git history. You have options:

#### Option 1: Simple Fix (If just pushed)

```bash
# Remove from file
vim myfile.ts  # Remove the secret

# Commit the fix
git add myfile.ts
git commit -m "security: Remove leaked secret"

# Force push (if you just pushed)
git push --force-with-lease
```

⚠️ **Note**: This doesn't remove from history, but the secret is already revoked.

#### Option 2: Clean History (Advanced)

Use [BFG Repo-Cleaner](https://rtyley.github.io/bfg-repo-cleaner/):

```bash
# Clone a fresh copy
git clone --mirror git@github.com:your-org/repo.git

# Remove secrets
bfg --replace-text passwords.txt repo.git

# Push cleaned history
cd repo.git
git reflog expire --expire=now --all
git gc --prune=now --aggressive
git push --force
```

⚠️ **Coordinate with team before force-pushing!**

## Testing the Protection

### Test Pre-Commit Hook

```bash
# Create a test file with a fake secret
echo "OPENAI_API_KEY=sk-test123" > test-secret.txt

# Try to commit
git add test-secret.txt
git commit -m "Test"

# Should see:
# ❌ Potential secret found in: test-secret.txt
# 🚨 SECRET DETECTION FAILED!

# Clean up
rm test-secret.txt
git reset HEAD test-secret.txt
```

### Test GitHub Actions

1. Push any code to a branch
2. Check Actions tab: https://github.com/your-org/e2e-test-agent/actions
3. Look for "Secret Scanning" workflow
4. Should complete successfully

## Common Patterns Detected

| Pattern | Example | Description |
|---------|---------|-------------|
| `sk-[a-zA-Z0-9]{20,}` | `sk-1234567890...` | OpenAI API keys |
| `sk-ant-[a-zA-Z0-9-]{20,}` | `sk-ant-api03-...` | Anthropic API keys |
| `ghp_[a-zA-Z0-9]{36}` | `ghp_1234567890...` | GitHub Personal Access Token |
| `gho_[a-zA-Z0-9]{36}` | `gho_1234567890...` | GitHub OAuth Token |
| `bearer [a-zA-Z0-9\-_\.]+` | `bearer eyJ0eX...` | JWT tokens |

## Additional Resources

- [GitHub Secret Scanning](https://docs.github.com/en/code-security/secret-scanning)
- [OWASP Secrets Management](https://cheatsheetseries.owasp.org/cheatsheets/Secrets_Management_Cheat_Sheet.html)
- [12 Factor App - Config](https://12factor.net/config)

## Questions?

See [SECURITY.md](../SECURITY.md) for more information or security reporting.
