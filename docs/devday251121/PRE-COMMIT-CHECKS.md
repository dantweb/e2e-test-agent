# Pre-Commit Checks Configuration

**Date**: 2025-11-21
**Status**: ✅ Configured

---

## Overview

Pre-commit hooks are now configured to prevent committing code with:
- ❌ Secrets (API keys, passwords)
- ❌ Linting errors
- ❌ TypeScript errors

This ensures code quality and security.

---

## What Happens on `git commit`

### Automatic Checks (via Husky)

When you run `git commit`, the following checks run automatically:

#### 1. Secret Detection 🔐
**Checks for**:
- OpenAI API keys (`sk-...`)
- Anthropic API keys (`sk-ant-...`)
- Generic API keys in files
- Passwords
- JWT tokens
- GitHub tokens

**Skips**: Test files, mock files, example files

**Fails if**: Secrets detected in staged files

---

#### 2. ESLint Check 🔍
**Runs**: `npm run lint -- --max-warnings=0`

**Checks**:
- Code style violations
- Potential bugs
- Best practice violations
- No warnings allowed

**On staged files**: Only `.ts` files

**Fails if**: Any ESLint errors or warnings

---

#### 3. TypeScript Type Check 📘
**Runs**: `npm run type-check`

**Checks**:
- Type errors
- Missing types
- Invalid type usage
- Compilation errors

**On**: All TypeScript files

**Fails if**: Any type errors

---

### Output Example (Success)

```bash
$ git commit -m "feat: add planning phase"

🔍 Checking for secrets in staged files...
✅ No secrets detected in staged files

🔍 Running ESLint on staged files...
✅ ESLint passed

🔍 Running TypeScript type checking...
✅ Type check passed

✅ All pre-commit checks passed!

[master abc1234] feat: add planning phase
 3 files changed, 150 insertions(+), 20 deletions(-)
```

---

### Output Example (Failure)

```bash
$ git commit -m "feat: add feature"

🔍 Checking for secrets in staged files...
✅ No secrets detected in staged files

🔍 Running ESLint on staged files...

/app/src/some-file.ts
  12:5  error  'foo' is defined but never used  @typescript-eslint/no-unused-vars
  45:10 error  Unexpected any. Use unknown instead  @typescript-eslint/no-explicit-any

❌ ESLINT FAILED!
Please fix linting errors before committing.

Quick fixes:
  npm run lint:fix    # Auto-fix issues
  npm run format      # Format code

To bypass this check (NOT RECOMMENDED):
  git commit --no-verify
```

---

## Manual Pre-Commit Check

Before committing, you can manually run all checks:

```bash
./bin/pre-commit-check.sh
```

This script runs:
1. ✅ ESLint check
2. ✅ TypeScript type check
3. ✅ Format check
4. ✅ Unit tests (informational)

**Use this when**:
- Before making a commit
- To verify fixes worked
- To see all issues at once

---

## Fixing Common Issues

### Issue: ESLint Errors

**Quick fix**:
```bash
npm run lint:fix    # Auto-fix what's possible
npm run format      # Format code
npm run lint        # Verify fixed
```

**Manual fix**:
- Read error messages
- Fix code issues
- Follow ESLint recommendations

---

### Issue: TypeScript Errors

**Fix**:
```bash
npm run type-check    # See all errors
npm run build         # Build to find errors

# Fix type issues in code
# Re-run type-check
```

**Common fixes**:
- Add missing type annotations
- Fix type mismatches
- Add null checks
- Import missing types

---

### Issue: Format Check Failed

**Quick fix**:
```bash
npm run format      # Auto-format all files
```

**Prettier** will automatically format:
- Indentation
- Quotes
- Semicolons
- Line length
- Trailing commas

---

### Issue: Secret Detected

**Fix**:
```bash
# 1. Remove secret from file
# Replace: OPENAI_API_KEY=sk-abc123...
# With:    OPENAI_API_KEY=

# 2. Use environment variable instead
# In code: process.env.OPENAI_API_KEY

# 3. Add to .env file (gitignored)
echo "OPENAI_API_KEY=sk-abc123..." >> .env

# 4. Stage fixed file
git add <file>

# 5. Commit again
git commit -m "fix: remove hardcoded secret"
```

---

## Bypassing Checks (NOT Recommended)

If you absolutely must bypass checks:

```bash
git commit --no-verify -m "WIP: work in progress"
```

**⚠️ WARNING**: Only use this for:
- WIP commits on feature branches
- Known false positives
- Emergency fixes

**NEVER bypass**:
- Before merging to main
- When secrets are detected
- On production code

---

## Integration with Development Workflow

### TDD Development Flow

```bash
# 1. Write failing test
vim tests/unit/some.test.ts

# 2. Run test
npm run test:unit

# 3. Implement code
vim src/some-file.ts

# 4. Run linter while developing
npm run lint

# 5. Fix lint issues
npm run lint:fix

# 6. Run tests again
npm run test:unit

# 7. Pre-commit check
./bin/pre-commit-check.sh

# 8. Commit (automatic checks run)
git add .
git commit -m "feat: implement feature"
```

---

### Docker Development Flow

```bash
# 1. Develop in Docker
./bin/test-docker.sh unit

# 2. Make changes to source
vim src/some-file.ts

# 3. Test in Docker
./bin/test-docker.sh unit

# 4. Pre-commit check (runs on host)
./bin/pre-commit-check.sh

# 5. Commit
git commit -m "feat: add feature"
```

---

## Configuration Files

### Husky Hook
**File**: `.husky/pre-commit`

**What it does**:
- Checks for secrets
- Runs ESLint on staged `.ts` files
- Runs TypeScript type check
- Blocks commit if any check fails

**Modify**: Edit `.husky/pre-commit` to adjust checks

---

### ESLint Config
**File**: `eslint.config.js`

**Modify**: To change linting rules

```javascript
// eslint.config.js
export default [
  {
    rules: {
      // Add or modify rules here
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-unused-vars': 'warn',
    }
  }
]
```

---

### TypeScript Config
**File**: `tsconfig.json`

**Modify**: To change type checking strictness

```json
{
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true
  }
}
```

---

## CI/CD Integration

These same checks run in CI:

```bash
# In GitHub Actions / CI pipeline
npm run lint
npm run type-check
npm run test
```

If pre-commit hooks passed locally, CI should pass too.

---

## Best Practices

### Do ✅

1. **Run pre-commit check before committing**
   ```bash
   ./bin/pre-commit-check.sh
   git commit -m "..."
   ```

2. **Fix issues immediately**
   - Don't let lint errors accumulate
   - Fix type errors as you code
   - Format code regularly

3. **Use auto-fix tools**
   ```bash
   npm run lint:fix
   npm run format
   ```

4. **Test before committing**
   ```bash
   npm run test:unit
   ```

5. **Keep commits clean**
   - One feature per commit
   - All checks pass
   - Descriptive messages

---

### Don't ❌

1. **Don't bypass checks without good reason**
   ```bash
   # Bad:
   git commit --no-verify -m "quick fix"
   ```

2. **Don't commit with warnings**
   - Warnings become errors eventually
   - Fix them now, not later

3. **Don't commit secrets**
   - Use .env files
   - Use environment variables
   - Use secret managers

4. **Don't commit WIP to main**
   - Use feature branches
   - Clean up before merging

5. **Don't ignore type errors**
   - Type errors = potential bugs
   - Fix them properly
   - Don't use `any` to bypass

---

## Troubleshooting

### "Husky not installed"

**Fix**:
```bash
npm install
npm run prepare
```

---

### "Cannot find eslint"

**Fix**:
```bash
npm install --save-dev eslint @typescript-eslint/eslint-plugin
```

---

### "Pre-commit hook not executable"

**Fix**:
```bash
chmod +x .husky/pre-commit
```

---

### "Hook takes too long"

**Options**:
1. Run only on changed files (current behavior)
2. Skip type-check for small commits:
   ```bash
   # Edit .husky/pre-commit
   # Comment out type-check section
   ```
3. Use faster linting:
   ```bash
   # In .husky/pre-commit
   # Replace: npm run lint
   # With: eslint --cache <files>
   ```

---

## Summary

### Pre-Commit Checks Configured ✅

1. **Secret detection** - Prevents credential leaks
2. **ESLint** - Ensures code quality
3. **TypeScript** - Catches type errors
4. **Manual script** - `./bin/pre-commit-check.sh`

### Benefits

- 🛡️ **Security**: No secrets committed
- 📊 **Quality**: Consistent code style
- 🐛 **Fewer bugs**: Type errors caught early
- ⚡ **Fast feedback**: Issues found before push
- 🔄 **CI alignment**: Same checks locally and in CI

---

**Status**: ✅ Ready to use
**Next**: Commit with confidence!
