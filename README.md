# now-table

List/table component for ServiceNow. Built with **Lit** and **DaisyUI**, designed for extensibility and ServiceNow compatibility.

## Architecture

```
Data → Automations → Interfaces → Forms
```

- **Data**: ListLayout (schema), record model, virtualization, backend-agnostic DataProvider
- **Automations**: Event bus, hooks (e.g. view selection from schema)
- **Interfaces**: Grid (default), pluggable ViewRegistry for Kanban/Gallery/Calendar/Map
- **Forms**: Inline editing, right-panel FormLayout, per-field popover forms

---

## Capabilities

### Data & layout

- **ListLayout** — Schema-driven columns: `id`, `label`, `type`, `width`, `minWidth`, `maxWidth`, `editable`, `hidden`, `order`, `choices`, `editMode` (`inline` | `popover`).
- **Field types** — `string`, `integer`, `decimal`, `boolean`, `datetime`, `choice`, `multi_choice`, `reference`, `email`, `phone`, `url`, `currency`, `glide_date`, `glide_date_time`, `glide_duration`, `journal`, `formula`, `template`, etc.
- **DataProvider** — Backend-agnostic interface (`getRecords()`, optional `getTotalCount()`). Mock provider included for demos.
- **Virtualization** — `@lit-labs/virtualizer` for smooth scrolling with 10K+ rows.

### Grid UX

- **Sort** — Click header to sort; Shift+click for multi-sort. Default sort from `layout.defaultSort`.
- **Column resize** — Drag resize handle on header; respects `minWidth` / `maxWidth`.
- **Column reorder** — Drag column headers to reorder.
- **Column visibility** — “Columns” button opens a modal (blur overlay); checkboxes to show/hide columns.
- **Filter** — Filter icon on each header; popover with operators (contains, equals, empty, in, before, after, etc.) and type-aware UI.
- **Group by** — “Group by” button opens a modal; pick a column to group rows with collapsible sections.
- **Freeze columns** — Drag the vertical freeze handle to freeze/unfreeze columns from the left. Syncs with `layout.freezeColumns` or user-controlled count. Header and body scroll together horizontally.

### Editing

- **Inline editing** — Click cell to edit. Blur or Enter to commit, Escape to cancel. Supports string, number, boolean, choice, reference, and date/datetime by type.
- **Popover editing** — Per-column `editMode: 'popover'` opens a popover form for that field.
- **Right-panel form** — Double-click row (or Enter on row) to open a slide-in panel with full FormLayout; Save/Cancel.

### Cell renderers

- **Choice / state** — Pills with semantic colors for “State” (New, In Progress, On Hold, Resolved, Closed).
- **Progress** — Integer column `progress` (e.g. 0–4) rendered as a 5-dot stepper.
- **URL** — Clickable link (opens in new tab).
- **Email** — `mailto:` link.
- **Reference / choice** — Badge-style pill.
- **Formula / template** — Italic styling.
- **Dates** — `glide_date` / `glide_date_time` / `datetime` formatted for locale.

### Views

- **ViewRegistry** — Pluggable view system. Register views and set `getViewForSchema(schema)` to choose view from layout. Grid is the default view.
- **Grid view** — Default table with all above features. Other views (Kanban, Gallery, etc.) are wired for Week 5+.

### Accessibility

- **Keyboard** — Arrow keys move focus; Enter to edit or open record; Escape to cancel; Tab through cells. Roving tabindex on the grid.
- **ARIA** — `role="grid"`, `aria-rowcount` / `aria-colcount` / `aria-rowindex` / `aria-colindex`, `aria-sort` on headers, live region for sort/filter announcements.
- **Focus** — Visible focus indicators; focus follows keyboard navigation.

### Events

- **NowTableEventBus** — Subscribe to `cell-change`, `sort-change`, `filter-change`, `record-select`, `record-save`. Pass `eventBus` prop to `<now-table>`.

---

## Quick Start

```bash
npm install
npm run dev
```

Open http://localhost:5173

---

## Usage

```html
<now-table></now-table>

<script type="module">
  import './now-table.js';
  import { NowTableEventBus } from './automations/EventBus.js';
  import { defaultViewRegistry } from './views/ViewRegistry.js';

  const table = document.querySelector('now-table');
  const eventBus = new NowTableEventBus();
  eventBus.on((e) => console.log(e.type, e));

  table.layout = {
    tableId: 'incident',
    columns: [
      { id: 'number', label: 'Number', type: 'string', width: 120, editable: false },
      { id: 'short_description', label: 'Short Description', type: 'string', width: 280 },
      { id: 'state', label: 'State', type: 'choice', width: 100, choices: ['New', 'In Progress', 'Resolved', 'Closed'] },
      { id: 'progress', label: 'Progress', type: 'integer', width: 100 },
    ],
    defaultSort: [{ columnId: 'number', direction: 'asc' }],
    freezeColumns: 1,
  };

  table.formLayout = {
    tableId: 'incident',
    fields: [
      { id: 'number', label: 'Number', type: 'string' },
      { id: 'short_description', label: 'Short Description', type: 'string' },
      { id: 'state', label: 'State', type: 'choice', choices: ['New', 'In Progress', 'Resolved', 'Closed'] },
    ],
  };

  table.eventBus = eventBus;
  table.records = []; // or set table.provider = myDataProvider
  table.viewType = 'grid'; // optional; default from getViewForSchema(layout)
</script>
```

### Props

| Prop | Type | Description |
|------|------|-------------|
| `layout` | `ListLayout` | Table schema (columns, defaultSort, freezeColumns, etc.). |
| `formLayout` | `FormLayout` | Schema for the right-panel record form. |
| `records` | `TableRecord[]` | In-memory records (or load via `provider`). |
| `provider` | `DataProvider` | Optional; `getRecords()` populates the table. |
| `eventBus` | `NowTableEventBus` | Optional; subscribe to cell/sort/filter/record events. |
| `viewRegistry` | `ViewRegistry` | Optional; defaults to `defaultViewRegistry`. |
| `viewType` | `string` | Optional; override view (e.g. `"grid"`). Otherwise from `getViewForSchema(layout)`. |

### Event bus events

- `cell-change` — `{ recordId, columnId, oldValue, newValue }`
- `sort-change` — `{ sortConfig }`
- `filter-change` — `{ filterConfig }`
- `record-select` — `{ recordId }`
- `record-save` — `{ recordId, record }`

---

## Roadmap

See [docs/DEVELOPMENT_PLAN.md](docs/DEVELOPMENT_PLAN.md) for the full 28-day plan.

**Possible future features:** linked records / relations, rollup and lookup fields, conditional formatting, row comments/activity, attachments in cells, calendar week view, Gantt/timeline view, print/export, and more view types.

| Week | Focus |
|------|-------|
| 1 | Scaffold, ListLayout, virtualization, sort, column resize/reorder |
| 2 | Filters, grouping, freeze, column visibility, field renderers |
| 3 | Inline editing, event bus, right-panel FormLayout, popover forms |
| 4 | WCAG 2.2, keyboard nav, ARIA, focus, URL/email renderers |
| 5+ | ViewRegistry, Grid default, Kanban, Gallery, Calendar, Map, ServiceNow adapter, SSR |

---

## Tech Stack

- **Lit** — Web components, reactivity
- **DaisyUI** — Design system (Tailwind)
- **Vite** — Build tooling
- **@lit-labs/virtualizer** — Row virtualization
