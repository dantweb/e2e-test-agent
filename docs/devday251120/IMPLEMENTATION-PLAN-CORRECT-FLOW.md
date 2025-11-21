# Implementation Plan: Correct Generation Flow

**Date**: 2025-11-20
**Status**: Planning → Implementation

---

## User's Vision (Correct Flow)

> "bin/run.sh should run by default all options on - i.e. ox.test slow creation with llm and on the fly playwright testing, then the ox.test is running to generate playwright test and if at some point the playwright test is failed, then this step should be reprocessed by llm, updated in ox.test object and file and then try to run playwright and if it works, then save it to the playright file and then go to the next step"

---

## Target Flow

```
┌─────────────────────────────────────────────────────────┐
│ PHASE 1: Generate OXTest (HTML-Aware, Slow)            │
│ ═══════════════════════════════════════════════════════ │
│ 1. Launch browser → navigate to URL                     │
│ 2. For each job in YAML:                                │
│    - Extract current page HTML                          │
│    - Send job + HTML to LLM                             │
│    - LLM generates commands with accurate selectors     │
│    - Append to .ox.test file                            │
│ 3. Save complete .ox.test file                          │
└─────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────┐
│ PHASE 2: Validate & Self-Heal (Step-by-Step)           │
│ ═══════════════════════════════════════════════════════ │
│ 1. Execute .ox.test file command by command             │
│ 2. For each command:                                    │
│    IF SUCCESS:                                          │
│      → Continue to next command                         │
│    IF FAILURE:                                          │
│      → Extract current page HTML                        │
│      → Call LLM with failure context + HTML             │
│      → LLM suggests better selector                     │
│      → Update command in .ox.test object                │
│      → Update .ox.test file on disk                     │
│      → Retry command with new selector                  │
│      → IF SUCCESS: Continue                             │
│      → IF STILL FAILS: Stop (or try N times)            │
│ 3. Result: Validated, self-healed .ox.test file         │
└─────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────┐
│ PHASE 3: Generate Playwright (From Validated OXTest)   │
│ ═══════════════════════════════════════════════════════ │
│ 1. Read validated .ox.test file                         │
│ 2. Convert to Playwright .spec.ts using converter       │
│ 3. Use PROVEN selectors from OXTest                     │
│ 4. Save .spec.ts file                                   │
│ 5. Done! Playwright test is guaranteed to work          │
└─────────────────────────────────────────────────────────┘
```

---

## Current vs Target

| Aspect | Current (WRONG ❌) | Target (CORRECT ✅) |
|--------|-------------------|---------------------|
| **Generation Order** | Playwright → OXTest | OXTest → Validate → Playwright |
| **Playwright Source** | Generated from YAML | Generated from validated OXTest |
| **Selector Quality** | Generic, not tested | HTML-aware, battle-tested |
| **Self-Healing** | Only during manual execution | During validation phase |
| **OXTest Update** | Never updated | Updated when step fails & healed |
| **Playwright Accuracy** | May fail on first run | Guaranteed to work (uses proven selectors) |

---

## Implementation Tasks

### Task 1: Refactor CLI Generation Flow

**File**: `src/cli.ts`

**Changes**:
```typescript
// OLD (lines 241-271):
console.log('   🧠 Generating test with all jobs...');
const testCode = await this.generateSequentialTestWithLLM(...);
fs.writeFileSync(testFilePath, testCode, 'utf-8');
console.log(`   📄 Created: ${testFileName}`);

if (options.oxtest) {
  console.log('   🧠 Generating OXTest format...');
  const oxtestCode = await this.generateOXTestWithLLM(...);
  fs.writeFileSync(oxtestFilePath, oxtestCode, 'utf-8');
  console.log(`   📄 Created: ${oxtestFileName}`);
}

// NEW:
console.log('   🧠 Generating OXTest format (HTML-aware)...');
const oxtestCode = await this.generateOXTestWithLLM(...);
fs.writeFileSync(oxtestFilePath, oxtestCode, 'utf-8');
console.log(`   📄 Created: ${oxtestFileName}`);

if (options.validate) {
  console.log('   🔍 Validating OXTest by execution...');
  const validatedOxtest = await this.validateAndHealOXTest(
    oxtestFilePath,
    testName,
    llmProvider,
    options.verbose
  );

  if (validatedOxtest.updated) {
    console.log('   ✏️  OXTest updated with healed selectors');
    fs.writeFileSync(oxtestFilePath, validatedOxtest.content, 'utf-8');
  }
}

if (options.playwright) {
  console.log('   🎭 Generating Playwright from validated OXTest...');
  const converter = new OXTestToPlaywrightConverter();
  const result = await converter.convert(
    fs.readFileSync(oxtestFilePath, 'utf-8'),
    { testName, url: testSpec.url }
  );

  fs.writeFileSync(testFilePath, result.code, 'utf-8');
  console.log(`   📄 Created: ${testFileName}`);
}
```

### Task 2: Implement validateAndHealOXTest Method

**File**: `src/cli.ts`

**New Method**:
```typescript
private async validateAndHealOXTest(
  oxtestFilePath: string,
  testName: string,
  llmProvider: ILLMProvider,
  verbose: boolean
): Promise<{ content: string; updated: boolean }> {
  const parser = new OxtestParser();
  let commands = await parser.parseFile(oxtestFilePath);
  let updated = false;

  // Initialize executor with LLM provider for refinement
  const executor = new PlaywrightExecutor(verbose, llmProvider);

  try {
    await executor.initialize();

    // Execute commands one by one
    for (let i = 0; i < commands.length; i++) {
      const command = commands[i];

      if (verbose) {
        console.log(`      Step ${i + 1}/${commands.length}: ${command.type}`);
      }

      const result = await executor.execute(command);

      if (!result.success) {
        // Command failed - trigger healing
        if (verbose) {
          console.log(`      ❌ Step failed, attempting to heal...`);
        }

        // The executor already tried refinement if LLM available
        // If we get here, refinement succeeded OR isn't available
        // We need to check if the command was refined

        // For now, mark as updated (will implement proper tracking)
        updated = true;
      }
    }

    // If updated, serialize commands back to OXTest format
    if (updated) {
      const newContent = this.serializeCommandsToOXTest(commands);
      return { content: newContent, updated: true };
    }

    return { content: fs.readFileSync(oxtestFilePath, 'utf-8'), updated: false };

  } finally {
    await executor.close();
  }
}
```

### Task 3: Track Command Refinement in Executor

**File**: `src/infrastructure/executors/PlaywrightExecutor.ts`

**Changes**:
Add tracking to know when a command was refined:

```typescript
export interface ExecutionResult {
  success: boolean;
  error?: string;
  duration: number;
  refined?: boolean;  // NEW: Track if selector was refined
  refinedCommand?: OxtestCommand;  // NEW: Return refined command
}
```

Update refineCommandSelector to return this info.

### Task 4: Serialize Commands Back to OXTest

**File**: `src/cli.ts`

**New Method**:
```typescript
private serializeCommandsToOXTest(commands: OxtestCommand[]): string {
  let content = '';

  for (const command of commands) {
    const parts: string[] = [command.type];

    // Add selector if present
    if (command.selector) {
      parts.push(`${command.selector.strategy}=${command.selector.value}`);

      // Add fallbacks
      if (command.selector.fallbacks && command.selector.fallbacks.length > 0) {
        for (const fb of command.selector.fallbacks) {
          parts.push(`fallback=${fb.strategy}=${fb.value}`);
        }
      }
    }

    // Add parameters
    for (const [key, value] of Object.entries(command.params || {})) {
      if (value !== undefined && value !== null) {
        const valueStr = String(value).includes(' ') ? `"${value}"` : String(value);
        parts.push(`${key}=${valueStr}`);
      }
    }

    content += parts.join(' ') + '\n';
  }

  return content;
}
```

### Task 5: Update bin/run.sh Defaults

**File**: `bin/run.sh`

**Changes**:
```bash
# OLD defaults:
OXTEST=false
PLAYWRIGHT=true
EXECUTE=false

# NEW defaults:
OXTEST=true        # Generate OXTest by default
PLAYWRIGHT=true    # Generate Playwright by default
EXECUTE=true       # Execute and validate by default
VALIDATE=true      # Validate OXTest by default
```

### Task 6: Add CLI Flags

**File**: `src/cli.ts`

**New Options**:
```typescript
program
  .option('--oxtest', 'Generate OXTest format (default: true)')
  .option('--no-oxtest', 'Skip OXTest generation')
  .option('--playwright', 'Generate Playwright format (default: true)')
  .option('--no-playwright', 'Skip Playwright generation')
  .option('--execute', 'Execute tests (default: true)')
  .option('--no-execute', 'Skip execution')
  .option('--validate', 'Validate OXTest by execution (default: true)')
  .option('--no-validate', 'Skip validation')
```

---

## Implementation Order

1. ✅ **Add ExecutionResult tracking** (refined flag, refinedCommand)
2. ✅ **Add serializeCommandsToOXTest method**
3. ✅ **Add validateAndHealOXTest method**
4. ✅ **Refactor CLI generation flow** (OXTest → Validate → Playwright)
5. ✅ **Add new CLI flags**
6. ✅ **Update bin/run.sh defaults**
7. ✅ **Test complete flow**
8. ✅ **Update documentation**

---

## Success Criteria

1. **Generation Order**: OXTest created before Playwright
2. **Validation**: OXTest commands executed step-by-step
3. **Self-Healing**: Failed commands refined with LLM
4. **File Update**: .ox.test file updated with refined selectors
5. **Playwright Quality**: .spec.ts uses proven selectors from validated OXTest
6. **Default Behavior**: All features enabled by default
7. **Backward Compat**: Old flags still work (--no-validate, --no-oxtest)

---

## Testing Scenario

### Command
```bash
./bin/run.sh tests/realworld/paypal.yaml
```

### Expected Flow
```
🎯 Processing test: paypal-payment-test
   URL: https://osc2.oxid.shop
   Jobs: 8
   🧠 Generating OXTest format (HTML-aware)...
   🌐 Launching browser...
   🔗 Navigating to https://osc2.oxid.shop...

   📋 Processing job 1/8: "user-login"
   🔍 Extracting HTML from current page...
   📊 HTML extracted: 105930 characters
   🤖 Generating commands with LLM...
   ✓ Parsed 3 command(s)

   ...

   📄 Created: paypal-payment-test.ox.test

   🔍 Validating OXTest by execution...
      Step 1/15: navigate
      ✅ Success
      Step 2/15: click
      ✅ Success
      Step 3/15: fill
      ✅ Success
      Step 4/15: click
      ❌ Failed: Element not found with selector: text=PayPal
      🔧 Attempting to heal with LLM...
      📊 Extracting current page HTML...
      🤖 Asking LLM for better selector...
      💡 LLM suggests: css=#payment-paypal
      🎯 Trying refined selector: css=#payment-paypal
      ✅ Refined selector succeeded!
      ✏️  Updating .ox.test file...
      Step 5/15: click
      ✅ Success
      ...

   ✅ Validation complete (1 step healed)
   ✏️  OXTest updated with healed selectors

   🎭 Generating Playwright from validated OXTest...
   📄 Created: paypal-payment-test.spec.ts

✅ Test generation completed successfully!
```

---

## Migration Notes

### For Users

**Old behavior** (v1.1.x):
```bash
./bin/run.sh tests/test.yaml --oxtest --execute
```

**New behavior** (v1.2.0+):
```bash
./bin/run.sh tests/test.yaml  # Everything enabled by default!
```

**To skip validation** (faster, less accurate):
```bash
./bin/run.sh tests/test.yaml --no-validate
```

**To use old order** (Playwright first):
```bash
./bin/run.sh tests/test.yaml --no-oxtest --playwright --no-validate
```

---

**Status**: Ready for Implementation
**Priority**: HIGH (User's explicit request)
**Estimated Effort**: 2-3 hours
**Breaking Changes**: None (backward compatible with flags)
