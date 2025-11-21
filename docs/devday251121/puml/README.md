# PlantUML Diagrams - E2E Test Agent Architecture

This directory contains comprehensive PlantUML diagrams documenting the E2E Test Agent architecture and workflows.

## 📊 Available Diagrams

### 1. Complete Workflow Diagram
**File:** `yaml-to-playwright-workflow.puml`

**Description:** End-to-end workflow showing how YAML specifications are transformed into executable Playwright tests.

**Shows:**
- Phase 1: Input processing (YAML parsing)
- Phase 2: Browser initialization
- Phase 3: Mode selection (Two-Pass vs EOP)
- Phase 4: Decomposition & command generation
- Phase 5: OXTest DSL generation
- Phase 6: Playwright test generation
- Phase 7: Execution & validation
- Phase 8: Report generation

**Use this diagram to:** Understand the complete system flow from start to finish.

### 2. Two-Pass vs EOP Comparison
**File:** `two-pass-vs-eop-comparison.puml`

**Description:** Side-by-side comparison of Two-Pass decomposition vs Execute-Observe-Plan (EOP) mode.

**Shows:**
- Two-Pass: Planning → Generation → Validation (with stale HTML)
- EOP: Observe → Plan → Execute loop (with fresh HTML)
- Problem areas in Two-Pass (validation failures)
- Success metrics in EOP (zero errors)

**Use this diagram to:** Understand why EOP solves the dynamic content problem.

### 3. Data Flow Diagram
**File:** `data-flow-diagram.puml`

**Description:** Complete data transformation pipeline showing how data flows and transforms through each component.

**Shows:**
- Input: YAML specifications
- Transformations: Parsing, HTML extraction, LLM generation
- Domain objects: TestSpec, JobSpec, OxtestCommand
- Output: OXTest DSL, Playwright tests, Reports
- Validation & refinement loops
- EOP feedback loop (execution → HTML refresh)

**Use this diagram to:** Understand data structures and transformations at each stage.

### 4. EOP Architecture Diagram
**File:** `../../architecture/diagrams/eop-architecture.puml`

**Description:** Detailed sequence diagram of Execute-Observe-Plan pattern implementation.

**Shows:**
- Initialization phase
- EOP loop with Observe-Plan-Execute cycle
- Self-healing mechanism
- Validation with fresh HTML
- Integration points

**Use this diagram to:** Understand the internal mechanics of EOP mode.

## 🔧 How to View

### Option 1: PlantUML Plugin (Recommended)

**VS Code:**
```bash
# Install extension
code --install-extension jebbs.plantuml

# Open any .puml file
# Press Alt+D to preview
```

**IntelliJ/PyCharm:**
- Install "PlantUML integration" plugin
- Right-click .puml file → "Show PlantUML Diagram"

### Option 2: Online Viewer

1. Copy diagram content
2. Visit: https://www.plantuml.com/plantuml/uml/
3. Paste and view

### Option 3: Command Line

```bash
# Install PlantUML
sudo apt-get install plantuml

# Generate PNG
plantuml yaml-to-playwright-workflow.puml

# Generate SVG (better for docs)
plantuml -tsvg yaml-to-playwright-workflow.puml
```

### Option 4: Docker

```bash
# Generate all diagrams
docker run --rm -v $(pwd):/data plantuml/plantuml *.puml

# Outputs: *.png files
```

## 📖 Diagram Reading Guide

### Sequence Diagrams (Workflow & EOP)

- **Boxes:** Components/actors
- **Arrows:** Messages/calls
- **Boxes with color:** Different layer types
- **Notes:** Additional context
- **Alt/Loop:** Conditional logic

### Activity Diagrams (Comparison)

- **Rounded boxes:** Actions/processes
- **Diamonds:** Decisions
- **Swim lanes:** Different approaches
- **Colors:** Status (red=problem, green=success)

### Component Diagrams (Data Flow)

- **Components:** System parts
- **Packages:** Logical groupings
- **Objects:** Data structures
- **Arrows:** Data flow direction

## 🎯 Common Use Cases

### For New Developers

Start with:
1. **yaml-to-playwright-workflow.puml** - Get overview
2. **data-flow-diagram.puml** - Understand data structures
3. **two-pass-vs-eop-comparison.puml** - Learn why EOP exists

### For Architecture Review

Focus on:
1. **data-flow-diagram.puml** - System boundaries & integrations
2. **eop-architecture.puml** - EOP implementation details
3. **yaml-to-playwright-workflow.puml** - Complete flow

### For Debugging Issues

Use:
1. **yaml-to-playwright-workflow.puml** - Identify which phase fails
2. **two-pass-vs-eop-comparison.puml** - Check if it's a stale HTML issue
3. **data-flow-diagram.puml** - Verify data transformations

## 📐 Diagram Maintenance

### When to Update

Update diagrams when:
- New components are added
- Workflow changes significantly
- New modes/engines are implemented
- Data structures change

### How to Update

1. Edit the .puml file
2. Regenerate images: `plantuml filename.puml`
3. Commit both .puml and generated images
4. Update this README if needed

### Diagram Standards

- Use consistent colors (defined at top of each file)
- Add notes for complex logic
- Include legends for symbols
- Keep text concise (5-10 words per label)
- Use meaningful component names

## 🔗 Related Documentation

- **Architecture Overview:** `../../architecture/CURRENT-VS-PROPOSED-ARCHITECTURE.md`
- **EOP Implementation:** `../done/PHASE-5.2-EOP-IMPLEMENTATION-REPORT.md`
- **Code Cleanup:** `../done/CODE-CLEANUP-REPORT.md`
- **Quick Start:** `../done/EOP-QUICK-START.md`

## 📝 Diagram Export Formats

### PNG (Raster)
- Good for: Documentation, presentations
- Command: `plantuml diagram.puml`
- Output: `diagram.png`

### SVG (Vector)
- Good for: Web, scaling, embedding
- Command: `plantuml -tsvg diagram.puml`
- Output: `diagram.svg`

### PDF
- Good for: Reports, printing
- Command: `plantuml -tpdf diagram.puml`
- Output: `diagram.pdf`

### ASCII Art (Text)
- Good for: CLI, plain text docs
- Command: `plantuml -ttxt diagram.puml`
- Output: `diagram.txt`

## 🎨 Color Legend

**Input Layer:** Light Blue (#E3F2FD)
- YAML files, user input

**Process/Transform:** Yellow (#FFF9C4)
- Parsers, generators, transformers

**Output Layer:** Green (#C8E6C9)
- Generated files, reports

**Engine Layer:** Orange (#FFE0B2)
- Decomposition engines

**Validation:** Pink (#F8BBD0)
- Validation, execution, testing

**Problems:** Red (#FFCDD2)
- Issues, errors, failures

**Success:** Green (#A5D6A7)
- Successful operations

## 🚀 Quick Commands

```bash
# Generate all diagrams in this directory
plantuml *.puml

# Generate SVG for web embedding
plantuml -tsvg *.puml

# Watch mode (auto-regenerate on changes)
plantuml -gui

# Generate with custom config
plantuml -config plantuml.cfg *.puml
```

## 📊 Diagram Statistics

| Diagram | Lines | Components | Complexity |
|---------|-------|------------|------------|
| yaml-to-playwright-workflow | ~200 | 12 | High |
| two-pass-vs-eop-comparison | ~250 | 2 engines | Medium |
| data-flow-diagram | ~300 | 15+ | High |
| eop-architecture | ~150 | 8 | Medium |

## 🔍 Troubleshooting

### Diagram won't render

**Issue:** Syntax error
**Fix:** Check for:
- Missing `@enduml`
- Unclosed strings
- Invalid color codes
- Typos in keywords

### Generated image is blank

**Issue:** PlantUML not installed
**Fix:**
```bash
# Ubuntu/Debian
sudo apt-get install plantuml graphviz

# macOS
brew install plantuml
```

### Colors not showing

**Issue:** Theme not loaded
**Fix:** Add at top of .puml:
```
!theme plain
skinparam backgroundColor #FEFEFE
```

---

**Last Updated:** 2025-11-21
**Maintainer:** E2E Agent Team
**PlantUML Version:** Latest stable
