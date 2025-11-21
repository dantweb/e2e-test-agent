# Development Plan - TDD First, Dockerized Testing

**Date**: 2025-11-21
**Approach**: Test-Driven Development with Docker Isolation

---

## Objectives

1. **Implement the actual iterative architecture** from PUML diagrams
2. **Use TDD** to ensure correctness at each step
3. **Docker isolation** to avoid interference with Claude Code app
4. **Incremental delivery** - test and verify each component before moving on

---

## Critical Understanding

Based on root cause analysis, we need to implement:

```
Multi-Pass Iterative Decomposition
├── Pass 1: Planning (LLM creates step list)
├── Pass 2: Command Generation (per step)
│   ├── Generate initial command (LLM)
│   ├── Validate command (local HTML check)
│   ├── Refine if needed (LLM) - up to 3 attempts
│   └── Add validated command
└── Pass 3: Completeness Check (LLM verifies all criteria met)
```

**NOT**: Single LLM call that tries to generate all commands at once.

---

## Phase 0: Setup and Infrastructure (2 hours)

### Task 0.1: Docker Test Environment

**Goal**: Isolated test environment that doesn't interfere with Claude Code

**Deliverable**: `docker-compose.yml` + test runner script

```yaml
# docker-compose.yml
version: '3.8'
services:
  test-runner:
    build:
      context: .
      dockerfile: Dockerfile.test
    environment:
      - OPENAI_API_KEY=${OPENAI_API_KEY}
      - OPENAI_MODEL=${OPENAI_MODEL:-gpt-4}
    volumes:
      - ./tests:/app/tests
      - ./src:/app/src
      - ./_generated:/app/_generated
    command: npm run test:integration
```

**Dockerfile.test**:
```dockerfile
FROM mcr.microsoft.com/playwright:v1.40.0-focal

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

# Don't run tests at build time - run via command
CMD ["npm", "test"]
```

**Test script**: `bin/test-docker.sh`
```bash
#!/bin/bash
# Run tests in Docker isolation
docker-compose up --build --abort-on-container-exit test-runner
```

**Acceptance**:
- [ ] Docker container builds successfully
- [ ] Can run existing tests in container
- [ ] Tests don't affect host system
- [ ] Output visible in real-time

---

### Task 0.2: Test Fixtures and Mocks

**Goal**: Mock LLM and HTML responses for fast, deterministic tests

**Files to create**:
- `tests/fixtures/html/login-page.html` - Sample HTML
- `tests/fixtures/llm/planning-response.json` - Mock LLM plan
- `tests/fixtures/llm/command-response.json` - Mock command generation
- `tests/mocks/MockLLMProvider.ts` - Scriptable LLM mock
- `tests/mocks/MockHTMLExtractor.ts` - Scriptable HTML mock

**MockLLMProvider.ts**:
```typescript
export class MockLLMProvider implements ILLMProvider {
  private responses: Map<string, string> = new Map()

  setResponse(promptContains: string, response: string) {
    this.responses.set(promptContains, response)
  }

  async generate(prompt: string, options: any): Promise<LLMResponse> {
    for (const [key, response] of this.responses) {
      if (prompt.includes(key)) {
        return { content: response, model: 'mock', usage: {} }
      }
    }
    throw new Error('No mock response configured for prompt: ' + prompt.substring(0, 100))
  }
}
```

**Acceptance**:
- [ ] Mock LLM can return scripted responses
- [ ] Mock HTML can return test fixtures
- [ ] Tests run without real API calls
- [ ] Fast test execution (< 1 second per test)

---

## Phase 1: Planning Pass Implementation (3 hours)

### Task 1.1: Write Tests for Planning

**File**: `tests/unit/IterativeDecompositionEngine.planning.test.ts`

**Test cases**:
```typescript
describe('IterativeDecompositionEngine - Planning Pass', () => {
  it('should create plan with multiple steps for login instruction', async () => {
    // Arrange
    const mockLLM = new MockLLMProvider()
    mockLLM.setResponse('Break this into steps',
      '1. Click login button\n2. Fill email\n3. Fill password\n4. Click submit')

    const engine = new IterativeDecompositionEngine(mockLLM, mockHTML, parser, 'gpt-4', false)

    // Act
    const plan = await engine.createPlan('Login with email@test.com and password secret')

    // Assert
    expect(plan).toHaveLength(4)
    expect(plan[0]).toContain('Click login button')
    expect(plan[1]).toContain('Fill email')
  })

  it('should handle single-step instructions', async () => {
    const mockLLM = new MockLLMProvider()
    mockLLM.setResponse('Break this into steps', '1. Navigate to homepage')

    const engine = new IterativeDecompositionEngine(mockLLM, mockHTML, parser, 'gpt-4', false)
    const plan = await engine.createPlan('Go to homepage')

    expect(plan).toHaveLength(1)
  })

  it('should call LLM with instruction and HTML context', async () => {
    const mockLLM = new MockLLMProvider()
    let capturedPrompt = ''
    mockLLM.generate = async (prompt: string) => {
      capturedPrompt = prompt
      return { content: '1. Step', model: 'mock', usage: {} }
    }

    const mockHTML = new MockHTMLExtractor()
    mockHTML.setHTML('<form><input name="email"></form>')

    const engine = new IterativeDecompositionEngine(mockLLM, mockHTML, parser, 'gpt-4', false)
    await engine.createPlan('Login')

    expect(capturedPrompt).toContain('Login')
    expect(capturedPrompt).toContain('<form>')
  })
})
```

**Acceptance**:
- [ ] All tests fail (red) - method doesn't exist yet
- [ ] Tests are clear and specific
- [ ] Cover edge cases (single step, multiple steps, HTML context)

---

### Task 1.2: Implement Planning Pass

**File**: `src/application/engines/IterativeDecompositionEngine.ts`

**Implementation**:
```typescript
/**
 * PASS 1: Create a plan of atomic steps
 *
 * Takes a high-level instruction and breaks it into discrete steps.
 * Uses LLM to analyze the instruction and current page context.
 *
 * @param instruction High-level user instruction
 * @returns Array of atomic step descriptions
 */
private async createPlan(instruction: string): Promise<string[]> {
  // Extract current page HTML for context
  const html = await this.htmlExtractor.extractSimplified()

  if (this.verbose) {
    console.log(`   📋 Creating execution plan...`)
  }

  // Build planning prompt
  const systemPrompt = this.promptBuilder.buildPlanningSystemPrompt()
  const userPrompt = this.promptBuilder.buildPlanningPrompt(instruction, html)

  // Call LLM for planning
  const response = await this.llmProvider.generate(userPrompt, {
    systemPrompt,
    model: this.model,
  })

  // Parse steps from response
  const steps = this.parsePlanSteps(response.content)

  if (this.verbose) {
    console.log(`   ✓ Plan created with ${steps.length} step(s)`)
    steps.forEach((step, idx) => {
      console.log(`      ${idx + 1}. ${step}`)
    })
  }

  return steps
}

/**
 * Parse step list from LLM response
 * Handles various formats: numbered lists, bullet points, etc.
 */
private parsePlanSteps(response: string): string[] {
  const lines = response.split('\n')
  const steps: string[] = []

  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed) continue

    // Match numbered list: "1. Step description"
    const numberedMatch = trimmed.match(/^\d+\.\s*(.+)$/)
    if (numberedMatch) {
      steps.push(numberedMatch[1])
      continue
    }

    // Match bullet point: "- Step description"
    const bulletMatch = trimmed.match(/^[-*]\s*(.+)$/)
    if (bulletMatch) {
      steps.push(bulletMatch[1])
      continue
    }

    // If it's a substantial line (not a header), treat as step
    if (trimmed.length > 10 && !trimmed.match(/^(Step|Plan|Action)/i)) {
      steps.push(trimmed)
    }
  }

  // Fallback: if no steps parsed, use full response as single step
  if (steps.length === 0) {
    steps.push(response.trim())
  }

  return steps
}
```

**Acceptance**:
- [ ] All planning tests pass (green)
- [ ] Method extracts HTML
- [ ] Method calls LLM with correct prompts
- [ ] Returns array of steps
- [ ] Logs visible in verbose mode

---

### Task 1.3: Add Planning Prompts

**File**: `src/infrastructure/llm/OxtestPromptBuilder.ts`

**Add methods**:
```typescript
buildPlanningSystemPrompt(): string {
  return `You are an expert at breaking down user interactions into atomic steps.

Your task: Analyze a user instruction and decompose it into a sequential list of atomic actions.

Rules:
1. Each step should be a SINGLE, discrete action
2. Steps should be in logical execution order
3. Be specific - mention what element to interact with
4. Include validation steps if mentioned in acceptance criteria
5. Output ONLY the numbered list of steps, nothing else

Examples:

Instruction: "Login with username admin and password secret"
Steps:
1. Click the login button to open the form
2. Fill the username field with "admin"
3. Fill the password field with "secret"
4. Click the submit button
5. Verify the user is logged in (check for logout button or username display)

Instruction: "Add two products to cart"
Steps:
1. Click the first product link
2. Click the "Add to Cart" button
3. Navigate back to product list
4. Click the second product link
5. Click the "Add to Cart" button
6. Verify cart count shows 2 items`
}

buildPlanningPrompt(instruction: string, html: string): string {
  // Simplify HTML to reduce tokens (keep only interactive elements)
  const simplifiedHTML = this.simplifyHTMLForPlanning(html)

  return `Instruction: "${instruction}"

Current page context (simplified HTML showing main interactive elements):
${simplifiedHTML}

Decompose this instruction into atomic steps. Output ONLY a numbered list.`
}

private simplifyHTMLForPlanning(html: string): string {
  // Extract only interactive elements to reduce token count
  const interactiveSelector = 'button, a, input, textarea, select, [role="button"], [onclick]'

  // Simple regex-based extraction (can be improved with proper parsing)
  const lines = html.split('\n')
  const relevantLines = lines.filter(line => {
    return line.match(/<(button|a|input|textarea|select|form)/i)
  })

  const simplified = relevantLines.slice(0, 50).join('\n') // Limit to 50 lines

  if (simplified.length > 3000) {
    return simplified.substring(0, 3000) + '\n... (truncated)'
  }

  return simplified
}
```

**Acceptance**:
- [ ] Planning prompts are clear and specific
- [ ] Include examples in system prompt
- [ ] HTML is simplified to reduce tokens
- [ ] Tests still pass

---

## Phase 2: Step-by-Step Command Generation (3 hours)

### Task 2.1: Write Tests for Command Generation

**File**: `tests/unit/IterativeDecompositionEngine.generation.test.ts`

```typescript
describe('IterativeDecompositionEngine - Command Generation', () => {
  it('should generate one command per step', async () => {
    const mockLLM = new MockLLMProvider()

    // Planning response
    mockLLM.setResponse('Decompose',
      '1. Click login\n2. Fill email')

    // Command generation responses
    mockLLM.setResponse('Generate command for: Click login',
      'click css=button.login-btn')

    mockLLM.setResponse('Generate command for: Fill email',
      'fill css=input[name="email"] value=test@example.com')

    const engine = new IterativeDecompositionEngine(mockLLM, mockHTML, parser, 'gpt-4', false)
    const result = await engine.decompose('Login with test@example.com')

    expect(result.commands).toHaveLength(2)
    expect(result.commands[0].type).toBe('click')
    expect(result.commands[1].type).toBe('fill')
  })

  it('should pass HTML context to each command generation', async () => {
    const mockLLM = new MockLLMProvider()
    const mockHTML = new MockHTMLExtractor()

    let capturedPrompts: string[] = []
    mockLLM.generate = async (prompt: string) => {
      capturedPrompts.push(prompt)
      if (prompt.includes('Decompose')) return { content: '1. Click', model: 'mock', usage: {} }
      return { content: 'click css=button', model: 'mock', usage: {} }
    }

    mockHTML.setHTML('<button class="login">Login</button>')

    const engine = new IterativeDecompositionEngine(mockLLM, mockHTML, parser, 'gpt-4', false)
    await engine.decompose('Click login')

    // Should have 2 prompts: planning + command generation
    expect(capturedPrompts).toHaveLength(2)
    expect(capturedPrompts[1]).toContain('<button')
  })

  it('should handle step with parameters extracted from instruction', async () => {
    const mockLLM = new MockLLMProvider()
    mockLLM.setResponse('Decompose', '1. Fill username with "admin"')
    mockLLM.setResponse('Generate command',
      'fill css=input[name="username"] value=admin')

    const engine = new IterativeDecompositionEngine(mockLLM, mockHTML, parser, 'gpt-4', false)
    const result = await engine.decompose('Enter admin as username')

    expect(result.commands[0].type).toBe('fill')
    expect(result.commands[0].params?.value).toBe('admin')
  })
})
```

**Acceptance**:
- [ ] Tests fail (red) - decompose() still uses old single-shot approach
- [ ] Tests specify expected behavior clearly
- [ ] Cover multiple steps, HTML context, parameters

---

### Task 2.2: Refactor decompose() to Use Planning

**File**: `src/application/engines/IterativeDecompositionEngine.ts`

```typescript
/**
 * Decomposes an instruction using multi-pass iterative process:
 * 1. Create plan (break into steps)
 * 2. Generate command for each step
 * 3. Validate and refine commands
 * 4. Check completeness
 *
 * @param instruction Natural language instruction
 * @returns Subtask with generated commands
 */
public async decompose(instruction: string): Promise<Subtask> {
  if (this.verbose) {
    console.log(`\n   🔍 Decomposing: "${instruction}"`)
  }

  try {
    // PASS 1: Create execution plan
    const steps = await this.createPlan(instruction)

    if (steps.length === 0) {
      throw new Error('Planning failed: No steps generated')
    }

    // PASS 2: Generate commands for each step
    const commands: OxtestCommand[] = []

    for (let i = 0; i < steps.length; i++) {
      const step = steps[i]

      if (this.verbose) {
        console.log(`\n   🔨 Generating command for step ${i + 1}/${steps.length}: "${step}"`)
      }

      const command = await this.generateCommandForStep(step, instruction)
      commands.push(command)
    }

    if (this.verbose) {
      console.log(`\n   ✅ Generated ${commands.length} command(s)`)
    }

    return new Subtask(`subtask-${Date.now()}`, instruction, commands)

  } catch (error) {
    console.error(`   ❌ Decomposition failed: ${(error as Error).message}`)
    throw error
  }
}

/**
 * Generate a single command for a step
 *
 * @param step Step description from plan
 * @param originalInstruction Original full instruction for context
 * @returns OXTest command
 */
private async generateCommandForStep(
  step: string,
  originalInstruction: string
): Promise<OxtestCommand> {
  // Extract current HTML context
  const html = await this.htmlExtractor.extractSimplified()

  // Build command generation prompt
  const systemPrompt = this.promptBuilder.buildCommandSystemPrompt()
  const userPrompt = this.promptBuilder.buildCommandPrompt(step, originalInstruction, html)

  if (this.verbose) {
    console.log(`      📊 HTML context: ${html.length} characters`)
  }

  // Call LLM to generate command
  const response = await this.llmProvider.generate(userPrompt, {
    systemPrompt,
    model: this.model,
  })

  if (this.verbose) {
    console.log(`      🤖 LLM response: ${response.content.substring(0, 100)}...`)
  }

  // Parse the generated command
  const commands = this.oxtestParser.parseContent(response.content)

  if (commands.length === 0) {
    throw new Error(`Failed to generate command for step: ${step}`)
  }

  // Take first command (should be single command per step)
  const command = commands[0]

  if (this.verbose) {
    console.log(`      ✓ Generated: ${command.type} ${command.selector?.value || ''}`)
  }

  return command
}
```

**Acceptance**:
- [ ] Tests pass (green)
- [ ] decompose() calls createPlan()
- [ ] Iterates through each step
- [ ] Calls generateCommandForStep() for each
- [ ] Returns commands for all steps
- [ ] Logs show multi-step process

---

### Task 2.3: Add Command Generation Prompts

**File**: `src/infrastructure/llm/OxtestPromptBuilder.ts`

```typescript
buildCommandSystemPrompt(): string {
  return `You are an expert at generating precise web automation commands.

Your task: Generate a SINGLE OXTest command for a specific step.

OXTest syntax:
- click <selector>
- fill <selector> value=<text>
- select <selector> value=<option>
- navigate url=<url>
- wait timeout=<ms>
- assertText <selector> text=<expected>
- assertVisible <selector>
- assertUrl pattern=<regex>

Selector formats:
- css=.classname
- css=#id
- text="exact text"
- xpath=//path
- role=button (ARIA role)

Rules:
1. Generate EXACTLY ONE command per response
2. Choose the MOST SPECIFIC selector possible from the HTML
3. Include fallback selector if primary could be fragile
4. For fill commands, include value= parameter
5. Output ONLY the command, no explanation

Examples:

HTML: <button class="login-btn" id="submitBtn">Login</button>
Step: Click the login button
Command: click css=#submitBtn fallback=css=.login-btn

HTML: <input type="text" name="email" placeholder="Email">
Step: Fill email with "test@example.com"
Command: fill css=input[name="email"] value=test@example.com

HTML: <a href="/products">View Products</a>
Step: Navigate to products page
Command: click text="View Products" fallback=css=a[href="/products"]`
}

buildCommandPrompt(step: string, originalInstruction: string, html: string): string {
  return `Original instruction: "${originalInstruction}"
Current step: "${step}"

Current page HTML (simplified):
${html.substring(0, 2000)}${html.length > 2000 ? '\n... (truncated)' : ''}

Generate EXACTLY ONE OXTest command for the current step. Output only the command.`
}
```

**Acceptance**:
- [ ] Command prompts are focused on single command
- [ ] Include OXTest syntax reference
- [ ] Include selector best practices
- [ ] Provide examples

---

## Phase 3: Validation and Refinement Loop (2 hours)

### Task 3.1: Write Tests for Validation

**File**: `tests/unit/IterativeDecompositionEngine.validation.test.ts`

```typescript
describe('IterativeDecompositionEngine - Validation & Refinement', () => {
  it('should validate command against HTML', () => {
    const mockHTML = new MockHTMLExtractor()
    mockHTML.setHTML('<button id="submit">Submit</button>')

    const engine = new IterativeDecompositionEngine(mockLLM, mockHTML, parser, 'gpt-4', false)

    const command = new OxtestCommand('click', {}, { strategy: 'css', value: '#submit' })
    const validation = engine.validateCommand(command, mockHTML.getLastHTML())

    expect(validation.valid).toBe(true)
  })

  it('should detect ambiguous selector', () => {
    const mockHTML = new MockHTMLExtractor()
    mockHTML.setHTML(`
      <button class="btn">Button 1</button>
      <button class="btn">Button 2</button>
      <button class="btn">Button 3</button>
    `)

    const engine = new IterativeDecompositionEngine(mockLLM, mockHTML, parser, 'gpt-4', false)

    const command = new OxtestCommand('click', {}, { strategy: 'css', value: '.btn' })
    const validation = engine.validateCommand(command, mockHTML.getLastHTML())

    expect(validation.valid).toBe(false)
    expect(validation.issues).toContain('ambiguous')
    expect(validation.matchCount).toBe(3)
  })

  it('should refine command when validation fails', async () => {
    const mockLLM = new MockLLMProvider()
    const mockHTML = new MockHTMLExtractor()

    mockHTML.setHTML('<button id="btn1">One</button><button id="btn2">Two</button>')

    // Initial planning
    mockLLM.setResponse('Decompose', '1. Click button')

    // Initial command generation
    mockLLM.setResponse('Generate command', 'click css=button')

    // Refinement (when ambiguous detected)
    mockLLM.setResponse('Refine command',
      'click css=#btn1 fallback=text="One"')

    const engine = new IterativeDecompositionEngine(mockLLM, mockHTML, parser, 'gpt-4', false)
    const result = await engine.decompose('Click first button')

    // Should have refined selector
    expect(result.commands[0].selector?.value).toContain('btn1')
  })

  it('should attempt refinement up to 3 times', async () => {
    const mockLLM = new MockLLMProvider()
    let callCount = 0

    mockLLM.generate = async (prompt: string) => {
      callCount++
      if (prompt.includes('Decompose')) {
        return { content: '1. Click', model: 'mock', usage: {} }
      }
      // Always return ambiguous selector to force refinement
      return { content: 'click css=button', model: 'mock', usage: {} }
    }

    const mockHTML = new MockHTMLExtractor()
    mockHTML.setHTML('<button>A</button><button>B</button>')

    const engine = new IterativeDecompositionEngine(mockLLM, mockHTML, parser, 'gpt-4', false)

    try {
      await engine.decompose('Click button')
    } catch (error) {
      // Expected to fail after 3 attempts
    }

    // Should be: 1 planning + 1 initial + 3 refinements = 5 calls
    expect(callCount).toBeLessThanOrEqual(5)
  })
})
```

**Acceptance**:
- [ ] Tests fail (validation logic doesn't exist)
- [ ] Tests cover validation logic
- [ ] Tests cover refinement loop
- [ ] Tests cover max attempts

---

### Task 3.2: Implement Validation Logic

**File**: `src/application/engines/IterativeDecompositionEngine.ts`

```typescript
/**
 * Validation result for a command
 */
interface ValidationResult {
  valid: boolean
  issues: string[]
  matchCount?: number
}

/**
 * Validate a command against HTML context
 * Checks if selector is specific enough and element exists
 *
 * @param command Command to validate
 * @param html HTML context
 * @returns Validation result with issues if any
 */
private validateCommand(command: OxtestCommand, html: string): ValidationResult {
  // For non-selector commands (navigate, wait), always valid
  if (!command.selector) {
    return { valid: true, issues: [] }
  }

  const selector = command.selector
  const issues: string[] = []

  // Check for overly generic selectors
  const genericPatterns = [
    /^button$/i,
    /^input$/i,
    /^div$/i,
    /^span$/i,
    /^a$/i,
  ]

  if (selector.strategy === 'css') {
    for (const pattern of genericPatterns) {
      if (pattern.test(selector.value)) {
        issues.push(`Selector "${selector.value}" is too generic - will match multiple elements`)
      }
    }
  }

  // Count potential matches (simplified - regex-based)
  const matchCount = this.countSelectorMatches(selector, html)

  if (matchCount > 1) {
    issues.push(`Selector matches ${matchCount} elements - should match exactly 1`)
  } else if (matchCount === 0) {
    issues.push(`Selector does not match any elements in current page`)
  }

  return {
    valid: issues.length === 0,
    issues,
    matchCount,
  }
}

/**
 * Count how many times a selector would match in HTML
 * Simplified implementation using regex
 */
private countSelectorMatches(selector: any, html: string): number {
  if (selector.strategy === 'css') {
    // Extract tag name and attributes
    if (selector.value.startsWith('#')) {
      // ID selector - should be unique
      const id = selector.value.substring(1)
      const matches = html.match(new RegExp(`id=["']${id}["']`, 'gi'))
      return matches ? matches.length : 0
    }

    if (selector.value.startsWith('.')) {
      // Class selector
      const className = selector.value.substring(1)
      const matches = html.match(new RegExp(`class=["'][^"']*${className}[^"']*["']`, 'gi'))
      return matches ? matches.length : 0
    }

    // Tag selector
    const tag = selector.value.match(/^([a-z]+)/i)?.[1]
    if (tag) {
      const matches = html.match(new RegExp(`<${tag}[\\s>]`, 'gi'))
      return matches ? matches.length : 0
    }
  }

  if (selector.strategy === 'text') {
    const text = selector.value
    const matches = html.match(new RegExp(`>${text}<`, 'g'))
    return matches ? matches.length : 0
  }

  // Default: assume 1 match (can't validate complex selectors without browser)
  return 1
}
```

**Acceptance**:
- [ ] Validation logic exists
- [ ] Detects generic selectors
- [ ] Counts matches (simplified)
- [ ] Returns issues array

---

### Task 3.3: Implement Refinement Loop

**File**: `src/application/engines/IterativeDecompositionEngine.ts`

```typescript
/**
 * Generate command with validation and refinement
 * Tries up to 3 times to get a valid command
 */
private async generateCommandForStep(
  step: string,
  originalInstruction: string
): Promise<OxtestCommand> {
  const html = await this.htmlExtractor.extractSimplified()

  let command: OxtestCommand | null = null
  const maxAttempts = 3

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    if (this.verbose && attempt > 1) {
      console.log(`      🔄 Refinement attempt ${attempt}/${maxAttempts}`)
    }

    // Generate or refine command
    if (attempt === 1) {
      // Initial generation
      command = await this.generateInitialCommand(step, originalInstruction, html)
    } else {
      // Refinement
      const validation = this.validateCommand(command!, html)
      command = await this.refineCommand(command!, validation.issues, step, html)
    }

    // Validate the command
    const validation = this.validateCommand(command, html)

    if (validation.valid) {
      if (this.verbose) {
        console.log(`      ✓ Command validated successfully`)
      }
      return command
    }

    if (this.verbose) {
      console.log(`      ⚠️  Validation issues: ${validation.issues.join(', ')}`)
    }
  }

  // Failed after max attempts - return best effort
  if (this.verbose) {
    console.log(`      ⚠️  Could not generate valid command after ${maxAttempts} attempts`)
  }

  return command!
}

/**
 * Generate initial command for a step
 */
private async generateInitialCommand(
  step: string,
  originalInstruction: string,
  html: string
): Promise<OxtestCommand> {
  const systemPrompt = this.promptBuilder.buildCommandSystemPrompt()
  const userPrompt = this.promptBuilder.buildCommandPrompt(step, originalInstruction, html)

  const response = await this.llmProvider.generate(userPrompt, {
    systemPrompt,
    model: this.model,
  })

  const commands = this.oxtestParser.parseContent(response.content)

  if (commands.length === 0) {
    throw new Error(`Failed to generate command for step: ${step}`)
  }

  return commands[0]
}

/**
 * Refine a command based on validation issues
 */
private async refineCommand(
  command: OxtestCommand,
  issues: string[],
  step: string,
  html: string
): Promise<OxtestCommand> {
  const systemPrompt = this.promptBuilder.buildRefinementSystemPrompt()
  const userPrompt = this.promptBuilder.buildRefinementPrompt(command, issues, step, html)

  const response = await this.llmProvider.generate(userPrompt, {
    systemPrompt,
    model: this.model,
  })

  const commands = this.oxtestParser.parseContent(response.content)

  if (commands.length === 0) {
    // If refinement fails, return original
    return command
  }

  return commands[0]
}
```

**Acceptance**:
- [ ] All validation tests pass
- [ ] Refinement loop works
- [ ] Max 3 attempts enforced
- [ ] Logs show refinement process

---

## Phase 4: Integration and Testing (2 hours)

### Task 4.1: Integration Test with Real LLM

**File**: `tests/integration/e2e-generation.test.ts`

```typescript
describe('E2E Test Generation - Integration', () => {
  it('should generate login test with multiple commands', async () => {
    const llmProvider = new OpenAILLMProvider()
    const browser = await chromium.launch({ headless: true })
    const page = await browser.newPage()

    await page.goto('https://osc2.oxid.shop')

    const htmlExtractor = new HTMLExtractor(page)
    const parser = new OxtestParser()
    const engine = new IterativeDecompositionEngine(
      llmProvider,
      htmlExtractor,
      parser,
      'gpt-4',
      true // verbose
    )

    const result = await engine.decompose(
      'Login to the shop with credentials redrobot@dantweb.dev and password useruser'
    )

    await browser.close()

    // Assertions
    expect(result.commands.length).toBeGreaterThanOrEqual(3)

    // Should have multiple command types
    const types = result.commands.map(c => c.type)
    expect(types).toContain('click')  // Click login
    expect(types).toContain('fill')   // Fill email/password

    // Commands should have selectors
    result.commands.forEach(cmd => {
      if (cmd.type !== 'navigate' && cmd.type !== 'wait') {
        expect(cmd.selector).toBeDefined()
        expect(cmd.selector?.value).not.toBe('button') // Not generic
      }
    })
  }, 30000) // 30s timeout for LLM calls

  it('should generate add products test with iterative steps', async () => {
    // Similar test for add products scenario
  }, 30000)
})
```

**Acceptance**:
- [ ] Integration test runs against real LLM
- [ ] Generates multiple commands (not 1)
- [ ] Commands are specific (not generic)
- [ ] Test passes consistently

---

### Task 4.2: Docker Test Execution

**Script**: `bin/test-docker.sh`

```bash
#!/bin/bash
set -e

echo "🐳 Running tests in Docker..."

# Build and run tests
docker-compose up --build --abort-on-container-exit test-runner

# Get exit code
EXIT_CODE=$(docker-compose ps -q test-runner | xargs docker inspect -f '{{.State.ExitCode}}')

echo ""
if [ "$EXIT_CODE" = "0" ]; then
  echo "✅ All tests passed!"
else
  echo "❌ Tests failed with exit code $EXIT_CODE"
fi

# Cleanup
docker-compose down

exit $EXIT_CODE
```

**Acceptance**:
- [ ] Tests run in Docker
- [ ] Exit code propagated correctly
- [ ] No interference with host
- [ ] Clean up after run

---

### Task 4.3: End-to-End Validation

**Test**: Run full CLI in Docker with real YAML

```bash
# In Docker container
./bin/run.sh tests/realworld/paypal.yaml --verbose
```

**Expected output**:
```
🎯 Processing test: paypal-payment-test
   URL: https://osc2.oxid.shop
   Jobs: 8
   🧠 Generating OXTest format (HTML-aware)...
   🌐 Launching headless browser...
   🔗 Navigating to https://osc2.oxid.shop...

   📋 Processing job 1/8: "user-login"

   🔍 Decomposing: "Login to the shop with credentials..."

   📋 Creating execution plan...
   ✓ Plan created with 4 step(s)
      1. Click login button
      2. Fill email field with redrobot@dantweb.dev
      3. Fill password field with useruser
      4. Click submit button

   🔨 Generating command for step 1/4: "Click login button"
      📊 HTML context: 23456 characters
      🤖 LLM response: click css=button.showLogin...
      ✓ Generated: click button.showLogin
      ✓ Command validated successfully

   🔨 Generating command for step 2/4: "Fill email field..."
      📊 HTML context: 25678 characters
      🤖 LLM response: fill css=input[name="loginEmail"]...
      ✓ Generated: fill input[name="loginEmail"]
      ✓ Command validated successfully

   ... (continues for all steps)

   ✅ Generated 4 command(s)

   📋 Processing job 2/8: "add-products-to-cart"
   ... (shows 6-8 commands generated)

   📄 Created: paypal-payment-test.ox.test
```

**Acceptance Criteria**:
- [ ] Each job generates multiple commands (3-8)
- [ ] Logs show planning phase
- [ ] Logs show command generation for each step
- [ ] Logs show validation/refinement
- [ ] Final .ox.test has appropriate command count
- [ ] Commands are relevant to job description
- [ ] No truncated or malformed selectors

---

## Phase 5: Documentation and Commit (1 hour)

### Task 5.1: Update Architecture Docs

**Files to update**:
- `docs/ARCHITECTURE-FLOW.md` - Verify it matches implementation
- `docs/e2e-tester-agent/README.md` - Update with actual behavior
- `README.md` - Update examples

**Acceptance**:
- [ ] Docs accurately describe implementation
- [ ] Code examples match actual output
- [ ] Architecture diagrams still valid

---

### Task 5.2: Pre-Commit Checks

**Before committing, run all quality checks**:

```bash
# 1. Run pre-commit check script
./bin/pre-commit-check.sh
```

This will verify:
- ✅ ESLint (no errors, no warnings)
- ✅ TypeScript type check (no errors)
- ✅ Code formatting (Prettier)
- ✅ Unit tests pass

**If any check fails**:
```bash
# Fix ESLint issues
npm run lint:fix

# Fix formatting
npm run format

# Fix TypeScript errors
npm run build

# Re-run checks
./bin/pre-commit-check.sh
```

**Acceptance**:
- [ ] Pre-commit check passes
- [ ] No ESLint errors or warnings
- [ ] No TypeScript errors
- [ ] Code properly formatted
- [ ] All unit tests pass

---

### Task 5.3: Git Commit

**Only commit if all tests pass AND pre-commit checks pass**:

```bash
# 1. Run Docker tests
./bin/test-docker.sh unit
./bin/test-docker.sh integration  # If you have API key

# 2. Run pre-commit checks
./bin/pre-commit-check.sh

# 3. Stage files
git add src/ tests/ docs/

# 4. Commit (automatic hooks will run)
git commit -m "feat: implement iterative decomposition with multi-pass architecture

Replaces single-shot LLM generation with multi-pass iterative process:

- Pass 1: Planning - LLM breaks instruction into atomic steps
- Pass 2: Command Generation - LLM generates command per step with validation
- Pass 3: Refinement Loop - Up to 3 attempts to get valid selector
- Pass 4: Completeness Check (future)

Benefits:
- Multiple commands per job (was 1, now 3-8)
- HTML-aware validation per step
- Self-healing through refinement
- Specific selectors (no more generic 'button')

Tests:
- Unit tests for planning, generation, validation
- Integration tests with real LLM
- Docker-isolated test environment

Fixes #[issue from yesterday's critical report]

Co-authored-by: Claude Code <noreply@anthropic.com>"
```

**Acceptance**:
- [ ] All tests pass before commit
- [ ] Commit message is descriptive
- [ ] Attribution included

---

## Timeline Estimates

| Phase | Tasks | Time | Depends On |
|-------|-------|------|------------|
| Phase 0 | Docker setup + fixtures | 2h | - |
| Phase 1 | Planning implementation | 3h | Phase 0 |
| Phase 2 | Command generation | 3h | Phase 1 |
| Phase 3 | Validation & refinement | 2h | Phase 2 |
| Phase 4 | Integration testing | 2h | Phase 3 |
| Phase 5 | Documentation | 1h | Phase 4 |
| **Total** | | **13h** | |

**Realistic**: 1.5-2 days with testing and debugging

---

## Success Metrics

The implementation will be considered successful when:

1. **Test Coverage**
   - [ ] Unit tests pass (planning, generation, validation)
   - [ ] Integration tests pass (real LLM)
   - [ ] E2E test generates valid .ox.test

2. **Command Quality**
   - [ ] Login job: 3-5 commands (not 1)
   - [ ] Add products: 5-8 commands (not 1)
   - [ ] All commands have specific selectors
   - [ ] No truncated or malformed syntax

3. **Architecture Compliance**
   - [ ] Multiple LLM calls per job (planning + N steps)
   - [ ] Validation loop exists
   - [ ] Refinement loop works (up to 3 attempts)
   - [ ] Logs show multi-pass process

4. **Reliability**
   - [ ] Tests run in Docker isolation
   - [ ] No interference with Claude Code
   - [ ] Reproducible results
   - [ ] Can run multiple times

5. **Documentation**
   - [ ] Code matches PUML diagrams
   - [ ] Implementation matches architecture docs
   - [ ] Examples reflect actual behavior

---

## Risk Management

### Risks and Mitigations

| Risk | Probability | Impact | Mitigation |
|------|------------|--------|------------|
| Tests take too long | High | Medium | Use mocks for unit tests, real LLM only for integration |
| LLM still generates poor commands | Medium | High | Add more examples in prompts, try different models |
| Validation logic too strict | Medium | Medium | Make configurable, start lenient |
| Docker issues | Low | Medium | Test Docker setup first, fallback to local |
| Time overrun | High | Medium | Prioritize Phases 0-3, Phase 4-5 can wait |

---

## Daily Milestones

### End of Day Success Criteria

**Minimum Viable** (must have):
- [ ] Docker environment working
- [ ] Planning phase implemented and tested
- [ ] Command generation works for single step
- [ ] At least 1 integration test passes

**Target** (should have):
- [ ] All unit tests passing
- [ ] Validation and refinement working
- [ ] Integration tests passing
- [ ] Login job generates 3+ commands

**Stretch** (nice to have):
- [ ] All integration tests pass
- [ ] Documentation updated
- [ ] Ready to commit

---

## Next Steps

1. **Start with Phase 0** - Docker setup
2. **Run this script first**: `bin/test-docker.sh` (will fail, that's OK)
3. **Implement Phase 1** - Planning with TDD
4. **See tests turn green** - Confidence!
5. **Continue incrementally** - One phase at a time

---

**Plan Status**: Ready for Execution
**Approach**: TDD + Docker + Incremental
**Estimated Effort**: 13 hours (1.5-2 days)
**Risk Level**: Medium (mitigated with TDD)
