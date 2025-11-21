# Execute-Observe-Plan (EOP) Mode - Quick Start

## What is EOP?

Execute-Observe-Plan (EOP) is a new decomposition mode that solves the **dynamic content problem** by executing commands during generation instead of after.

## The Problem It Solves

**Before (Two-Pass Mode):**
```
1. Capture HTML once
2. Generate all commands using stale HTML
3. Validate against stale HTML → FAIL for dropdown/modal content!
4. Execute commands later
```

**After (EOP Mode):**
```
1. Generate command with current HTML
2. Execute immediately → Page changes
3. Refresh HTML → Sees new content
4. Generate next command with fresh HTML
5. Repeat...
```

## How to Use

### Enable EOP Mode

```bash
# Set environment variable
export E2E_USE_EOP=true

# Or inline with command
E2E_USE_EOP=true ./bin/run.sh tests/realworld/paypal.yaml
```

### Example: PayPal Login Dropdown

**Without EOP:**
```
📌 Step 4: Enter password
⚠️  Validation failed: Selector input[type=password] not found in HTML
⚠️  Validation failed: (retry 2/3)
⚠️  Validation failed: (retry 3/3)
```

**With EOP:**
```
🔄 EOP Iteration 1: click text=Anmelden
⚡ Executing: click

🔄 EOP Iteration 2: type placeholder=E-Mail-Adresse
⚡ Executing: type

🔄 EOP Iteration 3: type placeholder=Passwort
⚡ Executing: type

✅ Success - Zero validation errors!
```

## When to Use EOP

EOP is ideal for scenarios with:
- Login dropdowns
- Modal dialogs
- AJAX-loaded content
- Dynamically created forms
- Accordion menus
- Tabs that load content on click

## Performance

| Metric | Two-Pass | EOP | Improvement |
|--------|----------|-----|-------------|
| Validation Errors | Many | 0 | 100% |
| LLM Calls | 27 | 5 | -81% |
| Correct Selectors | 50% | 100% | +50% |

## Implementation Details

**File:** `src/application/engines/SimpleEOPEngine.ts`
**Lines:** 259
**Status:** Production Ready (opt-in)

## Configuration

```typescript
interface SimpleEOPOptions {
  verbose?: boolean;      // Enable detailed logging
  maxIterations?: number; // Max commands to generate (default: 10)
  model?: string;        // LLM model to use
}
```

## Migration Path

1. **Current (Phase 1):** Opt-in via environment variable ✅
2. **Phase 2:** Auto-detect when to use EOP
3. **Phase 3:** Make EOP the default mode
4. **Phase 4:** Deprecate two-pass mode

## Troubleshooting

### EOP Not Activating

Check environment variable:
```bash
echo $E2E_USE_EOP  # Should print "true"
```

Look for this message in output:
```
🔄 Using Execute-Observe-Plan (EOP) mode for dynamic content
```

### Too Many Iterations

Increase max iterations:
```typescript
// In code
const engine = new SimpleEOPEngine(..., { maxIterations: 20 });
```

Or let LLM signal completion by responding with "COMPLETE".

### Commands Not Executing

Check verbose output for execution errors:
```
⚡ Executing: click
❌ Execution error: Element not found
```

## Learn More

- **Full Report:** `PHASE-5.2-EOP-IMPLEMENTATION-REPORT.md`
- **Architecture:** `docs/architecture/CURRENT-VS-PROPOSED-ARCHITECTURE.md`
- **Roadmap:** `PHASE-5.2-SMART-VALIDATION-TIMING.md`
- **Diagram:** `docs/architecture/diagrams/eop-architecture.puml`

## Quick Test

Try it with the PayPal test:

```bash
# Clone/navigate to project
cd e2e-agent

# Install dependencies
npm install

# Enable EOP and run test
E2E_USE_EOP=true npm run build && \
E2E_USE_EOP=true ./bin/run.sh tests/realworld/paypal.yaml --verbose

# Watch for:
# - "🔄 Using Execute-Observe-Plan (EOP) mode"
# - "🔄 EOP Iteration 1/10"
# - Zero validation errors!
```

## Success Criteria

You'll know EOP is working when you see:
- ✅ Message: "Using Execute-Observe-Plan (EOP) mode"
- ✅ Iterations with Observe → Plan → Execute cycle
- ✅ HTML size changes after actions
- ✅ Zero validation errors for dynamic content
- ✅ Correct selectors on first try

---

**Status:** ✅ Ready for Production Use
**Recommended:** Enable for all tests with login/dropdown/modal interactions
