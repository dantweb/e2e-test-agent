# Docker Integration Test - Permission Fix

**Date**: November 17, 2025
**Issue**: Permission denied when Docker container tries to write files
**Status**: ✅ FIXED

---

## Problem

When running the Docker integration test, the container failed with:

```
❌ Error: EACCES: permission denied, open '_generated/shopping-cart-test.spec.ts'
```

### Root Causes

1. **Wrong .env file**: Script was using `.env` instead of `.env.test`
2. **Permission mismatch**: Docker container runs as non-root user `e2e` (UID 1000), but the mounted volume is owned by the host user

## Solution

### Fix 1: Use Correct Environment File

Changed default environment file from `.env` to `.env.test`:

```bash
# Before
ENV_FILE=".env"

# After
ENV_FILE=".env.test"
```

### Fix 2: Run Container as Current User

Added `--user` flag to run container with host user's UID/GID:

```bash
# Before
docker run --rm \
  --name "${CONTAINER_NAME}" \
  --env-file "${ENV_FILE}" \
  -v "$(pwd):/workspace" \
  "${DOCKER_IMAGE}" \
  --src="${TEST_YAML}" \
  --output="${OUTPUT_DIR}" \
  --oxtest

# After
docker run --rm \
  --name "${CONTAINER_NAME}" \
  --user "$(id -u):$(id -g)" \
  --env-file "${ENV_FILE}" \
  -v "$(pwd):/workspace" \
  "${DOCKER_IMAGE}" \
  --src="${TEST_YAML}" \
  --output="${OUTPUT_DIR}" \
  --oxtest
```

**Why this works**:
- `$(id -u)` returns current user's UID (e.g., 1001)
- `$(id -g)` returns current user's GID (e.g., 1001)
- Container runs as host user, files created with correct ownership
- No permission issues when writing to mounted volume

## Files Modified

### 1. `test-docker-integration.sh`

**Changes**:
1. Line 17: Changed `ENV_FILE=".env"` → `ENV_FILE=".env.test"`
2. Line 124: Added `--user $(id -u):$(id -g)` to displayed command
3. Line 137: Added `--user "$(id -u):$(id -g)"` to actual Docker run command

### 2. `docs/DOCKER-INTEGRATION-TEST.md`

**Changes**:
1. Updated Docker command examples to include `--user` flag
2. Added note explaining the `--user` flag purpose
3. Added troubleshooting section for "Permission Denied (File Creation)"
4. Provided alternative solutions if `--user` flag doesn't work

## How to Use

### Run the Fixed Script

```bash
# Ensure you have .env.test file
cp .env.example .env.test
# Edit .env.test with your API keys

# Run the test
./test-docker-integration.sh
```

### Expected Output

```
======================================
Docker Integration Test
======================================

ℹ Step 1: Checking Docker availability...
✓ Docker is available
ℹ Step 2: Checking if Docker image exists...
✓ Docker image exists: e2e-test-agent:latest
ℹ Step 3: Checking for .env file...
✓ Found .env file: .env.test
ℹ Step 4: Checking for test YAML file...
✓ Found test YAML: tests/realworld/shopping-flow.yaml
ℹ Step 5: Preparing output directory...
✓ Output directory ready: _generated
ℹ Step 6: Running Docker container to generate tests...

ℹ Docker command:
  docker run --rm \
    --name e2e-test-integration-952365 \
    --user $(id -u):$(id -g) \
    --env-file .env.test \
    -v $(pwd):/workspace \
    e2e-test-agent:latest \
    --src=tests/realworld/shopping-flow.yaml \
    --output=_generated \
    --oxtest

✓ Docker container executed successfully
✓ Found 1 .ox.test file(s):
  - _generated/shopping-cart-test.ox.test
✓ All generated files are valid
✓ All tests passed!
```

## Technical Details

### Docker User Mapping

| Scenario | UID/GID | File Ownership | Result |
|----------|---------|----------------|--------|
| **Before Fix** | Container: 1000:1000<br>Host: 1001:1001 | Files owned by 1000 | ❌ Permission denied |
| **After Fix** | Container: 1001:1001<br>Host: 1001:1001 | Files owned by 1001 | ✅ Success |

### Why Dockerfile Has Non-Root User

The Dockerfile creates a non-root user for security:

```dockerfile
# Create non-root user for security
RUN groupadd -r e2e && useradd -r -g e2e e2e && \
    chown -R e2e:e2e /app /workspace

# Switch to non-root user
USER e2e
```

This is a **security best practice** but can cause permission issues with volume mounts. The `--user` flag overrides this at runtime.

## Alternative Solutions

If `--user` flag doesn't work in your environment:

### Option 1: Make Output Directory World-Writable

```bash
mkdir -p _generated
chmod 777 _generated
```

**Drawback**: Less secure, files owned by container user

### Option 2: Run Container as Root

```bash
docker run --rm \
  --user root \
  --env-file .env.test \
  -v $(pwd):/workspace \
  e2e-test-agent:latest \
  --src=tests.yaml --output=_generated --oxtest
```

**Drawback**: Security risk, not recommended

### Option 3: Change Host Directory Ownership

```bash
sudo chown -R 1000:1000 _generated
```

**Drawback**: Requires sudo, affects all files

**Recommendation**: Use the `--user` flag (default in script) - it's the cleanest solution.

## Verification

### Test 1: Check Script Uses Correct Env File

```bash
grep "ENV_FILE=" test-docker-integration.sh
# Should output: ENV_FILE=".env.test"
```

### Test 2: Check Script Uses User Flag

```bash
grep "id -u" test-docker-integration.sh
# Should show: --user "$(id -u):$(id -g)"
```

### Test 3: Run Full Test

```bash
./test-docker-integration.sh
# Should complete without permission errors
```

## Related Issues

This fix also resolves:
- File ownership issues (generated files now owned by host user)
- Cleanup problems (host user can delete generated files)
- CI/CD permission errors (common in containerized CI)

## Summary

| Item | Before | After | Status |
|------|--------|-------|--------|
| **Env File** | `.env` | `.env.test` | ✅ Fixed |
| **User Mapping** | None (uses container user) | `--user $(id -u):$(id -g)` | ✅ Fixed |
| **Permissions** | EACCES errors | Success | ✅ Fixed |
| **File Ownership** | Container user (1000) | Host user | ✅ Fixed |
| **Documentation** | Missing permission info | Complete guide | ✅ Updated |

---

**Fixed**: November 17, 2025
**Status**: ✅ Production ready
**Testing**: Verified on Linux host
