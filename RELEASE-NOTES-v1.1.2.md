# Release Notes - v1.1.2

**Release Date**: November 17, 2025

## 🔐 Security & Bug Fixes Release

This is a critical security and maintenance release addressing an exposed API key incident and fixing the release workflow.

---

## 🚨 Critical Security Fixes

### Secret Removal from Git History
- **Removed exposed DeepSeek API key from entire git history**
- Used `git filter-branch` to clean all commits
- Force-pushed cleaned history to remote repository
- Updated all tags (v1.0.0, v1.1.1) with cleaned commits

### Enhanced Secret Protection
- ✅ Pre-commit hooks already in place
- ✅ CI/CD secret scanning (Gitleaks, TruffleHog)
- ✅ Comprehensive `.gitignore` patterns for `.env` files
- ✅ Security incident documentation created

**Files Added**:
- `SECURITY-INCIDENT-2025-11-17.md` - Detailed incident report
- `REBASE-CONFLICT-RESOLUTION.md` - Guide for handling rebase conflicts after history rewrite
- `force-push-clean-history.sh` - Safe force push script
- `.husky/pre-rebase` - Pre-rebase hook to prevent conflicts

---

## 🐛 Bug Fixes

### Release Workflow Fix
**Issue**: GitHub Actions release workflow was failing with 404 errors when uploading release assets.

**Root Cause**: The workflow was trying to upload individual files from `dist/**/*` glob pattern, which caused upload failures.

**Fix**:
- Removed `dist/**/*` from release assets
- Now only uploads the `.tgz` package file (which already contains all dist files)
- Added `retrigger-release.sh` script for easy release re-triggering

**Files Modified**:
- `.github/workflows/release.yml` - Fixed asset upload pattern

**Files Added**:
- `retrigger-release.sh` - Script to delete and recreate tags for release re-triggering

---

## 🎯 Features

### PayPal Integration Test
- **Added PayPal payment flow test** in correct YAML format
- Generated `.ox.test` and Playwright test files
- Comprehensive 8-step test covering: login, cart, checkout, PayPal iframe/popup, confirmation
- Based on PayPal module E2E tests from `paypal-module-6.3`

**Files Added**:
- `tests/realworld/paypal.yaml` - PayPal test specification
- `demo/_generated_result/paypal-payment.ox.test` - Generated OXTest
- `demo/_generated_result/paypal-payment.spec.ts` - Generated Playwright test

---

## 📝 Documentation Updates

### Security Documentation
- Complete security incident report with timeline and remediation steps
- Rebase conflict resolution guide
- Force push safety procedures
- API key revocation checklist

### Release Management
- Added scripts for safe release retriggering
- Documentation for handling failed releases
- Pre-rebase hook documentation

---

## 🔄 Breaking Changes

### Git History Rewrite
**IMPORTANT**: If you have cloned this repository before November 17, 2025, you must update your local copy:

```bash
cd /path/to/e2e-agent
git fetch origin
git reset --hard origin/master
git clean -fd
```

⚠️ **WARNING**: This will discard all local changes!

### Updated Tags
The following tags have been rewritten with new commit hashes:
- `v1.0.0`: `536c759...` → `709823a...`
- `v1.1.1`: `30e7185...` → `0a1335c...`

---

## 📊 Test Results

All tests passing:
```
Test Suites: 26 passed, 26 total
Tests:       695 passed, 695 total
Duration:    ~30 seconds
```

### Test Coverage
- ✅ Domain Layer - 100% passing
- ✅ Application Layer - 100% passing
- ✅ Infrastructure Layer - 100% passing
- ✅ Presentation Layer - 100% passing
- ✅ Configuration Layer - 100% passing
- ✅ Integration Tests - 100% passing

---

## 🔧 Technical Details

### Commits Included
- `dff5d93` - feat: Add script to retrigger release workflow
- `3abf1c7` - fix: Remove dist/** from release assets to prevent 404 errors
- `4e8c96d` - docs: Add comprehensive rebase conflict resolution guide
- `de1f63d` - feat: Add force push script and pre-rebase hook
- `af87cca` - docs: Add security incident report
- `5412eb3` - feat: Add complete shopping and payment E2E test
- Plus cleaned history from secret removal

### Files Changed
- 7 files added (security docs, scripts, tests)
- 2 files modified (release workflow, package.json)
- All commits cleaned of sensitive data

---

## ⚠️ Important Actions Required

### 1. API Key Revocation
If you haven't already, **immediately revoke the exposed API key**:
- Login to https://platform.deepseek.com/
- Revoke key: `sk-15d75dc3b55148e7b98cdaf755b989bb`
- Generate new key
- Update local `.env` file (not committed)

### 2. Update Local Repository
If you cloned before the fix:
```bash
git fetch origin
git reset --hard origin/master
```

### 3. Verify Secret Removal
```bash
git log --all -S "sk-15d75dc3b55148e7b98cdaf755b989bb"
# Should only show SECURITY-INCIDENT report
```

---

## 🎉 What's Next

### v1.2.0 Roadmap
- Enhanced self-healing test capabilities
- Improved LLM prompt engineering
- Performance optimizations
- Additional reporter formats

---

## 🙏 Acknowledgments

Special thanks to:
- Gitleaks for detecting the exposed secret
- GitHub Actions security scanning
- Git filter-branch for history cleanup

---

## 📚 Additional Resources

- [Security Incident Report](./SECURITY-INCIDENT-2025-11-17.md)
- [Rebase Conflict Resolution](./REBASE-CONFLICT-RESOLUTION.md)
- [Secret Management Guide](./docs/SECRET-MANAGEMENT.md)
- [Release Workflow](../.github/workflows/release.yml)

---

**Full Changelog**: https://github.com/dantweb/e2e-test-agent/compare/v1.1.0...v1.1.2

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>
