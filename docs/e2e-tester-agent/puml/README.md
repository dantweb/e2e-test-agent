# PlantUML Diagrams - e2e-tester-agent

This directory contains PlantUML diagrams visualizing the architecture, workflows, and data flows of the e2e-tester-agent project.

## Viewing the Diagrams

### Online Viewers

**Option 1: PlantUML Online Server**
- Visit: https://www.plantuml.com/plantuml/uml/
- Copy/paste the `.puml` file content
- Click "Submit" to render

**Option 2: PlantText**
- Visit: https://www.planttext.com/
- Paste the diagram code
- See live preview

### Local Rendering

**Option 1: VS Code Extension**
```bash
# Install PlantUML extension
code --install-extension jebbs.plantuml

# Open .puml file in VS Code
# Press Alt+D to preview
```

**Option 2: Command Line**
```bash
# Install PlantUML
brew install plantuml  # macOS
apt-get install plantuml  # Ubuntu

# Render to PNG
plantuml diagram.puml

# Render to SVG
plantuml -tsvg diagram.puml

# Render all diagrams
plantuml *.puml
```

## Diagram Index

### 01. Workflow Overview
**File**: `01-workflow-overview.puml`

**Shows**: Complete two-phase workflow (Compilation and Execution)

**Key Elements**:
- Phase 1: AI-driven compilation with iterative discovery
- Phase 2: Deterministic execution with sequential commands
- YAML input → Oxtest → Browser actions → Reports
- LLM interaction points
- Shared context lifecycle

**Use this when**: Understanding the overall system workflow

---

### 02. Class Diagram
**File**: `02-class-diagram.puml`

**Shows**: Core class structure across all architectural layers

**Key Elements**:
- Domain models (Task, Subtask, OxtestCommand)
- Application services (Engines, Orchestrators)
- Infrastructure adapters (Playwright, LLM providers)
- Presentation layer (CLI, Reporters)
- Interfaces and dependencies

**Use this when**: Understanding code organization and class relationships

---

### 03. Compilation Sequence
**File**: `03-sequence-compilation.puml`

**Shows**: Detailed sequence of Phase 1 (Compilation) with iterative refinement

**Key Elements**:
- User triggers compilation
- YAML parsing
- LLM iterative discovery process:
  - Pass 1: Initial analysis
  - Pass 2: Command generation with refinement loops
  - Pass 3: Final validation and completeness check
- Oxtest file generation
- Manifest creation

**Use this when**: Understanding how YAML becomes oxtest

---

### 04. Execution Sequence
**File**: `04-sequence-execution.puml`

**Shows**: Detailed sequence of Phase 2 (Execution) with sequential processing

**Key Elements**:
- User triggers execution
- Oxtest parsing
- Context initialization (shared state)
- Sequential command execution:
  - Variable resolution
  - Element finding (with fallbacks)
  - Playwright actions
  - Validation
- Error handling with screenshots
- Report generation

**Use this when**: Understanding how oxtest becomes browser actions

---

### 05. Architecture Layers
**File**: `05-architecture-layers.puml`

**Shows**: Five-layer Clean Architecture with dependency flow

**Key Elements**:
- Layer 1: Configuration (YAML parser)
- Layer 2: Domain (models, interfaces)
- Layer 3: Application (engines, orchestrators)
- Layer 4: Infrastructure (Playwright, LLM, parsers)
- Layer 5: Presentation (CLI, reports)
- Dependency inversion principle
- Factory and Strategy patterns

**Use this when**: Understanding architectural layers and separation of concerns

---

### 06. Iterative Discovery
**File**: `06-iterative-discovery.puml`

**Shows**: Detailed view of LLM iterative discovery process

**Key Elements**:
- Initial plan generation
- Per-step command generation
- Validation and refinement loops:
  - Iteration 1: Initial generation
  - Iteration 2: Refinement based on issues
  - Iteration 3: Fallback generation
- HTML/DOM analysis
- Completeness validation
- Final oxtest output

**Use this when**: Understanding how AI generates correct commands

---

### 07. Dependency Diagram
**File**: `07-dependency-diagram.puml`

**Shows**: Component dependencies and Clean Architecture rules

**Key Elements**:
- All components and their interfaces
- Dependency directions (inward flow)
- External system integrations
- Interface implementations
- Factory and Strategy patterns
- Dependency inversion examples

**Use this when**: Understanding component relationships and architecture rules

---

### 08. State Diagram
**File**: `08-state-diagram.puml`

**Shows**: Test execution state machine

**Key Elements**:
- Test lifecycle states
- Command execution states
- Error states and recovery
- Shared context state (parallel)
- Retry logic
- Cleanup always runs
- Sequential guarantees

**Use this when**: Understanding test execution flow and state transitions

---

### 09. Data Flow
**File**: `09-data-flow.puml`

**Shows**: Data transformations from YAML to reports

**Key Elements**:
- Input data (YAML)
- Intermediate data (oxtest, manifest)
- Runtime data (execution context)
- Output data (logs, reports, screenshots)
- Data transformations at each stage
- Data properties and characteristics

**Use this when**: Understanding how data flows through the system

---

## Diagram Conventions

### Colors

| Color | Layer/Type | Hex Code |
|-------|------------|----------|
| Yellow | Domain / Configuration | #FFF9C4 |
| Green | Application | #C5E1A5 |
| Blue | Infrastructure | #B3E5FC |
| Pink | Presentation | #F8BBD0 |
| Light Green | Success / Output | #C8E6C9 |
| Light Red | Error | #FFCDD2 |
| Gray | External Systems | #CFD8DC |

### Arrow Types

- **Solid arrow (→)**: Direct dependency or call
- **Dashed arrow (⇢)**: Interface implementation
- **Dotted arrow (⋯>)**: Creates/instantiates

### Stereotypes

- `<<interface>>`: Interface definition
- `<<Rectangle>>`: Package grouping
- `<<Cloud>>`: External system

## Generating All Diagrams

To generate PNG images for all diagrams:

```bash
cd /path/to/puml
plantuml -tpng *.puml
```

To generate SVG (better for documentation):

```bash
plantuml -tsvg *.puml
```

## Embedding in Documentation

### Markdown

```markdown
![Workflow Overview](./puml/01-workflow-overview.svg)
```

### HTML

```html
<img src="./puml/01-workflow-overview.svg" alt="Workflow Overview">
```

### PlantUML Server (Dynamic)

```markdown
![Workflow](http://www.plantuml.com/plantuml/proxy?src=https://raw.githubusercontent.com/your-repo/path/01-workflow-overview.puml)
```

## Updating Diagrams

When updating diagrams:

1. Edit the `.puml` file
2. Regenerate images: `plantuml -tsvg diagram.puml`
3. Commit both `.puml` and `.svg` files
4. Update references in documentation

## Tools

### Recommended VS Code Extensions

- **PlantUML** (jebbs.plantuml)
- **PlantUML Syntax** (textmate language support)

### Online Tools

- [PlantUML Online Server](https://www.plantuml.com/plantuml/uml/)
- [PlantText](https://www.planttext.com/)
- [PlantUML QEditor](https://plantuml-editor.kkeisuke.com/)

### Desktop Applications

- **PlantUML QEditor** (Qt-based editor)
- **Atom** with plantuml-viewer package
- **IntelliJ IDEA** with PlantUML Integration plugin

## Contributing

When adding new diagrams:

1. Follow naming convention: `NN-descriptive-name.puml`
2. Use consistent color scheme (see above)
3. Add clear title and notes
4. Update this README with diagram description
5. Generate PNG/SVG for easy viewing

## Resources

- [PlantUML Documentation](https://plantuml.com/)
- [PlantUML Cheat Sheet](https://plantuml.com/guide)
- [Sequence Diagram Syntax](https://plantuml.com/sequence-diagram)
- [Class Diagram Syntax](https://plantuml.com/class-diagram)
- [Component Diagram Syntax](https://plantuml.com/component-diagram)
- [State Diagram Syntax](https://plantuml.com/state-diagram)

## Quick Reference

### Common Commands

```bash
# Preview in VS Code
Alt+D (Windows/Linux)
Option+D (macOS)

# Render single file
plantuml diagram.puml

# Render all in directory
plantuml *.puml

# Watch for changes
plantuml -tsvg -o output/ -watch *.puml

# Generate with specific format
plantuml -tpng diagram.puml    # PNG
plantuml -tsvg diagram.puml    # SVG
plantuml -tpdf diagram.puml    # PDF
```

---

**Total Diagrams**: 9
**Covers**: Workflow, Classes, Sequences, Architecture, Dependencies, State, Data Flow
**Format**: PlantUML (.puml)
**Status**: Complete and ready for use
