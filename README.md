# E2E Test Agent

An intelligent end-to-end testing agent that uses LLMs to decompose high-level test scenarios into executable Playwright commands.

## Features

- **LLM-Powered Test Generation**: Uses OpenAI or Anthropic LLMs to understand natural language test descriptions
- **Iterative Decomposition**: Breaks down complex test scenarios into manageable subtasks
- **Multi-Strategy Selector**: Intelligent element selection with fallback strategies
- **Playwright Integration**: Leverages Playwright for reliable browser automation
- **Predicate Validation**: Comprehensive assertion engine for test validation
- **Execution Context**: Maintains state across test steps (cookies, variables, URLs)

## Quick Start

### Installation

```bash
npm install
```

### Configuration

Create a `.env` file:

```env
# LLM Provider (openai or anthropic)
LLM_PROVIDER=openai
OPENAI_API_KEY=your-api-key-here

# Or for Anthropic
# LLM_PROVIDER=anthropic
# ANTHROPIC_API_KEY=your-api-key-here
```

### Running Tests

```bash
# Run all tests
npm test

# Run unit tests only
npm run test:unit

# Run integration tests
npm run test:integration

# Run with coverage
npm run test:coverage
```

### Linting & Formatting

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

## CI/CD

The project includes comprehensive GitHub Actions workflows:

- **Main CI**: Full test suite, linting, type checking, and build on push to master
- **PR Checks**: Code quality and tests on pull requests
- **Nightly Tests**: Extended E2E tests across multiple browsers
- **Release**: Automated releases and publishing

### Testing CI Locally

Use the included helper scripts:

```bash
# Test linting (simulates GitHub Actions)
./test-ci-lint.sh

# Check overall CI readiness
./ci-status.sh
```

## Project Structure

```
src/
├── application/          # Application layer
│   ├── engines/         # Core engines (HTML extraction, LLM decomposition)
│   └── orchestrators/   # Test orchestration and execution
├── domain/              # Domain entities and interfaces
│   ├── entities/        # Core entities (Task, Subtask, Command, Selector)
│   ├── enums/          # Command types and strategies
│   └── interfaces/     # Domain interfaces
├── infrastructure/      # Infrastructure layer
│   ├── executors/      # Playwright execution and selection
│   ├── llm/            # LLM provider implementations
│   └── parsers/        # Command parsing and tokenization
└── configuration/       # Configuration and validation

tests/
├── unit/               # Unit tests
└── integration/        # Integration tests (future)
```

## Architecture

The project follows Clean Architecture principles:

1. **Domain Layer**: Core business logic and entities
2. **Application Layer**: Use cases and orchestration
3. **Infrastructure Layer**: External integrations (Playwright, LLMs, parsers)
4. **Configuration Layer**: Environment setup and validation

## Development

### Prerequisites

- Node.js 22+
- npm

### Setup

```bash
# Install dependencies
npm ci

# Install Playwright browsers
npx playwright install --with-deps chromium

# Run tests
npm test
```

### Code Quality

- **ESLint**: TypeScript strict mode with prettier integration
- **Prettier**: Consistent code formatting
- **Husky**: Git hooks for pre-commit checks
- **Jest**: Testing framework with 339 passing tests

### Current Status

- ✅ 339/339 tests passing
- ✅ 0 ESLint errors (6 non-blocking warnings)
- ✅ Full CI/CD pipeline configured
- ✅ Node 22 compatibility
- ✅ Codecov integration (optional)

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

MIT

## Acknowledgments

Built with:
- [Playwright](https://playwright.dev/) - Browser automation
- [OpenAI](https://openai.com/) - GPT models
- [Anthropic](https://anthropic.com/) - Claude models
- [Jest](https://jestjs.io/) - Testing framework
