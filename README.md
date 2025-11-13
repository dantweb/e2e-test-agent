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

## Scientific Background

This project builds on several key concepts from computer science and AI research:

### Task Decomposition & Planning
- **Hierarchical Task Networks (HTN)**: Nau, D., Au, T. C., Ilghami, O., Kuter, U., Murdock, J. W., Wu, D., & Yaman, F. (2003). SHOP2: An HTN planning system. *Journal of Artificial Intelligence Research*, 20, 379-404.
- **Goal-Oriented Action Planning**: Orkin, J. (2006). Three States and a Plan: The AI of F.E.A.R. *Game Developers Conference*.

### Directed Acyclic Graphs (DAG)
- **Task Dependencies**: Cormen, T. H., Leiserson, C. E., Rivest, R. L., & Stein, C. (2009). *Introduction to Algorithms* (3rd ed.). MIT Press. Chapter 22: Elementary Graph Algorithms.
- **Workflow Management**: van der Aalst, W. M. P. (1998). The Application of Petri Nets to Workflow Management. *Journal of Circuits, Systems, and Computers*, 8(01), 21-66.

### LLM-Driven Program Synthesis
- **Chain-of-Thought Prompting**: Wei, J., Wang, X., Schuurmans, D., Bosma, M., Chi, E., Le, Q., & Zhou, D. (2022). Chain-of-Thought Prompting Elicits Reasoning in Large Language Models. *arXiv preprint arXiv:2201.11903*.
- **Program Synthesis from Natural Language**: Gu, X., Zhang, H., & Kim, S. (2018). Deep Code Search. *Proceedings of the 40th International Conference on Software Engineering*, 933-944.

### Test Automation & Verification
- **Model-Based Testing**: Utting, M., & Legeard, B. (2007). *Practical Model-Based Testing: A Tools Approach*. Morgan Kaufmann.
- **Property-Based Testing**: Claessen, K., & Hughes, J. (2000). QuickCheck: A Lightweight Tool for Random Testing of Haskell Programs. *ACM SIGPLAN Notices*, 35(9), 268-279.

### Clean Architecture
- **Layered Architecture**: Martin, R. C. (2017). *Clean Architecture: A Craftsman's Guide to Software Structure and Design*. Prentice Hall.
- **Domain-Driven Design**: Evans, E. (2003). *Domain-Driven Design: Tackling Complexity in the Heart of Software*. Addison-Wesley.

### Context Management & State Machines
- **Finite State Machines**: Hopcroft, J. E., Motwani, R., & Ullman, J. D. (2006). *Introduction to Automata Theory, Languages, and Computation* (3rd ed.). Pearson.
- **Session Management**: Fielding, R. T. (2000). *Architectural Styles and the Design of Network-based Software Architectures* (Doctoral dissertation). University of California, Irvine.

## License

This work is licensed under [Creative Commons Attribution 4.0 International (CC BY 4.0)](https://creativecommons.org/licenses/by/4.0/).

You are free to:
- **Share** — copy and redistribute the material in any medium or format
- **Adapt** — remix, transform, and build upon the material for any purpose, even commercially

Under the following terms:
- **Attribution** — You must give appropriate credit, provide a link to the license, and indicate if changes were made.

## Acknowledgments

Built with:
- [Playwright](https://playwright.dev/) - Browser automation
- [OpenAI](https://openai.com/) - GPT models
- [Anthropic](https://anthropic.com/) - Claude models
- [Jest](https://jestjs.io/) - Testing framework

### Research Foundations
This project synthesizes concepts from:
- Hierarchical Task Network planning
- Directed Acyclic Graph theory
- Large Language Model reasoning
- Model-based testing methodologies
- Clean Architecture principles
