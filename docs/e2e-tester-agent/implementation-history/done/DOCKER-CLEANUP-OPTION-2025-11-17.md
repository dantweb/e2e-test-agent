# Docker Integration Test - Cleanup Option Added

**Date**: November 17, 2025
**Feature**: Optional cleanup of generated files
**Status**: ✅ IMPLEMENTED

---

## Feature Request

User wanted to prevent automatic cleanup of the `_generated` directory after Docker integration test completes.

## Implementation

Added configurable cleanup behavior with command-line flag support.

### Default Behavior (Changed)

**Before**: Always deleted `_generated` directory after test
**After**: **Keeps** `_generated` directory by default

This allows users to inspect generated `.ox.test` files after the test completes.

### Command-Line Options

```bash
# Keep generated files (DEFAULT)
./test-docker-integration.sh

# Keep generated files (explicit)
./test-docker-integration.sh --no-cleanup

# Delete generated files after test
./test-docker-integration.sh --cleanup
```

## Changes Made

### 1. Added Argument Parsing

```bash
# Parse command line arguments
CLEANUP_GENERATED="false"
while [[ $# -gt 0 ]]; do
    case $1 in
        --cleanup)
            CLEANUP_GENERATED="true"
            shift
            ;;
        --no-cleanup)
            CLEANUP_GENERATED="false"
            shift
            ;;
        *)
            echo "Unknown option: $1"
            echo "Usage: $0 [--cleanup | --no-cleanup]"
            exit 1
            ;;
    esac
done
```

### 2. Updated Cleanup Function

```bash
# Clean up generated files (only if CLEANUP_GENERATED is true)
if [ "${CLEANUP_GENERATED}" = "true" ] && [ -d "${OUTPUT_DIR}" ]; then
    rm -rf "${OUTPUT_DIR}"
    print_success "Cleaned up output directory: ${OUTPUT_DIR}"
elif [ "${CLEANUP_GENERATED}" = "false" ] && [ -d "${OUTPUT_DIR}" ]; then
    print_info "Keeping generated files in: ${OUTPUT_DIR}"
fi
```

### 3. Added Usage Documentation

Updated script header with usage examples:

```bash
#!/bin/bash
# Docker Integration Test Script
# Tests the ability to call Docker commands to generate tests and .ox.test files
# using the given .env file
#
# Usage:
#   ./test-docker-integration.sh              # Keep generated files (default)
#   ./test-docker-integration.sh --cleanup    # Delete generated files after test
```

## Output Behavior

### With Default (Keep Files)

```
✓ All tests passed!

ℹ Cleaning up...
✓ Removed container: e2e-test-integration-952365
ℹ Keeping generated files in: _generated
```

**Result**: `_generated/` directory remains with all generated files

### With --cleanup Flag

```
✓ All tests passed!

ℹ Cleaning up...
✓ Removed container: e2e-test-integration-952365
✓ Cleaned up output directory: _generated
```

**Result**: `_generated/` directory is deleted

## Use Cases

### Use Case 1: Development & Debugging

**Scenario**: Developer wants to inspect generated `.ox.test` files

```bash
./test-docker-integration.sh
# Files remain in _generated/ for inspection
cat _generated/*.ox.test
```

### Use Case 2: CI/CD Pipeline

**Scenario**: CI wants to test Docker integration without leaving artifacts

```bash
./test-docker-integration.sh --cleanup
# Everything cleaned up after test
```

### Use Case 3: Explicit Control

**Scenario**: Script called from another script that needs to control cleanup

```bash
# Keep files
./test-docker-integration.sh --no-cleanup

# Clean files
./test-docker-integration.sh --cleanup
```

## Documentation Updates

### Updated Files

1. **`test-docker-integration.sh`**:
   - Added argument parsing (lines 12-30)
   - Updated cleanup function (lines 50-56)
   - Added usage documentation in header

2. **`docs/DOCKER-INTEGRATION-TEST.md`**:
   - Added "Command-Line Options" section
   - Updated "What the Script Does" section
   - Added examples for all three usage modes

## Examples

### Example 1: Keep Files (Default)

```bash
$ ./test-docker-integration.sh
======================================
Docker Integration Test
======================================

[... test output ...]

✓ All tests passed!

ℹ Cleaning up...
✓ Removed container: e2e-test-integration-952365
ℹ Keeping generated files in: _generated

$ ls _generated/
shopping-cart-test.ox.test  shopping-cart-test.spec.ts
```

### Example 2: Clean Up Files

```bash
$ ./test-docker-integration.sh --cleanup
======================================
Docker Integration Test
======================================

[... test output ...]

✓ All tests passed!

ℹ Cleaning up...
✓ Removed container: e2e-test-integration-952365
✓ Cleaned up output directory: _generated

$ ls _generated/
ls: cannot access '_generated/': No such file or directory
```

### Example 3: Invalid Option

```bash
$ ./test-docker-integration.sh --invalid
Unknown option: --invalid
Usage: test-docker-integration.sh [--cleanup | --no-cleanup]
```

## Benefits

1. ✅ **Flexibility**: Users can choose cleanup behavior per run
2. ✅ **Default Keeps Files**: Better for development (inspect results)
3. ✅ **CI/CD Friendly**: Can still clean up with `--cleanup` flag
4. ✅ **Explicit Control**: Both `--cleanup` and `--no-cleanup` available
5. ✅ **Clear Feedback**: Script prints what it's doing with generated files

## Backward Compatibility

**Breaking Change**: Default behavior changed from "cleanup" to "no cleanup"

**Migration**: If you relied on automatic cleanup, update your scripts:

```bash
# Old (automatic cleanup)
./test-docker-integration.sh

# New (explicit cleanup)
./test-docker-integration.sh --cleanup
```

**Rationale**: Keeping files by default is more useful for development and debugging.

## Summary

| Aspect | Before | After |
|--------|--------|-------|
| **Default** | Delete files | Keep files |
| **Options** | None | `--cleanup`, `--no-cleanup` |
| **Flexibility** | ❌ No control | ✅ Full control |
| **Development** | ❌ Hard to debug | ✅ Easy to inspect |
| **CI/CD** | ✅ Auto-clean | ✅ Optional clean |

---

**Implemented**: November 17, 2025
**Status**: ✅ Production ready
**Default**: Keep generated files (better for development)
