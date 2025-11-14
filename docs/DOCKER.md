# Docker Usage Guide

E2E Test Agent is fully containerized and provides multiple ways to run tests using Docker.

## Table of Contents

- [Quick Start](#quick-start)
- [Docker Run](#docker-run)
- [Docker Compose](#docker-compose)
- [Building the Image](#building-the-image)
- [Environment Variables](#environment-variables)
- [Volume Mounts](#volume-mounts)
- [CI/CD Integration](#cicd-integration)
- [Troubleshooting](#troubleshooting)

## Quick Start

```bash
# Build the image
docker build -t dantweb/e2e-test-agent:latest .

# Run a test
docker run --rm \
  -v $(pwd):/workspace \
  dantweb/e2e-test-agent:latest \
  --env=.env.example \
  --src=docs/e2e-tester-agent/demo-compulable-inception.yaml \
  --output=_generated
```

## Docker Run

### Basic Usage

The container expects files to be mounted at `/workspace`:

```bash
docker run --rm \
  -v $(pwd):/workspace \
  dantweb/e2e-test-agent:latest \
  --env=path_to_env_file.env \
  --src=path_to_test_file.yaml \
  --output=output_directory
```

### With Environment Variables

You can pass environment variables directly instead of using an env file:

```bash
docker run --rm \
  -v $(pwd):/workspace \
  -e LLM_PROVIDER=openai \
  -e OPENAI_API_KEY=your-api-key \
  -e HEADLESS=true \
  -e BROWSER=chromium \
  dantweb/e2e-test-agent:latest \
  --src=test.yaml \
  --output=_generated
```

### Interactive Mode

To run the container interactively for debugging:

```bash
docker run -it --rm \
  -v $(pwd):/workspace \
  --entrypoint /bin/bash \
  dantweb/e2e-test-agent:latest
```

## Docker Compose

### Configuration

The `docker-compose.yml` includes an `e2e-agent` service configured with the `e2e-test` profile.

### Running Tests

```bash
# Build the service
docker compose build e2e-agent

# Run a test
docker compose run --rm e2e-agent \
  --env=.env \
  --src=test.yaml \
  --output=_generated

# With environment variables from host .env
E2E_LLM_PROVIDER=openai \
E2E_OPENAI_API_KEY=sk-... \
docker compose run --rm e2e-agent \
  --src=test.yaml \
  --output=_generated
```

### Using Profile

The service is configured with the `e2e-test` profile:

```bash
# Start with profile (if you want it as a service)
docker compose --profile e2e-test up

# Or use run command (doesn't require profile flag)
docker compose run --rm e2e-agent --help
```

## Building the Image

### Multi-Stage Build

The Dockerfile uses a multi-stage build to optimize image size:

1. **Builder Stage**: Installs all dependencies and compiles TypeScript
2. **Production Stage**: Copies only production dependencies and compiled code

```bash
# Build production image locally
docker build -t dantweb/e2e-test-agent:latest .

# Build with specific tag
docker build -t dantweb/e2e-test-agent:v1.0.0 .

# Build with build args (if needed in future)
docker build \
  --build-arg NODE_VERSION=20 \
  -t dantweb/e2e-test-agent:latest \
  .
```

### Test/CI Dockerfile

For running tests in CI/CD, use `Dockerfile.test`:

```bash
# Build test image (includes test files and dev dependencies)
cp .dockerignore .dockerignore.prod
cp .dockerignore.test .dockerignore
docker build -f Dockerfile.test -t dantweb/e2e-test-agent:test .
mv .dockerignore.prod .dockerignore

# Run tests
docker run --rm dantweb/e2e-test-agent:test npm test
```

The test Dockerfile:
- Includes all source code and test files
- Contains dev dependencies (Jest, ESLint, etc.)
- Is used in CI/CD pipelines
- Should not be used for production deployments

### Image Details

**Production Image** (`Dockerfile`):
- **Base Image**: `node:20-bookworm-slim`
- **Installed Browsers**: Chromium, Firefox, WebKit (via Playwright)
- **Working Directory**: `/workspace`
- **User**: Non-root user `e2e` for security
- **Size**: ~2.3GB (includes all browser dependencies)
- **Dependencies**: All (including dev for Jest support)

**Test Image** (`Dockerfile.test`):
- **Base Image**: `node:20-bookworm-slim`
- **Installed Browsers**: Chromium only (faster builds)
- **Working Directory**: `/app`
- **Includes**: Source code, tests, and all dependencies
- **Size**: ~1.8GB (smaller, only Chromium)
- **Purpose**: CI/CD testing only

## Environment Variables

### Configuration Methods

1. **Via .env file** (mounted into container):
```bash
docker run --rm \
  -v $(pwd):/workspace \
  dantweb/e2e-test-agent:latest \
  --env=.env
```

2. **Via -e flags**:
```bash
docker run --rm \
  -e OPENAI_API_KEY=sk-... \
  -e LLM_PROVIDER=openai \
  dantweb/e2e-test-agent:latest
```

3. **Via docker-compose.yml**:
```yaml
environment:
  - LLM_PROVIDER=${E2E_LLM_PROVIDER:-openai}
  - OPENAI_API_KEY=${E2E_OPENAI_API_KEY}
```

### Available Variables

#### LLM Provider Configuration

| Variable | Description | Default |
|----------|-------------|---------|
| `LLM_PROVIDER` | LLM provider (openai or anthropic) | `openai` |

#### OpenAI Configuration

| Variable | Description | Default |
|----------|-------------|---------|
| `OPENAI_API_KEY` | OpenAI API key | - |
| `OPENAI_API_URL` | OpenAI API base URL | `https://api.openai.com/v1` |
| `OPENAI_MODEL` | OpenAI model to use | `gpt-4o` |
| `OPENAI_MAX_TOKENS` | Maximum tokens for completion | `4000` |
| `OPENAI_TEMPERATURE` | Temperature for generation | `0.7` |

#### Anthropic Configuration

| Variable | Description | Default |
|----------|-------------|---------|
| `ANTHROPIC_API_KEY` | Anthropic API key | - |
| `ANTHROPIC_API_URL` | Anthropic API base URL | `https://api.anthropic.com/v1` |
| `ANTHROPIC_MODEL` | Anthropic model to use | `claude-3-5-sonnet-20241022` |
| `ANTHROPIC_MAX_TOKENS` | Maximum tokens for completion | `4000` |
| `ANTHROPIC_TEMPERATURE` | Temperature for generation | `0.7` |

#### Playwright Configuration

| Variable | Description | Default |
|----------|-------------|---------|
| `HEADLESS` | Run browser in headless mode | `true` |
| `BROWSER` | Browser to use (chromium/firefox/webkit) | `chromium` |
| `TIMEOUT` | Default timeout in ms | `30000` |
| `SCREENSHOT_ON_FAILURE` | Take screenshot on test failure | `true` |

#### Test Configuration

| Variable | Description | Default |
|----------|-------------|---------|
| `BASE_URL` | Base URL for tests | `http://localhost:3000` |
| `TEST_PARALLELISM` | Number of parallel tests | `1` |

#### Logging Configuration

| Variable | Description | Default |
|----------|-------------|---------|
| `LOG_LEVEL` | Logging level (debug/info/warn/error) | `info` |
| `LOG_FILE` | Path to log file | `./logs/e2e-agent.log` |

#### Report Configuration

| Variable | Description | Default |
|----------|-------------|---------|
| `REPORT_FORMAT` | Report format (html/json) | `html` |
| `REPORT_OUTPUT_DIR` | Report output directory | `./reports` |

## Volume Mounts

### Recommended Mount Points

```bash
docker run --rm \
  -v $(pwd):/workspace \              # Your test files and outputs
  -v $(pwd)/.env:/workspace/.env \     # Environment configuration
  -v $(pwd)/logs:/workspace/logs \     # Log files
  -v $(pwd)/reports:/workspace/reports # Test reports
  dantweb/e2e-test-agent:latest
```

### Read-Only Mounts

For test files that shouldn't be modified:

```bash
docker run --rm \
  -v $(pwd)/tests:/workspace/tests:ro \
  -v $(pwd)/output:/workspace/output \
  dantweb/e2e-test-agent:latest \
  --src=tests/test.yaml \
  --output=output
```

## CI/CD Integration

### GitHub Actions

```yaml
jobs:
  e2e-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Build Docker image
        run: docker build -t e2e-agent .
        working-directory: ./e2e-agent

      - name: Run E2E tests
        env:
          OPENAI_API_KEY: ${{ secrets.OPENAI_API_KEY }}
        run: |
          docker run --rm \
            -v $(pwd):/workspace \
            -e OPENAI_API_KEY=$OPENAI_API_KEY \
            -e LLM_PROVIDER=openai \
            -e HEADLESS=true \
            e2e-agent \
            --src=tests/test.yaml \
            --output=_generated
        working-directory: ./e2e-agent

      - name: Upload test results
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: test-results
          path: e2e-agent/_generated/
```

### GitLab CI

```yaml
e2e-tests:
  image: docker:latest
  services:
    - docker:dind
  script:
    - cd e2e-agent
    - docker build -t e2e-agent .
    - docker run --rm
        -v $(pwd):/workspace
        -e OPENAI_API_KEY=$OPENAI_API_KEY
        -e LLM_PROVIDER=openai
        e2e-agent
        --src=tests/test.yaml
        --output=_generated
  artifacts:
    paths:
      - e2e-agent/_generated/
    when: always
```

## Troubleshooting

### Permission Issues

If you encounter permission issues with mounted volumes:

```bash
# Option 1: Run with your user ID
docker run --rm \
  -v $(pwd):/workspace \
  -u $(id -u):$(id -g) \
  dantweb/e2e-test-agent:latest

# Option 2: Fix permissions after run
sudo chown -R $(id -u):$(id -g) ./_generated
```

### Browser Issues

If browsers fail to launch:

```bash
# Run with additional capabilities
docker run --rm \
  -v $(pwd):/workspace \
  --cap-add=SYS_ADMIN \
  dantweb/e2e-test-agent:latest

# Or use shared memory
docker run --rm \
  -v $(pwd):/workspace \
  --shm-size=2gb \
  dantweb/e2e-test-agent:latest
```

### Memory Issues

For memory-intensive tests:

```bash
docker run --rm \
  -v $(pwd):/workspace \
  -m 4g \
  --memory-swap 4g \
  dantweb/e2e-test-agent:latest
```

### Debugging

To debug issues inside the container:

```bash
# Get a shell
docker run -it --rm \
  -v $(pwd):/workspace \
  --entrypoint /bin/bash \
  dantweb/e2e-test-agent:latest

# Inside container:
# Check Node version
node --version

# Check Playwright browsers
npx playwright --version

# List installed browsers
ls -la /app/node_modules/.cache/ms-playwright/

# Run tests manually
cd /workspace
node /app/dist/index.js --help
```

### Inspecting the Image

```bash
# View image layers
docker history dantweb/e2e-test-agent:latest

# Inspect image details
docker inspect dantweb/e2e-test-agent:latest

# Check image size
docker images dantweb/e2e-test-agent:latest
```

## Advanced Usage

### Custom Entrypoint

Run custom commands:

```bash
docker run --rm \
  -v $(pwd):/workspace \
  --entrypoint node \
  dantweb/e2e-test-agent:latest \
  /app/dist/custom-script.js
```

### Network Configuration

For tests that need to access host services:

```bash
# Use host network
docker run --rm \
  --network host \
  -v $(pwd):/workspace \
  dantweb/e2e-test-agent:latest

# Or connect to specific network
docker run --rm \
  --network my-network \
  -v $(pwd):/workspace \
  dantweb/e2e-test-agent:latest
```

### Resource Limits

```bash
docker run --rm \
  -v $(pwd):/workspace \
  --cpus=2 \
  --memory=4g \
  --memory-swap=4g \
  dantweb/e2e-test-agent:latest
```

## Publishing the Image

### To Docker Hub

```bash
# Login
docker login

# Tag for Docker Hub
docker tag dantweb/e2e-test-agent:latest dantweb/e2e-test-agent:v1.0.0

# Push
docker push dantweb/e2e-test-agent:latest
docker push dantweb/e2e-test-agent:v1.0.0
```

### To GitHub Container Registry

```bash
# Login
echo $GITHUB_TOKEN | docker login ghcr.io -u USERNAME --password-stdin

# Tag
docker tag dantweb/e2e-test-agent:latest ghcr.io/dantweb/e2e-test-agent:latest

# Push
docker push ghcr.io/dantweb/e2e-test-agent:latest
```

## Security Considerations

1. **Non-root User**: Container runs as user `e2e` (not root)
2. **No Secrets in Image**: API keys must be provided at runtime
3. **Minimal Base Image**: Uses slim Debian base
4. **Read-only Filesystem**: Consider using `--read-only` flag with tmpfs mounts
5. **Drop Capabilities**: Use `--cap-drop=ALL` and add only needed capabilities

```bash
# Security-hardened run
docker run --rm \
  -v $(pwd):/workspace \
  --cap-drop=ALL \
  --cap-add=SYS_ADMIN \
  --security-opt=no-new-privileges \
  -e OPENAI_API_KEY=$OPENAI_API_KEY \
  dantweb/e2e-test-agent:latest
```
