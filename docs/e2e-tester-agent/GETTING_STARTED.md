# Getting Started with E2E Test Agent

## Overview

E2E Test Agent is an AI-powered end-to-end testing framework that uses Large Language Models (LLMs) to generate and execute browser automation tests using Playwright.

## Prerequisites

- Node.js 20+ (recommended: Node 22)
- npm
- API key for OpenAI or Anthropic

## Installation

### 1. Clone and Install Dependencies

```bash
git clone <repository-url>
cd e2e-agent
npm install
```

### 2. Install Playwright Browsers

```bash
npx playwright install chromium
```

### 3. Configure Environment Variables

Copy the example environment file and add your API keys:

```bash
cp .env.example .env
```

Edit `.env` and add your actual API keys:

```env
# Choose your LLM provider
LLM_PROVIDER=openai  # or anthropic

# OpenAI Configuration
OPENAI_API_KEY=sk-your-actual-api-key-here
OPENAI_MODEL=gpt-4o
OPENAI_MAX_TOKENS=4000

# Or Anthropic Configuration
ANTHROPIC_API_KEY=sk-ant-your-actual-api-key-here
ANTHROPIC_MODEL=claude-3-5-sonnet-20241022
ANTHROPIC_MAX_TOKENS=4000
```

## Quick Start

### Running Tests

```bash
# Run all tests
npm test

# Run unit tests only
npm run test:unit

# Run with coverage
npm run test:coverage

# Run tests in watch mode
npm run test:watch
```

### Code Quality

```bash
# Run linter
npm run lint

# Auto-fix linting issues
npm run lint:fix

# Format code
npm run format

# Check formatting
npm run format:check
```

### Building the Project

```bash
# Compile TypeScript
npm run build

# Type check without emitting files
npm run type-check
```

## Project Structure

```
e2e-agent/
├── src/
│   ├── application/         # Application layer
│   │   ├── engines/         # Core engines (HTML extraction, decomposition, task decomposition)
│   │   └── orchestrators/   # Test orchestration and execution
│   ├── domain/              # Domain entities and interfaces
│   │   ├── entities/        # Core entities (Task, Subtask, Command, Selector)
│   │   ├── enums/          # Command types and strategies
│   │   └── interfaces/     # Domain interfaces
│   ├── infrastructure/      # Infrastructure layer
│   │   ├── executors/      # Playwright execution and selection
│   │   ├── llm/            # LLM provider implementations (OpenAI, Anthropic)
│   │   └── parsers/        # Command parsing and tokenization
│   └── configuration/       # Configuration and validation
├── tests/
│   ├── unit/               # Unit tests (353 tests)
│   ├── integration/        # Integration tests
│   └── e2e/                # End-to-end tests
└── docs/                   # Documentation
```

## Core Concepts

### 1. Domain Entities

- **Task**: High-level test scenario
- **Subtask**: Individual test step with commands
- **OxtestCommand**: Specific browser action or assertion
- **SelectorSpec**: Element selector with fallback strategies

### 2. LLM Integration

The system uses LLMs to:
- Decompose high-level test descriptions into executable steps
- Generate intelligent element selectors
- Create assertion commands

### 3. Multi-Strategy Selector

Automatically tries multiple strategies to find elements:
- CSS selectors
- XPath
- Text content
- ARIA roles
- Test IDs
- Placeholders

### 4. Execution Context

Maintains state across test steps:
- Variables
- Cookies
- Session information
- Current URL and page title

## Usage Examples

### Example 1: Basic Test Structure

```typescript
import { Task } from './src/domain/entities/Task';
import { Subtask } from './src/domain/entities/Subtask';
import { OxtestCommand } from './src/domain/entities/OxtestCommand';

// Create a task
const task = new Task(
  'login-test',
  'Login to the application',
  []
);

// Create a subtask with commands
const subtask = new Subtask(
  'login-subtask',
  'Enter credentials and log in',
  [
    new OxtestCommand('navigate', { url: 'https://example.com/login' }),
    new OxtestCommand('fill', { value: 'testuser' }),
    new OxtestCommand('fill', { value: 'password123' }),
    new OxtestCommand('click', {}),
    new OxtestCommand('assertUrl', { expected: '/dashboard' }),
  ]
);
```

### Example 2: Using Multi-Strategy Selectors

```typescript
import { SelectorSpec } from './src/domain/entities/SelectorSpec';

// Primary selector with fallbacks
const selector = new SelectorSpec(
  'css',
  'button.submit',
  [
    { strategy: 'text', value: 'Submit' },
    { strategy: 'role', value: 'button' },
    { strategy: 'testid', value: 'submit-button' },
  ]
);
```

### Example 3: Task Decomposition

```typescript
import { TaskDecomposer } from './src/application/engines/TaskDecomposer';
import { IterativeDecompositionEngine } from './src/application/engines/IterativeDecompositionEngine';

// Use LLM to decompose a high-level task
const decomposer = new TaskDecomposer(decompositionEngine);
const task = new Task('checkout', 'Complete the checkout process', []);

const subtasks = await decomposer.decomposeTask(task);
// Returns: Array of subtasks with generated commands
```

### Example 4: Test Orchestration

```typescript
import { TestOrchestrator } from './src/application/orchestrators/TestOrchestrator';
import { ExecutionContextManager } from './src/application/orchestrators/ExecutionContextManager';

// Execute a task
const orchestrator = new TestOrchestrator(executor, contextManager);
const result = await orchestrator.executeTask(task, subtasks, context);

console.log(`Status: ${result.status}`);
console.log(`Duration: ${result.duration}ms`);
```

## Environment Variables Reference

| Variable | Description | Default |
|----------|-------------|---------|
| `LLM_PROVIDER` | LLM provider (`openai` or `anthropic`) | `openai` |
| `OPENAI_API_KEY` | OpenAI API key | Required if using OpenAI |
| `OPENAI_MODEL` | OpenAI model name | `gpt-4o` |
| `OPENAI_MAX_TOKENS` | Max tokens for OpenAI | `4000` |
| `ANTHROPIC_API_KEY` | Anthropic API key | Required if using Anthropic |
| `ANTHROPIC_MODEL` | Anthropic model name | `claude-3-5-sonnet-20241022` |
| `ANTHROPIC_MAX_TOKENS` | Max tokens for Anthropic | `4000` |
| `HEADLESS` | Run browser in headless mode | `true` |
| `BROWSER` | Browser to use | `chromium` |
| `TIMEOUT` | Default timeout (ms) | `30000` |
| `LOG_LEVEL` | Logging level | `info` |

## Testing with Real LLMs

To run tests with actual LLM API calls, set your API key in `.env` and configure:

```env
USE_MOCK_LLM=false
```

By default, tests use mocked LLM responses for speed and reliability.

## Troubleshooting

### Common Issues

#### 1. API Key Not Found

```
Error: OpenAI API key not provided
```

**Solution**: Ensure `.env` file exists and contains your API key.

#### 2. Playwright Not Installed

```
Error: Executable doesn't exist at...
```

**Solution**: Run `npx playwright install chromium`

#### 3. Tests Failing

```bash
# Clear cache and reinstall
rm -rf node_modules package-lock.json
npm install

# Run tests
npm test
```

#### 4. TypeScript Errors

```bash
# Rebuild
npm run build
```

## Development Workflow

### 1. Making Changes

```bash
# Create a feature branch
git checkout -b feature/my-feature

# Make changes
# ... edit files ...

# Run tests
npm test

# Fix linting
npm run lint:fix

# Format code
npm run format
```

### 2. Running CI Checks Locally

```bash
# Test linting (simulates GitHub Actions)
./test-ci-lint.sh

# Check overall CI readiness
./ci-status.sh
```

### 3. Committing Changes

```bash
git add .
git commit -m "feat: add new feature"
git push origin feature/my-feature
```

## Next Steps

- Read the [Architecture Documentation](./docs/e2e-tester-agent/README.md)
- Explore [Implementation Details](./docs/e2e-tester-agent/implementation/README.md)
- Check the [API Documentation](./docs/) (coming soon)
- Review [Example Projects](./examples/) (coming soon)

## Getting Help

- Check the [GitHub Issues](https://github.com/your-repo/e2e-agent/issues)
- Read the [FAQ](./docs/FAQ.md) (coming soon)
- Review the [Troubleshooting Guide](./docs/TROUBLESHOOTING.md) (coming soon)

## Contributing

We welcome contributions! Please see [CONTRIBUTING.md](./CONTRIBUTING.md) for guidelines.

## License

This project is licensed under [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/).
