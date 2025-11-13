# e2e-tester-agent: Introduction and Core Challenge

**Version**: 1.0
**Date**: November 13, 2025
**Project**: AI-Driven E2E Test Automation with Playwright

## Introduction

**e2e-tester-agent** is an AI-driven automation framework that transforms natural language test specifications written in YAML into executable Playwright end-to-end tests. The system bridges the gap between human-readable test scenarios and browser automation code, enabling testers to write tests in natural language while maintaining the reliability and determinism of traditional automated testing.

## Development Principles

This project adheres to industry best practices for professional software development:

### Test-Driven Development (TDD)

- **Red-Green-Refactor cycle**: Write failing tests first, implement minimum code to pass, then refactor
- **Test-first mindset**: Every feature begins with a test specification
- **High coverage**: Target 90%+ code coverage with meaningful tests
- **Fast feedback**: Unit tests run in milliseconds, integration tests in seconds

### SOLID Principles

- **Single Responsibility**: Each class/module has one reason to change
- **Open/Closed**: Open for extension, closed for modification
- **Liskov Substitution**: Derived classes must be substitutable for base classes
- **Interface Segregation**: Many specific interfaces over one general-purpose interface
- **Dependency Inversion**: Depend on abstractions, not concretions

### Clean Code Practices

- **Meaningful names**: Variables, functions, and classes have clear, descriptive names
- **Small functions**: Functions do one thing well (typically < 20 lines)
- **No side effects**: Functions are predictable and testable
- **DRY (Don't Repeat Yourself)**: Eliminate duplication through abstraction
- **Comments when needed**: Code should be self-documenting; comments explain "why" not "what"
- **Error handling**: Explicit error handling with meaningful messages

### Strict Type Coding

- **TypeScript throughout**: Leverage TypeScript's type system for safety
- **No `any` types**: Use proper typing or `unknown` with type guards
- **Interfaces over types**: Define contracts explicitly
- **Strict compiler settings**: Enable all strict checks in tsconfig.json
- **Type inference**: Let TypeScript infer when obvious, be explicit when complex
- **Generic constraints**: Use generics with proper constraints

### Clean Architecture

- **Layered design**: Domain → Application → Infrastructure → Presentation
- **Dependency rules**: Inner layers never depend on outer layers
- **Testability**: Business logic isolated from frameworks and external dependencies
- **Boundaries**: Clear interfaces between layers

## Core Challenge

The fundamental challenge is converting declarative, prompt-based YAML specifications into executable, deterministic browser automation code.

### Input: Natural Language YAML

```yaml
payment-watch:
  environment: dev
  url: https://oxideshop.dev
  timeout: 20
  jobs:
    - name: login
      prompt: Login to shop with username=${TEST_USERNAME} password=${TEST_PASSWORD}
      acceptance:
        - you are on the home page and see no errors
      on_error:
        try: username=${TEST_USERNAME2} password=${TEST_PASSWORD2}
        catch: failed test

    - name: Shopping
      prompt: Add 2 products to cart
      acceptance: you see a popup and number 2 in the icon near the mini-cart

    - name: Add product to cart
      prompt: Add 5000 items of a random product to cart
      acceptance:
        - you see a popup and number 5002 in the icon near the mini-cart
      on_error:
        try: log error
        catch: continue
```

### Output: Executable Playwright Actions

The system must:

1. **Interpret Intent**: Understand what "Login to shop" means in the context of a web application
2. **Locate Elements**: Find username field, password field, submit button without explicit selectors
3. **Perform Actions**: Enter credentials, click login, navigate pages
4. **Validate State**: Check homepage is displayed, no error messages present
5. **Handle Errors**: Try alternative credentials, log errors, continue or fail appropriately

### The Translation Problem

**Challenge**: Natural language is ambiguous, context-dependent, and implicit

**Examples**:
- "Add 2 products to cart" → Which products? How to find "Add to Cart" button? Where is the cart counter?
- "you see a popup" → How long to wait? What if popup doesn't appear? What constitutes a "popup"?
- "Select payment method Google Pay" → Where is payment selection? What if Google Pay unavailable?

**Required Capabilities**:
- **Semantic understanding**: Parse natural language instructions
- **DOM reasoning**: Find elements based on purpose, not explicit selectors
- **State tracking**: Maintain context across multiple steps
- **Error recovery**: Handle unexpected conditions gracefully
- **Validation**: Verify expected outcomes without explicit assertions

## The Two-Approach Question

### Option 1: Direct Code Generation

**Approach**: YAML → LLM → Complete Playwright Test File

```typescript
// Generated by AI
test('payment-watch', async ({ page }) => {
  // AI generates entire test code in one pass
  await page.goto('https://oxideshop.dev');
  await page.locator('input[name="username"]').fill(process.env.TEST_USERNAME);
  await page.locator('input[name="password"]').fill(process.env.TEST_PASSWORD);
  await page.click('button[type="submit"]');
  // ... etc
});
```

**Pros**:
- Simple pipeline (one transformation step)
- Full Playwright expressiveness available
- Standard debugging tools work
- No runtime interpretation overhead

**Cons**:
- Non-deterministic: Same YAML may generate different code
- Hard to maintain consistency across tests
- Difficult to debug AI-generated code
- Poor error recovery (regenerate entire file?)
- Version control shows large diffs
- Testing the generator is complex

### Option 2: Two-Layer Interpretation (Recommended)

**Approach**: YAML → LLM (Iterative Discovery) → Oxtest → Playwright Executor

**Phase 1: Compilation (with Iterative Discovery)**
```
LLM Process:
1. Read current page HTML
2. Analyze: "What action is needed next?"
3. Generate oxtest command
4. Simulate/validate command
5. Update state understanding
6. Repeat until job complete

Output: Human-readable oxtest file
```

**Example Oxtest** (`_generated/login-test.ox.test`):
```qc
# Login to shop - Generated from YAML
navigate url=https://oxideshop.dev
type css=input[name="username"] value=${TEST_USERNAME}
type css=input[type="password"] value=${TEST_PASSWORD}
click text="Login" fallback=css=button[type="submit"]
wait_navigation timeout=5000
assert_url pattern=.*/home
assert_not_exists css=.error
```

**Phase 2: Execution (Mechanical)**
```typescript
// Parser converts oxtest to command objects
const commands = parser.parse('login-test.ox.test');

// Executor runs commands deterministically
await executor.execute(commands);
```

**Pros**:
- **Separation of concerns**: AI does interpretation, Playwright does execution
- **Deterministic execution**: Same commands = same behavior
- **Easier debugging**: Inspect intermediate representation
- **Better error handling**: Retry at command level, not entire test
- **Testable**: Test AI decomposition and executor separately
- **Maintainable**: Changes to execution logic don't require AI regeneration

**Cons**:
- More complex architecture
- Requires intermediate representation design
- Potential loss of Playwright expressiveness (mitigated by rich command set)
- Two-phase transformation overhead

## Recommended Approach: Two-Layer Architecture

Based on the principles of clean architecture, separation of concerns, and testability, **we recommend the two-layer interpretation approach**.

### Rationale

1. **SOLID Principles**: Separates AI interpretation (one responsibility) from browser automation (another responsibility)

2. **Testability**: Can unit test the decomposition engine and executor independently

3. **Type Safety**: Intermediate representation is fully typed, catch errors at compile time

4. **Maintainability**: Changes to execution logic don't require re-training or changing prompts

5. **Debugging**: Clear boundary between "what to do" (AI) and "how to do it" (executor)

6. **Error Recovery**: Can retry individual commands without regenerating entire test

## Next Steps

The following documents detail:
- **00-2**: Layered architecture design
- **00-3**: Data flow and key components
- **00-4**: Technical decisions and future roadmap

Each component will be developed using TDD, following SOLID principles, with strict TypeScript typing throughout.
