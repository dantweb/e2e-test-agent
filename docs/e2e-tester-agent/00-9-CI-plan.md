# 00-9: CI/CD Pipeline Plan

**Purpose**: Continuous Integration and Continuous Deployment strategy for e2e-tester-agent

**Last Updated**: November 13, 2025

---

## Table of Contents

1. [CI/CD Philosophy](#cicd-philosophy)
2. [Pipeline Stages](#pipeline-stages)
3. [GitHub Actions Workflows](#github-actions-workflows)
4. [Quality Gates](#quality-gates)
5. [Deployment Strategy](#deployment-strategy)
6. [Monitoring & Alerts](#monitoring--alerts)

---

## CI/CD Philosophy

### Core Principles

1. **Fast Feedback**: Developers get results in < 10 minutes
2. **Fail Fast**: Critical issues caught in early stages
3. **Test in Production-like Environment**: Docker containers mirror production
4. **Automated Quality Gates**: No manual approval for quality checks
5. **Immutable Artifacts**: Build once, deploy many times
6. **Rollback Ready**: Every deployment can be instantly reverted

### Pipeline Goals

- **Build Time**: < 5 minutes
- **Test Time**: < 10 minutes (unit + integration)
- **E2E Test Time**: < 15 minutes
- **Total Pipeline**: < 30 minutes
- **Uptime**: 99.9% pipeline availability

---

## Pipeline Stages

### Stage 1: Code Quality (2 minutes)

**Runs on**: Every push, every PR

**Jobs**:
```yaml
lint:
  - ESLint (TypeScript)
  - Prettier format check
  - No console.log statements
  - Import sorting

type-check:
  - TypeScript compilation (strict mode)
  - No `any` types
  - No type errors
```

**Quality Gates**:
- ❌ Fail if any linting errors
- ❌ Fail if formatting issues
- ❌ Fail if type errors

---

### Stage 2: Unit Tests (3 minutes)

**Runs on**: Every push, every PR

**Jobs**:
```yaml
unit-tests:
  strategy:
    matrix:
      node-version: [18.x, 20.x]
      os: [ubuntu-latest, windows-latest, macos-latest]

  steps:
    - Run Jest unit tests
    - Generate coverage report
    - Upload coverage to Codecov
```

**Quality Gates**:
- ❌ Fail if coverage < 90%
- ❌ Fail if any test fails
- ❌ Fail if tests timeout (>5min)

**Coverage Requirements**:
- Domain: 95%+
- Application: 90%+
- Infrastructure: 85%+
- Presentation: 80%+
- Overall: 90%+

---

### Stage 3: Integration Tests (5 minutes)

**Runs on**: Every push to main, every PR

**Jobs**:
```yaml
integration-tests:
  services:
    playwright:
      image: mcr.microsoft.com/playwright:latest

  steps:
    - Install dependencies
    - Run integration tests
    - Upload test artifacts (screenshots, traces)
```

**Tests Include**:
- OxtestParser + PlaywrightExecutor integration
- LLM provider integration (mocked)
- Configuration + Decomposition integration
- Orchestrator + Validator integration

**Quality Gates**:
- ❌ Fail if any integration test fails
- ⚠️ Warn if execution time > 5 minutes

---

### Stage 4: E2E Tests (15 minutes)

**Runs on**: Every push to main, nightly builds

**Jobs**:
```yaml
e2e-tests:
  strategy:
    matrix:
      browser: [chromium, firefox, webkit]

  steps:
    - Setup test environment
    - Run E2E test suite
    - Generate HTML reports
    - Upload artifacts (videos, screenshots, traces)
```

**Test Scenarios**:
- Complete compile → execute workflow
- Multi-test YAML compilation
- Complex selector strategies
- Error handling scenarios
- Report generation

**Quality Gates**:
- ❌ Fail if any critical E2E test fails
- ⚠️ Warn if non-critical tests fail
- ⚠️ Warn if execution time > 15 minutes

---

### Stage 5: Build & Package (2 minutes)

**Runs on**: Every push to main, release branches

**Jobs**:
```yaml
build:
  steps:
    - TypeScript compilation
    - Bundle application
    - Create npm package
    - Generate version info
    - Upload build artifacts
```

**Artifacts**:
- `dist/` compiled JavaScript
- `e2e-tester-agent-{version}.tgz` npm package
- Source maps
- Type declarations (.d.ts files)

**Quality Gates**:
- ❌ Fail if build errors
- ❌ Fail if bundle size > 10MB

---

### Stage 6: Security Scan (3 minutes)

**Runs on**: Every push to main, nightly

**Jobs**:
```yaml
security:
  steps:
    - npm audit (dependency vulnerabilities)
    - CodeQL analysis (SAST)
    - Snyk security scan
    - License compliance check
```

**Quality Gates**:
- ❌ Fail if critical vulnerabilities
- ❌ Fail if high vulnerabilities (count > 5)
- ⚠️ Warn if medium vulnerabilities
- ❌ Fail if incompatible licenses

---

### Stage 7: Release (5 minutes)

**Runs on**: Git tags (v*)

**Jobs**:
```yaml
release:
  steps:
    - Download build artifacts
    - Publish to npm registry
    - Create GitHub release
    - Generate changelog
    - Update documentation site
    - Notify team (Slack/Discord)
```

**Release Types**:
- **Patch**: v1.0.x (bug fixes)
- **Minor**: v1.x.0 (new features)
- **Major**: vX.0.0 (breaking changes)

**Quality Gates**:
- ❌ Fail if version tag already exists
- ❌ Fail if npm publish fails
- ✅ Require manual approval for major releases

---

## GitHub Actions Workflows

### Workflow 1: Pull Request Check

**File**: `.github/workflows/pr-check.yml`

```yaml
name: PR Check

on:
  pull_request:
    branches: [main, develop]

jobs:
  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '20.x'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Lint
        run: npm run lint

      - name: Format check
        run: npm run format:check

      - name: Type check
        run: npx tsc --noEmit

  unit-tests:
    runs-on: ${{ matrix.os }}
    strategy:
      matrix:
        os: [ubuntu-latest, windows-latest, macos-latest]
        node-version: [18.x, 20.x]

    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: ${{ matrix.node-version }}
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Run unit tests
        run: npm run test:unit

      - name: Upload coverage
        uses: codecov/codecov-action@v3
        with:
          files: ./coverage/lcov.info
          flags: unittests
          name: codecov-${{ matrix.os }}-${{ matrix.node-version }}

  integration-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '20.x'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Install Playwright
        run: npx playwright install --with-deps

      - name: Run integration tests
        run: npm run test:integration

      - name: Upload test results
        if: always()
        uses: actions/upload-artifact@v3
        with:
          name: integration-test-results
          path: test-results/

  security:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '20.x'

      - name: npm audit
        run: npm audit --audit-level=high

      - name: Initialize CodeQL
        uses: github/codeql-action/init@v2
        with:
          languages: javascript

      - name: Perform CodeQL Analysis
        uses: github/codeql-action/analyze@v2
```

---

### Workflow 2: Main Branch CI

**File**: `.github/workflows/main-ci.yml`

```yaml
name: Main CI

on:
  push:
    branches: [main]

jobs:
  full-test-suite:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '20.x'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Install Playwright
        run: npx playwright install --with-deps

      - name: Run all tests
        run: npm test

      - name: Generate coverage
        run: npm run test:coverage

      - name: Upload coverage to Codecov
        uses: codecov/codecov-action@v3
        with:
          files: ./coverage/lcov.info
          flags: alltests

  e2e-tests:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        browser: [chromium, firefox, webkit]

    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '20.x'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Install Playwright browsers
        run: npx playwright install --with-deps ${{ matrix.browser }}

      - name: Run E2E tests
        run: npm run test:e2e
        env:
          BROWSER: ${{ matrix.browser }}
          OPENAI_API_KEY: ${{ secrets.OPENAI_API_KEY_TEST }}

      - name: Upload test artifacts
        if: always()
        uses: actions/upload-artifact@v3
        with:
          name: e2e-results-${{ matrix.browser }}
          path: |
            test-results/
            playwright-report/

  build:
    needs: [full-test-suite, e2e-tests]
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '20.x'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Build
        run: npm run build

      - name: Upload build artifacts
        uses: actions/upload-artifact@v3
        with:
          name: dist
          path: dist/
```

---

### Workflow 3: Nightly Tests

**File**: `.github/workflows/nightly.yml`

```yaml
name: Nightly Tests

on:
  schedule:
    - cron: '0 2 * * *'  # 2 AM UTC daily
  workflow_dispatch:  # Manual trigger

jobs:
  comprehensive-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '20.x'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Install Playwright
        run: npx playwright install --with-deps

      - name: Run comprehensive test suite
        run: npm run test:all
        env:
          OPENAI_API_KEY: ${{ secrets.OPENAI_API_KEY_TEST }}
          ANTHROPIC_API_KEY: ${{ secrets.ANTHROPIC_API_KEY_TEST }}

      - name: Performance tests
        run: npm run test:performance

      - name: Generate detailed report
        run: npm run report:detailed

      - name: Upload report
        uses: actions/upload-artifact@v3
        with:
          name: nightly-report
          path: reports/

      - name: Notify on failure
        if: failure()
        uses: slackapi/slack-github-action@v1
        with:
          webhook-url: ${{ secrets.SLACK_WEBHOOK }}
          payload: |
            {
              "text": "❌ Nightly tests failed for e2e-tester-agent"
            }

  dependency-update:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Update dependencies
        run: |
          npm update
          npm audit fix

      - name: Create PR if updates available
        uses: peter-evans/create-pull-request@v5
        with:
          commit-message: 'chore: update dependencies (nightly)'
          branch: nightly-dependency-update
          title: '[Automated] Dependency Updates'
          body: |
            Automated dependency updates from nightly job.

            Please review changes and ensure tests pass.
```

---

### Workflow 4: Release

**File**: `.github/workflows/release.yml`

```yaml
name: Release

on:
  push:
    tags:
      - 'v*'

jobs:
  validate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '20.x'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Run all tests
        run: npm test

      - name: Check coverage
        run: npm run test:coverage

      - name: Validate version
        run: |
          TAG_VERSION=${GITHUB_REF#refs/tags/v}
          PKG_VERSION=$(node -p "require('./package.json').version")
          if [ "$TAG_VERSION" != "$PKG_VERSION" ]; then
            echo "Tag version ($TAG_VERSION) doesn't match package.json version ($PKG_VERSION)"
            exit 1
          fi

  build:
    needs: validate
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '20.x'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Build
        run: npm run build

      - name: Create package
        run: npm pack

      - name: Upload package
        uses: actions/upload-artifact@v3
        with:
          name: npm-package
          path: '*.tgz'

  publish-npm:
    needs: build
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '20.x'
          registry-url: 'https://registry.npmjs.org'

      - name: Install dependencies
        run: npm ci

      - name: Build
        run: npm run build

      - name: Publish to npm
        run: npm publish
        env:
          NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}

  create-github-release:
    needs: publish-npm
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
        with:
          fetch-depth: 0  # Get all history for changelog

      - name: Download package
        uses: actions/download-artifact@v3
        with:
          name: npm-package

      - name: Generate changelog
        id: changelog
        run: |
          VERSION=${GITHUB_REF#refs/tags/v}
          echo "Generating changelog for version $VERSION"
          # Extract changes from CHANGELOG.md
          sed -n "/## \[$VERSION\]/,/## \[/p" CHANGELOG.md | head -n -1 > release-notes.md

      - name: Create GitHub Release
        uses: softprops/action-gh-release@v1
        with:
          body_path: release-notes.md
          files: '*.tgz'
          draft: false
          prerelease: false
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}

      - name: Notify team
        uses: slackapi/slack-github-action@v1
        with:
          webhook-url: ${{ secrets.SLACK_WEBHOOK }}
          payload: |
            {
              "text": "🚀 e2e-tester-agent ${{ github.ref_name }} released!",
              "blocks": [
                {
                  "type": "section",
                  "text": {
                    "type": "mrkdwn",
                    "text": "🚀 *e2e-tester-agent ${{ github.ref_name }}* has been released!\n\n<${{ github.server_url }}/${{ github.repository }}/releases/tag/${{ github.ref_name }}|View Release Notes>"
                  }
                }
              ]
            }
```

---

## Quality Gates

### Pre-Merge Requirements

✅ **All PRs must pass**:
1. Code linting (ESLint + Prettier)
2. Type checking (TypeScript strict mode)
3. Unit tests (90%+ coverage)
4. Integration tests (all passing)
5. Security scan (no critical/high vulnerabilities)
6. Code review (1+ approval)

### Pre-Release Requirements

✅ **Releases must pass**:
1. All pre-merge requirements
2. E2E tests (all browsers)
3. Performance benchmarks met
4. Documentation updated
5. Changelog updated
6. Version bumped correctly

---

## Deployment Strategy

### NPM Package Deployment

**Registry**: https://registry.npmjs.org/e2e-tester-agent

**Deployment Flow**:
```
1. Developer creates tag: git tag v1.0.0
2. Push tag: git push origin v1.0.0
3. GitHub Actions triggered
4. Tests run (30 minutes)
5. Build artifact created
6. Publish to npm
7. Create GitHub release
8. Notify team
```

**Versioning**: Semantic Versioning (semver)
- **Patch**: Bug fixes (v1.0.1)
- **Minor**: New features (v1.1.0)
- **Major**: Breaking changes (v2.0.0)

### Rollback Strategy

**If release has issues**:

1. **Immediate**: Unpublish from npm (within 72 hours)
   ```bash
   npm unpublish e2e-tester-agent@1.0.0
   ```

2. **After 72 hours**: Release hotfix version
   ```bash
   git tag v1.0.1
   git push origin v1.0.1
   ```

3. **Deprecate bad version**:
   ```bash
   npm deprecate e2e-tester-agent@1.0.0 "Critical bug, use 1.0.1+"
   ```

---

## Monitoring & Alerts

### Metrics to Track

1. **Pipeline Health**:
   - Build success rate (target: > 95%)
   - Average build time (target: < 30 min)
   - Test flakiness rate (target: < 2%)

2. **Code Quality**:
   - Test coverage trend
   - Code complexity (cyclomatic)
   - Technical debt ratio

3. **Security**:
   - Dependency vulnerabilities
   - Time to patch (target: < 7 days)
   - License compliance

4. **Performance**:
   - npm download count
   - Package size trend
   - Installation time

### Alerting Rules

**Slack Notifications**:

🔴 **Critical** (immediate):
- Main branch build fails
- E2E tests fail on main
- Security vulnerability (critical/high)
- Release deployment fails

🟡 **Warning** (daily summary):
- PR build fails
- Coverage drops below threshold
- Flaky test detected
- Dependency update available

🟢 **Info** (weekly):
- Release published
- Coverage improved
- Performance improved

### Monitoring Tools

1. **GitHub Actions**: Pipeline monitoring
2. **Codecov**: Test coverage tracking
3. **Snyk**: Security monitoring
4. **npm**: Package analytics
5. **Slack**: Team notifications

---

## CI/CD Best Practices

### 1. Cache Dependencies

```yaml
- uses: actions/setup-node@v3
  with:
    node-version: '20.x'
    cache: 'npm'
```

### 2. Fail Fast

```yaml
strategy:
  fail-fast: true
  matrix:
    os: [ubuntu-latest, windows-latest]
```

### 3. Parallel Execution

```yaml
jobs:
  lint:
    # Runs in parallel with...

  test:
    # ...this job
```

### 4. Artifact Management

```yaml
- uses: actions/upload-artifact@v3
  with:
    name: test-results
    retention-days: 30
```

### 5. Environment Variables

```yaml
env:
  NODE_ENV: test
  CI: true
```

### 6. Secrets Management

```yaml
- name: Use secret
  env:
    API_KEY: ${{ secrets.OPENAI_API_KEY }}
```

---

## Local CI Simulation

Developers can run CI checks locally before pushing:

```bash
# Run full CI suite locally
npm run ci:local

# Individual checks
npm run lint          # ESLint + Prettier
npm run type-check    # TypeScript
npm run test          # All tests
npm run test:coverage # With coverage
npm run build         # Build check
```

**Script in package.json**:
```json
{
  "scripts": {
    "ci:local": "npm run lint && npm run type-check && npm run test:coverage && npm run build"
  }
}
```

---

## Future Improvements

### Phase 2 (3-6 months)
- [ ] Add Docker container builds
- [ ] Deploy preview environments for PRs
- [ ] Add visual regression tests
- [ ] Implement canary deployments
- [ ] Add performance regression detection

### Phase 3 (6-12 months)
- [ ] Multi-region npm mirror
- [ ] Blue-green deployments
- [ ] Automated dependency updates (Renovate/Dependabot)
- [ ] Advanced security scanning (DAST)
- [ ] Load testing in CI

---

## Resources

### Documentation
- [GitHub Actions Docs](https://docs.github.com/en/actions)
- [npm Publishing](https://docs.npmjs.com/cli/v9/commands/npm-publish)
- [Semantic Versioning](https://semver.org/)
- [Playwright CI Guide](https://playwright.dev/docs/ci)

### Tools
- [act](https://github.com/nektos/act) - Run GitHub Actions locally
- [Codecov](https://codecov.io/) - Coverage reporting
- [Snyk](https://snyk.io/) - Security scanning

---

**Last Updated**: November 13, 2025
**Status**: Ready for implementation
