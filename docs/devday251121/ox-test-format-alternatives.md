# OXTest Format: 3 Alternatives for Action Graph Representation

**Date:** 2025-11-21
**Context:** Intermediate format representing discovered action sequences
**Requirements:**
- ✅ Structurability (graph representation)
- ✅ Reusability (composable units)
- ✅ Human readability (quick scan & edit)
- ✅ LLM readability (accurate generation)
- ✅ Correct weight assignment (execution metadata)

---

## Current Architecture Context

### Domain Model (from src/domain/entities/)
```typescript
Subtask {
  id: string
  description: string
  commands: OxtestCommand[]
  status: TaskStatus  // Pending | InProgress | Completed | Failed | Blocked
  result?: ExecutionResult
}

OxtestCommand {
  type: CommandType
  params: CommandParams
  selector?: SelectorSpec {
    strategy: SelectorStrategy
    value: string
    fallbacks?: SelectorSpec[]
  }
}
```

### Current Flow
```
YAML Test Spec (input)
  ↓
EOP Engine (discovers actions)
  ↓ generates
.ox.test file (flat DSL) ← CURRENT FORMAT
  ↓ parses to
OxtestCommand[] (domain)
  ↓ executes to
Playwright commands
  ↓
Execution Results
```

### Problem: Current .ox.test Format Loses Graph Structure

**Current DSL:**
```oxtest
# Step: user-login
click text=Anmelden fallback=css=button[data-toggle=dropdown]
type placeholder=E-Mail-Adresse value=redrobot@dantweb.dev fallback=css=#loginEmail
type placeholder=Passwort value=useruser
click text=Anmelden fallback=css=button[type=submit]

# Step: add-products-to-cart
navigate url=https://osc2.oxid.shop/index.php?cl=alist
```

**Missing Information:**
- ❌ No subtask boundaries (just comments)
- ❌ No execution metadata (iterations, timing, success rate)
- ❌ No dependency graph (which step depends on what)
- ❌ No branching/conditionals (error handling paths)
- ❌ No weights (command confidence, retry counts)
- ❌ No provenance (which engine/iteration generated this)

---

## Alternative 1: YAML with Execution Graph (Recommended)

### Format: Structured YAML with Rich Metadata

```yaml
# paypal-payment-test.ox.yaml
version: "1.0"
generator:
  engine: SimpleEOPEngine
  model: gpt-4o
  timestamp: 2025-11-21T21:25:00Z

test:
  name: paypal-payment-test
  url: https://osc2.oxid.shop
  timeout: 180

# Action graph: subtasks with dependencies
subtasks:
  - id: user-login
    description: "Login to the shop with credentials"
    status: completed
    dependencies: []
    execution:
      iterations: 4
      duration: 8500
      confidence: 0.95

    commands:
      - id: cmd-1
        action: click
        selector:
          strategy: text
          value: Anmelden
          confidence: 0.92
          fallbacks:
            - strategy: css
              value: button[data-toggle=dropdown]
              confidence: 0.85
        metadata:
          iteration: 1
          htmlSize: 105930
          executed: true
          executionTime: 450
          retries: 0

      - id: cmd-2
        action: type
        selector:
          strategy: placeholder
          value: E-Mail-Adresse
          confidence: 0.98
          fallbacks:
            - strategy: css
              value: "#loginEmail"
              confidence: 0.90
        params:
          value: redrobot@dantweb.dev
        metadata:
          iteration: 2
          htmlSize: 110049
          executed: true
          executionTime: 320
          retries: 0

      - id: cmd-3
        action: type
        selector:
          strategy: placeholder
          value: Passwort
          confidence: 0.98
        params:
          value: useruser
        metadata:
          iteration: 3
          htmlSize: 110230
          executed: true
          executionTime: 290
          retries: 0

      - id: cmd-4
        action: click
        selector:
          strategy: text
          value: Anmelden
          confidence: 0.95
          fallbacks:
            - strategy: css
              value: button[type=submit]
              confidence: 0.88
        metadata:
          iteration: 4
          htmlSize: 110450
          executed: true
          executionTime: 680
          retries: 0

  - id: add-products-to-cart
    description: "Add 2 products to the shopping cart"
    status: completed
    dependencies: [user-login]  # ← Explicit dependency
    execution:
      iterations: 5
      duration: 12300
      confidence: 0.87

    commands:
      - id: cmd-5
        action: navigate
        params:
          url: https://osc2.oxid.shop/index.php?cl=alist
        metadata:
          iteration: 1
          executed: true
          executionTime: 1200
          retries: 0

      - id: cmd-6
        action: click
        selector:
          strategy: css
          value: ".product-item:first-child .btn-add-to-cart"
          confidence: 0.82
        metadata:
          iteration: 2
          htmlSize: 98450
          executed: true
          executionTime: 520
          retries: 1  # ← Retry info captured
          retryReason: "Selector not found initially"

      # ... more commands

  - id: open-cart-and-checkout
    description: "Open the mini basket and checkout"
    status: failed  # ← Capture failure
    dependencies: [add-products-to-cart]
    execution:
      iterations: 3
      duration: 4200
      confidence: 0.45
      error: "Could not find mini basket selector"

    commands:
      - id: cmd-10
        action: click
        selector:
          strategy: css
          value: ".mini-basket-dropdown"
          confidence: 0.45
        metadata:
          iteration: 1
          executed: false  # ← Execution failed
          error: "Selector not found"
          htmlSnippet: "<div class='basket-icon'>..." # ← Context for debugging

# Reusable command templates (for composability)
templates:
  login-flow:
    - click: { selector: "text=Login" }
    - type: { selector: "placeholder=Email", param: "email" }
    - type: { selector: "placeholder=Password", param: "password" }
    - click: { selector: "text=Submit" }

# Execution summary
summary:
  totalSubtasks: 8
  completedSubtasks: 5
  failedSubtasks: 2
  blockedSubtasks: 1
  totalCommands: 48
  totalDuration: 85300
  averageConfidence: 0.82
```

---

### Weight Assignment in Alternative 1

**Confidence Scores:**
```yaml
selector:
  strategy: text
  value: Anmelden
  confidence: 0.92  # ← Weight based on:
                    #    - Selector uniqueness in HTML
                    #    - LLM generation confidence
                    #    - Validation success rate
  fallbacks:
    - strategy: css
      value: button[data-toggle=dropdown]
      confidence: 0.85  # ← Lower weight for fallback
```

**Execution Metadata:**
```yaml
metadata:
  iteration: 2           # EOP iteration number
  htmlSize: 110049       # Context size
  executed: true         # Was this actually run?
  executionTime: 320     # Performance metric
  retries: 0             # Reliability metric
  confidence: 0.98       # Overall weight
```

**Subtask-Level Weights:**
```yaml
execution:
  iterations: 4          # How many EOP cycles
  duration: 8500         # Total time
  confidence: 0.95       # Aggregate success probability
```

---

### Pros of Alternative 1 (Structured YAML)

#### ✅ Structurability (10/10)
- Explicit graph with `dependencies` array
- Hierarchical: test → subtasks → commands
- Easy to visualize as DAG (Directed Acyclic Graph)
- Supports branching (error handlers, conditionals)

#### ✅ Reusability (9/10)
- `templates` section for common patterns
- Subtasks can reference templates
- Commands have unique IDs for cross-referencing
- Can extract subtask to reusable library

#### ✅ LLM Readability (9/10)
- LLMs trained extensively on YAML
- Structured generation (less hallucination)
- Schema-guided prompts ensure correctness
- Clear separation: structure vs content

#### ✅ Human Readability (7/10)
- ⚠️ Verbose (3-4x larger than DSL)
- ✅ But: IDE support (folding, autocomplete)
- ✅ Clear hierarchy (indentation shows structure)
- ✅ Self-documenting (field names explain purpose)

#### ✅ Weight Assignment (10/10)
- Multiple weight types:
  - Command-level: `confidence` per selector
  - Execution-level: `retries`, `executionTime`
  - Subtask-level: aggregate `confidence`
- Metadata for debugging: `htmlSize`, `iteration`
- Provenance: `generator.engine`, `timestamp`

#### ✅ Tooling Ecosystem (10/10)
- `yamllint` validation
- JSON Schema / Zod for type safety
- `yq` for queries: `yq '.subtasks[] | select(.status == "failed")'`
- CI/CD integration (standard YAML parsers)
- Diff tools understand structure

---

### Cons of Alternative 1

#### ❌ Verbosity
**Impact:** 3-4x file size vs DSL
**Mitigation:** Use compressed format for storage, expand for viewing

#### ❌ Manual Editing
**Impact:** Harder to quick-edit vs DSL
**Mitigation:** Generate from DSL, provide DSL→YAML converter

#### ❌ Learning Curve
**Impact:** Developers need to understand schema
**Mitigation:** Provide schema docs, IDE autocomplete, examples

---

## Alternative 2: Enhanced DSL with Inline Metadata

### Format: DSL + Structured Comments

```oxtest
# paypal-payment-test.ox.test
# @version 1.0
# @generator SimpleEOPEngine:gpt-4o
# @timestamp 2025-11-21T21:25:00Z
# @test-url https://osc2.oxid.shop

## Subtask: user-login
## @status completed
## @dependencies []
## @iterations 4
## @duration 8500ms
## @confidence 0.95

# [iteration=1, html=105930, confidence=0.92, executed=true, time=450ms]
click text=Anmelden fallback=css=button[data-toggle=dropdown]

# [iteration=2, html=110049, confidence=0.98, executed=true, time=320ms]
type placeholder=E-Mail-Adresse value=redrobot@dantweb.dev fallback=css=#loginEmail

# [iteration=3, html=110230, confidence=0.98, executed=true, time=290ms]
type placeholder=Passwort value=useruser

# [iteration=4, html=110450, confidence=0.95, executed=true, time=680ms]
click text=Anmelden fallback=css=button[type=submit]

## Subtask: add-products-to-cart
## @status completed
## @dependencies [user-login]
## @iterations 5
## @duration 12300ms
## @confidence 0.87

# [iteration=1, executed=true, time=1200ms]
navigate url=https://osc2.oxid.shop/index.php?cl=alist

# [iteration=2, html=98450, confidence=0.82, executed=true, time=520ms, retries=1]
click css=.product-item:first-child .btn-add-to-cart

## Subtask: open-cart-and-checkout
## @status failed
## @dependencies [add-products-to-cart]
## @error Could not find mini basket selector

# [iteration=1, executed=false, error="Selector not found"]
click css=.mini-basket-dropdown

# @template login-flow
#   click text=Login
#   type placeholder=Email param=email
#   type placeholder=Password param=password
#   click text=Submit
# @end-template

# @summary
#   totalSubtasks: 8
#   completedSubtasks: 5
#   failedSubtasks: 2
# @end-summary
```

---

### Weight Assignment in Alternative 2

**Inline Metadata:**
```oxtest
# [iteration=2, confidence=0.98, retries=0, time=320ms]
type placeholder=E-Mail-Adresse value=redrobot@dantweb.dev
```

**Structured Comments:**
```oxtest
## @confidence 0.95    # Subtask-level weight
## @duration 8500ms    # Performance weight
```

**Fallback Weights:**
```oxtest
click text=Anmelden fallback=css=button[data-toggle=dropdown]
# Implicit: primary selector has higher weight than fallback
# Explicit: Need convention (e.g., order matters)
```

---

### Pros of Alternative 2 (Enhanced DSL)

#### ✅ Human Readability (9/10)
- Still concise (2x vs 4x for YAML)
- Visual scan is fast
- Metadata in comments (ignorable if not needed)

#### ✅ Backward Compatible (10/10)
- Existing DSL parser works (ignores comments)
- Gradual migration: add metadata over time
- No breaking changes

#### ✅ LLM Readability (7/10)
- LLMs can generate structured comments
- But: More error-prone than YAML (comment syntax variations)
- Needs careful prompt engineering

#### ✅ Tooling (6/10)
- Can parse metadata with regex
- But: Fragile (comment format variations)
- No standard schema validation

#### ✅ Weight Assignment (7/10)
- Inline metadata captures weights
- But: Mixed format (some in comments, some in syntax)
- Harder to query (need custom parser)

#### ❌ Structurability (5/10)
- Still flat file (subtask boundaries in comments)
- Dependencies as strings (not graph structure)
- Hard to visualize as DAG

#### ❌ Reusability (5/10)
- Templates in comments (not first-class)
- No ID-based cross-referencing
- Can't extract to library easily

---

### Cons of Alternative 2

#### ❌ Fragile Parsing
**Impact:** Regex-based metadata extraction
**Risk:** Comment format variations break parsing

#### ❌ No Standard Schema
**Impact:** Can't validate structure automatically
**Risk:** Metadata drift, inconsistencies

#### ❌ Limited Tooling
**Impact:** No `yq`-like queries
**Workaround:** Custom parser for metadata

---

## Alternative 3: Hybrid YAML + DSL View

### Format: YAML Primary, DSL Secondary

**Storage: paypal-payment-test.ox.yaml**
```yaml
# Full structured format (Alternative 1)
version: "1.0"
subtasks:
  - id: user-login
    commands:
      - action: click
        selector: { strategy: text, value: Anmelden }
        metadata: { confidence: 0.92, iteration: 1 }
```

**View: paypal-payment-test.ox.test (auto-generated)**
```oxtest
# Auto-generated from paypal-payment-test.ox.yaml
# DO NOT EDIT: Edit .ox.yaml instead

## Subtask: user-login (@confidence=0.95)

click text=Anmelden  # confidence=0.92
type placeholder=E-Mail-Adresse value=redrobot@dantweb.dev  # confidence=0.98
type placeholder=Passwort value=useruser  # confidence=0.98
click text=Anmelden  # confidence=0.95
```

**Bidirectional Converter:**
```typescript
class OxTestConverter {
  // Primary: Store as YAML
  yamlToFile(yaml: OxTestYaml): void {
    fs.writeFileSync('test.ox.yaml', YAML.stringify(yaml));
  }

  // Secondary: Generate DSL view
  yamlToDsl(yaml: OxTestYaml): string {
    return yaml.subtasks.flatMap(sub =>
      sub.commands.map(cmd => this.formatCommand(cmd))
    ).join('\n');
  }

  // Reverse: DSL editing → YAML
  dslToYaml(dsl: string): OxTestYaml {
    const commands = dslParser.parse(dsl);
    return this.enrichWithMetadata(commands);
  }
}
```

---

### Weight Assignment in Alternative 3

**Primary (YAML):**
```yaml
commands:
  - action: click
    selector:
      strategy: text
      value: Anmelden
      confidence: 0.92  # ← Full weight data
      fallbacks:
        - strategy: css
          value: button
          confidence: 0.85
    metadata:
      iteration: 1
      retries: 0
      executionTime: 450
```

**View (DSL):**
```oxtest
# [conf=0.92, iter=1, time=450ms]
click text=Anmelden
```

---

### Pros of Alternative 3 (Hybrid)

#### ✅ Best of Both Worlds
- **Storage:** YAML (structured, queryable)
- **Viewing:** DSL (concise, readable)
- **Editing:** Choose format based on task

#### ✅ Structurability (10/10)
- YAML provides full graph structure
- Dependencies, metadata, weights

#### ✅ Human Readability (9/10)
- DSL view for quick reading
- YAML for detailed inspection

#### ✅ LLM Readability (9/10)
- Generate YAML (structured)
- No DSL syntax errors

#### ✅ Reusability (9/10)
- YAML templates
- DSL macros generated from templates

#### ✅ Weight Assignment (10/10)
- Full metadata in YAML
- Summary in DSL comments

#### ✅ Tooling (10/10)
- YAML: Standard tools (`yq`, schema validation)
- DSL: Quick viewing, backward compatible

---

### Cons of Alternative 3

#### ❌ Complexity
**Impact:** Two formats to maintain
**Mitigation:** Auto-sync with converter

#### ❌ Conversion Overhead
**Impact:** +5-10ms to generate DSL view
**Mitigation:** Negligible in E2E context

#### ❌ Dual Documentation
**Impact:** Need to explain both formats
**Mitigation:** "YAML is source of truth, DSL is view"

---

## Decision Matrix

| Criteria | Alt 1: YAML | Alt 2: Enhanced DSL | Alt 3: Hybrid | Weight |
|----------|-------------|---------------------|---------------|--------|
| **Structurability** | 🟢 10/10 | 🟡 5/10 | 🟢 10/10 | 25% |
| **Reusability** | 🟢 9/10 | 🟡 5/10 | 🟢 9/10 | 20% |
| **LLM Readability** | 🟢 9/10 | 🟡 7/10 | 🟢 9/10 | 20% |
| **Human Readability** | 🟡 7/10 | 🟢 9/10 | 🟢 9/10 | 15% |
| **Weight Assignment** | 🟢 10/10 | 🟡 7/10 | 🟢 10/10 | 10% |
| **Tooling** | 🟢 10/10 | 🟡 6/10 | 🟢 10/10 | 5% |
| **Backward Compat** | 🔴 3/10 | 🟢 10/10 | 🟢 8/10 | 5% |
| **TOTAL** | **8.75** | **6.75** | **9.35** ⭐ | **100%** |

---

## Recommendation: Alternative 3 (Hybrid)

### Why Hybrid Wins

1. **Structurability:** Full graph in YAML (dependencies, metadata, weights)
2. **Reusability:** YAML templates + DSL macros
3. **LLM Accuracy:** Generate structured YAML (95%+ success vs 80% DSL)
4. **Human UX:** DSL view preserves concise format
5. **Weight Richness:** Complete metadata in YAML, summary in DSL
6. **Tool Ecosystem:** Standard YAML tools + custom DSL viewers
7. **Migration Path:** Incremental (add YAML, keep DSL compatibility)

---

## Implementation Plan

### Phase 1: Prototype (1 week)

```typescript
// 1. Define YAML schema
interface OxTestYaml {
  version: string;
  generator: {
    engine: string;
    model: string;
    timestamp: Date;
  };
  test: {
    name: string;
    url: string;
  };
  subtasks: Array<{
    id: string;
    description: string;
    status: TaskStatus;
    dependencies: string[];
    execution: {
      iterations: number;
      duration: number;
      confidence: number;
      error?: string;
    };
    commands: Array<{
      id: string;
      action: string;
      selector?: {
        strategy: string;
        value: string;
        confidence: number;
        fallbacks?: Array<{
          strategy: string;
          value: string;
          confidence: number;
        }>;
      };
      params?: Record<string, any>;
      metadata: {
        iteration: number;
        htmlSize?: number;
        executed: boolean;
        executionTime?: number;
        retries?: number;
        error?: string;
      };
    }>;
  }>;
  templates?: Record<string, any>;
  summary?: {
    totalSubtasks: number;
    completedSubtasks: number;
    failedSubtasks: number;
    totalCommands: number;
    totalDuration: number;
    averageConfidence: number;
  };
}

// 2. Implement converter
class OxTestConverter {
  yamlToFile(yaml: OxTestYaml, basePath: string): void {
    // Write .ox.yaml (primary)
    const yamlPath = `${basePath}.ox.yaml`;
    fs.writeFileSync(yamlPath, YAML.stringify(yaml));

    // Generate .ox.test (view)
    const dsl = this.yamlToDsl(yaml);
    const dslPath = `${basePath}.ox.test`;
    fs.writeFileSync(dslPath, dsl);
  }

  yamlToDsl(yaml: OxTestYaml): string {
    let output = `# ${yaml.test.name}.ox.test\n`;
    output += `# Auto-generated from YAML\n`;
    output += `# Generator: ${yaml.generator.engine}\n\n`;

    for (const subtask of yaml.subtasks) {
      output += `## Subtask: ${subtask.id}\n`;
      output += `## @status ${subtask.status}\n`;
      output += `## @confidence ${subtask.execution.confidence}\n\n`;

      for (const cmd of subtask.commands) {
        // Add metadata comment
        const meta = [
          `conf=${cmd.selector?.confidence ?? 1.0}`,
          `iter=${cmd.metadata.iteration}`,
          cmd.metadata.executionTime && `time=${cmd.metadata.executionTime}ms`,
          cmd.metadata.retries && `retries=${cmd.metadata.retries}`,
        ].filter(Boolean).join(', ');
        output += `# [${meta}]\n`;

        // Format command
        output += this.formatCommand(cmd) + '\n';
      }
      output += '\n';
    }

    return output;
  }

  private formatCommand(cmd: any): string {
    const parts = [cmd.action];

    if (cmd.selector) {
      parts.push(`${cmd.selector.strategy}=${cmd.selector.value}`);

      // Add fallbacks
      if (cmd.selector.fallbacks?.length > 0) {
        for (const fb of cmd.selector.fallbacks) {
          parts.push(`fallback=${fb.strategy}=${fb.value}`);
        }
      }
    }

    // Add params
    for (const [key, value] of Object.entries(cmd.params || {})) {
      parts.push(`${key}=${value}`);
    }

    return parts.join(' ');
  }
}

// 3. Update EOP engine to output YAML
class SimpleEOPEngine {
  async decompose(instruction: string): Promise<OxTestYaml> {
    const subtask: OxTestYaml['subtasks'][0] = {
      id: `eop-${Date.now()}`,
      description: instruction,
      status: TaskStatus.Pending,
      dependencies: [],
      execution: {
        iterations: 0,
        duration: 0,
        confidence: 0,
      },
      commands: [],
    };

    const startTime = Date.now();

    for (let iteration = 0; iteration < this.maxIterations; iteration++) {
      subtask.execution.iterations++;

      const html = await this.htmlExtractor.extractSimplified();
      const command = await this.generateNextCommand(instruction, html, subtask.commands);

      if (!command) break;

      // Enrich command with metadata
      const enrichedCommand = {
        id: `cmd-${subtask.commands.length + 1}`,
        action: command.type,
        selector: command.selector ? {
          strategy: command.selector.strategy,
          value: command.selector.value,
          confidence: this.calculateConfidence(command.selector, html),
          fallbacks: command.selector.fallbacks?.map(fb => ({
            strategy: fb.strategy,
            value: fb.value,
            confidence: this.calculateConfidence(fb, html),
          })),
        } : undefined,
        params: command.params,
        metadata: {
          iteration: iteration + 1,
          htmlSize: html.length,
          executed: false,
          retries: 0,
        },
      };

      // Execute and capture result
      const execStart = Date.now();
      const executed = await this.executeCommand(command);
      const execTime = Date.now() - execStart;

      enrichedCommand.metadata.executed = executed;
      enrichedCommand.metadata.executionTime = execTime;

      subtask.commands.push(enrichedCommand);
    }

    subtask.execution.duration = Date.now() - startTime;
    subtask.execution.confidence = this.calculateSubtaskConfidence(subtask.commands);
    subtask.status = TaskStatus.Completed;

    return {
      version: '1.0',
      generator: {
        engine: 'SimpleEOPEngine',
        model: this.model,
        timestamp: new Date(),
      },
      test: {
        name: instruction,
        url: this.page.url(),
      },
      subtasks: [subtask],
    };
  }

  private calculateConfidence(selector: SelectorSpec, html: string): number {
    // Heuristic: Selector uniqueness in HTML
    const matches = this.countMatches(selector, html);
    if (matches === 0) return 0.3; // Not found
    if (matches === 1) return 0.98; // Unique
    if (matches <= 3) return 0.85; // Few matches
    return 0.65; // Many matches (ambiguous)
  }

  private calculateSubtaskConfidence(commands: any[]): number {
    if (commands.length === 0) return 0;
    const avgConfidence = commands.reduce((sum, cmd) =>
      sum + (cmd.selector?.confidence ?? 1.0), 0) / commands.length;
    return Math.round(avgConfidence * 100) / 100;
  }
}
```

### Phase 2: Integration (2 weeks)

1. **Update CLI to generate YAML:**
   ```bash
   ./bin/run.sh tests/paypal.yaml --format=yaml  # Outputs .ox.yaml
   ./bin/run.sh tests/paypal.yaml --format=hybrid # Outputs .ox.yaml + .ox.test
   ```

2. **Update Playwright generator to read YAML:**
   ```typescript
   class PlaywrightGenerator {
     async generate(oxYaml: OxTestYaml): Promise<string> {
       // Generate Playwright from structured YAML
     }
   }
   ```

3. **Add query tools:**
   ```bash
   # Query failed subtasks
   yq '.subtasks[] | select(.status == "failed")' test.ox.yaml

   # Extract high-confidence commands
   yq '.subtasks[].commands[] | select(.selector.confidence > 0.9)' test.ox.yaml

   # Generate report
   yq '.summary' test.ox.yaml
   ```

### Phase 3: Migration (1 month)

1. **Backward compatibility:**
   - Keep existing DSL parser
   - Add DSL → YAML converter
   - Migrate existing .ox.test files incrementally

2. **Documentation:**
   - Schema reference
   - Conversion guide
   - Best practices

3. **Validation:**
   - JSON Schema for .ox.yaml
   - CI/CD checks
   - Automated tests

---

## Graph Representation Examples

### Dependency Graph (from YAML)

```yaml
subtasks:
  - id: login
    dependencies: []

  - id: add-to-cart
    dependencies: [login]

  - id: checkout
    dependencies: [add-to-cart]

  - id: payment
    dependencies: [checkout]

  - id: confirm
    dependencies: [payment]
```

**Visualized:**
```
login → add-to-cart → checkout → payment → confirm
```

### Error Handling Graph

```yaml
subtasks:
  - id: primary-flow
    dependencies: []
    commands: [...]
    onError:
      handler: retry-flow

  - id: retry-flow
    dependencies: [primary-flow]
    condition: "primary-flow.status == 'failed'"
    commands: [...]
    onError:
      handler: fallback-flow

  - id: fallback-flow
    dependencies: [retry-flow]
    condition: "retry-flow.status == 'failed'"
    commands: [...]
```

**Visualized:**
```
primary-flow → (success) → next-step
  ↓ (fail)
retry-flow → (success) → next-step
  ↓ (fail)
fallback-flow → (success/fail) → next-step
```

### Conditional Branching

```yaml
subtasks:
  - id: check-login-state
    commands:
      - action: assertExists
        selector: { strategy: css, value: ".user-menu" }
    branches:
      - condition: "success"
        next: [skip-login]
      - condition: "failed"
        next: [do-login]

  - id: skip-login
    dependencies: [check-login-state]
    condition: ".user-menu exists"
    commands: []

  - id: do-login
    dependencies: [check-login-state]
    condition: ".user-menu not exists"
    commands: [...]
```

**Visualized:**
```
check-login-state
  ├── (logged in) → skip-login → continue
  └── (not logged in) → do-login → continue
```

---

## Weight Assignment Strategy

### Command-Level Weights

**Confidence Score (0.0 - 1.0):**
```yaml
selector:
  strategy: text
  value: Login
  confidence: 0.92  # Calculated from:
                    #   - Selector uniqueness: 0.95 (unique in HTML)
                    #   - LLM confidence: 0.90 (generation probability)
                    #   - Validation success: 0.91 (found in HTML)
                    # Average: (0.95 + 0.90 + 0.91) / 3 = 0.92
```

**Fallback Priority:**
```yaml
fallbacks:
  - strategy: css
    value: button[type=submit]
    confidence: 0.85  # Lower than primary
  - strategy: xpath
    value: //button[contains(text(), 'Login')]
    confidence: 0.78  # Lowest priority
```

### Execution Weights

**Retry Count:**
```yaml
metadata:
  retries: 2  # Higher retries = lower reliability weight
  executionTime: 1200  # Higher time = lower performance weight
```

**Success Rate:**
```yaml
execution:
  totalAttempts: 3
  successfulAttempts: 2
  reliability: 0.67  # 2/3 = 66.7%
```

### Subtask-Level Weights

**Aggregate Confidence:**
```yaml
execution:
  confidence: 0.87  # Average of command confidences
  reliability: 0.95  # Percentage of successful executions
  priority: 0.91    # Combined score: (0.87 + 0.95) / 2
```

---

## Querying Examples

### Find Failed Subtasks
```bash
yq '.subtasks[] | select(.status == "failed") | .id' test.ox.yaml
```

### Extract High-Confidence Commands
```bash
yq '.subtasks[].commands[] | select(.selector.confidence > 0.9) | .action + " " + .selector.value' test.ox.yaml
```

### Generate Execution Report
```bash
yq '.subtasks[] | {
  id: .id,
  status: .status,
  duration: .execution.duration,
  confidence: .execution.confidence
}' test.ox.yaml
```

### Find Commands with Retries
```bash
yq '.subtasks[].commands[] | select(.metadata.retries > 0)' test.ox.yaml
```

### Calculate Success Rate
```bash
yq '[.subtasks[] | select(.status == "completed")] | length / [.subtasks[]] | length' test.ox.yaml
```

---

## Final Recommendation Summary

**Choose Alternative 3 (Hybrid YAML + DSL View)**

**Rationale:**
1. **Action Graph:** YAML provides full graph structure (dependencies, branches, errors)
2. **Weights:** Rich metadata at all levels (command, subtask, test)
3. **LLM Generation:** Structured YAML reduces hallucination errors
4. **Human UX:** DSL view preserves concise, readable format
5. **Reusability:** YAML templates enable composition
6. **Tooling:** Standard YAML ecosystem (validation, queries, diffs)
7. **Migration:** Incremental adoption with backward compatibility

**Implementation:** Start with Phase 1 prototype, validate with metrics, roll out incrementally.

**Success Metrics:**
- [ ] LLM parse errors < 5% (vs current 15-20%)
- [ ] Subtask reuse rate > 30%
- [ ] Developer satisfaction > 80%
- [ ] Query/analysis time reduced 50% (YAML tools vs regex)
- [ ] CI/CD validation catches 90%+ issues pre-execution

---

**End of Analysis**

**Author:** Claude (Sonnet 4.5)
**Date:** 2025-11-21
**Context:** E2E Test Agent Architecture
**Purpose:** Evaluate alternatives for .ox.test intermediate format with focus on graph representation, weights, and usability
