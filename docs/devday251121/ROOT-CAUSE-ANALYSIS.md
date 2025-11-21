# Root Cause Analysis - Why Yesterday Failed

**Date**: 2025-11-21
**Analysis**: DevDay 251120 Implementation Failures

---

## Executive Summary

Yesterday's implementation **fundamentally deviated from the architecture** defined in the PlantUML diagrams. The code that was written implements a **single-shot LLM call per job** instead of the **iterative refinement process** that was designed.

**The disconnect**: Architecture documents describe cyclic, iterative refinement with multiple LLM calls per step, but the implementation makes ONE call per job and expects complete commands immediately.

---

## What the Architecture Intended (from PUML diagrams)

### From `06-iterative-discovery.puml`:

The design specifies a **multi-pass iterative process**:

```
Pass 1: Initial Plan
  - LLM analyzes job and creates PLAN
  - Plan = list of steps (e.g., [navigate, enter username, enter password, submit, validate])

Pass 2: Command Generation (Loop)
  For EACH step in plan:
    1. Read current page HTML
    2. LLM generates initial command
    3. REFINEMENT LOOP (up to 3 attempts):
       a. Validate command against HTML
       b. If invalid/ambiguous:
          - LLM refines selector
          - Re-validate
       c. If valid: break
    4. Add validated command to list
    5. Simulate command (update mental model)

Pass 3: Completeness Validation
  - LLM checks if all commands satisfy acceptance criteria
  - If missing: generate additional commands
```

**Key characteristics**:
- Multiple LLM calls per job (one per step + refinement)
- Validation loop with HTML feedback
- Self-correction through refinement
- Completeness check at the end

---

## What Was Actually Implemented

### From `src/application/engines/IterativeDecompositionEngine.ts:51-99`:

```typescript
public async decompose(instruction: string): Promise<Subtask> {
  // 1. Extract HTML once
  const html = await this.htmlExtractor.extractSimplified();

  // 2. Build prompts
  const systemPrompt = this.promptBuilder.buildSystemPrompt();
  const userPrompt = this.promptBuilder.buildDiscoveryPrompt(instruction, html);

  // 3. SINGLE LLM CALL
  const response = await this.llmProvider.generate(userPrompt, {
    systemPrompt,
    model: this.model,
  });

  // 4. Parse response
  const commands = this.oxtestParser.parseContent(response.content);

  // 5. If empty, return no-op wait
  if (commands.length === 0) {
    return new Subtask(`subtask-${Date.now()}`, instruction, [
      new OxtestCommand('wait', { timeout: 0 }),
    ]);
  }

  // 6. Return commands (NO VALIDATION, NO REFINEMENT)
  return new Subtask(`subtask-${Date.now()}`, instruction, commands);
}
```

**What's missing**:
- ❌ No planning phase (no step decomposition)
- ❌ No iterative refinement loop
- ❌ No validation against HTML
- ❌ No self-correction
- ❌ No completeness check
- ❌ Single LLM call expected to do everything

---

## Why This Failed

### Issue 1: Single-Shot Generation Cannot Handle Complexity

**Example**: Login job
```yaml
prompt: Login to the shop with credentials redrobot@dantweb.dev and password useruser.
        Click login button, try to click it to get logged in
```

**Expected behavior** (from architecture):
1. LLM creates plan: [click login menu, fill email, fill password, click submit]
2. For each step, LLM generates command with HTML context
3. Each command validated and refined
4. Result: 4 commands

**Actual behavior**:
1. Single LLM call with full instruction
2. LLM tries to do everything in one shot
3. Result: 1 command (`click css=.showLogin`)
4. No decomposition, no refinement

**Why it fails**:
- Complex multi-step instructions are too hard for single LLM call
- LLM must choose between "click login" or "fill form" - picks one
- No opportunity to validate or refine
- No feedback loop to catch mistakes

---

### Issue 2: No HTML-Based Validation

The architecture specifies:
```
Engine -> Validator : Validate command against HTML
  - Check if selector is unique
  - Check if element exists
  - Check if element type matches

If issues found:
  Engine -> LLM : Refine with issues + HTML context
```

**Current implementation**:
- No validator component
- Commands never checked against actual HTML
- Selectors could be ambiguous/wrong - no detection
- No refinement loop

**Result**: Malformed selectors like `fallback=xpath=//div[contains(@class,` (truncated)

---

### Issue 3: No Iterative Loop Structure

**Architecture says**:
```typescript
// Pseudo-code from PUML
for each step in plan:
  let command = await llm.generateInitial(step, html)

  for attempt in 1..3:
    let validation = validate(command, html)

    if validation.valid:
      break
    else:
      command = await llm.refine(command, validation.issues, html)

  commands.push(command)
```

**Implementation has**:
```typescript
// Actual code
const response = await llm.generate(instruction, html)
const commands = parser.parse(response)
return commands  // No loop, no refinement
```

---

### Issue 4: Wrong Abstraction Level

**Architecture design**:
- `IterativeDecompositionEngine` should orchestrate MULTIPLE LLM calls
- Each call is a single, focused question
- Iterates until job is fully decomposed

**Implementation reality**:
- `IterativeDecompositionEngine.decompose()` makes ONE call
- Expects LLM to do everything at once
- Name is misleading - no iteration happens

---

## Why the Validation Phase Doesn't Help

From `src/cli.ts:259-280`, there IS a validation phase:

```typescript
if (options.execute !== false) {
  const validation = await this.validateAndHealOXTest(
    oxtestFilePath,
    testName,
    llmProvider,
    options.verbose || false
  );
```

**But this can't fix the root problem because**:
1. Validation happens AFTER all jobs are decomposed
2. By then, each job has only 1-2 commands (wrong)
3. Healing can refine EXISTING selectors, but can't ADD MISSING COMMANDS
4. Example: Job has `click .showLogin` but needs 4 commands
   - Healing can make it `click #loginButton`
   - But still only 1 command - missing 3 others

**Validation phase is too late** - it's band-aid for symptoms, not cure for disease.

---

## The Core Architectural Mistake

### What Should Have Been Built

```
CLI calls engine.decompose(job)
  └─> Engine: Create plan (LLM call 1)
       └─> Plan: [step1, step2, step3, step4]
            └─> For each step:
                 ├─> Generate command (LLM call 2)
                 ├─> Validate command (local)
                 ├─> If invalid: Refine (LLM call 3)
                 └─> Add to commands
```

**Result**: N LLM calls per job (N = number of steps × refinement attempts)

### What Was Actually Built

```
CLI calls engine.decompose(job)
  └─> Engine: Generate all commands (LLM call 1)
       └─> Parse response
            └─> Return commands (done)
```

**Result**: 1 LLM call per job

---

## Why This Wasn't Caught Earlier

### Missing Feedback Loops During Development

1. **No unit tests** for `IterativeDecompositionEngine`
   - Would have revealed single-call behavior
   - Would have shown no refinement loop

2. **No integration tests** with real HTML
   - Would have shown commands don't match intent
   - Would have exposed validation gaps

3. **No incremental testing** during implementation
   - Built entire architecture before running
   - Discovered issues only at end

4. **Documentation-code disconnect** not verified
   - PUML diagrams describe one thing
   - Code implements another
   - No validation that code matches design

---

## Comparison: Design vs Implementation

| Aspect | Architecture (PUML) | Implementation | Gap |
|--------|-------------------|----------------|-----|
| **LLM calls per job** | 5-10+ (plan + steps + refinement) | 1 (single shot) | ❌ Missing iteration |
| **Planning phase** | Yes (separate LLM call) | No | ❌ No decomposition |
| **Validation loop** | Yes (per command) | No | ❌ No validation |
| **Refinement** | Yes (up to 3 attempts) | No | ❌ No refinement |
| **HTML feedback** | Yes (per iteration) | Partial (once) | ❌ No loop |
| **Completeness check** | Yes (final LLM call) | No | ❌ No verification |
| **Commands per job** | 3-8 | 1 | ❌ Under-generated |

---

## The Fix Is Not a Patch - It's a Rewrite

### What Won't Work

❌ Better prompts for single-shot generation
   - Still limited by single-call constraint
   - Can't handle complex multi-step jobs

❌ More validation in Phase 2
   - Can refine selectors but can't add missing commands
   - Too late in the process

❌ Different LLM model
   - Won't fix architectural mismatch
   - Single-shot is single-shot regardless of model

### What Will Work

✅ **Implement the actual architecture from PUML**
   - Multi-pass decomposition
   - Step-by-step command generation
   - Validation and refinement loops
   - Completeness verification

✅ **Test-Driven Development**
   - Write tests for multi-step decomposition
   - Verify iterative behavior
   - Test refinement loops
   - Validate against HTML

✅ **Incremental Implementation**
   - Build planning phase first
   - Add step generation next
   - Implement refinement loop
   - Add completeness check
   - Test at each stage

---

## The Path Forward

### Phase 1: Implement Planning Pass

```typescript
class IterativeDecompositionEngine {
  // NEW method
  async createPlan(instruction: string, html: string): Promise<string[]> {
    const prompt = "Break this instruction into atomic steps: " + instruction
    const response = await llm.generate(prompt)
    return parseStepsFromResponse(response)
  }
}
```

### Phase 2: Implement Step-by-Step Generation

```typescript
async decompose(instruction: string): Promise<Subtask> {
  const html = await htmlExtractor.extract()

  // Step 1: Create plan
  const steps = await this.createPlan(instruction, html)

  // Step 2: Generate command for each step
  const commands = []
  for (const step of steps) {
    const command = await this.generateCommandForStep(step, html)
    commands.push(command)
  }

  return new Subtask(id, instruction, commands)
}
```

### Phase 3: Add Validation and Refinement

```typescript
async generateCommandForStep(step: string, html: string): Promise<OxtestCommand> {
  let command = await this.generateInitialCommand(step, html)

  // Refinement loop
  for (let attempt = 0; attempt < 3; attempt++) {
    const validation = this.validateCommand(command, html)

    if (validation.valid) {
      return command
    }

    // Refine with LLM
    command = await this.refineCommand(command, validation.issues, html)
  }

  return command  // Best effort after 3 attempts
}
```

### Phase 4: Add Completeness Check

```typescript
async decompose(instruction: string): Promise<Subtask> {
  // ... generate commands ...

  // Verify completeness
  const missing = await this.checkCompleteness(instruction, commands, acceptance)

  if (missing.length > 0) {
    const additionalCommands = await this.generateMissingCommands(missing)
    commands.push(...additionalCommands)
  }

  return new Subtask(id, instruction, commands)
}
```

---

## Success Criteria (Fixed)

The implementation will be correct when:

1. **Multiple LLM calls per job**
   - Logs show "Creating plan..."
   - Logs show "Generating command for step 1/N..."
   - Logs show "Refining selector..."

2. **Appropriate command count**
   - Login job: 3-5 commands (not 1)
   - Add products: 5-8 commands (not 1)
   - Checkout: 3-4 commands (not 1)

3. **Commands match intent**
   - All required actions present
   - Selectors are specific and validated
   - No truncated or malformed syntax

4. **Validation and refinement visible**
   - Logs show validation checks
   - Logs show refinement attempts
   - Final commands are validated

5. **Tests pass end-to-end**
   - Generated .ox.test can execute
   - Generated .spec.ts accomplishes flow
   - No missing critical steps

---

## Lessons for Today

### Do Differently

1. **Start with tests**
   - Write test for "login should generate 4 commands"
   - Write test for "refinement loop runs when selector ambiguous"
   - Make tests pass, THEN move on

2. **Implement incrementally**
   - Build planning phase → test → verify
   - Add step generation → test → verify
   - Add refinement → test → verify
   - Don't build everything before testing

3. **Match implementation to design**
   - Use PUML diagrams as specification
   - Code should mirror sequence diagrams
   - Verify each component matches architecture

4. **Docker isolation**
   - Run tests in Docker container
   - Isolate from Claude Code app
   - Reproducible test environment

---

## Conclusion

**Root cause**: Implementation does not match architecture.

**Specific gap**: Single-shot LLM generation instead of multi-pass iterative refinement.

**Fix required**: Rewrite `IterativeDecompositionEngine` to implement actual iterative process described in PUML diagrams.

**Estimated effort**:
- Proper implementation: 6-8 hours with TDD
- Quick patch: Won't work, will fail again

**Recommendation**: Start fresh with TDD, implement architecture correctly, test incrementally.

---

**Analysis Complete**: 2025-11-21
**Next**: Create development plan with TDD approach
