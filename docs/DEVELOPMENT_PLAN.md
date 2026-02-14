# now-table — Daily Development Plan

> A Lit + DaisyUI list/table component designed for ServiceNow compatibility and extensibility.

---

## Tech Stack Recommendation: Lit Elements

**Recommendation: Use Lit (elements), not LitHTML alone.**

| Concern | Lit Elements | LitHTML Only |
|---------|--------------|--------------|
| Reactivity | Built-in (`@state`, `@property`) | You build it |
| Lifecycle | `connectedCallback`, `updated`, etc. | You wire it |
| Composability | Native web components | Template fragments only |
| Portability | Runs in Service Portal, UI Builder, standalone | Same, but more glue code |
| SSR | Lit has experimental `@lit-labs/ssr` | LitHTML is SSR-friendly |

**Verdict:** Lit gives you components, reactivity, and lifecycle without reinventing the wheel. LitHTML alone would mean reimplementing state and lifecycle. For now-table’s scope, Lit is the right default.

---

## Architecture: Data | Automations | Interfaces | Forms

```
┌─────────────────────────────────────────────────────────────────┐
│                        INTERFACES                                │
│  Grid (default) | Kanban | Gallery | Forms | Calendar | Map | VTB │
│  ─────────────────────────────────────────────────────────────── │
│  Hooks from day one: view-type selection based on data schema    │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                         FORMS                                    │
│  Inline editing (default) | Right-panel FormLayout | Popover     │
│  Per-field popover forms (config-driven)                         │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      AUTOMATIONS                                 │
│  Event Bus + Hook System | Rules Engine | AI extensibility       │
│  Client events (cell-change, sort, filter) + Server triggers     │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                         DATA                                     │
│  ListLayout (schema) | Record model | Virtualization | Pagination│
│  Backend-agnostic: REST / GraphQL / GlideRecord adapter          │
└─────────────────────────────────────────────────────────────────┘
```

---

## ListLayout Schema (Backend Contract)

```typescript
interface ListLayout {
  tableId: string;
  columns: ColumnDefinition[];
  defaultSort?: SortConfig[];
  freezeRows?: number;
  freezeColumns?: number;
  grouping?: GroupingConfig;
  // View-specific overrides (e.g., Kanban groupBy)
}

interface ColumnDefinition {
  id: string;
  label: string;
  type: FieldType;
  width?: number;           // initial, user can resize
  minWidth?: number;
  maxWidth?: number;
  editable?: boolean;
  required?: boolean;
  hidden?: boolean;
  order?: number;
  // Field-type-specific config (choices, formula, link target, etc.)
}

type FieldType =
  | 'string' | 'integer' | 'decimal' | 'boolean' | 'datetime' | 'reference'
  | 'choice' | 'multi_choice' | 'email' | 'phone' | 'url' | 'currency'
  | 'glide_date' | 'glide_date_time' | 'glide_duration'
  | 'document_id' | 'attachment' | 'journal' | 'full_name'
  | 'formula' | 'dependent' | 'template'
  // e.g. single_select, multiple_selects, formula, etc.
  ;
```

---

## Field Type Mapping: ServiceNow ↔ Common types

| ServiceNow | Common type | Notes |
|------------|-------------|-------|
| string | Single line text | |
| journal | Long text | |
| integer, decimal | Number | |
| boolean | Checkbox | |
| glide_date, glide_date_time | Date | |
| glide_duration | Duration | |
| choice | Single select | |
| multi_choice | Multiple select | |
| email | Email | |
| phone | Phone | |
| url | URL | |
| currency | Currency | |
| reference | Link to another record | |
| document_id, attachment | Attachment | |
| full_name | Created by / Last modified by (conceptual) | |
| formula | Formula | |
| template | Formula (rich text) | |

---

## Daily Development Plan

### Week 1 — Foundation

| Day | Focus | Deliverable | Demo-able |
|-----|-------|-------------|-----------|
| **Day 1** | Project scaffold + Lit + DaisyUI | `npm create vite`, Lit, Tailwind, DaisyUI wired. Single `<now-table>` shell rendering a static header. | ✅ "Hello now-table" with styled header row |
| **Day 2** | ListLayout + Column definition | Consume a mock `ListLayout` JSON. Render dynamic columns from schema. Resize handles (non-functional). | ✅ Table with config-driven columns |
| **Day 3** | Data adapter + Virtualization | Abstract DataProvider interface. Implement mock provider. Add `@lit-labs/virtualizer` for row virtualization. | ✅ 10K rows, smooth scroll |
| **Day 4** | Sort (single + multi) | Default sort: first column ascending. Click header to sort. Multi-sort UX (shift-click). | ✅ Sortable headers, multi-sort |
| **Day 5** | Column resize + reorder | Draggable column headers. Resize handles that update width. Persist to layout state. | ✅ Resize + reorder columns |

### Week 2 — Core Table UX

| Day | Focus | Deliverable | Demo-able |
|-----|-------|-------------|-----------|
| **Day 6** | Filter popover + field-type filters | Popover callout on filter icon. Fade overlay. Filter UI by field type (text, number, date, choice, etc.). | ✅ Filter by column type |
| **Day 7** | Grouping | Group by column. Collapsible groups. Virtualization within groups. | ✅ Grouped rows, expand/collapse |
| **Day 8** | Freeze rows + columns | CSS `position: sticky` for header + freeze column count. Virtualization respects frozen area. | ✅ Frozen header + left columns |
| **Day 9** | Column visibility (hide/show) | Column picker UI. Toggle visibility. Persist in layout. | ✅ Hide/show columns |
| **Day 10** | Field type renderers (Phase 1) | String, integer, boolean, choice, date. Cell renderers by type. | ✅ Multiple field types in cells |

### Week 3 — Editing + Forms

| Day | Focus | Deliverable | Demo-able |
|-----|-------|-------------|-----------|
| **Day 11** | Inline editing (string, number) | Click cell → edit. Blur/Enter to commit. Escape to cancel. | ✅ Inline edit string/number |
| **Day 12** | Inline editing (choice, date, boolean) | Choice dropdown, date picker, checkbox. Consistent commit/cancel. | ✅ Inline edit all basic types |
| **Day 13** | Event bus + hooks | `NowTableEventBus`. Emit `cell-change`, `sort-change`, `filter-change`. Hook registration API. | ✅ Log events on edit/sort/filter |
| **Day 14** | Right-panel FormLayout | Slide-in panel. Full record form from FormLayout schema. Save/Cancel. | ✅ Edit record in right panel |
| **Day 15** | Popover form (per-field config) | Config: `editMode: 'popover'` per column. Popover form for complex fields. | ✅ Popover edit for configured fields |

### Week 4 — WCAG + Polish

| Day | Focus | Deliverable | Demo-able |
|-----|-------|-------------|-----------|
| **Day 16** | Keyboard navigation | Arrow keys, Tab, Enter, Escape. Focus management. Roving tabindex. | ✅ Full keyboard nav |
| **Day 17** | Screen reader (ARIA) | `role="grid"`, `aria-colcount`, `aria-rowindex`, live regions for sort/filter. | ✅ VoiceOver/NVDA demo |
| **Day 18** | Focus visible + contrast | Visible focus indicators. DaisyUI + WCAG 2.2 contrast checks. | ✅ Accessibility audit pass |
| **Day 19** | Field type renderers (Phase 2) | Reference, attachment, formula, url, email. | ✅ Rich field types |
| **Day 20** | End-to-end demo | Wire mock ListLayout + FormLayout. Full flow: load, sort, filter, group, inline edit, panel edit. | ✅ Complete table demo |

### Week 5+ — Views + Extensions

| Day | Focus | Deliverable | Demo-able |
|-----|-------|-------------|-----------|
| **Day 21** | View registry + Grid default | `ViewRegistry`. Grid as default. Hook: `getViewForSchema(schema)`. | ✅ Pluggable view system |
| **Day 22** | Kanban view (shell) | Kanban component. Group by choice/reference. Drag between columns. | ✅ Kanban with same data |
| **Day 23** | Gallery view (shell) | Card layout. Configurable card template. | ✅ Gallery view |
| **Day 24** | Forms view (read) | FormLayout as standalone form view (create mode). | ✅ Create record via form |
| **Day 25** | Calendar view (shell) | Month view. Map date column to events. | ✅ Calendar visualization |
| **Day 26** | Map view (shell) | Map tiles. Geocode from address/lat-lng columns. | ✅ Map view |
| **Day 27** | ServiceNow adapter (optional) | GlideRecord or REST adapter. ListLayout from table definition. | ✅ ServiceNow data source |
| **Day 28** | SSR exploration | `@lit-labs/ssr` or similar. Hydration for first paint. | ✅ Faster initial render |

---

## Directory Structure (Proposed)

```
now-table/
├── src/
│   ├── components/          # Interfaces
│   │   ├── now-table/       # Main grid component
│   │   ├── now-table-header/
│   │   ├── now-table-cell/
│   │   ├── now-table-row/
│   │   ├── views/
│   │   │   ├── grid-view/
│   │   │   ├── kanban-view/
│   │   │   ├── gallery-view/
│   │   │   └── ...
│   │   └── forms/
│   │       ├── form-panel/
│   │       ├── popover-form/
│   │       └── form-field/
│   ├── data/                # Data layer
│   │   ├── ListLayout.ts
│   │   ├── FormLayout.ts
│   │   ├── DataProvider.ts
│   │   ├── MockDataProvider.ts
│   │   └── adapters/
│   ├── automations/         # Event bus, hooks, rules
│   │   ├── EventBus.ts
│   │   ├── hooks.ts
│   │   └── types.ts
│   ├── field-types/         # Cell renderers + editors
│   │   ├── string.ts
│   │   ├── number.ts
│   │   ├── choice.ts
│   │   └── ...
│   └── utils/
│       └── virtualizer.ts
├── docs/
├── package.json
├── tailwind.config.js
└── vite.config.ts
```

---

## Success Criteria for "Competitive with Jelly-based Lists"

- [ ] Virtualized rows: 10K+ rows without lag
- [ ] First contentful paint: < 500ms (SSR helps)
- [ ] Sort/filter: < 100ms feedback
- [ ] Inline edit: no layout shift, immediate focus
- [ ] WCAG 2.2 AA compliance
- [ ] No DOM manipulation for customization — metadata + hooks only

---

## Next Step

**Day 1** can start with:

```bash
npm create vite@latest now-table -- --template lit
cd now-table
npm install
npm install -D tailwindcss postcss autoprefixer daisyui
npx tailwindcss init
```

Then wire DaisyUI, add a minimal `<now-table>` with a static header row, and confirm the stack works before moving to ListLayout on Day 2.
