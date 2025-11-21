# Phase 0: Docker Test Environment Setup

**Status**: ✅ **SIMPLIFIED** - Dockerfile.test already exists!
**Time Required**: 30 minutes (reduced from 2 hours)
**Dependencies**: Docker, Docker Compose

---

## Overview

Good news: The project already has `Dockerfile.test`! We only need to add docker-compose configuration and test runner scripts.

---

## What Already Exists

### ✅ Dockerfile.test
- Node 20 base image
- Playwright dependencies installed
- Chromium browser included
- Test dependencies included
- Builds the app
- Default command: `npm test`

**Location**: `/Dockerfile.test`

---

## What We Created

### 1. docker-compose.test.yml

**Purpose**: Orchestrate different test scenarios

**Services**:
- `unit-test` - Fast unit tests, no LLM calls
- `integration-test` - Integration tests with real LLM
- `test-runner` - All tests
- `e2e-generator` - Full E2E test generation

**Configuration**:
- Environment variables passed from host `.env`
- Source code mounted as read-only for live updates
- Output directories mounted for results
- Resource limits set (2GB RAM, 2 CPUs)

**Location**: `/docker-compose.test.yml`

---

### 2. bin/test-docker.sh

**Purpose**: Main test runner script

**Usage**:
```bash
./bin/test-docker.sh unit         # Unit tests only (fast)
./bin/test-docker.sh integration  # Integration tests (real LLM)
./bin/test-docker.sh all          # All tests
./bin/test-docker.sh e2e          # E2E generation test
```

**Features**:
- Checks for .env file
- Color-coded output
- Exit code propagation
- Automatic cleanup

**Location**: `/bin/test-docker.sh`

---

### 3. bin/test-docker-quick.sh

**Purpose**: Verify Docker setup without running tests

**Usage**:
```bash
./bin/test-docker-quick.sh
```

**Checks**:
1. Docker installed
2. Docker Compose installed
3. Dockerfile.test exists
4. docker-compose.test.yml exists
5. Test image builds successfully

**Location**: `/bin/test-docker-quick.sh`

---

## Setup Steps

### Step 1: Verify Docker Installation

```bash
# Check Docker
docker --version
# Expected: Docker version 20.x.x or higher

# Check Docker Compose
docker-compose --version
# Expected: Docker Compose version 2.x.x or higher
```

**If not installed**: Follow https://docs.docker.com/get-docker/

---

### Step 2: Verify Environment Variables

```bash
# Check if .env exists
ls -la .env

# If not, copy from example
cp .env.example .env

# Edit .env and set required variables
nano .env
```

**Required variables**:
```bash
OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-4
OPENAI_BASE_URL=https://api.openai.com/v1
```

---

### Step 3: Quick Setup Test

```bash
# Run quick verification
./bin/test-docker-quick.sh
```

**Expected output**:
```
🐳 Quick Docker Setup Test
==========================

1. Checking Docker... ✅ Available
2. Checking Docker Compose... ✅ Available
3. Checking Dockerfile.test... ✅ Found
4. Checking docker-compose.test.yml... ✅ Found

5. Building test image...
[docker build output...]

✅ Docker setup is ready!
```

---

### Step 4: Run First Test

```bash
# Run unit tests (no LLM calls, fast)
./bin/test-docker.sh unit
```

**Expected**: Tests run in Docker container, results displayed, container cleaned up.

---

## Docker Services Breakdown

### Service: unit-test

**Purpose**: Fast unit tests without external dependencies

**Environment**:
- No API keys needed
- NODE_ENV=test

**Command**: `npm run test:unit`

**Use when**: Developing and testing locally

---

### Service: integration-test

**Purpose**: Integration tests with real LLM API

**Environment**:
- OPENAI_API_KEY required
- OPENAI_MODEL (default: gpt-4)
- NODE_ENV=test

**Command**: `npm run test:integration`

**Use when**: Validating LLM integration

---

### Service: test-runner

**Purpose**: Run all tests (unit + integration)

**Environment**:
- OPENAI_API_KEY required
- Full test configuration

**Command**: `npm test`

**Use when**: Full test suite before commit

---

### Service: e2e-generator

**Purpose**: Run full E2E test generation

**Environment**:
- OPENAI_API_KEY required
- HEADLESS=true

**Command**: `npm run build && node dist/cli.js tests/realworld/paypal.yaml --verbose`

**Use when**: Testing complete flow end-to-end

---

## Benefits of This Setup

### 1. Isolation

✅ **No interference with host**
- Runs in container
- Separate Playwright instance
- Independent browser instances
- Clean state every run

✅ **No interference with Claude Code**
- Different container
- Different network
- Different file system mounts

---

### 2. Reproducibility

✅ **Consistent environment**
- Same Node version (20)
- Same dependencies
- Same Playwright version
- Same browser versions

✅ **Works everywhere**
- Local development
- CI/CD pipelines
- Different machines
- Different OS

---

### 3. Speed

✅ **Fast unit tests**
- No API calls
- Mocked dependencies
- Run in seconds

✅ **Controlled integration tests**
- Only when needed
- Separate service
- Optional

---

### 4. Development Workflow

✅ **Live code updates**
- Source mounted as volume
- Changes reflected immediately
- No rebuild needed

✅ **Easy switching**
- `./bin/test-docker.sh unit` - Quick feedback
- `./bin/test-docker.sh integration` - Full validation
- `./bin/test-docker.sh e2e` - End-to-end test

---

## Troubleshooting

### Issue: "Cannot connect to Docker daemon"

**Solution**:
```bash
# Start Docker daemon
sudo systemctl start docker

# Or on Mac
open -a Docker
```

---

### Issue: "Permission denied" on scripts

**Solution**:
```bash
chmod +x bin/test-docker.sh
chmod +x bin/test-docker-quick.sh
```

---

### Issue: "No .env file found"

**Solution**:
```bash
cp .env.example .env
# Edit .env and add your API keys
```

---

### Issue: Build fails with "missing dependencies"

**Solution**:
```bash
# Clear Docker cache and rebuild
docker-compose -f docker-compose.test.yml build --no-cache unit-test
```

---

### Issue: Tests hang or timeout

**Solution**:
```bash
# Increase resource limits in docker-compose.test.yml
services:
  test-runner:
    mem_limit: 4g  # Increase from 2g
    cpus: 4        # Increase from 2
```

---

## Next Steps

Once Phase 0 is complete:

1. **Verify setup**:
   ```bash
   ./bin/test-docker-quick.sh
   ```

2. **Run existing tests**:
   ```bash
   ./bin/test-docker.sh unit
   ```

3. **Move to Phase 1**:
   - Start writing planning tests
   - Implement planning pass
   - Validate with TDD

---

## Acceptance Criteria

Phase 0 is complete when:

- [ ] Docker and Docker Compose installed
- [ ] docker-compose.test.yml created
- [ ] bin/test-docker.sh created and executable
- [ ] bin/test-docker-quick.sh created and executable
- [ ] Quick setup test passes
- [ ] Can run unit tests in Docker: `./bin/test-docker.sh unit`
- [ ] Tests complete and cleanup automatically
- [ ] Exit codes propagate correctly

---

## Time Breakdown

| Task | Time |
|------|------|
| Verify Docker installation | 2 min |
| Create docker-compose.test.yml | ✅ Done |
| Create bin/test-docker.sh | ✅ Done |
| Create bin/test-docker-quick.sh | ✅ Done |
| Run setup verification | 5 min |
| Build test image | 5 min |
| Run first test | 5 min |
| Troubleshooting buffer | 10 min |
| **Total** | **~30 minutes** |

---

## Summary

Phase 0 is now **much simpler** because:
- ✅ Dockerfile.test already exists
- ✅ Playwright dependencies handled
- ✅ Test infrastructure in place

We only needed to add:
- ✅ docker-compose.test.yml
- ✅ bin/test-docker.sh
- ✅ bin/test-docker-quick.sh

**Status**: Ready for execution
**Next**: Run `./bin/test-docker-quick.sh` to verify setup
