# Runtime Code Generation from OXTest Proposal

**Status**: Proposed Feature (Not Yet Implemented)
**Date**: November 17, 2025

---

## Overview

This document proposes a feature to generate Playwright TypeScript code at runtime from OXTest files, without requiring LLM calls.

## Current Architecture

**Execution Flow**:
```
.ox.test file → OxtestParser → OxtestCommand[] → PlaywrightExecutor (Direct Interpretation)
```

**Key Point**: Commands are **interpreted** directly, not converted to code.

## Proposed Feature

**New Execution Flow**:
```
.ox.test file → OxtestParser → OxtestCommand[] → CodeGenerator → .spec.ts → Playwright Execution
```

**Key Point**: Commands are **converted to TypeScript code**, then executed.

---

## Implementation Plan

### 1. Create CodeGenerator Class

**File**: `src/infrastructure/generators/PlaywrightCodeGenerator.ts`

```typescript
import { OxtestCommand } from '../../domain/entities/OxtestCommand';
import { CommandType } from '../../domain/enums/CommandType';

export interface CodeGenerationOptions {
  outputPath: string;
  testName?: string;
  timeout?: number;
  includeTeardown?: boolean;
}

export class PlaywrightCodeGenerator {
  /**
   * Generate Playwright TypeScript code from OXTest commands
   */
  public generate(
    commands: OxtestCommand[],
    options: CodeGenerationOptions
  ): string {
    const imports = this.generateImports();
    const testFunction = this.generateTestFunction(commands, options);

    return `${imports}\n\n${testFunction}`;
  }

  /**
   * Generate and write code to file
   */
  public async generateToFile(
    commands: OxtestCommand[],
    options: CodeGenerationOptions
  ): Promise<string> {
    const code = this.generate(commands, options);
    await fs.writeFile(options.outputPath, code, 'utf-8');
    return options.outputPath;
  }

  private generateImports(): string {
    return `import { test, expect } from '@playwright/test';`;
  }

  private generateTestFunction(
    commands: OxtestCommand[],
    options: CodeGenerationOptions
  ): string {
    const testName = options.testName || 'generated-test';
    const timeout = options.timeout || 30000;

    const commandCode = commands
      .map(cmd => this.generateCommandCode(cmd))
      .join('\n');

    return `test('${testName}', async ({ page }) => {
  test.setTimeout(${timeout});

${commandCode}
});`;
  }

  private generateCommandCode(command: OxtestCommand): string {
    switch (command.type) {
      case CommandType.NAVIGATE:
        return `  await page.goto('${command.target}');`;

      case CommandType.CLICK:
        return `  await page.locator('${command.target}').click();`;

      case CommandType.TYPE:
        return `  await page.locator('${command.target}').fill('${command.value}');`;

      case CommandType.WAIT:
        const waitMs = parseInt(command.value || '1000');
        return `  await page.waitForTimeout(${waitMs});`;

      case CommandType.ASSERT_TEXT:
        return `  await expect(page.locator('${command.target}')).toHaveText('${command.value}');`;

      case CommandType.ASSERT_VISIBLE:
        return `  await expect(page.locator('${command.target}')).toBeVisible();`;

      case CommandType.ASSERT_URL:
        return `  await expect(page).toHaveURL('${command.value}');`;

      // Add more command types...

      default:
        return `  // TODO: Implement code generation for ${command.type}`;
    }
  }
}
```

### 2. Add CLI Flag for Code Generation

**File**: `src/cli.ts` (modify)

```typescript
.option('--generate-code', 'Generate Playwright code from OXTest at runtime', false)
```

**Execution Logic**:
```typescript
if (options.generateCode) {
  // Parse .ox.test file
  const commands = await OxtestParser.parseFile(oxtestPath);

  // Generate .spec.ts code
  const generator = new PlaywrightCodeGenerator();
  const specPath = oxtestPath.replace('.ox.test', '.generated.spec.ts');
  await generator.generateToFile(commands, {
    outputPath: specPath,
    testName: path.basename(oxtestPath, '.ox.test')
  });

  // Execute generated code
  await execAsync(`npx playwright test ${specPath}`);
} else {
  // Current approach: Direct interpretation
  await TestOrchestrator.execute(commands);
}
```

### 3. Usage Examples

#### Example 1: Generate Code and Execute

```bash
# Parse .ox.test → Generate .spec.ts → Execute
npm run e2e-test-agent -- \
  --src=_generated/shopping-cart.ox.test \
  --generate-code \
  --execute
```

**What happens**:
1. Load `shopping-cart.ox.test`
2. Parse into OxtestCommand[]
3. Generate `shopping-cart.generated.spec.ts`
4. Execute with `npx playwright test`

#### Example 2: Generate Code Only (No Execution)

```bash
# Just generate .spec.ts from .ox.test
npm run e2e-test-agent -- \
  --src=_generated/shopping-cart.ox.test \
  --generate-code
```

**Output**: `_generated/shopping-cart.generated.spec.ts`

#### Example 3: Batch Conversion

```bash
# Convert all .ox.test files to .spec.ts
for file in _generated/*.ox.test; do
  npm run e2e-test-agent -- --src="$file" --generate-code
done
```

---

## Comparison: Direct Interpretation vs Code Generation

| Aspect | Direct Interpretation (Current) | Runtime Code Generation (Proposed) |
|--------|--------------------------------|-----------------------------------|
| **Execution Speed** | ⚡⚡⚡ Fast (no I/O) | ⚡⚡ Slower (generate + write file) |
| **Debugging** | ❌ Limited (no source file) | ✅ Full Playwright Inspector support |
| **Sharing** | ❌ Requires E2E Agent | ✅ Standard .spec.ts files |
| **Maintenance** | ✅ Single execution path | ⚠️ Two execution paths |
| **Flexibility** | ❌ Can't modify generated code | ✅ Can edit .spec.ts manually |
| **LLM Required** | ❌ No | ❌ No (both parse existing files) |
| **File Artifacts** | ❌ No .spec.ts created | ✅ Creates runnable .spec.ts |

---

## When to Use Each Approach

### Use Direct Interpretation (Current) When:
- ✅ Running automated tests in CI/CD
- ✅ Performance is critical
- ✅ You want simplicity
- ✅ You trust the executor implementation

### Use Code Generation (Proposed) When:
- ✅ Debugging complex test failures
- ✅ Sharing tests with non-E2E-Agent users
- ✅ You want to manually modify generated tests
- ✅ You need Playwright Inspector support
- ✅ You want portable .spec.ts files

---

## Implementation Effort

**Estimated Effort**: 2-3 days

### Tasks:
1. ✅ Create `PlaywrightCodeGenerator.ts` class (6-8 hours)
   - Implement code generation for 30+ command types
   - Handle selector strategies (CSS, XPath, Text, Role, TestID)
   - Generate proper error handling
   - Add TypeScript type safety

2. ✅ Add CLI flag and integration (2-3 hours)
   - Add `--generate-code` flag
   - Integrate with existing CLI workflow
   - Handle file path resolution

3. ✅ Write tests (4-6 hours)
   - Unit tests for code generator
   - Integration tests for end-to-end workflow
   - Snapshot tests for generated code quality

4. ✅ Documentation (2-3 hours)
   - Update README.md
   - Add usage examples
   - Create comparison guide

---

## Example Generated Code

### Input: `shopping-cart.ox.test`
```
NAVIGATE | https://osc2.oxid.shop
CLICK | css=button.add-to-cart
TYPE | css=input#quantity | 2
CLICK | css=button.checkout
ASSERT_TEXT | css=.cart-total | €39.98
```

### Output: `shopping-cart.generated.spec.ts`
```typescript
import { test, expect } from '@playwright/test';

test('shopping-cart', async ({ page }) => {
  test.setTimeout(30000);

  await page.goto('https://osc2.oxid.shop');
  await page.locator('button.add-to-cart').click();
  await page.locator('input#quantity').fill('2');
  await page.locator('button.checkout').click();
  await expect(page.locator('.cart-total')).toHaveText('€39.98');
});
```

### Then Execute:
```bash
npx playwright test shopping-cart.generated.spec.ts --headed
```

---

## Alternative: Use Existing .spec.ts Files

**Note**: The system already generates `.spec.ts` files during the generation phase!

```bash
# Generate both formats (LLM call required)
npm run e2e-test-agent -- \
  --src=test.yaml \
  --output=_generated \
  --oxtest

# Result:
# - _generated/test.ox.test (for interpretation)
# - _generated/test.spec.ts (for direct Playwright execution)

# Run with Playwright
npm run test:generated
```

**This works today without any new code!**

---

## Decision Points

### Question 1: Is this feature needed?

**Consider**:
- Current system already generates .spec.ts files (during generation phase)
- Runtime code generation adds complexity
- Direct interpretation works well for automated execution

**When it's useful**:
- You have .ox.test files but lost the original .spec.ts files
- You want to convert legacy .ox.test files to .spec.ts
- You want to share tests with teams that don't use E2E Agent

### Question 2: Should this replace direct interpretation?

**Answer**: No, keep both options

- Default: Direct interpretation (faster, simpler)
- Optional: Code generation (when debugging or sharing)

### Question 3: Implementation priority?

**Recommendation**: Low priority

**Rationale**:
- Current system already works well
- .spec.ts files are already generated during normal workflow
- This is primarily useful for edge cases (lost files, legacy conversion)

---

## Next Steps

If you want this feature implemented:

1. **Confirm the use case**: Why do you need runtime code generation?
2. **Decide on priority**: Is this blocking any workflows?
3. **Review implementation plan**: Any changes to the proposed approach?
4. **Estimate timeline**: When do you need this feature?

---

**Status**: Awaiting decision on implementation priority
**Proposed By**: Architecture Review
**Date**: November 17, 2025
