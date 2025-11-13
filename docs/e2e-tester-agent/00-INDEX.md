# e2e-tester-agent: Documentation Index

**Project**: AI-Driven E2E Test Automation with Playwright
**Status**: Phase 1 - MVP Development
**Last Updated**: November 13, 2025

## Quick Start

1. **New to the project?** Start with [README.md](./README.md)
2. **Want to understand the architecture?** Read the architecture series (00-1 through 00-5)
3. **Looking for implementation details?** See the Task-Splitting guide

## Documentation Structure

### Core Documentation

#### [README.md](./README.md) (6.3 KB)
**Purpose**: Project overview, installation, usage, and features

**Contents**:
- Project description
- Installation instructions
- CLI usage (compile and execute commands)
- YAML configuration format
- Feature list
- Architecture summary with links to detailed docs

**Read this if**: You want a high-level understanding of what the project does

---

### Architecture Series

These documents provide comprehensive architectural design and decision documentation, split into manageable sections (5-8K tokens each).

#### [00-1: Introduction and Core Challenge](./00-1-introduction-and-challenge.md) (8.1 KB)
**Purpose**: Development principles and problem statement

**Contents**:
- Development principles (TDD, SOLID, Clean Code, Strict TypeScript)
- The core challenge: Converting YAML to executable Playwright
- Input/output examples
- The translation problem (natural language ambiguity)
- Introduction to the two architectural approaches

**Read this if**: You want to understand the fundamental problem we're solving and our development philosophy

---

#### [00-2: Layered Architecture](./00-2-layered-architecture.md) (12 KB)
**Purpose**: Detailed layer-by-layer architecture design

**Contents**:
- Clean Architecture overview
- **Layer 1**: Configuration (YAML parsing)
- **Layer 2**: Domain (Task models, validation predicates, DAG)
- **Layer 3**: Application (Decomposition, orchestration, validation engines)
- Complete TypeScript interfaces for all components
- Testing strategies for each layer

**Read this if**: You want to understand the code structure and component responsibilities

---

#### [00-3: Infrastructure and Execution](./00-3-infrastructure-and-execution.md) (16 KB)
**Purpose**: Implementation details for infrastructure and presentation layers

**Contents**:
- **Layer 4**: Infrastructure
  - Playwright executor implementation
  - Multi-strategy element selection
  - LLM provider abstraction (OpenAI, Anthropic, local)
  - LLM provider factory pattern
  - Database watcher for validation
- **Layer 5**: Output/Presentation
  - CLI application (compile and execute commands)
  - Report generators (HTML, JUnit)
- Data flow summary
- Dependency injection container

**Read this if**: You want to understand how browser automation and LLM integration work

---

#### [00-4: Technical Decisions and Roadmap](./00-4-technical-decisions-and-roadmap.md) (12 KB)
**Purpose**: Key decisions, open questions, and implementation roadmap

**Contents**:
- **Decided**:
  - Two-layer architecture
  - TypeScript with strict mode
  - Task DAG as core abstraction
  - Validation as first-class predicates
  - Multi-strategy element selection
- **Open Questions**:
  - Static code generation vs. pure interpretation
  - LLM strategy for decomposition
  - State management between tasks
  - Async execution model
  - Selector generation strategy
- **Roadmap**:
  - Phase 1: MVP (4-6 weeks)
  - Phase 2: Production features (6-8 weeks)
  - Phase 3: Advanced features (8-12 weeks)
  - Phase 4: Enterprise features (future)
- Performance and reliability targets
- Technology stack details

**Read this if**: You want to understand why decisions were made and what's planned for the future

---

#### [00-5: Approach Comparison and Rationale](./00-5-approach-comparison-and-rationale.md) (23 KB)
**Purpose**: Detailed comparison of architectural approaches with rationale

**Contents**:
- **Approach 1: Direct Code Generation**
  - Flow diagram
  - Example input/output
  - Pros (5 benefits)
  - Cons (7 challenges)
  - Rating summary
- **Approach 2: Two-Layer Interpretation** (chosen)
  - Flow diagram
  - Example intermediate representation
  - Pros (8 benefits)
  - Cons (4 challenges with mitigations)
  - Rating summary
- Side-by-side comparison table (12 criteria)
- Decision rationale (7 reasons)
- Alignment with SOLID, TDD, Clean Code principles

**Read this if**: You want to understand **why** we chose the two-layer architecture over direct code generation

---

#### [00-6: Iterative Execution and Oxtest](./00-6-iterative-execution-and-oxtest.md) (21 KB)
**Purpose**: Detailed explanation of iterative discovery and oxtest intermediate language

**Contents**:
- **Iterative Discovery Process**
  - How LLM explores pages step-by-step
  - Reading HTML/DOM at each iteration
  - Deciding next action (click, hover, type, keypress)
  - Example: Complex interaction discovery
- **Oxtest Language**
  - Design principles (obvious, simple, readable)
  - Complete command reference (30+ commands)
  - Selector strategies with fallbacks
  - Variable resolution
- **Two-Phase Execution Model**
  - Phase 1: Compilation (AI-driven, iterative)
  - Phase 2: Execution (deterministic, fast)
  - Output structure (`.ox.test` files + `manifest.json`)
- **Parser and Executor Architecture**
  - Complete TypeScript implementation
  - Command parsing and tokenization
  - Selector strategy resolution
  - Error handling
- **Benefits Analysis**
  - Human-readable format
  - Easy maintenance
  - Fast execution
  - Version control friendly
  - Standard debugging tools

**Read this if**: You want to understand **how** the LLM discovers actions and **what** the oxtest format looks like

---

#### [00-7: Decided Questions](./00-7-decided-questions.md) (19 KB)
**Purpose**: Finalized architectural decisions with implementation specifications

**Contents**:
- **Decision 1**: Pure Interpretation (not code generation)
  - Implementation approach
  - Component specifications
- **Decision 2**: Iterative Refinement (LLM strategy)
  - Discovery process
  - Conversation management
- **Decision 3**: Shared Context Object (state management)
  - Context structure
  - Variable management
- **Decision 4**: Sequential Execution
  - Orchestration flow
  - Error handling
- **Decision 5**: AI-Generated Selectors
  - Selector generation strategy
  - Fallback mechanisms

**Read this if**: You want to see the final decisions on open architectural questions

---

#### [00-8: TDD Strategy](./00-8-TDD-strategy.md) (18 KB)
**Purpose**: Test-Driven Development guidelines and best practices

**Contents**:
- **Red-Green-Refactor Cycle**
  - Write failing test
  - Implement minimal code
  - Refactor and improve
- **Layer-by-Layer Test Strategies**
  - Domain layer: Pure unit tests
  - Application layer: Unit + integration tests
  - Infrastructure layer: Integration tests with mocks
  - Presentation layer: E2E tests
- **Test Organization**
  - Directory structure
  - Naming conventions
  - Test doubles (mocks, stubs, spies)
- **Coverage Goals**
  - Domain: 95%+
  - Application: 90%+
  - Infrastructure: 85%+
  - Presentation: 80%+
  - Overall: 90%+
- **Best Practices**
  - AAA pattern (Arrange-Act-Assert)
  - Test naming conventions
  - Test independence
  - Fast test execution
- **Example Test Patterns**
  - Value object tests
  - Entity tests
  - Service tests
  - Integration tests

**Read this if**: You want to understand the TDD approach for implementation

---

#### [00-9: CI/CD Pipeline Plan](./00-9-CI-plan.md) (22 KB)
**Purpose**: Continuous Integration and Deployment strategy

**Contents**:
- **CI/CD Philosophy**
  - Fast feedback (< 10 min)
  - Fail fast principle
  - Automated quality gates
  - Immutable artifacts
- **Pipeline Stages**
  - Stage 1: Code Quality (2 min) - Lint, format, type check
  - Stage 2: Unit Tests (3 min) - All unit tests with coverage
  - Stage 3: Integration Tests (5 min) - Component integration
  - Stage 4: E2E Tests (15 min) - Full workflow tests
  - Stage 5: Build & Package (2 min) - npm package creation
  - Stage 6: Security Scan (3 min) - Vulnerability scanning
  - Stage 7: Release (5 min) - npm publish, GitHub release
- **GitHub Actions Workflows**
  - PR Check workflow (runs on all PRs)
  - Main branch CI workflow (runs on push to main)
  - Nightly tests workflow (comprehensive testing)
  - Release workflow (triggered by git tags)
- **Quality Gates**
  - Pre-merge requirements (90%+ coverage, all tests pass)
  - Pre-release requirements (E2E tests, security scan)
- **Deployment Strategy**
  - npm package deployment
  - Semantic versioning (semver)
  - Rollback strategy
- **Monitoring & Alerts**
  - Pipeline health metrics
  - Code quality tracking
  - Security monitoring
  - Slack notifications

**Read this if**: You want to understand the CI/CD pipeline and deployment process

---

### Reference Documentation

#### [Task-Splitting: Abstract Logic, Validation, and Implementation Guide](./Task-Splitting_%20Abstract%20Logic,%20Validation,%20and%20Implementation%20Guide.md) (97 KB)
**Purpose**: Comprehensive mathematical and algorithmic foundation

**Contents**:
- Predicate decomposition theory
- DAG-based task modeling
- Hierarchical decomposition logic
- Topological execution algorithm
- Validation logic and predicate evaluation
- Status propagation and error handling
- Python implementation examples
- PlantUML diagrams
- E2E testing scenario examples
- Business consulting scenario examples
- TDD implementation in JavaScript
- Project file structure

**Read this if**: You want deep technical understanding of the task-splitting algorithm and formal logic

**Note**: This is the original comprehensive document that informed the architecture series. It contains implementation details in Python that will be translated to TypeScript.

---

## Reading Paths

### For New Contributors
1. README.md - Get oriented
2. 00-1: Introduction and Core Challenge - Understand the problem
3. 00-5: Approach Comparison and Rationale - Understand the solution choice
4. 00-6: Iterative Execution and Oxtest - Understand how it works
5. 00-2: Layered Architecture - Understand the code structure

### For Implementers
1. 00-8: TDD Strategy - Test-driven development approach
2. 00-6: Iterative Execution and Oxtest - Core implementation model
3. 00-2: Layered Architecture - Component design
4. 00-3: Infrastructure and Execution - Implementation details
5. 00-7: Decided Questions - Finalized architectural decisions
6. 00-9: CI/CD Plan - Pipeline and deployment strategy
7. Task-Splitting Guide - Algorithmic foundation

### For Reviewers
1. 00-5: Approach Comparison - Why this approach
2. 00-6: Iterative Execution and Oxtest - How it works
3. 00-1: Introduction - Development principles
4. 00-4: Technical Decisions - Decision log
5. 00-2 & 00-3: Architecture - Implementation plan

### For Project Managers
1. README.md - Project overview
2. 00-4: Technical Decisions and Roadmap - Phases and timelines
3. 00-5: Approach Comparison - Technical justification
4. 00-6: Iterative Execution - Core innovation explanation

---

## Document Sizes

| File | Size | Tokens (est.) | Reading Time |
|------|------|---------------|--------------|
| README.md | 8.5 KB | ~2,700 | 8 min |
| 00-1-introduction-and-challenge.md | 9.2 KB | ~2,900 | 8 min |
| 00-2-layered-architecture.md | 12 KB | ~3,800 | 10 min |
| 00-3-infrastructure-and-execution.md | 16 KB | ~5,000 | 13 min |
| 00-4-technical-decisions-and-roadmap.md | 12 KB | ~3,800 | 10 min |
| 00-5-approach-comparison-and-rationale.md | 23 KB | ~7,200 | 20 min |
| 00-6-iterative-execution-and-oxtest.md | 21 KB | ~6,600 | 18 min |
| 00-7-decided-questions.md | 19 KB | ~6,000 | 16 min |
| 00-8-TDD-strategy.md | 18 KB | ~5,600 | 15 min |
| 00-9-CI-plan.md | 22 KB | ~6,900 | 19 min |
| Task-Splitting Guide (reference) | 97 KB | ~30,000 | 90 min |
| **Total (architecture series)** | **160.7 KB** | **~51,500** | **137 min** |

All documents are sized for comfortable reading (5-8K tokens each, except the comprehensive reference guide).

---

## Key Concepts Quick Reference

### Iterative Discovery
During compilation, LLM explores pages step-by-step:
1. Read current HTML/DOM state
2. Analyze what action is needed next
3. Generate oxtest command
4. Validate approach
5. Repeat until goal achieved

### Oxtest
Human-readable intermediate language:
- **Syntax**: `command selector param=value`
- **Example**: `click css=button.submit timeout=5000`
- **Benefits**: Readable, editable, version-control friendly
- **Commands**: 30+ commands (navigate, click, type, assert, etc.)
- **Selectors**: Multiple strategies with fallbacks

### Two-Phase Workflow
1. **Phase 1: Compilation** (AI-driven, run once)
   - YAML → LLM (iterative discovery) → `.ox.test` files
   - Outputs human-readable oxtest

2. **Phase 2: Execution** (deterministic, run many times)
   - `.ox.test` → Parser → Commands → Playwright
   - Fast, no LLM calls

### Five Architectural Layers
1. **Configuration**: YAML parsing, validation
2. **Domain**: Task models, validation predicates
3. **Application**: Orchestration, decomposition, validation
4. **Infrastructure**: Playwright, LLM APIs, oxtest parser
5. **Presentation**: CLI, reports

### Development Principles
- **TDD**: Tests first, red-green-refactor
- **SOLID**: Single responsibility, dependency inversion
- **Clean Code**: DRY, small functions, meaningful names
- **Type Safety**: Strict TypeScript, no `any`

---

## Contributing

When creating new documentation:
1. Keep files between 5-8K tokens (5-15 KB)
2. Follow the existing numbering scheme
3. Update this index
4. Update README.md if adding major sections
5. Include code examples with TypeScript types
6. Add reading time estimates

---

## Questions?

- **Architecture questions**: See 00-series documents
- **Implementation questions**: See Task-Splitting Guide
- **Usage questions**: See README.md
- **Decision rationale**: See 00-5: Approach Comparison

For issues or discussions, see the project repository.
