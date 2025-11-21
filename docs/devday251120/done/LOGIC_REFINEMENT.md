# Logic Refinement Plan - Test Generation Flow
**Date**: 2025-11-20
**Status**: ✅ **IMPLEMENTED** (see IMPLEMENTATION-COMPLETE.md)
**Issue**: Current generation logic is backwards - need to fix test generation order and implement proper self-healing feedback loop

---

## ✅ UPDATE (2025-11-20): IMPLEMENTATION COMPLETE

The correct flow has been **fully implemented**! See:
- **Implementation Details**: `IMPLEMENTATION-COMPLETE.md`
- **Verification**: `VERIFICATION-REPORT.md` (selector refinement)
- **Implementation Plan**: `IMPLEMENTATION-PLAN-CORRECT-FLOW.md`

**What Was Implemented**:
1. ✅ OXTest generated FIRST with HTML-aware LLM
2. ✅ Step-by-step validation with self-healing
3. ✅ `.ox.test` file updated when selectors are refined
4. ✅ Playwright generated LAST from validated OXTest
5. ✅ All features enabled by default

**Key Changes**:
- `src/infrastructure/executors/PlaywrightExecutor.ts` - Tracking refinement
- `src/cli.ts` - New generation flow + validation methods

---

## Current (INCORRECT) Flow

```
┌─────────────────────────────────────────────────┐
│ 1. Generate Playwright .spec.ts (FAST)         │
│    - Single LLM call with ALL jobs             │
│    - No HTML context                            │
│    - Generic selectors                          │
│    - Written FIRST ❌                           │
└─────────────────────────────────────────────────┘
                      ↓
┌─────────────────────────────────────────────────┐
│ 2. Generate OXTest .ox.test (SLOW)             │
│    - Launch real browser                        │
│    - Extract HTML for each job                  │
│    - 8 LLM calls (one per job)                  │
│    - Accurate selectors from real page          │
│    - Written SECOND ❌                          │
└─────────────────────────────────────────────────┘
                      ↓
┌─────────────────────────────────────────────────┐
│ 3. Execute OXTest (if --execute)               │
│    - May fail due to selector issues            │
│    - NO FEEDBACK LOOP ❌                        │
│    - NO RE-GENERATION ❌                        │
└─────────────────────────────────────────────────┘
```

### Problems:
1. ❌ **Wrong Order**: `.spec.ts` created first, but it's less accurate
2. ❌ **No Feedback**: If `.ox.test` execution fails, nothing happens
3. ❌ **Wasted Work**: `.spec.ts` is generated without knowing if `.ox.test` will work
4. ❌ **Missing Self-Healing**: Existing `SelfHealingOrchestrator` and `RefinementEngine` not used in CLI
5. ❌ **No Step Refinement**: Abstract prompts not split into smaller steps when failing

---

## Correct (TARGET) Flow

```
┌─────────────────────────────────────────────────┐
│ PHASE 1: Generate Accurate OXTest              │
│ ============================================    │
│ 1. Launch browser → navigate to URL            │
│ 2. Extract HTML context                         │
│ 3. For each job:                                │
│    - Get current page HTML                      │
│    - Generate commands with HTML context        │
│    - Validate selectors exist                   │
│    - Add fallback selectors                     │
│ 4. Write .ox.test file ✅ FIRST                │
└─────────────────────────────────────────────────┘
                      ↓
┌─────────────────────────────────────────────────┐
│ PHASE 2: Execute & Self-Heal OXTest            │
│ ============================================    │
│ 5. Execute .ox.test                             │
│                                                  │
│    ┌─────────────────────┐                     │
│    │ IF SUCCESS:         │                     │
│    │   → Proceed to      │                     │
│    │     Playwright gen  │                     │
│    └─────────────────────┘                     │
│                                                  │
│    ┌─────────────────────────────────────┐     │
│    │ IF FAILURE:                         │     │
│    │   → Analyze failure context         │     │
│    │   → Check if abstract task          │     │
│    │   → Split into smaller steps?       │     │
│    │   → Refine with RefinementEngine    │     │
│    │   → Retry execution (max 3 times)   │     │
│    │   → Use SelfHealingOrchestrator     │     │
│    └─────────────────────────────────────┘     │
└─────────────────────────────────────────────────┘
                      ↓
┌─────────────────────────────────────────────────┐
│ PHASE 3: Generate Playwright Test              │
│ ============================================    │
│ 6. Convert VALIDATED .ox.test → .spec.ts       │
│    - Use proven selectors                       │
│    - Use proven step sequence                   │
│    - Add proper assertions                      │
│ 7. Write .spec.ts file ✅ LAST                 │
└─────────────────────────────────────────────────┘
```

---

## Detailed Refactoring Tasks

### Task 1: Reorder Generation in `src/cli.ts`

**File**: `src/cli.ts:199-258`

**Current**:
```typescript
// Generate Playwright first
const testCode = await this.generateSequentialTestWithLLM(...);
fs.writeFileSync(testFilePath, testCode, 'utf-8');
console.log(`   📄 Created: ${testFileName}`);

// Generate OXTest second
if (options.oxtest) {
  const oxtestCode = await this.generateOXTestWithLLM(...);
  fs.writeFileSync(oxtestFilePath, oxtestCode, 'utf-8');
  console.log(`   📄 Created: ${oxtestFileName}`);
}
```

**Change To**:
```typescript
// Generate OXTest FIRST
console.log('   🧠 Generating OXTest format (primary output)...');
const oxtestCode = await this.generateOXTestWithLLM(...);
fs.writeFileSync(oxtestFilePath, oxtestCode, 'utf-8');
console.log(`   📄 Created: ${oxtestFileName}`);

// Execute and validate OXTest
if (options.execute || options.validate) {
  const validationResult = await this.executeAndValidateOXTest(
    oxtestFilePath,
    options.verbose
  );

  if (!validationResult.success) {
    // Self-healing loop
    const healedCode = await this.selfHealOXTest(
      oxtestCode,
      testName,
      validationResult,
      options
    );

    // Update file with healed version
    if (healedCode) {
      fs.writeFileSync(oxtestFilePath, healedCode, 'utf-8');
      console.log(`   🔧 Self-healed: ${oxtestFileName}`);
    }
  }
}

// Generate Playwright LAST (optional, only if OXTest validated)
if (options.generatePlaywright !== false) {
  console.log('   🎭 Converting OXTest → Playwright...');
  const testCode = await this.convertOXTestToPlaywright(
    oxtestCode,
    testName,
    testSpec
  );
  fs.writeFileSync(testFilePath, testCode, 'utf-8');
  console.log(`   📄 Created: ${testFileName}`);
}
```

---

### Task 2: Implement Self-Healing in CLI

**New Method**: `src/cli.ts::selfHealOXTest()`

```typescript
private async selfHealOXTest(
  oxtestContent: string,
  testName: string,
  failureResult: ExecutionResult,
  options: any
): Promise<string | null> {
  const maxAttempts = 3;

  // Initialize self-healing components
  const failureAnalyzer = new FailureAnalyzer();
  const refinementEngine = new RefinementEngine(this.llmProvider);
  const parser = new OxtestParser();
  const orchestrator = new SelfHealingOrchestrator(
    failureAnalyzer,
    refinementEngine,
    parser
  );

  // Create execution function
  const executionFn = async (subtask: Subtask) => {
    const executor = new PlaywrightExecutor(options.verbose);
    await executor.initialize();

    try {
      const results = await executor.executeAll(subtask.commands);
      await executor.close();

      return {
        success: results.every(r => r.success),
        error: results.find(r => !r.success)?.error,
        commandsExecuted: results.length,
        duration: results.reduce((sum, r) => sum + r.duration, 0)
      };
    } catch (error) {
      await executor.close();
      throw error;
    }
  };

  // Run self-healing loop
  const result = await orchestrator.refineTest(
    oxtestContent,
    testName,
    executionFn,
    {
      maxAttempts,
      captureScreenshots: true,
      captureHTML: true
    }
  );

  if (result.success) {
    console.log(`   ✅ Self-healing succeeded after ${result.attempts} attempts`);
    return result.finalContent;
  } else {
    console.log(`   ⚠️  Self-healing failed after ${result.attempts} attempts`);
    return null;
  }
}
```

---

### Task 3: Implement Task Decomposition Analysis

**New Method**: `src/cli.ts::analyzeAndDecomposeTask()`

```typescript
private async analyzeAndDecomposeTask(
  job: JobSpec,
  failureContext: FailureContext
): Promise<JobSpec[]> {
  // Check if task is too abstract or complex
  const isAbstract = this.isTaskAbstract(job.prompt);
  const hasMultipleActions = this.hasMultipleActions(job.prompt);

  if (!isAbstract && !hasMultipleActions) {
    return [job]; // Task is fine as-is
  }

  // Ask LLM to decompose into smaller steps
  const prompt = `
The following test step failed execution:

Job Name: ${job.name}
Prompt: ${job.prompt}
Acceptance: ${job.acceptance?.join(', ')}

Failure: ${failureContext.error}

This task appears to be too abstract or complex. Please decompose it into
smaller, more concrete steps that can be executed individually.

Return a JSON array of steps:
[
  {
    "name": "step-name",
    "prompt": "specific action description",
    "acceptance": ["specific validation"]
  }
]
`;

  const response = await this.llmProvider.generate(prompt, {
    temperature: 0.3
  });

  try {
    const steps = JSON.parse(response.content);
    console.log(`   🔍 Decomposed "${job.name}" into ${steps.length} smaller steps`);
    return steps;
  } catch (error) {
    console.log(`   ⚠️  Could not decompose task: ${error.message}`);
    return [job];
  }
}

private isTaskAbstract(prompt: string): boolean {
  const abstractKeywords = [
    'add products',
    'complete checkout',
    'fill form',
    'login',
    'navigate to',
    'verify'
  ];

  const lowerPrompt = prompt.toLowerCase();
  return abstractKeywords.some(keyword => lowerPrompt.includes(keyword));
}

private hasMultipleActions(prompt: string): boolean {
  const actionWords = ['click', 'type', 'select', 'verify', 'wait', 'navigate'];
  const count = actionWords.filter(word =>
    prompt.toLowerCase().includes(word)
  ).length;

  return count > 2;
}
```

---

### Task 4: Add CLI Flag for Validation

**File**: `src/cli.ts:70-94`

Add new flags:
```typescript
.option('--validate', 'Validate OXTest before generating Playwright', false)
.option('--skip-playwright', 'Skip Playwright generation (OXTest only)', false)
.option('--self-heal', 'Enable self-healing for failed tests', true)
.option('--max-heal-attempts <number>', 'Max self-healing attempts', '3')
```

---

### Task 5: Update Generation Flow Logic

**File**: `src/cli.ts::run()`

```typescript
// Process each test suite in YAML
for (const [testName, testSpec] of Object.entries(spec)) {
  console.log(`\n🎯 Processing test: ${testName}`);
  console.log(`   URL: ${testSpec.url}`);
  console.log(`   Jobs: ${testSpec.jobs.length}`);

  // PHASE 1: Generate OXTest with HTML context
  console.log('   🧠 Phase 1: Generating OXTest format...');
  let oxtestCode = await this.generateOXTestWithLLM(
    llmProvider,
    testName,
    testSpec.jobs,
    testSpec.url,
    options.verbose
  );

  const oxtestFileName = `${testName}.ox.test`;
  const oxtestFilePath = path.join(options.output, oxtestFileName);
  fs.writeFileSync(oxtestFilePath, oxtestCode, 'utf-8');
  console.log(`   📄 Created: ${oxtestFileName}`);

  // PHASE 2: Validate and Self-Heal
  if (options.validate || options.selfHeal) {
    console.log('   🔍 Phase 2: Validating OXTest...');

    const validationResult = await this.executeTests(
      options.output,
      'console',
      options.verbose,
      oxtestFileName
    );

    if (!validationResult && options.selfHeal) {
      console.log('   🔧 Phase 2b: Self-healing...');

      const healedCode = await this.selfHealOXTest(
        oxtestCode,
        testName,
        failureResult,
        options
      );

      if (healedCode) {
        oxtestCode = healedCode;
        fs.writeFileSync(oxtestFilePath, oxtestCode, 'utf-8');
        console.log(`   ✅ Updated: ${oxtestFileName}`);
      }
    }
  }

  // PHASE 3: Generate Playwright (only if requested)
  if (!options.skipPlaywright) {
    console.log('   🎭 Phase 3: Converting to Playwright...');

    const testCode = await this.convertOXTestToPlaywright(
      oxtestCode,
      testName,
      testSpec.jobs,
      testSpec.url
    );

    const testFileName = `${testName}.spec.ts`;
    const testFilePath = path.join(options.output, testFileName);
    fs.writeFileSync(testFilePath, testCode, 'utf-8');
    console.log(`   📄 Created: ${testFileName}`);
  }
}
```

---

## Implementation Priority

### Phase 1: Fix Generation Order (HIGH PRIORITY)
- [ ] Reorder generation: OXTest first, Playwright second
- [ ] Add `--skip-playwright` flag
- [ ] Update verbose logging to show phases clearly

### Phase 2: Integrate Self-Healing (HIGH PRIORITY)
- [ ] Import `SelfHealingOrchestrator` in CLI
- [ ] Implement `selfHealOXTest()` method
- [ ] Add `--self-heal` and `--max-heal-attempts` flags
- [ ] Wire up execution → analysis → refinement loop

### Phase 3: Task Decomposition (MEDIUM PRIORITY)
- [ ] Implement `analyzeAndDecomposeTask()`
- [ ] Add abstract task detection
- [ ] Integrate with job processing loop
- [ ] Add verbose logging for decomposition

### Phase 4: OXTest → Playwright Converter (LOW PRIORITY)
- [ ] Create `convertOXTestToPlaywright()` method
- [ ] Parse validated .ox.test file
- [ ] Generate .spec.ts with proven selectors
- [ ] Add proper TypeScript type handling

---

## Testing Strategy

### Test 1: Simple Flow
```bash
# Generate only OXTest, skip Playwright
./bin/run.sh tests/simple.yaml --skip-playwright
```

### Test 2: Self-Healing
```bash
# Generate with validation and self-healing
./bin/run.sh tests/paypal.yaml --validate --self-heal --verbose
```

### Test 3: Full Pipeline
```bash
# Complete flow: OXTest → validate → heal → Playwright
./bin/run.sh tests/paypal.yaml --validate --self-heal --verbose
```

---

## Success Criteria

✅ **OXTest generated BEFORE Playwright**
✅ **Self-healing loop integrated and working**
✅ **Failed tests automatically refined and retried**
✅ **Abstract tasks decomposed into smaller steps**
✅ **Playwright generated FROM validated OXTest**
✅ **Verbose mode shows all phases clearly**
✅ **All existing tests still pass**

---

## Migration Notes

### Breaking Changes
- Default behavior will generate OXTest first
- Users expecting .spec.ts first need to update scripts
- New flags required for old behavior

### Backward Compatibility
Add flag: `--legacy-order` to keep old behavior temporarily

```typescript
.option('--legacy-order', 'Use old generation order (deprecated)', false)
```

---

## Architecture Benefits

1. **TDD-Aligned**: Test the test before generating production code
2. **Accurate Selectors**: Playwright code uses validated selectors
3. **Self-Correcting**: Automatic refinement when tests fail
4. **Iterative**: Abstract tasks automatically decomposed
5. **Observable**: Verbose mode shows complete feedback loop
6. **Maintainable**: Clear separation of generation phases

---

## Files to Modify

1. ✏️ `src/cli.ts` - Main refactoring (lines 199-258)
2. ✏️ `src/cli.ts` - Add new methods (selfHealOXTest, analyzeAndDecomposeTask, convertOXTestToPlaywright)
3. ✏️ `src/cli.ts` - Add new CLI flags (lines 70-94)
4. 📝 `README.md` - Update usage examples
5. 📝 `docs/TROUBLESHOOTING.md` - Add self-healing guidance
6. 🧪 `tests/integration/` - Add self-healing integration tests

---

**End of Refactoring Plan**
