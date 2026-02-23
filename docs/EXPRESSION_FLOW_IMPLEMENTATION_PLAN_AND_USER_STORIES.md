# Expression Flow Component Rewrite — Plan & User Stories

This document contains the implementation plan and detailed user stories for rewriting the expression-flow project as a reusable component. Use it as a step-by-step guide when implementing each part.

---

## Part A: Plan Summary

### Goal

Deliver a **reusable ExpressionFlow component** that:

- **Accepts**: `dataSource` (attribute tree), `functionList` (available functions)
- **Returns**: current expression as a **string** (via `onChange(expression: string)` and optionally controlled `value`)
- **Uses**: React Context for state, SCSS modules for styles, and **only** `@xyflow/react` for the canvas (no Zustand, no Tailwind)

### Public API (Component Contract)

| Prop | Type | Description |
|------|------|-------------|
| `dataSource` | `DataSourceNode[]` | Hierarchical list of attributes (id, label, value, children?, optional propertiesCallback for lazy-load) |
| `functionList` | `Record<string, FunctionMeta>` or `FunctionMeta[]` | Available functions: name, label, argLabels[], isInfix?, variadic?, etc. |
| `value` | `string` (optional) | Controlled mode: initial/current expression string |
| `onChange` | `(expression: string) => void` (optional) | Called whenever the expression changes |
| `defaultValue` | `string` (optional) | Uncontrolled mode: initial expression |

**Expression string format**: e.g. `IF(LENGTH([Name]) > 0, [Name], "")` — attributes as `[X]` or `[X].[Y]`, literals quoted, functions with comma-separated args, infix operators with spaces.

### Folder and File Layout

```
ExpressionFlow/
├── index.tsx
├── ExpressionFlowContext.tsx
├── types.ts
├── parser.ts
├── codegen.ts
├── components/
│   ├── ExpressionFlowCanvas.tsx
│   ├── ExpressionNode.tsx
│   ├── BlockRenderer.tsx
│   ├── FunctionsPanel.tsx
│   ├── AttributesPanel.tsx
│   └── DropZone.tsx
├── styles/
│   ├── ExpressionFlow.module.scss
│   ├── ExpressionNode.module.scss
│   ├── BlockRenderer.module.scss
│   ├── FunctionsPanel.module.scss
│   ├── AttributesPanel.module.scss
│   └── DropZone.module.scss
└── README.md
```

### Architecture (Context)

- **Single expression**: One root `Block` (tree of FUNCTION / ATTRIBUTE / LITERAL).
- **Context provides**: `dataSource`, `functionList`, `root`, `setRoot`, and helpers: `createBlockFromDrag`, `generateCode`, `parseExpression`.
- **Expression string**: Derived via `generateCode(root)`; exposed via `onChange(expression)`.

### Reference Files (Current Codebase)

- `src/types.ts` — Block, FunctionMeta, AttributeNode
- `src/store.ts` — generateCode, createBlockFromDrag, tree helpers
- `src/parser.ts` — tokenize + parse; uses FUNCTION_REGISTRY
- `src/components/ExpressionCanvas.tsx`, `RootNode.tsx`, `BlockRenderer.tsx`, `FunctionsPanel.tsx`, `AttributesPanel.tsx`

---

## Part B: Detailed User Stories

Stories are grouped by implementation step. Each story includes acceptance criteria you can use as a checklist.

---

### Step 1: Types and Public API

#### US-1.1 Define core types

**As a** developer implementing the component,  
**I want** all core data types defined in one place,  
**so that** the rest of the codebase can rely on consistent shapes for blocks, attributes, and functions.

**Acceptance criteria:**

- [ ] In `ExpressionFlow/types.ts`:
  - [ ] `BlockType`: union `"FUNCTION" | "ATTRIBUTE" | "LITERAL"`.
  - [ ] `Block`: `{ id: string; type: BlockType; name: string; value?: string; args: (Block | null)[]; isCollapsed?: boolean }`.
  - [ ] `DataSourceNode`: `{ id: string; label: string; value: string; children?: DataSourceNode[]; propertiesCallback?: ... }` (match or simplify current AttributeNode).
  - [ ] `FunctionMeta`: `{ name: string; label: string; argLabels: string[]; isInfix?: boolean; variadic?: boolean; variadicFrom?: number; description?: string; details?: string; color?: string; category?: string; subcategory?: string; argSuggestions?: Record<number, string[]> }`.
  - [ ] `DragItem`: `{ type: BlockType; name: string; value?: string }`.
- [ ] Types are exported where needed for the public API or internal use.

---

#### US-1.2 Define and export component props

**As a** consumer of the component,  
**I want** a clear, documented props interface,  
**so that** I know exactly what to pass (dataSource, functionList) and how to receive the expression (value/onChange or defaultValue).

**Acceptance criteria:**

- [ ] In `ExpressionFlow/index.tsx` (or a dedicated types file re-exported from index):
  - [ ] Define `ExpressionFlowProps`: `dataSource: DataSourceNode[]`, `functionList: Record<string, FunctionMeta> | FunctionMeta[]`, `value?: string`, `onChange?: (expression: string) => void`, `defaultValue?: string`.
  - [ ] Document when to use controlled (`value` + `onChange`) vs uncontrolled (`defaultValue`).
- [ ] Public types `DataSourceNode` and `FunctionMeta` are exported from the component entry (e.g. `ExpressionFlow/index.tsx`).

---

### Step 2: Context and Codegen

#### US-2.1 Implement generateCode with registry

**As a** developer,  
**I want** a pure function that turns a Block tree into an expression string using a provided function registry,  
**so that** the component does not depend on a hardcoded FUNCTION_REGISTRY.

**Acceptance criteria:**

- [ ] Create `ExpressionFlow/codegen.ts`.
- [ ] `generateCode(block: Block | null, functionRegistry: Record<string, FunctionMeta>): string`.
- [ ] Empty root returns a defined value (e.g. `""` or `"/* empty */"`).
- [ ] ATTRIBUTE → `block.name`; LITERAL → `block.value` (with quotes as needed).
- [ ] FUNCTION: 0-arg → name only; infix → `left op right`; variadic infix → `a op b op c`; GROUP → `(a, b, c)`; standard → `NAME(arg1, arg2, ...)`.
- [ ] All lookups use `functionRegistry` (no global FUNCTION_REGISTRY).

---

#### US-2.2 Implement ExpressionFlowContext with root state and inputs

**As a** component consumer,  
**I want** the component to manage a single expression tree in React state and expose it as a string via onChange,  
**so that** I can embed the component and get the current expression whenever it changes.

**Acceptance criteria:**

- [ ] Create `ExpressionFlow/ExpressionFlowContext.tsx`.
- [ ] Context holds: `dataSource`, `functionList` (normalized to `Record<string, FunctionMeta>`), `root: Block | null`, `setRoot`, and derived `expression` (from `generateCode(root)`).
- [ ] When `root` changes, derived `expression` is updated and `onChange(expression)` is called if provided.
- [ ] Provider accepts same props as the component (dataSource, functionList, value?, onChange?, defaultValue?) and passes them into context (or uses them for sync logic).

---

#### US-2.3 Support controlled and uncontrolled usage

**As a** consumer,  
**I want** to use the component either in controlled mode (value + onChange) or uncontrolled (defaultValue only),  
**so that** I can choose the pattern that fits my app.

**Acceptance criteria:**

- [ ] **Uncontrolled**: If `defaultValue` is provided (and no `value`), parse `defaultValue` once on mount and set initial `root`; subsequent updates are internal; `onChange` still fires when expression changes.
- [ ] **Controlled**: If `value` is provided, when `value` changes from parent, parse it and call `setRoot` with the result (so UI reflects `value`). When user edits, update `root` and call `onChange(generateCode(root))`.
- [ ] Edge cases: empty string, invalid expression (document or handle gracefully, e.g. set root to null and still call onChange with current string).

---

#### US-2.4 Expose tree helpers and createBlockFromDrag in context

**As a** developer building BlockRenderer and panels,  
**I want** context to expose `createBlockFromDrag`, and optionally helpers like `updateBlockInTree`, `removeBlockFromTree`,  
**so that** I can create and mutate the block tree without duplicating logic.

**Acceptance criteria:**

- [ ] `createBlockFromDrag(item: DragItem): Block` uses context’s `functionList` to determine arg count and shape.
- [ ] Optional: expose immutable helpers that take (root, blockId, updater) and return new root (e.g. updateInTree, removeFromTree), so components can call setRoot(updateInTree(root, id, ...)).

---

### Step 3: Parser

#### US-3.1 Parser accepts function registry

**As a** developer,  
**I want** the parser to accept a function registry as an argument instead of using a global,  
**so that** the component is configurable and does not depend on hardcoded functions.

**Acceptance criteria:**

- [ ] Create or refactor `ExpressionFlow/parser.ts`.
- [ ] Signature: `parseExpressionToBlock(expression: string, functionRegistry: Record<string, FunctionMeta>): Block | null`.
- [ ] Tokenizer unchanged in behavior; parser uses `functionRegistry` for resolving function names (e.g. resolveRegistryName) and building blocks with correct arity.
- [ ] Supports: attributes `[X].[Y]`, literals (quoted, number, TRUE, FALSE, NULL), functions, infix operators, grouping `(a,b,c)`.
- [ ] Invalid or unsupported input returns null or throws with a clear contract (document in README).

---

### Step 4: Block Renderer

#### US-4.1 Render a single block with correct type (function / attribute / literal)

**As a** user,  
**I want** to see each block in the expression tree rendered according to its type (function with slots, attribute as label, literal as value),  
**so that** I can understand and edit the expression visually.

**Acceptance criteria:**

- [ ] Create `ExpressionFlow/components/BlockRenderer.tsx` and `ExpressionFlow/styles/BlockRenderer.module.scss`.
- [ ] Component receives a `Block` and renders:
  - [ ] FUNCTION: display name and one slot per arg (from functionRegistry.argLabels or length); empty slots are drop targets.
  - [ ] ATTRIBUTE: display label/name (e.g. bracket path).
  - [ ] LITERAL: display editable value (e.g. quoted string or number).
- [ ] Uses SCSS module for layout and styling (no Tailwind).

---

#### US-4.2 Recursively render block children

**As a** user,  
**I want** nested blocks (e.g. IF(condition, then, else)) to render as a tree with nested slots,  
**so that** I can build and edit complex expressions.

**Acceptance criteria:**

- [ ] BlockRenderer recursively renders each non-null entry in `block.args` as a child BlockRenderer.
- [ ] Slots show either a child block or an empty drop zone.
- [ ] No circular reference issues (tree is finite and block-based).

---

#### US-4.3 Integrate BlockRenderer with context (registry, setRoot)

**As a** developer,  
**I want** BlockRenderer to use `useExpressionFlow()` for function metadata and for updating the tree (setRoot),  
**so that** drag/drop and in-place edits update the single source of truth.

**Acceptance criteria:**

- [ ] BlockRenderer uses context to get `functionList` (for arg labels, isInfix, etc.) and `setRoot` (or a callback that updates root and then calls setRoot).
- [ ] When user drops a block into a slot or edits a literal, the root tree is updated via setRoot and onChange fires with the new expression string.

---

### Step 5: Single Expression Node and Canvas

#### US-5.1 Custom React Flow node that displays the expression tree

**As a** user,  
**I want** the main canvas to show one node that contains the full expression tree (or a drop zone when empty),  
**so that** I have one clear place to build and edit the expression.

**Acceptance criteria:**

- [ ] Create `ExpressionFlow/components/ExpressionNode.tsx` and `ExpressionFlow/styles/ExpressionNode.module.scss`.
- [ ] Custom node type (e.g. `expressionNode`) whose `data` includes `root: Block | null`.
- [ ] When `root` is null: show a drop zone (and optionally “Paste expression” or “Import”).
- [ ] When `root` is set: render `BlockRenderer` for `data.root`.
- [ ] Styling via SCSS module; node is not draggable if you want a fixed layout, or draggable for repositioning only.

---

#### US-5.2 Canvas with React Flow (single node, background, controls)

**As a** user,  
**I want** a canvas with a single expression node, background, and minimal controls (e.g. zoom/fit),  
**so that** the experience matches a simple flow editor without unnecessary complexity.

**Acceptance criteria:**

- [ ] Create `ExpressionFlow/components/ExpressionFlowCanvas.tsx` and `ExpressionFlow/styles/ExpressionFlow.module.scss` (or a shared canvas module).
- [ ] Use `ReactFlow` from `@xyflow/react` with one node (position e.g. 0,0), node type = ExpressionNode.
- [ ] Include `Background` and `Controls`; no edges required for single expression.
- [ ] Node positions managed by React Flow (useState + onNodesChange); node data (root) comes from context and is synced into node `data` when context root changes.

---

#### US-5.3 Paste / import expression into the node

**As a** user,  
**I want** to paste or type an expression string (e.g. in a text area or via “Paste”) and have it parsed and displayed as the block tree,  
**so that** I can edit expressions that I receive as text.

**Acceptance criteria:**

- [ ] ExpressionNode (or a small control inside it) provides a way to paste/import: e.g. text input + “Apply” or paste handler.
- [ ] On submit/paste: call `parseExpressionToBlock(text, functionRegistry)` from context; if result is non-null, call `setRoot(result)` so the tree updates and `onChange(generateCode(result))` runs.

---

### Step 6: Panels (Functions and Attributes)

#### US-6.1 Functions panel lists available functions from context

**As a** user,  
**I want** a panel that lists all functions from `functionList` (optionally grouped by category/subcategory),  
**so that** I can drag them onto the canvas or into slots.

**Acceptance criteria:**

- [ ] Create `ExpressionFlow/components/FunctionsPanel.tsx` and `ExpressionFlow/styles/FunctionsPanel.module.scss`.
- [ ] Read `functionList` from `useExpressionFlow()`.
- [ ] If FunctionMeta has category/subcategory, group and display by it; otherwise flat list.
- [ ] Each function is a drag source (HTML5 drag or react-dnd if you introduce it); drag data includes type FUNCTION and name (and optionally label).

---

#### US-6.2 Attributes panel shows dataSource tree and search

**As a** user,  
**I want** a panel that shows the attribute tree from `dataSource` with optional search,  
**so that** I can drag attributes into the expression.

**Acceptance criteria:**

- [ ] Create `ExpressionFlow/components/AttributesPanel.tsx` and `ExpressionFlow/styles/AttributesPanel.module.scss`.
- [ ] Read `dataSource` from `useExpressionFlow()`.
- [ ] Render tree (expand/collapse); each leaf or node with a value is draggable (type ATTRIBUTE, name = value or id as appropriate).
- [ ] Optional: search/filter that flattens or filters the tree for quick find.
- [ ] Optional: support `propertiesCallback` for lazy-loading children when expanding (port from current AttributesPanel if needed).

---

### Step 7: Drop Zone and Drag/Drop

#### US-7.1 Drop zone accepts blocks and updates root or slot

**As a** user,  
**I want** to drop a function or attribute onto the main canvas (when root is empty) or into an empty slot (when editing),  
**so that** the expression tree updates and onChange fires with the new expression string.

**Acceptance criteria:**

- [ ] Create `ExpressionFlow/components/DropZone.tsx` and `ExpressionFlow/styles/DropZone.module.scss`.
- [ ] DropZone is a valid HTML5 drop target (onDragOver preventDefault, onDrop handle).
- [ ] On drop: read drag data (type, name, value); call `createBlockFromDrag` from context; then either set as new root (canvas drop zone) or replace/insert into the correct slot (slot in BlockRenderer).
- [ ] After update, `setRoot` is called with the new tree and `onChange` fires.

---

#### US-7.2 Drag from panels and drop on canvas or slot

**As a** user,  
**I want** to drag items from the Functions and Attributes panels and drop them on the canvas or into function slots,  
**so that** I can build the expression without typing.

**Acceptance criteria:**

- [ ] FunctionsPanel and AttributesPanel set appropriate `dataTransfer` data (e.g. JSON `{ type, name, value? }`) on drag start.
- [ ] ExpressionFlowCanvas allows drop (onDragOver preventDefault) and forwards to a root-level DropZone or handles drop to set root when empty.
- [ ] BlockRenderer slot DropZones accept the same format and update the tree at the correct arg index; then call setRoot with the updated root.

---

### Step 8: Wiring and Export

#### US-8.1 Top-level layout and provider wiring

**As a** consumer,  
**I want** a single component that renders the full UI (panels + canvas) wrapped in the provider,  
**so that** I can drop `<ExpressionFlow dataSource={...} functionList={...} onChange={...} />` into my app.

**Acceptance criteria:**

- [ ] Main export in `ExpressionFlow/index.tsx`: a component that renders ExpressionFlowProvider wrapping the layout.
- [ ] Layout: e.g. three columns — FunctionsPanel | ExpressionFlowCanvas | AttributesPanel (or configurable).
- [ ] Provider receives dataSource, functionList, value, onChange, defaultValue and passes them to ExpressionFlowContext; context provides root, setRoot, expression, and helpers to children.

---

#### US-8.2 Export public API and types

**As a** consumer or integrator,  
**I want** to import the component and public types from one entry,  
**so that** I can type my props and use the component without digging into internals.

**Acceptance criteria:**

- [ ] From `ExpressionFlow/index.tsx` (or package entry): export `ExpressionFlow` (default or named), `ExpressionFlowProvider` if needed separately, and types `DataSourceNode`, `FunctionMeta`, and optionally `ExpressionFlowProps`.
- [ ] README or JSDoc documents the props and the expression string format.

---

### Step 9: Polish and Documentation

#### US-9.1 README with usage and data shapes

**As a** new developer or consumer,  
**I want** a README that explains how to use the component, the shape of `dataSource` and `functionList`, and the expression string format,  
**so that** I can integrate it without reading the whole codebase.

**Acceptance criteria:**

- [ ] README includes: minimal usage example (dataSource, functionList, onChange).
- [ ] Document `DataSourceNode` and `FunctionMeta` (required and optional fields).
- [ ] Document expression string format (attributes, literals, functions, infix).
- [ ] Note controlled vs uncontrolled and when to use value/defaultValue/onChange.
- [ ] Mention that React Flow base styles must be available (e.g. import `@xyflow/react/dist/style.css` in app or in component).

---

#### US-9.2 SCSS theming and React Flow style override

**As a** consumer,  
**I want** to optionally theme the component (e.g. CSS variables) and have React Flow styles scoped so they don’t clash with my app,  
**so that** the component fits my design system.

**Acceptance criteria:**

- [ ] Root wrapper uses a class (e.g. `expression-flow-root`); main layout and theme variables (e.g. `--ef-color-*`, `--ef-font`) are in `ExpressionFlow.module.scss`.
- [ ] React Flow overrides (if any) are scoped under the root class so they don’t affect the rest of the page.
- [ ] README or comments document how to override CSS variables for theming.

---

## Part C: Implementation Checklist (Ordered)

Use this as a quick checklist while implementing; each line maps to a story or acceptance criterion above.

1. [ ] **Step 1**: types.ts (Block, BlockType, DataSourceNode, FunctionMeta, DragItem); index props and exports
2. [ ] **Step 2**: codegen.ts (generateCode with registry); ExpressionFlowContext (root, setRoot, dataSource, functionList, expression, onChange); controlled/uncontrolled; createBlockFromDrag + tree helpers
3. [ ] **Step 3**: parser.ts (parseExpressionToBlock with functionRegistry)
4. [ ] **Step 4**: BlockRenderer + SCSS; recursive; context integration
5. [ ] **Step 5**: ExpressionNode (custom node + drop zone + paste); ExpressionFlowCanvas (ReactFlow, one node, Background, Controls)
6. [ ] **Step 6**: FunctionsPanel + SCSS; AttributesPanel + SCSS (tree, optional search)
7. [ ] **Step 7**: DropZone + SCSS; drag from panels, drop on canvas and slots; setRoot/onChange
8. [ ] **Step 8**: Top-level layout; Provider + component; export ExpressionFlow, types
9. [ ] **Step 9**: README (usage, data shapes, expression format); SCSS theming and React Flow scope

---

*End of plan and user stories.*
