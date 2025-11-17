# Docker Integration Test

## Overview

The `test-docker-integration.sh` script tests the ability to run the E2E Test Agent in a Docker container to generate tests and `.ox.test` files using environment variables from a `.env` file.

## Purpose

This integration test validates:
1. Docker image availability (builds if needed)
2. Environment variable loading from `.env.test` file
3. Volume mounting for workspace access
4. CLI execution within the container
5. Test generation in the `_generated` directory
6. Validation of generated `.ox.test` files

## Prerequisites

- Docker installed and running
- `.env.test` file with valid configuration (or `.env.example` to create one)
- Test YAML file (default: `tests/realworld/shopping-flow.yaml`)

## Usage

### Basic Usage

```bash
./test-docker-integration.sh
```

### What the Script Does

1. **Checks Docker availability**: Verifies Docker is installed
2. **Builds Docker image**: If not present, builds `e2e-test-agent:latest`
3. **Validates .env file**: Checks for `.env.test` or creates from `.env.example`
4. **Runs Docker container**: Executes the agent with:
   - Environment variables from `.env.test`
   - Current directory mounted as `/workspace`
   - CLI arguments: `--src=tests/realworld/shopping-flow.yaml --output=_generated --oxtest`
5. **Verifies output**: Checks that `.ox.test` files are generated
6. **Validates content**: Ensures files contain valid OXTest commands
7. **Cleans up**: Removes container and generated files

### Docker Command

The script executes the following Docker command:

```bash
docker run --rm \
  --name e2e-test-integration-$$ \
  --env-file .env.test \
  -v $(pwd):/workspace \
  e2e-test-agent:latest \
  --src=tests/realworld/shopping-flow.yaml \
  --output=_generated \
  --oxtest
```

## Configuration

You can customize the test by editing the script variables:

```bash
DOCKER_IMAGE="e2e-test-agent:latest"  # Docker image name
TEST_YAML="tests/realworld/shopping-flow.yaml"  # Input YAML file
OUTPUT_DIR="_generated"  # Output directory for generated files
ENV_FILE=".env.test"  # Environment file
```

## Environment File

The `.env.test` file should contain the necessary API keys and configuration:

```env
# LLM Provider Configuration
OPENAI_API_KEY=your-openai-api-key-here
ANTHROPIC_API_KEY=your-anthropic-api-key-here
DEEPSEEK_API_KEY=your-deepseek-api-key-here

# Default LLM Provider
DEFAULT_LLM_PROVIDER=openai

# Application Settings
NODE_ENV=test
HEADLESS=true
BROWSER=chromium
```

## Output

### Success Output

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
✓ Docker container executed successfully
ℹ Step 7: Verifying generated files...
✓ Found 1 .ox.test file(s):
  - _generated/shopping-flow.ox.test
✓ All generated files are valid
ℹ Step 8: Checking for .spec.ts files...
ℹ No .spec.ts files found (this is OK if only OXTest was requested)
ℹ Step 9: Validating content of generated .ox.test files...
✓ Generated .ox.test file contains valid OXTest commands

======================================
Test Summary
======================================
✓ Docker integration test PASSED

Summary:
  ✓ Docker image available
  ✓ .env file loaded
  ✓ Container executed successfully
  ✓ Generated 1 .ox.test file(s)
  ✓ All files are valid and non-empty
  ✓ Files contain expected OXTest commands

✓ All tests passed!
```

### Failure Scenarios

The script will fail and exit with error code if:
- Docker is not installed
- Docker image build fails
- `.env.test` and `.env.example` are both missing
- Test YAML file is missing
- Docker container execution fails
- No `.ox.test` files are generated
- Generated files are empty
- Generated files don't contain valid OXTest commands

## Cleanup

The script automatically cleans up:
- Docker container (removed via `--rm` flag)
- Generated files in `_generated` directory (on exit)

## CI/CD Integration

You can integrate this script into your CI/CD pipeline:

### GitHub Actions

```yaml
name: Docker Integration Test

on: [push, pull_request]

jobs:
  docker-integration:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Create .env.test
        run: |
          echo "OPENAI_API_KEY=${{ secrets.OPENAI_API_KEY }}" >> .env.test
          echo "ANTHROPIC_API_KEY=${{ secrets.ANTHROPIC_API_KEY }}" >> .env.test
          echo "DEFAULT_LLM_PROVIDER=openai" >> .env.test

      - name: Run Docker Integration Test
        run: ./test-docker-integration.sh
```

### GitLab CI

```yaml
docker-integration:
  stage: test
  image: docker:latest
  services:
    - docker:dind
  before_script:
    - echo "OPENAI_API_KEY=$OPENAI_API_KEY" >> .env.test
  script:
    - ./test-docker-integration.sh
```

## Troubleshooting

### Docker Image Build Fails

**Problem**: Docker image fails to build

**Solution**:
1. Check Docker is running: `docker info`
2. Verify Dockerfile exists
3. Build manually: `docker build -t e2e-test-agent:latest .`
4. Check build logs for errors

### Permission Denied

**Problem**: `permission denied` error when running script

**Solution**:
```bash
chmod +x test-docker-integration.sh
```

### No Files Generated

**Problem**: Script completes but no `.ox.test` files are found

**Solution**:
1. Check `.env.test` contains valid API keys
2. Verify test YAML file is valid
3. Run Docker container manually to see error output:
   ```bash
   docker run --rm --env-file .env.test -v $(pwd):/workspace e2e-test-agent:latest --src=tests/realworld/shopping-flow.yaml --output=_generated --oxtest
   ```

### Volume Mount Issues

**Problem**: Container can't access files or can't write to output directory

**Solution**:
1. Check current directory is correct: `pwd`
2. Verify permissions on output directory
3. On Windows, ensure Docker Desktop has file sharing enabled

## Related Files

- `Dockerfile` - Production Docker image
- `Dockerfile.test` - Test/CI Docker image
- `.env.example` - Example environment file
- `tests/realworld/shopping-flow.yaml` - Test YAML file

## See Also

- [Main README](../README.md)
- [Docker Setup Guide](../README.md#docker-usage)
- [Troubleshooting Guide](TROUBLESHOOTING.md)
